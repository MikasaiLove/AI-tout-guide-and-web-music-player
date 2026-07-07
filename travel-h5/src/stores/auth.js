import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/auth.js'
import request from '../utils/request.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)

  // 初始化：用本地 Token 获取用户信息
  async function initAuth() {
    const token = getAccessToken()
    if (!token) {
      loading.value = false
      return
    }
    try {
      const res = await request.get('/auth/me')
      user.value = res.data.user
    } catch {
      clearTokens()
    } finally {
      loading.value = false
    }
  }

  // 注册
  async function register(username, password, nickname) {
    const res = await request.post('/auth/register', { username, password, nickname })
    user.value = res.data.user
    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken)
    return res.data
  }

  // 登录
  async function login(username, password) {
    const res = await request.post('/auth/login', { username, password })
    user.value = res.data.user
    setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken)
    return res.data
  }

  // 退出
  async function logout() {
    try {
      await request.post('/auth/logout')
    } catch { /* ignore */ }
    clearTokens()
    user.value = null
  }

  return { user, loading, initAuth, register, login, logout }
})
