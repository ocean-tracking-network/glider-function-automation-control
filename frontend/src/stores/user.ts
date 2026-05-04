import apiClient, { createEventSource } from '@/apiClient'
import { defineStore } from 'pinia'
import { computed, nextTick, onMounted, ref } from 'vue'

import { useGlidersStore } from './gliders'
import { useGeoFencesStore } from './geofences'
import { useFilesStore } from './files'
import { useEventsStore } from './events'
import { useLogsStore } from './logs'
import { AxiosError } from 'axios'
import type { DeletableUser } from '@/lib/types'

export const useUserStore = defineStore('user', () => {
  const gliderStore = useGlidersStore()
  const goefenceStore = useGeoFencesStore()
  const filesStore = useFilesStore()
  const eventsStore = useEventsStore()
  const logsStore = useLogsStore()

  const localStorage_username = 'GFAC_username'
  const localStorage_token = 'GFAC_token'

  //ROLE CONST ADDED TO ALLOW PRIVILEGE CONSIDERATION
  const localStorage_role = 'GFAC_role'

  const username = ref<string | null>(null)
  const token = ref<string | null>(null)

  //ROLE CONST ADDED TO ALLOW PRIVILEGE CONSIDERATION
  const role = ref<string | null>(null)

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
        .then(() => {
          _login(stored_username, stored_token, stored_role || 'viewer')
        })
        .catch(() => {
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
    logsStore.get_logs()
    //init event source
    createEventSource()
  }

  //ROLE/TOKEN CHECK
  function _login(login_username: string, login_token: string, login_role: string) {
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

  const login = (username: string, password: string) => {
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

  const createUser = async (newUsername: string, newPassword: string, newRole: string) => {
    try {
      const data = {
        username: newUsername,
        password: newPassword,
        role: newRole,
      }
      const response = await apiClient.post('/users', data)
      return { success: true, data: response.data }
    } catch (err) {
      console.error('Error creating user:', err)
      if (err instanceof AxiosError && err.response) {
        if (err.response.status === 409) {
          return { success: false, error: 'Username already exists' }
        } else if (err.response.status === 403) {
          return { success: false, error: 'You do not have permission to create users' }
        } else if (err.response.status === 400) {
          return { success: false, error: 'Username and password are required' }
        }
      }
      return { success: false, error: 'Failed to create user' }
    }
  }

  const getDeletableUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      const users = Array.isArray(response.data?.users) ? response.data.users : []
      const normalizedUsers = users
        .map((user: DeletableUser) => ({
          username: user?.username,
          role: user?.role === 'admin' ? 'admin' : 'viewer',
          lastLogin: user?.lastLogin,
        }))
        .filter((user: DeletableUser) => !!user.username)

      return { success: true, users: normalizedUsers }
    } catch (err) {
      console.error('Error fetching deletable users:', err)
      if (err instanceof (AxiosError) && err.response) {
        if (err.response?.status === 403) {
          return { success: false, users: [], error: 'You do not have permission to manage users' }
        }
      }
      return { success: false, users: [], error: 'Failed to load users' }
    }
  }

  const deleteUser = async (targetUsername: string) => {
    try {
      await apiClient.delete(`/users/${encodeURIComponent(targetUsername)}`)
      return { success: true }
    } catch (err) {
      console.error('Error deleting user:', err)
      if (err instanceof AxiosError && err.response) {
        if (err.response.status === 404) {
          return { success: false, error: 'User not found' }
        } else if (err.response.status === 403) {
          return { success: false, error: 'You do not have permission to delete users' }
        } else if (err.response.status === 400) {
          return { success: false, error: err.response.data?.error || 'Invalid delete request' }
        }
      }

      return { success: false, error: 'Failed to delete user' }
    }
  }

  const userExists = async (targetUsername: string) => {
    try {
      const response = await apiClient.get(`/users/${encodeURIComponent(targetUsername)}/exists`)
      return { success: true, exists: !!response.data?.exists }
    } catch (err) {
      console.error('Error checking user existence:', err)
      if (err instanceof AxiosError && err.response) {
        if (err.response.status === 403) {
          return {
          success: false,
          exists: false,
          error: 'You do not have permission to manage users',
        }
        }
      }
      return { success: false, exists: false, error: 'Failed to validate user' }
    }
  }

  return {
    username,
    token,
    role,
    isAdmin,
    loggedin,
    login,
    logout,
    createUser,
    getDeletableUsers,
    deleteUser,
    userExists,
  }
})
