import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient, { getEvenSource } from '@/apiClient'

export const useLogsStore = defineStore('logs', () => {
  const logs = ref([])

  const sort_logs = (logs_to_sort) => {
    return [...logs_to_sort].sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const add_log = (log) => {
    logs.value = sort_logs([log, ...logs.value.filter((existing) => existing._id !== log._id)])
  }

  const register_sse = () => {
    const eventSource = getEvenSource()

    eventSource.addEventListener('gliders.logs.new', ({ data }) => {
      console.log('gliders.logs.new: ', data)
      add_log(JSON.parse(data))
    })
  }

  const get_logs = () => {
    apiClient
      .get('/logs')
      .then((res) => {
        logs.value = sort_logs(res.data)
        register_sse()
      })
      .catch(() => {
        setTimeout(get_logs, 2000)
      })
  }

  const logs_obj = computed(() => {
    const ret = {}
    logs.value.forEach((log) => {
      ret[log._id] = { ...log }
    })
    return ret
  })

  return {
    get_logs,
    logs,
    logs_obj,
  }
})
