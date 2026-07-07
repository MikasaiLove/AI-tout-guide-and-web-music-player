/**
 * SSE (Server-Sent Events) 流式响应工具
 */

/**
 * 设置 SSE 响应头
 * @param {import('express').Response} res - Express 响应对象
 */
export function setSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲
  res.flushHeaders()
}

/**
 * 发送 SSE 数据块
 * @param {import('express').Response} res - Express 响应对象
 * @param {object} data - 要发送的数据
 */
export function sendSSEChunk(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * 发送流式 chunk（AI 生成内容片段）
 * @param {import('express').Response} res
 * @param {string} content - 文本内容
 */
export function sendStreamChunk(res, content) {
  sendSSEChunk(res, { type: 'chunk', content })
}

/**
 * 发送完成信号
 * @param {import('express').Response} res
 * @param {object} data - 完整的响应数据
 */
export function sendStreamComplete(res, data) {
  sendSSEChunk(res, { type: 'complete', data })
}

/**
 * 发送错误信号
 * @param {import('express').Response} res
 * @param {string} message - 错误信息
 */
export function sendStreamError(res, message) {
  sendSSEChunk(res, { type: 'error', message })
  res.end()
}
