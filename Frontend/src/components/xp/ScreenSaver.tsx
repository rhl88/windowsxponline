'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useXP, type SaverKey } from './store'

/* ─────────── 屏幕保护（三维管道 pipes / 三维文字 text3d / 星空 starfield / 变幻线 mystify） ─────────── */

interface Star {
  x: number
  y: number
  z: number
}

interface Poly {
  phase: number
  speed: number
  hue: number
  trail: Array<Array<{ x: number; y: number }>>
}

/* ── 三维管道：3D 网格游走的圆柱段集合 + 缓慢环绕相机（画家算法 z 排序） ── */
interface PipeSeg {
  a: [number, number, number]
  b: [number, number, number]
  col: string
  light: string
  dark: string
  joint: boolean /* b 端是否弯头球 */
}

const PIPE_COLORS = ['#c83232', '#3278c8', '#32a048', '#c8a030', '#9048c0', '#c86828']

function shade(hex: string, k: number): string {
  const r = Math.round(Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) * k)))
  const g = Math.round(Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) * k)))
  const b = Math.round(Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) * k)))
  return `rgb(${r},${g},${b})`
}

function initPipes(): { segs: PipeSeg[]; heads: Array<{ p: [number, number, number]; d: number; col: string }>; grid: Set<number>; N: number } {
  const N = 13
  const grid = new Set<number>()
  const segs: PipeSeg[] = []
  const heads: Array<{ p: [number, number, number]; d: number; col: string }> = []
  const spawn = () => {
    /* 在空格点生成一条新管道头 */
    for (let tries = 0; tries < 40; tries++) {
      const p: [number, number, number] = [
        Math.floor(Math.random() * N), Math.floor(Math.random() * N), Math.floor(Math.random() * N),
      ]
      const key = p[0] + p[1] * N + p[2] * N * N
      if (!grid.has(key)) {
        grid.add(key)
        heads.push({ p, d: Math.floor(Math.random() * 6), col: PIPE_COLORS[heads.length % PIPE_COLORS.length] })
        return
      }
    }
  }
  for (let i = 0; i < 7; i++) spawn()
  return { segs, heads, grid, N }
}

function growPipes(st: ReturnType<typeof initPipes>, count: number) {
  const { N } = st
  const DIRS: Array<[number, number, number]> = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ]
  for (let n = 0; n < count; n++) {
    for (let hi = st.heads.length - 1; hi >= 0; hi--) {
      const h = st.heads[hi]
      const opts = DIRS.map((d, i) => ({ d, i })).filter((o) => o.i !== (h.d ^ 1))
      /* 随机打乱候选方向（XP 管道的随机游走） */
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[opts[i], opts[j]] = [opts[j], opts[i]]
      }
      let moved = false
      for (const o of opts) {
        const nx = h.p[0] + o.d[0]
        const ny = h.p[1] + o.d[1]
        const nz = h.p[2] + o.d[2]
        if (nx < 0 || nx >= N || ny < 0 || ny >= N || nz < 0 || nz >= N) continue
        const key = nx + ny * N + nz * N * N
        if (st.grid.has(key)) continue
        st.grid.add(key)
        st.segs.push({
          a: [...h.p] as [number, number, number],
          b: [nx, ny, nz],
          col: h.col,
          light: shade(h.col, 1.45),
          dark: shade(h.col, 0.45),
          joint: false,
        })
        h.p = [nx, ny, nz]
        h.d = o.i
        moved = true
        break
      }
      if (!moved) {
        /* 卡死：在此处收尾弯头并另生新头（保持画面持续生长） */
        st.heads.splice(hi, 1)
        for (let tries = 0; tries < 30; tries++) {
          const p: [number, number, number] = [
            Math.floor(Math.random() * N), Math.floor(Math.random() * N), Math.floor(Math.random() * N),
          ]
          if (!st.grid.has(p[0] + p[1] * N + p[2] * N * N)) {
            st.grid.add(p[0] + p[1] * N + p[2] * N * N)
            st.heads.push({ p, d: Math.floor(Math.random() * 6), col: PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)] })
            break
          }
        }
      }
    }
    /* 段数上限：按最老的管道整体退场，防止无限增长 */
    if (st.segs.length > 420) {
      const drop = st.segs.splice(0, st.segs.length - 420)
      for (const s of drop) {
        st.grid.delete(s.a[0] + s.a[1] * N + s.a[2] * N * N)
        st.grid.delete(s.b[0] + s.b[1] * N + s.b[2] * N * N)
      }
    }
  }
}

