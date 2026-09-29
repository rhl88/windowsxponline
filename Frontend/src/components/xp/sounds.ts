'use client'

/* XP 音效：真实采样优先（/media/snd/ 原版时长校验过的 XP 系统音），Web Audio 合成降级 */

const SND_BASE = '/media/snd/'

let ctx: AudioContext | null = null
let unlocked = false
let master: GainNode | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.72
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/* 主音量（0-100，由托盘滑块/音量控制面板联动） */
export function setMasterVolume(v: number) {
  const c = ac()
  if (c && master) {
    const g = Math.max(0, Math.min(1, v / 100))
    master.gain.setTargetAtTime(g, c.currentTime, 0.03)
  }
}

/* 首次用户手势后解锁音频（并预取开机两件套，保证登录音零延迟） */
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  ac()
  preloadSounds(['xp-startup.mp3', 'xp-logon.mp3'])
}

/* ─────────── 采样播放层（fetch + decodeAudioData + 缓存） ─────────── */

const bufCache = new Map<string, AudioBuffer>()
const inflight = new Map<string, Promise<AudioBuffer | null>>()

async function getBuffer(file: string): Promise<AudioBuffer | null> {
  const c = ac()
  if (!c) return null
  const hit = bufCache.get(file)
  if (hit) return hit
  const flying = inflight.get(file)
  if (flying) return flying
  const p = (async () => {
    try {
      const res = await fetch(SND_BASE + file)
      if (!res.ok) return null
      const ab = await res.arrayBuffer()
      const buf = await c.decodeAudioData(ab)
      bufCache.set(file, buf)
      return buf
    } catch {
      return null
    } finally {
      inflight.delete(file)
    }
  })()
  inflight.set(file, p)
  return p
}

/* 预取（欢迎屏挂载时调用可消掉开机音的首次网络延迟） */
export function preloadSounds(files: string[]) {
  files.forEach((f) => {
    void getBuffer(f)
  })
}

function playSample(file: string, gain = 1): Promise<boolean> {
  const c = ac()
  if (!c) return Promise.resolve(false)
  return getBuffer(file).then((buf) => {
    if (!buf) return false
    const src = c.createBufferSource()
    src.buffer = buf
    const g = c.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(master ?? c.destination)
    src.start()
    return true
  })
}

/* 采样优先，失败回落合成 */
function sampleOr(file: string, synth: () => void, gain = 1) {
  void playSample(file, gain).then((ok) => {
    if (!ok) synth()
  })
}

/* ─────────── 合成原语（降级方案） ─────────── */

interface ToneOpts {
  type?: OscillatorType
  gain?: number
  attack?: number
  decay?: number
  detune?: number
}

function tone(freq: number, start: number, dur: number, o: ToneOpts = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const osc2 = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.value = freq
  osc2.type = o.type ?? 'sine'
  osc2.frequency.value = freq
  osc2.detune.value = o.detune ?? 6
  const peak = o.gain ?? 0.18
  const attack = o.attack ?? 0.008
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  osc2.connect(g)
  g.connect(master ?? c.destination)
  osc.start(t0)
  osc2.start(t0)
  osc.stop(t0 + dur + 0.05)
  osc2.stop(t0 + dur + 0.05)
}

function noise(start: number, dur: number, vol = 0.05) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + start
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.value = vol
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = 2000
  src.connect(f)
  f.connect(g)
  g.connect(master ?? c.destination)
  src.start(t0)
}

/* ─────────── 公开音效（真实 XP 采样；合成体仅作离线降级） ─────────── */

/* 开机音乐（Bill Brown 管弦乐，真实 4.9s） */
export function playStartup() {
  sampleOr('xp-startup.mp3', () => {
    tone(116.54, 0.05, 2.4, { type: 'triangle', gain: 0.09, attack: 0.3 })
    tone(174.61, 0.05, 2.2, { type: 'triangle', gain: 0.07, attack: 0.3 })
    tone(587.33, 0.12, 1.3, { gain: 0.14 })
    tone(830.61, 0.38, 1.2, { gain: 0.12 })
    tone(987.77, 0.62, 1.2, { gain: 0.11 })
    tone(1244.5, 0.86, 1.5, { gain: 0.07 })
    tone(233.08, 1.15, 1.8, { type: 'triangle', gain: 0.08, attack: 0.4 })
  })
}

