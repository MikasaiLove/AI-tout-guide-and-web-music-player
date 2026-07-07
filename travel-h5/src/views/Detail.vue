<template>
  <div class="detail-page">
    <div class="detail-header">
      <button class="back-btn" @click="router.push('/')">← 返回首页</button>
      <h2>{{ travelData?.city || '旅行规划' }} · {{ travelData?.days || '' }}天行程</h2>
      <span></span>
    </div>

    <div class="detail-body">
      <div v-if="loading" class="loading-box">
        <van-loading type="spinner" size="48" color="#fff" />
        <p>{{ loadingText }}</p>
      </div>

      <div v-else-if="error" class="error-box">
        <van-empty description="生成失败" />
        <button class="retry-btn" @click="fetchRecommendation">重新生成</button>
        <button class="back-btn" @click="router.push('/')" style="margin-left:8px">返回首页</button>
      </div>

      <template v-else-if="travelData">
        <div class="trip-summary">
          <span class="trip-city">{{ travelData.city }}</span>
          <span class="trip-days">{{ travelData.days }}天</span>
          <span class="trip-budget">预算 ¥{{ travelData.totalBudget }}</span>
        </div>
        <van-collapse v-model="activeDays" v-if="travelData.dailyItinerary?.length">
          <van-collapse-item v-for="day in travelData.dailyItinerary" :key="day.day" :title="day.date || '第'+day.day+'天'" :name="day.day">
            <div class="day-schedule">
              <div class="schedule-block" v-if="day.morning?.spot"><span class="tag morning">上午</span><SpotItem :data="day.morning" /></div>
              <div class="schedule-block" v-if="day.afternoon?.spot"><span class="tag afternoon">下午</span><SpotItem :data="day.afternoon" /></div>
              <div class="schedule-block" v-if="day.evening?.spot"><span class="tag evening">晚上</span><SpotItem :data="day.evening" /></div>
            </div>
          </van-collapse-item>
        </van-collapse>
        <div class="card" v-if="travelData.budgetBreakdown"><h3>预算明细</h3><BudgetTable :data="travelData.budgetBreakdown" :total="travelData.totalBudget" /></div>
        <div class="card" v-if="travelData.tips?.length"><h3>温馨提示</h3><ul><li v-for="(t,i) in travelData.tips" :key="i">{{ t }}</li></ul></div>
        <div class="card" v-if="travelData.warnings?.length"><h3>注意事项</h3><ul><li v-for="(w,i) in travelData.warnings" :key="i">{{ w }}</li></ul></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../utils/request.js'
import { getAccessToken } from '../utils/auth.js'
import SpotItem from '../components/SpotItem.vue'
import BudgetTable from '../components/BudgetTable.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const loadingText = ref('正在生成旅行规划...')
const error = ref(false)
const travelData = ref(null)
const activeDays = ref([1])

const city = route.query.city || '北京'
const budget = route.query.budget || 3000
const days = route.query.days || 3
const provider = route.query.provider || undefined
const model = route.query.model || undefined

let timers = []

const fetchRecommendation = async () => {
  loading.value = true; error.value = false
  loadingText.value = `正在为您规划${city}${days}天行程...`
  timers.forEach(clearTimeout); timers = []
  timers.push(setTimeout(() => { loadingText.value = 'AI 深度思考中，请耐心等待...' }, 15000))
  timers.push(setTimeout(() => { loadingText.value = '内容较多，仍在生成中...' }, 60000))
  timers.push(setTimeout(() => { if (loading.value) { loading.value = false; error.value = true; showToast('生成超时，请稍后重试') } }, 300000))

  const controller = new AbortController()

  try {
    const response = await fetch('/api/travel/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAccessToken() },
      body: JSON.stringify({ city, budget: Number(budget), days: Number(days), provider, model }),
      signal: controller.signal
    })
    if (!response.ok) throw new Error('请求失败')

    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) { if (loading.value) { loading.value = false; error.value = true; showToast('AI 响应中断，请重试') } break }
      buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'chunk') { loadingText.value = parsed.content.slice(0, 100) }
          else if (parsed.type === 'complete') {
            if (parsed.data && (parsed.data.city || parsed.data.dailyItinerary)) {
              travelData.value = parsed.data; loading.value = false
              request.post('/history/plans', { city, budget: Number(budget), days: Number(days), planData: parsed.data, provider }).catch(() => {})
            } else if (parsed.data && !parsed.data.success) { loading.value = false; error.value = true; showToast('AI 未能生成有效行程') }
            else { travelData.value = parsed.data || {}; loading.value = false }
          }
          else if (parsed.type === 'error') { loading.value = false; error.value = true; showToast(parsed.message || '生成失败') }
        } catch {}
      }
    }
  } catch (e) { if (e.name !== 'AbortError') { loading.value = false; error.value = true; showToast('网络错误，请重试') } }
  finally { timers.forEach(clearTimeout) }
}

onMounted(() => fetchRecommendation())
onUnmounted(() => timers.forEach(clearTimeout))
</script>

<style scoped>
.detail-page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.detail-header h2 { font-size: 22px; color: #fff; margin: 0; }

.back-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; transition: all 0.3s; }
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.retry-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: #fff; cursor: pointer; font-size: 14px; transition: all 0.3s; }
.retry-btn:hover { background: rgba(255,255,255,0.15); }

.detail-body { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 24px; }

.loading-box { text-align: center; padding: 60px 0; }
.loading-box p { color: rgba(255,255,255,0.5); margin-top: 16px; }
.error-box { text-align: center; padding: 60px 0; }

.trip-summary { display: flex; gap: 16px; align-items: baseline; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 20px; }
.trip-city { font-size: 28px; font-weight: 700; color: #fff; }
.trip-days { font-size: 18px; color: rgba(255,255,255,0.5); }
.trip-budget { font-size: 20px; color: rgba(255,255,255,0.8); font-weight: 600; margin-left: auto; }

.day-schedule { padding: 8px 0; }
.schedule-block { margin-bottom: 16px; }
.schedule-block:last-child { margin-bottom: 0; }
.tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.tag.morning { background: rgba(255,152,22,0.2); color: #fa8c16; }
.tag.afternoon { background: rgba(24,144,255,0.2); color: #1890ff; }
.tag.evening { background: rgba(82,196,26,0.2); color: #52c41a; }

.card { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
.card h3 { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.7); margin: 0 0 12px; }
.card ul { list-style: none; padding: 0; margin: 0; }
.card li { padding: 6px 0; color: rgba(255,255,255,0.55); font-size: 14px; }

/* Vant Collapse 暗色覆盖 */
.detail-body :deep(.van-collapse) { background: transparent !important; }
.detail-body :deep(.van-collapse-item) { background: transparent !important; border: none !important; margin-bottom: 4px; }
.detail-body :deep(.van-collapse-item__header) { background: rgba(255,255,255,0.04) !important; border-radius: 12px; color: #fff !important; font-weight: 600; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 2px; }
.detail-body :deep(.van-collapse-item__content) { background: rgba(255,255,255,0.02) !important; color: rgba(255,255,255,0.6) !important; padding: 12px 16px; border-radius: 0 0 12px 12px; }
.detail-body :deep(.van-cell) { background: transparent !important; color: rgba(255,255,255,0.7) !important; }
.detail-body :deep(.van-cell::after) { border-color: rgba(255,255,255,0.04) !important; }
</style>
