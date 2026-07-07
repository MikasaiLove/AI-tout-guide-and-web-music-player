<template>
  <div class="chat-page">
    <div class="chat-header">
      <h2>AI 旅游顾问</h2>
      <div class="header-options">
        <select v-model="selectedProvider" class="glass-sel">
          <option v-for="p in providers" :key="p.key" :value="p.key">{{ p.name }}</option>
        </select>
        <select v-model="selectedModel" class="glass-sel">
          <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </div>

    <div class="chat-body">
      <div class="chat-messages" ref="chatContainerRef">
        <div v-if="chatStore.messages.length === 0 && !chatStore.isStreaming" class="chat-empty">
          <p class="empty-icon">🤖</p>
          <p class="empty-text">有什么旅游问题尽管问我~</p>
          <div class="quick-row">
            <span v-for="(q, i) in quickQuestions" :key="i" class="quick-chip" @click="sendMessage(q)">{{ q }}</span>
          </div>
        </div>

        <div class="message-list" v-else>
          <div v-for="msg in chatStore.messages" :key="msg.id" class="msg-wrap" :class="msg.role === 'user' ? 'user' : 'ai'">
            <div class="msg-bubble" :class="msg.role === 'user' ? 'b-user' : 'b-ai'">
              <div class="msg-text" v-html="msg.role === 'ai' ? formatContent(msg.content) : msg.content"></div>
            </div>
          </div>
          <div v-if="chatStore.isStreaming" class="msg-wrap ai">
            <div class="msg-bubble b-ai">
              <div class="msg-text" v-html="formatContent(chatStore.streamingContent)"></div><span class="cursor">|</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-bar">
        <van-field v-model="inputMessage" placeholder="输入你的问题..." :disabled="chatStore.isStreaming" @keypress.enter="sendMessage(inputMessage)">
          <template #button>
            <van-button type="primary" size="small" round :disabled="!inputMessage.trim() || chatStore.isStreaming" @click="sendMessage(inputMessage)">发送</van-button>
          </template>
        </van-field>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { showToast } from 'vant'
import { useChatStore } from '../stores/chat.js'
import request from '../utils/request.js'
import { getAccessToken } from '../utils/auth.js'

const chatStore = useChatStore()
const inputMessage = ref('')
const chatContainerRef = ref(null)
const selectedProvider = ref('bailian')
const selectedModel = ref('qwen-plus')
const providers = ref([])
const sessionId = ref(null)

const modelMap = { bailian: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen2.5-72b-instruct'], deepseek: ['deepseek-chat', 'deepseek-reasoner'] }
const currentModels = computed(() => modelMap[selectedProvider.value] || [])

const quickQuestions = ['北京有哪些必去的景点？', '上海美食推荐', '成都三日游攻略', '如何选择旅行保险？']

const formatContent = (text) => {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^- (.+)$/gm, '• $1')
}

const scrollToBottom = () => { nextTick(() => { if (chatContainerRef.value) chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight }) }
const ensureSession = async () => { if (sessionId.value) return; try { const res = await request.post('/history/sessions', { title: '新对话', provider: selectedProvider.value }); sessionId.value = res.data.sessionId } catch {} }

const sendMessage = async (msg) => {
  const message = msg || inputMessage.value.trim()
  if (!message || chatStore.isStreaming) return
  await ensureSession()
  chatStore.addUserMessage(message)
  if (sessionId.value) request.post(`/history/sessions/${sessionId.value}/messages`, { role: 'user', content: message }).catch(() => {})
  inputMessage.value = ''; scrollToBottom(); chatStore.startStreaming(); scrollToBottom()
  let aiContent = ''
  try {
    const response = await fetch('/api/travel/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAccessToken() }, body: JSON.stringify({ message, provider: selectedProvider.value, model: selectedModel.value }) })
    if (!response.ok) throw new Error('请求失败')
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'chunk') { chatStore.appendStreamContent(parsed.content); aiContent += parsed.content; scrollToBottom() }
            else if (parsed.type === 'complete') { chatStore.finishStreaming(); if (sessionId.value && aiContent) request.post(`/history/sessions/${sessionId.value}/messages`, { role: 'ai', content: aiContent }).catch(() => {}); scrollToBottom() }
          } catch {}
        }
      }
    }
  } catch { chatStore.finishStreaming(); showToast('发送失败') }
}

const loadProviders = async () => {
  try { const res = await request.get('/travel/providers'); if (res.data?.providers?.length > 0) { providers.value = res.data.providers; selectedProvider.value = res.data.defaultProvider || res.data.providers[0].key; selectedModel.value = currentModels.value[0] || '' } } catch {}
}
onMounted(() => { loadProviders(); scrollToBottom(); chatStore.clearMessages() })
</script>

<style scoped>
.chat-page { display: flex; flex-direction: column; height: calc(100vh - 1px); }

.chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: rgba(14,19,28,0.5); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.06); }
.chat-header h2 { font-size: 18px; margin: 0; color: #fff; }
.header-options { display: flex; gap: 8px; }
.glass-sel { padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #fff; font-size: 12px; outline: none; cursor: pointer; }
.glass-sel option { background: #1a1f2e; color: #fff; }

.chat-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.chat-messages { flex: 1; overflow-y: auto; padding: 20px 24px 40px; }
.chat-empty { text-align: center; padding-top: 80px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { color: rgba(255,255,255,0.4); font-size: 15px; }

.quick-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
.quick-chip { padding: 6px 16px; border-radius: 16px; font-size: 13px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s; }
.quick-chip:hover { background: #fff; color: #000; }

.message-list { max-width: 860px; margin: 0 auto; }
.msg-wrap { display: flex; margin-bottom: 14px; }
.msg-wrap.user { justify-content: flex-end; }
.msg-wrap.ai { justify-content: flex-start; }
.msg-bubble { max-width: 75%; padding: 12px 18px; border-radius: 16px; line-height: 1.6; }
.b-user { background: #fff; color: #000; border-bottom-right-radius: 4px; font-weight: 500; }
.b-ai { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); border-bottom-left-radius: 4px; border: 1px solid rgba(255,255,255,0.06); }
.msg-text { font-size: 15px; word-break: break-word; }
.msg-text :deep(p) { margin: 0 0 8px; }
.msg-text :deep(p:last-child) { margin-bottom: 0; }
.cursor { animation: blink 1s infinite; color: rgba(255,255,255,0.5); }
@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

.chat-bar { padding: 12px 24px; background: rgba(14,19,28,0.5); backdrop-filter: blur(16px); border-top: 1px solid rgba(255,255,255,0.06); }
.chat-bar :deep(.van-field) { background: rgba(255,255,255,0.06) !important; border-radius: 20px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.08); }
.chat-bar :deep(.van-field input) { color: #fff !important; }
.chat-bar :deep(.van-field input::placeholder) { color: rgba(255,255,255,0.35) !important; }
</style>
