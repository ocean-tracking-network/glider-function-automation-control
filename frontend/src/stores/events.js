import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useGlidersStore } from './gliders'
import { useFilesStore } from './files'
import { useGeoFencesStore } from './geofences'

export const useEventsStore = defineStore('events', () => {
  const gliderStore = useGlidersStore()
  const filesStore = useFilesStore()
  const geofenceStore = useGeoFencesStore()
  const events = ref([])

  const enter_files_ref = ref([])
  const exit_files_ref = ref([])

  const add_event = (file_id, event_type) => {
    const data = {
      file: file_id,
      geofence: geofenceStore.selected_fence_key,
      glider: gliderStore.selected_glider._id,
      event_type: event_type,
    }
    axios.post('http://localhost:3000/events', data).then((res) => {
      console.log('Added event')
      console.log(data)
      get_events()
    })
  }

  const remove_event = (id) => {
    const event = events.value.find((ele) => {
      return ele._id == id
    })
    if (event) {
      axios
        .delete('http://localhost:3000/events/' + id)
        .then((res) => {
          console.log('deleted!')
          get_events()
        })
        .catch((err) => {
          console.log('nope')
        })
    } else {
      console.log('CANNOT REMOVE EVENT, UNDEFINED!')
    }
  }

  const get_events = () => {
    axios
      .get('http://localhost:3000/events')
      .then((res) => {
        events.value = res.data
      })
      .catch((err) => {
        console.log(err)
      })
  }

  onMounted(() => {
    get_events()
  })

  const glider_has_geofence_event = (glider_id, geofence_id) => {
    const found = events.value.find(
      (event) => event.geofence == geofence_id && event.glider == glider_id,
    )
    console.log(found)
    return found
  }

  const exit_files = computed(() => {
    let ret = []
    if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((ele) => {
        if (
          ele.glider == gliderStore.selected_glider._id &&
          ele.geofence == geofenceStore.selected_fence_key &&
          ele.event_type == 'exit'
        ) {
          ret.push({
            ...ele,
            name: filesStore.files_obj[ele.file].filename,
          })
        }
      })
    }
    return ret
  })

  const enter_files = computed(() => {
    let ret = []
    if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((ele) => {
        if (
          ele.glider == gliderStore.selected_glider._id &&
          ele.geofence == geofenceStore.selected_fence_key &&
          ele.event_type == 'enter'
        ) {
          ret.push({
            ...ele,
            name: filesStore.files_obj[ele.file].filename,
          })
        }
      })
    }
    return ret
  })

  watch(enter_files, (new_Val) => {
    enter_files_ref.value = new_Val
  })
  watch(exit_files, (new_Val) => {
    exit_files_ref.value = new_Val
  })

  // This only changes when a new file get's dragged in
  watch(
    exit_files_ref,
    (new_exit_files_ref) => {
      new_exit_files_ref.forEach((exit_file) => {
        if (exit_file.file == undefined) {
          add_event(exit_file._id, 'exit')
        }
        if (exit_file.event_type == 'enter') {
          add_event(exit_file.file, 'exit')
          remove_event(exit_file._id)
        }
      })
    },
    { deep: true },
  )
  watch(
    enter_files_ref,
    (new_enter_files_ref) => {
      new_enter_files_ref.forEach((enter_file) => {
        if (enter_file.file == undefined) {
          add_event(enter_file._id, 'enter')
        }
        if (enter_file.event_type == 'exit') {
          add_event(enter_file.file, 'enter')
          remove_event(enter_file._id)
        }
      })
    },
    { deep: true },
  )
  //

  return {
    events,
    enter_files,
    exit_files,
    enter_files_ref,
    exit_files_ref,
    get_events,
    add_event,
    remove_event,
    glider_has_geofence_event,
  }
})
