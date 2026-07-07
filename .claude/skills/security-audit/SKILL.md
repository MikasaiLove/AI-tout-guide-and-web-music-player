---
name: security-audit
description: 代码安全审计 — 检查敏感信息泄露、注入漏洞、配置风险、API安全等
---

# 安全审计 — 全面代码安全检查

请按以下流程逐步审计当前项目的安全隐患，最后给出一份中文报告。

---

## 审计标准

参照 OWASP Top 10 常见安全风险，结合本项目实际情况（Node.js Express 后端 + Vue3 前端 + MySQL 数据库 + 百炼/DeepSeek API + SSE 流式），重点检查以下方面。

---

## 第 1 步：确定检查范围

默认检查以下类型的文件：
- 所有 `.js`、`.vue` 源码文件
- `.env`、`.env.example`、`package.json` 配置文件
- `vite.config.js` 等构建配置

跳过：`node_modules/`、`dist/`、`data/`、`.git/`

---

## 第 2 步：逐项检查

### 检查项 A：硬编码敏感信息

| 风险 | 搜索关键词 |
|------|-----------|
| API 密钥 | `api_key`、`apikey`、`BAILIAN`、`DEEPSEEK`、`SILICONFLOW`、`DASHSCOPE` |
| JWT 密钥 | `jwt_secret`、`JWT_SECRET`、`SECRET_KEY` |
| 数据库密码 | `DB_PASSWORD`、`DB_USER`、`mysql` |
| 硬编码 Token | `accessToken`、`refreshToken`、`Bearer` |

判定：明文字符串硬编码 → 🔴 严重。`process.env.XXX` → ✅ 安全。

### 检查项 B：SQL 注入风险

- 所有 MySQL 查询是否使用 `?` 参数化（`pool.execute(sql, [param])`）？
- 是否存在字符串拼接 SQL（`"SELECT * FROM users WHERE id = '" + id + "'"`）？
- `JSON_EXTRACT` 等函数是否用参数化？

### 检查项 C：认证与授权

- JWT Token 是否设置了合理的过期时间？
- Refresh Token 是否正确实现了撤销机制？
- 管理员路由是否使用了 `requireAdmin` 中间件？
- 用户只能操作自己的数据（如删除自己的聊天记录）？

### 检查项 D：API 安全

- CORS 配置是否过于宽松（`Access-Control-Allow-Origin: *`）？
- 文件上传是否有类型和大小限制？
- SSE 端点是否有认证检查？
- 错误响应是否泄露了敏感信息（堆栈跟踪、数据库错误）？

### 检查项 E：LLM/AI 安全

- API Key 是否只通过 `.env` 读取，不在前端代码中出现？
- Prompt 是否有注入风险（用户输入直接拼入系统提示词）？
- 知识库是否有权限控制（只允许管理员上传）？
- AI 生成内容是否可能包含恶意代码（XSS）？

### 检查项 F：前端安全

- 用户输入是否经过适当转义（XSS 防护）？
- localStorage 存的 Token 是否有 XSS 暴露风险？
- axios 拦截器是否泄漏 Token 到日志？
- Vue 的 `v-html` 是否对 AI 生成内容做了 XSS 防护？

### 检查项 G：其他隐患

- `.env` 文件是否在 `.gitignore` 中？
- 依赖包是否有已知漏洞（检查 `npm audit`）？
- 调试日志是否在生产环境中关闭？
- HTTPS 是否启用？
