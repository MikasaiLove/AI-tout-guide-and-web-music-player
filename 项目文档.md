# 智能旅游助手系统

## 1. 项目概述

智能旅游助手系统是一个基于 AI 技术的旅游规划平台，旨在为用户提供个性化的旅游行程推荐和实时旅游咨询服务。系统通过结合大语言模型的智能分析能力，为用户生成符合预算和时间要求的详细旅游规划，并提供实时的旅游问答服务。

### 主要功能
- 智能旅游规划：根据用户输入的目的地、预算和天数，生成详细的行程安排
- AI 旅游咨询：提供实时的旅游相关问答服务
- 流式响应：实时显示 AI 生成内容，提升用户体验
- 移动端适配：响应式设计，完美适配手机屏幕

### 主要环境

**node版本 v24.12.0**

**node.js** https://nodejs.org/zh-cn/download

**Vant(Vue3版本)** https://vant.pro/vant/#/zh-CN

**硅基流动** https://www.siliconflow.cn/

**DeepSeek** https://www.deepseek.com/

**编辑器（Trae AI IDE）**https://www.trae.cn/

**vite**: https://vitejs.cn/vite6-cn/guide/

**apifox** https://apifox.com/index.html

**express** https://www.expressjs.com.cn/

## 2. 技术栈

### 后端技术
- **Node.js** (ESM 模块)
- **Express.js**：Web 服务器框架
- **LangChain.js**：大语言模型集成框架
  - @langchain/openai
  - @langchain/core
- **大模型接口**：硅基流动、DeepSeek
- **流式响应**：SSE (Server-Sent Events) 技术

### 前端技术
- **Vue 3** + **Composition API**：前端框架
- **Vant UI 4.x**：移动端 UI 组件库
- **Vue Router 4.x**：路由管理
- **Pinia**：状态管理
- **Axios**：HTTP 请求
- **Vite**：构建工具

## 3. 项目结构

### 后端结构
```
server/
├── src/
│   ├── routes/
│   │   └── travel.js          # 旅游推荐API路由
│   ├── services/
│   │   └── travelService.js   # LangChain智能推荐服务
│   ├── utils/
│   │   └── streamUtils.js     # 流式响应工具
│   └── index.js               # 主入口文件
├── .env                       # 环境变量配置
├── .env.example               # 环境变量配置示例
├── package.json              # 项目配置文件
└── README.md                 # 项目说明文档
```

### 前端结构
```
travel-h5/
├── src/
│   ├── views/                 # 页面组件
│   │   ├── Home.vue          # 首页（城市选择、预算、天数）
│   │   ├── Detail.vue        # 详情页（行程展示）
│   │   ├── Chat.vue          # AI 对话页面
│   │   └── Profile.vue       # 我的页面
│   ├── components/           # 业务组件
│   │   ├── SpotItem.vue      # 景点信息组件
│   │   ├── BudgetTable.vue   # 预算明细组件
│   │   └── ChatBubble.vue    # 聊天气泡组件
│   ├── router/
│   │   └── index.js          # 路由配置
│   ├── stores/
│   │   └── chat.js           # 聊天状态管理
│   ├── utils/
│   │   └── request.js        # HTTP请求工具
│   ├── styles/
│   │   └── common.css        # 公共样式
│   ├── App.vue               # 根组件
│   └── main.js               # 入口文件
├── .env                       # 环境变量
├── vite.config.js             # Vite配置
├── package.json              # 依赖配置
└── index.html                # HTML模板
```

## 4. 核心功能

### 4.1 智能旅游规划
- **功能描述**：根据用户输入的目的地、预算和天数，生成详细的行程安排
- **技术实现**：
  - 后端：使用 LangChain 构建提示词，调用大语言模型生成结构化的旅游规划
  - 前端：表单输入 → 提交请求 → 流式接收响应 → 实时渲染行程

### 4.2 AI 旅游咨询
- **功能描述**：提供实时的旅游相关问答服务，支持流式响应
- **技术实现**：
  - 后端：使用 LangChain 构建对话上下文，调用大语言模型生成回复
  - 前端：消息输入 → 提交请求 → 流式接收响应 → 实时显示回复

### 4.3 流式响应
- **功能描述**：实时显示 AI 生成内容，提升用户体验
- **技术实现**：
  - 后端：使用 SSE (Server-Sent Events) 技术发送流式数据
  - 前端：使用 Fetch API 读取流式响应，实现打字机效果

## 5. API 接口

### 5.1 健康检查
- **路径**：`GET /api/health`
- **功能**：检查服务是否正常运行
- **响应**：
  ```json
  {
    "success": true,
    "message": "服务运行正常",
    "timestamp": "2024-01-01T00:00:00Z",
    "modelProvider": "硅基流动"
  }
  ```

