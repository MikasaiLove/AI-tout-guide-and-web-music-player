import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setSSEHeaders,
  sendSSEChunk,
  sendStreamChunk,
  sendStreamComplete,
  sendStreamError
} from '../src/utils/streamUtils.js'

// 创建 mock Express response 对象
function createMockRes() {
  const headers = {}
  const writes = []
  return {
    headers,
    writes,
    setHeader(name, value) {
      headers[name] = value
    },
    flushHeaders: vi.fn(),
    write(chunk) {
      writes.push(chunk)
    },
    end: vi.fn()
  }
}

describe('streamUtils — SSE 流式工具', () => {
  let res

  beforeEach(() => {
    res = createMockRes()
  })

  describe('setSSEHeaders()', () => {
    it('应设置 Content-Type 为 text/event-stream', () => {
      setSSEHeaders(res)
      expect(res.headers['Content-Type']).toBe('text/event-stream')
    })

    it('应禁用缓存', () => {
      setSSEHeaders(res)
      expect(res.headers['Cache-Control']).toBe('no-cache')
    })

    it('应设置 Connection 为 keep-alive', () => {
      setSSEHeaders(res)
      expect(res.headers['Connection']).toBe('keep-alive')
    })

    it('应禁用 Nginx 缓冲', () => {
      setSSEHeaders(res)
      expect(res.headers['X-Accel-Buffering']).toBe('no')
    })

    it('应调用 flushHeaders', () => {
      setSSEHeaders(res)
      expect(res.flushHeaders).toHaveBeenCalledOnce()
    })
  })

  describe('sendSSEChunk()', () => {
    it('应写入 SSE 格式数据', () => {
      sendSSEChunk(res, { type: 'test', value: 42 })
      expect(res.writes.length).toBe(1)
      expect(res.writes[0]).toBe('data: {"type":"test","value":42}\n\n')
    })

    it('应正确序列化中文', () => {
      sendSSEChunk(res, { type: 'chunk', content: '你好世界' })
      expect(res.writes[0]).toContain('你好世界')
    })
  })

  describe('sendStreamChunk()', () => {
    it('应发送 type=chunk 的数据', () => {
      sendStreamChunk(res, 'Hello')
      expect(res.writes[0]).toContain('"type":"chunk"')
      expect(res.writes[0]).toContain('"content":"Hello"')
    })
  })

  describe('sendStreamComplete()', () => {
    it('应发送 type=complete 的数据', () => {
      sendStreamComplete(res, { id: 1, result: 'ok' })
      expect(res.writes[0]).toContain('"type":"complete"')
      expect(res.writes[0]).toContain('"id":1')
    })
  })

  describe('sendStreamError()', () => {
    it('应发送 type=error 并调用 res.end()', () => {
      sendStreamError(res, '出错了')
      expect(res.writes[0]).toContain('"type":"error"')
      expect(res.writes[0]).toContain('"message":"出错了"')
      expect(res.end).toHaveBeenCalledOnce()
    })
  })
})
