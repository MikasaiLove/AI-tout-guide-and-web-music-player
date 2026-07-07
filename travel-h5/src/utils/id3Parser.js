// 轻量 ID3v2 标签解析 — 提取封面图 + 歌词
// 支持 ID3v2.3 / v2.4

function readSynchSafe(buf, offset) {
  // ID3v2.4 synchsafe integer (7 bits per byte)
  return ((buf[offset] & 0x7f) << 21) | ((buf[offset + 1] & 0x7f) << 14) | ((buf[offset + 2] & 0x7f) << 7) | (buf[offset + 3] & 0x7f)
}

function readUint32BE(buf, offset) {
  return (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]
}

// ID3 编码字节 → TextDecoder 编码名
const ID3_ENC_MAP = { 0: 'iso-8859-1', 1: 'utf-16', 2: 'utf-16be', 3: 'utf-8' }

// 评分一个解码结果
function scoreText(text) {
  let score = 0, bad = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) ||
        (c >= 0xF900 && c <= 0xFAFF) ||
        (c >= 0x3040 && c <= 0x30FF) ||
        (c >= 0xAC00 && c <= 0xD7AF) ||
        (c >= 0xFF00 && c <= 0xFFEF)) score += 3
    else if ((c >= 0x20 && c <= 0x7E) || c === 0xA) score += 1
    else if (c === 0 || c === 0xFFFD || (c > 0 && c < 0x20 && c !== 0xA) || c >= 0xFFF0) bad += 2
  }
  return { score, bad, effective: score - bad }
}

// 用多种编码尝试解码，返回最优结果
// 优先按 ID3 标签声明的编码解码，只有声明的编码乱码时才回退到其他编码
function tryDecodings(slice, id3Encoding) {
  const fallbacks = ['utf-16', 'utf-8', 'gbk', 'gb18030', 'big5', 'shift_jis', 'euc-kr', 'iso-8859-1']

  // 如果 ID3 声明了编码，优先用声明的编码
  if (id3Encoding !== undefined && id3Encoding !== null) {
    const hintedEnc = ID3_ENC_MAP[id3Encoding]
    if (hintedEnc) {
      try {
        const text = new TextDecoder(hintedEnc).decode(slice).replace(/\x00/g, '').trim()
        const { bad } = scoreText(text)
        // 声明的编码如果乱码率低就直接采纳
        if (bad < text.length * 0.15 && text.length > 0) return text
      } catch {}
    }
    // 声明的编码解码失败 → 移到 fallback 最前面再试一轮
    if (hintedEnc && !fallbacks.includes(hintedEnc)) fallbacks.unshift(hintedEnc)
  }

  let best = '', bestScore = 0
  for (const enc of fallbacks) {
    try {
      const text = new TextDecoder(enc).decode(slice)
      const { score, bad, effective } = scoreText(text)
      if (effective > bestScore && bad < text.length * 0.2) {
        bestScore = effective
        best = text
      }
    } catch {}
  }
  return best || new TextDecoder('utf-8').decode(slice)
}

function readNullTerminated(buf, offset, encoding, frameEnd) {
  let end = offset
  const maxEnd = frameEnd || buf.length
  if (encoding === 1 || encoding === 2) {
    while (end < maxEnd - 1 && !(buf[end] === 0 && buf[end + 1] === 0)) end += 2
    if (end < maxEnd) end += 2 // skip the null terminator
  } else {
    while (end < maxEnd && buf[end] !== 0) end++
  }
  const slice = buf.slice(offset, Math.min(end, maxEnd))
  const result = tryDecodings(slice, encoding).replace(/\x00/g, '').trim()

  // 诊断日志：首次遇到乱码时输出
  if (result && /[^\x20-\x7E一-鿿㐀-䶿぀-ヿ가-힯＀-￯\r\n\t]/.test(result)) {
    console.warn('[ID3] 编码诊断: encoding=' + encoding +
      ' 前20字节=[' + Array.from(slice.slice(0, 20)).map(b => b.toString(16).padStart(2,'0')).join(' ') + ']' +
      ' 结果=[' + result.slice(0, 30) + ']')
  }

  return result
}

/**
 * 从音频文件 ArrayBuffer 提取 ID3v2 元数据
 * @returns {{ title: string, artist: string, album: string, cover: string|null, lyrics: string|null }}
 */
