<template>
  <div v-if="authStore.loading" class="app-loading">
    <van-loading type="spinner" size="48" color="#fff" />
    <p>加载中...</p>
  </div>

  <div v-else-if="authStore.user" class="app-shell">
    <!-- 页面背景（固定，每个页面不同图） -->
    <div class="bg-layer" :style="{ backgroundImage: 'url(' + bgImages[$route.name] + ')' }"></div>

    <div class="app-layout">
      <!-- 玻璃侧栏 -->
      <aside class="sidebar">
        <div class="sidebar-head" @click="$router.push('/')">
          <span class="sidebar-logo">🏨</span>
          <span class="sidebar-title">智能旅游助手</span>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-item" :class="{ active: $route.path === '/' }" @click="$router.push('/')"><span class="nav-icon">🏠</span> 首页</div>
          <div class="nav-item" :class="{ active: $route.path === '/chat' }" @click="$router.push('/chat')"><span class="nav-icon">💬</span> AI 助手</div>
          <div class="nav-item" :class="{ active: $route.path === '/music' }" @click="$router.push('/music')"><span class="nav-icon">🎧</span> 音乐</div>
          <div class="nav-item" @click="historyOpen = !historyOpen"><span class="nav-icon">📂</span> 历史记录 <span class="nav-arrow">{{ historyOpen ? '▾' : '▸' }}</span></div>
          <template v-if="historyOpen">
            <div class="nav-item sub" :class="{ active: $route.path === '/history/chats' }" @click="$router.push('/history/chats')">对话记录</div>
            <div class="nav-item sub" :class="{ active: $route.path === '/history/plans' }" @click="$router.push('/history/plans')">行程记录</div>
          </template>
          <div class="nav-item" :class="{ active: $route.path === '/profile' }" @click="$router.push('/profile')"><span class="nav-icon">👤</span> 我的</div>
          <div class="nav-item" :class="{ active: $route.path === '/favorites' }" @click="$router.push('/favorites')"><span class="nav-icon">⭐</span> 收藏</div>
          <div class="nav-item" :class="{ active: $route.path === '/settings' }" @click="$router.push('/settings')"><span class="nav-icon">⚙️</span> 设置</div>
          <div v-if="authStore.user?.role === 'admin'" class="nav-item" :class="{ active: $route.path === '/admin/kb' }" @click="$router.push('/admin/kb')"><span class="nav-icon">📚</span> 知识库</div>
        </nav>

        <div class="sidebar-foot">
          <div class="user-info">
            <span class="user-name">{{ authStore.user?.nickname || authStore.user?.username }}</span>
            <span class="user-role" v-if="authStore.user?.role === 'admin'">管理员</span>
          </div>
          <div class="logout-btn" @click="handleLogout">退出登录</div>
        </div>
      </aside>

      <main class="main-content">
        <router-view :key="$route.fullPath" />
      </main>
    </div>
  </div>

  <router-view v-else />
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()
const historyOpen = ref(true)

const bgImages = {
  Home: '/images/bg.jpg', Chat: '/images/bgm1.jpg', Profile: '/images/bg.jpg',
  Detail: '/images/bg.jpg', Favorites: '/images/bg.jpg', Settings: '/images/bg.jpg',
  HistoryChats: '/images/bgm2.jpg', HistoryPlans: '/images/bgm3.jpg',
  HistoryChatDetail: '/images/bgm2.jpg', HistoryPlanDetail: '/images/bgm3.jpg',
  KBManagement: '/images/bg.jpg'
}

const handleLogout = async () => { await authStore.logout(); router.replace('/login') }
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
#app { width: 100%; min-height: 100vh; }

.app-shell { position: relative; min-height: 100vh; }

/* 背景层 */
.bg-layer { position: fixed; inset: 0; z-index: 0; background: center / cover no-repeat; }
.bg-layer::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.35); }

/* 布局 */
.app-layout { position: relative; z-index: 1; display: flex; min-height: 100vh; }

/* 侧栏 */
.sidebar { width: 220px; min-width: 220px; background: rgba(10,14,20,0.75); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 100; }
.sidebar-head { display: flex; align-items: center; gap: 10px; padding: 20px 18px; cursor: pointer; user-select: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
.sidebar-logo { font-size: 26px; }
.sidebar-title { font-size: 16px; font-weight: 700; color: #fff; }
.sidebar-nav { flex: 1; padding: 8px 0; overflow-y: auto; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; margin: 2px 12px; border-radius: 10px; color: rgba(255,255,255,0.55); font-size: 14px; cursor: pointer; transition: all 0.3s ease; }
.nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }
.nav-item.sub { padding-left: 38px; font-size: 13px; }
.nav-icon { font-size: 16px; width: 24px; text-align: center; }
.nav-arrow { margin-left: auto; font-size: 11px; opacity: 0.5; }
.sidebar-foot { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.user-info { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; padding: 0 4px; }
.user-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); }
.user-role { font-size: 11px; color: rgba(255,255,255,0.35); }
.logout-btn { display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 10px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); transition: all 0.3s ease; }
.logout-btn:hover { background: rgba(255,80,80,0.12); border-color: rgba(255,80,80,0.22); color: #ff6b6b; }

.main-content { flex: 1; min-width: 0; position: relative; }

.app-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0e131c; color: rgba(255,255,255,0.6); }
</style>
