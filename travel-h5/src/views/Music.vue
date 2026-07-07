<template>
  <div class="music-page" :style="pageBg">
    <div class="music-layout" :class="{ immersive }">

      <!-- ===== 左侧：歌单 ===== -->
      <aside class="playlist-panel" v-show="!immersive">
        <div class="panel-header">
          <h3>资料库</h3>
          <div class="panel-header-acts">
            <button class="shuffle-all-btn" v-if="songs.length > 1" @click="shuffleAll" title="随机播放全部">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              随机
            </button>
            <span class="song-count" v-if="songs.length">{{ songs.length }} 首</span>
          </div>
        </div>

        <div class="playlist-search" v-if="songs.length >= 5">
          <input type="text" v-model="playlistFilter" placeholder="搜索歌单..." />
          <span class="search-clear" v-if="playlistFilter" @click="playlistFilter=''">✕</span>
        </div>

        <div class="drop-zone" :class="{ dragging }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop">
          <span class="drop-text" v-if="importing">正在导入...</span>
          <span class="drop-text" v-else>{{ dragging ? '松开导入' : '＋ 添加音乐' }}</span>
          <input type="file" accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.lrc" multiple
            style="position:absolute;inset:0;opacity:0;cursor:pointer"
            @change="onFileSelect" />
        </div>

        <div class="song-list" v-if="filteredSongs.length">
          <div v-for="(s, fi) in filteredSongs" :key="s.id" class="song-item"
            :class="{ active: songs.indexOf(s) === currentIndex, 'drag-over': dragOverIdx === songs.indexOf(s) }"
            draggable="true"
            @click="p.play(songs.indexOf(s))"
            @dragstart="onDragStart($event, songs.indexOf(s))"
            @dragover.prevent="onDragOver($event, songs.indexOf(s))"
            @dragleave="onDragLeave"
            @drop.prevent="onDropReorder($event, songs.indexOf(s))"
            @dragend="onDragEnd">
            <div class="song-thumb" :style="s.cover ? { backgroundImage: 'url('+s.cover+')' } : { background: s.color }">
              <div class="playing-overlay" v-if="songs.indexOf(s) === currentIndex && isPlaying">
                <span class="bar" v-for="n in 3" :key="n" :style="{ animationDelay: n * 0.15 + 's' }"></span>
              </div>
              <span v-if="!s.cover" class="thumb-note">&#9834;</span>
            </div>
            <div class="song-info">
              <span class="song-name" :class="{ playing: songs.indexOf(s) === currentIndex && isPlaying }">{{ s.name }}</span>
              <span class="song-artist">{{ s.artist || '未知艺术家' }}</span>
            </div>
            <span class="song-dur" v-if="s.duration > 0">{{ fmt(s.duration) }}</span>
            <span class="song-del" @click.stop="p.removeSong(s.id)">&#10005;</span>
          </div>
        </div>
        <div class="song-list empty-search" v-else-if="songs.length && playlistFilter">
          <p class="no-result">没有找到 "{{ playlistFilter }}"</p>
        </div>

        <div class="panel-foot" v-if="songs.length">
          <button class="clear-btn" @click="p.clearAll()">清空歌单</button>
        </div>
      </aside>

      <!-- ===== 中间：播放器（黑胶唱片） ===== -->
      <main class="player-panel" @mousemove="onPlayerMouseMove" @mouseleave="showControls = true"
        @touchstart="onSwipeStart" @touchend="onSwipeEnd">
        <template v-if="currentSong">
          <div class="player-inner" :class="{ 'hide-ui': immersive && !showControls }">
            <!-- 黑胶唱片 + 封面 -->
            <div class="vinyl-stage" :class="{ playing: isPlaying }" @click="toggleImmersive" title="点击切换沉浸模式">
              <div class="album-cover"
                :style="currentSong.cover
                  ? { backgroundImage: 'url('+currentSong.cover+')' }
                  : { background: currentSong.color }">
                <span v-if="!currentSong.cover" class="cover-emoji">&#127925;</span>
                <div class="cover-glare"></div>
              </div>
              <div class="vinyl-disc" :style="{ animationPlayState: isPlaying ? 'running' : 'paused' }">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-label" :style="currentSong.cover
                  ? { backgroundImage: 'url('+currentSong.cover+')' }
                  : { background: currentSong.color }">
                  <span class="label-text" v-if="!currentSong.cover">{{ currentSong.name.slice(0, 8) }}</span>
                </div>
                <div class="vinyl-shine"></div>
                <!-- 播放中光点粒子 -->
                <div class="vinyl-sparkles" v-if="isPlaying">
                  <span class="spark" v-for="n in 6" :key="n"
                    :style="{ left: (20 + Math.sin(n*1.05)*60).toFixed(0) + '%', top: (20 + Math.cos(n*1.05)*60).toFixed(0) + '%', animationDelay: (n*0.3).toFixed(1)+'s' }"></span>
                </div>
              </div>
            </div>

            <!-- 沉浸模式：当前歌词行浮在唱片上方 -->
            <div class="immersive-lyric-line" v-if="immersive && parsedLyrics.length && isLrcFormat && currentLyricIndex >= 0">
              <span class="imm-text">{{ parsedLyrics[currentLyricIndex]?.text }}</span>
              <span class="imm-trans-text" v-if="parsedLyrics[currentLyricIndex]?.trans">{{ parsedLyrics[currentLyricIndex].trans }}</span>
            </div>

            <!-- 沉浸模式切换提示 & 快捷键 -->
            <div class="player-hints" v-if="!immersive">
              <span class="immersive-hint">点击唱片 · 沉浸模式</span>
              <span class="shortcut-toggle" @click="toggleShortcuts">快捷键 ⌨</span>
            </div>

            <!-- 快捷键面板 -->
            <div class="shortcuts-panel" v-if="showShortcuts" @click.self="showShortcuts = false">
              <div class="shortcuts-card">
                <h4>键盘快捷键</h4>
                <div class="shortcut-row"><kbd>空格</kbd> 播放 / 暂停</div>
                <div class="shortcut-row"><kbd>← →</kbd> 快退 / 快进</div>
                <div class="shortcut-row"><kbd>↑ ↓</kbd> 音量增减</div>
                <div class="shortcut-row"><kbd>Esc</kbd> 退出沉浸模式</div>
                <button class="shortcuts-close" @click="showShortcuts = false">知道了</button>
              </div>
            </div>

            <!-- 频谱可视化（真实音频数据） -->
            <div class="visualizer" :class="{ active: isPlaying }" ref="vizContainer">
              <span class="viz-bar" v-for="(h, i) in vizHeights" :key="i"
                :style="{ height: h + 'px' }"></span>
            </div>

            <div class="song-meta">
              <span class="now-playing-label">NOW PLAYING</span>
              <h2 class="now-title">{{ currentSong.name }}</h2>
              <p class="now-artist">{{ currentSong.artist || '未知艺术家' }}</p>
              <!-- 下一首预览 -->
              <p class="up-next" v-if="songs.length > 1 && !p.shuffleMode">下一首：{{ songs[(currentIndex + 1) % songs.length]?.name || '—' }}</p>
            </div>

            <!-- 切歌通知浮层 -->
            <transition name="toast-fade">
              <div class="song-toast" v-if="showToast">
                <span class="toast-icon">&#9835;</span>
                <div>
                  <span class="toast-title">{{ toastSong }}</span>
                  <span class="toast-artist">{{ toastArtist }}</span>
                </div>
              </div>
            </transition>

            <div class="progress-wrap" ref="progressWrap"
              @mousedown="onSeekStart" @touchstart.prevent="onSeekStart">
              <span class="time-label" @click.stop="timeMode = timeMode === 'elapsed' ? 'remaining' : 'elapsed'" title="点击切换">
                {{ timeMode === 'elapsed' ? fmt(currentTime) : (duration > currentTime ? '-' + fmt(duration - currentTime) : '0:00') }}
              </span>
              <div class="progress-bar" ref="progressBarRef"
                @mousemove="onProgressHover" @mouseleave="hoverTime = -1">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                <div class="progress-buffer" v-if="bufferPct > 0" :style="{ width: bufferPct + '%' }"></div>
                <div class="progress-thumb" :style="{ left: progress + '%' }"></div>
                <!-- 悬停时间提示 -->
                <div class="progress-tooltip" v-if="hoverTime >= 0" :style="{ left: hoverPct + '%' }">
                  {{ fmt(hoverTime) }}
                </div>
              </div>
              <span class="time-label">{{ fmt(duration) }}</span>
            </div>

            <div class="controls">
              <button class="ctrl-btn side" :class="{ on: p.shuffleMode.value }" @click="p.cycleShuffle()" :title="p.shuffleMode.value ? '随机播放中' : '顺序播放'">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
              </button>
              <button class="ctrl-btn" @click="p.prev()" title="上一首">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="6,12 16,4 16,20"/><rect x="2" y="5" width="3" height="14" rx="1"/></svg>
              </button>
              <button class="play-btn" :class="{ pulsing: isPlaying }" @click="p.togglePlay()" :title="isPlaying ? '暂停' : '播放'">
                <svg v-if="isPlaying" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><polygon points="8,5 20,12 8,19"/></svg>
              </button>
              <button class="ctrl-btn" @click="p.next()" title="下一首">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8,4 18,12 8,20"/><rect x="19" y="5" width="3" height="14" rx="1"/></svg>
              </button>
              <button class="ctrl-btn side" :class="{ on: p.repeatMode.value }" @click="p.cycleRepeat()" :title="p.playMode.value === 'repeat-one' ? '单曲循环' : p.playMode.value === 'repeat' ? '列表循环' : '顺序播放'">
                <!-- 单曲循环加 "1" 标识 -->
                <svg v-if="p.playMode.value === 'repeat-one'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                <span class="repeat-badge" v-if="p.playMode.value === 'repeat-one'">1</span>
              </button>
            </div>

            <div class="bottom-row">
              <div class="volume-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                <input type="range" class="vol-slider" min="0" max="1" step="0.05" v-model.number="volVal" />
              </div>
              <div class="sleep-timer">
                <button class="sleep-btn" :class="{ active: sleepTimer > 0 }" @click="toggleSleepMenu" title="睡眠定时器">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                  <span v-if="sleepTimer > 0">{{ sleepTimer }}m</span>
                </button>
                <div class="sleep-menu" v-if="showSleepMenu">
                  <button v-for="t in [15,30,45,60]" :key="t" :class="{ on: sleepTimer === t }" @click="setSleepTimer(t)">{{ t }} 分钟</button>
                  <button class="cancel" v-if="sleepTimer > 0" @click="setSleepTimer(0)">取消定时</button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="empty-state" v-else>
          <div class="empty-visual">
            <span class="empty-disc">&#127925;</span>
            <span class="empty-note n1">&#9834;</span>
            <span class="empty-note n2">&#9835;</span>
            <span class="empty-note n3">&#9833;</span>
          </div>
          <p class="empty-title">还没有音乐</p>
          <p class="empty-desc">拖拽音频文件到左侧资料库，或点击上方导入</p>
          <p class="empty-formats">MP3 / FLAC / WAV / OGG / M4A</p>
        </div>
      </main>

      <!-- ===== 右侧：歌词面板 ===== -->
      <aside class="lyrics-panel" v-show="!immersive">
        <div class="lyrics-panel-header">
          <h3>歌词</h3>
          <button class="lyric-paste-btn" @click="openLyricEditor" title="粘贴LRC歌词">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>

        <div class="lyrics-body" ref="lyricScroll" v-if="parsedLyrics.length && isLrcFormat">
          <p v-for="(line, i) in parsedLyrics" :key="i" class="lyric-line"
            :class="{ active: i === currentLyricIndex, past: i < currentLyricIndex }"
            :ref="el => { if (i === currentLyricIndex) activeLineEl = el }">
            <span class="lyric-original">{{ line.text }}</span>
            <span class="lyric-trans" v-if="line.trans">{{ line.trans }}</span>
          </p>
          <div v-if="currentSong?.translation && !hasLineTranslation" class="lyric-trans-block">
            {{ currentSong.translation }}
          </div>
        </div>

        <div class="lyrics-body plain" v-else-if="parsedLyrics.length && !isLrcFormat">
          <p v-for="(line, i) in parsedLyrics" :key="i" class="lyric-line plain-line">{{ line.text }}</p>
          <div v-if="currentSong?.translation" class="lyric-trans-block">{{ currentSong.translation }}</div>
        </div>

        <div class="lyrics-empty" v-else-if="currentSong">
          <p v-if="lyricLoading">正在搜索歌词...</p>
          <p v-else>暂无歌词</p>
          <button class="lyric-paste-btn-large" @click="openLyricEditor">粘贴 LRC 歌词</button>
        </div>

        <div class="lyrics-empty" v-else><p>未在播放</p></div>

        <div class="lyric-editor-overlay" v-if="editingLyrics" @click.self="editingLyrics=false">
          <div class="lyric-editor">
            <h4>粘贴 LRC 歌词</h4>
            <textarea v-model="lyricsInput" placeholder="粘贴 LRC 歌词到这里...&#10;&#10;格式示例：&#10;[00:12.34]第一句歌词&#10;[00:23.45]第二句歌词"></textarea>
            <div class="lyric-editor-acts">
              <button class="lyric-cancel" @click="editingLyrics=false">取消</button>
              <button class="lyric-save" @click="saveLyrics">保存歌词</button>
            </div>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { parseID3 } from '../utils/id3Parser.js'
