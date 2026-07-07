import { describe, it, expect, beforeEach } from 'vitest'
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isLoggedIn } from '../utils/auth.js'

// 用 jsdom 模拟 localStorage
beforeEach(() => {
  localStorage.clear()
})

describe('auth utils — Token 存储管理', () => {
  describe('setTokens() / getAccessToken() / getRefreshToken()', () => {
    it('setTokens 后 getAccessToken 应返回正确值', () => {
      setTokens('access-123', 'refresh-456')
      expect(getAccessToken()).toBe('access-123')
    })

    it('setTokens 后 getRefreshToken 应返回正确值', () => {
      setTokens('access-123', 'refresh-456')
      expect(getRefreshToken()).toBe('refresh-456')
    })
  })

  describe('clearTokens()', () => {
    it('应清除所有 token', () => {
      setTokens('access', 'refresh')
      clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })
  })

  describe('isLoggedIn()', () => {
    it('无 token 时应返回 false', () => {
      expect(isLoggedIn()).toBe(false)
    })

    it('有 accessToken 时应返回 true', () => {
      setTokens('valid-token', '')
      expect(isLoggedIn()).toBe(true)
    })
  })
})
