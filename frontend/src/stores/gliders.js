import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient, { getEvenSource } from '@/apiClient'

export const useGlidersStore = defineStore('gliders', () => {
  const gliders = ref([])
  const selected_glider_id = ref(null)

  const register_sse = () => {
    const eventSource = getEvenSource()

    eventSource.addEventListener('gliders.tracks.new', ({ data }) => {
      // console.log('gliders.tracks.new: ', data)

      const { glider_id, track } = JSON.parse(data)
      gliders.value = gliders.value.map((glider) => {
        if (glider._id !== glider_id) return glider

        return {
          ...glider,
          track: [...(glider.track ?? []), track],
        }
      })
    })
  }

  const get_gliders = () => {
    apiClient.get('/glider').then((res) => {
      gliders.value = res.data
      register_sse()
    })
  }

  const select_glider = (glider_id) => {
    selected_glider_id.value = glider_id ?? null
  }

  const enable_disable_selected_glider = () => {
    if (!selected_glider.value) return
    const data = {
      enabled: selected_glider.value.enabled,
    }
    const url = `/glider/${selected_glider.value._id}`
    apiClient
      .patch(url, data)
      .then()
      .catch((err) => {
        console.log(err)
      })
  }

  const save_glider = (name) => {
    const data = {
      name: name,
    }
    apiClient.post('/glider', data).then((res) => {
      console.log(res)
      get_gliders()
    })
  }

  const delete_glider = (glider) => {
    apiClient.delete(`/glider/${glider._id}`).then((res) => {
      console.log(res)
      get_gliders()
    })
  }

  const gliders_obj = computed(() => {
    const ret = {}
    gliders.value.forEach((ele) => {
      ret[ele._id] = { ...ele }
    })
    return ret
  })

  const selected_glider = computed(() => {
    if (!selected_glider_id.value) return null
    return gliders.value.find((g) => g._id === selected_glider_id.value) ?? null
  })

  return {
    save_glider,
    get_gliders,
    select_glider,
    delete_glider,
    enable_disable_selected_glider,
    gliders_obj,
    selected_glider_id,
    selected_glider,
    gliders,
  }
})
