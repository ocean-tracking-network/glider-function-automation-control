import apiClient from '@/apiClient'
import { defineStore } from 'pinia'
import { nextTick, onMounted, ref } from 'vue'

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

  const username = ref(null)
  const token = ref(null)

  const loggedin = ref(false)

  onMounted(() => {
    const stored_username = localStorage.getItem(localStorage_username)
    const stored_token = localStorage.getItem(localStorage_token)
    if (stored_username && stored_token) {
      // test to see if we're logged in
      localStorage.setItem(localStorage_token, stored_token)
      apiClient
        .get('/glider')
        .then((res) => {
          _login(stored_username, stored_token)
        })
        .catch((err) => {
          console.log('BAD GLIDER')
          localStorage_token.setItem(localStorage_token, '')
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

  function _login(login_username, login_token) {
    username.value = login_username
    token.value = login_token

    localStorage.setItem(localStorage_username, login_username)
    localStorage.setItem(localStorage_token, login_token)
    console.log('LOGGING IN?>????')

    loggedin.value = true

    nextTick(() => {
      _activate_stores()
    })
  }

  const login = (username, password) => {
    const data = {
      username: username,
      password,
      password,
    }
    apiClient
      .post('/login', data)
      .then((res) => {
        _login(username, res.data['token'])
      })
      .catch((err) => {
        console.log('wrong username or password')
        console.log(err)
        loggedin.value = false
      })
  }

  return {
    username,
    token,
    loggedin,
    login,
  }
})