import { usePlayer } from '../composables/usePlayer.js'
const p = usePlayer()
const {
  songs, currentIndex, isPlaying, currentTime, duration, volume,
  shuffleMode, repeatMode, currentSong, progress
} = p

const volVal = computed({
  get: () => p.volume.value,
  set: (v) => p.setVol(v)
})

const playlistFilter = ref('')

const filteredSongs = computed(() => {
  const q = playlistFilter.value.toLowerCase().trim()
  if (!q) return songs.value
  return songs.value.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.artist || '').toLowerCase().includes(q)
  )
})

// 检测行内双语（如 "now i'm seventeen 现在我十七岁了"）
function splitBilingual(text) {
  // 统计拉丁字母和 CJK 汉字的数量
  let latinCount = 0, cjkCount = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF)) cjkCount++  // 纯汉字
    else if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) latinCount++  // 纯英文字母
  }
  // 同时有足够英文和汉字才尝试分割
  if (latinCount < 3 || cjkCount < 2) return null

  // 从后往前找分割点：最后一个英文字母之后、第一个 CJK 汉字之前的空格
  let lastLatin = -1, firstCJK = -1
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) lastLatin = i
    if ((c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF)) {
      if (firstCJK < 0) firstCJK = i
    }
  }
  if (lastLatin > 0 && firstCJK > lastLatin) {
    // 分割点在 lastLatin 和 firstCJK 之间
    const middle = text.slice(lastLatin + 1, firstCJK)
    const hasSpace = /[ 　]/.test(middle) // 半角或全角空格
    if (hasSpace || firstCJK - lastLatin < 20) {
      return { main: text.slice(0, firstCJK).trim(), trans: text.slice(firstCJK).trim() }
    }
  }
  return null
}

