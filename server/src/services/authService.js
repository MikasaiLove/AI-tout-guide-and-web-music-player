import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getPool } from '../models/database.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'travel-ai-jwt-secret-key-change-in-production') {
  console.error('❌ 安全错误: 请修改 .env 中的 JWT_SECRET，不要使用默认值！')
  console.error('   运行: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))" 生成随机密钥')
  process.exit(1)
}

export async function registerUser(username, password, nickname) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    const [existing] = await conn.execute('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0) {
      throw new Error('用户名已存在')
    }

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)
    const displayName = nickname || username

    await conn.execute(
      'INSERT INTO users (id, username, nickname, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, username, displayName, passwordHash, 'user']
    )

    const user = { id, username, nickname: displayName, role: 'user' }
    const tokens = createTokens(user)

    return { user, tokens }
  } finally {
    conn.release()
  }
}

export async function loginUser(username, password) {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    const [rows] = await conn.execute(
      'SELECT id, username, nickname, password_hash, role FROM users WHERE username = ?',
      [username]
    )
    if (rows.length === 0) {
      throw new Error('用户名或密码错误')
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      throw new Error('用户名或密码错误')
    }

    const userData = { id: user.id, username: user.username, nickname: user.nickname, role: user.role }
    const tokens = createTokens(userData)

    return { user: userData, tokens }
  } finally {
    conn.release()
  }
}

export function createTokens(user) {
  const accessJti = uuidv4()
  const refreshJti = uuidv4()

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, type: 'access', jti: accessJti },
    JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '30m' }
  )

  const refreshToken = jwt.sign(
    { sub: user.id, role: user.role, type: 'refresh', jti: refreshJti },
    JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
  )

  return { accessToken, refreshToken, expiresIn: 1800 }
}

export function verifyToken(token, type = 'access') {
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.type !== type) return null
    return payload
  } catch {
    return null
  }
}

export async function revokeToken(jti) {
  const pool = getPool()
  await pool.execute(
    'INSERT INTO revoked_tokens (id, jti, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
    [uuidv4(), jti]
  )
}

export async function isTokenRevoked(jti) {
  const pool = getPool()
  const [rows] = await pool.execute('SELECT id FROM revoked_tokens WHERE jti = ?', [jti])
  return rows.length > 0
}

export async function refreshTokens(oldRefreshToken) {
  const payload = verifyToken(oldRefreshToken, 'refresh')
  if (!payload) throw new Error('无效的 Refresh Token')

  if (await isTokenRevoked(payload.jti)) throw new Error('Token 已被撤销')

  // 撤销旧的 refresh token
  await revokeToken(payload.jti)

  const userData = { id: payload.sub, role: payload.role }
  return createTokens(userData)
}

export async function getUserById(userId) {
  const pool = getPool()
  const [rows] = await pool.execute(
    'SELECT id, username, nickname, role, avatar, created_at FROM users WHERE id = ?',
    [userId]
  )
  return rows.length > 0 ? rows[0] : null
}