/* ── 三维文字：离屏渲染文字 → 像素体素化 → 前后两层挤出 + 侧壁 → 旋转投影 ── */
function voxelizeText(text: string): Array<{ x: number; y: number }> {
  const off = document.createElement('canvas')
  off.width = 960
  off.height = 240
  const c = off.getContext('2d')!
  c.fillStyle = '#000'
  c.fillRect(0, 0, off.width, off.height)
  c.fillStyle = '#fff'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  /* 自适应字号：先量宽再等比缩到画布内（防溢出裁字） */
  let fs = 150
  c.font = `bold ${fs}px Arial, "Noto Sans SC", sans-serif`
  const w = c.measureText(text).width
  if (w > off.width - 60) {
    fs = Math.floor((fs * (off.width - 60)) / w)
    c.font = `bold ${fs}px Arial, "Noto Sans SC", sans-serif`
  }
  c.fillText(text, off.width / 2, off.height / 2)
  const step = Math.max(5, Math.round(fs / 18))
  const vox: Array<{ x: number; y: number }> = []
  const d = c.getImageData(0, 0, off.width, off.height).data
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (d[(y * off.width + x) * 4] > 128) vox.push({ x: x / step, y: y / step })
    }
  }
  return vox
}

export default function ScreenSaver({ kind, onExit }: { kind: SaverKey; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const starsRef = useRef<Star[]>([])
  const polysRef = useRef<Poly[]>([])
  const pipesRef = useRef<ReturnType<typeof initPipes> | null>(null)
  const voxRef = useRef<Array<{ x: number; y: number }> | null>(null)
  const tRef = useRef(0)
  const flightRef = useRef<{ z: number; rot: number; shape: number }>({ z: 6, rot: 0, shape: 0 })
  const flowerRef = useRef({ ax: 0.4, ay: 0.2, vx: 0.006, vy: 0.011 })
  const marqueeRef = useRef({ x: 0, hue: 200 })
  /* 幻灯片：图片收藏图片列表 + 当前索引 + 淡入淡出 */
  const fsTree = useXP((s) => s.fsTree)
  const [slide, setSlide] = useState<{ idx: number; fade: boolean }>({ idx: 0, fade: false })
  const slides = useMemo(() => {
    const out: Array<{ name: string; src: string }> = []
    const walk = (n: typeof fsTree) => {
      for (const c of n.children ?? []) {
        if (c.kind === 'folder') walk(c)
        else if (c.src) out.push({ name: c.name, src: c.src })
      }
    }
    walk(fsTree)
    return out
  }, [fsTree])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const resize = () => {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    /* 星空初始化 */
    if (kind === 'starfield') {
      starsRef.current = Array.from({ length: 320 }, () => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 1 + 0.05,
      }))
    }
    /* 变幻线初始化：两条多边形轨迹 */
    if (kind === 'mystify') {
      polysRef.current = [0, 1, 2, 3].map((i) => ({
        phase: i * 1.7,
        speed: 0.6 + Math.random() * 0.8,
        hue: (i * 90 + 200) % 360,
        trail: [],
      }))
    }
    /* 三维管道初始化 */
    if (kind === 'pipes') {
      pipesRef.current = initPipes()
      growPipes(pipesRef.current, 60)
    }
    /* 三维文字体素化（Windows XP 致敬默认文字） */
    if (kind === 'text3d' && !voxRef.current) {
      voxRef.current = voxelizeText('Windows XP')
    }

    const last = { t: 0 }
    const step = (t: number) => {
      const dt = Math.min(50, t - (last.t || t))
      last.t = t
      tRef.current += dt

      const W = cv.width
      const H = cv.height

      if (kind === 'starfield') {
        ctx.fillStyle = 'rgba(0,0,8,0.35)'
        ctx.fillRect(0, 0, W, H)
        const cx = W / 2
        const cy = H / 2
        for (const s of starsRef.current) {
          s.z -= dt * 0.00025
          if (s.z <= 0.03) {
            s.x = Math.random() * 2 - 1
            s.y = Math.random() * 2 - 1
            s.z = 1
          }
          const px = cx + (s.x / s.z) * (W / 2.4)
          const py = cy + (s.y / s.z) * (H / 2.4)
          const size = Math.max(0.4, (1 - s.z) * 2.6)
          const alpha = Math.min(1, (1 - s.z) * 1.4)
          if (px < 0 || px > W || py < 0 || py > H) {
            s.x = Math.random() * 2 - 1
            s.y = Math.random() * 2 - 1
            s.z = 1
            continue
          }
          ctx.fillStyle = `rgba(${180 + Math.floor(alpha * 70)},${190 + Math.floor(alpha * 60)},255,${alpha})`
          ctx.fillRect(px, py, size, size)
        }
      } else if (kind === 'mystify') {
        ctx.fillStyle = 'rgba(0,0,10,0.085)'
        ctx.fillRect(0, 0, W, H)
        const time = tRef.current / 1000
        for (const p of polysRef.current) {
          const n = 4
          const pts: Array<{ x: number; y: number }> = []
          for (let k = 0; k < n; k++) {
            const a = time * p.speed + p.phase + k * 1.57
            pts.push({
              x: W / 2 + Math.sin(a * 0.7) * (W * 0.36) * Math.cos(time * 0.13 + p.phase),
              y: H / 2 + Math.cos(a * 0.9) * (H * 0.36) * Math.sin(time * 0.17 + p.phase),
            })
          }
          p.trail.push(pts)
          if (p.trail.length > 26) p.trail.shift()
          for (let ti = 0; ti < p.trail.length; ti++) {
            const tr = p.trail[ti]
            const fade = ti / p.trail.length
            const hue = (p.hue + time * 40) % 360
            ctx.strokeStyle = `hsla(${hue}, 85%, 60%, ${fade * 0.55})`
            ctx.lineWidth = 1 + fade * 1.6
            ctx.beginPath()
            tr.forEach((pt, pi) => (pi === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)))
            ctx.closePath()
            ctx.stroke()
          }
        }
      } else if (kind === 'pipes') {
        /* 三维管道：黑底 + 缓慢环绕的相机 + 每帧生长 */
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        const ps = pipesRef.current!
        growPipes(ps, 1)
        const time = tRef.current / 1000
        const N = ps.N
        const cx3 = (N - 1) / 2
        const cy3 = (N - 1) / 2
        const cz3 = (N - 1) / 2
        /* 相机：偏航匀速 + 俯仰正弦 */
        const yaw = time * 0.22
        const pitch = 0.42 + Math.sin(time * 0.13) * 0.22
        const cosY = Math.cos(yaw)
        const sinY = Math.sin(yaw)
        const cosP = Math.cos(pitch)
        const sinP = Math.sin(pitch)
        const scale = Math.min(W, H) / (N * 1.35)
        const camDist = N * 2.6
        const proj = (p: [number, number, number]) => {
          const x0 = p[0] - cx3
          const y0 = p[1] - cy3
          const z0 = p[2] - cz3
          const x1 = x0 * cosY - z0 * sinY
          const z1 = x0 * sinY + z0 * cosY
          const y2 = y0 * cosP - z1 * sinP
          const z2 = y0 * sinP + z1 * cosP + camDist
          const f = scale * (camDist / z2)
          return { x: W / 2 + x1 * f, y: H / 2 - y2 * f, z: z2, s: f }
        }
        /* 画家算法：远 → 近 */
        const drawn = ps.segs
          .map((sg) => {
            const pa = proj(sg.a)
            const pb = proj(sg.b)
            return { sg, pa, pb, z: (pa.z + pb.z) / 2 }
          })
          .sort((u, v) => v.z - u.z)
        const R = 0.42 /* 圆柱半径（格单位） */
        for (const d of drawn) {
          const rPix = Math.max(1.5, R * ((d.pa.s + d.pb.s) / 2))
          ctx.strokeStyle = d.sg.dark
          ctx.lineWidth = rPix * 2
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(d.pa.x, d.pa.y)
          ctx.lineTo(d.pb.x, d.pb.y)
          ctx.stroke()
          /* 高光细线：模拟金属光泽 */
          ctx.strokeStyle = d.sg.light
          ctx.lineWidth = Math.max(0.75, rPix * 0.55)
          ctx.beginPath()
          const mx = (d.pa.x + d.pb.x) / 2 - rPix * 0.45
          const my = (d.pa.y + d.pb.y) / 2 - rPix * 0.45
          const dx = d.pb.x - d.pa.x
          const dy = d.pb.y - d.pa.y
          const len = Math.hypot(dx, dy) || 1
          const ox = (-dy / len) * rPix * 0.4
          const oy = (dx / len) * rPix * 0.4
          ctx.moveTo(d.pa.x + ox, d.pa.y + oy)
          ctx.lineTo(d.pb.x + ox, d.pb.y + oy)
          void mx
          void my
          ctx.stroke()
        }
      } else if (kind === 'text3d') {
        /* 三维文字：双层挤出体素 + 旋转 + 侧面暗色 → 立体感 */
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        const vox = voxRef.current ?? []
        if (vox.length === 0) {
          rafRef.current = requestAnimationFrame(step)
          return
        }
        const time = tRef.current / 1000
        const yaw = time * 0.32
        const pitch = 0.3 + Math.sin(time * 0.19) * 0.22
        const cosY = Math.cos(yaw)
        const sinY = Math.sin(yaw)
        const cosP = Math.cos(pitch)
        const sinP = Math.sin(pitch)
        /* 文字体素包围盒 */
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        for (const v of vox) {
          if (v.x < minX) minX = v.x
          if (v.x > maxX) maxX = v.x
          if (v.y < minY) minY = v.y
          if (v.y > maxY) maxY = v.y
        }
        const cxv = (minX + maxX) / 2
        const cyv = (minY + maxY) / 2
        const depth = 3.2 /* 挤出厚度（体素单位） */
        const camDist = 90
        const scale = Math.min(W / (maxX - minX + 16), H / (maxY - minY + 16))
        const proj = (x: number, y: number, z: number) => {
          const x0 = x - cxv
          const y0 = y - cyv
          const x1 = x0 * cosY - z * sinY
          const z1 = x0 * sinY + z * cosY
          const y2 = y0 * cosP - z1 * sinP
          const z2 = y0 * sinP + z1 * cosP + camDist
          const f = (scale * camDist) / z2
          return { x: W / 2 + x1 * f, y: H / 2 - y2 * f, z: z2 }
        }
        /* 收集所有面片（前/后/侧），按深度排序绘制 */
        const faces: Array<{ pts: Array<{ x: number; y: number }>; z: number; fill: string }> = []
        for (const v of vox) {
          const pf = proj(v.x, v.y, depth / 2)
          const pb = proj(v.x, v.y, -depth / 2)
          faces.push({ pts: [pf], z: pf.z, fill: '#3a8ae8' })
          faces.push({ pts: [pb], z: pb.z + 0.001, fill: '#1a4a90' })
          /* 侧壁：与右侧/下侧空隙之间的体素连接前后层 */
          const right = vox.some((w) => w.x === v.x + 1 && w.y === v.y)
          const down = vox.some((w) => w.x === v.x && w.y === v.y + 1)
          if (!right) {
            const p1 = proj(v.x + 0.5, v.y - 0.5, depth / 2)
            const p2 = proj(v.x + 0.5, v.y + 0.5, depth / 2)
            const p3 = proj(v.x + 0.5, v.y + 0.5, -depth / 2)
            const p4 = proj(v.x + 0.5, v.y - 0.5, -depth / 2)
            faces.push({ pts: [p1, p2, p3, p4], z: (p1.z + p3.z) / 2, fill: '#2560b8' })
          }
          if (!down) {
            const p1 = proj(v.x - 0.5, v.y + 0.5, depth / 2)
            const p2 = proj(v.x + 0.5, v.y + 0.5, depth / 2)
            const p3 = proj(v.x + 0.5, v.y + 0.5, -depth / 2)
            const p4 = proj(v.x - 0.5, v.y + 0.5, -depth / 2)
            faces.push({ pts: [p1, p2, p3, p4], z: (p1.z + p3.z) / 2, fill: '#1a4a90' })
          }
        }
        faces.sort((a, b) => b.z - a.z)
        const cell = scale * 0.82
        for (const fc of faces) {
          ctx.fillStyle = fc.fill
          if (fc.pts.length === 1) {
            ctx.fillRect(fc.pts[0].x - cell / 2, fc.pts[0].y - cell / 2, cell, cell)
          } else {
            ctx.beginPath()
            fc.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
            ctx.closePath()
            ctx.fill()
          }
        }
      } else if (kind === 'marquee') {
        /* 滚动字幕（XP marquee.scr）：彩虹渐变文字从右向左滚动 */
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        const st = marqueeRef.current
        st.x -= dt * 0.14
        st.hue = (st.hue + dt * 0.02) % 360
        const text = 'Windows XP'
        const fs = Math.max(40, Math.min(W / 9, H / 4))
        ctx.font = `bold ${fs}px "Trebuchet MS", "Noto Sans SC", sans-serif`
        const tw = ctx.measureText(text).width
        if (st.x < -tw) st.x = W + 40
        const grad = ctx.createLinearGradient(st.x, 0, st.x + tw, 0)
        for (let i = 0; i <= 5; i++) grad.addColorStop(i / 5, `hsl(${(st.hue + i * 42) % 360} 85% 62%)`)
        ctx.fillStyle = grad
        ctx.shadowColor = 'rgba(0,0,0,0.7)'
        ctx.shadowBlur = 8
        ctx.fillText(text, st.x, H / 2 + fs * 0.35)
        ctx.shadowBlur = 0
      } else if (kind === 'flight3d') {
        /* 三维飞行对象（XP 3D Flying Objects 简化）：旋转线框体迎面飞来 */
        ctx.fillStyle = 'rgba(0,0,10,0.32)'
        ctx.fillRect(0, 0, W, H)
        const fl = flightRef.current
        fl.z -= dt * 0.0007
        fl.rot += dt * 0.0012
        if (fl.z < 0.4) {
          fl.z = 6
          fl.shape = (fl.shape + 1) % 3
        }
        const f = Math.min(W, H) / fl.z
        const cx = W / 2 + Math.sin(tRef.current / 2600) * W * 0.16
        const cy = H / 2 + Math.cos(tRef.current / 3100) * H * 0.16
        /* 三种线框：环面结 / 八面体 / 立方棱柱 */
        const verts: Array<[number, number, number]> = []
        const edges: Array<[number, number]> = []
        if (fl.shape === 0) {
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2
            verts.push([Math.cos(a), Math.sin(a), 0])
            if (i > 0) edges.push([i - 1, i])
          }
          edges.push([23, 0])
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2
            verts.push([Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0])
            if (i > 0) edges.push([24 + i - 1, 24 + i])
          }
          edges.push([35, 24])
        } else if (fl.shape === 1) {
          const o: Array<[number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
          for (const v of o) verts.push(v)
          for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) edges.push([i, j])
        } else {
          const c = 0.75
          for (const x of [-c, c]) for (const y of [-c, c]) for (const z of [-c, c]) verts.push([x, y, z])
          for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
            const a = verts[i], b = verts[j]
            const diff = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0) + (a[2] !== b[2] ? 1 : 0)
            if (diff === 1) edges.push([i, j])
          }
        }
        const rot = fl.rot
        const proj = (v: [number, number, number]) => {
          const [x, y, z] = v
          const x1 = x * Math.cos(rot) - z * Math.sin(rot)
          const z1 = x * Math.sin(rot) + z * Math.cos(rot)
          const y1 = y * Math.cos(rot * 0.6) - z1 * Math.sin(rot * 0.6)
          const z2 = y * Math.sin(rot * 0.6) + z1 * Math.cos(rot * 0.6) + fl.z
          const pf = f / Math.max(0.35, z2)
          return { x: cx + x1 * pf, y: cy - y1 * pf, z: z2 }
        }
        ctx.lineWidth = 2
        for (const [a, b] of edges) {
          const pa = proj(verts[a])
          const pb = proj(verts[b])
          const depth = Math.max(0, Math.min(1, 1.4 - pa.z / 4))
          ctx.strokeStyle = `rgba(${60 + depth * 80}, ${140 + depth * 80}, 255, ${0.35 + depth * 0.6})`
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.stroke()
        }
      } else if (kind === 'flowerbox') {
        /* 三维花盒（XP FlowerBox 简化）：旋转立方体六面彩虹渐变 */
        ctx.fillStyle = 'rgba(0,0,6,0.28)'
        ctx.fillRect(0, 0, W, H)
        const fw = flowerRef.current
        fw.ax += fw.vx * dt * 0.06
        fw.ay += fw.vy * dt * 0.06
        const S = Math.min(W, H) * 0.26
        const ca = Math.cos(fw.ax), sa = Math.sin(fw.ax)
        const cb = Math.cos(fw.ay), sb = Math.sin(fw.ay)
        const corners: Array<[number, number, number]> = []
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z])
        const P = corners.map(([x, y, z]) => {
          const x1 = x * cb - z * sb
          const z1 = x * sb + z * cb
          const y1 = y * ca - z1 * sa
          const z2 = y * sa + z1 * ca + 3.6
          const pf = S * 1.9 / z2
          return { x: W / 2 + x1 * pf, y: H / 2 - y1 * pf, z: z2 }
        })
        const faces = [
          { idx: [0, 1, 3, 2], hue: 0 }, { idx: [4, 6, 7, 5], hue: 60 },
          { idx: [0, 4, 5, 1], hue: 120 }, { idx: [2, 3, 7, 6], hue: 180 },
          { idx: [0, 2, 6, 4], hue: 240 }, { idx: [1, 5, 7, 3], hue: 300 },
        ].map((fc) => ({
          ...fc,
          z: fc.idx.reduce((m, i) => m + P[i].z, 0) / 4,
        })).sort((a, b) => b.z - a.z)
        const hueShift = (tRef.current / 40) % 360
        for (const fc of faces) {
          ctx.beginPath()
          fc.idx.forEach((i, k) => (k === 0 ? ctx.moveTo(P[i].x, P[i].y) : ctx.lineTo(P[i].x, P[i].y)))
          ctx.closePath()
          const lum = 38 + Math.max(0, (3.6 - fc.z) * 14)
          ctx.fillStyle = `hsl(${(fc.hue + hueShift) % 360} 72% ${Math.min(66, lum)}%)`
          ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.22)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [kind])

  /* 幻灯片：每 6s 切换（淡出→换图→淡入） */
  useEffect(() => {
    if (kind !== 'slideshow' || slides.length === 0) return
    const iv = setInterval(() => {
      setSlide((s) => ({ idx: (s.idx + 1) % slides.length, fade: true }))
      setTimeout(() => setSlide((s) => ({ ...s, fade: false })), 650)
    }, 6000)
    return () => clearInterval(iv)
  }, [kind, slides.length])

  /* 任意输入退出 */
  useEffect(() => {
    const exit = () => onExit()
    window.addEventListener('keydown', exit)
    window.addEventListener('pointerdown', exit)
    window.addEventListener('pointermove', exit)
    return () => {
      window.removeEventListener('keydown', exit)
      window.removeEventListener('pointermove', exit)
      window.removeEventListener('pointerdown', exit)
    }
  }, [onExit])

  if (kind === 'slideshow') {
    /* 图片收藏幻灯片（XP 真实行为：全屏平铺 + 淡入淡出 + 无图回退黑屏） */
    const cur = slides[slide.idx % Math.max(1, slides.length)]
    return (
      <div className="fixed inset-0 z-[2000] bg-black cursor-none overflow-hidden">
        {cur ? (
          <img
            key={cur.name}
            src={cur.src}
            alt=""
            draggable={false}
            className="w-full h-full object-contain"
            style={{ opacity: slide.fade ? 0.25 : 1, transition: 'opacity 650ms ease-in-out' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#555] text-[13px]">图片收藏中没有图片</div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black cursor-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

/* ─────────── 屏保管理器：空闲检测 + 启动（+ 显示属性「预览」强制启动） ─────────── */
export function ScreenSaverHost() {
  const screensaver = useXP((s) => s.screensaver)
  const saverWait = useXP((s) => s.saverWait)
  const phase = useXP((s) => s.phase)
  const [active, setActive] = useState(false)
  const lastInputRef = useRef(Date.now())
  const excluded = useRef(false)

  useEffect(() => {
    if (screensaver === 'none') return
    const mark = () => {
      lastInputRef.current = Date.now()
      setActive(false)
    }
    window.addEventListener('keydown', mark, { passive: true })
    window.addEventListener('pointermove', mark, { passive: true })
    window.addEventListener('pointerdown', mark, { passive: true })
    const iv = setInterval(() => {
      if (phase !== 'desktop' || excluded.current) return
      if (Date.now() - lastInputRef.current > saverWait * 60_000) setActive(true)
    }, 2000)
    return () => {
      window.removeEventListener('keydown', mark)
      window.removeEventListener('pointermove', mark)
      window.removeEventListener('pointerdown', mark)
      clearInterval(iv)
    }
  }, [screensaver, saverWait, phase])

  /* 开发/演示模式：为避免等待太久，把 1 分钟以内一律视为 30 秒 */
  const waitMs = saverWait >= 1 ? saverWait * 60_000 : 30_000
  void waitMs

  /* 显示属性「预览(V)」按钮：强制立即启动屏保 */
  useEffect(() => {
    const preview = () => setActive(true)
    window.addEventListener('xp-saver-preview', preview)
    return () => window.removeEventListener('xp-saver-preview', preview)
  }, [])

  if (!active || screensaver === 'none') return null
  return <ScreenSaver kind={screensaver} onExit={() => setActive(false)} />
}
