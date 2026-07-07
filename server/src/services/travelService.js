import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage } from '@langchain/core/messages'
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'

// ============================================================
//  LLM 提供商注册表 — 配置即用，运行时任意切换
// ============================================================

const PROVIDER_REGISTRY = {
  bailian: {
    name: '阿里云百炼',
    apiKeyEnv: 'BAILIAN_API_KEY',
    baseUrlEnv: 'BAILIAN_BASE_URL',
    modelEnv: 'BAILIAN_MODEL',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus'
  },
  deepseek: {
    name: 'DeepSeek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrlEnv: 'DEEPSEEK_BASE_URL',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat'
  }
}

function isProviderConfigured(providerKey) {
  const def = PROVIDER_REGISTRY[providerKey]
  if (!def) return false
  const apiKey = process.env[def.apiKeyEnv]
  return apiKey
    && !apiKey.startsWith('sk-your-')
}

export function getAvailableProviders() {
  return Object.entries(PROVIDER_REGISTRY)
    .filter(([key]) => isProviderConfigured(key))
    .map(([key, def]) => ({
      key,
      name: def.name,
      model: process.env[def.modelEnv] || def.defaultModel
    }))
}

function getDefaultProvider() {
  const configured = getAvailableProviders()
  if (configured.length === 0) return null
  const preferred = process.env.DEFAULT_PROVIDER
  if (preferred && configured.find(p => p.key === preferred)) return preferred
  return configured[0].key
}

function getLLM(providerKey, modelOverride) {
  const key = providerKey || getDefaultProvider()
  if (!key || !PROVIDER_REGISTRY[key]) {
    throw new Error('请先配置 API Key：复制 .env.example 为 .env，并填入至少一个提供商的 API Key')
  }
  if (!isProviderConfigured(key)) {
    throw new Error(`提供商「${PROVIDER_REGISTRY[key].name}」的 API Key 未配置，请检查 .env 文件`)
  }

  const def = PROVIDER_REGISTRY[key]
  const apiKey = process.env[def.apiKeyEnv]
  const baseURL = process.env[def.baseUrlEnv] || def.defaultBaseUrl
  const model = modelOverride || process.env[def.modelEnv] || def.defaultModel

  console.log(`🤖 使用模型: ${def.name} / ${model}`)

  return {
    llm: new ChatOpenAI({
      model,
      temperature: 0.7,
      apiKey,
      configuration: { baseURL }
    }),
    providerName: def.name,
    modelName: model
  }
}

// ============================================================
//  系统提示词（静态文本，用 SystemMessage 避免模板花括号冲突）
// ============================================================

const TRAVEL_SYSTEM_PROMPT = new SystemMessage(
  '你是一个专业的旅游规划师，擅长根据用户的需求生成详细的旅行行程。\n' +
  '\n' +
  '要求：\n' +
  '1. 每天的行程安排（上午、下午、晚上）\n' +
  '2. 每个景点的详细介绍\n' +
  '3. 交通方式+预估费用\n' +
  '4. 预算分配明细（住宿、餐饮、交通、门票、其他）\n' +
  '5. 注意事项\n' +
  '\n' +
  '请严格按照以下JSON格式输出（字段名不要改）：\n' +
  '{\n' +
  '  "success": true,\n' +
  '  "city": "城市名",\n' +
  '  "days": 天数,\n' +
  '  "totalBudget": 总预算（数字，不含单位）,\n' +
  '  "dailyItinerary": [{\n' +
  '    "day": 1,\n' +
  '    "date": "第1天",\n' +
  '    "morning": { "spot": "景点名", "duration": "建议游玩时长（如2小时）", "ticket": "门票价格（如30元或免费）", "transportation": "从上个景点到达方式+预估费用（如地铁3元、打车15元、步行）", "description": "景点简短介绍（50字内）" },\n' +
  '    "afternoon": { "spot": "景点名", "duration": "时长", "ticket": "票价", "transportation": "到达方式+预估费用", "description": "介绍" },\n' +
  '    "evening": { "spot": "活动名", "duration": "时长", "ticket": "费用", "transportation": "到达方式+预估费用", "description": "介绍" }\n' +
  '  }],\n' +
  '  "budgetBreakdown": {\n' +
  '    "accommodation": 住宿费（每天）,\n' +
  '    "food": 餐饮费（每天）,\n' +
  '    "transportation": 交通费（全部天数）,\n' +
  '    "tickets": 门票费（全部景点）,\n' +
  '    "other": 其他费\n' +
  '  },\n' +
  '  "tips": ["提示"],\n' +
  '  "warnings": ["注意事项"]\n' +
  '}\n' +
  '\n' +
  '注意：totalBudget必须是预算各项之和；各景点ticket费用之和等于budgetBreakdown.tickets；交通方式务必写明具体路线和预估金额；不要用markdown代码块包裹JSON。'
)

