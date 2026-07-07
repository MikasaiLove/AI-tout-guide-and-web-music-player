import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getPool } from '../models/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
router.use(requireAuth)

// ========== 聊天会话 ==========

// GET /api/history/chats — 我的聊天会话列表
router.get('/chats', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.execute(
      `SELECT cs.id, cs.title, cs.provider, cs.created_at, cs.updated_at,
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) AS msg_count
       FROM chat_sessions cs
       WHERE cs.user_id = ?
       ORDER BY cs.updated_at DESC`,
      [req.userId]
    )
    res.json({ success: true, list: rows })
  } catch (err) {
    console.error('获取会话列表失败:', err)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// GET /api/history/chats/:id — 获取会话消息
router.get('/chats/:id', async (req, res) => {
  try {
    const pool = getPool()
    // 验证所有权
    const [sessions] = await pool.execute(
      'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: '会话不存在' })
    }

    const [messages] = await pool.execute(
      'SELECT id, role, content, tokens, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [req.params.id]
    )
    res.json({ success: true, session: sessions[0], messages })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// DELETE /api/history/chats/:id
router.delete('/chats/:id', async (req, res) => {
  try {
    const pool = getPool()
    await pool.execute(
      'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    res.json({ success: true, message: '已删除' })
  } catch (err) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// ========== 旅行行程 ==========

// GET /api/history/plans — 我的行程列表
router.get('/plans', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.execute(
      `SELECT id, city, budget, days, provider, created_at
       FROM travel_plans WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.userId]
    )
    res.json({ success: true, list: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// GET /api/history/plans/:id — 获取行程详情
router.get('/plans/:id', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.execute(
      'SELECT * FROM travel_plans WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '行程不存在' })
    }
    res.json({ success: true, plan: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// DELETE /api/history/plans/:id
router.delete('/plans/:id', async (req, res) => {
  try {
    const pool = getPool()
    await pool.execute(
      'DELETE FROM travel_plans WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    res.json({ success: true, message: '已删除' })
  } catch (err) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// ========== 辅助：保存会话 & 消息（供 Chat 调用） ==========

// POST /api/history/sessions — 创建新会话
router.post('/sessions', async (req, res) => {
  try {
    const pool = getPool()
    const id = uuidv4()
    const title = req.body.title || '新对话'
    const provider = req.body.provider || ''
    await pool.execute(
      'INSERT INTO chat_sessions (id, user_id, title, provider) VALUES (?, ?, ?, ?)',
      [id, req.userId, title, provider]
    )
    res.json({ success: true, sessionId: id })
  } catch (err) {
    res.status(500).json({ success: false, message: '创建会话失败' })
  }
})

// POST /api/history/sessions/:id/messages — 追加消息
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const pool = getPool()
    // 验证会话所有权
    const [sessions] = await pool.execute(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: '会话不存在' })
    }
    const msgId = uuidv4()
    await pool.execute(
      'INSERT INTO chat_messages (id, session_id, role, content, tokens) VALUES (?, ?, ?, ?, ?)',
      [msgId, req.params.id, req.body.role, req.body.content, req.body.tokens ? JSON.stringify(req.body.tokens) : null]
    )
    // 更新会话时间
    await pool.execute('UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?', [req.params.id])
    res.json({ success: true, messageId: msgId })
  } catch (err) {
    res.status(500).json({ success: false, message: '保存消息失败' })
  }
})

// POST /api/history/plans — 保存行程
router.post('/plans', async (req, res) => {
  try {
    const pool = getPool()
    const id = uuidv4()
    await pool.execute(
      'INSERT INTO travel_plans (id, user_id, city, budget, days, plan_data, provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.userId, req.body.city, req.body.budget, req.body.days, JSON.stringify(req.body.planData), req.body.provider || '']
    )
    res.json({ success: true, planId: id })
  } catch (err) {
    res.status(500).json({ success: false, message: '保存行程失败' })
  }
})

export default router
