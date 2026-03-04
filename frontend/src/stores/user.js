import apiClient from '@/apiClient'
import { defineStore } from 'pinia'
import { computed, nextTick, onMounted, ref } from 'vue'

import { useGlidersStore } from './gliders'
import { useGeoFencesStore } from './geofences'
import { useFilesStore } from './files'
import { useEventsStore } from './events'


export const useUserStore = defineStore('user', () => {
  const gliderStore = useGlidersStore()
  const goefenceStore = useGeoFencesStore()
  const filesStore = useFilesStore()
  const eventsStore = useEventsStore()

  const localStorage_username = 'GFAC_username'
  const localStorage_token = 'GFAC_token'

//ROLE CONST ADDED TO ALLOW PRIVILEGE CONSIDERATION
  const localStorage_role = 'GFAC_role'

  const username = ref(null)
  const token = ref(null)

//ROLE CONST ADDED TO ALLOW PRIVILEGE CONSIDERATION
  const role = ref(null)

//isAdmin CONST ADDED
  const isAdmin = computed(() => role.value === 'admin')

  const loggedin = ref(false)

  onMounted(() => {
    const stored_username = localStorage.getItem(localStorage_username)
    const stored_token = localStorage.getItem(localStorage_token)
    //GET ROLE FROM STORED USER
    const stored_role = localStorage.getItem(localStorage_role)
    if (stored_username && stored_token) {
      localStorage.setItem(localStorage_token, stored_token)
      apiClient
        .get('/glider')
        .then((res) => {
          _login(stored_username, stored_token, stored_role || 'viewer')
        })
        .catch((err) => {
          console.log('BAD GLIDER')
          localStorage.setItem(localStorage_token, '')
        })
    }
  })

  // Add stores in here that you want to get an API request from when they log in
  function _activate_stores() {
    gliderStore.get_gliders()
    goefenceStore.getGeofences()
    filesStore.get_files()
    eventsStore.get_events()
  }

  //ROLE/TOKEN CHECK
  function _login(login_username, login_token, login_role) {
    username.value = login_username
    token.value = login_token
    role.value = login_role

    localStorage.setItem(localStorage_username, login_username)
    localStorage.setItem(localStorage_token, login_token)
    localStorage.setItem(localStorage_role, login_role)

    loggedin.value = true

    nextTick(() => {
      _activate_stores()
    })
  }

  const login = (username, password) => {
    const data = {
      username,
      password,
    }
    apiClient
      .post('/login', data)
      .then((res) => {
        _login(username, res.data['token'], res.data['role'])
      })
      .catch((err) => {
        console.log('wrong username or password')
        console.log(err)
        loggedin.value = false
      })
  }

  const logout = () => {
    username.value = null
    token.value = null
    role.value = null
    loggedin.value = false

    localStorage.removeItem(localStorage_username)
    localStorage.removeItem(localStorage_token)
    localStorage.removeItem(localStorage_role)
  }

  return {
    username,
    token,
    role,
    isAdmin,
    loggedin,
    login,
    logout,
  }
})
