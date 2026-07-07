import { describe, it, expect, beforeEach } from 'vitest'
import { getCachedLyrics, setCachedLyrics } from '../utils/lyricsCache.js'

describe('lyricsCache — 歌词本地缓存', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('setCachedLyrics() / getCachedLyrics()', () => {
    it('存储后应能读取歌词', () => {
      setCachedLyrics('周杰伦', '稻香', '[00:01.00]歌词内容', null)
      const cached = getCachedLyrics('周杰伦', '稻香')
      expect(cached).toBeTruthy()
      expect(cached.lyrics).toBe('[00:01.00]歌词内容')
    })

    it('存储后应能读取翻译', () => {
      setCachedLyrics('周杰伦', '稻香', '[00:01.00]lyrics', '中文翻译')
      const cached = getCachedLyrics('周杰伦', '稻香')
      expect(cached.translation).toBe('中文翻译')
    })

    it('未缓存时应返回 null', () => {
      const cached = getCachedLyrics('不存在的歌手', '不存在的歌')
      expect(cached).toBeNull()
    })

    it('应能覆盖已有缓存', () => {
      setCachedLyrics('歌手A', '歌曲A', '第一版歌词', null)
      setCachedLyrics('歌手A', '歌曲A', '第二版歌词', '新翻译')
      const cached = getCachedLyrics('歌手A', '歌曲A')
      expect(cached.lyrics).toBe('第二版歌词')
      expect(cached.translation).toBe('新翻译')
    })

    it('不同歌曲的缓存应独立', () => {
      setCachedLyrics('歌手A', '歌曲A', '歌词A', null)
      setCachedLyrics('歌手B', '歌曲B', '歌词B', null)

      const a = getCachedLyrics('歌手A', '歌曲A')
      const b = getCachedLyrics('歌手B', '歌曲B')
      expect(a.lyrics).toBe('歌词A')
      expect(b.lyrics).toBe('歌词B')
    })

    it('空字符串的艺术家和标题也应能缓存', () => {
      setCachedLyrics('', '', '无信息歌词', null)
      const cached = getCachedLyrics('', '')
      expect(cached).toBeTruthy()
      expect(cached.lyrics).toBe('无信息歌词')
    })
  })
})
