'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { myDocsPath } from '../fs'
import { MenuBar, XPButton } from '../ui'
import { playClick, playError, unlockAudio } from '../sounds'

/* 声音 - 录音机：真实麦克风录音（getUserMedia + MediaRecorder + 波形可视化） */

/* 录音保存到登录帐户的 My Music（每帐户独立，调用时解析） */
const myMusicNow = () => [...myDocsPath(useXP.getState().sessionUser), 'My Music']

type Mode = 'idle' | 'recording' | 'recorded' | 'playing' | 'stopped'

function RecButton({ kind, title, onClick, disabled, active }: { kind: 'rew' | 'fwd' | 'play' | 'stop' | 'rec'; title: string; onClick?: () => void; disabled?: boolean; active?: boolean }) {
  const colors: Record<string, string> = {
    rew: '#c8c8c8',
    fwd: '#c8c8c8',
    play: active ? '#2a8f2a' : '#3a6a3a',
    stop: '#8a2a2a',
    rec: '#c02020',
  }
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`w-[30px] h-[26px] rounded-[3px] flex items-center justify-center border ${active ? 'border-[#c88a30] bg-gradient-to-b from-[#fbd5a0] to-[#f0b060]' : 'border-[#8a867e] bg-gradient-to-b from-[#f4f2e8] to-[#dcd8c8] hover:border-[#c88a30]'} ${disabled ? 'opacity-40' : ''}`}
      onClick={onClick}
    >
      {kind === 'rew' ? (
        <svg width="18" height="14" viewBox="0 0 18 14">
          <path d="M4 7 h8" stroke={colors.rew} strokeWidth="1.6" />
          <path d="M3.2 7 L6.4 3.6 L6.4 10.4 Z" fill={colors.rew} />
        </svg>
      ) : kind === 'fwd' ? (
        <svg width="18" height="14" viewBox="0 0 18 14">
          <path d="M14 7 h-8" stroke={colors.rew} strokeWidth="1.6" />
          <path d="M14.8 7 L11.6 3.6 L11.6 10.4 Z" fill={colors.rew} />
        </svg>
      ) : kind === 'play' ? (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M3 2 L12 7 L3 12 Z" fill={colors.play} />
        </svg>
      ) : kind === 'stop' ? (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" fill={colors.stop} />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5" fill={colors.rec} />
          <circle cx="7" cy="7" r="2" fill="#fff" opacity="0.3" />
        </svg>
      )}
    </button>
  )
}

