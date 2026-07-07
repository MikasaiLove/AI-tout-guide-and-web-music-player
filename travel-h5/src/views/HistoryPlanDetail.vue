<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <h2>{{ planData.city || '旅行规划' }} · {{ planData.days || '' }}天行程</h2>
      <span class="budget" v-if="planData.totalBudget">¥{{ planData.totalBudget }}</span>
    </div>

    <div class="glass-card" v-if="plan">
      <div class="trip-summary">
        <span class="trip-city">{{ planData.city }}</span>
        <span class="trip-days">{{ planData.days }}天</span>
        <span class="trip-budget">预算 ¥{{ planData.totalBudget }}</span>
      </div>

      <van-collapse v-model="activeDays" v-if="planData.dailyItinerary?.length">
        <van-collapse-item v-for="day in planData.dailyItinerary" :key="day.day" :title="day.date || '第'+day.day+'天'" :name="day.day">
          <div class="day-schedule">
            <div class="schedule-block" v-if="day.morning?.spot"><span class="tag morning">上午</span><SpotItem :data="day.morning" /></div>
            <div class="schedule-block" v-if="day.afternoon?.spot"><span class="tag afternoon">下午</span><SpotItem :data="day.afternoon" /></div>
            <div class="schedule-block" v-if="day.evening?.spot"><span class="tag evening">晚上</span><SpotItem :data="day.evening" /></div>
          </div>
        </van-collapse-item>
      </van-collapse>

      <div class="card" v-if="planData.budgetBreakdown"><h3>预算明细</h3><BudgetTable :data="planData.budgetBreakdown" :total="planData.totalBudget" /></div>
      <div class="card" v-if="planData.tips?.length"><h3>温馨提示</h3><ul><li v-for="(t,i) in planData.tips" :key="i">{{ t }}</li></ul></div>
      <div class="card" v-if="planData.warnings?.length"><h3>注意事项</h3><ul><li v-for="(w,i) in planData.warnings" :key="i">{{ w }}</li></ul></div>
    </div>

    <div class="glass-card empty" v-else>加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../utils/request.js'
import SpotItem from '../components/SpotItem.vue'
import BudgetTable from '../components/BudgetTable.vue'

const route = useRoute(); const router = useRouter()
const plan = ref(null)
const activeDays = ref([1])

const planData = computed(() => {
  if (!plan.value) return {}
  const raw = plan.value.plan_data
  return typeof raw === 'string' ? JSON.parse(raw) : raw
})

onMounted(async () => {
  try {
    const res = await request.get(`/history/plans/${route.params.id}`)
    plan.value = res.data.plan
  } catch {}
})
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.page-header h2 { font-size: 22px; color: #fff; margin: 0; }
.budget { font-size: 20px; color: rgba(255,255,255,0.7); font-weight: 600; }
.back-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; transition: all 0.3s; }
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 24px; margin-bottom: 12px; }
.empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.35); }

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

.glass-card :deep(.van-collapse) { background: transparent !important; }
.glass-card :deep(.van-collapse-item) { background: transparent !important; border: none !important; margin-bottom: 4px; }
.glass-card :deep(.van-collapse-item__header) { background: rgba(255,255,255,0.04) !important; border-radius: 12px; color: #fff !important; font-weight: 600; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.05); }
.glass-card :deep(.van-collapse-item__content) { background: rgba(255,255,255,0.02) !important; padding: 12px 16px; border-radius: 0 0 12px 12px; }
.glass-card :deep(.van-cell) { background: transparent !important; color: rgba(255,255,255,0.7) !important; }
.glass-card :deep(.van-cell::after) { border-color: rgba(255,255,255,0.04) !important; }
</style>
