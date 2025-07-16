import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(function (config) {
  const token = localStorage.getItem('GFAC_token')
  config.headers.Authorization = `token ${token}`

  return config
})

export default apiClient
