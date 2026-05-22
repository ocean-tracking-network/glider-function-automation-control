import { ref, watch } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { kml } from '@tmcw/togeojson'
import apiClient from '@/apiClient'
import { useEventsStore } from './events'
import { useFilesStore } from './files'
import type { Geofence, kmlGeoJson, Latlon } from '@/lib/types'
import type { GeoJsonGeometryTypes, Geometry } from 'geojson'

export const useGeoFencesStore = defineStore('geofences', () => {
  const geofences = ref<Record<string, Geofence>>({})
  const temp_fence_key = '123'
  const selected_fence = ref<Geofence | null>(null)
  const selected_fence_key = ref<string>('')
  const selected_idx = ref<number | null>(null)
  const interactive_map = ref(false)
  const force_map_update = ref(false)
  const selected_kml_geo_json = ref<kmlGeoJson[] | null>(null)
  const show_alert_modal = ref<string>('')
  const onSelectGeofenceHandler = ref<((fencekey: string) => void) | null>(null)
  const onDoubleClickGeofenceHandler = ref<((fencekey: string) => void) | null>(null)
  const eventsStore = useEventsStore()
  const filesStore = useFilesStore()
  const { local_kml_file } = storeToRefs(filesStore)
  const supported_kml_geometry_types = new Set<GeoJsonGeometryTypes>(['Point', 'Polygon', 'LineString'])

  const toLatLonPairs = (coordinates: number[][] = []): Latlon[] => {
    return coordinates
      .filter((lonlat) => Array.isArray(lonlat) && lonlat.length >= 2)
      .map((lonlat) => { return { lat: lonlat[1]!, lng: lonlat[0]! }})
  }

  watch(local_kml_file, async (new_kml_file) => {
    if (!new_kml_file) {
      selected_kml_geo_json.value = null
    } else {
      const kmlText = await new_kml_file.text()
      const kmlDom = new DOMParser().parseFromString(kmlText, 'text/xml')
      if (kmlDom.getElementsByTagName('parsererror').length) {
        local_kml_file.value = null
        show_alert_modal.value = `Failed to parse ${new_kml_file.name} file! Please upload a valid KML file`
      } else {
        const geoJson = kml(kmlDom)
        const geoJsonFeatures = (geoJson.features || []).filter(
          (feature) => feature.geometry && supported_kml_geometry_types.has(feature.geometry.type)
        ).map((feature) => {
          const coordinates: Latlon[] = []
          let isValid: boolean = true
          const geom = feature.geometry as Geometry
          const type = geom.type

          switch (type) {
            case 'Point':
              if (Array.isArray(geom.coordinates)) {
                coordinates.push(
                  {
                    lat: geom.coordinates[1] ?? 0,
                    lng: geom.coordinates[0] ?? 0,
                  }
                )
              }
              if (coordinates.length < 1) {
                isValid = false
              }
              break

            case 'Polygon':
              if (Array.isArray(geom.coordinates) && Array.isArray(geom.coordinates[0])) {
                coordinates.push(
                  ...geom.coordinates[0]?.map((lonlats) => ({
                  lat: lonlats[1] ?? 0,
                  lng: lonlats[0] ?? 0,
                })
              ) ?? [])

              }
              if (coordinates.length < 3) {
                isValid = false
              }
              break

            case 'LineString':
              if (Array.isArray(geom.coordinates)) {
                coordinates.push(...toLatLonPairs(geom.coordinates))
              }
              if (coordinates.length < 3) {
                isValid = false
              }
              break

            default:
              isValid = false
              break
          }

          console.log('coordinates: ', coordinates)

          return {
            coordinates: coordinates,
            placemark: feature.properties?.name,
            type: type,
            isValid: isValid,
            description: feature.properties?.description,
          }
        })

        selected_kml_geo_json.value = [...geoJsonFeatures]
      }
    }
  })

  watch(selected_kml_geo_json, () => {
    // Auto Fill geofence latlons inputs if inputs are empty
    // and kml file contains only 1 placemark
    if (
      selected_fence.value &&
      selected_fence.value.latlons.length <= 1 &&
      selected_kml_geo_json.value &&
      selected_kml_geo_json.value.length === 1
    ) {
      apply_coordinates_from_kml_file(selected_kml_geo_json.value[0]!.coordinates)
      local_kml_file.value = null
    }
  })

  const apply_coordinates_from_kml_file = (latlons: Latlon[]) => {
    if (!selected_fence.value) return
    if (selected_fence.value.latlons.length <= 1) {
      selected_fence.value.latlons = [...latlons]
    } else {
      selected_fence.value.latlons.splice(-1, 1, ...latlons)
    }
  }

  const set_force_map_update = (value: boolean) => {
    force_map_update.value = value
  }

  const getGeofences = () => {
    geofences.value = {}
    const url = '/geofence'
    return apiClient.get(url).then((res) => {
      res.data.forEach((ele: {_id: string} & Geofence) => {
        geofences.value[ele._id] = {
          latlons: ele.latlons,
          name: ele.name,
          selected: false,
          notify: ele.notify,
        }
      })
      set_force_map_update(true)
    })
  }

  const saveGeoFence = () => {
    // if (!Object.keys(geofences.value).includes(temp_fence_key.toString())) {
    //   return
    // }

    const geofence = geofences.value[temp_fence_key]
    const url = '/geofence'
    if (!geofence || !geofence.name && geofence.latlons.length == 1) {
      return Promise.resolve(false)
    }
    const data = {
      name: geofence.name ? geofence.name : 'Untitled',
      latlons: geofence.latlons,
      notify: geofence.notify,
    }
    return apiClient.post(url, data).then(() => {
      return getGeofences()
    })
  }

  const saveOrUpdateGeofence = () => {
    let promise
    if (selected_fence_key.value == temp_fence_key) {
      console.log('SAVE')
      promise = saveGeoFence()
    } else if (selected_fence_key.value != '') {
      console.log('UPDATE')
      promise = updateGeofence()
    } else {
      return Promise.resolve()
    }
    return promise.then((result) => {
      if (result !== false) {
        interactive_map.value = false
      }
      return result
    })
  }

  const updateGeofence = () => {
    const geofence = selected_fence.value as Geofence
    const data = {
      latlons: geofence.latlons,
      name: geofence.name,
      notify: geofence.notify,
    }
    console.log(data)
    const url = '/geofence/' + selected_fence_key.value
    return apiClient.patch(url, data).then(() => {
      return getGeofences()
    })
  }

  const deleteGeofence = (id: string) => {
    delete geofences.value[id]
    if (selected_fence_key.value === id) {
      deselect()
    }

    // Trigger map update
    set_force_map_update(true)

    // confirm deletion on backend
    const url = '/geofence/' + id
    apiClient.delete(url).then(() => {
      // Refresh
      getGeofences()
      eventsStore.get_events()
    }).catch((error) => {
      // if deletion fails, reload all geofences to restore state
      console.error('Failed to delete geofence:', error)
      getGeofences()
    })
  }

  // function find_on_name(name: string) {
  //   for (let i = 0; i < Object.keys(geofences.value).length; i++) {
  //     if (geofences.value[i].name == name) {
  //       return i
  //     }
  //   }
  // }

  function set_geofence(id: string, data: Geofence) {
    geofences.value[id] = data
  }

  // function push_latlon(id, )

  function add(name: string) {
    // new key will always be 0
    if (geofences.value[temp_fence_key] != undefined) {
      //console.log('ERROR, TWO NEW GEOFENCES')
    }
    geofences.value[temp_fence_key] = {
      name: name,
      selected: false,
      latlons: [] as Latlon[],
      notify: false,
    }
    return temp_fence_key
  }

  function remove(key: string) {
    delete geofences.value[key]
  }

  function select(key: string) {
    console.log('selecting fence')
    const fence = geofences.value[key]
    if (!fence) {
      selected_fence.value = null
      selected_fence_key.value = ''
      return
    }
    // console.log(key)
    selected_fence.value = fence
    selected_fence_key.value = key
    set_force_map_update(true)
  }

  function selectGeofence(key: string) {
    if (onSelectGeofenceHandler.value) {
      onSelectGeofenceHandler.value(key)
    } else {
      select(key)
    }
  }

  function setSelectGeofenceHandler(handler: ((fencekey: string) => void) | null) {
    onSelectGeofenceHandler.value = handler
  }

  function setDoubleClickGeofenceHandler(handler: ((fencekey: string) => void) | null) {
    onDoubleClickGeofenceHandler.value = handler
  }

  function doubleClickGeofence(key: string) {
    if (onDoubleClickGeofenceHandler.value) {
      onDoubleClickGeofenceHandler.value(key)
    }
  }

  function deselect() {
    selected_fence.value = null
    selected_fence_key.value = ''
    select_idx(null)
  }

  function select_idx(idx: number | null) {
    selected_idx.value = idx
    set_force_map_update(true)
  }

  // function append_cord_selected_fence(lat_lon) {
  //   const key = selected_fence_key.value
  //   geofences.value[key].latlons[geofences.value[key].latlons.length - 1] = lat_lon
  // }

  return {
    geofences,
    selected_fence,
    selected_fence_key,
    selected_idx,
    temp_fence_key,
    force_map_update,
    interactive_map,
    show_alert_modal,
    set_geofence,
    set_force_map_update,
    select_idx,
    // find_on_name,
    add,
    remove,
    select,
    selectGeofence,
    setSelectGeofenceHandler,
    setDoubleClickGeofenceHandler,
    doubleClickGeofence,
    deselect,
    saveOrUpdateGeofence,
    deleteGeofence,
    getGeofences,
    selected_kml_geo_json,
    apply_coordinates_from_kml_file,
  }
})
