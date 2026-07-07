<template>
  <div class="budget-table">
    <van-cell-group :border="false">
      <van-cell
        v-for="(value, key) in budgetItems"
        :key="key"
        :title="getLabel(key)"
        :value="`¥${value}`"
        :border="false"
      />
    </van-cell-group>
    <div class="budget-total">
      <span>总计</span>
      <span class="total-amount">¥{{ total }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  total: {
    type: [Number, String],
    default: 0
  }
})

const budgetItems = computed(() => {
  return {
    accommodation: props.data.accommodation || 0,
    food: props.data.food || 0,
    transportation: props.data.transportation || 0,
    tickets: props.data.tickets || 0,
    other: props.data.other || 0
  }
})

const labelMap = {
  accommodation: '住宿',
  food: '餐饮',
  transportation: '交通',
  tickets: '门票',
  other: '其他'
}

const getLabel = (key) => {
  return labelMap[key] || key
}
</script>

<style scoped>
.budget-table { margin-top: 8px; }
.budget-table :deep(.van-cell-group) { background: transparent !important; }
.budget-table :deep(.van-cell) { background: rgba(255,255,255,0.03) !important; color: rgba(255,255,255,0.7) !important; margin-bottom: 4px; border-radius: 8px; }
.budget-table :deep(.van-cell__title) { color: rgba(255,255,255,0.6) !important; }
.budget-table :deep(.van-cell__value) { color: rgba(255,255,255,0.8) !important; font-weight: 600; }

.budget-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; background: rgba(255,255,255,0.06); border-radius: 8px;
  margin-top: 8px; font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.8);
}
.total-amount { color: #ff6b6b; font-size: 18px; }
</style>