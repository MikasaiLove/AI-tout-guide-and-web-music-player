<template>
  <div class="login-page">
    <!-- 全屏背景视频 -->
    <video class="bg-video" src="/videos/bg.mp4" autoplay loop muted playsinline poster="/images/bg.jpg"></video>

    <!-- 暗色遮罩 -->
    <div class="bg-overlay"></div>

    <!-- 登录卡片 — 透明底 -->
    <div class="login-card">
      <div class="card-header">
        <h1>智能旅游助手</h1>
        <p>AI 驱动的个性化旅行规划平台</p>
      </div>

      <van-tabs v-model:active="activeTab" class="login-tabs" type="card">
        <van-tab title="登录">
          <van-form @submit="handleLogin">
            <div class="input-box">
              <van-field v-model="loginForm.username" placeholder="用户名" autocomplete="username" :rules="[{ required: true, message: '请输入用户名' }]" />
            </div>
            <div class="input-box">
              <van-field v-model="loginForm.password" type="password" placeholder="密码" autocomplete="current-password" :rules="[{ required: true, message: '请输入密码' }]" />
            </div>
            <van-button type="primary" block round native-type="submit" :loading="loginLoading" class="submit-btn">登 录</van-button>
          </van-form>
        </van-tab>

        <van-tab title="注册">
          <van-form @submit="handleRegister">
            <div class="input-box">
              <van-field v-model="regForm.username" placeholder="用户名（登录账号）" autocomplete="off" :rules="[{ required: true, message: '请输入用户名' }, { min: 2, message: '至少2个字符' }]" />
            </div>
            <div class="input-box">
              <van-field v-model="regForm.nickname" placeholder="昵称（可留空）" autocomplete="off" />
            </div>
            <div class="input-box">
              <van-field v-model="regForm.password" type="password" placeholder="密码（至少6位）" autocomplete="new-password" :rules="[{ required: true, message: '请输入密码' }, { min: 6, message: '至少6个字符' }]" />
            </div>
            <div class="input-box">
              <van-field v-model="regForm.confirmPassword" type="password" placeholder="确认密码" autocomplete="new-password" :rules="[{ required: true, message: '请确认密码' }, { validator: checkPasswordMatch, message: '两次密码不一致' }]" />
            </div>
            <van-button type="primary" block round native-type="submit" :loading="regLoading" class="submit-btn">注 册</van-button>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()
const activeTab = ref(0)

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', nickname: '', password: '', confirmPassword: '' })
const loginLoading = ref(false)
const regLoading = ref(false)

const checkPasswordMatch = () => regForm.password === regForm.confirmPassword

const handleLogin = async () => {
  loginLoading.value = true
  try {
    await authStore.login(loginForm.username, loginForm.password)
    showToast({ message: '登录成功', position: 'middle' })
    router.replace('/')
  } catch (err) {
    showToast(err.response?.data?.message || '登录失败')
  } finally { loginLoading.value = false }
}

const handleRegister = async () => {
  if (regForm.password !== regForm.confirmPassword) { showToast('两次密码不一致'); return }
  regLoading.value = true
  try {
    await authStore.register(regForm.username, regForm.password, regForm.nickname)
    showToast({ message: '注册成功', position: 'middle' })
    router.replace('/')
  } catch (err) {
    showToast(err.response?.data?.message || '注册失败')
  } finally { regLoading.value = false }
}
</script>

<style scoped>
.login-page { position: relative; width: 100%; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; }

/* 全屏视频 */
.bg-video { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 0; }

/* 暗色遮罩 */
.bg-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); z-index: 1; }

/* === 胶囊形毛玻璃卡片 === */
.login-card {
  position: relative; z-index: 10;
  width: min(380px, 88vw);
  padding: 32px 32px 28px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 48px;
}

.card-header { text-align: center; margin-bottom: 20px; }
.card-header h1 { font-size: 24px; font-weight: 600; color: #fff; margin: 0 0 4px; }
.card-header p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

/* Tabs 透明化 */
.login-tabs :deep(.van-tabs__wrap) { background: transparent !important; }
.login-tabs :deep(.van-tabs__nav) { background: transparent !important; }
.login-tabs :deep(.van-tabs__content) { padding-top: 20px; }
.login-tabs :deep(.van-tabs__nav--card) {
  background: rgba(0,0,0,0.25) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255,255,255,0.10) !important;
}
.login-tabs :deep(.van-tab) {
  color: rgba(255,255,255,0.5) !important; font-size: 14px; font-weight: 500;
  border-radius: 12px !important;
}
.login-tabs :deep(.van-tab--active) {
  background: #fff !important; color: #000 !important; font-weight: 700;
  border-radius: 12px !important;
}
.login-tabs :deep(.van-tabs__line) { display: none !important; }

/* 输入框 — 半透白底，清晰可见 */
.input-box { margin-bottom: 10px; }
.input-box :deep(.van-field) {
  background: rgba(0,0,0,0.35) !important;
  border-radius: 12px; padding: 10px 16px;
  border: 1px solid rgba(255,255,255,0.10);
  color: #fff !important;
  transition: all 0.3s;
}
.input-box :deep(.van-field input) { color: #fff !important; caret-color: #fff; }
.input-box :deep(.van-field input::placeholder) { color: rgba(255,255,255,0.4) !important; }
.input-box :deep(.van-field:focus-within) {
  background: rgba(0,0,0,0.45) !important;
  border-color: rgba(255,255,255,0.25);
}
/* 覆盖浏览器自动填充的灰色背景 */
.input-box :deep(.van-field input:-webkit-autofill),
.input-box :deep(.van-field input:-webkit-autofill:hover),
.input-box :deep(.van-field input:-webkit-autofill:focus),
.input-box :deep(.van-field input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px rgba(0,0,0,0.35) inset !important;
  -webkit-text-fill-color: #fff !important;
  caret-color: #fff !important;
  transition: background-color 9999s ease-in-out 0s !important;
}

/* 提交按钮 — 白底黑字 */
.submit-btn {
  height: 44px; font-size: 15px; font-weight: 700; letter-spacing: 2px; margin-top: 4px;
  border-radius: 14px;
  background: #fff !important;
  border: none !important;
  color: #000 !important;
  transition: all 0.3s;
}
.submit-btn:hover { background: rgba(255,255,255,0.85) !important; }
</style>
