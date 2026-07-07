import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  // 消息列表
  const messages = ref([])
  // 是否正在流式生成中
  const isStreaming = ref(false)
  // 当前流式内容
  const streamingContent = ref('')

  // 添加用户消息
  const addUserMessage = (content) => {
    messages.value.push({
      id: Date.now(),
      role: 'user',
      content,
      timestamp: Date.now()
    })
  }

  // 添加 AI 消息
  const addAIMessage = (content) => {
    messages.value.push({
      id: Date.now(),
      role: 'ai',
      content,
      timestamp: Date.now()
    })
  }

  // 开始流式响应
  const startStreaming = () => {
    isStreaming.value = true
    streamingContent.value = ''
  }

  // 追加流式内容
  const appendStreamContent = (content) => {
    streamingContent.value += content
  }

  // 结束流式响应
  const finishStreaming = () => {
    if (streamingContent.value) {
      addAIMessage(streamingContent.value)
    }
    isStreaming.value = false
    streamingContent.value = ''
  }

  // 清空聊天记录
  const clearMessages = () => {
    messages.value = []
    isStreaming.value = false
    streamingContent.value = ''
  }

  return {
    messages,
    isStreaming,
    streamingContent,
    addUserMessage,
    addAIMessage,
    startStreaming,
    appendStreamContent,
    finishStreaming,
    clearMessages
  }
})
