import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '../stores/chat.js'

describe('chatStore — 聊天状态管理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addUserMessage()', () => {
    it('应添加用户消息到列表', () => {
      const store = useChatStore()
      store.addUserMessage('你好')
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].role).toBe('user')
      expect(store.messages[0].content).toBe('你好')
    })

    it('每条消息应有有效 id', () => {
      const store = useChatStore()
      store.addUserMessage('第一条')
      store.addUserMessage('第二条')
      expect(store.messages[0].id).toBeTruthy()
      expect(store.messages[1].id).toBeTruthy()
    })

    it('消息应有时间戳', () => {
      const store = useChatStore()
      store.addUserMessage('test')
      expect(store.messages[0].timestamp).toBeTruthy()
    })
  })

  describe('addAIMessage()', () => {
    it('应添加 AI 消息到列表', () => {
      const store = useChatStore()
      store.addAIMessage('欢迎使用旅游助手')
      expect(store.messages[0].role).toBe('ai')
    })
  })

  describe('startStreaming / appendStreamContent / finishStreaming', () => {
    it('流式开始后 isStreaming 应为 true', () => {
      const store = useChatStore()
      store.startStreaming()
      expect(store.isStreaming).toBe(true)
    })

    it('应累积流式内容', () => {
      const store = useChatStore()
      store.startStreaming()
      store.appendStreamContent('你好')
      store.appendStreamContent('世界')
      expect(store.streamingContent).toBe('你好世界')
    })

    it('流式完成后应添加 AI 消息并清空缓冲', () => {
      const store = useChatStore()
      store.startStreaming()
      store.appendStreamContent('完整回复')
      store.finishStreaming()

      expect(store.isStreaming).toBe(false)
      expect(store.streamingContent).toBe('')
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].content).toBe('完整回复')
    })
  })

  describe('clearMessages()', () => {
    it('应清空所有消息', () => {
      const store = useChatStore()
      store.addUserMessage('test')
      store.addAIMessage('reply')
      store.clearMessages()
      expect(store.messages).toHaveLength(0)
    })
  })
})
