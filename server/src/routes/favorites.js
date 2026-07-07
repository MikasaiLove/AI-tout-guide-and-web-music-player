import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getPool } from '../models/database.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
router.use(requireAuth)

// GET /api/favorites — 我的收藏
router.get('/', async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT * FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    )
    res.json({ success: true, list: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// POST /api/favorites — 添加收藏
router.post('/', async (req, res) => {
  try {
    const { city, province } = req.body
    if (!city) return res.status(400).json({ success: false, message: '请提供城市名' })

    const id = uuidv4()
    await getPool().execute(
      'INSERT IGNORE INTO user_favorites (id, user_id, city, province) VALUES (?, ?, ?, ?)',
      [id, req.userId, city, province || '']
    )
    res.json({ success: true, id })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: '已收藏过该城市' })
    }
    res.status(500).json({ success: false, message: '收藏失败' })
  }
})

// DELETE /api/favorites/:id
router.delete('/:id', async (req, res) => {
  try {
    await getPool().execute(
      'DELETE FROM user_favorites WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    res.json({ success: true, message: '已取消收藏' })
  } catch (err) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

export default router
