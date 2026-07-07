<template>
  <div class="kb-page">
    <div class="kb-header">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <h2>知识库管理</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ stats.docCount }}</span>
        <span class="stat-label">文档总数</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ stats.indexedCount }}</span>
        <span class="stat-label">已索引</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ stats.vectorChunks }}</span>
        <span class="stat-label">向量片段</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ (stats.totalChars / 1024).toFixed(1) }}</span>
        <span class="stat-label">总字符(KB)</span>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-area">
      <van-uploader
        :after-read="handleUpload"
        accept=".pdf,.docx,.txt,.md"
        :max-size="50 * 1024 * 1024"
        @oversize="showToast('文件不能超过50MB')"
      >
        <van-button icon="plus" type="primary" round block>
          上传文档（支持 PDF / DOCX / TXT / MD）
        </van-button>
      </van-uploader>
    </div>

    <!-- 文档列表 -->
    <div class="doc-list">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="listLoading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <div class="doc-card" v-for="doc in docs" :key="doc.id">
            <div class="doc-main">
              <div class="doc-title">{{ doc.title }}</div>
              <div class="doc-meta">{{ doc.file_type.toUpperCase() }} · {{ formatSize(doc.file_size) }} · {{ formatDate(doc.created_at) }}</div>
            </div>
            <div class="doc-actions">
              <van-tag :type="statusType(doc.status)" size="small">{{ statusText(doc.status) }}</van-tag>
              <van-button size="small" type="danger" plain @click.stop="handleDelete(doc)">删除</van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../utils/request.js'

const router = useRouter()

const stats = reactive({ docCount: 0, indexedCount: 0, totalChars: 0, vectorChunks: 0 })
const docs = ref([])
const page = ref(1)
const listLoading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const loadStats = async () => {
  try {
    const res = await request.get('/knowledge/stats')
    Object.assign(stats, res.data.stats)
  } catch { /* ignore */ }
}

const onLoad = async () => {
  listLoading.value = true
  try {
    const res = await request.get('/knowledge/documents', { params: { page: page.value, size: 20 } })
    docs.value = page.value === 1 ? res.data.list : [...docs.value, ...res.data.list]
    finished.value = res.data.list.length < 20
    page.value++
  } catch (err) {
    showToast('加载失败')
  } finally {
    listLoading.value = false
  }
}

const onRefresh = async () => {
  page.value = 1
  finished.value = false
  await onLoad()
  refreshing.value = false
}

const handleUpload = async (file) => {
  const formData = new FormData()
  formData.append('file', file.file)

  try {
    showToast('上传中...')
    const res = await request.post('/knowledge/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    showToast('上传成功，正在处理...')
    // 刷新列表
    setTimeout(() => {
      page.value = 1
      finished.value = false
      onLoad()
      loadStats()
    }, 2000)
  } catch (err) {
    showToast(err.response?.data?.message || '上传失败')
  }
}

const handleDelete = async (doc) => {
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定要删除「${doc.title}」吗？` })
  } catch { return }

  try {
    await request.delete(`/knowledge/documents/${doc.id}`)
    showToast('已删除')
    page.value = 1
    finished.value = false
    onLoad()
    loadStats()
  } catch (err) {
    showToast('删除失败')
  }
}

const statusType = (s) => {
  if (s === 'done') return 'success'
  if (s === 'fail') return 'danger'
  if (s === 'processing') return 'warning'
  return 'default'
}

const statusText = (s) => {
  const map = { pending: '等待中', processing: '处理中', done: '已索引', fail: '失败' }
  return map[s] || s
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadStats()
  onLoad()
})
</script>

<style scoped>
.kb-page { padding: 32px 24px; }
.kb-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.kb-header h2 { font-size: 28px; font-weight: 700; color: #fff; margin: 0; }
.back-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; transition: all 0.3s; }
.back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

.stats-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; text-align: center; background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 18px 12px; transition: all 0.4s ease; }
.stat-card:hover { border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); }
.stat-num { display: block; font-size: 26px; font-weight: 700; color: #fff; }
.stat-label { display: block; font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }

.upload-area { margin-bottom: 20px; }
.upload-area :deep(.van-button) { background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.15) !important; color: rgba(255,255,255,0.8) !important; border-radius: 14px; font-size: 14px; }
.upload-area :deep(.van-button:hover) { background: rgba(255,255,255,0.14) !important; color: #fff !important; border-color: rgba(255,255,255,0.25) !important; }

.doc-card { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 13px 18px; margin-bottom: 6px; transition: all 0.4s ease; }
.doc-card:hover { border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); }
.doc-main { flex: 1; min-width: 0; margin-right: 16px; }
.doc-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-meta { font-size: 12px; color: rgba(255,255,255,0.35); }
.doc-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
</style>
