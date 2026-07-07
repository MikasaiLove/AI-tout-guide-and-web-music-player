---
name: unit-test
description: 为项目创建单元测试、执行测试、生成测试报告
---

# 单元测试 — 创建、执行、报告

请按以下流程逐步操作，每步完成后简要告诉用户进展。

---

## 第 1 步：评估项目

先搞清楚三个问题：

1. **这是什么类型的项目？**（Vue3 前端 + Node.js Express 后端）
2. **有没有现成的测试框架？**（检查 `package.json` 有没有 vitest、jest、mocha 等）
3. **适合用什么测试工具？**

推荐（按项目类型）：

| 端 | 推荐框架 | 理由 |
|---|---------|------|
| Backend (Node.js) | Vitest | 快、原生 ESM、零配置 |
| Frontend (Vue 3) | Vitest + @vue/test-utils | Vue 官方推荐 |

## 第 2 步：安装测试框架

如果项目还没有测试框架：
- 告诉用户要装什么
- 安装命令由用户确认后执行
- 安装完成后，在 `package.json` 中加入测试命令

如果已有，跳过安装。

## 第 3 步：找出可测试的代码

扫描项目源码，优先选择：

**后端 (server/)：**
- 纯函数：`parseRecommendationResponse()`、`cosineSimilarity()`、`splitText()`
- 服务层：`authService.js` 中的 `createTokens()`、`verifyToken()`、`registerUser()`
- 工具函数：`streamUtils.js` 中的 SSE 辅助函数
- API 端点：用 supertest 测试 Express 路由

**前端 (travel-h5/)：**
- Pinia Store 逻辑：`chat.js`、`auth.js` 中的 state 变更
- 工具函数：`auth.js` 中 Token 存储操作
- 组件渲染：Vue 组件挂载测试

跳过：
- 纯第三方调用（如直接 fetch/axios 调用）
- 需要完整浏览器环境的功能
- 需要 MySQL/Chroma 等外部依赖的逻辑

## 第 4 步：编写测试

### 后端测试模板

```js
// server/tests/auth.test.js
import { describe, it, expect } from 'vitest'
import { createTokens, verifyToken } from '../src/services/authService.js'

describe('authService', () => {
  it('createTokens 应该返回 accessToken 和 refreshToken', () => {
    const tokens = createTokens({ id: 'test', role: 'user' })
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
  })
})
```

### 前端测试模板

```js
// travel-h5/src/__tests__/stores/chat.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '../../stores/chat.js'

describe('chatStore', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('addUserMessage 应该添加用户消息到列表', () => {
    const store = useChatStore()
    store.addUserMessage('你好')
    expect(store.messages).toHaveLength(1)
    expect(store.messages[0].role).toBe('user')
  })
})
```

## 第 5 步：执行测试

```bash
# 后端
cd server && npx vitest run

# 前端
cd travel-h5 && npx vitest run
```

## 第 6 步：生成报告

中文输出：

```
🧪 测试报告
━━━━━━━━━━━━━━
✅ 通过: 15 个
❌ 失败: 2 个
⏭  跳过: 0 个
⏱  耗时: 3.2 秒

失败详情:
  ❌ authService > 密码哈希不等同于明文
     Expected: not "plaintext"
     Received: "plaintext"
     文件: server/tests/auth.test.js:25
```