export function parseID3(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer)
  const result = { title: '', artist: '', album: '', cover: null, lyrics: null, translation: null }

  // 检查 ID3v2 头
  if (buf.length < 10) return result
  const header = String.fromCharCode(buf[0], buf[1], buf[2])
  if (header !== 'ID3') return result

  const version = buf[3]
  const flags = buf[4]
  const hasFooter = !!(flags & 0x10) // ID3v2.4 footer flag

  // 计算总标签大小
  let totalSize
  if (version >= 4) {
    totalSize = readSynchSafe(buf, 6) + 10
  } else {
    totalSize = readUint32BE(buf, 6) + 10
  }
  if (hasFooter) totalSize += 10
  if (totalSize > buf.length) totalSize = buf.length

  // 跳过扩展头
  let offset = 10
  if (flags & 0x40) {
    // Extended header present
    if (offset + 4 > buf.length) return result
    const extSize = readSynchSafe(buf, offset)
    offset += 4 + extSize
  }

  // 遍历帧
  while (offset + 10 <= totalSize) {
    const frameId = String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3])
    offset += 4

    // 遇到 padding（全0）则停止
    if (frameId === '\x00\x00\x00\x00' || buf[offset - 4] === 0) break
    // 只处理大写 ASCII 帧 ID
    if (!/^[A-Z0-9]{4}$/.test(frameId)) { offset -= 4; break }

    let frameSize
    if (version >= 4) {
      frameSize = readSynchSafe(buf, offset)
    } else {
      frameSize = readUint32BE(buf, offset)
    }
    offset += 4

    const frameFlags = (buf[offset] << 8) | buf[offset + 1]
    offset += 2

    if (frameSize <= 0 || offset + frameSize > buf.length) break

    // --- APIC: 专辑封面 ---
    if (frameId === 'APIC' && frameSize > 10) {
      try {
        const enc = buf[offset]        // text encoding
        const mimeEnd = buf.indexOf(0, offset + 1)
        const mime = String.fromCharCode(...buf.slice(offset + 1, mimeEnd)).toLowerCase()
        const picType = buf[mimeEnd + 1]
        // skip description (null-terminated)
        let descEnd = mimeEnd + 2
        if (enc === 1 || enc === 2) {
          while (descEnd < offset + frameSize - 1 && !(buf[descEnd] === 0 && buf[descEnd + 1] === 0)) descEnd += 2
          descEnd += 2
        } else {
          while (descEnd < offset + frameSize && buf[descEnd] !== 0) descEnd++
          descEnd++
        }
        const imgData = buf.slice(descEnd, offset + frameSize)
        const blob = new Blob([imgData], { type: mime || 'image/jpeg' })
        result.cover = URL.createObjectURL(blob)
      } catch {}
    }

    // --- TIT2: 标题 ---
    if (frameId === 'TIT2' && frameSize > 1 && !result.title) {
      result.title = readNullTerminated(buf, offset + 1, buf[offset], offset + frameSize)
    }

    // --- TPE1: 艺术家 ---
    if (frameId === 'TPE1' && frameSize > 1 && !result.artist) {
      result.artist = readNullTerminated(buf, offset + 1, buf[offset], offset + frameSize)
    }

    // --- TALB: 专辑 ---
    if (frameId === 'TALB' && frameSize > 1 && !result.album) {
      result.album = readNullTerminated(buf, offset + 1, buf[offset], offset + frameSize)
    }

    // --- USLT: 歌词 (unsynchronized lyrics) ---
    if (frameId === 'USLT' && frameSize > 6) {
      try {
        const enc = buf[offset]
        // 跳过 encoding(1) + language(3) + content descriptor(null-terminated)
        let descEnd = offset + 4
        if (enc === 1 || enc === 2) {
          while (descEnd < offset + frameSize - 1 && !(buf[descEnd] === 0 && buf[descEnd + 1] === 0)) descEnd += 2
          descEnd += 2
        } else {
          while (descEnd < offset + frameSize && buf[descEnd] !== 0) descEnd++
          descEnd++
        }
        const raw = buf.slice(descEnd, offset + frameSize)
        const text = tryDecodings(raw, enc).replace(/\x00/g, '').trim()
        if (text && text.length > 10) {
          // 检查是否为 LRC 格式（MusicTag 可能把 LRC 存进 USLT）
          if (/\[\d{2}:\d{2}[.:]\d{2}\]/.test(text)) {
            if (!result.lyrics) result.lyrics = text // LRC 优先
          } else if (!result.lyrics) {
            result.lyrics = text // 纯文本兜底
          }
          // 第二个 USLT 帧可能是翻译（MusicTag 双歌词）
          if (result.lyrics && text !== result.lyrics && !result.translation) {
            result.translation = text
          }
        }
      } catch {}
    }

    // --- SYLT: 同步歌词 ---
    if (frameId === 'SYLT' && frameSize > 8 && !result.lyrics) {
      try {
        const enc = buf[offset]
        let descEnd = offset + 6
        if (enc === 1 || enc === 2) {
          while (descEnd < offset + frameSize - 1 && !(buf[descEnd] === 0 && buf[descEnd + 1] === 0)) descEnd += 2
          descEnd += 2
        } else {
          while (descEnd < offset + frameSize && buf[descEnd] !== 0) descEnd++
          descEnd++
        }
        const raw = buf.slice(descEnd, offset + frameSize)
        const text = tryDecodings(raw, enc).replace(/\x00/g, '').trim()
        if (text && text.length > 10) result.lyrics = text
      } catch {}
    }

    offset += frameSize
  }

  return result
}