const importing = ref(false)
const dragging = ref(false)
const editingLyrics = ref(false)
const immersive = ref(false)
const showControls = ref(true)
let hideControlsTimer = null
const showToast = ref(false)
const toastSong = ref('')
const toastArtist = ref('')
let toastTimer = null

// 切歌通知
watch(currentSong, (song) => {
  if (!song) return
  toastSong.value = song.name
  toastArtist.value = song.artist || '未知艺术家'
  showToast.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { showToast.value = false }, 2500)
})
const lyricsInput = ref('')
const lyricScroll = ref(null)
const activeLineEl = ref(null)
const lyricLoading = computed(() => !!(currentSong.value && !currentSong.value.lyrics))
const progressBarRef = ref(null)
const progressWrap = ref(null)
const isSeeking = ref(false)
const vizContainer = ref(null)
const timeMode = ref('elapsed') // 'elapsed' | 'remaining'
const bufferPct = ref(0)
const hoverTime = ref(-1)
const hoverPct = ref(0)
const sleepTimer = ref(0) // 剩余分钟
const showSleepMenu = ref(false)
let sleepInterval = null

function toggleSleepMenu() { showSleepMenu.value = !showSleepMenu.value }
function setSleepTimer(min) {
  showSleepMenu.value = false
  sleepTimer.value = min
  clearInterval(sleepInterval)
  if (min > 0) {
    sleepInterval = setInterval(() => {
      sleepTimer.value--
      if (sleepTimer.value <= 0) {
        clearInterval(sleepInterval)
        sleepTimer.value = 0
        const a = p.getAudio()
        if (a && !a.paused) a.pause()
      }
    }, 60000)
  }
}

// Web Audio 频谱可视化
const vizHeights = ref(new Array(20).fill(6))
let audioCtx = null, analyser = null, vizAnimId = null, sourceConnected = false

function initAudioContext() {
  if (audioCtx && sourceConnected) return
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtx.onstatechange = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {})
        }
      }
    }
    if (!analyser) {
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8
    }
    // createMediaElementSource 只能调用一次
    if (!sourceConnected) {
      const a = getAudioEl()
      const source = audioCtx.createMediaElementSource(a)
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
      sourceConnected = true
    }
  } catch (e) {
    // 如果 source 已连接，忽略错误，只读分析器
    if (String(e).includes('already')) { sourceConnected = true }
    else { console.warn('音频可视化初始化失败:', e) }
  }
}

function getAudioEl() {
  return p.getAudio()
}

function startViz() {
  if (!analyser) return
  // 每次播放都确保 AudioContext 活跃
  if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {})
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  function tick() {
    if (!analyser) return
    analyser.getByteFrequencyData(dataArray)
    // 取低频到高频 20 个采样点
    const step = Math.floor(dataArray.length / 20)
    const heights = []
    for (let i = 0; i < 20; i++) {
      const val = dataArray[i * step] / 255
      heights.push(6 + val * 30) // 6~36px
    }
    vizHeights.value = heights
    vizAnimId = requestAnimationFrame(tick)
  }
  vizAnimId = requestAnimationFrame(tick)
}

function stopViz() {
  if (vizAnimId) { cancelAnimationFrame(vizAnimId); vizAnimId = null }
  vizHeights.value = new Array(20).fill(6)
}

// 监听播放/暂停切换可视化
watch([isPlaying, currentSong], ([playing, song]) => {
  if (playing && song) {
    initAudioContext()
    // 需要在 user gesture 后恢复 AudioContext
    if (audioCtx?.state === 'suspended') audioCtx.resume()
    startViz()
  } else {
    stopViz()
  }
})

// 缓冲进度
let bufferInterval = null
onMounted(() => {
  bufferInterval = setInterval(() => {
    const a = p.getAudio()
    if (a && a.buffered && a.buffered.length > 0 && a.duration) {
      bufferPct.value = (a.buffered.end(a.buffered.length - 1) / a.duration) * 100
    }
  }, 500)
})
onUnmounted(() => {
  stopViz()
  // 不要关闭 AudioContext 或重置 sourceConnected
  // 音乐是全局的，离开页面仍需播放
  if (bufferInterval) clearInterval(bufferInterval)
})

