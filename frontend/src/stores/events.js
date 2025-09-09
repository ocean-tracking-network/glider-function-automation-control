import apiClient from '@/apiClient'
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

  // options {} file_id if file, script and script_type if a script
  const add_event = (event_type, options) => {
    const file_id = options.file_id
    const script = options.script
    const script_type = options.script_type

    const data = {
      geofence: geofenceStore.selected_fence_key,
      glider: gliderStore.selected_glider._id,
      event_type: event_type,
    }
    if (file_id) {
      data.file = file_id
    } else if (script) {
      data.script = script
      data.script_type = script_type
    }
    console.log('options')
    console.log(options)
    console.log('data')
    console.log(data)

    apiClient.post('/events', data).then((res) => {
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
      apiClient
        .delete('/events/' + id)
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
    apiClient
      .get('/events')
      .then((res) => {
        events.value = res.data
      })
      .catch((err) => {
        console.log(err)
      })
  }

  const trigger_event = (event) => {
    apiClient.post(`/events/${event._id}/trigger`, {}).then((res) => {
      console.log('Event triggered!')
    })
  }

  const glider_has_geofence_event = (glider_id, geofence_id) => {
    const found = events.value.find(
      (event) => event.geofence == geofence_id && event.glider == glider_id,
    )
    console.log(found)
    return found
  }

  const selected_glider_scripts = computed(() => {
    let ret = {}
    if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((event) => {
        if (
          event.script &&
          event.glider == gliderStore.selected_glider._id &&
          event.geofence == geofenceStore.selected_fence_key
        ) {
          if (event.event_type == 'exit') {
            ret.exit = event
          } else if (event.event_type == 'enter') {
            ret.enter = event
          }
        }
      })
    }
    return ret
  })

  const exit_files = computed(() => {
    let ret = []
    if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((ele) => {
        if (
          ele.file &&
          ele.glider == gliderStore.selected_glider._id &&
          ele.geofence == geofenceStore.selected_fence_key &&
          ele.event_type == 'exit'
        ) {
          ret.push({
            ...ele,
            name: filesStore.files_obj[ele.file].filename,
            category: filesStore.files_obj[ele.file].category,
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
          ele.file &&
          ele.glider == gliderStore.selected_glider._id &&
          ele.geofence == geofenceStore.selected_fence_key &&
          ele.event_type == 'enter'
        ) {
          ret.push({
            ...ele,
            name: filesStore.files_obj[ele.file].filename,
            category: filesStore.files_obj[ele.file].category,
          })
        }
      })
    }
    return ret
  })

  const glider_script_events = computed(() => {
    let ret = {}
    if (gliderStore.select_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((event) => {
        if (event.script) {
          ret[event.event_type] = event.script
        }
      })
    }
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
          add_event('exit', { file_id: exit_file._id })
        }
        if (exit_file.event_type == 'enter') {
          add_event('exit', { file_id: exit_file.file })
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
          add_event('enter', { file_id: enter_file._id })
        }
        if (enter_file.event_type == 'exit') {
          add_event('enter', { file_id: enter_file.file })
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
    selected_glider_scripts,
    trigger_event,
    get_events,
    add_event,
    remove_event,
    glider_has_geofence_event,
  }
})
