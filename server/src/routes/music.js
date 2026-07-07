import { Router } from 'express'
import { Converter } from 'opencc-js'
import { getPool } from '../models/database.js'

let converter = null
function getConverter() {
  if (!converter) converter = Converter({ from: 'tw', to: 'cn' })
  return converter
}

function toSimplified(text) {
  try { return getConverter()(text) } catch { return text }
}

function isForeign(text) {
  let chinese = 0, total = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) chinese++
    if (ch !== ' ' && ch !== '\n' && ch !== '\r') total++
  }
  return total > 0 && chinese / total < 0.3
}

async function translateToChinese(text) {
  try {
    const snippet = text.slice(0, 500)
    let src = 'en'
    let ja = 0, ko = 0
    for (const ch of text.slice(0, 200)) {
      const code = ch.charCodeAt(0)
      if (code >= 0x3040 && code <= 0x30FF) ja++
      if (code >= 0xAC00 && code <= 0xD7AF) ko++
    }
    if (ja > 5) src = 'ja'
    else if (ko > 5) src = 'ko'
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(snippet)}&langpair=${src}|zh-CN`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const data = await resp.json()
    return data.responseData?.translatedText || null
  } catch { return null }
}

function stripLrcTimestamps(lrcText) {
  if (!lrcText) return null
  const lines = lrcText
    .split('\n')
    .map(l => l.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim())
    .filter(Boolean)
  return lines.length > 0 ? lines.join('\n') : null
}

const router = Router()

router.get('/lyrics', async (req, res) => {
  try {
    const { artist, title, duration: durationStr } = req.query
    if (!title) return res.status(400).json({ success: false, message: '缺少歌曲名' })

    const searchArtist = (artist || '').trim()
    const localDuration = parseInt(durationStr) || 0

    // ===== 1）查数据库缓存 =====
    const pool = getPool()
    let rows = []
    if (localDuration > 0) {
      // 精确匹配：歌手 + 歌名 + 时长（±3秒）
      ;[rows] = await pool.execute(
        'SELECT lrc_text, plain_text, translation FROM song_lyrics WHERE artist = ? AND title = ? AND ABS(duration - ?) <= 3 LIMIT 1',
        [searchArtist, title, localDuration]
      )
    }
    if (!rows.length) {
      // 宽松匹配：歌手 + 歌名
      ;[rows] = await pool.execute(
        'SELECT lrc_text, plain_text, translation FROM song_lyrics WHERE artist = ? AND title = ? LIMIT 1',
        [searchArtist, title]
      )
    }
    if (rows.length) {
      const row = rows[0]
      const lyrics = row.lrc_text || row.plain_text
      if (lyrics) {
        return res.json({ success: true, lyrics, translation: row.translation || null, source: 'database' })
      }
    }

    // ===== 2）lrclib 搜索 =====
    let foundLrc = null, foundPlain = null

    const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(searchArtist)}&track_name=${encodeURIComponent(title)}`
    const getResp = await fetch(getUrl, { headers: { 'User-Agent': 'TravelApp/1.0' } })

    if (getResp.ok) {
      const data = await getResp.json()
      foundLrc = data.syncedLyrics || null
      foundPlain = data.plainLyrics || null

      // 没有 LRC，搜索同名歌曲的其他版本
      if (!foundLrc && foundPlain) {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchArtist + ' ' + title)}`
        try {
          const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'TravelApp/1.0' } })
          if (searchResp.ok) {
            const results = await searchResp.json()
            const lrcMatch = results.find(r => r.syncedLyrics)
            if (lrcMatch) foundLrc = lrcMatch.syncedLyrics
          }
        } catch {}
      }
    } else {
      // 精确匹配失败，lrclib 搜索
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchArtist + ' ' + title)}`
      const searchResp = await fetch(searchUrl, { headers: { 'User-Agent': 'TravelApp/1.0' } })
      if (searchResp.ok) {
        const results = await searchResp.json()
        if (results.length) {
          const best = results.find(r => r.syncedLyrics) || results[0]
          foundLrc = best.syncedLyrics || null
          foundPlain = best.plainLyrics || null
        }
      }
    }

    // ===== 3）存入数据库 =====
    const rawLyrics = foundLrc || foundPlain
    if (rawLyrics) {
      try {
        await pool.execute(
          'INSERT INTO song_lyrics (artist, title, duration, lrc_text, plain_text, translation, source) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE lrc_text = VALUES(lrc_text), plain_text = VALUES(plain_text), translation = VALUES(translation)',
          [
            searchArtist, title, localDuration,
            foundLrc, foundPlain, null, 'lrclib'
          ]
        )
      } catch {}
    }

    if (foundLrc) return sendLyrics(res, foundLrc)
    if (foundPlain) return sendLyrics(res, foundPlain)

    return res.json({ success: false, message: '未找到歌词' })
  } catch (err) {
    console.error('[歌词] 查询异常:', err)
    res.status(500).json({ success: false, message: '歌词查询失败' })
  }
})

async function sendLyrics(res, rawLyrics) {
  const lyrics = toSimplified(rawLyrics)
  if (isForeign(lyrics)) {
    const plainText = stripLrcTimestamps(lyrics) || lyrics
    const translation = await translateToChinese(plainText)
    // 异步存翻译
    res.json({ success: true, lyrics, translation, source: 'lrclib' })
  } else {
    res.json({ success: true, lyrics, source: 'lrclib' })
  }
}

export default router