// 封面模糊背景
const pageBg = computed(() => {
  if (currentSong.value?.cover) {
    return { backgroundImage: 'url(' + currentSong.value.cover + ')', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
  }
  return {}
})

const isLrcFormat = computed(() => {
  if (!currentSong.value?.lyrics) return false
  return /\[\d{2}:\d{2}[.:]\d{2}\]/.test(currentSong.value.lyrics)
})

const parsedLyrics = computed(() => {
  if (!currentSong.value || !currentSong.value.lyrics) return []
  const text = currentSong.value.lyrics

  if (isLrcFormat.value) {
    const lines = []
    const re = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/g
    let match
    while ((match = re.exec(text)) !== null) {
      const min = parseInt(match[1]), sec = parseInt(match[2])
      let ms = match[3] ? parseInt(match[3]) : 0
      if (ms < 100) ms *= 10
      const time = min * 60 + sec + ms / 1000
      const rest = text.slice(match.index + match[0].length)
      const nl = rest.indexOf('\n')
      const lineText = (nl >= 0 ? rest.slice(0, nl) : rest).trim()
      if (lineText) {
        let main = lineText, trans = null
        const bilingual = splitBilingual(lineText)
        if (bilingual) { main = bilingual.main; trans = bilingual.trans }
        lines.push({ time, text: main, trans })
      }
    }
    const sorted = lines.sort((a, b) => a.time - b.time)

    // 如果行内未检测到双语，尝试从 translation 字段匹配
    if (!sorted.some(l => l.trans) && currentSong.value.translation) {
      const transLines = currentSong.value.translation
        .split('\n').map(l => l.trim()).filter(Boolean)
        .filter(l => !/^\[\d{2}:\d{2}/.test(l))
      if (transLines.length > 0 && transLines.length <= sorted.length + 3 && transLines.length >= sorted.length - 3) {
        for (let i = 0; i < Math.min(sorted.length, transLines.length); i++) {
          sorted[i].trans = transLines[i]
        }
      }
    }
    return sorted
  }

  return text.split('\n').map(l => l.trim()).filter(Boolean).map(t => ({ time: -1, text: t, trans: null }))
})

const hasLineTranslation = computed(() => parsedLyrics.value.some(l => l.trans))

const currentLyricIndex = computed(() => {
  if (!isLrcFormat.value) return -1
  const t = currentTime.value
  let idx = -1
  for (let i = 0; i < parsedLyrics.value.length; i++) {
    if (parsedLyrics.value[i].time <= t + 0.3) idx = i; else break
  }
  return idx
})


// 切歌时歌单自动滚到当前播放歌曲
watch(currentIndex, () => {
  nextTick(() => {
    const el = document.querySelector('.playlist-panel .song-item.active')
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
})

watch(currentLyricIndex, async () => {
  if (!lyricScroll.value) return
  await nextTick()
  const el = lyricScroll.value.querySelector('.lyric-line.active')
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
})

function fmt(sec) { return p.fmt(sec) }

function calcSeekPct(clientX) {
  if (!progressBarRef.value) return 0
  const rect = progressBarRef.value.getBoundingClientRect()
  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
}

function onProgressHover(e) {
  if (!progressBarRef.value || !duration.value) return
  const rect = progressBarRef.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  hoverPct.value = pct * 100
  hoverTime.value = pct * duration.value
}

function onSeekStart(e) {
  isSeeking.value = true
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  p.seek(calcSeekPct(clientX))
  document.addEventListener('mousemove', onSeekMove)
  document.addEventListener('mouseup', onSeekEnd)
  document.addEventListener('touchmove', onSeekMove, { passive: false })
  document.addEventListener('touchend', onSeekEnd)
}

function onSeekMove(e) {
  if (!isSeeking.value) return
  e.preventDefault()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  p.seek(calcSeekPct(clientX))
}

function onSeekEnd() {
  isSeeking.value = false
  document.removeEventListener('mousemove', onSeekMove)
  document.removeEventListener('mouseup', onSeekEnd)
  document.removeEventListener('touchmove', onSeekMove)
  document.removeEventListener('touchend', onSeekEnd)
}

function openLyricEditor() {
  if (!currentSong.value) return
  lyricsInput.value = currentSong.value.lyrics || ''
  editingLyrics.value = true
}

function saveLyrics() {
  if (!currentSong.value) return
  const text = lyricsInput.value.trim()
  if (!text) { editingLyrics.value = false; return }
  currentSong.value.lyrics = text
  editingLyrics.value = false
}

function toggleImmersive() {
  immersive.value = !immersive.value
  showControls.value = true
  clearTimeout(hideControlsTimer)
  if (immersive.value) resetHideTimer()
}
function onPlayerMouseMove() {
  if (!immersive.value) return
  showControls.value = true
  resetHideTimer()
}
function shuffleAll() {
  p.playMode.value = 'shuffle'
  const ri = Math.floor(Math.random() * songs.value.length)
  p.play(ri)
}

// 快捷键面板
const showShortcuts = ref(false)
function toggleShortcuts() { showShortcuts.value = !showShortcuts.value }

function resetHideTimer() {
  clearTimeout(hideControlsTimer)
  hideControlsTimer = setTimeout(() => { showControls.value = false }, 3000)
}

// 沉浸模式滑动切歌
let swipeStartX = 0
function onSwipeStart(e) {
  swipeStartX = e.touches[0].clientX
}
function onSwipeEnd(e) {
  if (!immersive.value || !songs.value.length) return
  const diff = e.changedTouches[0].clientX - swipeStartX
  if (Math.abs(diff) > 80) {
    diff > 0 ? p.prev() : p.next()
  }
}

// 歌单拖拽排序
const dragIdx = ref(-1)
const dragOverIdx = ref(-1)
function onDragStart(e, idx) { dragIdx.value = idx; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e, idx) { dragOverIdx.value = idx }
function onDragLeave() { dragOverIdx.value = -1 }
function onDropReorder(e, targetIdx) {
  const from = dragIdx.value
  if (from < 0 || from === targetIdx || from >= songs.value.length) return
  const item = songs.value.splice(from, 1)[0]
  songs.value.splice(targetIdx, 0, item)
  // 更新当前播放索引
  if (from === currentIndex.value) currentIndex.value = targetIdx
  else if (from < currentIndex.value && targetIdx >= currentIndex.value) currentIndex.value--
  else if (from > currentIndex.value && targetIdx <= currentIndex.value) currentIndex.value++
  dragIdx.value = -1
  dragOverIdx.value = -1
}
function onDragEnd() { dragOverIdx.value = -1 }

function onDrop(e) { dragging.value = false; handleFiles([...e.dataTransfer.files]) }
function onFileSelect(e) { handleFiles([...e.target.files]); e.target.value = '' }

// LRC 文件匹配（按文件名对应已有歌曲）
async function handleLrcFile(file) {
  const raw = await file.text()
  const baseName = file.name.replace(/\.lrc$/i, '').replace(/_[A-Za-z]$/, '') // 去 _H 等后缀
  // 找歌名最匹配的歌曲
  let best = null, bestScore = 0
  for (const s of songs.value) {
    const songName = (s.name || '').toLowerCase()
    const lrcName = baseName.toLowerCase()
    if (songName === lrcName) { best = s; break }
    if (songName.includes(lrcName) || lrcName.includes(songName)) {
      const score = Math.min(songName.length, lrcName.length) / Math.max(songName.length, lrcName.length)
      if (score > bestScore) { bestScore = score; best = s }
    }
  }
  if (best) {
    best.lyrics = raw
    // 检测是否有翻译字段
    if (currentSong.value === best && best.lyrics) {
      lyricLoading.value = false
    }
  }
}

async function handleFiles(files) {
  if (!files.length) return
  const lrcFiles = []
  const audioFiles = []
  for (const f of files) {
    if (f.name.toLowerCase().endsWith('.lrc')) lrcFiles.push(f)
    else audioFiles.push(f)
  }
  // 先处理音频
  importing.value = true
  for (const file of audioFiles) {
    const rawName = file.name.replace(/\.[^.]+$/, '')
    const { artist, title } = parseFileName(file.name)
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const song = { id, name: title, artist, cover: null, lyrics: null, translation: null, blob: file, color: hslFromName(title || rawName), duration: 0, createdAt: Date.now() }
    p.addSong(song)
    const songId = id
    file.arrayBuffer().then(buf => {
      try {
        const id3 = parseID3(buf)
        // 必须从响应式数组取，不能直接用原始 song 引用
        const rs = songs.value.find(s => s.id === songId)
        if (!rs) return
        if (id3.title) rs.name = id3.title
        if (id3.artist) rs.artist = id3.artist
        if (id3.album) rs.album = id3.album
        if (id3.cover) rs.cover = id3.cover
        if (id3.lyrics) { rs.lyrics = id3.lyrics; rs._fromId3 = true }
        if (id3.translation) rs.translation = id3.translation
      } catch (e) { console.error('[ID3] 异常:', e) }
    }).catch(e => console.error('[ID3] 读文件失败:', e))
    const tmp = new Audio()
    tmp.onloadedmetadata = () => {
      const rs = songs.value.find(s => s.id === songId)
      if (rs) rs.duration = tmp.duration
    }
    tmp.src = URL.createObjectURL(file)
  }
  // 再处理 LRC 文件
  for (const f of lrcFiles) await handleLrcFile(f)
  if (!currentSong.value) p.play(0)
  importing.value = false
}

function hslFromName(n) {
  let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
  return 'hsl(' + (Math.abs(h) % 360) + ', 45%, 32%)'
}

function parseFileName(filename) {
  const raw = filename.replace(/\.[^.]+$/, '')
  const dashIdx = raw.indexOf(' - ')
  if (dashIdx > 0) {
    const artist = raw.slice(0, dashIdx).trim()
    let title = raw.slice(dashIdx + 3).trim()
    title = title.replace(/[_\-]\s*[a-zA-Z0-9]+$/, '')
    title = title.replace(/\s*[（(][^)）]*[)）]\s*$/, '')
    title = title.trim() || raw
    return { artist, title }
  }
  return { artist: '', title: raw }
}

// 键盘快捷键
function onKeydown(e) {
  // 在输入框中不拦截
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
  switch (e.code) {
    case 'Space': e.preventDefault(); p.togglePlay(); break
    case 'ArrowLeft': e.preventDefault(); p.seek(Math.max(0, progress.value - 5)); break
    case 'ArrowRight': e.preventDefault(); p.seek(Math.min(100, progress.value + 5)); break
    case 'ArrowUp': e.preventDefault(); p.setVol(Math.min(1, volume.value + 0.1)); break
    case 'ArrowDown': e.preventDefault(); p.setVol(Math.max(0, volume.value - 0.1)); break
    case 'KeyN': e.ctrlKey && e.preventDefault() && p.next(); break
    case 'Escape': if (immersive.value) { immersive.value = false }; break
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.music-page {
  min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 24px;
  position: relative;
}
/* 封面模糊背景 + 暗色遮罩 */
.music-page::before {
  content: ''; position: fixed; inset: 0; z-index: 0;
  background: inherit; background-size: cover; background-position: center;
  filter: blur(60px) brightness(0.25);
  transform: scale(1.1);
}
.music-layout { position: relative; z-index: 1; display: flex; gap: 14px; width: 100%; max-width: 1320px; height: 88vh; }

/* ========== 左侧：歌单 ========== */
.playlist-panel {
  width: 280px; min-width: 280px;
  background: rgba(10,14,20,0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 20px;
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-header { display: flex; align-items: baseline; justify-content: space-between; padding: 18px 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.panel-header h3 { font-size: 14px; font-weight: 700; color: #fff; margin: 0; }
.panel-header-acts { display: flex; align-items: center; gap: 8px; }
.shuffle-all-btn {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08); background: transparent;
  color: rgba(255,255,255,0.35); font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.shuffle-all-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); }
.song-count { font-size: 11px; color: rgba(255,255,255,0.3); }

/* 歌单搜索 */
.playlist-search {
  position: relative; margin: 6px 10px;
}
.playlist-search input {
  width: 100%; padding: 7px 28px 7px 10px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
  color: #fff; font-size: 12px; outline: none; transition: border-color 0.3s;
}
.playlist-search input::placeholder { color: rgba(255,255,255,0.2); }
.playlist-search input:focus { border-color: rgba(255,255,255,0.2); }
.search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; color: rgba(255,255,255,0.3); cursor: pointer; }
.search-clear:hover { color: #fff; }
.no-result { text-align: center; padding: 20px; font-size: 12px; color: rgba(255,255,255,0.2); }

.drop-zone {
  position: relative; margin: 8px 10px; padding: 16px 10px;
  border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px;
  text-align: center; cursor: pointer; transition: all 0.3s;
}
.drop-zone:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.02); }
.drop-zone.dragging { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.04); }
.drop-text { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }

.song-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
.song-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; cursor: pointer; transition: all 0.15s; margin-bottom: 1px; }
.song-item:hover { background: rgba(255,255,255,0.05); }
.song-item.active { background: rgba(255,255,255,0.09); }
.song-item.drag-over { background: rgba(255,255,255,0.08); box-shadow: 0 0 0 1px rgba(255,255,255,0.15); transform: translateX(4px); }
.song-thumb { width: 40px; height: 40px; border-radius: 5px; flex-shrink: 0; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); font-size: 14px; position: relative; overflow: hidden; }
.thumb-note { z-index: 1; }
/* 播放中音波动画 */
.playing-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center; gap: 3px; padding-bottom: 8px;
  border-radius: 5px;
}
.playing-overlay .bar {
  width: 3px; background: #fff; border-radius: 2px;
  animation: eq-bounce 0.6s ease-in-out infinite alternate;
}
.playing-overlay .bar:nth-child(1) { height: 10px; }
.playing-overlay .bar:nth-child(2) { height: 16px; }
.playing-overlay .bar:nth-child(3) { height: 8px; }
@keyframes eq-bounce {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
}
.song-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.song-name { font-size: 13px; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.3s; }
.song-name.playing { color: #5b9bff; }
.song-artist { font-size: 11px; color: rgba(255,255,255,0.35); }
.song-dur { font-size: 11px; color: rgba(255,255,255,0.25); flex-shrink: 0; margin-right: 2px; font-variant-numeric: tabular-nums; }
.song-del { color: rgba(255,255,255,0.12); font-size: 13px; padding: 4px; cursor: pointer; transition: color 0.15s; flex-shrink: 0; }
.song-del:hover { color: #ff5c5c; }

.panel-foot { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.05); }
.clear-btn { width: 100%; padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,60,60,0.06); color: rgba(255,255,255,0.3); font-size: 12px; cursor: pointer; transition: all 0.25s; }
.clear-btn:hover { background: rgba(255,60,60,0.15); color: #ff5c5c; border-color: rgba(255,60,60,0.2); }

/* ========== 中间：播放器 ========== */
.player-panel {
  width: 440px; min-width: 440px; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(10,14,20,0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 20px;
  padding: 32px 36px; overflow: hidden;
}
.player-inner { display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; }

/* ===== 黑胶唱片动画 ===== */
.vinyl-stage { position: relative; width: 280px; height: 260px; cursor: pointer; perspective: 600px; }
.vinyl-stage:hover .album-cover { transform: rotateY(-6deg) rotateX(4deg) scale(1.02); filter: brightness(1.1); }
.vinyl-stage:hover .vinyl-disc { filter: brightness(1.05); }
.vinyl-stage.playing:hover .vinyl-disc { right: -28px; }
.album-cover {
  position: absolute; left: 0; top: 0; z-index: 10;
  width: 230px; height: 230px; border-radius: 8px;
  background-size: cover; background-position: center;
  box-shadow: 0 20px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center; font-size: 60px;
  transition: transform 0.4s ease;
  overflow: hidden;
}
.cover-emoji { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); }
/* 封面光泽 */
.cover-glare {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(255,255,255,0.04) 100%);
  border-radius: 8px;
}

.vinyl-disc {
  position: absolute; right: -10px; top: 10px; z-index: 5;
  width: 210px; height: 210px; border-radius: 50%;
  background: radial-gradient(circle at center,
    #1a1a1a 0%, #1a1a1a 17%,
    #1e1e1e 17.5%, #191919 18%,
    #222 18.5%, #1a1a1a 19%,
    #1d1d1d 20%, #1a1a1a 21%,
    #222 21.5%, #191919 22%,
    #1e1e1e 24%, #1a1a1a 25%,
    #222 26%, #191919 27%,
    #1d1d1d 29%, #1a1a1a 30%,
    #222 31%, #191919 32%,
    #1e1e1e 34%, #1a1a1a 35%,
    #222 36%, #191919 37%,
    #1d1d1d 39%, #1a1a1a 40%,
    #222 41%, #191919 42%,
    #1e1e1e 44%, #1a1a1a 45%,
    #222 46%, #191919 47%,
    #1d1d1d 49%, #1a1a1a 50%,
    #222 51%, #191919 52%,
    #1e1e1e 54%, #1a1a1a 55%,
    #222 56%, #191919 57%,
    #1d1d1d 59%, #1a1a1a 60%,
    #222 61%, #191919 62%,
    #1e1e1e 64%, #1a1a1a 65%,
    #222 66%, #191919 67%,
    #1d1d1d 69%, #1a1a1a 70%,
    #222 71%, #191919 72%,
    #1e1e1e 74%, #1a1a1a 75%,
    #222 76%, #191919 77%,
    #1a1a1a 79%, #1a1a1a 100%
  );
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03);
  animation: spin-wobble 2s linear infinite paused;
  transition: right 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
/* 黑胶光泽 */
.vinyl-shine {
  position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: linear-gradient(
    135deg,
    transparent 30%, rgba(255,255,255,0.03) 40%,
    rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.02) 50%,
    transparent 55%
  );
}

