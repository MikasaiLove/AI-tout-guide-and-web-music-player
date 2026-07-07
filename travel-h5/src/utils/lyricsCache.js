// 歌词本地缓存 — localStorage 持久化
const PREFIX = 'lyrics_v3_'
const MAX = 200

function key(artist, title) {
  return PREFIX + (artist || '').trim() + '|' + (title || '').trim()
}

// 返回 { lyrics, translation } 或 null
export function getCachedLyrics(artist, title) {
  try {
    const raw = localStorage.getItem(key(artist, title))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function setCachedLyrics(artist, title, lyrics, translation) {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) keys.push(k)
    }
    if (keys.length >= MAX) {
      keys.slice(0, 20).forEach(k => localStorage.removeItem(k))
    }
    localStorage.setItem(key(artist, title), JSON.stringify({ lyrics, translation: translation || null }))
  } catch {}
}
