import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'

export const useFilesStore = defineStore('files', () => {
  const files_raw = ref([])

  onMounted(() => {
    get_files()
  })

  const get_files = () => {
    axios.get('http://localhost:3000/files').then((res) => {
      files_raw.value = res.data
    })
  }

  const delete_file = (id) => {
    axios.delete('http://localhost:3000/files/' + id).then((res) => {
      get_files()
    })
  }

  const upload_files = (event) => {
    let formData = new FormData()
    for (let i = 0; i < event.target.files.length; i++) {
      formData.append('files', event.target.files[i])
    }
    const headers = {
      'Content-Type': 'multipart/form-data',
    }

    axios
      .post('http://localhost:3000/files', formData, {
        headers: headers,
      })
      .then((res) => {
        console.log(res)
        get_files()
      })
  }

  const files_obj = computed(() => {
    let ret = {}

    files_raw.value.forEach((ele) => {
      ret[ele._id] = ele
    })

    return ret
  })

  const files_arr = computed(() => {
    let ret = []
    files_raw.value.forEach((ele) => {
      ret.push({
        ...ele,
        name: ele.filename,
      })
    })
    return ret
  })

  return {
    files_obj,
    files_arr,
    files_raw,
    upload_files,
    delete_file,
    get_files,
  }
})