.vinyl-label {
  width: 64px; height: 64px; border-radius: 50%;
  background-size: cover; background-position: center;
  box-shadow: 0 0 0 5px #1a1a1a, 0 0 0 7px #2a2a2a, 0 0 0 8px #1a1a1a;
  z-index: 1; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.label-text {
  font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.5);
  text-align: center; line-height: 1.2; padding: 4px;
  word-break: break-all; pointer-events: none;
}

/* 黑胶表面光点粒子 */
.vinyl-sparkles { position: absolute; inset: 0; pointer-events: none; }
.spark {
  position: absolute; width: 2px; height: 2px;
  background: rgba(255,255,255,0.5); border-radius: 50%;
  animation: spark-fade 1.8s ease-in-out infinite;
  box-shadow: 0 0 4px rgba(255,255,255,0.3);
}
@keyframes spark-fade {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.8); }
}

.vinyl-stage.playing .vinyl-disc { right: -30px; animation: spin-wobble 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
/* 带偏心的旋转（模拟唱片不完美居中） */
@keyframes spin-wobble {
  0% { transform: rotate(0deg) translate(0, 0); }
  25% { transform: rotate(90deg) translate(1px, 0.5px); }
  50% { transform: rotate(180deg) translate(0, 1px); }
  75% { transform: rotate(270deg) translate(-0.5px, 0.5px); }
  100% { transform: rotate(360deg) translate(0, 0); }
}

/* 沉浸模式提示 */
.immersive-hint {
  font-size: 11px; color: rgba(255,255,255,0.15);
  transition: color 0.3s;
}
.vinyl-stage:hover + .immersive-hint { color: rgba(255,255,255,0.35); }

/* ===== 沉浸模式 ===== */
.playlist-panel, .lyrics-panel { transition: opacity 0.3s ease, transform 0.3s ease; }
.music-layout.immersive { max-width: 600px; transition: max-width 0.4s ease; }
.music-layout.immersive .player-panel {
  width: 100%; border-radius: 24px; transition: width 0.4s ease, border-radius 0.4s ease;
}
.music-layout.immersive .playlist-panel,
.music-layout.immersive .lyrics-panel {
  opacity: 0; transform: scale(0.95); pointer-events: none;
}
.music-layout.immersive .vinyl-stage {
  width: 340px; height: 320px; transition: width 0.4s ease, height 0.4s ease;
}
.music-layout.immersive .album-cover {
  width: 280px; height: 280px; transition: width 0.4s ease, height 0.4s ease;
}
.music-layout.immersive .vinyl-disc {
  width: 260px; height: 260px; transition: width 0.4s ease, height 0.4s ease, right 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.music-layout.immersive .vinyl-label {
  width: 80px; height: 80px; transition: width 0.4s ease, height 0.4s ease;
}
.music-layout.immersive .now-title { font-size: 26px; transition: font-size 0.4s ease; }

/* 沉浸模式自动隐藏 UI */
.player-inner.hide-ui .visualizer,
.player-inner.hide-ui .song-meta,
.player-inner.hide-ui .progress-wrap,
.player-inner.hide-ui .controls,
.player-inner.hide-ui .bottom-row,
.player-inner.hide-ui .player-hints,
.player-inner.hide-ui .immersive-lyric-line { opacity: 0; transition: opacity 0.6s ease; pointer-events: none; }
.player-inner.hide-ui .vinyl-stage { transform: scale(1.08); transition: transform 0.8s ease; }

/* 沉浸模式：当前歌词行（唱片上方不遮挡） */
.immersive-lyric-line {
  text-align: center; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: opacity 0.6s ease;
}
.player-inner.hide-ui .immersive-lyric-line { opacity: 0; }
.imm-text {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.55);
  text-shadow: 0 0 8px rgba(0,0,0,0.6);
}
.imm-trans-text {
  font-size: 11px; color: rgba(255,255,255,0.3);
}

/* 快捷键提示 */
.player-hints { display: flex; align-items: center; gap: 12px; margin-top: -8px; }
.immersive-hint { font-size: 11px; color: rgba(255,255,255,0.15); transition: color 0.3s; }
.player-inner:hover .immersive-hint { color: rgba(255,255,255,0.35); }
.shortcut-toggle { font-size: 11px; color: rgba(255,255,255,0.15); cursor: pointer; transition: color 0.3s; }
.shortcut-toggle:hover { color: rgba(255,255,255,0.5); }

/* 快捷键面板 */
.shortcuts-panel {
  position: absolute; inset: 0; z-index: 40;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  border-radius: 20px; display: flex; align-items: center; justify-content: center;
}
.shortcuts-card {
  background: rgba(20,26,38,0.95); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; padding: 20px 24px; min-width: 220px;
}
.shortcuts-card h4 { font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 14px; text-align: center; }
.shortcut-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 12px; color: rgba(255,255,255,0.5); }
kbd {
  display: inline-block; padding: 2px 7px; border-radius: 4px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.7); font-size: 11px; font-family: inherit;
  min-width: 28px; text-align: center;
}
.shortcuts-close {
  display: block; margin: 14px auto 0; padding: 6px 20px; border-radius: 8px;
  border: none; background: rgba(255,255,255,0.1); color: #fff;
  font-size: 12px; cursor: pointer; transition: background 0.2s;
}
.shortcuts-close:hover { background: rgba(255,255,255,0.18); }

