import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth.js'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000
})

// 请求拦截器：自动附加 Token
request.interceptors.request.use(
  config => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器：401 时自动刷新 Token
let isRefreshing = false
let refreshQueue = []

request.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // 排除登录/注册/刷新本身
      if (originalRequest.url.includes('/auth/login') ||
          originalRequest.url.includes('/auth/register') ||
          originalRequest.url.includes('/auth/refresh')) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshToken = getRefreshToken()
          if (!refreshToken) throw new Error('无 Refresh Token')

          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
            { refreshToken }
          )
          const { accessToken, refreshToken: newRefresh } = res.data
          setTokens(accessToken, newRefresh)

          // 重试队列中所有请求
          refreshQueue.forEach(cb => cb(accessToken))
          refreshQueue = []

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return request(originalRequest)
        } catch {
          refreshQueue = []
          clearTokens()
          window.location.hash = '#/login'
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      } else {
        // 正在刷新中，把请求挂起
        return new Promise(resolve => {
          refreshQueue.push(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(request(originalRequest))
          })
        })
      }
    }

    return Promise.reject(error)
  }
)

export default request
