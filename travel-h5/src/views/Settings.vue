<template>
  <div class="page">
    <div class="page-header"><h2>⚙️ 个人设置</h2></div>

    <!-- 头像 + 昵称 -->
    <div class="section">
      <h3>头像</h3>
      <div class="avatar-section">
        <van-image :src="avatar" round width="80" height="80" />
        <div>
          <p style="font-weight:600;font-size:16px;margin:0">{{ nickname || authStore.user?.username }}</p>
          <van-uploader :after-read="handleAvatarUpload" accept="image/*" :max-size="5 * 1024 * 1024" @oversize="showToast('图片不能超过5MB')">
            <van-button size="small" plain round>更换头像</van-button>
          </van-uploader>
        </div>
      </div>
    </div>

    <!-- 用户名（不可改） -->
    <div class="section">
      <h3>登录账号</h3>
      <van-field :model-value="authStore.user?.username" readonly placeholder="用户名" />
      <p style="font-size:12px;color:#999;margin:4px 0 0">登录账号不可修改</p>
    </div>

    <!-- 昵称 -->
    <div class="section">
      <h3>昵称</h3>
      <div class="field-wrap">
        <van-field v-model="nickname" placeholder="输入显示昵称" clearable />
      </div>
      <van-button size="small" class="action-btn" round :loading="savingName" @click="saveNickname">保存昵称</van-button>
    </div>

    <!-- 修改密码 -->
    <div class="section">
      <h3>修改密码</h3>
      <div class="field-wrap">
        <van-field v-model="oldPassword" type="password" placeholder="旧密码" />
      </div>
      <div class="field-wrap">
        <van-field v-model="newPassword" type="password" placeholder="新密码（至少6位）" />
      </div>
      <div class="field-wrap">
        <van-field v-model="confirmPassword" type="password" placeholder="确认新密码" />
      </div>
      <van-button size="small" class="action-btn" round :loading="savingPwd" @click="savePassword">修改密码</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import request from '../utils/request.js'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const avatar = ref(authStore.user?.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg')
const nickname = ref(authStore.user?.nickname || authStore.user?.username || '')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingName = ref(false)
const savingPwd = ref(false)

const handleAvatarUpload = async (file) => {
  const formData = new FormData()
  formData.append('avatar', file.file)
  try {
    const res = await request.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    // 加上时间戳避免浏览器缓存旧头像
    const newAvatar = res.data.avatar + '?t=' + Date.now()
    avatar.value = newAvatar
    authStore.user.avatar = res.data.avatar
    showToast('头像已更新')
  } catch (err) {
    showToast(err.response?.data?.message || '上传失败')
  }
}

const saveNickname = async () => {
  if (!nickname.value || nickname.value.length < 1) { showToast('请输入昵称'); return }
  savingName.value = true
  try {
    await request.put('/auth/profile', { nickname: nickname.value })
    authStore.user.nickname = nickname.value
    showToast('昵称已更新')
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '保存失败'
    showToast('保存失败: ' + msg)
  }
  savingName.value = false
}

const savePassword = async () => {
  if (!oldPassword.value || !newPassword.value) { showToast('请填写密码'); return }
  if (newPassword.value.length < 6) { showToast('新密码至少6位'); return }
  if (newPassword.value !== confirmPassword.value) { showToast('两次密码不一致'); return }
  savingPwd.value = true
  try {
    await request.put('/auth/password', { oldPassword: oldPassword.value, newPassword: newPassword.value })
    showToast('密码已修改')
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
  } catch (err) { showToast(err.response?.data?.message || '修改失败') }
  savingPwd.value = false
}
</script>

<style scoped>
.page { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { font-size: 28px; font-weight: 700; color: #fff; margin: 0; }
.section { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 20px; margin-bottom: 16px; transition: all 0.4s ease; }
.section:hover { border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); }
.section h3 { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.5); margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px; }
.section :deep(.van-field) { background: rgba(0,0,0,0.3) !important; border-radius: 10px; padding: 10px 14px; color: #fff !important; }
.section :deep(.van-field::after) { display: none !important; }
.section :deep(.van-field__body) { border: none !important; }
.section :deep(.van-field input) { color: #fff !important; }
.section :deep(.van-field input::placeholder) { color: rgba(255,255,255,0.25) !important; }
.section :deep(.van-field input:-webkit-autofill),
.section :deep(.van-field input:-webkit-autofill:hover),
.section :deep(.van-field input:-webkit-autofill:focus),
.section :deep(.van-field input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px rgba(0,0,0,0.3) inset !important;
  -webkit-text-fill-color: #fff !important;
  caret-color: #fff !important;
  transition: background-color 9999s ease-in-out 0s !important;
}
.avatar-section { display: flex; align-items: center; gap: 16px; }
/* 输入框间距 */
.field-wrap { margin-bottom: 10px; }
.field-wrap:last-child { margin-bottom: 0; }
/* 操作按钮 — 白底黑字加粗，与更换头像一致 */
.action-btn {
  margin-top: 12px;
  background: #fff !important;
  border: none !important;
  color: #000 !important;
  font-weight: 700 !important;
  font-size: 14px !important;
}
.action-btn:hover { background: rgba(255,255,255,0.85) !important; }
</style>
