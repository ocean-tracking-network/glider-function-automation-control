import apiClient from '@/apiClient'
import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useEventsStore } from './events'

export const useFilesStore = defineStore('files', () => {
  const files_raw = ref([])
  const local_kml_file = ref(null)
  const eventsStore = useEventsStore()

  const colours = [
    'purple',
    'darkgreen',
    'orange',
    'blue',
    '#800000', // Maroon
    '#008000', // Green
    '#000080', // Navy
    '#808000', // Olive
    '#800080', // Purple
    '#008080', // Teal
    '#FFA500', // Orange
    '#A52A2A', // Brown
    '#0000FF', // Blue
    '#DC143C', // Crimson
    '#00CED1', // DarkTurquoise
    '#9400D3', // DarkViolet
    '#FF1493', // DeepPink
    '#1E90FF', // DodgerBlue
    '#B22222', // FireBrick
    '#228B22', // ForestGreen
    '#FFD700', // Gold
    '#ADFF2F', // GreenYellow
    '#4B0082', // Indigo
    '#F08080', // LightCoral
    '#90EE90', // LightGreen
    '#ADD8E6', // LightBlue
    '#E0FFFF', // LightCyan
    '#FFB6C1', // LightPink
    '#20B2AA', // LightSeaGreen
    '#87CEFA', // LightSkyBlue
    '#32CD32', // LimeGreen
    '#BA55D3', // MediumOrchid
    '#9370DB', // MediumPurple
    '#3CB371', // MediumSeaGreen
    '#7B68EE', // MediumSlateBlue
    '#00FA9A', // MediumSpringGreen
    '#48D1CC', // MediumTurquoise
    '#C71585', // MediumVioletRed
    '#191970', // MidnightBlue
    '#FFE4B5', // Moccasin
    '#FFA07A', // LightSalmon
    '#DA70D6', // Orchid
    '#98FB98', // PaleGreen
    '#DB7093', // PaleVioletRed
    '#AFEEEE', // PaleTurquoise
    '#FFEFD5', // PapayaWhip
    '#FFC0CB', // Pink
    '#DDA0DD', // Plum
    '#B0E0E6', // PowderBlue
    '#FA8072', // Salmon
    '#F4A460', // SandyBrown
    '#2E8B57', // SeaGreen
    '#A0522D', // Sienna
    '#6A5ACD', // SlateBlue
    '#708090', // SlateGray
    '#00FF7F', // SpringGreen
    '#4682B4', // SteelBlue
    '#D2B48C', // Tan
    '#D8BFD8', // Thistle
    '#FF6347', // Tomato
    '#40E0D0', // Turquoise
    '#EE82EE', // Violet
    '#F5DEB3', // Wheat
    '#9ACD32', // YellowGreen
  ]

  //

  const get_files = () => {
    apiClient.get('/files').then((res) => {
      files_raw.value = res.data
    })
  }

  const delete_file = (id) => {
    apiClient.delete('/files/' + id).then((res) => {
      get_files()
      eventsStore.get_events()
    })
  }

  const upload_kml_file = (event, files) => {
    const file = event ? event.target.files[0] : files[0]
    local_kml_file.value = file
  }

  const clear_kml_file = () => {
    local_kml_file.value = null
  }

  const upload_files = (event, category) => {
    let formData = new FormData()
    for (let i = 0; i < event.target.files.length; i++) {
      formData.append('files', event.target.files[i])
      formData.append('category', category)
    }
    const headers = {
      'Content-Type': 'multipart/form-data',
    }

    apiClient
      .post('/files', formData, {
        headers: headers,
      })
      .then((res) => {
        console.log(res)
        get_files()
      })
  }

  const update_files_category = (files) => {
    apiClient
      .patch('/files', files)
      .then((res) => {
        get_files()
      })
      .catch((err) => {
        console.log(err)
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
  const categories = computed(() => {
    let cats = []
    files_raw.value.forEach((ele) => {
      if (!cats.includes(ele.category)) {
        cats.push(ele.category)
      }
    })
    return cats
  })

  const colour_by_category = computed(() => {
    let ret = {}
    for (let i = 0; i < categories.value.length; i++) {
      if (i > colours.length) {
        console.log('wow, too many categories for my chatgpt colour list... please remove some')
      } else {
        ret[categories.value[i]] = colours[i]
      }
    }
    return ret
  })

  return {
    files_obj,
    files_arr,
    files_raw,
    categories,
    colour_by_category,
    update_files_category,
    upload_files,
    delete_file,
    get_files,
    local_kml_file,
    upload_kml_file,
    clear_kml_file
  }
})
