<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <h2>对话详情</h2>
    </div>
    <div class="msg-list" v-if="messages.length > 0">
      <div v-for="msg in messages" :key="msg.id" class="msg-wrap" :class="msg.role === 'user' ? 'user' : 'ai'">
        <div class="msg-bubble" :class="msg.role === 'user' ? 'b-user' : 'b-ai'">{{ msg.content }}</div>
        <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
      </div>
    </div>
    <div class="glass-card empty" v-else>加载中...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../utils/request.js'
const route = useRoute(); const router = useRouter(); const messages = ref([])
const formatTime = (d) => d ? new Date(d).toLocaleString('zh-CN') : ''
onMounted(async () => { try { const res = await request.get(`/history/chats/${route.params.id}`); messages.value = res.data.messages } catch {} })
</script>

<style scoped>
.page { max-width: 700px; margin: 0 auto; padding: 32px 24px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.page-header h2 { font-size: 22px; color: #fff; margin: 0; }
.back-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; transition: all 0.3s; }
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.msg-wrap { margin-bottom: 14px; }
.msg-wrap.user { text-align: right; }
.msg-wrap.ai { text-align: left; }
.msg-bubble { display: inline-block; max-width: 80%; padding: 10px 16px; border-radius: 14px; font-size: 15px; line-height: 1.5; }
.b-user { background: rgba(255,255,255,0.85); color: #000; }
.b-ai { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.06); }
.msg-time { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 4px; }
.glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 20px; }
.empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.35); }
</style>
