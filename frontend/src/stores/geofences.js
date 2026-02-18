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
  const eventsStore = useEventsStore()
  const filesStore = useFilesStore()
  const {local_kml_file} = storeToRefs(filesStore)

  watch(local_kml_file, async (new_kml_file) => {
    if (!new_kml_file) {
      selected_kml_geo_json.value = null
    } else {
      const kmlText = await new_kml_file.text()
      const kmlDom = new DOMParser().parseFromString(kmlText, "text/xml")
      selected_kml_geo_json.value = kml(kmlDom).features.map((feature) => {
        return {
          coordinates: feature.geometry.coordinates[0],
          placemark: feature.properties.name,
          description: feature.properties.description,
        }
      })
    }
  })

  watch(selected_kml_geo_json, () => {
    // Auto Fill geofence latlons inputs if inputs are empty
    // and kml file contains only 1 placemark
    if (selected_fence.value.latlons.length <= 1 && selected_kml_geo_json.value.length === 1) {
      apply_coordinates_from_kml_file(selected_kml_geo_json.value[0].coordinates)
      local_kml_file.value = null
    }
  })

  const apply_coordinates_from_kml_file = (latlons) => {
    selected_fence.value.latlons = latlons
  }

  const set_force_map_update = (value) => {
    force_map_update.value = value
  }

  const getGeofences = () => {
    geofences.value = {}
    const url = '/geofence'
    apiClient.get(url).then((res) => {
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
    const geofence = geofences.value[temp_fence_key]
    const url = '/geofence'
    if (!geofence.name && geofence.latlons.length == 1) {
      return false
    }
    const data = {
      name: geofence.name ? geofence.name : 'Untitled',
      latlons: geofence.latlons,
      notify: geofence.notify,
    }
    apiClient.post(url, data).then((res) => {
      getGeofences()
    })
    return true
  }

  const saveOrUpdateGeofence = () => {
    if (selected_fence_key.value == temp_fence_key) {
      console.log('SAVE')
      const res = saveGeoFence()
      if (!res) {
        delete geofences.value[temp_fence_key]
      }
    } else if (selected_fence_key.value != '') {
      console.log('UPDATE')
      updateGeofence()
    }
    // if (!Object.keys(geofences.value).includes(temp_fence_key.toString())) {
    //   return
    // }
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
    apiClient.patch(url, data).then((res) => {
      //console.log(res)
      getGeofences()
    })
  }

  const deleteGeofence = (id) => {
    const url = '/geofence/' + id
    apiClient.delete(url).then((res) => {
      getGeofences()
      eventsStore.get_events()
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
    console.log(key)
    selected_fence.value = geofences.value[key]
    selected_fence_key.value = key
    set_force_map_update(true)
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
    set_geofence,
    set_force_map_update,
    select_idx,
    find_on_name,
    add,
    remove,
    select,
    deselect,
    saveOrUpdateGeofence,
    deleteGeofence,
    getGeofences,
    selected_kml_geo_json,
    apply_coordinates_from_kml_file
  }
})
