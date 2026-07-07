import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'

// Vant 样式
import 'vant/lib/index.css'
// 公共样式
import './styles/common.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化认证状态后挂载
import { useAuthStore } from './stores/auth.js'
const authStore = useAuthStore(pinia)
authStore.initAuth().then(() => {
  app.mount('#app')
})
