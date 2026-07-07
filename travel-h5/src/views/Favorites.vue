<template>
  <div class="page">
    <div class="page-header"><h2>我的收藏</h2></div>

    <div class="fav-list" v-if="list.length > 0">
      <div v-for="item in list" :key="item.id" class="glass-card fav-card">
        <div class="fav-info">
          <span class="fav-city">{{ item.city }}</span>
          <span class="fav-prov" v-if="item.province">{{ item.province }}</span>
        </div>
        <div class="fav-actions">
          <button class="act-btn plan" @click="goPlan(item.city)">规划</button>
          <button class="act-btn del" @click="handleDelete(item)">取消</button>
        </div>
      </div>
    </div>
    <div class="glass-card empty" v-else>
      <p>还没有收藏城市</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../utils/request.js'

const router = useRouter()
const list = ref([])

onMounted(async () => {
  try { const res = await request.get('/favorites'); list.value = res.data.list } catch {}
})

const goPlan = (city) => {
  window.location.hash = '#/?city=' + city
}

const handleDelete = async (item) => {
  try { await showConfirmDialog({ title: '确认', message: '取消收藏？' }) } catch { return }
  try { await request.delete(`/favorites/${item.id}`); list.value = list.value.filter(i => i.id !== item.id) } catch { showToast('操作失败') }
}
</script>

<style scoped>
.page { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { font-size: 28px; font-weight: 700; color: #fff; margin: 0; }

.glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 18px 20px; margin-bottom: 10px; transition: all 0.4s ease; }
.glass-card:hover { border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); }

.fav-card { display: flex; align-items: center; justify-content: space-between; }
.fav-city { font-size: 17px; font-weight: 600; color: #fff; }
.fav-prov { font-size: 13px; color: rgba(255,255,255,0.4); margin-left: 8px; }
.fav-actions { display: flex; gap: 8px; }
.act-btn { padding: 7px 16px; border-radius: 10px; font-size: 13px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); transition: all 0.3s; }
.act-btn.plan:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); }
.act-btn.del:hover { background: rgba(255,80,80,0.15); border-color: rgba(255,80,80,0.3); color: #ff6b6b; }

.empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.35); }
</style>
