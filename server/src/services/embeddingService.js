/**
 * 向量嵌入服务 — 调用百炼 DashScope 兼容 OpenAI 的 embeddings API
 */
const EMBEDDING_MODEL = 'text-embedding-v3'

// 获取百炼的 API 配置
function getEmbeddingConfig() {
  const apiKey = process.env.BAILIAN_API_KEY
  const baseURL = process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'

  if (!apiKey || apiKey.startsWith('sk-your-')) {
    throw new Error('百炼 API Key 未配置，无法生成向量嵌入')
  }

  return { apiKey, baseURL }
}

/**
 * 将文本数组转为向量
 * @param {string[]} texts - 待嵌入的文本列表
 * @returns {Promise<number[][]>} - 向量数组
 */
export async function embedTexts(texts) {
  const { apiKey, baseURL } = getEmbeddingConfig()

  const response = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Embedding API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  // 按 index 排序确保顺序正确
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding)
}

/**
 * 将单个文本转为向量
 */
export async function embedText(text) {
  const results = await embedTexts([text])
  return results[0]
}
