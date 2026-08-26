import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient, { getEventSource } from '@/apiClient'
import type { GliderLog } from '@/lib/types';

export const useLogsStore = defineStore('logs', () => {
  const logs = ref<GliderLog[]>([])

  const sort_logs = (logs_to_sort: GliderLog[]) => {
    return [...logs_to_sort].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  }

  const add_log = (log: GliderLog) => {
    logs.value = sort_logs([log, ...logs.value.filter((existing) => existing._id !== log._id)])
  }

  const register_sse = () => {
    const eventSource = getEventSource()

    eventSource.addEventListener('logs.new', ({ data }) => {
      console.log('logs.new: ', data)
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
    const ret: {[_id: string]: GliderLog} = {}
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