/* 频谱可视化 */
.visualizer { display: flex; align-items: flex-end; justify-content: center; gap: 2px; height: 40px; opacity: 0.25; transition: opacity 0.5s; }
.visualizer.active { opacity: 0.55; }
.viz-bar {
  width: 3px; min-height: 6px; background: rgba(255,255,255,0.6); border-radius: 2px;
  transition: height 0.08s ease;
}

.song-meta { text-align: center; max-width: 100%; transition: opacity 0.6s ease; position: relative; }
.now-playing-label { font-size: 9px; letter-spacing: 3px; color: rgba(255,255,255,0.25); font-weight: 600; text-transform: uppercase; }
.now-title { font-size: 22px; font-weight: 700; color: #fff; margin: 2px 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.now-artist { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }
.up-next { font-size: 11px; color: rgba(255,255,255,0.2); margin: 4px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 切歌通知浮层 */
.song-toast {
  position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 12px;
  background: rgba(255,255,255,0.1); backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.1); z-index: 30;
  pointer-events: none; white-space: nowrap;
}
.toast-icon { font-size: 16px; }
.toast-title { display: block; font-size: 12px; font-weight: 600; color: #fff; }
.toast-artist { display: block; font-size: 10px; color: rgba(255,255,255,0.4); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.4s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

.progress-wrap { display: flex; align-items: center; gap: 10px; width: 100%; cursor: pointer; user-select: none; transition: opacity 0.6s ease; }
.time-label { font-size: 11px; color: rgba(255,255,255,0.3); width: 32px; text-align: center; font-variant-numeric: tabular-nums; flex-shrink: 0; cursor: pointer; transition: color 0.2s; }
.time-label:hover { color: rgba(255,255,255,0.6); }
.progress-bar { flex: 1; height: 28px; display: flex; align-items: center; position: relative; }
.progress-bar::before { content: ''; position: absolute; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; }
.progress-fill { position: absolute; left: 0; height: 3px; background: rgba(255,255,255,0.6); border-radius: 2px; transition: width 0.1s linear; z-index: 2; }
.progress-buffer { position: absolute; left: 0; height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; z-index: 1; transition: width 0.3s ease; }
.progress-bar:hover .progress-fill { background: #fff; height: 4px; }
.progress-thumb { position: absolute; top: 50%; width: 10px; height: 10px; background: #fff; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s; box-shadow: 0 1px 6px rgba(0,0,0,0.3); pointer-events: none; }
.progress-bar:hover .progress-thumb { opacity: 1; }
/* 进度条悬停时间提示 */
.progress-tooltip {
  position: absolute; top: -22px; transform: translateX(-50%);
  padding: 2px 8px; border-radius: 6px;
  background: rgba(0,0,0,0.8); color: #fff; font-size: 10px;
  font-variant-numeric: tabular-nums; pointer-events: none;
  white-space: nowrap; z-index: 5;
}

.controls { display: flex; align-items: center; gap: 20px; transition: opacity 0.6s ease; }
.ctrl-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; color: rgba(255,255,255,0.55); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ctrl-btn:hover { color: #fff; transform: scale(1.06); }
.ctrl-btn:active { transform: scale(0.94); }
.play-btn { width: 62px; height: 62px; border-radius: 50%; border: none; background: #fff; color: #0a0e14; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,0,0,0.4); transition: all 0.2s; position: relative; }
.play-btn:hover { transform: scale(1.05); box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
.play-btn:active { transform: scale(0.94); }
/* 播放时脉冲光环 */
.play-btn.pulsing::after {
  content: ''; position: absolute; inset: -8px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25);
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0.15; }
  100% { transform: scale(1.6); opacity: 0; }
}
@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}
.side { width: 32px; height: 32px; color: rgba(255,255,255,0.25); position: relative; }
.side:hover { color: rgba(255,255,255,0.6); }
.side.on { color: #0a0e14; background: #fff; }
.side.on:hover { color: #0a0e14; background: #fff; }
.repeat-badge {
  position: absolute; bottom: 1px; right: 1px;
  font-size: 8px; font-weight: 900; color: #0a0e14;
}

.bottom-row { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; }
.volume-wrap { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.3); transition: opacity 0.6s ease; }
.vol-slider { -webkit-appearance: none; appearance: none; width: 100px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer; }
.vol-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }

/* 睡眠定时器 */
.sleep-timer { position: relative; }
.sleep-btn {
  display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08); background: transparent;
  color: rgba(255,255,255,0.3); font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.sleep-btn:hover { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.15); }
.sleep-btn.active { color: #fff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
.sleep-menu {
  position: absolute; bottom: calc(100% + 8px); right: 0;
  background: rgba(16,20,28,0.95); backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  padding: 6px; display: flex; flex-direction: column; gap: 2px;
  min-width: 100px; z-index: 50;
}
.sleep-menu button {
  padding: 6px 12px; border-radius: 8px; border: none; background: transparent;
  color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer; text-align: left;
  transition: all 0.15s; white-space: nowrap;
}
.sleep-menu button:hover { background: rgba(255,255,255,0.06); color: #fff; }
.sleep-menu button.on { color: #fff; background: rgba(255,255,255,0.1); font-weight: 600; }
.sleep-menu button.cancel { color: rgba(255,100,100,0.5); }
.sleep-menu button.cancel:hover { color: #ff5c5c; }

.empty-state { text-align: center; }
.empty-visual { position: relative; width: 120px; height: 120px; margin: 0 auto 20px; }
.empty-disc { font-size: 72px; display: block; opacity: 0.3; filter: grayscale(0.5); animation: float 3s ease-in-out infinite; }
.empty-note { position: absolute; font-size: 18px; opacity: 0.2; }
.empty-note.n1 { top: 8px; right: 20px; animation: float-note 2.5s ease-in-out infinite; }
.empty-note.n2 { top: 40px; right: 0; animation: float-note 3s ease-in-out 0.5s infinite; }
.empty-note.n3 { top: 20px; left: 8px; animation: float-note 2s ease-in-out 1s infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes float-note { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; } 50% { transform: translateY(-12px) scale(1.3); opacity: 0.4; } }
.empty-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.3); margin: 0 0 6px; }
.empty-desc { font-size: 13px; color: rgba(255,255,255,0.2); margin: 0; }
.empty-formats { font-size: 10px; color: rgba(255,255,255,0.12); margin: 8px 0 0 !important; letter-spacing: 1px; }

/* ========== 右侧：歌词面板 ========== */
.lyrics-panel {
  width: 400px; min-width: 400px; position: relative;
  background: rgba(10,14,20,0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 20px;
  display: flex; flex-direction: column; overflow: hidden;
}
.lyrics-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 18px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.lyrics-panel-header h3 { font-size: 14px; font-weight: 700; color: #fff; margin: 0; }
.lyric-paste-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.4); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.25s;
}
.lyric-paste-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }

.lyrics-body {
  flex: 1; overflow-y: auto; padding: 16px 22px 40px; scroll-behavior: smooth;
  mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
}
.lyrics-body::-webkit-scrollbar { width: 3px; }
.lyrics-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }

.lyric-line {
  padding: 8px 0; margin: 0;
  font-size: 17px; color: rgba(255,255,255,0.16);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.8; display: flex; flex-direction: column;
}
.lyric-line.active {
  color: #fff; font-size: 22px; font-weight: 700;
  text-shadow: 0 0 20px rgba(255,255,255,0.12);
}
.lyric-line.past { color: rgba(255,255,255,0.06); }
.lyric-trans { font-size: 13px; color: rgba(255,255,255,0.25); font-weight: 400; margin-top: 2px; }
.lyric-line.active .lyric-trans { color: rgba(255,255,255,0.5); font-size: 14px; }

.lyrics-body.plain { padding-top: 24px; scroll-behavior: auto; }
.lyric-line.plain-line { font-size: 15px; color: rgba(255,255,255,0.45); padding: 5px 0; font-weight: 400; }

.lyric-trans-block {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 12px; color: rgba(255,255,255,0.25);
  line-height: 2; white-space: pre-wrap;
}

.lyrics-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  color: rgba(255,255,255,0.18); font-size: 13px; padding: 24px;
}
.lyric-paste-btn-large {
  margin-top: 4px; padding: 6px 20px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.35); font-size: 12px; cursor: pointer; transition: all 0.25s;
}
.lyric-paste-btn-large:hover { color: #fff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }

/* ========== 歌词编辑弹窗 ========== */
.lyric-editor-overlay { position: absolute; inset: 0; z-index: 10; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); border-radius: 20px; display: flex; align-items: center; justify-content: center; }
.lyric-editor { width: 90%; max-width: 380px; display: flex; flex-direction: column; gap: 10px; }
.lyric-editor h4 { font-size: 14px; font-weight: 600; color: #fff; margin: 0; text-align: center; }
.lyric-editor textarea { width: 100%; height: 220px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: #fff; font-size: 12px; font-family: monospace; resize: vertical; outline: none; line-height: 1.6; }
.lyric-editor textarea:focus { border-color: rgba(255,255,255,0.25); }
.lyric-editor-acts { display: flex; gap: 8px; justify-content: flex-end; }
.lyric-editor-acts button { padding: 7px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.08); }
.lyric-cancel { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.45); }
.lyric-cancel:hover { background: rgba(255,255,255,0.06); color: #fff; }
.lyric-save { background: #fff; color: #000; border: none !important; }
.lyric-save:hover { background: rgba(255,255,255,0.88); }

@media (max-width: 960px) {
  .music-layout { flex-direction: column; height: auto; max-width: 480px; }
  .playlist-panel { width: 100%; min-width: 0; max-height: 240px; }
  .player-panel { width: 100%; min-width: 0; }
  .lyrics-panel { width: 100%; min-width: 0; max-height: 320px; }
  .vinyl-stage { width: 240px; height: 220px; }
  .album-cover { width: 190px; height: 190px; }
  .vinyl-disc { width: 170px; height: 170px; }
}
</style>
