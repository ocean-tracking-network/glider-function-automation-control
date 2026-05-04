import { defineStore, storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useGlidersStore } from './gliders'
import apiClient from '@/apiClient'
import type { Glider, GliderScripts } from '@/lib/types'

export const useScriptsStore = defineStore('scripts', () => {
  const gliderStore = useGlidersStore()
  const { selected_glider } = storeToRefs(gliderStore)

  const scripts = ref<GliderScripts>({})

  async function get_scripts(glider_id: string) {
    let ret_scripts = {}
    await apiClient
      .get(`/glider/${glider_id}/scripts`)
      .then((res) => {
        ret_scripts = res.data
      })
      .catch((err) => {
        console.log(err)
      })
    return ret_scripts
  }

  async function try_add_new_glider(glider_obj: Glider) {
    const glider_name = glider_obj.name
    if (!scripts.value[glider_name] && glider_name) {
      const glider_scripts = await get_scripts(glider_obj._id)
      scripts.value[glider_name] = glider_scripts
    } else {
      console.log('CANNOT ADD GLIDER: ' + glider_name)
    }
  }

  onMounted(() => {
    if (selected_glider.value) try_add_new_glider(selected_glider.value)
  })

  watch(selected_glider, (new_val) => {
    if (new_val) try_add_new_glider(new_val)
  })
  return {
    scripts,
  }
})