### 5.2 智能推荐（流式）
- **路径**：`POST /api/travel/recommend`
- **功能**：根据城市、预算和天数生成旅游规划
- **请求参数**：
  ```json
  {
    "city": "北京",
    "budget": 5000,
    "days": 3
  }
  ```
- **响应格式**：SSE 流式响应
  ```
  data: {"type": "chunk", "content": "正在生成旅游规划..."}
  data: {"type": "complete", "data": {...}}
  ```

### 5.3 AI 对话（流式）
- **路径**：`POST /api/travel/chat`
- **功能**：提供旅游相关的 AI 问答服务
- **请求参数**：
  ```json
  {
    "message": "北京有哪些好吃的？"
  }
  ```
- **响应格式**：SSE 流式响应
  ```
  data: {"type": "chunk", "content": "北京的美食有很多..."}
  data: {"type": "complete", "data": {"success": true, "reply": "北京的美食有很多..."}}
  ```

## 6. 前端功能

### 6.1 首页
- **功能**：城市选择、预算输入、天数选择、热门目的地推荐
- **组件**：城市选择器、数字输入框、天数选择器、按钮、网格布局
- **交互**：填写表单 → 点击"开始规划" → 跳转详情页

### 6.2 详情页
- **功能**：行程概览、每日行程展示、预算明细、温馨提示
- **组件**：导航栏、折叠面板、列表、表格、按钮
- **交互**：查看行程 → 点击"咨询 AI" → 跳转对话页

### 6.3 对话页
- **功能**：AI 聊天、流式响应、快捷问题
- **组件**：导航栏、聊天气泡、输入框、按钮、标签
- **交互**：输入消息 → 发送 → 实时显示 AI 回复

### 6.4 我的页面
- **功能**：个人中心、功能菜单、关于我们
- **组件**：导航栏、列表、图片、对话框
- **交互**：点击菜单 → 显示对应功能

## 7. 安装和运行

### 7.1 后端安装和运行
1. **安装依赖**
   ```bash
   cd server
   npm install
   ```

2. **配置环境变量**
   - 复制 `.env.example` 为 `.env`
   - 填写 API 密钥和模型配置

3. **启动服务**
   ```bash
   npm run dev
   ```
   - 服务运行在 `http://localhost:3000`

### 7.2 前端安装和运行
1. **安装依赖**
   ```bash
   cd travel-h5
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   - 服务运行在 `http://localhost:5174`

## 8. 特色亮点

1. **智能推荐**：基于大语言模型的智能旅游规划，提供个性化的行程安排
2. **流式响应**：实时显示 AI 生成内容，提升用户体验
3. **多模型支持**：可切换不同的大语言模型提供商
4. **移动端友好**：完全适配手机屏幕，操作便捷
5. **模块化设计**：代码结构清晰，易于维护和扩展
6. **完善的错误处理**：前后端均有完善的错误处理机制
7. **实时 AI 对话**：提供即时的旅游咨询服务

## 9. 技术实现细节

### 9.1 后端实现
- **LangChain 集成**：使用 LangChain.js 构建提示词和对话上下文
- **流式响应**：使用 SSE 技术实现流式数据传输
- **错误处理**：完善的错误捕获和处理机制
- **多模型支持**：通过环境变量配置不同的大模型提供商

### 9.2 前端实现
- **Vue 3 Composition API**：使用最新的 Vue 3 特性
- **Vant UI**：移动端友好的 UI 组件库
- **流式处理**：使用 Fetch API 处理 SSE 流式响应
- **状态管理**：使用 Pinia 管理聊天状态
- **路由管理**：使用 Vue Router 实现页面导航

### 旅游地点推荐
```js
[
  '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
  '南京', '武汉', '苏州', '长沙', '天津', '郑州', '济南', '青岛',
  '大连', '沈阳', '哈尔滨', '长春', '福州', '厦门', '南昌', '合肥',
  '昆明', '贵阳', '南宁', '桂林', '海口', '三亚', '丽江', '大理',
  '西安', '兰州', '乌鲁木齐', '拉萨', '呼和浩特', '太原', '石家庄'
]
```

### 旅游地点推荐提示词
```js
`你是一个专业的旅游规划师，擅长根据用户的需求生成详细的旅行行程。

请根据以下信息为用户生成一份详细的旅游规划：
- 目的地城市：${city}
- 预算：${budget}元
- 旅行天数：${days}天

要求：
1. 每天的行程安排（上午、下午、晚上）
2. 每个景点的详细介绍
3. 交通建议
4. 预算分配明细
5. 注意事项

