import apiClient from '@/apiClient'
import { defineStore, storeToRefs } from 'pinia'
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

  const { selected_fence_key, is_geofence_tab_selected } = storeToRefs(geofenceStore)
  const { selected_glider } = storeToRefs(gliderStore)

  const enter_files_ref = ref<EventGliderFile[]>([])
  const exit_files_ref = ref<EventGliderFile[]>([])

  const add_event = (event_type: 'enter' | 'exit', options: ScriptOptions) => {
    if (!selected_glider.value?._id) {
      console.warn('Cannot add event: missing selected glider or geofence')
      return
    }

    const data: Script = {
      file: options.file,
      script: options.script,
      script_type: options.script_type,
      geofence: selected_fence_key.value || "ship",
      glider: selected_glider.value._id,
      event_type: event_type,
      ship_max_minute: 90
    }

    apiClient.post('/events', data).then(() => {
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
    return found
  }

  const selected_glider_event_scripts = computed(() => {
    const ret: {enter?: GliderEvent, exit?: GliderEvent} = {}
    const geofence_filter = is_geofence_tab_selected.value ? selected_fence_key.value : "ship"
    const glider_filter = selected_glider.value?._id
    if (gliderStore.selected_glider && (geofenceStore.selected_fence_key || !is_geofence_tab_selected.value)) {
      events.value.forEach((event) => {
        if (
          event.script &&
          event.glider == glider_filter &&
          event.geofence == geofence_filter
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
    const geofence_filter = is_geofence_tab_selected.value ? selected_fence_key.value : "ship"
    const glider_filter = selected_glider.value?._id

    if (!selected_glider.value || (!selected_fence_key.value && is_geofence_tab_selected.value)) {
      return ret
    }

    events.value.forEach((ele) => {
      if (!ele.file) return

      const file_obj = filesStore.files_obj[ele.file]

      if (
        file_obj &&
        ele.glider == glider_filter &&
        ele.geofence == geofence_filter &&
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
    const geofence_filter = is_geofence_tab_selected.value ? selected_fence_key.value : "ship"
    const glider_filter = selected_glider.value?._id

    if (!selected_glider.value || (!selected_fence_key.value && is_geofence_tab_selected.value)) {
      return ret
    }

    events.value.forEach((ele) => {
      if (!ele.file) return

      const file_obj = filesStore.files_obj[ele.file]
      if (
        file_obj &&
        ele.glider == glider_filter &&
        ele.geofence == geofence_filter &&
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
      if (exit_file.file === undefined) {
        add_event('exit', { file: exit_file._id })
      }
      if (exit_file.event_type === 'enter') {
        add_event('exit', { file: exit_file.file })
        remove_event(exit_file._id)
      }
    })
  }, { deep: true })
  watch(enter_files_ref, (new_enter_files_ref) => {
    new_enter_files_ref.forEach((enter_file) => {
      if (enter_file.file == undefined) {
        add_event('enter', { file: enter_file._id })
      }
      if (enter_file.event_type === 'exit') {
        add_event('enter', { file: enter_file.file })
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
    selected_glider_event_scripts: selected_glider_event_scripts,
    trigger_event,
    get_events,
    add_event,
    remove_event,
    glider_has_geofence_event,
  }
})
