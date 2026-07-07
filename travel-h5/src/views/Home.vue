<template>
  <div class="home-page">
    <div class="home-content">
      <div class="home-hero">
        <h1>智能旅游助手</h1>
        <p>选择目的地，AI 为你生成专属旅行规划</p>
      </div>

      <!-- 搜索城市 -->
      <div class="search-section">
        <div class="search-wrap">
          <van-search v-model="searchText" shape="round" placeholder="输入城市名称搜索..." clearable @update:model-value="onSearchInput" @search="onSearchSubmit" />
        </div>
        <div class="suggestions" v-if="suggestions.length > 0 && !selectedCity">
          <div v-for="item in suggestions" :key="item.city" class="suggestion-item" @click="selectCity(item)">
            <span class="city-name">{{ item.city }}</span>
            <span class="city-loc">{{ item.province }}</span>
          </div>
        </div>
      </div>

      <!-- 选中城市 -->
      <div class="area-display" v-if="selectedCity">
        <div class="area-row">
          <span class="area-tag">{{ areaLabels.province }}</span>
          <span class="area-arrow" v-if="areaLabels.city">→</span>
          <span class="area-tag hl" v-if="areaLabels.city">{{ areaLabels.city }}</span>
          <span class="area-arrow" v-if="areaLabels.district">→</span>
          <span class="area-tag" v-if="areaLabels.district">{{ areaLabels.district }}</span>
          <span class="area-close" @click="clearSearch">✕</span>
          <button class="fav-btn" :disabled="favLoading" @click="addFavorite">☆ 收藏</button>
        </div>
        <div class="district-options" v-if="districtOptions.length > 1">
          <span v-for="d in districtOptions" :key="d.code" class="district-chip" :class="{ active: selectedDistrict === d.code }" @click="selectDistrict(d)">{{ d.name }}</span>
        </div>
      </div>

      <!-- 偏好 -->
      <div class="pref-row">
        <div class="pref-card">
          <label>预算</label>
          <van-field v-model="form.budget" type="number" placeholder="0" />
          <span class="unit">元</span>
        </div>
        <div class="pref-card">
          <label>天数</label>
          <van-field v-model="form.days" type="digit" placeholder="0" />
          <span class="unit">天</span>
        </div>
      </div>

      <!-- AI 模型 -->
      <div class="model-card">
        <label>AI 模型</label>
        <div class="model-row">
          <select v-model="selectedProvider" class="glass-select" @change="onProviderChange">
            <option v-for="p in providers" :key="p.key" :value="p.key">{{ p.name }}</option>
          </select>
          <select v-model="selectedModel" class="glass-select">
            <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>

      <!-- 热门目的地 -->
      <div class="hot-card">
        <label>热门目的地</label>
        <div class="hot-grid">
          <span v-for="city in hotCities" :key="city" class="hot-chip" @click="selectByName(city)">{{ city }}</span>
        </div>
      </div>

      <button class="submit-btn" :disabled="loading" @click="handleSubmit">
        {{ loading ? '规划中...' : '开始规划' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../utils/request.js'
import areaData from 'china-area-data'

const route = useRoute()
const router = useRouter()

const loading = ref(false); const favLoading = ref(false); const searchText = ref('')
const providers = ref([]); const selectedProvider = ref('bailian'); const selectedModel = ref('qwen-turbo')

const modelMap = { bailian: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen2.5-72b-instruct'], deepseek: ['deepseek-chat', 'deepseek-reasoner'] }
const currentModels = computed(() => modelMap[selectedProvider.value] || [])
const onProviderChange = () => { selectedModel.value = currentModels.value[0] || '' }

onMounted(async () => {
  try { const res = await request.get('/travel/providers'); if (res.data?.providers?.length > 0) { providers.value = res.data.providers; selectedProvider.value = res.data.defaultProvider || res.data.providers[0].key; selectedModel.value = currentModels.value[0] || '' } } catch {}
  // 收藏页传来的城市，自动选中
  const qCity = route.query.city
  if (qCity) { const m = cityList.find(c => c.city === qCity || c.city.replace(/市$/,'') === qCity || c.city.includes(qCity)); if (m) selectCity(m) }
})

const form = reactive({ budget: 3000, days: 3 })
const areaLabels = reactive({ province: '', city: '', district: '' })
const selectedCity = ref(false); const selectedDistrict = ref(''); const suggestions = ref([]); const districtOptions = ref([])

const cityList = []
;(function build() {
  const root = areaData['86'] || {}
  for (const [pc, pn] of Object.entries(root)) {
    for (const [cc, cn] of Object.entries(areaData[pc] || {})) {
      const rcn = (cn === '市辖区' || cn === '县' || cn === pn) ? pn : cn
      cityList.push({ province: pn, provinceCode: pc, city: rcn, cityCode: cc, districts: Object.keys(areaData[cc] || {}).length })
    }
  }
})()

const onSearchInput = (v) => {
  // 当用户点击清除按钮或手动清空输入时，v 为空 → 触发完整清除
  if (!v || v.length === 0) { clearSearch(); return }
  selectedCity.value = false
  suggestions.value = v.length > 1 ? cityList.filter(c => c.city.includes(v) || c.province.includes(v)).slice(0, 12) : []
}
const onSearchSubmit = (v) => { const m = cityList.find(c => c.city === v || c.city.replace(/市$/,'') === v || c.province === v); if (m) selectCity(m) }
const selectCity = (item) => { searchText.value = item.city; areaLabels.province = item.province; areaLabels.city = item.city; areaLabels.district = ''; selectedCity.value = true; selectedDistrict.value = ''; suggestions.value = []; districtOptions.value = Object.entries(areaData[item.cityCode] || {}).map(([k,v]) => ({ code: k, name: v })) }
const selectDistrict = (d) => { areaLabels.district = d.name; selectedDistrict.value = d.code }
const selectByName = (n) => { const m = cityList.find(c => c.city === n || c.city.replace(/市$/,'') === n || c.province.replace(/市$/,'') === n || c.city.includes(n)); if (m) selectCity(m) }
const clearSearch = () => { searchText.value = ''; selectedCity.value = false; suggestions.value = []; districtOptions.value = []; selectedDistrict.value = ''; areaLabels.province = ''; areaLabels.city = ''; areaLabels.district = '' }
const addFavorite = async () => { if (!areaLabels.city) return; favLoading.value = true; try { await request.post('/favorites', { city: areaLabels.city, province: areaLabels.province }); showToast('已收藏') } catch (e) { showToast(e.response?.data?.message || '收藏失败') } favLoading.value = false }

const hotCities = ['北京', '上海', '广州', '成都', '杭州', '西安', '重庆', '南京', '武汉', '长沙', '三亚', '大理']

const handleSubmit = () => {
  let c = areaLabels.city
  if (!c && searchText.value.trim()) { const n = searchText.value.trim(); const m = cityList.find(x => x.city === n || x.city.replace(/市$/,'') === n || x.province === n); c = m ? m.city : n }
  const dc = c ? c.replace(/市$/, '') : ''
  if (!dc) { showToast('请选择或搜索目的地城市'); return }
  if (!form.budget || form.budget <= 0) { showToast('请输入有效预算'); return }
  if (!form.days || form.days <= 0) { showToast('请输入有效天数'); return }
  loading.value = true
  router.push({ name: 'Detail', query: { city: dc, budget: form.budget, days: form.days, provider: selectedProvider.value, model: selectedModel.value } })
}
</script>

<style scoped>
.home-page { min-height: 100vh; display: flex; justify-content: center; padding: 40px 0 80px; }
.home-content { width: 520px; max-width: 94vw; }

.home-hero { text-align: center; margin-bottom: 32px; }
.home-hero h1 { font-size: 30px; font-weight: 700; color: #fff; margin: 0 0 8px; letter-spacing: 0.5px; }
.home-hero p { font-size: 14px; color: rgba(255,255,255,0.45); margin: 0; }

/* ===== 玻璃面板 ===== */
.area-display, .pref-card, .model-card, .hot-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 18px; padding: 14px 18px; margin-bottom: 12px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.search-section {
  position: relative;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 18px; padding: 6px 12px 6px; margin-bottom: 12px;
}
.area-display:hover, .pref-card:hover, .model-card:hover, .hot-card:hover {
  border-color: rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
}
label { display: block; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.4); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }

/* 搜索 — 覆盖 Vant 所有默认白色背景 */
.search-wrap { padding: 4px 6px; }
.search-wrap :deep(.van-search) { background: transparent !important; }
.search-wrap :deep(.van-search__content) { background: transparent !important; }
.search-wrap :deep(.van-field) { background: transparent !important; }
.search-wrap :deep(.van-field__body) { background: transparent !important; }
.search-wrap :deep(.van-field input) { color: #fff !important; text-align: center !important; font-size: 16px; font-weight: 500; background: transparent !important; }
.search-wrap :deep(.van-field input::placeholder) { color: rgba(255,255,255,0.3) !important; }
.search-wrap :deep(.van-search__action) { display: none; }
.search-wrap :deep(.van-search__clear) { position: relative; z-index: 10; padding: 4px; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 18px; }
.search-wrap :deep(.van-search__clear:hover) { color: #fff; }

.suggestions { position: absolute; top: 54px; left: 0; right: 0; z-index: 999; background: #141820; border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; max-height: 300px; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
.suggestion-item { display: flex; justify-content: space-between; padding: 13px 22px; cursor: pointer; transition: background 0.15s; }
.suggestion-item:hover { background: rgba(255,255,255,0.06); }
.suggestion-item:first-child { padding-top: 16px; }
.suggestion-item:last-child { padding-bottom: 16px; }
.city-name { font-size: 15px; font-weight: 600; color: #fff; }
.city-loc { font-size: 12px; color: rgba(255,255,255,0.35); }

/* 已选区域 */
.area-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.area-tag { font-size: 15px; color: rgba(255,255,255,0.55); }
.area-tag.hl { color: rgba(255,255,255,0.9); font-weight: 600; font-size: 18px; }
.area-arrow { color: rgba(255,255,255,0.2); }
.area-close { cursor: pointer; color: rgba(255,255,255,0.25); margin-left: 4px; font-size: 16px; transition: color 0.2s; }
.area-close:hover { color: rgba(255,255,255,0.7); }
.fav-btn { margin-left: auto; padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; transition: all 0.4s ease; }
.fav-btn:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.18); }

.district-options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.district-chip { padding: 4px 12px; border-radius: 14px; font-size: 13px; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); cursor: pointer; border: 1px solid transparent; transition: all 0.3s; }
.district-chip:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
.district-chip.active { background: rgba(255,255,255,0.9); color: #000; font-weight: 600; }

/* 偏好 */
.pref-row { display: flex; gap: 12px; }
.pref-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pref-card :deep(.van-field) { padding: 0; background: transparent !important; border: none !important; }
.pref-card :deep(.van-field__control) { text-align: center; }
.pref-card :deep(.van-field input) { color: #fff !important; text-align: center !important; font-size: 28px; font-weight: 700; }
.pref-card :deep(.van-field::after) { display: none !important; }
.pref-card :deep(.van-field__body) { border: none !important; }
.unit { color: rgba(255,255,255,0.25); font-size: 12px; }

/* 模型 */
.model-row { display: flex; gap: 10px; }
.glass-select { flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.35); color: #fff; font-size: 14px; font-weight: 500; outline: none; cursor: pointer; transition: all 0.3s ease; }
.glass-select:hover { border-color: rgba(255,255,255,0.15); background: rgba(0,0,0,0.45); }
.glass-select:focus { border-color: rgba(255,255,255,0.2); box-shadow: 0 0 0 2px rgba(255,255,255,0.04); }
.glass-select option { background: #141820; color: #fff; padding: 10px; }

/* 热门 */
.hot-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.hot-chip { padding: 8px 18px; border-radius: 20px; font-size: 14px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55); cursor: pointer; border: 1px solid rgba(255,255,255,0.04); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.hot-chip:hover { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }

/* 提交 */
.submit-btn { width: 100%; height: 52px; font-size: 17px; font-weight: 600; letter-spacing: 3px; border-radius: 18px; background: rgba(255,255,255,0.88); color: #000; border: none; cursor: pointer; margin-top: 12px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.submit-btn:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 16px 48px rgba(0,0,0,0.3); }
.submit-btn:active { transform: translateY(0); }
</style>
