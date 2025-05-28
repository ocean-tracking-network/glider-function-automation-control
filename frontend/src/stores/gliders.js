import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/apiClient'

export const useGlidersStore = defineStore('gliders', () => {
  const gliders = ref([])
  const selected_glider_idx = ref({})

  const get_gliders = () => {
    apiClient.get('/glider').then((res) => {
      gliders.value = res.data
    })
  }

  const select_glider = (glider_index) => {
    selected_glider_idx.value = glider_index
  }

  const enable_disable_selected_glider = () => {
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

  const save_glider = (g) => {
    data = {
      name: g.name,
    }
    apiClient.post('/glider', data).then((res) => {
      console.log(res)
      get_gliders()
    })
  }

  const gliders_obj = computed(() => {
    let ret = {}
    gliders.value.forEach((ele) => {
      ret[ele._id] = {
        ...ele,
      }
    })
    return ret
  })

  const selected_glider = computed(() => {
    return gliders.value[selected_glider_idx.value]
  })

  return {
    save_glider,
    get_gliders,
    select_glider,
    enable_disable_selected_glider,
    gliders_obj,
    selected_glider_idx,
    selected_glider,
    gliders,
  }
})
