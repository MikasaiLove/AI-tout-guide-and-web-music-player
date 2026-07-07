import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { requireAdmin } from '../middleware/auth.js'
import {
  createDocument, updateDocStatus, getDocumentList,
  getDocumentById, deleteDocument, getKnowledgeStats
} from '../services/kbService.js'
import { processDocument } from '../services/documentProcessor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../data/uploads')

// Multer 配置
const ALLOWED_TYPES = ['pdf', 'docx', 'txt', 'md']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    cb(null, `${uuidv4()}_${file.originalname}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    if (ALLOWED_TYPES.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${ext}，支持: ${ALLOWED_TYPES.join(', ')}`))
    }
  }
})

const router = Router()

// 所有路由需要管理员权限
router.use(requireAdmin)

// GET /api/knowledge/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getKnowledgeStats()
    res.json({ success: true, stats })
  } catch (err) {
    console.error('获取统计失败:', err)
    res.status(500).json({ success: false, message: '获取统计失败' })
  }
})

// GET /api/knowledge/documents
router.get('/documents', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const size = parseInt(req.query.size) || 20
    const search = req.query.search || ''
    const result = await getDocumentList(page, size, search)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('获取文档列表失败:', err)
    res.status(500).json({ success: false, message: '获取文档列表失败' })
  }
})

// POST /api/knowledge/documents/upload
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择文件' })
    }

    const ext = path.extname(req.file.originalname).toLowerCase().slice(1)
    const docId = await createDocument(
      req.userId,
      req.file.originalname,
      req.file.filename,
      ext,
      req.file.size
    )

    // 异步处理文档
    res.json({ success: true, docId, message: '文档已上传，正在处理中...' })

    // 后台处理
    processDocument(
      path.join(UPLOAD_DIR, req.file.filename),
      ext,
      docId,
      req.file.originalname,
      async (progress) => {
        if (typeof progress === 'string' && !progress.startsWith('embedding')) {
          await updateDocStatus(docId, 'processing')
        }
      }
    ).then(async (result) => {
      await updateDocStatus(docId, 'done', result)
      console.log(`✅ 文档处理完成: ${req.file.originalname}, ${result.chunkCount} 片段`)
    }).catch(async (err) => {
      console.error(`❌ 文档处理失败: ${req.file.originalname}`, err)
      await updateDocStatus(docId, 'fail', { errorMessage: err.message })
    })
  } catch (err) {
    console.error('上传失败:', err)
    res.status(500).json({ success: false, message: err.message || '上传失败' })
  }
})

// DELETE /api/knowledge/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await getDocumentById(req.params.id)
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' })
    }
    await deleteDocument(req.params.id)

    // 删除磁盘文件
    const fs = await import('fs')
    const filePath = path.join(UPLOAD_DIR, doc.stored_name || doc.filename)
    fs.unlink(filePath, () => {})

    res.json({ success: true, message: '已删除' })
  } catch (err) {
    console.error('删除失败:', err)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

// GET /api/knowledge/documents/:id
router.get('/documents/:id', async (req, res) => {
  try {
    const doc = await getDocumentById(req.params.id)
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' })
    }
    res.json({ success: true, doc })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取文档失败' })
  }
})

export default router
