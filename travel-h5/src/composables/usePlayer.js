// 全局音乐播放器 — 页面切换不中断播放 + Media Session API
import { ref, computed, watch } from 'vue'

const songs = ref([])
const currentIndex = ref(-1)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.5)
// 播放模式: 'normal' | 'shuffle' | 'repeat' | 'repeat-one'
const playMode = ref('normal')

// 兼容旧接口
const shuffleMode = computed(() => playMode.value === 'shuffle')
const repeatMode = computed(() => playMode.value === 'repeat' || playMode.value === 'repeat-one')

let audio = null
function getAudio() {
  if (!audio) {
    audio = new Audio()
    audio.volume = volume.value
    audio.ontimeupdate = () => currentTime.value = audio.currentTime
    audio.onloadedmetadata = () => duration.value = audio.duration
    audio.onended = () => next()
    audio.onplay = () => { isPlaying.value = true; updateMediaSession() }
    audio.onpause = () => { isPlaying.value = false; updateMediaSession() }
    audio.onerror = () => isPlaying.value = false
  }
  return audio
}

const currentSong = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= songs.value.length) return null
  return songs.value[currentIndex.value]
})
const progress = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)

export function fmt(sec) {
  if (!sec || !isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return m + ':' + s.toString().padStart(2, '0')
}

// ===== Media Session API =====
function updateMediaSession() {
  if (!('mediaSession' in navigator)) return
  const song = currentSong.value
  if (!song) { navigator.mediaSession.metadata = null; return }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.name,
    artist: song.artist || '未知艺术家',
    artwork: song.cover ? [{ src: song.cover, sizes: '300x300', type: 'image/jpeg' }] : []
  })

  navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'

  navigator.mediaSession.setActionHandler('play', () => togglePlay())
  navigator.mediaSession.setActionHandler('pause', () => togglePlay())
  navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  navigator.mediaSession.setActionHandler('nexttrack', () => next())
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime != null && audio && audio.duration) {
      audio.currentTime = details.seekTime
    }
  })
}

// 切歌时更新 Media Session
watch([currentSong, isPlaying], () => updateMediaSession())

// 位置更新 Media Session
setInterval(() => {
  if (!('mediaSession' in navigator) || !isPlaying.value) return
  navigator.mediaSession.setPositionState({
    duration: duration.value || 0,
    playbackRate: 1,
    position: currentTime.value || 0
  })
}, 1000)

function play(i) {
  if (!songs.value.length) return
  const idx = i >= 0 ? i : 0
  const song = songs.value[idx]
  if (!song) return
  currentIndex.value = idx
  const a = getAudio()
  if (song.blob) {
    if (a.src?.startsWith('blob:')) URL.revokeObjectURL(a.src)
    a.src = URL.createObjectURL(song.blob)
  }
  a.play().catch(() => {})
}

function togglePlay() {
  if (!currentSong.value) { if (songs.value.length) play(0); return }
  const a = getAudio()
  a.paused ? a.play().catch(() => {}) : a.pause()
}

function cycleShuffle() {
  playMode.value = playMode.value === 'shuffle' ? 'normal' : 'shuffle'
}

function cycleRepeat() {
  if (playMode.value === 'repeat') playMode.value = 'repeat-one'
  else if (playMode.value === 'repeat-one') playMode.value = 'normal'
  else playMode.value = 'repeat'
}

function next() {
  if (!songs.value.length) return
  if (playMode.value === 'shuffle') {
    let ni; do { ni = Math.floor(Math.random() * songs.value.length) } while (ni === currentIndex.value && songs.value.length > 1)
    play(ni)
  } else if (playMode.value === 'repeat-one') { play(currentIndex.value) }
  else play((currentIndex.value + 1) % songs.value.length)
}

function prev() {
  if (!songs.value.length) return
  play(currentIndex.value <= 0 ? songs.value.length - 1 : currentIndex.value - 1)
}

function seek(pct) {
  const a = getAudio()
  if (a.duration) a.currentTime = (pct / 100) * a.duration
}

function setVol(v) { const n = parseFloat(v); volume.value = n; if (audio) audio.volume = n }

function addSong(song) { songs.value.unshift(song) }
function removeSong(id) {
  const idx = songs.value.findIndex(s => s.id === id)
  if (idx < 0) return
  songs.value.splice(idx, 1)
  if (!songs.value.length) { currentIndex.value = -1; const a = getAudio(); a.pause(); a.src = ''; isPlaying.value = false; updateMediaSession() }
  else if (idx === currentIndex.value) play(Math.min(idx, songs.value.length - 1))
  else if (idx < currentIndex.value) currentIndex.value--
}
function clearAll() {
  songs.value = []; currentIndex.value = -1; isPlaying.value = false
  const a = getAudio(); a.pause(); a.src = ''
  updateMediaSession()
}

export function usePlayer() {
  return {
    songs, currentIndex, isPlaying, currentTime, duration, volume,
    shuffleMode, repeatMode, playMode, currentSong, progress,
    play, togglePlay, next, prev, seek, setVol,
    addSong, removeSong, clearAll, fmt,
    cycleShuffle, cycleRepeat,
    getAudio // 暴露 audio 元素供可视化使用
  }
}
