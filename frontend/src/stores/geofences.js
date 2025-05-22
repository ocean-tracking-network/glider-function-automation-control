import { ref, computed, onMounted } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { useEventsStore } from './events'

export const useGeoFencesStore = defineStore('geofences', () => {
  const geofences = ref({})
  const temp_fence_key = 123
  const selected_fence = ref('')
  const selected_fence_key = ref('')
  const selected_idx = ref(null)
  const interactive_map = ref(false)
  const force_map_update = ref(false)
  const eventsStore = useEventsStore()

  const set_force_map_update = (value) => {
    force_map_update.value = value
  }

  const getGeofences = () => {
    geofences.value = {}
    const url = 'http://localhost:3000/geofence'
    axios.get(url).then((res) => {
      res.data.forEach((ele) => {
        geofences.value[ele._id] = {
          latlons: ele.latlons,
          name: ele.name,
          selected: false,
        }
        // //console.log(ele)
      })
      set_force_map_update(true)
    })
  }

  const saveGeoFence = () => {
    const geofence = geofences.value[temp_fence_key]
    const url = 'http://localhost:3000/geofence'
    if (!geofence.name && geofence.latlons.length == 1) {
      return false
    }
    const data = {
      name: geofence.name,
      latlons: geofence.latlons,
    }
    axios.post(url, data).then((res) => {
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
    }
    console.log(data)
    const url = 'http://localhost:3000/geofence/' + selected_fence_key.value
    axios.patch(url, data).then((res) => {
      //console.log(res)
      getGeofences()
    })
  }

  const deleteGeofence = (id) => {
    const url = 'http://localhost:3000/geofence/' + id
    axios.delete(url).then((res) => {
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

  function append_cord_selected_fence() {}

  onMounted(() => {
    getGeofences()
  })

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
  }
})
