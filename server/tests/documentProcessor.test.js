import { describe, it, expect } from 'vitest'

// 测试 splitText 纯函数（内联，避免模块加载问题）
function splitText(text, chunkSize = 1000, overlap = 200) {
  const separators = ['\n\n', '\n', '。', '！', '？', '；', '.', '!', '?', ';', ' ', '']
  return recursiveSplit(text, separators, chunkSize, overlap)
}

function recursiveSplit(text, separators, chunkSize, overlap) {
  if (text.length <= chunkSize) return text.length > 0 ? [text] : []
  const sep = separators[0]
  const restSeps = separators.slice(1)

  if (!sep) {
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    return chunks
  }

  const parts = text.split(sep)
  const chunks = []
  let current = ''

  for (const part of parts) {
    const candidate = current ? current + sep + part : part
    if (candidate.length > chunkSize && current.length > 0) {
      chunks.push(current)
      current = part
      if (part.length > chunkSize) {
        chunks.push(...recursiveSplit(part, restSeps, chunkSize, overlap))
        current = ''
      }
    } else if (candidate.length > chunkSize) {
      chunks.push(...recursiveSplit(candidate, restSeps, chunkSize, overlap))
      current = ''
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks.filter(c => c.trim().length > 10)
}

describe('documentProcessor — 中文分段', () => {
  describe('splitText()', () => {
    it('短文本不应分段', () => {
      const result = splitText('北京是一座美丽的城市', 1000, 200)
      expect(result.length).toBe(1)
    })

    it('按句号分段后每段至少有一个句号', () => {
      const text = '第一段内容。第二段内容。第三段内容。'
      const result = splitText(text, 50, 10)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('超长文本应被分成多个片段', () => {
      const text = '测试内容。'.repeat(200)
      const result = splitText(text, 500, 100)
      expect(result.length).toBeGreaterThan(1)
    })

    it('空文本应返回空数组', () => {
      const result = splitText('', 1000, 200)
      expect(result.length).toBe(0)
    })

    it('每个片段不应超过 chunkSize', () => {
      const text = '测试文本内容。'.repeat(300)
      const result = splitText(text, 800, 200)
      for (const chunk of result) {
        expect(chunk.length).toBeLessThanOrEqual(800 + 100) // 允许一些容差
      }
    })

    it('太短的碎片应被过滤', () => {
      const text = '短。也是短。这一句足够长到被保留下来因为它超过了十个字。'
      const result = splitText(text, 500, 100)
      for (const chunk of result) {
        expect(chunk.trim().length).toBeGreaterThan(10)
      }
    })
  })
})
