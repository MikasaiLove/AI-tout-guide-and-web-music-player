import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  generateTravelRecommendation,
  parseRecommendationResponse,
  chatWithAI,
  getAvailableProviders
} from '../services/travelService.js'
import {
  setSSEHeaders,
  sendStreamChunk,
  sendStreamComplete,
  sendStreamError
} from '../utils/streamUtils.js'

const router = Router()

// ===== 需要登录认证 =====
router.use(requireAuth)

/**
 * GET /api/travel/providers
 * 获取所有已配置的 LLM 提供商列表
 */
router.get('/providers', (req, res) => {
  const providers = getAvailableProviders()
  res.json({
    success: true,
    providers,
    defaultProvider: process.env.DEFAULT_PROVIDER || providers[0]?.key || null
  })
})

/**
 * POST /api/travel/recommend
 * 智能旅游规划推荐（流式响应）
 * body: { city, budget, days, provider? }
 */
router.post('/recommend', async (req, res) => {
  const { city, budget, days, provider, model } = req.body

  if (!city) {
    return res.status(400).json({ success: false, message: '请提供目的地城市' })
  }
  if (!budget || budget <= 0) {
    return res.status(400).json({ success: false, message: '请提供有效的预算' })
  }
  if (!days || days <= 0) {
    return res.status(400).json({ success: false, message: '请提供有效的旅行天数' })
  }

  setSSEHeaders(res)

  try {
    const fullResponse = await generateTravelRecommendation(
      city, budget, days,
      (chunk) => {
        sendStreamChunk(res, chunk)
      },
      provider,
      model
    )

    const travelData = parseRecommendationResponse(fullResponse)

    if (!travelData) {
      sendStreamError(res, 'AI 返回数据解析失败，请重试')
      return
    }

    sendStreamComplete(res, travelData)
    res.end()
  } catch (err) {
    console.error('旅游推荐失败:', err)
    if (err.message.includes('API Key')) {
      sendStreamError(res, err.message)
    } else {
      sendStreamError(res, '生成旅游规划时出错，请稍后重试')
    }
  }
})

/**
 * POST /api/travel/chat
 * AI 旅游咨询对话（流式响应）
 * body: { message, provider? }
 */
router.post('/chat', async (req, res) => {
  const { message, provider, model } = req.body

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: '请输入您的问题' })
  }

  setSSEHeaders(res)

  try {
    const fullReply = await chatWithAI(
      message,
      (chunk) => {
        sendStreamChunk(res, chunk)
      },
      provider,
      model
    )

    sendStreamComplete(res, { success: true, reply: fullReply })
    res.end()
  } catch (err) {
    console.error('AI 对话失败:', err)
    if (err.message.includes('API Key')) {
      sendStreamError(res, err.message)
    } else {
      sendStreamError(res, 'AI 对话出错，请稍后重试')
    }
  }
})

export default router
