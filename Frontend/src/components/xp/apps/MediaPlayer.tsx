'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { WinState, CtxItem } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { playClick } from '../sounds'

/* ═══════════════════════════════════════════════════════════════
 * Windows Media Player 9 全模式复刻
 * 结构依据：真实 WMP8/9 full mode 截图（.zscripts/ref/wmp9b-3 等）
 *   标准 XP 标题栏 + 银白菜单栏 + 钢蓝左任务条（PIL 取色 #5b7ab3）
 *   + 深色可视化画布 + 银灰播放列表 + 深蓝底部传输控制台
 * 音源：Web Audio 芯片合成器（真实发声）
 * ═══════════════════════════════════════════════════════════════ */

/* ─────────── 曲目数据（媒体库内容） ─────────── */
interface Track {
  name: string
  artist: string
  genre: string
  bpm: number
  notes: Array<[number | null, number]> /* 频率或休止, 拍数 */
}

const N: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.66, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, G3: 196.0, C3: 130.81, E3: 164.81, F3: 174.61, A3: 220.0, B3: 246.94, D3: 146.83,
}

export const WMP_TRACKS: Track[] = [
  {
    name: 'XP 启动曲 (致敬改编)',
    artist: 'Bill Brown / Web Audio',
    genre: '管弦乐',
    bpm: 90,
    notes: [
      [N.G3, 1], [N.C4, 1], [N.E4, 1], [N.G4, 1],
      [N.E4, 0.5], [N.G4, 0.5], [N.C5, 1], [N.B4, 0.5], [N.G4, 0.5],
      [N.A4, 1], [N.F4, 1], [N.G4, 2], [null, 0.5],
      [N.E4, 0.5], [N.D4, 0.5], [N.C4, 1], [N.D4, 1], [N.E4, 1], [N.G3, 1],
      [N.C4, 1], [N.E4, 1], [N.C5, 2], [null, 1],
    ],
  },
  {
    name: 'Bliss 山坡小步舞曲',
    artist: '复刻版原创',
    genre: '轻音乐',
    bpm: 110,
    notes: [
      [N.C5, 0.5], [N.E5, 0.5], [N.G5, 0.5], [N.E5, 0.5], [N.C5, 1], [N.G4, 1],
      [N.A4, 0.5], [N.C5, 0.5], [N.E5, 0.5], [N.C5, 0.5], [N.A4, 1], [N.F4, 1],
      [N.F4, 0.5], [N.A4, 0.5], [N.C5, 0.5], [N.A4, 0.5], [N.F5, 1], [N.E5, 1],
      [N.D5, 1], [N.B4, 1], [N.C5, 2], [null, 0.5],
    ],
  },
  {
    name: '拨号上网之梦',
    artist: '56K 回忆协会',
    genre: '电子乐',
    bpm: 128,
    notes: [
      [N.E4, 0.25], [N.E4, 0.25], [N.G4, 0.5], [N.A4, 0.5], [N.C5, 0.5],
      [N.B4, 0.25], [N.A4, 0.25], [N.G4, 0.5], [N.E4, 0.5], [N.D4, 0.5],
      [N.C4, 0.5], [N.G3, 0.5], [N.C4, 1], [null, 0.25],
      [N.D4, 0.25], [N.F4, 0.25], [N.A4, 0.5], [N.G4, 0.5], [N.B4, 0.5],
      [N.C5, 0.5], [N.E5, 0.5], [N.C5, 1], [null, 0.5],
    ],
  },
  {
    name: '局域网派对',
    artist: '反恐精英电竞馆',
    genre: '摇滚',
    bpm: 140,
    notes: [
      [N.A3, 0.5], [N.A3, 0.5], [N.C4, 0.5], [N.A3, 0.5], [N.E4, 1],
      [N.D4, 0.5], [N.C4, 0.5], [N.A3, 1], [null, 0.25],
      [N.F3, 0.5], [N.F3, 0.5], [N.A3, 0.5], [N.F3, 0.5], [N.C4, 1],
      [N.B3, 0.5], [N.A3, 0.5], [N.G3, 1], [null, 0.25],
      [N.G3, 0.5], [N.C4, 0.5], [N.E4, 0.5], [N.G4, 0.5], [N.E4, 0.5], [N.C4, 0.5], [N.A3, 1],
    ],
  },
  {
    name: '回收站蓝调',
    artist: '已删除的文件们',
    genre: '蓝调',
    bpm: 76,
    notes: [
      [N.E3, 1.5], [N.G3, 0.5], [N.A3, 1], [N.G3, 0.5], [N.E3, 0.5],
      [N.D3, 1], [N.E3, 2], [null, 0.5],
      [N.C3, 1.5], [N.E3, 0.5], [N.G3, 1], [N.F3, 0.5], [N.E3, 0.5],
      [N.D3, 1], [N.C3, 2], [null, 1],
    ],
  },
]

