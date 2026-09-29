'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP } from '../store'
import { MenuBar, XPRadio } from '../ui'
import { playClick } from '../sounds'

type Tool =
  | 'fselect' | 'select' | 'eraser' | 'fill' | 'picker' | 'zoom'
  | 'brush' | 'spray' | 'text' | 'line' | 'curve'
  | 'rect' | 'polygon' | 'ellipse' | 'rrect' | 'pencil'

/* XP 真实工具箱顺序（2 列 × 8 行，自上而下） */
const TOOLS: Tool[] = [
  'fselect', 'select', 'eraser', 'fill', 'picker', 'zoom',
  'brush', 'spray', 'text', 'line', 'curve',
  'rect', 'polygon', 'ellipse', 'rrect', 'pencil',
]

const TOOL_TITLES: Record<Tool, string> = {
  fselect: '任意形状的裁剪',
  select: '选定',
  eraser: '橡皮/彩色橡皮',
  fill: '用颜色填充',
  picker: '取色',
  zoom: '放大镜',
  brush: '刷子',
  spray: '喷枪',
  text: '文字',
  line: '直线',
  curve: '曲线',
  rect: '矩形',
  polygon: '多边形',
  ellipse: '椭圆',
  rrect: '圆角矩形',
  pencil: '铅笔',
}

type ShapeFill = 'fg' | 'bg' | 'none'

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
]

/* 文字工具栏字体（标签 + canvas/textarea 通用 CSS 字体栈） */
const FONTS: Array<{ label: string; css: string }> = [
  { label: '宋体', css: 'SimSun, "宋体", serif' },
  { label: '黑体', css: 'SimHei, "黑体", sans-serif' },
  { label: '楷体', css: 'KaiTi, "楷体", serif' },
  { label: '仿宋', css: 'FangSong, "仿宋", serif' },
  { label: '隶书', css: 'LiSu, "隶书", serif' },
  { label: '幼圆', css: 'YouYuan, "幼圆", sans-serif' },
  { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { label: 'Courier New', css: '"Courier New", Courier, monospace' },
  { label: 'Impact', css: 'Impact, sans-serif' },
]
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]
const ZOOM_STEPS = [1, 2, 4, 6, 8]

/* 工具图标 */
function ToolIcon({ kind, active }: { kind: Tool; active: boolean }) {
  const c = active ? '#1a4fa0' : '#3a3a3a'
  const s = { stroke: c, fill: 'none', strokeWidth: 1.6 } as const
  switch (kind) {
    case 'pencil':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 13 L4.5 9 L11.5 2 L14 4.5 L7 11.5 Z" {...s} />
        </svg>
      )
    case 'brush':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 12 q0 -3 3 -4 L13 2 l1 1 L7 9 q3 1 3 3 q-2 2 -6 0 Z" {...s} />
        </svg>
      )
    case 'eraser':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3" y="6" width="9" height="7" rx="1.5" transform="rotate(-20 7.5 9.5)" {...s} />
          <path d="M5 12.5 l7 -4" {...s} />
        </svg>
      )
    case 'fill':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 2 L13 7 L7 13 L2 8 Z" {...s} />
          <path d="M12 11 q2 2 0 3 q-2 -1 0 -3 Z" fill={c} />
        </svg>
      )
    case 'picker':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 13 L4 10 L11 3 L13 5 L6 12 Z" {...s} />
        </svg>
      )
    case 'spray':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M4 6 h5 v7 h-5 Z" {...s} />
          <path d="M9 4 L11 4 M11 6 L13 6 M10 8 L12 8 M12 3 L12 4 M13 8 L14 9" {...s} />
        </svg>
      )
    case 'line':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 13 L13 3" {...s} />
        </svg>
      )
    case 'rect':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3" y="4" width="10" height="8" {...s} />
        </svg>
      )
    case 'ellipse':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <ellipse cx="8" cy="8" rx="5.5" ry="4.5" {...s} />
        </svg>
      )
    case 'rrect':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3" y="4" width="10" height="8" rx="2.5" {...s} />
        </svg>
      )
    case 'select':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 3 h10 v9 h-10 Z" strokeDasharray="2 2" {...s} />
        </svg>
      )
    case 'fselect':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 9 C3 5 6 3 8 5 C9 2 13 3 12 6 C15 7 14 11 11 11 C12 14 7 15 6 12 C4 13 3 12 3 9 Z" strokeDasharray="2.5 1.5" {...s} />
        </svg>
      )
    case 'zoom':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="7" cy="7" r="4.2" {...s} />
          <path d="M10.5 10.5 L14 14 M5.5 7 L8.5 7 M7 5.5 L7 8.5" {...s} />
        </svg>
      )
    case 'text':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M3 4 H13 M8 4 V13 M6 13 H10" {...s} />
        </svg>
      )
    case 'curve':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M2 12 C5 4 8 14 13 4" {...s} />
        </svg>
      )
    case 'polygon':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 2 L14 6.5 L11.5 13.5 L4.5 13.5 L2 6.5 Z" {...s} />
        </svg>
      )
  }
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

