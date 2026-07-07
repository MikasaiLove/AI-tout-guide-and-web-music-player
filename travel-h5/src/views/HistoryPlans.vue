<template>
  <div class="page">
    <div class="page-header"><h2>历史行程</h2></div>
    <div v-for="item in list" :key="item.id" class="glass-card item-card" @click="router.push({ name: 'HistoryPlanDetail', params: { id: item.id } })">
      <div class="item-main">
        <span class="item-title">{{ item.city }} · {{ item.days }}天</span>
        <span class="item-meta">预算 ¥{{ item.budget }} · {{ item.provider || 'AI' }} · {{ formatDate(item.created_at) }}</span>
      </div>
      <span class="item-del" @click.stop="handleDelete(item)">✕</span>
    </div>
    <div class="glass-card empty" v-if="!loading && list.length === 0"><p>暂无历史行程</p></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import request from '../utils/request.js'
const router = useRouter()
const list = ref([])
const loading = ref(false)
const onLoad = async () => { try { const res = await request.get('/history/plans'); list.value = res.data.list } catch {} }
const handleDelete = async (item) => { try { await showConfirmDialog({ title: '删除行程', message: `确定要删除「${item.city} · ${item.days}天」的行程规划吗？` }) } catch { return }; try { await request.delete(`/history/plans/${item.id}`); list.value = list.value.filter(i => i.id !== item.id) } catch { showToast('删除失败') } }
const formatDate = (d) => d ? new Date(d).toLocaleString('zh-CN') : ''
onLoad()
</script>

<style scoped>
.page { max-width: 700px; margin: 0 auto; padding: 32px 24px; }
.page-header h2 { font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 24px; }
.glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 16px 20px; margin-bottom: 8px; transition: all 0.4s ease; }
.item-card { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.item-card:hover { border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); }
.item-title { font-size: 16px; font-weight: 600; color: #fff; }
.item-meta { display: block; font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; }
.item-del { color: rgba(255,255,255,0.25); cursor: pointer; font-size: 18px; transition: color 0.2s; }
.item-del:hover { color: #ff6b6b; }
.empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.35); }
</style>