/* 关机音（下行） */
export function playShutdown() {
  sampleOr('xp-shutdown.mp3', () => {
    tone(830.61, 0, 0.7, { gain: 0.13 })
    tone(587.33, 0.22, 0.9, { gain: 0.12 })
    tone(293.66, 0.5, 1.6, { type: 'triangle', gain: 0.12, attack: 0.2 })
  })
}

/* 登录音 */
export function playLogon() {
  sampleOr('xp-logon.mp3', () => {
    tone(415.3, 0, 0.5, { gain: 0.12 })
    tone(587.33, 0.18, 0.8, { gain: 0.11 })
  })
}

/* 注销音 */
export function playLogoff() {
  sampleOr('xp-logoff.mp3', () => {
    tone(587.33, 0, 0.5, { gain: 0.12 })
    tone(415.3, 0.18, 0.8, { gain: 0.11 })
  })
}

/* 叮!（默认提示音） */
export function playDing() {
  sampleOr('xp-ding.wav', () => {
    tone(1046.5, 0, 0.35, { gain: 0.14 })
    tone(1568, 0.02, 0.4, { gain: 0.08 })
  })
}

/* 程序错误 */
export function playError() {
  sampleOr('xp-error.wav', () => {
    tone(392, 0, 0.28, { type: 'triangle', gain: 0.16 })
    tone(523.25, 0.13, 0.45, { type: 'triangle', gain: 0.14 })
  })
}

/* 异常停止（Critical Stop） */
export function playCritical() {
  sampleOr('xp-critical.wav', () => {
    tone(349.23, 0, 0.3, { type: 'triangle', gain: 0.16 })
    tone(466.16, 0.14, 0.45, { type: 'triangle', gain: 0.14 })
  })
}

/* 感叹（Exclamation 警告） */
export function playExclamation() {
  sampleOr('xp-exclamation.wav', () => {
    tone(523.25, 0, 0.25, { type: 'triangle', gain: 0.15 })
    tone(392, 0.12, 0.42, { type: 'triangle', gain: 0.13 })
  })
}

/* 气球通知（托盘气泡） */
export function playBalloon() {
  sampleOr('xp-balloon.mp3', () => playDingSynth())
}

/* 清空回收站 */
export function playRecycle() {
  sampleOr('xp-recycle.wav', () => {
    noise(0, 0.18, 0.07)
  })
}

/* 硬件插入/拔出 */
export function playHwInsert() {
  sampleOr('xp-hw-insert.wav', () => playDingSynth())
}
export function playHwRemove() {
  sampleOr('xp-hw-remove.wav', () => playDingSynth())
}

/* 弹出窗口已阻止 */
export function playPopupBlocked() {
  sampleOr('xp-popup-blocked.wav', () => playDingSynth())
}

/* 打印完成 */
export function playPrintDone() {
  sampleOr('xp-print-done.wav', () => playDingSynth())
}

/* 欢呼（任务完成向导收尾） */
export function playTada() {
  sampleOr('xp-tada.mp3', () => {
    tone(523.25, 0, 0.35, { gain: 0.15 })
    tone(659.26, 0.12, 0.35, { gain: 0.14 })
    tone(783.99, 0.24, 0.6, { gain: 0.13 })
  })
}

/* 和弦（chord） */
export function playChord() {
  sampleOr('xp-chord.mp3', () => {
    tone(523.25, 0, 0.5, { gain: 0.1 })
    tone(659.26, 0.02, 0.5, { gain: 0.1 })
    tone(783.99, 0.04, 0.55, { gain: 0.1 })
  })
}

function playDingSynth() {
  tone(1046.5, 0, 0.35, { gain: 0.14 })
  tone(1568, 0.02, 0.4, { gain: 0.08 })
}

/* 轻微点击声（XP 默认无声，保留为增强） */
export function playClick() {
  noise(0, 0.02, 0.035)
}

/* 菜单弹出（XP 默认无声，保留为增强） */
export function playMenu() {
  noise(0, 0.015, 0.02)
}

/* 最小化/还原窗口的嗖声（XP 默认无声，保留为增强） */
export function playWhoosh(down: boolean) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(down ? 900 : 300, t0)
  osc.frequency.exponentialRampToValueAtTime(down ? 280 : 950, t0 + 0.16)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
  osc.connect(g)
  g.connect(master ?? c.destination)
  osc.start(t0)
  osc.stop(t0 + 0.25)
}
