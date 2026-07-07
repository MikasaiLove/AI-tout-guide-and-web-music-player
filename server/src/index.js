import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import travelRouter from './routes/travel.js'
import authRouter from './routes/auth.js'
import knowledgeRouter from './routes/knowledge.js'
import historyRouter from './routes/history.js'
import favoritesRouter from './routes/favorites.js'
import musicRouter from './routes/music.js'
import { getAvailableProviders } from './services/travelService.js'
import { initDatabase } from './models/database.js'
import { seedDefaultKnowledge } from './services/kbService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// 全局限流 — 每个 IP 每分钟最多 200 次请求
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' }
}))

// 认证路由限流 — 每个 IP 每 15 分钟最多 20 次（防暴力破解）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '登录尝试过于频繁，请 15 分钟后再试' }
})

// 静态文件 — 头像
app.use('/avatars', express.static(path.resolve(__dirname, '../public/avatars')))

// 健康检查
app.get('/api/health', (req, res) => {
  const providers = getAvailableProviders()
  res.json({
    success: true,
    message: providers.length > 0
      ? `服务运行正常，已配置 ${providers.length} 个模型`
      : '服务运行正常，但尚未配置任何模型',
    timestamp: new Date().toISOString(),
    providers,
    defaultProvider: process.env.DEFAULT_PROVIDER || providers[0]?.key || null
  })
})

// 认证路由（带限流）
app.use('/api/auth', authLimiter, authRouter)

// 旅游推荐路由
app.use('/api/travel', travelRouter)

// 知识库路由（管理员）
app.use('/api/knowledge', knowledgeRouter)

// 历史记录路由（需登录）
app.use('/api/history', historyRouter)

// 收藏路由（需登录）
app.use('/api/favorites', favoritesRouter)

// 音乐路由（歌词查询）
app.use('/api/music', musicRouter)

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)

  // Multer 文件过滤错误
  if (err.message?.includes('不支持的文件类型')) {
    return res.status(400).json({ success: false, message: err.message })
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '文件大小超过限制（50MB）' })
  }

  // 生产环境不暴露 err.message，避免泄露内部信息
  const errMsg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : `服务器内部错误: ${err.message}`
  res.status(500).json({ success: false, message: errMsg })
})

// 初始化数据库后启动服务
initDatabase().then(() => {
  // 预置旅游知识（使用管理员账户）
  import('./models/database.js').then(async () => {
    const { getPool } = await import('./models/database.js')
    const pool = getPool()
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    if (admins.length > 0) {
      await seedDefaultKnowledge(admins[0].id)
    }
  }).catch(() => {})

  app.listen(PORT, () => {
    const providers = getAvailableProviders()
    console.log(`🚀 旅游推荐服务已启动: http://localhost:${PORT}`)
    console.log(`📋 健康检查: http://localhost:${PORT}/api/health`)
    if (providers.length === 0) {
      console.warn('⚠️  尚未配置任何模型，请编辑 server/.env 填入 API Key')
    } else {
      console.log(`🤖 已配置模型: ${providers.map(p => p.name).join(', ')}`)
    }
  })
}).catch(err => {
  console.error('数据库初始化失败:', err)
  process.exit(1)
})
