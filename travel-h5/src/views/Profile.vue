<template>
  <div class="profile-page">
    <h2 class="page-title">我的</h2>

    <div class="glass-card profile-card">
      <div class="profile-info">
        <van-image :src="authStore.user?.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg'" round width="64" height="64" />
        <div>
          <h3>{{ authStore.user?.nickname || authStore.user?.username }}</h3>
          <van-tag :type="authStore.user?.role === 'admin' ? 'danger' : 'primary'" size="small">{{ authStore.user?.role === 'admin' ? '管理员' : '用户' }}</van-tag>
        </div>
      </div>
    </div>

    <div class="menu-grid">
      <router-link to="/favorites" class="glass-card menu-card">
        <span class="menu-icon">⭐</span>
        <span>我的收藏</span>
      </router-link>
      <router-link to="/settings" class="glass-card menu-card">
        <span class="menu-icon">⚙️</span>
        <span>设置</span>
      </router-link>
      <router-link v-if="authStore.user?.role === 'admin'" to="/admin/kb" class="glass-card menu-card">
        <span class="menu-icon">📚</span>
        <span>知识库</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'
const authStore = useAuthStore()
</script>

<style scoped>
.profile-page { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 24px; }

.glass-card { background: rgba(14,19,28,0.45); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; margin-bottom: 16px; transition: all 0.2s; }
.glass-card:hover { border-color: rgba(255,255,255,0.15); }

.profile-info { display: flex; align-items: center; gap: 16px; }
.profile-info h3 { font-size: 18px; color: #fff; margin: 0 0 6px; }

.menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
.menu-card { display: flex; flex-direction: column; align-items: center; gap: 10px; text-decoration: none; cursor: pointer; padding: 24px 16px; }
.menu-card:hover { transform: translateY(-2px); }
.menu-icon { font-size: 28px; }
.menu-card span:last-child { font-size: 14px; color: rgba(255,255,255,0.7); }
</style>
