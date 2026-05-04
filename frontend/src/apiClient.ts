import axios from 'axios'

function generate_base_url() {
  const isLocal =
    window.location.hostname.startsWith('192.168') || window.location.hostname === 'localhost'
  return isLocal
    ? import.meta.env.VITE_API_BASE_URL_LOCAL
    : import.meta.env.VITE_API_BASE_URL_PUBLIC
}

const apiClient = axios.create({
  baseURL: generate_base_url(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** @type {EventSource} */
let eventSource

export const createEventSource = () => {
  if (eventSource) return eventSource
  eventSource = new EventSource(`${generate_base_url()}/sse?token=${getToken()}`)
  return eventSource
}

export const getEvenSource = () => eventSource ?? createEventSource()

export const getToken = () => localStorage.getItem('GFAC_token')

apiClient.interceptors.request.use(function (config) {
  const token = getToken()
  config.headers.Authorization = `token ${token}`

  return config
})

export default apiClient
