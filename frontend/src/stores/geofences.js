import { ref, watch, onMounted } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { kml } from '@tmcw/togeojson'
import apiClient from '@/apiClient'
import { useEventsStore } from './events'
import { useFilesStore } from './files'

export const useGeoFencesStore = defineStore('geofences', () => {
  const geofences = ref({})
  const temp_fence_key = 123
  const selected_fence = ref('')
  const selected_fence_key = ref('')
  const selected_idx = ref(null)
  const interactive_map = ref(false)
  const force_map_update = ref(false)
  const selected_kml_geo_json = ref(null)
  const onSelectGeofenceHandler = ref(null)
  const eventsStore = useEventsStore()
  const filesStore = useFilesStore()
  const { local_kml_file } = storeToRefs(filesStore)
  const show_alert_modal = ref('')

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
        selected_kml_geo_json.value = geoJson.features.map((feature) => {
          const coordinates = []
          let isValid = true

          switch (feature.geometry.type) {
            case 'Point':
              coordinates.push([feature.geometry.coordinates[1], feature.geometry.coordinates[0]])
              if (coordinates.length < 1) {
                isValid = false
              }
              break
            case 'Polygon':
              coordinates.push(
                ...feature.geometry.coordinates[0].map((lonlats) => [lonlats[1], lonlats[0]]),
              )
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
            placemark: feature.properties.name,
            type: feature.geometry.type,
            isValid: isValid,
            description: feature.properties.description,
          }
        })
      }
    }
  })

  watch(selected_kml_geo_json, () => {
    // Auto Fill geofence latlons inputs if inputs are empty
    // and kml file contains only 1 placemark
    if (
      selected_fence.value.latlons.length <= 1 &&
      selected_kml_geo_json.value &&
      selected_kml_geo_json.value.length === 1
    ) {
      apply_coordinates_from_kml_file(selected_kml_geo_json.value[0].coordinates)
      local_kml_file.value = null
    }
  })

  const apply_coordinates_from_kml_file = (latlons) => {
    if (selected_fence.value.latlons.length <= 1) {
      selected_fence.value.latlons = [...latlons]
    } else {
      selected_fence.value.latlons.splice(-1, 1, ...latlons)
    }
  }

  const set_force_map_update = (value) => {
    force_map_update.value = value
  }

  const getGeofences = () => {
    geofences.value = {}
    const url = '/geofence'
    return apiClient.get(url).then((res) => {
      res.data.forEach((ele) => {
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
    if (!geofence.name && geofence.latlons.length == 1) {
      return Promise.resolve(false)
    }
    const data = {
      name: geofence.name ? geofence.name : 'Untitled',
      latlons: geofence.latlons,
      notify: geofence.notify,
    }
    return apiClient.post(url, data).then((res) => {
      return getGeofences()
    })
  }

  const saveOrUpdateGeofence = () => {
    if (selected_fence_key.value == temp_fence_key) {
      console.log('SAVE')
      return saveGeoFence()
    } else if (selected_fence_key.value != '') {
      console.log('UPDATE')
      return updateGeofence()
    }
    return Promise.resolve()
  }

  const updateGeofence = () => {
    const geofence = selected_fence.value
    const data = {
      latlons: geofence.latlons,
      name: geofence.name,
      notify: geofence.notify,
    }
    console.log(data)
    const url = '/geofence/' + selected_fence_key.value
    return apiClient.patch(url, data).then((res) => {
      return getGeofences()
    })
  }

  const deleteGeofence = (id) => {
    delete geofences.value[id]
    if (selected_fence_key.value === id) {
      deselect()
    }

    // Trigger map update
    set_force_map_update(true)

    // confirm deletion on backend
    const url = '/geofence/' + id
    apiClient.delete(url).then((res) => {
      // Refresh
      getGeofences()
      eventsStore.get_events()
    }).catch((error) => {
      // if deletion fails, reload all geofences to restore state
      console.error('Failed to delete geofence:', error)
      getGeofences()
    })
  }

  function find_on_name(name) {
    for (let i = 0; i < geofences.value.length; i++) {
      if (geofences.value[i].name == name) {
        return i
      }
    }
  }

  function set_geofence(id, data) {
    geofences.value[id] = data
  }

  // function push_latlon(id, )

  function add(name) {
    // new key will always be 0
    if (geofences.value[temp_fence_key] != undefined) {
      //console.log('ERROR, TWO NEW GEOFENCES')
    }
    geofences.value[temp_fence_key] = {
      name: name,
      selected: false,
      latlons: [],
      notify: false,
    }
    return temp_fence_key
  }

  function remove(key) {
    delete geofences.value[key]
  }

  function select(key) {
    console.log('selecting fence')
    const fence = geofences.value[key]
    if (!fence) {
      selected_fence.value = ''
      selected_fence_key.value = ''
      return
    }
    console.log(key)
    selected_fence.value = fence
    selected_fence_key.value = key
    set_force_map_update(true)
  }

  function selectGeofence(key) {
    if (onSelectGeofenceHandler.value) {
      onSelectGeofenceHandler.value(key)
    } else {
      select(key)
    }
  }

  function setSelectGeofenceHandler(handler) {
    onSelectGeofenceHandler.value = handler
  }

  function deselect() {
    selected_fence.value = ''
    selected_fence_key.value = ''
    select_idx(null)
  }

  function select_idx(idx) {
    selected_idx.value = idx
    set_force_map_update(true)
  }

  function append_cord_selected_fence(lat_lon) {
    const key = selected_fence_key.value
    geofences.value[key].latlons[geofences.value[key].latlons.length - 1] = lat_lon
  }

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
    find_on_name,
    add,
    remove,
    select,
    selectGeofence,
    setSelectGeofenceHandler,
    deselect,
    saveOrUpdateGeofence,
    deleteGeofence,
    getGeofences,
    selected_kml_geo_json,
    apply_coordinates_from_kml_file,
  }
})