export default function Paint({ win }: { win: WinState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [brushSize, setBrushSize] = useState(2)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drawing = useRef(false)
  const startPt = useRef<{ x: number; y: number } | null>(null)
  const snapshots = useRef<ImageData[]>([])
  const redoStack = useRef<ImageData[]>([])
  const activeCol = useRef('#000000')
  const altCol = useRef('#ffffff')
  const toast = useXP((s) => s.showToast)
  const sessionUser = useXP((s) => s.sessionUser)
  const fsWriteFile = useXP((s) => s.fsWriteFile)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const fsTree = useXP((s) => s.fsTree)

  /* ── 文件对话框：另存为/打开（VFS 集成） ── */
  const [savedName, setSavedName] = useState('')
  const [saveAsDlg, setSaveAsDlg] = useState(false)
  const [saveAsName, setSaveAsName] = useState('未命名.bmp')
  const [openDlg, setOpenDlg] = useState(false)

  /* ── 放大镜：1x-8x，点击放大/右键缩小，4x+ 显示像素网格 ── */
  const [zoom, setZoomState] = useState(1)

  /* ── 形状填充模式（矩形/椭圆/圆角矩形/多边形 共用，XP 三模式） ── */
  const [shapeFill, setShapeFill] = useState<ShapeFill>('none')

  /* ── 选择透明模式（选定/任意形状裁剪：不透明/透明） ── */
  const [selTransparent, setSelTransparent] = useState(false)

  /* ── 选择工具：选区 + 拖动状态（XP：拖动移动 / Ctrl 拖动复制 / Del 清除 / Esc 取消） ── */
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selDrag = useRef<{ offX: number; offY: number; mode: 'move' | 'copy' } | null>(null)
  /* 选区内容画布（矩形或套索掩膜），selPath = 套索路径（空 = 矩形选区） */
  const selCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const selPathRef = useRef<Path2D | null>(null)

  /* ── 曲线工具状态机：line(拖直线) → wait1/drag1(第一次弯) → wait2/drag2(第二次弯) → 提交 ── */
  const curveSt = useRef<{ p0: { x: number; y: number }; p3: { x: number; y: number }; c1?: { x: number; y: number }; c2?: { x: number; y: number }; stage: 'line' | 'wait1' | 'drag1' | 'wait2' | 'drag2' } | null>(null)

  /* ── 多边形工具：顶点序列（拖出第一条边后逐击添加顶点，双击/右键/近起点闭合） ── */
  const polySt = useRef<{ pts: Array<{ x: number; y: number }> } | null>(null)

  /* ── 任意形状裁剪：套索采点 ── */
  const lassoPts = useRef<Array<{ x: number; y: number }> | null>(null)

  /* ── 文字工具：文本框 + 内容 + 字体格式 ── */
  const [textBox, setTextBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [textFontIdx, setTextFontIdx] = useState(0)
  const [textSize, setTextSize] = useState(12)
  const [textBold, setTextBold] = useState(false)
  const [textItalic, setTextItalic] = useState(false)
  const [textUnder, setTextUnder] = useState(false)
  const [textOpaque, setTextOpaque] = useState(false)
  const textStart = useRef<{ x: number; y: number } | null>(null)
  const [showTextBar, setShowTextBar] = useState(true)

  /* 放大镜点击判定起点 */
  const zoomClick = useRef<{ x: number; y: number } | null>(null)

  /* 画布尺寸（属性对话框可改） */
  const [W, setW] = useState(460)
  const [H, setH] = useState(280)

  /* 图像菜单三个对话框：翻转/旋转、拉伸/扭曲、属性 */
  const [flipDlg, setFlipDlg] = useState(false)
  const [flipMode, setFlipMode] = useState<'h' | 'v' | '90' | '180' | '270'>('h')
  const [stretchDlg, setStretchDlg] = useState(false)
  const [stretch, setStretch] = useState({ sx: 100, sy: 100, kx: 0, ky: 0 })
  const [attrDlg, setAttrDlg] = useState(false)
  const [attr, setAttr] = useState({ w: 460, h: 280, unit: 'px' as 'px' | 'in' | 'cm', bw: false })

  /* 把当前画布快照到临时 canvas（供变换重绘） */
  const canvasToTmp = () => {
    const cv = canvasRef.current!
    const tmp = document.createElement('canvas')
    tmp.width = cv.width
    tmp.height = cv.height
    tmp.getContext('2d')!.drawImage(cv, 0, 0)
    return tmp
  }

  /* 翻转/旋转（XP 图像→翻转/旋转：水平/垂直翻转 + 90/180/270 旋转） */
  const applyFlipRotate = (mode: 'h' | 'v' | '90' | '180' | '270') => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    snapshot()
    clearSelection()
    const tmp = canvasToTmp()
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    if (mode === 'h') {
      ctx.translate(W, 0)
      ctx.scale(-1, 1)
    } else if (mode === 'v') {
      ctx.translate(0, H)
      ctx.scale(1, -1)
    } else if (mode === '90') {
      ctx.translate(W, 0)
      ctx.rotate(Math.PI / 2)
    } else if (mode === '180') {
      ctx.translate(W, H)
      ctx.rotate(Math.PI)
    } else {
      ctx.translate(0, H)
      ctx.rotate(-Math.PI / 2)
    }
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
  }

  /* 拉伸/扭曲（XP 图像→拉伸/扭曲：百分比拉伸 + 角度倾斜，画布尺寸不变超出部分裁剪） */
  const applyStretchSkew = (sx: number, sy: number, kx: number, ky: number) => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    snapshot()
    clearSelection()
    const tmp = canvasToTmp()
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    /* 变换矩阵：扭曲（斜切）→ 拉伸（缩放），与 XP 顺序一致 */
    ctx.transform(1, Math.tan((ky * Math.PI) / 180), Math.tan((kx * Math.PI) / 180), 1, 0, 0)
    ctx.scale(sx / 100, sy / 100)
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
  }

  /* 属性：修改画布尺寸（保留已给内容）/黑白转换 */
  const applyAttr = (nw: number, nh: number, bw: boolean) => {
    const cv = canvasRef.current
    if (!cv) return
    const tmp = canvasToTmp()
    setW(nw)
    setH(nh)
    clearSelection()
    requestAnimationFrame(() => {
      const cv2 = canvasRef.current
      if (!cv2) return
      const ctx2 = cv2.getContext('2d')!
      ctx2.fillStyle = '#ffffff'
      ctx2.fillRect(0, 0, nw, nh)
      ctx2.drawImage(tmp, 0, 0)
      if (bw) {
        /* 黑白：灰度 + 误差抖动近似（XP 的颜色→黑白） */
        const img = ctx2.getImageData(0, 0, nw, nh)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          const v = g > 128 ? 255 : 0
          d[i] = d[i + 1] = d[i + 2] = v
        }
        ctx2.putImageData(img, 0, 0)
      }
    })
  }

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    /* 打开方式→画图：加载传入的图片文件 */
    const src = win.props.src as string | undefined
    if (src) {
      const img = new Image()
      img.onload = () => {
        setW(img.width)
        setH(img.height)
        requestAnimationFrame(() => canvasRef.current?.getContext('2d')!.drawImage(img, 0, 0))
      }
      img.src = src
      return
    }
  }, [])

  const snapshot = () => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    snapshots.current.push(ctx.getImageData(0, 0, W, H))
    if (snapshots.current.length > 24) snapshots.current.shift()
    redoStack.current.length = 0
  }

  const undo = () => {
    const cv = canvasRef.current
    if (!cv || snapshots.current.length === 0) return
    const ctx = cv.getContext('2d')!
    const snap = snapshots.current.pop()!
    redoStack.current.push(ctx.getImageData(0, 0, W, H))
    ctx.putImageData(snap, 0, 0)
    clearSelection()
  }

  const redo = () => {
    const cv = canvasRef.current
    if (!cv || redoStack.current.length === 0) return
    const ctx = cv.getContext('2d')!
    const snap = redoStack.current.pop()!
    snapshots.current.push(ctx.getImageData(0, 0, W, H))
    ctx.putImageData(snap, 0, 0)
    clearSelection()
  }

  /* 缩放感知坐标换算（画布 CSS 尺寸 = W*zoom） */
  const getCvPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const z = rect.width / W || 1
    return { x: Math.round((e.clientX - rect.left) / z), y: Math.round((e.clientY - rect.top) / z) }
  }

  /* 洪水填充 */
  const floodFill = (sx: number, sy: number, hex: string) => {
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    const img = ctx.getImageData(0, 0, W, H)
    const data = img.data
    const idx = (x: number, y: number) => (y * W + x) * 4
    const target = data.slice(idx(sx, sy), idx(sx, sy) + 4)
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    if (target[0] === r && target[1] === g && target[2] === b) return
    const stack: number[] = [sx, sy]
    while (stack.length) {
      const y = stack.pop()!
      const x = stack.pop()!
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      const i = idx(x, y)
      if (Math.abs(data[i] - target[0]) > 10 || Math.abs(data[i + 1] - target[1]) > 10 || Math.abs(data[i + 2] - target[2]) > 10) continue
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
    }
    ctx.putImageData(img, 0, 0)
  }

  const pickColor = (x: number, y: number): string => {
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    const d = ctx.getImageData(x, y, 1, 1).data
    const hex = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    return hex
  }

  /* ─────────── 选区（矩形 + 套索通用） ─────────── */

  const clearOverlay = () => {
    const oc = overlayRef.current
    if (!oc) return
    const octx = oc.getContext('2d')
    if (octx) octx.clearRect(0, 0, W, H)
  }

  const drawAnts = (r?: { x: number; y: number; w: number; h: number } | null) => {
    const oc = overlayRef.current
    if (!oc) return
    const octx = oc.getContext('2d')
    if (!octx) return
    octx.clearRect(0, 0, W, H)
    octx.strokeStyle = '#111'
    octx.lineWidth = 1
    octx.setLineDash([4, 3])
    const rect = r === undefined ? selRect : r
    if (selPathRef.current && rect) octx.stroke(selPathRef.current)
    else if (rect) octx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1)
    octx.setLineDash([])
  }

  const clearSelection = () => {
    selPathRef.current = null
    selCanvasRef.current = null
    selDrag.current = null
    setSelRect(null)
    clearOverlay()
  }

  const ptsToPath = (pts: Array<{ x: number; y: number }>) => {
    const p = new Path2D()
    p.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y)
    p.closePath()
    return p
  }

  const translatePath = (path: Path2D, dx: number, dy: number) => {
    const np = new Path2D()
    np.addPath(path, new DOMMatrix().translateSelf(dx, dy))
    return np
  }

  /* 从当前画布提取选区内容（套索 = 路径掩膜；透明模式 = 背景色像素挖空） */
  const buildSelCanvas = (r: { x: number; y: number; w: number; h: number }) => {
    const c = document.createElement('canvas')
    c.width = r.w
    c.height = r.h
    const cc = c.getContext('2d')!
    if (selPathRef.current) {
      cc.save()
      cc.clip(selPathRef.current)
      cc.drawImage(canvasRef.current!, -r.x, -r.y)
      cc.restore()
    } else {
      cc.drawImage(canvasRef.current!, -r.x, -r.y)
    }
    if (selTransparent) {
      const id = cc.getImageData(0, 0, r.w, r.h)
      const [br, bg, bb] = hexToRgb(bgColor)
      const d = id.data
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - br) < 16 && Math.abs(d[i + 1] - bg) < 16 && Math.abs(d[i + 2] - bb) < 16) d[i + 3] = 0
      }
      cc.putImageData(id, 0, 0)
    }
    selCanvasRef.current = c
  }

  /* 套索收尾：包围盒 + 掩膜选区 + 蚂蚁线路径 */
  const finishLasso = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 8) return
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    const w = Math.max(...xs) - x
    const h = Math.max(...ys) - y
    if (w < 4 || h < 4) return
    selPathRef.current = ptsToPath(pts)
    const r = { x, y, w, h }
    buildSelCanvas(r)
    setSelRect(r)
    drawAnts(r)
  }

  /* Del/移动提交时按选区形状擦除原区域（套索 = 掩膜擦除，矩形 = 整块填背景） */
  const eraseSelArea = () => {
    const ctx = canvasRef.current!.getContext('2d')!
    if (!selRect) return
    if (selPathRef.current) {
      ctx.save()
      ctx.clip(selPathRef.current)
      ctx.fillStyle = bgColor
      ctx.fillRect(selRect.x, selRect.y, selRect.w, selRect.h)
      ctx.restore()
    } else {
      ctx.fillStyle = bgColor
      ctx.fillRect(selRect.x, selRect.y, selRect.w, selRect.h)
    }
  }

  /* ─────────── 形状填充/描边（XP 三模式：前景填充/背景填充/仅边框） ─────────── */
  const applyFillStroke = (ctx: CanvasRenderingContext2D, path: Path2D) => {
    ctx.save()
    ctx.strokeStyle = activeCol.current
    ctx.lineWidth = brushSize
    ctx.lineJoin = 'round'
    if (shapeFill === 'fg') {
      ctx.fillStyle = activeCol.current
      ctx.fill(path)
    } else if (shapeFill === 'bg') {
      ctx.fillStyle = altCol.current
      ctx.fill(path)
    }
    ctx.stroke(path)
    ctx.restore()
  }

  /* ─────────── 曲线提交 ─────────── */
  const commitCurve = () => {
    const st = curveSt.current
    if (!st) return
    const ctx = canvasRef.current!.getContext('2d')!
    clearOverlay()
    ctx.strokeStyle = activeCol.current
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(st.p0.x, st.p0.y)
    if (st.c1 && st.c2) ctx.bezierCurveTo(st.c1.x, st.c1.y, st.c2.x, st.c2.y, st.p3.x, st.p3.y)
    else if (st.c1) ctx.quadraticCurveTo(st.c1.x, st.c1.y, st.p3.x, st.p3.y)
    else ctx.lineTo(st.p3.x, st.p3.y)
    ctx.stroke()
    curveSt.current = null
  }

  /* 曲线预览（overlay）：保留已固定的段 + 当前拖拽弯 */
  const previewCurve = (cur: { x: number; y: number } | null) => {
    const st = curveSt.current
    if (!st) return
    const octx = overlayRef.current!.getContext('2d')!
    octx.clearRect(0, 0, W, H)
    octx.strokeStyle = activeCol.current
    octx.lineWidth = brushSize
    octx.lineCap = 'round'
    octx.beginPath()
    octx.moveTo(st.p0.x, st.p0.y)
    if (st.c1 && st.c2) octx.bezierCurveTo(st.c1.x, st.c1.y, st.c2.x, st.c2.y, st.p3.x, st.p3.y)
    else if (st.c1) {
      const c2 = cur ?? st.c1
      octx.bezierCurveTo(st.c1.x, st.c1.y, c2.x, c2.y, st.p3.x, st.p3.y)
    } else if (cur) octx.quadraticCurveTo(cur.x, cur.y, st.p3.x, st.p3.y)
    else octx.lineTo(st.p3.x, st.p3.y)
    octx.stroke()
  }

  /* ─────────── 多边形 ─────────── */
  const previewPolygon = (cur: { x: number; y: number } | null) => {
    const poly = polySt.current
    if (!poly || poly.pts.length === 0) return
    const octx = overlayRef.current!.getContext('2d')!
    octx.clearRect(0, 0, W, H)
    octx.strokeStyle = activeCol.current
    octx.lineWidth = brushSize
    octx.lineJoin = 'round'
    const path = new Path2D()
    path.moveTo(poly.pts[0].x, poly.pts[0].y)
    for (let i = 1; i < poly.pts.length; i++) path.lineTo(poly.pts[i].x, poly.pts[i].y)
    if (cur) path.lineTo(cur.x, cur.y)
    octx.save()
    if (shapeFill === 'fg') {
      octx.fillStyle = activeCol.current
      octx.fill(path)
    } else if (shapeFill === 'bg') {
      octx.fillStyle = altCol.current
      octx.fill(path)
    }
    octx.stroke(path)
    octx.restore()
  }

  const commitPolygon = () => {
    const poly = polySt.current
    polySt.current = null
    if (!poly || poly.pts.length < 2) {
      clearOverlay()
      return
    }
    clearOverlay()
    const ctx = canvasRef.current!.getContext('2d')!
    const path = ptsToPath(poly.pts)
    applyFillStroke(ctx, path)
  }

  /* ─────────── 文字提交（画布坐标系） ─────────── */
  const commitText = () => {
    const tb = textBox
    if (!tb) return
    const val = textValue
    setTextBox(null)
    setTextValue('')
    if (!val.trim()) return
    snapshot()
    const ctx = canvasRef.current!.getContext('2d')!
    const f = FONTS[textFontIdx]
    const lh = Math.round(textSize * 1.25)
    const lines = val.replace(/\r/g, '').split('\n')
    ctx.save()
    if (textOpaque) {
      ctx.fillStyle = bgColor
      ctx.fillRect(tb.x, tb.y, tb.w, Math.max(tb.h, lines.length * lh))
    }
    ctx.fillStyle = activeCol.current
    ctx.textBaseline = 'top'
    ctx.font = `${textItalic ? 'italic ' : ''}${textBold ? 'bold ' : ''}${textSize}px ${f.css}`
    lines.forEach((ln, i) => {
      const y = tb.y + 1 + i * lh
      ctx.fillText(ln, tb.x + 1, y)
      if (textUnder) {
        const w = ctx.measureText(ln).width
        ctx.fillRect(tb.x + 1, y + textSize + 1, w, Math.max(1, Math.round(textSize / 14)))
      }
    })
    ctx.restore()
  }

  /* ─────────── 放大镜 ─────────── */
  const setZoomAt = (z: number, center?: { x: number; y: number }) => {
    const nz = ZOOM_STEPS.includes(z) ? z : 1
    setZoomState(nz)
    if (center && nz > 1) {
      requestAnimationFrame(() => {
        const c = scrollRef.current
        if (!c) return
        c.scrollLeft = center.x * nz - c.clientWidth / 2
        c.scrollTop = center.y * nz - c.clientHeight / 2
      })
    }
  }

  /* 切换工具前收尾（XP：切工具提交未完成的文字/曲线/多边形） */
  const setToolSafe = (t: Tool) => {
    if (textBox) commitText()
    if (curveSt.current) commitCurve()
    if (polySt.current) commitPolygon()
    lassoPts.current = null
    if (t !== 'select' && t !== 'fselect' && selRect) clearSelection()
    if (t !== 'zoom' && zoom !== 1) {
      /* XP：离开放大镜回到普通尺寸作画 */
      setZoomState(1)
    }
    setTool(t)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const p = getCvPos(e)
    /* XP 核心行为：右键 = 用背景色绘制（右键取色器 → 设背景色） */
    const isRight = e.button === 2

    /* 文字工具：点击文本框外部 → 提交旧文字并拖出新框（框内点击由 textarea 拦截） */
    if (tool === 'text') {
      if (textBox) commitText()
      textStart.current = p
      drawing.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    /* 放大镜：记录点击起点（位移 <4px 在 up 时判定缩放） */
    if (tool === 'zoom') {
      zoomClick.current = p
      drawing.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    /* 选择类工具：点击选区内 → 抓取拖动（Ctrl=复制）；选区外 → 重开新选区 */
    if ((tool === 'select' || tool === 'fselect') && selRect && !isRight) {
      const inSel = p.x >= selRect.x && p.x <= selRect.x + selRect.w && p.y >= selRect.y && p.y <= selRect.y + selRect.h
      if (inSel) {
        buildSelCanvas(selRect)
        selDrag.current = { offX: p.x - selRect.x, offY: p.y - selRect.y, mode: e.ctrlKey ? 'copy' : 'move' }
        snapshot()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
      clearSelection()
    }
    /* 右键取消选区 */
    if ((tool === 'select' || tool === 'fselect') && isRight && selRect) {
      clearSelection()
      return
    }

    /* 曲线：弯曲阶段的再次按下 */
    if (tool === 'curve' && curveSt.current) {
      const st = curveSt.current
      if (st.stage === 'wait1') {
        st.stage = 'drag1'
        st.c1 = p
      } else if (st.stage === 'wait2') {
        st.stage = 'drag2'
        st.c2 = p
      }
      drawing.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    /* 多边形：后续顶点 = 单击；近起点/右键 = 闭合 */
    if (tool === 'polygon' && polySt.current) {
      if (isRight || (polySt.current.pts.length >= 3 && dist(p, polySt.current.pts[0]) < 6)) {
        commitPolygon()
        return
      }
      polySt.current.pts.push(p)
      return
    }

    activeCol.current = isRight ? bgColor : color
    altCol.current = isRight ? color : bgColor
    if (tool === 'picker') {
      if (isRight) setBgColor(pickColor(p.x, p.y))
      else setColor(pickColor(p.x, p.y))
      return
    }
    if (tool === 'fill') {
      snapshot()
      floodFill(p.x, p.y, activeCol.current)
      return
    }
    /* 任意形状裁剪：开始套索 */
    if (tool === 'fselect') {
      lassoPts.current = [p]
      drawing.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    snapshot()
    drawing.current = true
    startPt.current = p
    setPos(p)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    /* 多边形：拖出第一条边（起点入列，pointerup 补终点） */
    if (tool === 'polygon') polySt.current = { pts: [p] }
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser' || tool === 'spray') {
      const ctx = canvasRef.current!.getContext('2d')!
      ctx.strokeStyle = tool === 'eraser' ? bgColor : activeCol.current
      ctx.fillStyle = tool === 'eraser' ? bgColor : activeCol.current
      ctx.lineWidth = tool === 'brush' ? brushSize * 2.5 : tool === 'eraser' ? brushSize * 4 : brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (tool === 'spray') sprayAt(p.x, p.y)
      else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
      }
    }
    /* 曲线第一阶段：记录起点 */
    if (tool === 'curve') {
      curveSt.current = { p0: p, p3: p, stage: 'line' }
    }
  }

  const sprayAt = (x: number, y: number) => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.fillStyle = activeCol.current
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * brushSize * 4
      ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1)
    }
  }

  /* 套索预览（虚线跟随） */
  const previewLasso = () => {
    const pts = lassoPts.current
    if (!pts || pts.length < 2) return
    const octx = overlayRef.current!.getContext('2d')!
    octx.clearRect(0, 0, W, H)
    octx.strokeStyle = '#111'
    octx.lineWidth = 1
    octx.setLineDash([4, 3])
    octx.beginPath()
    octx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) octx.lineTo(pts[i].x, pts[i].y)
    octx.stroke()
    octx.setLineDash([])
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = getCvPos(e)
    setPos(p)
    /* 拖动选区：预览图像移动（半透明跟随） */
    if (selDrag.current && selRect) {
      const img = selCanvasRef.current!
      const ov = overlayRef.current!
      const octx = ov.getContext('2d')!
      octx.clearRect(0, 0, W, H)
      const nx = Math.round(p.x - selDrag.current.offX)
      const ny = Math.round(p.y - selDrag.current.offY)
      octx.globalAlpha = 0.75
      octx.drawImage(img, nx, ny)
      octx.globalAlpha = 1
      octx.strokeStyle = '#111'
      octx.lineWidth = 1
      octx.setLineDash([4, 3])
      octx.strokeRect(nx + 0.5, ny + 0.5, img.width - 1, img.height - 1)
      octx.setLineDash([])
      return
    }
    /* 文字框拖拽预览 */
    if (tool === 'text' && drawing.current && textStart.current) {
      const octx = overlayRef.current!.getContext('2d')!
      octx.clearRect(0, 0, W, H)
      const s = textStart.current
      octx.strokeStyle = '#111'
      octx.lineWidth = 1
      octx.setLineDash([4, 3])
      octx.strokeRect(Math.min(s.x, p.x) + 0.5, Math.min(s.y, p.y) + 0.5, Math.abs(p.x - s.x), Math.abs(p.y - s.y))
      octx.setLineDash([])
      return
    }
    /* 套索拖拽 */
    if (tool === 'fselect' && drawing.current && lassoPts.current) {
      lassoPts.current.push(p)
      previewLasso()
      return
    }
    /* 曲线任意阶段预览 */
    if (tool === 'curve' && curveSt.current) {
      const st = curveSt.current
      if (st.stage === 'line' && startPt.current) {
        st.p3 = p
        previewCurve(null)
      } else if (st.stage === 'drag1') {
        st.c1 = p
        previewCurve(null)
      } else if (st.stage === 'drag2') {
        st.c2 = p
        previewCurve(null)
      }
      return
    }
    /* 多边形：拖第一条边 / 悬停橡皮筋预览 */
    if (tool === 'polygon' && polySt.current) {
      previewPolygon(drawing.current ? p : p)
      return
    }
    if (!drawing.current || !startPt.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      return
    }
    if (tool === 'spray') {
      sprayAt(p.x, p.y)
      return
    }
    /* 形状工具：画预览到 overlay */
    const ov = overlayRef.current!
    const octx = ov.getContext('2d')!
    octx.clearRect(0, 0, W, H)
    octx.strokeStyle = activeCol.current
    octx.lineWidth = brushSize
    octx.lineJoin = 'round'
    octx.setLineDash(tool === 'select' ? [4, 3] : [])
    const s = startPt.current
    const path = new Path2D()
    if (tool === 'line') {
      path.moveTo(s.x, s.y)
      path.lineTo(p.x, p.y)
    } else if (tool === 'rect' || tool === 'select') {
      path.rect(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.abs(p.x - s.x), Math.abs(p.y - s.y))
    } else if (tool === 'ellipse') {
      const rx = Math.abs(p.x - s.x) / 2
      const ry = Math.abs(p.y - s.y) / 2
      path.ellipse(Math.min(s.x, p.x) + rx, Math.min(s.y, p.y) + ry, rx, ry, 0, 0, Math.PI * 2)
    } else if (tool === 'rrect') {
      const r = Math.min(20, Math.abs(p.x - s.x) / 4, Math.abs(p.y - s.y) / 4)
      path.roundRect(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.abs(p.x - s.x), Math.abs(p.y - s.y), r)
    }
    octx.save()
    if ((tool === 'rect' || tool === 'ellipse' || tool === 'rrect') && shapeFill !== 'none') {
      octx.fillStyle = shapeFill === 'fg' ? activeCol.current : altCol.current
      octx.fill(path)
    }
    octx.stroke(path)
    octx.restore()
    octx.setLineDash([])
  }

  const onPointerUp = (e: React.PointerEvent) => {
    /* 提交选区拖动（移动/复制） */
    if (selDrag.current && selRect) {
      const p = getCvPos(e)
      const img = selCanvasRef.current!
      const ctx = canvasRef.current!.getContext('2d')!
      const octx = overlayRef.current!.getContext('2d')!
      const nx = Math.max(0, Math.min(W - img.width, Math.round(p.x - selDrag.current.offX)))
      const ny = Math.max(0, Math.min(H - img.height, Math.round(p.y - selDrag.current.offY)))
      /* 移动：原区域按选区形状填背景色；复制：保留原区域 */
      if (selDrag.current.mode === 'move') eraseSelArea()
      ctx.drawImage(img, nx, ny)
      if (selPathRef.current) selPathRef.current = translatePath(selPathRef.current, nx - selRect.x, ny - selRect.y)
      const nw = img.width
      const nh = img.height
      selDrag.current = null
      octx.clearRect(0, 0, W, H)
      /* 新选区蚂蚁线常驻 */
      octx.strokeStyle = '#111'
      octx.lineWidth = 1
      octx.setLineDash([4, 3])
      if (selPathRef.current) octx.stroke(selPathRef.current)
      else octx.strokeRect(nx + 0.5, ny + 0.5, nw - 1, nh - 1)
      octx.setLineDash([])
      setSelRect({ x: nx, y: ny, w: nw, h: nh })
      return
    }
    /* 放大镜：位移 <4px = 点击缩放（左键放大/右键缩小），8x 再点回 1x */
    if (tool === 'zoom' && zoomClick.current) {
      const p = getCvPos(e)
      const moved = dist(p, zoomClick.current)
      const isRight = e.button === 2
      if (moved < 4) {
        const i = ZOOM_STEPS.indexOf(zoom)
        if (isRight) setZoomAt(ZOOM_STEPS[Math.max(0, i - 1)], zoomClick.current)
        else setZoomAt(ZOOM_STEPS[(i + 1) % ZOOM_STEPS.length], zoomClick.current)
      }
      zoomClick.current = null
      drawing.current = false
      return
    }
    /* 文字框：拖出定尺寸框；单击 = 默认尺寸框 */
    if (tool === 'text' && drawing.current && textStart.current) {
      const p = getCvPos(e)
      const s = textStart.current
      textStart.current = null
      drawing.current = false
      const w = Math.abs(p.x - s.x)
      const h = Math.abs(p.y - s.y)
      const lh = Math.round(textSize * 1.25)
      const box = w > 8 && h > 8
        ? { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w, h }
        : { x: Math.max(0, Math.min(s.x, W - 180)), y: Math.max(0, Math.min(s.y, H - lh - 6)), w: 180, h: lh + 6 }
      clearOverlay()
      setTextBox(box)
      setTextValue('')
      /* 文字框虚线常驻 */
      const octx = overlayRef.current!.getContext('2d')!
      octx.strokeStyle = '#111'
      octx.lineWidth = 1
      octx.setLineDash([4, 3])
      octx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1)
      octx.setLineDash([])
      return
    }
    /* 套索收尾 */
    if (tool === 'fselect' && drawing.current && lassoPts.current) {
      finishLasso(lassoPts.current)
      lassoPts.current = null
      drawing.current = false
      return
    }
    /* 曲线阶段推进：直线定 → 弯1 → 弯2 → 提交 */
    if (tool === 'curve' && curveSt.current) {
      const p = getCvPos(e)
      const st = curveSt.current
      if (st.stage === 'line') {
        st.p3 = p
        st.stage = 'wait1'
        previewCurve(null)
      } else if (st.stage === 'drag1') {
        st.c1 = p
        st.stage = 'wait2'
        previewCurve(null)
      } else if (st.stage === 'drag2') {
        st.c2 = p
        commitCurve()
      }
      drawing.current = false
      startPt.current = null
      return
    }
    /* 多边形第一条边拖完 */
    if (tool === 'polygon' && drawing.current && polySt.current) {
      const p = getCvPos(e)
      const poly = polySt.current
      if (poly.pts.length === 1 && dist(p, poly.pts[0]) > 3) poly.pts.push(p)
      else if (poly.pts.length === 1 && dist(p, poly.pts[0]) <= 3) {
        /* 单击未拖动：取消 */
        polySt.current = null
        clearOverlay()
      }
      drawing.current = false
      startPt.current = null
      return
    }
    if (!drawing.current || !startPt.current) {
      drawing.current = false
      return
    }
    const p = getCvPos(e)
    const s = startPt.current
    drawing.current = false
    startPt.current = null
    if (tool === 'line' || tool === 'rect' || tool === 'ellipse' || tool === 'rrect') {
      const ctx = canvasRef.current!.getContext('2d')!
      clearOverlay()
      const path = new Path2D()
      if (tool === 'line') {
        path.moveTo(s.x, s.y)
        path.lineTo(p.x, p.y)
      } else if (tool === 'rect') {
        path.rect(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.abs(p.x - s.x), Math.abs(p.y - s.y))
      } else if (tool === 'ellipse') {
        const rx = Math.abs(p.x - s.x) / 2
        const ry = Math.abs(p.y - s.y) / 2
        path.ellipse(Math.min(s.x, p.x) + rx, Math.min(s.y, p.y) + ry, rx, ry, 0, 0, Math.PI * 2)
      } else if (tool === 'rrect') {
        const r = Math.min(20, Math.abs(p.x - s.x) / 4, Math.abs(p.y - s.y) / 4)
        path.roundRect(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.abs(p.x - s.x), Math.abs(p.y - s.y), r)
      }
      if (tool === 'line') {
        ctx.save()
        ctx.strokeStyle = activeCol.current
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.stroke(path)
        ctx.restore()
      } else {
        applyFillStroke(ctx, path)
      }
    } else if (tool === 'select') {
      clearOverlay()
      /* 新选区：尺寸太小视为取消，否则保留蚂蚁线选区 */
      const w = Math.abs(p.x - s.x)
      const h = Math.abs(p.y - s.y)
      if (w > 3 && h > 3) {
        selPathRef.current = null
        const rect = { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w, h }
        setSelRect(rect)
        buildSelCanvas(rect)
        /* 蚂蚁线常驻显示 */
        const octx = overlayRef.current!.getContext('2d')!
        octx.strokeStyle = '#111'
        octx.lineWidth = 1
        octx.setLineDash([4, 3])
        octx.strokeRect(rect.x + 0.5, rect.y + 0.5, w - 1, h - 1)
        octx.setLineDash([])
      } else {
        setSelRect(null)
      }
    }
  }

  const onDoubleClick = () => {
    /* 多边形：双击闭合 */
    if (tool === 'polygon' && polySt.current) commitPolygon()
  }

  const invert = () => {
    snapshot()
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    const img = ctx.getImageData(0, 0, W, H)
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255 - img.data[i]
      img.data[i + 1] = 255 - img.data[i + 1]
      img.data[i + 2] = 255 - img.data[i + 2]
    }
    ctx.putImageData(img, 0, 0)
  }

  const clearImage = () => {
    snapshot()
    clearSelection()
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, W, H)
  }

  const save = () => {
    /* XP 真实行为：保存到「图片收藏」（无文件名时弹另存为） */
    if (savedName) {
      doSaveVfs(savedName)
    } else {
      setSaveAsName('未命名.bmp')
      setSaveAsDlg(true)
    }
  }

  const doSaveVfs = (name: string) => {
    const finalName = /\.(bmp|png|jpg|jpeg|gif)$/i.test(name) ? name : `${name}.bmp`
    const data = canvasRef.current!.toDataURL('image/png')
    const written = fsWriteFile(picsDir, finalName, '', { icon: 'bmp', type: 'BMP 图像', src: data })
    setSavedName(written)
    setWindowTitle(win.id, `${written} - 画图`)
    playClick()
    toast(`已保存到 图片收藏\\${written}（虚拟文件系统）`)
  }

  const openFromVfs = (node: { name: string; src?: string }) => {
    if (!node.src) { toast('该文件不是图片'); return }
    const im = new Image()
    im.onload = () => {
      snapshot()
      setW(im.width)
      setH(im.height)
      clearSelection()
      requestAnimationFrame(() => {
        const cv = canvasRef.current
        if (!cv) return
        const ctx = cv.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, im.width, im.height)
        ctx.drawImage(im, 0, 0)
      })
      setSavedName(node.name)
      setWindowTitle(win.id, `${node.name} - 画图`)
      setOpenDlg(false)
      toast(`已打开 ${node.name}`)
    }
    im.onerror = () => toast('图片加载失败')
    im.src = node.src
  }

  /* 图片收藏内的图片清单（打开对话框数据源） */
  const picsDir = ['本地磁盘 (C:)', 'Documents and Settings', sessionUser, 'My Documents', '图片收藏']
  const picsList = useMemo(() => {
    const walk = (n: typeof fsTree): Array<{ name: string; src?: string; dir: string }> => {
      const out: Array<{ name: string; src?: string; dir: string }> = []
      for (const c of n.children ?? []) {
        if (c.kind === 'folder') out.push(...walk(c))
        else if (c.src && (c.icon === 'bmp' || c.icon === 'image')) out.push({ name: c.name, src: c.src, dir: c.name })
      }
      return out
    }
    return walk(fsTree)
  }, [fsTree])

  /* ── 画图键盘快捷键（XP 键位，仅聚焦本窗口时生效） ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const st = useXP.getState()
      const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
      if (top?.id !== win.id) return
      /* 文字编辑中：除 Esc 外全部放行给 textarea */
      const tgt = e.target as HTMLElement
      if (textBox && tgt && (tgt.tagName === 'TEXTAREA' || tgt.tagName === 'INPUT')) {
        if (e.key === 'Escape') {
          e.preventDefault()
          commitText()
        }
        return
      }
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const kl = e.key.toLowerCase()
        if (kl === 'z') { e.preventDefault(); undo() }
        else if (kl === 'y') { e.preventDefault(); redo() }
        else if (kl === 's') { e.preventDefault(); save() }
        else if (kl === 'n') { e.preventDefault(); clearImage() }
        else if (kl === 'p') { e.preventDefault(); toast('打印失败：未找到打印机（2001 年常见问题）') }
        else if (kl === 'i') { e.preventDefault(); invert() }
        else if (kl === 'g') { e.preventDefault(); toast('网格：已切换（视觉上概不负责）') }
      } else {
        if (e.key === 'Escape') {
          /* Esc 级联收尾：文字 → 曲线 → 多边形 → 选区 */
          if (textBox) commitText()
          else if (curveSt.current) commitCurve()
          else if (polySt.current) { polySt.current = null; clearOverlay() }
          else if (selRect) clearSelection()
        }
        /* 选区操作：Del 清除（XP 画图键位，按选区形状掩膜擦除） */
        if (e.key === 'Delete' && selRect && (tool === 'select' || tool === 'fselect')) {
          e.preventDefault()
          snapshot()
          eraseSelArea()
          clearSelection()
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [win.id, bgColor, brushSize, selRect, tool, textBox, textValue, textFontIdx, textSize, textBold, textItalic, textUnder, textOpaque, zoom])

  /* 文字内容变化时自动扩框（XP 文本框随输入增高） */
  useEffect(() => {
    if (!textBox) return
    const lh = Math.round(textSize * 1.25)
    const lines = textValue.replace(/\r/g, '').split('\n').length
    const need = lines * lh + 8
    if (need > textBox.h) setTextBox({ ...textBox, h: need })
  }, [textValue, textSize])

  const f = FONTS[textFontIdx]
  const textLh = Math.round(textSize * 1.25)

  return (
    <div className="relative flex flex-col h-full select-none bg-[#ece9d8]">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建(N)', accelerator: 'Ctrl+N', onClick: clearImage },
              { label: '打开(O)...', accelerator: 'Ctrl+O', onClick: () => setOpenDlg(true) },
              { label: '保存(S)', accelerator: 'Ctrl+S', onClick: save },
              { label: '另存为(A)...', onClick: () => { setSaveAsName(savedName || '未命名.bmp'); setSaveAsDlg(true) } },
              { separator: true },
              { label: '退出(X)', onClick: () => useXP.getState().closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '撤销(U)', accelerator: 'Ctrl+Z', onClick: undo },
              { label: '重复(R)', accelerator: 'Ctrl+Y', onClick: redo },
            ],
          },
          {
            label: '查看(V)',
            items: [
              {
                label: '缩放(Z)',
                submenu: [
                  { label: '普通尺寸(N)', radio: true, checked: zoom === 1, onClick: () => setZoomAt(1) },
                  { label: '大尺寸(L)', submenu: ZOOM_STEPS.slice(1).map((z) => ({ label: `${z}x`, radio: true, checked: zoom === z, onClick: () => setZoomAt(z) })) },
                  { separator: true },
                  { label: '显示网格(G)', checked: zoom >= 4, disabled: zoom < 2, onClick: () => toast(zoom >= 4 ? '已隐藏像素网格（4x 及以上可见）' : '像素网格在 4x 及以上缩放时显示') },
                ],
              },
              { separator: true },
              { label: '文字工具栏(T)', checked: showTextBar, onClick: () => setShowTextBar(!showTextBar) },
            ],
          },
          {
            label: '图像(I)',
            items: [
              { label: '翻转/旋转(F)...', accelerator: 'Ctrl+R', onClick: () => setFlipDlg(true) },
              { label: '拉伸/扭曲(S)...', accelerator: 'Ctrl+W', onClick: () => { setStretch({ sx: 100, sy: 100, kx: 0, ky: 0 }); setStretchDlg(true) } },
              { label: '反色(V)', accelerator: 'Ctrl+I', onClick: invert },
              { separator: true },
              { label: '属性(A)...', accelerator: 'Ctrl+E', onClick: () => { setAttr({ w: W, h: H, unit: 'px', bw: false }); setAttrDlg(true) } },
              { label: '清除图像(C)', accelerator: 'Ctrl+Shift+N', onClick: clearImage },
            ],
          },
          {
            label: '颜色(C)',
            items: [{ label: '编辑颜色(E)...', disabled: true }],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '关于画图(A)', onClick: () => useXP.getState().openApp('about', { title: '关于“画图”', text: '画图（Web 复刻版）\n版本 5.1 (Build 2600)\n\nXP 全部 16 种工具齐备：任意形状的裁剪、选定、橡皮、用颜色填充、取色、放大镜、刷子、喷枪、文字、直线、曲线、矩形、多边形、椭圆、圆角矩形、铅笔。\n形状支持三种填充模式，选择支持透明/不透明，文字工具栏可改字体字号，放大镜 1x-8x 带像素网格。' }) },
            ],
          },
        ]}
      />

      {/* 文字工具栏（XP：文字工具激活时显示，字体/字号/加粗/斜体/下划线） */}
      {tool === 'text' && showTextBar ? (
        <div className="flex items-center gap-[3px] px-1 py-[2px] border-b border-[#d8d5c8] bg-[#ece9d8]">
          <select
            className="h-[19px] text-[11px] border border-[#7f9db9] bg-white px-[2px] max-w-[110px]"
            value={textFontIdx}
            onChange={(e) => setTextFontIdx(Number(e.target.value))}
          >
            {FONTS.map((ft, i) => (
              <option key={ft.label} value={i} style={{ fontFamily: ft.css }}>{ft.label}</option>
            ))}
          </select>
          <select
            className="h-[19px] text-[11px] border border-[#7f9db9] bg-white px-[2px]"
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="w-[2px] h-[16px] bg-[#b0aca0] mx-[2px]" />
          {([
            ['B', textBold, () => setTextBold(!textBold), 'bold'],
            ['I', textItalic, () => setTextItalic(!textItalic), 'italic'],
            ['U', textUnder, () => setTextUnder(!textUnder), 'underline'],
          ] as const).map(([lbl, on, fn, deco]) => (
            <button
              key={lbl}
              type="button"
              className={`w-[21px] h-[19px] border text-[12px] font-serif ${on ? 'border-[#316ac5] bg-[#c8dcf8]' : 'border-[#b0aca0] bg-[#f4f2e8] hover:bg-[#e8e4d8]'}`}
              style={{ textDecoration: deco }}
              onClick={fn}
            >
              {lbl}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] text-[#5a5a4a] pr-1">文字工具栏</span>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
        {/* 工具栏 */}
        <div className="w-[56px] shrink-0 p-[4px]">
          <div className="grid grid-cols-2 gap-[2px]">
            {TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                title={TOOL_TITLES[t]}
                className={`paint-tool ${tool === t ? 'paint-tool-on' : ''}`}
                onClick={() => setToolSafe(t)}
              >
                <ToolIcon kind={t} active={tool === t} />
              </button>
            ))}
          </div>

          {/* 工具选项区（XP：随工具切换） */}
          {['pencil', 'line', 'curve', 'brush', 'eraser', 'spray'].includes(tool) ? (
            <div className="mt-2 mx-auto w-[32px] border border-[#8a8a8a] bg-white rounded-[2px] divide-y divide-[#e0e0e0]">
              {[1, 2, 4, 6].map((s) => (
                <button key={s} type="button" className="w-full flex items-center justify-center h-[12px] hover:bg-[#e8f0fb]" onClick={() => setBrushSize(s)}>
                  <span className="block rounded-full bg-black" style={{ width: s + 1, height: s + 1 }} />
                </button>
              ))}
            </div>
          ) : null}
          {tool === 'zoom' ? (
            <div className="mt-2 flex flex-col gap-[2px] items-stretch">
              {ZOOM_STEPS.map((z) => (
                <button
                  key={z}
                  type="button"
                  className={`h-[16px] text-[10px] border ${zoom === z ? 'border-[#316ac5] bg-[#c8dcf8] text-[#1a4fa0] font-bold' : 'border-[#b0aca0] bg-[#f4f2e8] hover:bg-[#e8e4d8]'}`}
                  onClick={() => setZoomAt(z)}
                >
                  {z}x
                </button>
              ))}
            </div>
          ) : null}
          {['rect', 'ellipse', 'rrect', 'polygon'].includes(tool) ? (
            <div className="mt-2 flex flex-col gap-[2px]">
              {([
                ['fg', '前景填充', <span key="a" className="block w-[13px] h-[11px] bg-black border border-[#666]" />],
                ['bg', '背景填充', <span key="b" className="block w-[13px] h-[11px] bg-white border border-black" />],
                ['none', '仅边框', <span key="c" className="block w-[13px] h-[11px] border border-black" />],
              ] as const).map(([mode, tip, icon]) => (
                <button
                  key={mode}
                  type="button"
                  title={tip}
                  className={`h-[17px] flex items-center justify-center border ${shapeFill === mode ? 'border-[#316ac5] bg-[#c8dcf8]' : 'border-[#b0aca0] bg-[#f4f2e8] hover:bg-[#e8e4d8]'}`}
                  onClick={() => setShapeFill(mode)}
                >
                  {icon}
                </button>
              ))}
            </div>
          ) : null}
          {tool === 'select' || tool === 'fselect' ? (
            <div className="mt-2 flex flex-col gap-[2px]">
              {([
                [false, '不透明', <span key="a" className="block w-[13px] h-[11px] bg-[#3a6ea5] border border-black" />],
                [true, '透明', <span key="b" className="block w-[13px] h-[11px] border border-black bg-[linear-gradient(45deg,#fff_46%,#3a6ea5_46%,#3a6ea5_54%,#fff_54%)]" />],
              ] as const).map(([mode, tip, icon]) => (
                <button
                  key={String(mode)}
                  type="button"
                  title={tip}
                  className={`h-[17px] flex items-center justify-center border ${selTransparent === mode ? 'border-[#316ac5] bg-[#c8dcf8]' : 'border-[#b0aca0] bg-[#f4f2e8] hover:bg-[#e8e4d8]'}`}
                  onClick={() => setSelTransparent(mode)}
                >
                  {icon}
                </button>
              ))}
            </div>
          ) : null}
          {tool === 'text' ? (
            <div className="mt-2 flex flex-col gap-[2px]">
              {([
                [false, '透明', <span key="a" className="text-[10px] leading-none">Aa</span>],
                [true, '不透明', <span key="b" className="text-[10px] leading-none bg-[#ffff9e] px-[2px]">Aa</span>],
              ] as const).map(([mode, tip, icon]) => (
                <button
                  key={String(mode)}
                  type="button"
                  title={tip}
                  className={`h-[17px] flex items-center justify-center border ${textOpaque === mode ? 'border-[#316ac5] bg-[#c8dcf8]' : 'border-[#b0aca0] bg-[#f4f2e8] hover:bg-[#e8e4d8]'}`}
                  onClick={() => setTextOpaque(mode)}
                >
                  {icon}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* 画布区 */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-[#808080] p-[6px] xp-thin-scroll">
          <div className="relative bg-white shadow-[2px_2px_0_#404040] inline-block" style={{ width: W * zoom, height: H * zoom }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block touch-none cursor-crosshair"
              style={{ width: '100%', height: '100%', imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onDoubleClick={onDoubleClick}
              onContextMenu={(e) => e.preventDefault()}
            />
            <canvas
              ref={overlayRef}
              width={W}
              height={H}
              className="absolute inset-0 block pointer-events-none"
              style={{ width: '100%', height: '100%', imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
            />
            {/* 像素网格（XP：4x 及以上显示） */}
            {zoom >= 4 ? (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(128,128,128,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.35) 1px, transparent 1px)',
                  backgroundSize: `${zoom}px ${zoom}px`,
                }}
              />
            ) : null}
            {/* 文字输入框（缩放同步：位置/字号 × zoom） */}
            {textBox ? (
              <textarea
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                spellCheck={false}
                className="absolute z-10 outline-none resize-none overflow-hidden p-0 border border-dashed border-[#111] cursor-text"
                style={{
                  left: textBox.x * zoom,
                  top: textBox.y * zoom,
                  width: textBox.w * zoom,
                  height: textBox.h * zoom,
                  color,
                  background: textOpaque ? bgColor : 'transparent',
                  fontFamily: f.css,
                  fontSize: textSize * zoom,
                  lineHeight: `${textLh * zoom}px`,
                  fontWeight: textBold ? 'bold' : 'normal',
                  fontStyle: textItalic ? 'italic' : 'normal',
                  textDecoration: textUnder ? 'underline' : 'none',
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* 调色板 */}
      <div className="flex items-center gap-2 p-[4px] border-t border-[#d8d5c8] bg-[#ece9d8]">
        <div className="flex gap-[2px] items-center">
          <div className="relative w-[30px] h-[30px]">
            <span className="absolute left-0 top-0 w-[20px] h-[20px] bg-white border border-[#8a8a8a]" style={{ background: bgColor }} />
            <span className="absolute left-[9px] top-[9px] w-[20px] h-[20px] bg-white border border-[#5a5a5a]" style={{ background: color }} />
          </div>
          <div className="w-[14px]" />
          <div className="grid grid-rows-2 grid-flow-col gap-[1px]">
            {PALETTE.map((col) => (
              <button
                key={col}
                type="button"
                className={`w-[15px] h-[15px] border ${color === col ? 'border-[#1a3a8a] outline outline-1 outline-[#d8e0f0]' : 'border-[#8a8a8a]'}`}
                style={{ background: col }}
                onClick={() => setColor(col)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setBgColor(col)
                }}
                title={`左键前景色 / 右键背景色 ${col}`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 text-[10px] text-[#6a6a5a] text-right">
          {pos ? `${pos.x},${pos.y}${zoom > 1 ? ` · ${zoom}x` : ''}` : ''}
        </div>
      </div>

      {/* ── 翻转/旋转对话框（图像→翻转/旋转，XP 经典单选组） ── */}
      {flipDlg ? (
        <div className="absolute inset-0 bg-black/15 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[218px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">翻转和旋转</div>
            <div className="p-3">
              <div className="border border-[#a0a0a0] rounded-[3px] p-2 m-1">
                <div className="text-[11px] -mt-[13px] bg-[#ece9d8] w-fit px-1 ml-1">翻转和旋转</div>
                <div className="space-y-[3px] mt-1">
                  <XPRadio checked={flipMode === 'h'} label="水平翻转(H)" onChange={() => setFlipMode('h')} />
                  <XPRadio checked={flipMode === 'v'} label="垂直翻转(V)" onChange={() => setFlipMode('v')} />
                  <div className="flex items-center gap-2">
                    <XPRadio checked={['90', '180', '270'].includes(flipMode)} label="按(N):" onChange={() => setFlipMode('90')} />
                    <div className="space-y-[2px] pl-4 border-l border-[#b0b0a0]">
                      <XPRadio checked={flipMode === '90'} label="90 度(9)" onChange={() => setFlipMode('90')} />
                      <XPRadio checked={flipMode === '180'} label="180 度(1)" onChange={() => setFlipMode('180')} />
                      <XPRadio checked={flipMode === '270'} label="270 度(2)" onChange={() => setFlipMode('270')} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pr-1">
                <button type="button" className="xp-btn xp-btn-primary w-[70px] h-[22px] text-[11px]" onClick={() => { applyFlipRotate(flipMode); setFlipDlg(false) }}>确定</button>
                <button type="button" className="xp-btn w-[70px] h-[22px] text-[11px]" onClick={() => setFlipDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 拉伸/扭曲对话框（图像→拉伸/扭曲，双 GroupBox 四输入框） ── */}
      {stretchDlg ? (
        <div className="absolute inset-0 bg-black/15 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[240px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">拉伸和扭曲</div>
            <div className="p-3">
              <div className="border border-[#a0a0a0] rounded-[3px] p-2 m-1">
                <div className="text-[11px] -mt-[13px] bg-[#ece9d8] w-fit px-1 ml-1">拉伸</div>
                <div className="space-y-[4px] mt-1">
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">水平(H):</span>
                    <input
                      className="w-[56px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={stretch.sx}
                      onChange={(e) => setStretch((s) => ({ ...s, sx: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                    />
                    <span>%</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">垂直(V):</span>
                    <input
                      className="w-[56px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={stretch.sy}
                      onChange={(e) => setStretch((s) => ({ ...s, sy: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                    />
                    <span>%</span>
                  </label>
                </div>
              </div>
              <div className="border border-[#a0a0a0] rounded-[3px] p-2 m-1 mt-2">
                <div className="text-[11px] -mt-[13px] bg-[#ece9d8] w-fit px-1 ml-1">扭曲</div>
                <div className="space-y-[4px] mt-1">
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">水平(H):</span>
                    <input
                      className="w-[56px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={stretch.kx}
                      onChange={(e) => setStretch((s) => ({ ...s, kx: Number(e.target.value.replace(/[^-\d]/g, '')) || 0 }))}
                    />
                    <span>度</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">垂直(V):</span>
                    <input
                      className="w-[56px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={stretch.ky}
                      onChange={(e) => setStretch((s) => ({ ...s, ky: Number(e.target.value.replace(/[^-\d]/g, '')) || 0 }))}
                    />
                    <span>度</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pr-1">
                <button
                  type="button"
                  className="xp-btn xp-btn-primary w-[70px] h-[22px] text-[11px]"
                  onClick={() => {
                    const { sx, sy, kx, ky } = stretch
                    if (sx > 0 && sy > 0 && sx <= 500 && sy <= 500 && Math.abs(kx) <= 88 && Math.abs(ky) <= 88) {
                      applyStretchSkew(sx, sy, kx, ky)
                      setStretchDlg(false)
                    } else {
                      toast('拉伸需在 1-500% 之间，扭曲需在 -88 到 88 度之间')
                    }
                  }}
                >
                  确定
                </button>
                <button type="button" className="xp-btn w-[70px] h-[22px] text-[11px]" onClick={() => setStretchDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 属性对话框（图像→属性：尺寸/单位/颜色，改画布真实生效） ── */}
      {attrDlg ? (
        <div className="absolute inset-0 bg-black/15 flex items-center justify-center z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#ece9d8] border-2 border-[#0831d9] shadow-xl w-[240px] xp-dialog">
            <div className="text-white text-[11px] font-bold px-2 py-[3px] xp-titlebar-flat">属性</div>
            <div className="p-3">
              <div className="text-[11px] text-[#3a3a3a] mb-2">文件最后保存时间: 未保存</div>
              <div className="border border-[#a0a0a0] rounded-[3px] p-2 m-1">
                <div className="text-[11px] -mt-[13px] bg-[#ece9d8] w-fit px-1 ml-1">尺寸(像素)</div>
                <div className="space-y-[4px] mt-1">
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">宽度(W):</span>
                    <input
                      className="w-[64px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={attr.w}
                      onChange={(e) => setAttr((a) => ({ ...a, w: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px]">
                    <span className="w-[52px] text-right">高度(H):</span>
                    <input
                      className="w-[64px] h-[19px] xp-sunken text-[11px] px-1 text-right"
                      value={attr.h}
                      onChange={(e) => setAttr((a) => ({ ...a, h: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                    />
                  </label>
                </div>
              </div>
              <div className="text-[11px] mt-2 ml-1">单位</div>
              <div className="flex gap-3 ml-2">
                <XPRadio checked={attr.unit === 'in'} label="英寸" onChange={() => setAttr((a) => ({ ...a, unit: 'in' }))} />
                <XPRadio checked={attr.unit === 'cm'} label="厘米" onChange={() => setAttr((a) => ({ ...a, unit: 'cm' }))} />
                <XPRadio checked={attr.unit === 'px'} label="像素" onChange={() => setAttr((a) => ({ ...a, unit: 'px' }))} />
              </div>
              <div className="text-[11px] mt-2 ml-1">颜色</div>
              <div className="flex gap-3 ml-2">
                <XPRadio checked={attr.bw} label="黑白" onChange={() => setAttr((a) => ({ ...a, bw: true }))} />
                <XPRadio checked={!attr.bw} label="彩色" onChange={() => setAttr((a) => ({ ...a, bw: false }))} />
              </div>
              <div className="flex justify-end gap-2 mt-3 pr-1">
                <button
                  type="button"
                  className="xp-btn xp-btn-primary w-[70px] h-[22px] text-[11px]"
                  onClick={() => {
                    /* 英寸/厘米换算（96 DPI / 37.8 px 每厘米） */
                    const k = attr.unit === 'in' ? 96 : attr.unit === 'cm' ? 37.8 : 1
                    const nw = Math.min(2000, Math.max(16, Math.round(attr.w * (attr.unit === 'px' ? 1 : k))))
                    const nh = Math.min(2000, Math.max(16, Math.round(attr.h * (attr.unit === 'px' ? 1 : k))))
                    applyAttr(nw, nh, attr.bw)
                    setAttrDlg(false)
                  }}
                >
                  确定
                </button>
                <button type="button" className="xp-btn w-[70px] h-[22px] text-[11px]" onClick={() => setAttrDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 另存为对话框（保存到 图片收藏） */}
      {saveAsDlg ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <div className="w-[340px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)]">
            <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">保存为</div>
            <div className="p-4 text-[11px] space-y-3">
              <div className="text-[#444]">保存位置: 图片收藏</div>
              <div className="flex items-center gap-2">
                <span className="w-[52px] text-right">文件名(N):</span>
                <input
                  className="flex-1 h-[20px] px-[4px] bg-white border border-[#7f9db9] outline-none text-[11px]"
                  value={saveAsName}
                  autoFocus
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => { imeEnter(e, (v) => { if (v.trim()) { doSaveVfs(v.trim()); setSaveAsDlg(false) } }) }}
                />
              </div>
              <div className="text-[#888]">保存类型: 位图 (*.bmp)</div>
              <div className="flex justify-end gap-2">
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" disabled={!saveAsName.trim()} onClick={() => { doSaveVfs(saveAsName.trim()); setSaveAsDlg(false) }}>保存(S)</button>
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" onClick={() => setSaveAsDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 打开对话框（图片收藏/壁纸图片） */}
      {openDlg ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
          <div className="w-[380px] bg-[#ece9d8] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)]">
            <div className="h-[24px] flex items-center px-2 bg-gradient-to-b from-[#2a72c8] to-[#1648a0] text-white text-[11px] font-bold">打开</div>
            <div className="p-4 text-[11px]">
              <div className="xp-sunken bg-white h-[200px] overflow-y-auto xp-thin-scroll">
                {picsList.length === 0 ? (
                  <div className="text-[#888] text-center py-8">没有可打开的图片</div>
                ) : picsList.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="w-full flex items-center gap-2 px-2 py-[3px] text-left hover:bg-[#e8f0fb]"
                    onClick={() => openFromVfs(p)}
                  >
                    <img src={p.src} alt="" width={18} height={18} className="object-contain shrink-0" draggable={false} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" className="xp-btn px-4 h-[22px] text-[11px]" onClick={() => setOpenDlg(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
