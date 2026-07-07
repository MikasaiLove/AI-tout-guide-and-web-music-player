import { describe, it, expect, beforeAll } from 'vitest'

// 设置 JWT 密钥环境变量
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret'
})

// 动态导入，确保环境变量在模块加载前设置
const { createTokens, verifyToken } = await import('../src/services/authService.js')

describe('authService — JWT 令牌服务', () => {
  describe('createTokens()', () => {
    it('应返回 accessToken 和 refreshToken', () => {
      const result = createTokens({ id: 'test-id', role: 'user' })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it('accessToken 应不同于 refreshToken', () => {
      const result = createTokens({ id: 'test-id', role: 'user' })
      expect(result.accessToken).not.toBe(result.refreshToken)
    })

    it('应包含 expiresIn 字段', () => {
      const result = createTokens({ id: 'test-id', role: 'user' })
      expect(result.expiresIn).toBeGreaterThan(0)
    })

    it('admin 角色的 token 应包含 role 信息', () => {
      const result = createTokens({ id: 'admin-id', role: 'admin' })
      const decoded = verifyToken(result.accessToken, 'access')
      expect(decoded.role).toBe('admin')
    })
  })

  describe('verifyToken()', () => {
    it('有效 token 应返回 payload', () => {
      const tokens = createTokens({ id: 'user-1', role: 'user' })
      const payload = verifyToken(tokens.accessToken, 'access')
      expect(payload).not.toBeNull()
      expect(payload.sub).toBe('user-1')
    })

    it('无效 token 应返回 null', () => {
      const payload = verifyToken('invalid-token-string', 'access')
      expect(payload).toBeNull()
    })

    it('access token 不能当 refresh token 用', () => {
      const tokens = createTokens({ id: 'user-2', role: 'user' })
      const payload = verifyToken(tokens.accessToken, 'refresh')
      expect(payload).toBeNull()
    })

    it('refresh token 不能当 access token 用', () => {
      const tokens = createTokens({ id: 'user-2', role: 'user' })
      const payload = verifyToken(tokens.refreshToken, 'access')
      expect(payload).toBeNull()
    })
  })
})
