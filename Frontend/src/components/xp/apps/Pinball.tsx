'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { playClick, playDing } from '../sounds'

const W = 320
const H = 540

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

interface Bumper {
  x: number
  y: number
  r: number
  lit: number
  pts: number
}

const KEY_L = ['ArrowLeft', 'z', 'Z', 'a', 'A']
const KEY_R = ['ArrowRight', '/', 'm', 'M', "'"]

export default function Pinball({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [balls, setBalls] = useState(3)
  const [msg, setMsg] = useState('按住空格蓄力，松开发射')
  const [running, setRunning] = useState(true)
  const msgRef = useRef('按住空格蓄力，松开发射')
  const runningRef = useRef(true)
  useEffect(() => {
    msgRef.current = msg
  }, [msg])
  useEffect(() => {
    runningRef.current = running
  }, [running])

  /* 游戏状态（不驱动渲染的放 ref） */
  const ballRef = useRef<Ball | null>(null)
  const scoreRef = useRef(0)
  const ballsRef = useRef(3)
  const flipL = useRef(0) /* 0..1 */
  const flipR = useRef(0)
  const flipUpL = useRef(false)
  const flipUpR = useRef(false)
  const plunger = useRef(0)
  const plungerHold = useRef(false)
  const bumpersRef = useRef<Bumper[]>([
    { x: W / 2 - 62, y: 118, r: 22, lit: 0, pts: 2500 },
    { x: W / 2, y: 86, r: 22, lit: 0, pts: 3000 },
    { x: W / 2 + 62, y: 118, r: 22, lit: 0, pts: 2500 },
  ])
  const targetRef = useRef<Array<{ x: number; y: number; w: number; h: number; lit: number }>>([
    { x: 34, y: 220, w: 10, h: 34, lit: 0 },
    { x: W - 44, y: 220, w: 10, h: 34, lit: 0 },
    { x: 60, y: 190, w: 34, h: 10, lit: 0 },
    { x: W - 94, y: 190, w: 34, h: 10, lit: 0 },
  ])
  const keysRef = useRef<Set<string>>(new Set())
  const rafRef = useRef(0)
  const lastRef = useRef(0)

  const placeBall = () => {
    ballRef.current = { x: W - 26, y: H - 76, vx: 0, vy: 0, r: 8 }
    plunger.current = 0
  }

  const resetBall = () => {
    placeBall()
    setMsg('按住空格蓄力，松开发射')
    msgRef.current = '按住空格蓄力，松开发射'
  }

  const newGame = () => {
    scoreRef.current = 0
    ballsRef.current = 3
    setScore(0)
    setBalls(3)
    resetBall()
    playClick()
  }

  /* 键盘 */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      if (e.key === ' ') {
        e.preventDefault()
        if (ballRef.current && ballRef.current.y > H - 90) plungerHold.current = true
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
      if (e.key === ' ') {
        e.preventDefault()
        if (plungerHold.current && ballRef.current && ballRef.current.y > H - 90) {
          const power = 7 + plunger.current * 10
          ballRef.current.vy = -power
          ballRef.current.vx = -0.6 - Math.random() * 0.5
        }
        plungerHold.current = false
        plunger.current = 0
      }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  /* 主循环 */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!

    const addScore = (n: number) => {
      scoreRef.current += n
      setScore(scoreRef.current)
    }

    const step = (t: number) => {
      const dt = Math.min(32, t - (lastRef.current || t))
      lastRef.current = t
      const b = ballRef.current

      if (!runningRef.current) {
        draw(ctx, b)
        rafRef.current = requestAnimationFrame(step)
        return
      }

      /* 蓄力 */
      if (plungerHold.current) plunger.current = Math.min(1, plunger.current + dt * 0.002)

      /* 挡板 */
      const wantL = [...keysRef.current].some((k) => KEY_L.includes(k))
      const wantR = [...keysRef.current].some((k) => KEY_R.includes(k))
      flipUpL.current = wantL
      flipUpR.current = wantR
      flipL.current = Math.max(0, Math.min(1, flipL.current + (wantL ? dt * 0.02 : -dt * 0.02)))
      flipR.current = Math.max(0, Math.min(1, flipR.current + (wantR ? dt * 0.02 : -dt * 0.02)))

      if (b) {
        /* 重力（发射槽内不落下） */
        if (!(b.y > H - 90 && b.x > W - 46)) b.vy += dt * 0.018
        else if (b.vy < 0) b.vy += dt * 0.018

        b.x += b.vx * (dt / 16)
        b.y += b.vy * (dt / 16)

        /* 墙壁 */
        if (b.x < b.r + 8) {
          b.x = b.r + 8
          b.vx = Math.abs(b.vx) * 0.85
        }
        if (b.x > W - b.r - 8) {
          b.x = W - b.r - 8
          b.vx = -Math.abs(b.vx) * 0.85
        }
        if (b.y < b.r + 60) {
          b.y = b.r + 60
          b.vy = Math.abs(b.vy) * 0.85
        }

        /* 弧形顶导流 */
        const cx = W / 2
        if (b.y < 150) {
          const dx = b.x - cx
          const dy = b.y - 120
          const dist = Math.hypot(dx, dy)
          if (dist < 120 && dist > 0.01) {
            const nx = dx / dist
            const ny = dy / dist
            if (dist < 108) {
              b.x = cx + nx * 108
              b.y = 120 + ny * 108
              const dot = b.vx * nx + b.vy * ny
              b.vx -= 2 * dot * nx
              b.vy -= 2 * dot * ny
              b.vx *= 0.96
              b.vy *= 0.96
            }
          }
        }

        /* bumpers */
        for (const bp of bumpersRef.current) {
          const dx = b.x - bp.x
          const dy = b.y - bp.y
          const dist = Math.hypot(dx, dy)
          if (dist < bp.r + b.r) {
            const nx = dx / (dist || 1)
            const ny = dy / (dist || 1)
            b.x = bp.x + nx * (bp.r + b.r)
            b.y = bp.y + ny * (bp.r + b.r)
            const sp = Math.max(5, Math.hypot(b.vx, b.vy))
            b.vx = nx * sp * 1.05
            b.vy = ny * sp * 1.05
            if (bp.lit <= 0) addScore(bp.pts)
            bp.lit = 12
          }
        }

        /* 目标灯 */
        for (const tg of targetRef.current) {
          if (b.x > tg.x - b.r && b.x < tg.x + tg.w + b.r && b.y > tg.y - b.r && b.y < tg.y + tg.h + b.r) {
            if (tg.lit <= 0) addScore(5000)
            tg.lit = 20
            /* 弹开 */
            const cxT = tg.x + tg.w / 2
            const cyT = tg.y + tg.h / 2
            const nx = (b.x - cxT) / (Math.abs(b.x - cxT) || 1)
            const ny = (b.y - cyT) / (Math.abs(b.y - cyT) || 1)
            b.vx += nx * 3
            b.vy += ny * 3
          }
        }

        /* 挡板碰撞（简化为斜线段） */
        const flY = H - 58
        const hitFlipper = (side: 'L' | 'R') => {
          const up = side === 'L' ? flipL.current : flipR.current
          const baseX = side === 'L' ? 62 : W - 62
          const dir = side === 'L' ? 1 : -1
          /* 挡板从 baseX 向中心延伸 64px，抬起时角度 -35° */
          const ang = up * 0.6
          const ex = baseX + dir * 64 * Math.cos(ang)
          const ey = flY + 64 * Math.sin(ang) * -0 + up * -18
          /* 点到线段距离 */
          const px = b.x
          const py = b.y
          const dx = ex - baseX
          const dy = ey - flY
          const len2 = dx * dx + dy * dy
          const tt = Math.max(0, Math.min(1, ((px - baseX) * dx + (py - flY) * dy) / (len2 || 1)))
          const cxp = baseX + tt * dx
          const cyp = flY + tt * dy
          const dist = Math.hypot(px - cxp, py - cyp)
          if (dist < b.r + 6) {
            const nx = (px - cxp) / (dist || 1)
            const ny = (py - cyp) / (dist || 1)
            b.x = cxp + nx * (b.r + 6)
            b.y = cyp + ny * (b.r + 6)
            const sp = Math.max(6.5, Math.hypot(b.vx, b.vy) * 1.1)
            b.vx = nx * sp + dir * 2.2 * up
            b.vy = -Math.abs(sp * 0.9) + up * -2.5
            addScore(100)
          }
        }
        hitFlipper('L')
        hitFlipper('R')

        /* 内墙（防侧漏） */
        if (b.y > H - 92 && b.x < 58) {
          b.x = 58
          b.vx = Math.abs(b.vx) * 0.8
        }

        /* 落水口 */
        if (b.y > H + 20) {
          ballsRef.current -= 1
          setBalls(ballsRef.current)
          if (ballsRef.current <= 0) {
            setMsg('游戏结束！3 球已用完')
            ballRef.current = null
            playDing()
          } else {
            resetBall()
            setMsg(`球损失！剩余 ${ballsRef.current} 球`)
          }
        }
      }

      /* 绘制 */
      draw(ctx, b)
      rafRef.current = requestAnimationFrame(step)
    }

    const draw = (ctx: CanvasRenderingContext2D, b: Ball | null) => {
      /* 太空主题桌面 */
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0a1440')
      g.addColorStop(0.5, '#101a50')
      g.addColorStop(1, '#0a1028')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      /* 星星 */
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 40; i++) {
        const sx = (i * 89 + 13) % W
        const sy = (i * 137 + 41) % 200
        if ((i * 31 + 7) % 5 === 0) ctx.fillRect(sx, sy, 2, 2)
        else ctx.fillRect(sx, sy, 1, 1)
      }

      /* 外墙 */
      ctx.strokeStyle = '#6070b0'
      ctx.lineWidth = 7
      ctx.strokeRect(8, 60, W - 16, H - 68)
      /* 顶弧 */
      ctx.beginPath()
      ctx.arc(W / 2, 120, 116, Math.PI * 0.98, Math.PI * 2.02)
      ctx.stroke()

      /* 分数标题 */
      ctx.fillStyle = '#a0b8f0'
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif'
      ctx.fillText('3D PINBALL', 12, 26)
      ctx.fillStyle = '#f0d040'
      ctx.font = 'bold 16px "Trebuchet MS", sans-serif'
      ctx.fillText(`分数 ${scoreRef.current.toLocaleString()}`, 12, 46)
      ctx.fillStyle = '#f04040'
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif'
      ctx.fillText(`球 ${ballsRef.current}`, W - 50, 46)
      ctx.fillStyle = '#7a90c8'
      ctx.font = '10px "Trebuchet MS", sans-serif'
      ctx.fillText('← → 挡板 · 空格发射', W - 150, 26)

      /* bumpers（太空浮标） */
      for (const bp of bumpersRef.current) {
        const lit = bp.lit > 0
        const rg = ctx.createRadialGradient(bp.x - 5, bp.y - 5, 2, bp.x, bp.y, bp.r)
        rg.addColorStop(0, lit ? '#e0f0ff' : '#8090c0')
        rg.addColorStop(0.6, lit ? '#40a0ff' : '#3848a0')
        rg.addColorStop(1, '#0a1440')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = lit ? '#c0e0ff' : '#6070b0'
        ctx.lineWidth = 2
        ctx.stroke()
        if (bp.lit > 0) bp.lit--
        /* 灯圈 */
        ctx.strokeStyle = bp.lit > 0 ? '#ffd040' : '#203060'
        ctx.beginPath()
        ctx.arc(bp.x, bp.y, bp.r + 5, 0, Math.PI * 2)
        ctx.stroke()
      }

      /* 目标灯 */
      for (const tg of targetRef.current) {
        ctx.fillStyle = tg.lit > 0 ? '#ffd040' : '#304070'
        ctx.fillRect(tg.x, tg.y, tg.w, tg.h)
        if (tg.lit > 0) tg.lit--
        ctx.strokeStyle = '#6070b0'
        ctx.lineWidth = 1
        ctx.strokeRect(tg.x, tg.y, tg.w, tg.h)
      }

      /* 发射槽 */
      ctx.strokeStyle = '#6070b0'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(W - 40, 170)
      ctx.lineTo(W - 40, H - 100)
      ctx.stroke()
      /* 发射器 */
      const py = H - 40 - plunger.current * 26
      ctx.fillStyle = plungerHold.current ? '#ffd040' : '#8090c0'
      ctx.fillRect(W - 34, py, 16, 26)
      ctx.fillStyle = '#a0b8f0'
      ctx.font = '10px "Trebuchet MS", sans-serif'
      ctx.fillText('▲', W - 32, py - 6)

      /* 挡板 */
      const drawFlipper = (side: 'L' | 'R') => {
        const up = side === 'L' ? flipL.current : flipR.current
        const baseX = side === 'L' ? 62 : W - 62
        const dir = side === 'L' ? 1 : -1
        const ang = up * 0.6
        const flY = H - 58
        const ex = baseX + dir * 64 * Math.cos(ang)
        const ey = flY - up * 18
        const fg = ctx.createLinearGradient(baseX, flY, ex, ey)
        fg.addColorStop(0, '#b0c0f0')
        fg.addColorStop(1, '#5060a0')
        ctx.strokeStyle = fg
        ctx.lineCap = 'round'
        ctx.lineWidth = 12
        ctx.beginPath()
        ctx.moveTo(baseX, flY)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        ctx.strokeStyle = '#c0d0ff'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(baseX, flY - 3)
        ctx.lineTo(ex, ey - 3)
        ctx.stroke()
      }
      drawFlipper('L')
      drawFlipper('R')
      /* 挡板轴心 */
      ctx.fillStyle = '#304070'
      for (const ax of [62, W - 62]) {
        ctx.beginPath()
        ctx.arc(ax, H - 58, 7, 0, Math.PI * 2)
        ctx.fill()
      }

      /* 球 */
      if (b) {
        const bg = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r)
        bg.addColorStop(0, '#ffffff')
        bg.addColorStop(0.7, '#c0c8e0')
        bg.addColorStop(1, '#606890')
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      /* 底部提示 */
      ctx.fillStyle = 'rgba(160,176,240,0.7)'
      ctx.font = '10px "Trebuchet MS", sans-serif'
      ctx.fillText(msgRef.current.length > 46 ? msgRef.current.slice(0, 46) : msgRef.current, 12, H - 8)
    }

    placeBall()
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#0a0e20] select-none">
      <MenuBar
        menus={[
          {
            label: '游戏(G)',
            items: [
              { label: '新游戏(F2)', onClick: newGame },
              { separator: true },
              { label: '发射球(L)', onClick: () => {
                if (ballRef.current && ballRef.current.y > H - 90) {
                  ballRef.current.vy = -(9 + Math.random() * 6)
                  ballRef.current.vx = -0.8
                }
              } },
              { separator: true },
              { label: '暂停/继续(P)', onClick: () => setRunning(!running) },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '操作说明(K)', onClick: () => openApp('dialog', { kind: 'info', title: '操作说明', text: '空格：按住蓄力、松开发射\n←/Z：左挡板\n→/M：右挡板\n\n击中浮标 +2500~3000 分\n击中目标灯 +5000 分\n挡板击球 +100 分' }) },
              { label: '关于弹珠台(A)...', onClick: () => openApp('dialog', { kind: 'info', title: '关于弹珠台', text: '3D Pinball「太空军校生」\nWeb 复刻版（2D 简化物理）\n\n向 Windows 最好的免费游戏致敬。' }) },
            ],
          },
        ]}
      />
      <div className="flex-1 flex items-center justify-center bg-[#05081a] overflow-hidden relative">
        <canvas ref={canvasRef} width={W} height={H} className="max-h-full max-w-full touch-none" style={{ imageRendering: 'auto' }} />
        {!running ? <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[13px] font-bold">已暂停（菜单中继续）</div> : null}
        {balls <= 0 ? (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="text-white text-[15px] font-bold">游戏结束 — {score.toLocaleString()} 分</div>
            <button type="button" className="xp-btn xp-btn-primary px-5 h-[24px] text-[11px]" onClick={newGame}>
              再来一局
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 px-2 h-[20px] bg-[#0a1028] border-t border-[#203060] text-[10px] text-[#7a90c8]">
        <span>玩家: Cadet</span>
        <span>等级: 1</span>
        <span className="ml-auto">{msg}</span>
      </div>
    </div>
  )
}
