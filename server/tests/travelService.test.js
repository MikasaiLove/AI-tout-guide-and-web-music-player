import { describe, it, expect } from 'vitest'
import { parseRecommendationResponse } from '../src/services/travelService.js'

describe('travelService — JSON 解析', () => {
  describe('parseRecommendationResponse()', () => {
    it('应正确解析标准 JSON', () => {
      const json = '{"success":true,"city":"北京","days":3,"totalBudget":3000}'
      const result = parseRecommendationResponse(json)
      expect(result).not.toBeNull()
      expect(result.success).toBe(true)
      expect(result.city).toBe('北京')
    })

    it('应正确解析 markdown 代码块包裹的 JSON', () => {
      const md = '```json\n{"success":true,"city":"成都"}\n```'
      const result = parseRecommendationResponse(md)
      expect(result.city).toBe('成都')
    })

    it('应正确解析无语言标记的代码块', () => {
      const md = '```\n{"success":true,"city":"杭州"}\n```'
      const result = parseRecommendationResponse(md)
      expect(result.city).toBe('杭州')
    })

    it('应从混合文本中提取 JSON 对象', () => {
      const text = '以下是您的行程：{"success":true,"city":"北京","days":3}，祝您旅途愉快！'
      const result = parseRecommendationResponse(text)
      expect(result.city).toBe('北京')
    })

    it('无效数据应返回 null', () => {
      const result = parseRecommendationResponse('这不是 JSON')
      expect(result).toBeNull()
    })

    it('不完整 JSON 应返回 null', () => {
      const result = parseRecommendationResponse('{"success":true,"city":')
      expect(result).toBeNull()
    })
  })
})
