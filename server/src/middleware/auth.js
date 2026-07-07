import { verifyToken, isTokenRevoked, getUserById } from '../services/authService.js'

// 必须登录
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '请先登录' })
    }

    const token = header.slice(7)
    const payload = verifyToken(token, 'access')
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Token 无效或已过期' })
    }

    if (await isTokenRevoked(payload.jti)) {
      return res.status(401).json({ success: false, message: 'Token 已被撤销' })
    }

    req.userId = payload.sub
    req.userRole = payload.role
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: '认证失败' })
  }
}

// 可选登录（不强制）
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      req.userId = null
      req.userRole = null
      return next()
    }
    const token = header.slice(7)
    const payload = verifyToken(token, 'access')
    if (payload && !(await isTokenRevoked(payload.jti))) {
      req.userId = payload.sub
      req.userRole = payload.role
    }
  } catch { /* ignore */ }
  next()
}

// 必须管理员
export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' })
    }
    next()
  })
}
