# 🧳 AI 旅游推荐平台 + 🎵 Web 音乐播放器

一个全栈项目，融合 AI 智能旅游规划与黑胶唱片风格的音乐播放器。

---

## 🎯 功能概览

### 🧳 AI 旅游助手

- **智能行程规划** — 输入城市、预算、天数，AI 生成完整 JSON 结构化行程（景点、交通、费用明细）
- **多模型支持** — 阿里云百炼 / DeepSeek 可切换
- **流式对话** — SSE 实时流式输出，打字机效果
- **知识库 RAG** — 管理员上传 PDF/DOCX/TXT/MD 文档，对话时自动检索相关旅游知识
- **历史记录** — 对话和行程自动保存，可回溯查看
- **收藏功能** — 收藏感兴趣的城市

### 🎵 音乐播放器

- **本地 MP3/FLAC 播放** — 拖拽导入，无需服务器
- **黑胶唱片 UI** — CSS 径向渐变唱片纹理 + 封面 + 旋转动画 + 粒子光点
- **LRC 歌词** — 精确滚动高亮，行内中英双语自动分割
- **沉浸模式** — 点击唱片切换，自动隐藏控件，滑动手势切歌
- **音频可视化** — Web Audio API 实时频谱
- **歌单管理** — 拖拽排序、搜索过滤、随机播放
- **键盘快捷键** — 空格播放 · 方向键快进/音量 · ESC 退出
- **睡眠定时器** — 15/30/45/60 分钟
- **Media Session API** — 系统媒体键 + 锁屏显示

---

## 🎶 音乐导入流程

```
QQ 音乐加密歌曲
     │
     ▼
┌──────────────────────┐
│  QKKDecrypt UI       │  解密 QQ 音乐 .mgg/.mflac → .mp3/.flac
│  (D:\QQ音乐转码\)     │  无需购买即可下载到本地
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  MusicTag            │  内嵌歌词/歌手/封面到 MP3 ID3 标签
│  (D:\QQ音乐转码\)     │  LRC 歌词 → USLT 帧 (UTF-16)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AI 旅游推荐平台      │  拖拽 MP3 导入，自动解析 ID3 标签
│  音乐播放器页面       │  封面、歌词、歌手名全部就绪 🎉
└──────────────────────┘
```

### 工具说明

| 工具 | 路径 | 用途 |
|------|------|------|
| **QKKDecrypt UI** | `D:\QQ音乐转码\QKKDecrypt UI\` | 将 QQ 音乐加密格式解密为通用 MP3/FLAC |
| **MusicTag** | `D:\QQ音乐转码\MusicTag\` | 搜索歌词/封面/歌手信息，写入 MP3 ID3 标签 |

> ⚠️ 音乐仅供个人学习交流使用，请尊重版权。

---

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + Pinia + Vue Router + Vant 4 |
| 后端 | Node.js + Express + MySQL + JWT |
| AI | LangChain + 百炼 / DeepSeek API + SSE 流式 |
| 音频 | Web Audio API + Media Session API + ID3v2 解析 |
| 测试 | Vitest + @vue/test-utils + jsdom |
| 安全 | bcryptjs + JWT + express-rate-limit + CORS |

---

## 📂 项目结构

```
├── server/                    # 后端服务
│   ├── src/
│   │   ├── index.js           # Express 入口 + 中间件
│   │   ├── routes/            # 路由层
│   │   │   ├── travel.js      # AI 旅游推荐 + 对话
│   │   │   ├── auth.js        # 注册/登录/个人中心
│   │   │   ├── history.js     # 对话/行程历史
│   │   │   ├── favorites.js   # 城市收藏
│   │   │   ├── knowledge.js   # 知识库管理（管理员）
│   │   │   └── music.js       # 歌词查询（lrclib 缓存）
│   │   ├── services/          # 业务逻辑层
│   │   │   ├── travelService.js    # LLM 调用 + Prompt
│   │   │   ├── authService.js      # JWT + bcrypt
│   │   │   ├── kbService.js        # 知识库 CRUD + RAG 检索
│   │   │   ├── embeddingService.js # 文本向量化
│   │   │   ├── vectorStore.js      # MySQL 向量存储 + 余弦相似度
│   │   │   └── documentProcessor.js# 文档解析 + 分块
│   │   ├── middleware/auth.js # JWT 验证中间件
│   │   ├── models/database.js # MySQL 建表 + 连接池
│   │   └── utils/streamUtils.js# SSE 工具函数
│   └── tests/                 # 后端测试 (30 条)
│
├── travel-h5/                 # 前端
│   └── src/
│       ├── views/             # 页面
│       │   ├── Chat.vue       # AI 对话
│       │   ├── Home.vue       # 首页 + 旅游推荐
│       │   ├── Music.vue      # 音乐播放器 🎵
│       │   ├── Login.vue      # 登录/注册
│       │   ├── Detail.vue     # 行程详情
│       │   └── ...            # 历史、收藏、知识库等
│       ├── composables/       # 全局状态
│       │   └── usePlayer.js   # 音乐播放器单例
│       ├── utils/
│       │   ├── id3Parser.js   # ID3v2 标签解析（UTF-16/GBK/LRC）
│       │   ├── lyricsCache.js # 歌词 localStorage 缓存
│       │   └── request.js     # Axios 封装 + Token 刷新
│       ├── stores/            # Pinia 状态管理
│       └── __tests__/         # 前端测试 (27 条)
│
└── .claude/                   # Claude Code 配置
    ├── agents/                # 自定义 Agent（tester/quality/gitcommit）
    └── skills/                # 自定义技能（unit-test/security-audit）
```

---

## 🚀 快速启动

### 1. 环境要求

- Node.js 18+
- MySQL 8.0+
- 阿里云百炼 或 DeepSeek API Key

### 2. 配置

```bash
cd server
cp .env.example .env
# 编辑 .env 填入数据库密码和 API Key
```

### 3. 启动

```bash
# 后端
cd server
npm install
npm run dev

# 前端
cd travel-h5
npm install
npm run dev
```

前端 `http://localhost:5173` · 后端 `http://localhost:3000`

### 4. 测试

```bash
cd server && npm test      # 后端 30 条
cd travel-h5 && npm test   # 前端 27 条
```

---

## 🔒 安全

- ✅ SQL 注入防护 — 100% 参数化查询
- ✅ JWT 认证 + Refresh Token 撤销机制
- ✅ 密码 bcrypt 哈希 (cost=12)
- ✅ CORS 来源限制 + API 速率限制
- ✅ 文件上传类型过滤 + 大小限制
- ✅ 生产环境错误信息脱敏
- ✅ `.env` 已加入 `.gitignore`

[安全审计报告](.claude/skills/security-audit/SKILL.md)

---

## 📝 License

MIT