请以JSON格式输出，结构如下：
{
  "success": true,
  "city": "城市名",
  "days": 天数,
  "totalBudget": 总预算,
  "dailyItinerary": [
    {
      "day": 1,
      "date": "第1天",
      "morning": {
        "spot": "景点名称",
        "duration": "游览时长",
        "ticket": "门票价格",
        "transportation": "交通方式",
        "description": "景点介绍"
      },
      "afternoon": {
        "spot": "景点名称",
        "duration": "游览时长",
        "ticket": "门票价格",
        "transportation": "交通方式",
        "description": "景点介绍"
      },
      "evening": {
        "spot": "活动名称",
        "duration": "活动时长",
        "ticket": "费用",
        "transportation": "交通方式",
        "description": "活动介绍"
      }
    }
  ],
  "budgetBreakdown": {
    "accommodation": 住宿费用,
    "food": 餐饮费用,
    "transportation": 交通费用,
    "tickets": 门票费用,
    "other": 其他费用
  },
  "tips": ["提示1", "提示2", "提示3"],
  "warnings": ["注意事项1", "注意事项2"]
}

请确保JSON格式正确，可以被解析。`
```

### 处理大模型返回数据
```js
fullResponse.match(/```json\n([\s\S]*?)\n```/) ||
fullResponse.match(/```\n([\s\S]*?)\n```/) ||
fullResponse.match(/\{[\s\S]*\}/);
```

### 推荐景点问题
```js
[
  '北京有哪些必去的景点？',
  '上海美食推荐',
  '成都三日游攻略',
  '如何选择旅行保险？'
]
```

### Profile页面
```html
<template>
  <div class="profile-container">
    <van-nav-bar 
      title="我的" 
      left-text="" 
      left-arrow="false"
    />
    
    <!-- 用户信息区域 -->
    <div class="user-info">
      <van-image 
        :src="userAvatar" 
        round 
        class="avatar"
      />
      <div class="user-details">
        <h2 class="user-name">{{ userName }}</h2>
        <p class="user-desc">欢迎使用智能旅游助手</p>
      </div>
    </div>
    
    <!-- 功能菜单 -->
    <div class="menu-section">
      <h3 class="menu-title">我的服务</h3>
      <van-cell-group>
        <van-cell 
          title="我的收藏" 
          is-link 
          :icon="'star-o'"
          @click="showToast('功能开发中')"
        />
        <van-cell 
          title="历史记录" 
          is-link 
          :icon="'history'"
          @click="showToast('功能开发中')"
        />
        <van-cell 
          title="设置" 
          is-link 
          :icon="'settings'"
          @click="showToast('功能开发中')"
        />
      </van-cell-group>
    </div>
    
    <!-- 关于我们 -->
    <div class="menu-section">
      <h3 class="menu-title">关于</h3>
      <van-cell-group>
        <van-cell 
          title="关于我们" 
          is-link 
          @click="showAboutDialog"
        />
        <van-cell 
          title="版本信息" 
          value="v1.0.0"
        />
      </van-cell-group>
    </div>
    
    <!-- 关于我们对话框 -->
    <van-dialog 
      v-model:show="aboutDialogVisible" 
      title="关于我们"
      show-cancel-button
    >
      <div class="about-content">
        <p>智能旅游助手 v1.0.0</p>
        <p class="mt-2">基于 AI 技术的智能旅游规划平台</p>
        <p class="mt-2">为您提供个性化的旅游行程推荐和实时旅游咨询服务</p>
        <p class="mt-4 text-center">© 2024 智能旅游助手</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'

// 用户信息
const userAvatar = 'https://img.yzcdn.cn/vant/cat.jpeg'
const userName = '游客'

// 对话框状态
const aboutDialogVisible = ref(false)

// 显示关于我们对话框
const showAboutDialog = () => {
  aboutDialogVisible.value = true
}
</script>

<style scoped>
.profile-container {
  padding-bottom: 50px;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 30px 20px;
  background: linear-gradient(135deg, #1989fa 0%, #36cbcb 100%);
  color: white;
}

.avatar {
  width: 80px;
  height: 80px;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.user-details {
  margin-left: 20px;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 5px;
}

.user-desc {
  font-size: 14px;
  opacity: 0.9;
}

.menu-section {
  margin-top: 15px;
  background-color: white;
  border-radius: 12px;
  margin: 15px 10px 0;
  overflow: hidden;
}

.menu-title {
  font-size: 14px;
  color: #646566;
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.about-content {
  text-align: center;
  line-height: 1.6;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.text-center {
  text-align: center;
}
</style>
```