function trackDuration(t: Track): number {
  return t.notes.reduce((s, [, b]) => s + b * (60 / t.bpm), 0)
}
function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ─────────── 合成器引擎（Web Audio 芯片音源） ─────────── */
class Player {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  analyser: AnalyserNode | null = null
  timer: ReturnType<typeof setInterval> | null = null
  private i = 0
  private nextTime = 0
  private track: Track | null = null
  private startCtxTime = 0
  private seekBase = 0
  private pausedAt = 0
  private vol = 0.5
  private muted = false
  playing = false

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.vol
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 64
      this.master.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return true
  }

  setVolume(v: number) {
    this.vol = Math.max(0, Math.min(1, v))
    if (this.master && !this.muted) this.master.gain.value = this.vol
  }
  setMute(m: boolean) {
    this.muted = m
    if (this.master) this.master.gain.value = m ? 0 : this.vol
  }

  elapsed(): number {
    if (!this.ctx || !this.track) return this.pausedAt
    if (this.playing) return Math.min(trackDuration(this.track), this.seekBase + (this.ctx.currentTime - this.startCtxTime))
    return this.pausedAt
  }

  play(track: Track, fromSec = 0) {
    if (!this.ensure()) return
    this.halt()
    this.track = track
    this.playing = true
    this.seekBase = Math.max(0, fromSec)
    this.startCtxTime = this.ctx!.currentTime + 0.08
    this.pausedAt = this.seekBase
    /* 定位到目标秒数的音符索引 */
    const beat = 60 / track.bpm
    let acc = 0
    this.i = 0
    for (let k = 0; k < track.notes.length; k++) {
      if (acc >= this.seekBase - 1e-6) { this.i = k; break }
      acc += track.notes[k][1] * beat
      this.i = k + 1
    }
    if (this.i >= track.notes.length) this.i = 0
    this.nextTime = this.startCtxTime + Math.max(0, 0)
    this.timer = setInterval(() => this.pump(), 60)
  }

  pause() {
    if (!this.playing) return
    this.pausedAt = this.elapsed()
    this.halt()
  }

  seek(sec: number) {
    if (!this.track) return
    const t = Math.max(0, Math.min(trackDuration(this.track) - 0.2, sec))
    if (this.playing) this.play(this.track, t)
    else this.pausedAt = t
  }

  stop() {
    this.halt()
    this.pausedAt = 0
    this.track = null
  }

  private halt() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.playing = false
  }

  private pump() {
    if (!this.ctx || !this.track) return
    const beat = 60 / this.track.bpm
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      if (this.i >= this.track.notes.length) this.i = 0
      const [freq, beats] = this.track.notes[this.i]
      if (freq && this.master) {
        const t = Math.max(this.nextTime, this.ctx.currentTime + 0.005)
        const dur = beats * beat
        const osc = this.ctx.createOscillator()
        const osc2 = this.ctx.createOscillator()
        const g = this.ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        osc2.type = 'triangle'
        osc2.frequency.value = freq / 2
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92)
        osc.connect(g)
        osc2.connect(g)
        g.connect(this.master)
        osc.start(t)
        osc2.start(t)
        osc.stop(t + dur)
        osc2.stop(t + dur)
      }
      this.nextTime += beats * beat
      this.i++
    }
  }
}

/* ─────────── 任务条图标（WMP 圆形光泽图标） ─────────── */
function TaskGlyph({ kind }: { kind: string }) {
  const wrap = (children: React.ReactNode, bg: string, rim: string) => (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill={bg} stroke={rim} strokeWidth="1.2" />
      <ellipse cx="9.5" cy="7.2" rx="5.6" ry="3" fill="rgba(255,255,255,0.45)" />
      {children}
    </svg>
  )
  switch (kind) {
    case 'now': return wrap(<path d="M9 7.5 L17 12 L9 16.5 Z" fill="#fff" stroke="#1a3a7a" strokeWidth="1" />, '#3a78d8', '#1c4a9c')
    case 'guide': return wrap(<><circle cx="12" cy="12" r="4.6" fill="none" stroke="#fff" strokeWidth="1.3" /><path d="M7.4 12 a4.6 4.6 0 0 1 9.2 0 M12 7.4 v9.2" fill="none" stroke="#fff" strokeWidth="1.1" /></>, '#2a9c58', '#146030')
    case 'rip': return wrap(<><circle cx="12" cy="12" r="6.4" fill="#e8ecf4" stroke="#7a8494" strokeWidth="0.8" /><circle cx="12" cy="12" r="1.4" fill="#5a6478" /><path d="M19 5 L14.5 9.5" stroke="#2a8f3a" strokeWidth="1.6" /></>, '#8a94a8', '#4a5468')
    case 'library': return wrap(<><rect x="6.5" y="6" width="4" height="12" rx="1" fill="#fff" stroke="#1a3a7a" strokeWidth="0.8" /><rect x="11.5" y="7.5" width="4" height="10.5" rx="1" fill="#d8e8f8" stroke="#1a3a7a" strokeWidth="0.8" /><path d="M8.5 9 l0 5 M8.5 9 l-1.4 1.4 M8.5 9 l1.4 1.4" stroke="#2a5fc0" strokeWidth="0.9" fill="none" /></>, '#4a86d8', '#1c4a9c')
    case 'radio': return wrap(<><rect x="5.5" y="9" width="13" height="8" rx="1.6" fill="#fff" stroke="#6a4a10" strokeWidth="0.9" /><circle cx="9" cy="13" r="2" fill="none" stroke="#c07818" strokeWidth="1" /><path d="M13 11 h4 M13 13 h4 M8 9 L18 4" stroke="#6a4a10" strokeWidth="1" /></>, '#e0a838', '#8a6210')
    case 'burn': return wrap(<><circle cx="12" cy="12" r="6.4" fill="#e8ecf4" stroke="#7a8494" strokeWidth="0.8" /><circle cx="12" cy="12" r="1.4" fill="#5a6478" /><path d="M5 5 L9.5 9.5" stroke="#d04828" strokeWidth="1.6" /></>, '#c05848', '#7a2a1a')
    case 'skin': return wrap(<><path d="M8 6.5 Q12 4.5 16 6.5 L15 15 Q12 17 9 15 Z" fill="#fff" stroke="#5a2a8a" strokeWidth="0.9" /><path d="M10.5 9.5 l1.5 3 l1.5-3" fill="none" stroke="#8a3ac8" strokeWidth="1.1" /></>, '#8a5ac8', '#4a2a78')
    default: return wrap(<path d="M9 7.5 L17 12 L9 16.5 Z" fill="#fff" />, '#3a78d8', '#1c4a9c')
  }
}