const CHAT_SYSTEM_PROMPT = new SystemMessage(
  '你是一个专业的旅游顾问助手，专门为用户解答各种旅游相关的问题。\n' +
  '你掌握丰富的旅游知识，包括：各地景点推荐和介绍、美食推荐、旅游攻略、交通出行建议、住宿推荐、旅行注意事项、旅行保险等。\n' +
  '\n' +
  '回答要求：\n' +
  '1. 回答要专业、详细、实用\n' +
  '2. 如果用户问的是具体城市，请结合当地实际情况回答\n' +
  '3. 回答要友好热情，像一位贴心的旅行顾问\n' +
  '4. 适当使用emoji让对话更生动'
)

// ============================================================
//  旅游推荐 & AI 对话服务
// ============================================================

export async function generateTravelRecommendation(city, budget, days, onChunk, provider, modelOverride) {
  const { llm, providerName } = getLLM(provider, modelOverride)

  onChunk(`[${providerName}] 正在为您规划${city}${days}天行程...\n`)

  const humanPrompt = HumanMessagePromptTemplate.fromTemplate(
    '目的地城市：{city}，预算：{budget}元，旅行天数：{days}天。请生成详细旅游规划。'
  )

  const chatPrompt = ChatPromptTemplate.fromMessages([TRAVEL_SYSTEM_PROMPT, humanPrompt])
  const formatted = await chatPrompt.formatMessages({ city, budget: String(budget), days: String(days) })

  let fullResponse = ''
  const stream = await llm.stream(formatted)

  for await (const chunk of stream) {
    const content = chunk.content
    if (content) {
      fullResponse += content
      onChunk(content)
    }
  }

  return fullResponse
}

export function parseRecommendationResponse(rawResponse) {
  try {
    let jsonStr = null
    const mdJsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/)
    const mdMatch = rawResponse.match(/```\n([\s\S]*?)\n```/)
    const objMatch = rawResponse.match(/\{[\s\S]*\}/)

    if (mdJsonMatch) jsonStr = mdJsonMatch[1]
    else if (mdMatch) jsonStr = mdMatch[1]
    else if (objMatch) jsonStr = objMatch[0]

    if (!jsonStr) throw new Error('未找到有效的 JSON 数据')
    return JSON.parse(jsonStr)
  } catch (err) {
    console.error('JSON 解析失败:', err.message)
    console.error('原始响应:', rawResponse.substring(0, 500))
    return null
  }
}

export async function chatWithAI(message, onChunk, provider, modelOverride) {
  const { llm } = getLLM(provider, modelOverride)

  // RAG 检索：从知识库中搜索相关内容
  let knowledgeContext = ''
  try {
    const { searchKnowledge } = await import('./kbService.js')
    const results = await searchKnowledge(message, 5)
    if (results.length > 0) {
      knowledgeContext = '\n\n【参考知识库内容】\n' +
        results.map((r, i) => `[${i + 1}] ${r.text}`).join('\n\n') +
        '\n\n请参考以上知识库内容回答用户问题。如果知识库没有相关内容，请用自己的知识回答。'
    }
  } catch {
    // 知识库不可用时静默跳过
  }

  // 构建带知识库上下文的消息
  const humanMsg = knowledgeContext
    ? `用户提问：${message}\n\n${knowledgeContext}`
    : message

  const humanPrompt = HumanMessagePromptTemplate.fromTemplate('{message}')
  const chatPrompt = ChatPromptTemplate.fromMessages([CHAT_SYSTEM_PROMPT, humanPrompt])
  const formatted = await chatPrompt.formatMessages({ message: humanMsg })

  let fullResponse = ''
  const stream = await llm.stream(formatted)

  for await (const chunk of stream) {
    const content = chunk.content
    if (content) {
      fullResponse += content
      onChunk(content)
    }
  }

  return fullResponse
}
