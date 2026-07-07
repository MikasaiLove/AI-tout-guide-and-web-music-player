import { describe, it, expect } from 'vitest'
import { parseID3 } from '../utils/id3Parser.js'

// 辅助函数：构建最小 ID3v2.4 标签的 ArrayBuffer
function buildID3Buffer(frames) {
  // frames: Array of { id: 'TIT2', encoding: 0, text: 'Hello' }
  // encoding: 0=ISO-8859-1, 1=UTF-16 (with BOM), 3=UTF-8

  let framesData = []
  for (const f of frames) {
    const encoder = f.encoding === 1
      ? new TextEncoder() // 实际 ID3 用 UTF-16, 这里简化用 UTF-8 测试
      : new TextEncoder()

    let data
    if (f.id === 'APIC') {
      // 构造封面: encoding(1) + mime(10) + '\x00' + picType(1) + description(1) + image data
      const mime = 'image/jpeg'
      const imgBytes = f.imageData || new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4]) // 最小 JPEG
      data = new Uint8Array(1 + mime.length + 1 + 1 + 1 + imgBytes.length)
      data[0] = 0 // encoding: ISO-8859-1
      let pos = 1
      for (let i = 0; i < mime.length; i++) data[pos++] = mime.charCodeAt(i)
      data[pos++] = 0 // null terminator
      data[pos++] = 3 // picType: cover (front)
      data[pos++] = 0 // description null
      data.set(imgBytes, pos)
    } else if (f.id === 'USLT') {
      const enc = f.encoding || 0
      const desc = new TextEncoder().encode(f.descriptor || '')
      const lyrics = new TextEncoder().encode(f.text || '')
      data = new Uint8Array(1 + 3 + desc.length + 1 + lyrics.length)
      data[0] = enc
      data[1] = 'e'.charCodeAt(0); data[2] = 'n'.charCodeAt(0); data[3] = 'g'.charCodeAt(0) // language
      let pos = 4
      data.set(desc, pos); pos += desc.length
      data[pos++] = 0 // null terminator
      data.set(lyrics, pos)
    } else {
      // Text frames: TIT2, TPE1, TALB
      const enc = f.encoding || 0
      const textBytes = encoder.encode(f.text || '')
      data = new Uint8Array(1 + textBytes.length)
      data[0] = enc
      data.set(textBytes, 1)
    }

    // Frame header: ID(4) + size(4, synchsafe) + flags(2)
    const size = data.length
    const synchSafe = [
      (size >> 21) & 0x7F,
      (size >> 14) & 0x7F,
      (size >> 7) & 0x7F,
      size & 0x7F
    ]
    const header = new Uint8Array(10)
    for (let i = 0; i < 4; i++) header[i] = f.id.charCodeAt(i)
    header[4] = synchSafe[0]; header[5] = synchSafe[1]; header[6] = synchSafe[2]; header[7] = synchSafe[3]
    header[8] = 0; header[9] = 0 // flags

    framesData.push(header, data)
  }

  // 计算总大小
  let totalFrameBytes = 0
  for (const f of framesData) totalFrameBytes += f.length

  // ID3v2.4 header: 'ID3'(3) + version(2) + flags(1) + size(4, synchsafe) = 10 bytes
  const synchSafeTotal = [
    (totalFrameBytes >> 21) & 0x7F,
    (totalFrameBytes >> 14) & 0x7F,
    (totalFrameBytes >> 7) & 0x7F,
    totalFrameBytes & 0x7F
  ]
  const id3Header = new Uint8Array(10)
  id3Header[0] = 'I'.charCodeAt(0); id3Header[1] = 'D'.charCodeAt(0); id3Header[2] = '3'.charCodeAt(0)
  id3Header[3] = 4 // version 2.4
  id3Header[4] = 0 // flags
  id3Header[5] = synchSafeTotal[0]
  id3Header[6] = synchSafeTotal[1]
  id3Header[7] = synchSafeTotal[2]
  id3Header[8] = synchSafeTotal[3]
  id3Header[9] = 0

  // 合并所有
  const all = new Uint8Array(10 + totalFrameBytes)
  all.set(id3Header, 0)
  let offset = 10
  for (const f of framesData) {
    all.set(f, offset)
    offset += f.length
  }

  return all.buffer
}

describe('id3Parser — ID3v2 标签解析', () => {
  describe('parseID3()', () => {
    it('非 ID3 数据应返回空结果', () => {
      const buf = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer
      const result = parseID3(buf)
      expect(result.title).toBe('')
      expect(result.artist).toBe('')
      expect(result.album).toBe('')
      expect(result.cover).toBeNull()
      expect(result.lyrics).toBeNull()
    })

    it('数据太短应返回空结果', () => {
      const buf = new Uint8Array([0x49, 0x44, 0x33]).buffer // 只有 'ID3' 不够
      const result = parseID3(buf)
      expect(result.title).toBe('')
    })

    it('应解析 TIT2 标题帧', () => {
      const buf = buildID3Buffer([
        { id: 'TIT2', encoding: 0, text: 'Test Song' }
      ])
      const result = parseID3(buf)
      expect(result.title).toBe('Test Song')
    })

    it('应解析 TPE1 艺术家帧', () => {
      const buf = buildID3Buffer([
        { id: 'TPE1', encoding: 0, text: 'Test Artist' }
      ])
      const result = parseID3(buf)
      expect(result.artist).toBe('Test Artist')
    })

    it('应解析 TALB 专辑帧', () => {
      const buf = buildID3Buffer([
        { id: 'TALB', encoding: 0, text: 'Test Album' }
      ])
      const result = parseID3(buf)
      expect(result.album).toBe('Test Album')
    })

    it('应同时解析标题、艺术家和专辑', () => {
      const buf = buildID3Buffer([
        { id: 'TIT2', encoding: 3, text: '稻香' },
        { id: 'TPE1', encoding: 3, text: '周杰伦' },
        { id: 'TALB', encoding: 3, text: '魔杰座' }
      ])
      const result = parseID3(buf)
      expect(result.title).toBe('稻香')
      expect(result.artist).toBe('周杰伦')
      expect(result.album).toBe('魔杰座')
    })

    it('应解析 USLT LRC 歌词', () => {
      const lrc = '[00:01.00]第一句歌词\n[00:05.00]第二句歌词'
      const buf = buildID3Buffer([
        { id: 'USLT', encoding: 3, text: lrc }
      ])
      const result = parseID3(buf)
      expect(result.lyrics).toBe(lrc)
    })

    it('过短的 USLT 文本应被忽略', () => {
      const buf = buildID3Buffer([
        { id: 'USLT', encoding: 0, text: 'short' } // < 10 chars
      ])
      const result = parseID3(buf)
      expect(result.lyrics).toBeNull()
    })
  })
})
