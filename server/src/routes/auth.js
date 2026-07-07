import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { registerUser, loginUser, refreshTokens, revokeToken, verifyToken, isTokenRevoked, getUserById } from '../services/authService.js'
import { requireAuth } from '../middleware/auth.js'
import { getPool } from '../models/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AVATAR_DIR = path.resolve(__dirname, '../../public/avatars')

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${uuidv4()}${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持 JPG / PNG / GIF / WebP 格式'))
  }
})

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body

    if (!username || username.length < 2 || username.length > 50) {
      return res.status(400).json({ success: false, message: '用户名长度 2-50 个字符' })
    }
    if (!password || password.length < 6 || password.length > 100) {
      return res.status(400).json({ success: false, message: '密码长度 6-100 个字符' })
    }

    const result = await registerUser(username, password, nickname)
    res.json({ success: true, ...result })
  } catch (err) {
    if (err.message === '用户名已存在') {
      return res.status(409).json({ success: false, message: err.message })
    }
    console.error('注册失败:', err)
    res.status(500).json({ success: false, message: '注册失败' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' })
    }

    const result = await loginUser(username, password)
    res.json({ success: true, ...result })
  } catch (err) {
    if (err.message === '用户名或密码错误') {
      return res.status(401).json({ success: false, message: err.message })
    }
    console.error('登录失败:', err)
    res.status(500).json({ success: false, message: '登录失败' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: '请提供 Refresh Token' })
    }

    const tokens = await refreshTokens(refreshToken)
    res.json({ success: true, ...tokens })
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token 无效或已过期' })
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const header = req.headers.authorization
    const token = header.slice(7)
    const payload = verifyToken(token, 'access')
    if (payload) await revokeToken(payload.jti)

    res.json({ success: true, message: '已退出登录' })
  } catch (err) {
    res.status(500).json({ success: false, message: '退出失败' })
  }
})

// GET /api/auth/me — 获取当前用户信息
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.userId)
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取用户信息失败' })
  }
})

// PUT /api/auth/profile — 更新个人信息（昵称 + 头像）
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const pool = getPool()
    const { nickname, avatar } = req.body

    if (nickname !== undefined) {
      if (!nickname || nickname.length < 1 || nickname.length > 50) {
        return res.status(400).json({ success: false, message: '昵称长度 1-50 字符' })
      }
      // 兼容旧表无 nickname 列
      try { await pool.execute('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.userId]) }
      catch { await pool.execute('ALTER TABLE users ADD COLUMN nickname VARCHAR(50) DEFAULT NULL AFTER username'); await pool.execute('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.userId]) }
    }

    if (avatar !== undefined) {
      await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId])
    }

    res.json({ success: true, message: '更新成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

// PUT /api/auth/password — 修改密码
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请提供旧密码和新密码' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码至少6个字符' })
    }

    const pool = getPool()
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.userId])
    if (rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' })

    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash)
    if (!valid) return res.status(401).json({ success: false, message: '旧密码错误' })

    const hash = await bcrypt.hash(newPassword, 12)
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId])

    res.json({ success: true, message: '密码修改成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: '修改失败' })
  }
})

// POST /api/auth/avatar — 上传头像（文件 → 磁盘路径 → 数据库）
router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请选择图片文件' })

    const avatarPath = `/avatars/${req.file.filename}`
    const pool = getPool()
    await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.userId])

    res.json({ success: true, avatar: avatarPath, message: '头像已更新' })
  } catch (err) {
    res.status(500).json({ success: false, message: '上传失败' })
  }
})

export default router
