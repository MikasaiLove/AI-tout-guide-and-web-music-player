import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  { path: '/', name: 'Home', component: () => import('../views/Home.vue'), meta: { requiresAuth: true } },
  { path: '/chat', name: 'Chat', component: () => import('../views/Chat.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { requiresAuth: true } },
  { path: '/detail', name: 'Detail', component: () => import('../views/Detail.vue'), meta: { requiresAuth: true } },
  { path: '/admin/kb', name: 'KBManagement', component: () => import('../views/KBManagement.vue'), meta: { requiresAuth: true } },
  { path: '/history/chats', name: 'HistoryChats', component: () => import('../views/HistoryChats.vue'), meta: { requiresAuth: true } },
  { path: '/history/chats/:id', name: 'HistoryChatDetail', component: () => import('../views/HistoryChatDetail.vue'), meta: { requiresAuth: true } },
  { path: '/history/plans', name: 'HistoryPlans', component: () => import('../views/HistoryPlans.vue'), meta: { requiresAuth: true } },
  { path: '/history/plans/:id', name: 'HistoryPlanDetail', component: () => import('../views/HistoryPlanDetail.vue'), meta: { requiresAuth: true } },
  { path: '/favorites', name: 'Favorites', component: () => import('../views/Favorites.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue'), meta: { requiresAuth: true } },
  { path: '/music', name: 'Music', component: () => import('../views/Music.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && isLoggedIn()) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