export default function SoundRecorder({ win }: { win: WinState }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [hasBlob, setHasBlob] = useState(false)
  const [dur, setDur] = useState(0)
  const [pos, setPos] = useState(0)
  const [level, setLevel] = useState<number[]>([])
  const [saved, setSaved] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [gainDb, setGainDb] = useState(0)
  const [reversed, setReversed] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timerRef = useRef<number | null>(null)

  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const saveAudioBlob = useXP((s) => s.saveAudioBlob)
  const fsCreateFile = useXP((s) => s.fsCreateFile)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopTimer()
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  /* 波形绘制 */
  const drawWave = (data: number[], playPos = 0, total = 1) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const w = cv.width
    const h = cv.height
    ctx.fillStyle = '#0a3a0a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#2a7a2a'
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    if (data.length > 0) {
      ctx.strokeStyle = '#3af03a'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      const n = data.length
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w
        const y = h / 2 - data[i] * (h / 2 - 2)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    /* 播放位置线 */
    if (playPos > 0 && total > 0) {
      const x = (playPos / total) * w
      ctx.strokeStyle = '#f0d040'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
  }

  useEffect(() => {
    drawWave(level, mode === 'playing' ? pos : 0, dur)
  }, [level, pos, dur, mode])

  /* ── 开始录音 ── */
  const startRecord = async () => {
    if (mode === 'recording') return
    unlockAudio()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = audioCtxRef.current ?? new AudioContext()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      analyserRef.current = analyser

      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' })
        setHasBlob(true)
        /* 解码出波形 */
        blobRef.current
          .arrayBuffer()
          .then((ab) => ctx.decodeAudioData(ab))
          .then((buf) => {
            const ch = buf.getChannelData(0)
            const peaks: number[] = []
            const step = Math.max(1, Math.floor(ch.length / 200))
            for (let i = 0; i < ch.length; i += step) {
              let mx = 0
              for (let j = 0; j < step && i + j < ch.length; j++) mx = Math.max(mx, Math.abs(ch[i + j]))
              peaks.push(mx)
            }
            setLevel(peaks)
          })
          .catch(() => setLevel([]))
      }
      rec.start(100)
      mediaRef.current = rec
      setMode('recording')
      setSaved(false)
      setDur(0)
      setPos(0)
      setMicError(null)

      /* 实时波形 + 计时 */
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        let mx = 0
        for (let i = 0; i < buf.length; i++) mx = Math.max(mx, Math.abs(buf[i] - 128) / 128)
        setLevel((prev) => [...prev.slice(-199), mx])
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)

      timerRef.current = window.setInterval(() => {
        setDur((d) => {
          if (d >= 60) {
            stopRecord()
            return 60
          }
          return d + 0.1
        })
      }, 100)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMicError(msg)
      playError()
      openApp('dialog', {
        kind: 'error',
        title: '录音机',
        text: `无法访问录音设备。\n\n${msg}\n\n请检查麦克风连接与浏览器权限（本页面需要 HTTPS 或 localhost 环境）。`,
      })
    }
  }

  const stopRecord = () => {
    if (mode !== 'recording') return
    mediaRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    cancelAnimationFrame(rafRef.current)
    stopTimer()
    setMode('recorded')
    setPos(0)
    playClick()
  }

  /* ── 播放 ── */
  const play = () => {
    if (!blobRef.current) return
    unlockAudio()
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current = null
    }
    const url = URL.createObjectURL(blobRef.current)
    const el = new Audio(url)
    el.playbackRate = speed
    const gain = Math.pow(10, gainDb / 20)
    if (reversed) {
      /* 反转播放：先解码反转 */
      const ctx = audioCtxRef.current ?? new AudioContext()
      audioCtxRef.current = ctx
      blobRef.current.arrayBuffer().then((ab) =>
        ctx.decodeAudioData(ab).then((buf) => {
          const rev = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate)
          for (let c = 0; c < buf.numberOfChannels; c++) {
            const src = buf.getChannelData(c)
            const dst = rev.getChannelData(c)
            for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i]
          }
          const src2 = ctx.createBufferSource()
          src2.buffer = rev
          src2.playbackRate.value = speed
          const g = ctx.createGain()
          g.gain.value = gain
          src2.connect(g).connect(ctx.destination)
          src2.start()
          audioElRef.current = null
          setMode('playing')
          const t0 = Date.now()
          const total = buf.duration / speed
          const iv = window.setInterval(() => {
            const p = (Date.now() - t0) / 1000
            setPos(Math.min(p, total))
            if (p >= total) {
              clearInterval(iv)
              setMode('recorded')
              setPos(0)
            }
          }, 50)
          /* 借用 audioEl 引用存放 interval 以便停止 */
          ;(el as unknown as { _iv?: number })._iv = iv
          timerRef.current = iv
        }),
      )
      return
    }
    el.volume = Math.min(1, Math.max(0, gain))
    el.onended = () => {
      setMode('recorded')
      setPos(0)
    }
    el.ontimeupdate = () => setPos(el.currentTime)
    el.play().catch(() => {})
    audioElRef.current = el
    setMode('playing')
    playClick()
  }

  const stopPlayback = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current = null
    }
    setMode('recorded')
    setPos(0)
    playClick()
  }

  /* ── 保存到 My Music ── */
  const saveFile = () => {
    if (!blobRef.current) {
      useXP.getState().showToast('请先录制一段声音')
      return
    }
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const name = `录音 ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}.wma`
    const MY_MUSIC = myMusicNow()
    const final = fsCreateFile(MY_MUSIC, name, { icon: 'audio', type: 'Windows 音频文件', size: `${Math.max(1, Math.ceil((blobRef.current.size || 1024) / 1024))} KB` })
    saveAudioBlob(`${MY_MUSIC.join('/')}/${final}`, URL.createObjectURL(blobRef.current))
    setSaved(true)
    playClick()
    useXP.getState().showToast(`已保存到 My Music：${final}（本会话内可播放）`)
  }

  const fmt = (t: number) => t.toFixed(2)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none xp-noclip">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建(N)', onClick: () => { blobRef.current = null; setLevel([]); setMode('idle'); setDur(0); setPos(0); setSaved(false) } },
              { label: '保存(S)', accelerator: 'Ctrl+S', onClick: saveFile },
              { label: '另存为(A)...', onClick: saveFile },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '插入文件(I)...', disabled: true },
              { label: '与文件混音(M)...', disabled: true },
            ],
          },
          {
            label: '效果(C)',
            items: [
              { label: '提高音量(按 25%)', onClick: () => { setGainDb((g) => Math.min(12, g + 2)); useXP.getState().showToast('音量 +25%（播放时生效）') } },
              { label: '降低音量(按 25%)', onClick: () => { setGainDb((g) => Math.max(-24, g - 2)); useXP.getState().showToast('音量 -25%（播放时生效）') } },
              { separator: true },
              { label: '加速(按 100%)', onClick: () => { setSpeed((s) => Math.min(4, s * 2)); useXP.getState().showToast('播放速度 ×2') } },
              { label: '减速(按 50%)', onClick: () => { setSpeed((s) => Math.max(0.5, s / 2)); useXP.getState().showToast('播放速度 ×0.5') } },
              { separator: true },
              { label: '反转(R)', checked: reversed, onClick: () => setReversed((r) => !r) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              {
                label: '关于录音机(A)',
                onClick: () => useXP.getState().openApp('about', { title: '关于录音机', text: '声音 - 录音机（Web 复刻版）\n版本 5.1 Build 2600\n\n使用真实麦克风录音（MediaRecorder），\n波形实时可视化，可保存到 My Music。' }),
              },
            ],
          },
        ]}
      />

      <div className="flex flex-col items-center px-4 py-3 gap-3">
        {/* 位置滑块 */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[11px] w-[80px] text-right text-[#3a3a2a]">位置:</span>
          <div className="xp-sunken bg-white flex-1 h-[14px] relative overflow-hidden">
            <div className="absolute top-[2px] left-0 right-0 h-[2px] bg-[#8a867e]/30" style={{ top: 5 }} />
            <div className="absolute top-0 w-[9px] h-[13px] bg-gradient-to-b from-[#f8f6ee] to-[#c8c6ba] border border-[#8a8878]" style={{ left: `${Math.min(98, (dur ? (pos / Math.max(dur, 0.01)) * 100 : 0))}%` }} />
          </div>
        </div>
        {/* 波形 */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[11px] w-[80px] text-right text-[#3a3a2a]">波形:</span>
          <div className="xp-sunken bg-[#0a3a0a] flex-1 h-[34px] overflow-hidden">
            <canvas ref={canvasRef} width={460} height={34} className="w-full h-full block" />
          </div>
        </div>
        {/* 按钮排 */}
        <div className="flex items-end justify-center gap-[7px] pt-1">
          <RecButton kind="rew" title="移至开头" disabled={mode === 'idle'} onClick={() => { setPos(0); playClick() }} />
          <RecButton kind="fwd" title="移至结尾" disabled={mode === 'idle'} onClick={() => { setPos(dur); playClick() }} />
          <RecButton kind="play" title="播放" disabled={mode !== 'recorded' || !hasBlob} active={mode === 'playing'} onClick={play} />
          <RecButton kind="stop" title="停止" disabled={mode === 'idle'} active={mode === 'recording' || mode === 'playing'} onClick={() => (mode === 'recording' ? stopRecord() : stopPlayback())} />
          <RecButton kind="rec" title="开始录音" active={mode === 'recording'} onClick={startRecord} />
        </div>
        {/* 长度 */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-[#3a3a2a]">
          <span>长度:</span>
          <span className="w-[56px] text-center">{fmt(dur)}</span>
          <span className="text-[#8a8a7a]">(可录制 60.0 秒)</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-4 pb-2 text-[10px] text-[#8a8a7a]">
        {micError ? `麦克风错误：${micError.slice(0, 60)}` : mode === 'idle' ? '单击红色按钮开始录音（需要麦克风权限）' : saved ? '已保存到 My Music' : `${mode === 'recording' ? '正在录音' : mode === 'playing' ? '正在播放' : '就绪'} · 速度 ×${speed} · ${reversed ? '反转' : '正常'}`}
      </div>
    </div>
  )
}