/* ─────────── 传输控制按钮 ─────────── */
function TBtn({ title, onClick, active, small, children }: {
  title: string
  onClick: () => void
  active?: boolean
  small?: boolean
  children: React.ReactNode
}) {
  const sz = small ? 'w-[21px] h-[21px]' : 'w-[25px] h-[25px]'
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`${sz} rounded-[4px] flex items-center justify-center shrink-0 transition-transform active:translate-y-[1px]`}
      style={{
        background: active
          ? 'linear-gradient(to bottom, #7ab0f0, #2a5fc0)'
          : 'linear-gradient(to bottom, #f4f7fb, #b8c4d4 55%, #98a6ba)',
        border: '1px solid #2a3a54',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.45)',
      }}
    >
      {children}
    </button>
  )
}

/* ─────────── XP 风滑条（定位/音量共用） ─────────── */
function WmpSlider({ ratio, onSeek, width, grow, ariaLabel }: { ratio: number; onSeek: (r: number) => void; width?: number; grow?: boolean; ariaLabel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const emit = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (clientX - r.left) / r.width)))
  }
  useEffect(() => {
    const mv = (e: PointerEvent) => { if (drag.current) emit(e.clientX) }
    const up = () => { drag.current = false }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
  })
  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(ratio * 100)}
      className={`relative rounded-full cursor-pointer ${grow ? 'flex-1 min-w-[60px]' : 'shrink-0'}`}
      style={{ width, height: 11, background: 'linear-gradient(to bottom, #060a14, #1a2438)', border: '1px solid #3a4a68', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.7)' }}
      onPointerDown={(e) => { drag.current = true; emit(e.clientX) }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 rounded-full overflow-hidden"
        style={{ width: `${ratio * 100}%`, background: 'linear-gradient(to bottom, #9ad4fc, #3a86d8 60%, #2a6ac0)' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-[2px]"
        style={{
          left: `calc(${ratio * 100}% - 5px)`,
          width: 10, height: 15,
          background: 'linear-gradient(to bottom, #fdfdff, #c8d2e0 50%, #a8b4c8)',
          border: '1px solid #3a4a68',
          boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}

/* ─────────── 主组件 ─────────── */
type WmpView = 'now' | 'guide' | 'rip' | 'library' | 'radio' | 'burn' | 'skin'

export default function MediaPlayer({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openApp = useXP((s) => s.openApp)
  const [player] = useState<Player>(() => new Player())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [view, setView] = useState<WmpView>('now')
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [elapsed, setElapsed] = useState(0)
  const [, forceTick] = useState(0)

  const track = WMP_TRACKS[cur]
  const total = trackDuration(track)

  /* 播放控制 */
  const startPlay = useCallback((idx: number, fromSec = 0) => {
    player.play(WMP_TRACKS[idx], fromSec)
    setPlaying(true)
  }, [player])

  const togglePlay = useCallback(() => {
    if (playing) {
      player.pause()
      setPlaying(false)
    } else {
      startPlay(cur, player.elapsed() >= total - 0.3 ? 0 : player.elapsed())
    }
  }, [playing, player, cur, total, startPlay])

  const doStop = useCallback(() => {
    player.stop()
    setPlaying(false)
    setElapsed(0)
  }, [player])

  const jump = useCallback((dir: 1 | -1) => {
    let next: number
    if (shuffle) {
      do { next = Math.floor(Math.random() * WMP_TRACKS.length) } while (WMP_TRACKS.length > 1 && next === cur)
    } else {
      next = (cur + dir + WMP_TRACKS.length) % WMP_TRACKS.length
    }
    setCur(next)
    if (playing) startPlay(next)
  }, [cur, shuffle, playing, startPlay])

  /* 曲目自然结束 → 重复/下一曲 */
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(player.elapsed())
      if (player.playing && player.elapsed() >= total - 0.05) {
        if (repeat) {
          startPlay(cur)
        } else {
          const next = (cur + 1) % WMP_TRACKS.length
          setCur(next)
          startPlay(next)
        }
      }
      forceTick((n) => n + 1)
    }, 250)
    return () => clearInterval(iv)
  }, [player, total, repeat, cur, startPlay])

  useEffect(() => {
    return () => player.stop()
  }, [player])

  /* 可视化：条形与波峰 */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx2 = cv.getContext('2d')!
    let raf = 0
    const data = new Uint8Array(32)
    const peaks = new Array(28).fill(0)
    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx2.clearRect(0, 0, cv.width, cv.height)
      if (player.analyser && playing) player.analyser.getByteFrequencyData(data)
      const n = 28
      const bw = cv.width / n
      for (let i = 0; i < n; i++) {
        const raw = playing ? data[i] / 255 : 0.04 + Math.sin(Date.now() / 700 + i * 0.7) * 0.03
        const h = Math.max(3, raw * (cv.height - 16))
        const grad = ctx2.createLinearGradient(0, cv.height, 0, cv.height - h)
        grad.addColorStop(0, '#8ad8fc')
        grad.addColorStop(0.35, '#38a8f0')
        grad.addColorStop(0.75, '#1868d0')
        grad.addColorStop(1, '#0a3a90')
        ctx2.fillStyle = grad
        const bx = i * bw + 1.5
        const bwd = Math.max(2, bw - 4)
        ctx2.fillRect(bx, cv.height - h - 6, bwd, h)
        /* 底部辉光 */
        const glow = ctx2.createLinearGradient(0, cv.height - 6, 0, cv.height)
        glow.addColorStop(0, 'rgba(140,220,255,0.55)')
        glow.addColorStop(1, 'rgba(140,220,255,0)')
        ctx2.fillStyle = glow
        ctx2.fillRect(bx, cv.height - h - 6, bwd, h)
        /* 波峰帽：缓慢下落 */
        peaks[i] = Math.max(h, peaks[i] - 0.7)
        ctx2.fillStyle = '#d8f0ff'
        ctx2.fillRect(bx, cv.height - peaks[i] - 9, bwd, 2)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing, player])

  /* 音量 */
  useEffect(() => {
    player.setVolume(volume)
    player.setMute(muted)
  }, [volume, muted, player])

  const tasks: Array<{ key: WmpView; label: string; icon: string }> = [
    { key: 'now', label: '正在播放', icon: 'now' },
    { key: 'guide', label: '媒体指南', icon: 'guide' },
    { key: 'rip', label: '从 CD 复制', icon: 'rip' },
    { key: 'library', label: '媒体库', icon: 'library' },
    { key: 'radio', label: '收音机调谐器', icon: 'radio' },
    { key: 'burn', label: '复制到 CD 或设备', icon: 'burn' },
    { key: 'skin', label: '皮肤选择器', icon: 'skin' },
  ]

  const goto: CtxItem[] = tasks.map((t) => ({
    label: t.label,
    checked: view === t.key,
    onClick: () => { setView(t.key); playClick() },
  }))

  return (
    <div className="flex flex-col h-full select-none overflow-hidden">
      {/* ── 菜单栏（银白渐变，真实 WMP9 配色） ── */}
      <div style={{ background: 'linear-gradient(to bottom, #f7f9fb, #e2e7ee 70%, #d4dae2)' }} className="border-b border-[#a8b2be] shrink-0">
        <MenuBar
          compact
          menus={[
            {
              label: '文件(F)',
              items: [
                { label: '打开(U)...', accelerator: 'Ctrl+O', onClick: () => { setView('library'); showToast('请从媒体库中选择曲目播放') } },
                { label: '关闭(C)', onClick: () => closeWindow(win.id) },
                { separator: true },
                { label: '退出(X)', onClick: () => closeWindow(win.id) },
              ],
            },
            {
              label: '查看(V)',
              items: [
                { label: '转到(G)', submenu: goto },
                { separator: true },
                { label: '完整模式(F)', checked: true, onClick: () => showToast('已在完整模式中') },
                { label: '外观模式(S)', onClick: () => showToast('外观模式（皮肤）在完整版 WMP 中提供，复刻版以完整模式呈现') },
                { separator: true },
                { label: '刷新(E)', accelerator: 'F5', onClick: () => { forceTick((n) => n + 1); showToast('视图已刷新') } },
              ],
            },
            {
              label: '播放(P)',
              items: [
                { label: playing ? '暂停(P)' : '播放(P)', accelerator: 'Ctrl+P', onClick: togglePlay },
                { label: '停止(S)', accelerator: 'Ctrl+S', onClick: doStop },
                { separator: true },
                { label: '快退(R)', onClick: () => player.seek(player.elapsed() - 5) },
                { label: '快进(F)', onClick: () => player.seek(player.elapsed() + 5) },
                { separator: true },
                {
                  label: '无序播放(S)',
                  checked: shuffle,
                  onClick: () => setShuffle((v) => !v),
                },
                { label: '重复(R)', checked: repeat, onClick: () => setRepeat((v) => !v) },
                { separator: true },
                { label: '增大音量(U)', onClick: () => setVolume((v) => Math.min(1, v + 0.2)) },
                { label: '减小音量(D)', onClick: () => setVolume((v) => Math.max(0, v - 0.2)) },
                { label: '静音(M)', checked: muted, onClick: () => setMuted((m) => !m) },
              ],
            },
            {
              label: '工具(T)',
              items: [
                { label: '选项(O)...', onClick: () => showToast('选项对话框：播放机/复制音乐/设备/性能 选项卡在复刻版中省略') },
                { label: '下载插件(D)...', onClick: () => showToast('可视化效果与插件商店已随 MSN 服务器退役') },
                { separator: true },
                { label: '许可证管理(L)...', onClick: () => showToast('没有受保护的媒体（2001 年的美好年代）') },
              ],
            },
            {
              label: '帮助(H)',
              items: [
                { label: '关于 Windows Media Player(A)', onClick: () => openApp('about', { title: '关于 Windows Media Player', text: 'Microsoft® Windows Media Player\n版本 9.00.00.2980\n\nMicrosoft® Windows® Operating System\n版权所有 (C) 1985-2003 Microsoft Corp.\n\n本复刻版的音源为 Web Audio 实时合成，\n可视化效果为「条形与波峰」。\n\n物理内存可用：524,288 KB' }) },
              ],
            },
          ]}
        />
      </div>

      {/* ── 主体：左任务条 + 右内容 ── */}
      <div className="flex-1 flex min-h-0">
        {/* 左任务条（钢蓝渐变，PIL 取色自真实截图 #5b7ab3） */}
        <div
          className="w-[148px] shrink-0 flex flex-col pt-2 gap-[3px] pr-[6px] pl-[4px]"
          style={{
            background: 'linear-gradient(to bottom, #6f8ecb, #5b7ab3 30%, #4a68a4 80%, #3e5890)',
            borderRight: '1px solid #2a4370',
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.25)',
          }}
        >
          {tasks.map((t) => {
            const active = view === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setView(t.key); playClick() }}
                className="flex items-center gap-2 rounded-[3px] pl-[6px] pr-1 py-[5px] text-left"
                style={{
                  background: active
                    ? 'linear-gradient(to bottom, #a4c2f2, #6a94d8 60%, #5a86cc)'
                    : 'transparent',
                  border: active ? '1px solid #e8f0fc' : '1px solid transparent',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,20,60,0.3)' : undefined,
                }}
              >
                <TaskGlyph kind={t.icon} />
                <span className="text-[11px] font-bold text-white truncate" style={{ textShadow: '0 1px 1px rgba(0,20,60,0.6)' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
          <div className="flex-1" />
          <div className="pb-2 pl-1 text-[9px] text-[#c8d8f4]/80" style={{ textShadow: '0 1px 1px rgba(0,20,60,0.6)' }}>
            Windows Media Player
          </div>
        </div>

        {/* ── 右内容区 ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {view === 'now' ? (
            <div className="flex-1 flex min-h-0">
              {/* 可视化画布 */}
              <div
                className="flex-1 relative min-w-0 flex flex-col"
                style={{ background: 'radial-gradient(ellipse at 50% 20%, #16244e 0%, #0a1128 55%, #04070f 100%)' }}
              >
                <div className="pt-2 px-3 shrink-0">
                  <div className="text-white text-[13px] font-bold truncate" style={{ fontFamily: "'Trebuchet MS', sans-serif", textShadow: '0 1px 3px rgba(0,0,40,0.8)' }}>
                    {track.name}
                  </div>
                  <div className="text-[#8aa8d8] text-[10px] truncate">{track.artist} · {track.genre}</div>
                </div>
                <div className="flex-1 min-h-0 p-2">
                  <canvas ref={canvasRef} width={520} height={200} className="w-full h-full block" />
                </div>
                <div className="px-3 pb-1 text-[9px] text-[#5a7ab0] shrink-0">条形与波峰</div>
              </div>
              {/* 播放列表窗格 */}
              <div className="w-[196px] shrink-0 flex flex-col border-l border-[#8a94a4]" style={{ background: '#d8dde6' }}>
                <div className="px-2 py-[3px] text-[11px] font-bold text-[#1a2a4a] border-b border-[#b8c0cc]" style={{ background: 'linear-gradient(to bottom, #eef1f5, #d4dae2)' }}>
                  正在播放列表
                </div>
                <div className="flex text-[10px] text-[#4a5468] border-b border-[#b8c0cc] bg-[#e6eaef]">
                  <div className="flex-1 px-2 py-[2px] border-r border-[#c4ccd6]">标题</div>
                  <div className="w-[38px] text-center py-[2px]">长度</div>
                </div>
                <div className="flex-1 overflow-y-auto xp-thin-scroll">
                  {WMP_TRACKS.map((t, i) => (
                    <button
                      key={t.name}
                      type="button"
                      className={`w-full flex items-center text-[11px] text-left border-b border-[#e4e8ee] ${i === cur ? 'text-white' : 'text-[#1a2a4a] hover:bg-[#c8d4e8]'}`}
                      style={i === cur ? { background: 'linear-gradient(to bottom, #5a9ce0, #2a6ac8)' } : undefined}
                      onClick={() => { setCur(i); startPlay(i) }}
                    >
                      <span className="flex-1 px-2 py-[3px] truncate">{t.name}</span>
                      <span className="w-[38px] text-center text-[10px] opacity-80">{fmtTime(trackDuration(t))}</span>
                    </button>
                  ))}
                </div>
                <div className="px-2 py-[2px] text-[10px] text-right text-[#4a5468] border-t border-[#b8c0cc] bg-[#e6eaef]">
                  总时间 {fmtTime(WMP_TRACKS.reduce((s, t) => s + trackDuration(t), 0))}
                </div>
              </div>
            </div>
          ) : (
            <WmpPane view={view} track={track} cur={cur} onPlay={(i) => { setCur(i); startPlay(i); setView('now') }} showToast={showToast} />
          )}

          {/* ── 底部传输控制台（深蓝渐变控制台，WMP9 标志性元素） ── */}
          <div
            className="shrink-0 pt-[6px] pb-[7px] px-3 flex flex-col gap-[5px]"
            style={{
              background: 'linear-gradient(to bottom, #232f47, #121a2c 45%, #070b14)',
              borderTop: '1px solid #4a5f8a',
              boxShadow: 'inset 0 1px 0 rgba(120,160,220,0.25)',
            }}
          >
            {/* 定位滑条 + 时间 */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#a8c4e8] w-[64px] text-right" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>{fmtTime(elapsed)}</span>
              <WmpSlider ratio={total > 0 ? Math.min(1, elapsed / total) : 0} onSeek={(r) => player.seek(r * total)} grow ariaLabel="定位" />
              <span className="text-[10px] text-[#7a9ac8] w-[64px]" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>{fmtTime(total)}</span>
            </div>
            {/* 按钮排 */}
            <div className="flex items-center gap-[7px]">
              <TBtn title="切换到外观模式" small onClick={() => showToast('外观模式（皮肤）在完整版 WMP 中提供')} >
                <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke="#2a3a54" strokeWidth="1.3" /><path d="M4 6 h4 M6 4 v4" stroke="#2a3a54" strokeWidth="1.1" /></svg>
              </TBtn>
              <TBtn title="全屏" small onClick={() => showToast('全屏可视化在完整版 WMP 中按 Alt+Enter 进入')}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 4 V1.5 H4 M8 1.5 h2.5 V4 M10.5 8 v2.5 H8 M4 10.5 H1.5 V8" fill="none" stroke="#2a3a54" strokeWidth="1.3" /></svg>
              </TBtn>
              <div className="w-[5px]" />
              <TBtn title="无序播放" small active={shuffle} onClick={() => setShuffle((v) => !v)}>
                <svg width="13" height="12" viewBox="0 0 13 12"><path d="M1 3 h2.5 l6 6 H12 M12 3 h-2.5 l-1.7 1.7 M12 9 l-2 -2" fill="none" stroke={shuffle ? '#fff' : '#2a3a54'} strokeWidth="1.2" /><path d="M10.5 1.5 L12.5 3 L10.5 4.5 M10.5 7.5 L12.5 9 L10.5 10.5" fill="none" stroke={shuffle ? '#fff' : '#2a3a54'} strokeWidth="1" /></svg>
              </TBtn>
              <TBtn title="重复" small active={repeat} onClick={() => setRepeat((v) => !v)}>
                <svg width="13" height="12" viewBox="0 0 13 12"><path d="M3 2.5 h6.5 a2 2 0 0 1 2 2 v0.5 M10 9.5 H3.5 a2 2 0 0 1 -2 -2 V7" fill="none" stroke={repeat ? '#fff' : '#2a3a54'} strokeWidth="1.2" /><path d="M1.8 3.4 L3.2 1.8 L4.6 3.4 M11.2 8.6 L9.8 10.2 L8.4 8.6" fill="none" stroke={repeat ? '#fff' : '#2a3a54'} strokeWidth="1" /></svg>
              </TBtn>
              <div className="w-[5px]" />
              <TBtn title="停止" onClick={doStop}>
                <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1.5" y="1.5" width="8" height="8" fill="#2a3a54" /></svg>
              </TBtn>
              <TBtn title="上一个" onClick={() => jump(-1)}>
                <svg width="14" height="12" viewBox="0 0 14 12"><path d="M12 1.5 L5 6 L12 10.5 Z" fill="#2a3a54" /><rect x="2" y="1.5" width="1.8" height="9" fill="#2a3a54" /></svg>
              </TBtn>
              <button
                type="button"
                title={playing ? '暂停' : '播放'}
                aria-label={playing ? '暂停' : '播放'}
                onClick={togglePlay}
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-transform active:translate-y-[1px]"
                style={{
                  background: 'radial-gradient(circle at 35% 28%, #9ad0fc, #3a7fd8 55%, #1c4a9c)',
                  border: '1px solid #16386e',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                {playing ? (
                  <svg width="12" height="13" viewBox="0 0 12 13"><rect x="1.5" y="1" width="3.2" height="11" fill="#fff" /><rect x="7.3" y="1" width="3.2" height="11" fill="#fff" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 1 L11.5 6.5 L2 12 Z" fill="#fff" /></svg>
                )}
              </button>
              <TBtn title="下一个" onClick={() => jump(1)}>
                <svg width="14" height="12" viewBox="0 0 14 12"><path d="M2 1.5 L9 6 L2 10.5 Z" fill="#2a3a54" /><rect x="10.2" y="1.5" width="1.8" height="9" fill="#2a3a54" /></svg>
              </TBtn>
              <div className="flex-1" />
              <TBtn title={muted ? '取消静音' : '静音'} small onClick={() => setMuted((m) => !m)}>
                {muted ? (
                  <svg width="13" height="12" viewBox="0 0 13 12"><path d="M1 4.5 h2 L6 1.8 v8.4 L3 7.5 H1 Z" fill="#2a3a54" /><path d="M8 3.5 l4 5 M12 3.5 l-4 5" stroke="#c02818" strokeWidth="1.4" /></svg>
                ) : (
                  <svg width="13" height="12" viewBox="0 0 13 12"><path d="M1 4.5 h2 L6 1.8 v8.4 L3 7.5 H1 Z" fill="#2a3a54" /><path d="M8 3.8 q1.6 2.2 0 4.4 M9.8 2.4 q2.6 3.6 0 7.2" fill="none" stroke="#2a3a54" strokeWidth="1.1" /></svg>
                )}
              </TBtn>
              <WmpSlider ratio={muted ? 0 : volume} onSeek={(r) => { setVolume(r); if (r > 0) setMuted(false) }} width={64} ariaLabel="音量" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── 次要视图窗格（媒体指南/CD 复制/媒体库/收音机/刻录/皮肤） ─────────── */
function WmpPane({ view, track, cur, onPlay, showToast }: {
  view: WmpView
  track: Track
  cur: number
  onPlay: (i: number) => void
  showToast: (t: string) => void
}) {
  const header = (
    <div className="px-3 py-[5px] flex items-center gap-2 border-b border-[#8a94a4]" style={{ background: 'linear-gradient(to bottom, #5a7ab8, #44618e)' }}>
      <span className="text-white text-[12px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,20,60,0.6)' }}>
        {view === 'guide' ? '媒体指南' : view === 'rip' ? '从 CD 复制' : view === 'library' ? '媒体库' : view === 'radio' ? '收音机调谐器' : view === 'burn' ? '复制到 CD 或设备' : '皮肤选择器'}
      </span>
    </div>
  )
  const body = (() => {
    if (view === 'library') {
      return (
        <div className="flex flex-col h-full bg-white">
          <div className="flex text-[10px] text-[#4a5468] bg-[#e6eaef] border-b border-[#b8c0cc] font-bold">
            <div className="flex-1 px-2 py-[3px] border-r border-[#c4ccd6]">标题</div>
            <div className="w-[120px] px-2 py-[3px] border-r border-[#c4ccd6]">艺术家</div>
            <div className="w-[80px] px-2 py-[3px] border-r border-[#c4ccd6]">流派</div>
            <div className="w-[52px] px-2 py-[3px]">长度</div>
          </div>
          {WMP_TRACKS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onDoubleClick={() => onPlay(i)}
              onClick={() => onPlay(i)}
              className={`flex items-center text-[11px] text-left border-b border-[#f0f2f6] ${i === cur ? 'bg-[#cfe0f5]' : 'hover:bg-[#eef3fa]'}`}
            >
              <span className="flex-1 px-2 py-[3px] truncate">{t.name}</span>
              <span className="w-[120px] px-2 py-[3px] truncate text-[#4a5468]">{t.artist}</span>
              <span className="w-[80px] px-2 py-[3px] truncate text-[#4a5468]">{t.genre}</span>
              <span className="w-[52px] px-2 py-[3px] text-[#4a5468]">{fmtTime(trackDuration(t))}</span>
            </button>
          ))}
          <div className="mt-auto px-2 py-1 text-[10px] text-[#8a94a4] border-t border-[#e4e8ee]">双击曲目开始播放 · 共 {WMP_TRACKS.length} 项</div>
        </div>
      )
    }
    if (view === 'rip') {
      return (
        <div className="h-full bg-[#eef1f5] p-3 text-[11px] text-[#1a2a4a] flex flex-col gap-2 overflow-y-auto xp-thin-scroll">
          <div className="font-bold">音频 CD (E:) — 未命名</div>
          {WMP_TRACKS.map((t, i) => (
            <label key={t.name} className="flex items-center gap-2 py-[2px] cursor-pointer hover:bg-[#dce6f4] px-1 rounded-[2px]">
              <input type="checkbox" defaultChecked={i < 2} className="accent-[#2a6ac8]" />
              <span className="w-[16px] text-[#4a5468]">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 truncate">曲目 {i + 1}（{t.name}）</span>
              <span className="text-[#4a5468]">{fmtTime(trackDuration(t))}</span>
            </label>
          ))}
          <button type="button" className="mt-2 self-start px-4 h-[24px] text-[11px] rounded-[3px] text-white" style={{ background: 'linear-gradient(to bottom, #5a9ce0, #2a6ac8)', border: '1px solid #1c4a9c' }} onClick={() => showToast('已开始复制到「我的音乐」（复刻版音源为合成器，无需光驱）')}>
            复制音乐
          </button>
        </div>
      )
    }
    if (view === 'radio') {
      const stations = ['中央人民广播电台 · 经典音乐', 'MusicRadio 音乐之声', '北京交通广播 FM103.9', '上海流行音乐 FM101.7', '国际电台 Hit FM', '乡村电台 · 青草地频道']
      return (
        <div className="h-full bg-[#eef1f5] p-3 text-[11px] text-[#1a2a4a] flex flex-col gap-1 overflow-y-auto xp-thin-scroll">
          <div className="font-bold mb-1">我的电台预设</div>
          {stations.map((s, i) => (
            <button key={s} type="button" className="flex items-center gap-2 py-[4px] px-1 rounded-[2px] hover:bg-[#dce6f4] text-left" onClick={() => showToast(`正在连接 ${s}……（56K 调制解调器努力缓冲中）`)}>
              <span className="w-[14px] h-[14px] rounded-full shrink-0" style={{ background: 'radial-gradient(circle at 35% 30%, #f0b040, #a06010)' }} />
              <span className="flex-1 truncate">{s}</span>
              <span className="text-[10px] text-[#4a5468]">{88 + i}.{'0'} MHz</span>
            </button>
          ))}
          <div className="mt-auto text-[10px] text-[#8a94a4] pt-2">电台流由 MSN 广播服务提供（2003）</div>
        </div>
      )
    }
    if (view === 'burn') {
      return (
        <div className="h-full bg-[#eef1f5] p-3 text-[11px] text-[#1a2a4a] flex flex-col">
          <div className="font-bold">要复制的音乐（CD-R 700MB）</div>
          <div className="mt-2 border border-[#b8c0cc] bg-white rounded-[3px] flex-1 flex items-center justify-center text-[#8a94a4]">
            将「媒体库」中的曲目拖到此处以创建刻录列表
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="px-4 h-[24px] rounded-[3px] text-white" style={{ background: 'linear-gradient(to bottom, #5a9ce0, #2a6ac8)', border: '1px solid #1c4a9c' }} onClick={() => showToast('请插入空白 CD-R（检测到光驱托盘为空）')}>复制</button>
            <span className="text-[#4a5468]">设备：Lite-On LTR-24102B (E:)</span>
          </div>
        </div>
      )
    }
    if (view === 'skin') {
      const skins = [
        ['默认', 'steel'], ['原子', 'purple'], ['木偶', 'brown'], ['重击', 'red'],
        ['不可思议', 'teal'], ['复古', 'green'], ['深度', 'navy'], ['小精灵', 'orange'],
      ] as const
      return (
        <div className="h-full bg-[#eef1f5] p-3 overflow-y-auto xp-thin-scroll">
          <div className="text-[11px] font-bold text-[#1a2a4a] mb-2">当前外观：默认（完整模式）</div>
          <div className="grid grid-cols-4 gap-2">
            {skins.map(([name, hue]) => (
              <button
                key={name}
                type="button"
                className="rounded-[4px] overflow-hidden border border-[#8a94a4] hover:border-[#2a6ac8]"
                onClick={() => showToast(`已选定「${name}」外观 — 按查看→外观模式预览（复刻版保留完整模式）`)}
              >
                <div className="h-[44px] flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${({ steel: 215, purple: 270, brown: 28, red: 4, teal: 180, green: 120, navy: 232, orange: 32 })[hue]} 55%, 45%), hsl(${({ steel: 215, purple: 270, brown: 28, red: 4, teal: 180, green: 120, navy: 232, orange: 32 })[hue]} 40%, 25%))` }}>
                  <span className="w-[18px] h-[18px] rounded-full border border-white/60 flex items-center justify-center text-white text-[8px]">▶</span>
                </div>
                <div className="text-[10px] text-[#1a2a4a] bg-[#dce2ea] py-[2px] text-center">{name}</div>
              </button>
            ))}
          </div>
        </div>
      )
    }
    /* guide */
    return (
      <div className="h-full bg-[#eef1f5] p-3 text-[11px] text-[#1a2a4a] overflow-y-auto xp-thin-scroll">
        <div className="rounded-[4px] border border-[#8a94a4] overflow-hidden">
          <div className="px-3 py-2 text-white font-bold" style={{ background: 'linear-gradient(to right, #2a6ac8, #5a9ce0)' }}>MSN 音乐媒体指南</div>
          <div className="p-3 grid grid-cols-2 gap-2 bg-white">
            {['本周新碟首发', '华语流行榜', '古典殿堂', '摇滚阵地', '电影原声', '怀旧金曲 90s'].map((c) => (
              <button key={c} type="button" className="px-2 py-2 rounded-[3px] hover:bg-[#dce6f4] text-left flex items-center gap-2" onClick={() => showToast(`「${c}」频道内容由 MSN 服务器提供（已于 2014 年退役）`)}>
                <span className="w-[26px] h-[26px] rounded-[3px] shrink-0" style={{ background: 'linear-gradient(135deg, #5a9ce0, #2a6ac8)' }} />
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 text-[10px] text-[#8a94a4]">提示：本地媒体库中已有 {WMP_TRACKS.length} 首合成曲目，正在播放「{track.name}」</div>
      </div>
    )
  })()
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {header}
      <div className="flex-1 min-h-0">{body}</div>
    </div>
  )
}
