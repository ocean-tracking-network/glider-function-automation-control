import apiClient from '@/apiClient'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useGlidersStore } from './gliders'
import { useFilesStore } from './files'
import { useGeoFencesStore } from './geofences'
import type { EventGliderFile, GliderEvent, Script, ScriptOptions, UploadedFile } from '@/lib/types'

export const useEventsStore = defineStore('events', () => {
  const gliderStore = useGlidersStore()
  const filesStore = useFilesStore()
  const geofenceStore = useGeoFencesStore()
  const events = ref<GliderEvent[]>([])

  const enter_files_ref = ref<EventGliderFile[]>([])
  const exit_files_ref = ref<EventGliderFile[]>([])

  const add_event = (event_type: 'enter' | 'exit', options: ScriptOptions) => {
    const selected_glider = gliderStore.selected_glider
    const selected_fence_key = geofenceStore.selected_fence_key

    if (!selected_glider?._id || !selected_fence_key) {
      console.warn('Cannot add event: missing selected glider or geofence')
      return
    }

    const data: Script = {
      file_id: options.file_id,
      script: options.script,
      script_type: options.script_type,
      geofence: selected_fence_key,
      glider: selected_glider._id,
      event_type: event_type
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

  const remove_event = (id: string) => {
    const event = events.value.find((ele) => {
      return ele._id == id
    })
    if (event) {
      apiClient
        .delete('/events/' + id)
        .then(() => {
          console.log('deleted!')
          get_events()
        })
        .catch(() => {
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

  const trigger_event = (event: GliderEvent) => {
    apiClient.post(`/events/${event._id}/trigger`, {}).then(() => {
      console.log('Event triggered!')
    })
  }

  const glider_has_geofence_event = (glider_id: string, geofence_id: string) => {
    const found = events.value.find(
      (event) => event.geofence == geofence_id && event.glider == glider_id,
    )
    if (found) {
      console.log(`Found glider geofence event ${found}`)
    }
    return found
  }

  const selected_glider_scripts = computed(() => {
    const ret: {enter?: GliderEvent, exit?: GliderEvent} = {}
    if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
      events.value.forEach((event) => {
        if (
          event.file_id &&
          event.glider == gliderStore.selected_glider?._id &&
          event.geofence == geofenceStore.selected_fence_key
        ) {
          if (event.event_type === 'exit') {
            ret.exit = event
          } else if (event.event_type === 'enter') {
            ret.enter = event
          }
        }
      })
    }
    return ret
  })

  const exit_files = computed(() => {
    const ret: (UploadedFile & GliderEvent)[] = []
    const { selected_glider } = gliderStore
    const { selected_fence_key } = geofenceStore

    if (!selected_glider || !selected_fence_key) {
      return ret
    }

    events.value.forEach((ele) => {
      if (ele.file_id === undefined) return

      const file_obj = filesStore.files_obj[ele.file_id]

      if (
        file_obj &&
        ele.glider == selected_glider._id &&
        ele.geofence == selected_fence_key &&
        ele.event_type === 'exit'
      ) {
        ret.push({
          ...ele,
          filename: file_obj.filename,
          category: file_obj.category,
          path: file_obj.path,
        })
      }
    })

    return ret
  })

  const enter_files = computed(() => {
    const ret: (UploadedFile & GliderEvent)[] = []
    const { selected_glider } = gliderStore
    const { selected_fence_key } = geofenceStore

    if (!selected_glider || !selected_fence_key) {
      return ret
    }

    events.value.forEach((ele) => {
      if (ele.file_id === undefined) return

      const file_obj = filesStore.files_obj[ele.file_id]

      if (
        file_obj &&
        ele.glider == selected_glider._id &&
        ele.geofence == geofenceStore.selected_fence_key &&
        ele.event_type === 'enter'
      ) {
        ret.push({
          ...ele,
          filename: file_obj.filename,
          category: file_obj.category,
          path: file_obj.path,
        })
      }
    })

    return ret
  })

  // const glider_script_events = computed(() => {
  //   const ret = {}
  //   if (gliderStore.selected_glider && geofenceStore.selected_fence_key) {
  //     events.value.forEach((event) => {
  //       if (event.script) {
  //         ret[event.event_type] = event.script
  //       }
  //     })
  //   }
  // })

  watch(enter_files, (new_Val) => {
    enter_files_ref.value = new_Val
  })
  watch(exit_files, (new_Val) => {
    exit_files_ref.value = new_Val
  })

  // This only changes when a new file get's dragged in
  watch(exit_files_ref, (new_exit_files_ref) => {
    new_exit_files_ref.forEach((exit_file) => {
      if (exit_file.file_id === undefined) {
        add_event('exit', { file_id: exit_file._id })
      }
      if (exit_file.event_type === 'enter') {
        add_event('exit', { file_id: exit_file.file_id })
        remove_event(exit_file._id)
      }
    })
  }, { deep: true })
  watch(enter_files_ref, (new_enter_files_ref) => {
    new_enter_files_ref.forEach((enter_file) => {
      if (enter_file.file_id === undefined) {
        add_event('enter', { file_id: enter_file._id })
      }
      if (enter_file.event_type === 'exit') {
        add_event('enter', { file_id: enter_file.file_id })
        remove_event(enter_file._id)
      }
    })
    }, { deep: true })

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
