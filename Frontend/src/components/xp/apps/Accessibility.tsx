'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { playClick } from '../sounds'

/* ══════════════════════════════════════════════════════════════════
 * XP 辅助工具四件套：屏幕键盘(osk) / 放大镜(magnify) / 讲述人(narrator) / 辅助工具管理器(utilman)
 * 图标：PIL 预绘 PNG（scripts/b14_access.py，三桶 48/32/16）
 * ══════════════════════════════════════════════════════════════════ */

import { Bmp } from '../bmp'

export function OSKIcon({ size, className }: { size?: number; className?: string }) {
  return <Bmp name="osk" size={size ?? 32} className={className} />
}
export function MagnifierIcon({ size, className }: { size?: number; className?: string }) {
  return <Bmp name="magnifier" size={size ?? 32} className={className} />
}
export function NarratorIcon({ size, className }: { size?: number; className?: string }) {
  return <Bmp name="narrator" size={size ?? 32} className={className} />
}
export function UtilManIcon({ size, className }: { size?: number; className?: string }) {
  return <Bmp name="utilman" size={size ?? 32} className={className} />
}

/* ══════════════════ 1. 屏幕键盘 osk.exe ══════════════════ */

/* 最近聚焦的输入元素（OSK 点击按键不抢焦点，向此元素发送击键） */
let oskTarget: HTMLInputElement | HTMLTextAreaElement | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      oskTarget = el
    } else if (el?.isContentEditable) {
      oskTarget = null
    }
  })
}

/** 通过原生 setter 写值 → React onChange 正常触发 */
function oskInsert(text: string) {
  const el = oskTarget
  if (!el || !el.isConnected) return false
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  setter?.call(el, el.value.slice(0, start) + text + el.value.slice(end))
  const caret = start + text.length
  el.setSelectionRange(caret, caret)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

/** 特殊键：Backspace / Delete / 方向 / Home / End */
function oskSpecial(key: string) {
  const el = oskTarget
  if (!el || !el.isConnected) return false
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  let value = el.value
  let caret = start
  switch (key) {
    case 'Backspace':
      if (start === end && start > 0) {
        value = value.slice(0, start - 1) + value.slice(end)
        caret = start - 1
      } else {
        value = value.slice(0, start) + value.slice(end)
        caret = start
      }
      break
    case 'Delete':
      if (start === end && end < value.length) value = value.slice(0, start) + value.slice(end + 1)
      else value = value.slice(0, start) + value.slice(end)
      caret = start
      break
    case 'ArrowLeft': caret = Math.max(0, start - (start === end ? 1 : 0)); break
    case 'ArrowRight': caret = Math.min(value.length, end + (start === end ? 1 : 0)); break
    case 'ArrowUp': { const line = value.lastIndexOf('\n', Math.max(0, start - 1)); caret = line >= 0 ? line : 0; break }
    case 'ArrowDown': { const line = value.indexOf('\n', end); caret = line >= 0 ? Math.min(value.length, line + 1) : value.length; break }
    case 'Home': { const line = value.lastIndexOf('\n', Math.max(0, start - 1)); caret = line >= 0 ? line + 1 : 0; break }
    case 'End': { const line = value.indexOf('\n', start); caret = line >= 0 ? line : value.length; break }
    default: return false
  }
  if (value !== el.value) setter?.call(el, value)
  if (key.startsWith('Arrow') || key === 'Home' || key === 'End') {
    if (key.endsWith('Left') || key === 'Home') el.setSelectionRange(caret, caret)
    else el.setSelectionRange(caret, caret)
    /* 光标移动也要触发受控更新（某些组件依赖 onChange 同步） */
    if (value === el.value) el.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    el.setSelectionRange(caret, caret)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  return true
}

type OskKey = { l: string; u?: number; k?: string; mod?: 'shift' | 'caps' | 'ctrl' | 'alt' | 'win'; enter?: boolean; blank?: boolean }

/* 增强型键盘（标准 101/102 键布局） */
const F_ROW: OskKey[] = [
  { l: 'Esc', k: 'Escape' },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ l: `F${n}` })),
  { l: 'PrtSc\nSysRq' }, { l: 'ScrLk' }, { l: 'Pause\nBreak' },
]
const R1: OskKey[] = [
  { l: '`', k: '`' },
  ...'1234567890'.split('').map((c) => ({ l: c, k: c })),
  { l: '-', k: '-' }, { l: '=', k: '=' },
  { l: 'Backspace', k: 'Backspace', u: 2 },
]
const R2: OskKey[] = [
  { l: 'Tab', k: 'Tab', u: 1.5 },
  ...'QWERTYUIOP'.split('').map((c) => ({ l: c, k: c })),
  { l: '[', k: '[' }, { l: ']', k: ']' }, { l: '\\', k: '\\', u: 1.5 },
]
const R3: OskKey[] = [
  { l: 'Caps\nLock', mod: 'caps', u: 1.75 },
  ...'ASDFGHJKL'.split('').map((c) => ({ l: c, k: c })),
  { l: ';', k: ';' }, { l: "'", k: "'" },
  { l: 'Enter', k: 'Enter', enter: true, u: 2.25 },
]
const R4: OskKey[] = [
  { l: 'Shift', mod: 'shift', u: 2.25 },
  ...'ZXCVBNM'.split('').map((c) => ({ l: c, k: c })),
  { l: ',', k: ',' }, { l: '.', k: '.' }, { l: '/', k: '/' },
  { l: 'Shift', mod: 'shift', u: 2.75 },
]
const R5: OskKey[] = [
  { l: 'Ctrl', mod: 'ctrl', u: 1.25 },
  { l: 'Win', mod: 'win', u: 1.25 },
  { l: 'Alt', mod: 'alt', u: 1.25 },
  { l: '', k: ' ', u: 6.25 },
  { l: 'Alt', mod: 'alt', u: 1.25 },
  { l: 'Win', mod: 'win', u: 1.25 },
  { l: 'Menu', u: 1.25 },
  { l: 'Ctrl', mod: 'ctrl', u: 1.25 },
]
const SHIFT_MAP: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
}

const U = 30 // 基本键宽
const GAP = 3

function OskKeyCap({ k, shiftOn, capsOn, onPress }: { k: OskKey; shiftOn: boolean; capsOn: boolean; onPress: (k: OskKey) => void }) {
  const [down, setDown] = useState(false)
  const active = (k.mod === 'shift' && shiftOn) || (k.mod === 'caps' && capsOn)
  const w = Math.round((k.u ?? 1) * U + ((k.u ?? 1) - 1) * GAP)
  return (
    <button
      type="button"
      className={`h-[26px] rounded-[2px] border flex items-center justify-center text-[10px] leading-[11px] text-center select-none shrink-0 ${
        active
          ? 'bg-[#316ac5] border-[#1c4a9a] text-white'
          : down
            ? 'bg-[#d8d8cc] border-[#8a8a7a] text-[#333]'
            : 'bg-gradient-to-b from-[#fdfdfb] to-[#e6e6dc] border-[#a8a89a] text-[#222]'
      } ${k.mod ? 'italic' : ''}`}
      style={{ width: w }}
      onMouseDown={(e) => {
        e.preventDefault() /* 不抢焦点：保持目标输入框聚焦 */
        setDown(true)
      }}
      onMouseUp={() => setDown(false)}
      onMouseLeave={() => setDown(false)}
      onClick={() => onPress(k)}
    >
      {k.l.includes('\n') ? (
        k.l.split('\n').map((seg, i) => <div key={i}>{seg}</div>)
      ) : (
        k.l || '　'
      )}
    </button>
  )
}

export default function OnScreenKeyboard({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)
  const [shiftOn, setShiftOn] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [sound, setSound] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  useEffect(() => {
    setRect(win.id, { w: 736, h: 248 })
  }, [setRect, win.id])

  const press = (k: OskKey) => {
    if (sound) playClick()
    setClickCount((c) => c + 1)
    if (k.mod === 'shift') {
      setShiftOn((v) => !v)
      return
    }
    if (k.mod === 'caps') {
      setCapsOn((v) => !v)
      return
    }
    if (k.blank && k.k === ' ') {
      oskInsert(' ')
    } else if (k.k && k.k.length === 1) {
      let ch = k.k
      if (/[a-z]/i.test(ch)) {
        /* 字母键：Shift/CapsLock 组合决定大小写（物理键盘真实行为） */
        ch = shiftOn !== capsOn ? ch.toUpperCase() : ch.toLowerCase()
      } else if (shiftOn) {
        ch = SHIFT_MAP[ch] ?? ch
      }
      oskInsert(ch)
    } else if (k.k === 'Enter') {
      const el = oskTarget
      if (el instanceof HTMLTextAreaElement) oskInsert('\n')
      else if (el) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    } else if (k.k === 'Tab') {
      const el = oskTarget
      if (el instanceof HTMLTextAreaElement) oskInsert('\t')
      else el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    } else if (k.k === 'Escape') {
      oskTarget?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    } else if (k.k) {
      oskSpecial(k.k)
    }
    /* Shift 是闩锁键：输入一个字符后自动释放（XP 真实行为） */
    if (shiftOn && !k.mod) setShiftOn(false)
  }

  const keyCap = (k: OskKey, i: number) => (
    <OskKeyCap key={i} k={k} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <MenuBar
        compact
        menus={[
          {
            label: '键盘(K)',
            items: [
              { label: '增强型键盘(推荐)', checked: true, onClick: () => undefined },
              { label: '标准键盘', onClick: () => useXP.getState().showToast('标准键盘（101 键）已在本布局中默认呈现') },
              { label: '仅数字键盘', onClick: () => useXP.getState().showToast('仅数字键盘布局：复刻版未包含') },
            ],
          },
          {
            label: '设置(S)',
            items: [
              { label: '击键发音(T)', checked: sound, onClick: () => setSound((v) => !v) },
              { separator: true },
              { label: '字体(F)...', onClick: () => useXP.getState().showToast('屏幕键盘字体：默认（Tahoma 10pt）') },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '关于屏幕键盘(A)', onClick: () => useXP.getState().openApp('dialog', { kind: 'ok', title: '关于屏幕键盘', text: '屏幕键盘 (osk.exe)\nMicrosoft Windows XP\n版本 5.1.2600\n\n单击屏幕键盘的键即可在聚焦的窗口中键入字符。\n物理键盘在屏幕键盘打开时仍然可用。' }) },
            ],
          },
        ]}
      />
      {/* 键区：主区 + 导航区 + 数字小键盘 */}
      <div className="flex-1 flex items-start gap-[8px] p-[6px] overflow-hidden">
        {/* 主区 */}
        <div className="flex flex-col gap-[3px]">
          {F_ROW.map(keyCap)}
          {R1.map(keyCap)}
          {R2.map(keyCap)}
          {R3.map(keyCap)}
          {R4.map(keyCap)}
          {R5.map(keyCap)}
        </div>
        {/* 导航区 */}
        <div className="flex flex-col gap-[3px] mt-[29px]">
          {[['Ins', 'Home', 'PgUp'], ['Del', 'End', 'PgDn']].map((row, ri) => (
            <div key={ri} className="flex gap-[3px]">
              {row.map((l, i) => (
                <OskKeyCap key={i} k={{ l, k: l === 'Ins' ? 'Home' : l === 'Del' ? 'Delete' : l === 'End' ? 'End' : l === 'Home' ? 'Home' : l === 'PgUp' ? 'ArrowUp' : l === 'PgDn' ? 'ArrowDown' : l }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
              ))}
            </div>
          ))}
          <div className="flex gap-[3px] mt-[6px]">
            <div className="w-[30px]" />
            <OskKeyCap k={{ l: '↑', k: 'ArrowUp' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
            <div className="w-[30px]" />
          </div>
          <div className="flex gap-[3px]">
            <OskKeyCap k={{ l: '←', k: 'ArrowLeft' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
            <OskKeyCap k={{ l: '↓', k: 'ArrowDown' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
            <OskKeyCap k={{ l: '→', k: 'ArrowRight' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          </div>
        </div>
        {/* 数字小键盘（+ 与 Enter 双行高，0 双列宽 — XP 增强型布局） */}
        <div className="grid gap-[3px] mt-[29px]" style={{ gridTemplateColumns: `repeat(3, ${U}px)`, gridTemplateRows: 'repeat(5, 26px)' }}>
          <OskKeyCap k={{ l: 'Num\nLock' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '/', k: '/' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '*', k: '*' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '7', k: '7' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '8', k: '8' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '9', k: '9' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '4', k: '4' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '5', k: '5' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '6', k: '6' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '1', k: '1' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '2', k: '2' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <OskKeyCap k={{ l: '3', k: '3' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <div style={{ gridColumn: '1 / 3' }}>
            <OskKeyCap k={{ l: '0', k: '0' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          </div>
          <OskKeyCap k={{ l: '.', k: '.' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          <div style={{ gridColumn: 3, gridRow: '2 / 4' }}>
            <OskKeyCap k={{ l: '+' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          </div>
          <div style={{ gridColumn: 3, gridRow: '4 / 6' }}>
            <OskKeyCap k={{ l: 'Enter' }} shiftOn={shiftOn} capsOn={capsOn} onPress={press} />
          </div>
        </div>
      </div>
      {/* 底部辅助信息（XP osk 状态栏风格的轻量提示） */}
      <div className="text-[10px] text-[#6a6a5a] px-2 pb-[2px]">
        单击按键可在当前聚焦的窗口中键入字符{clickCount > 0 ? `（已击键 ${clickCount} 次）` : ''}
      </div>
    </div>
  )
}

/* ══════════════════ 2. 放大镜 magnify.exe ══════════════════ */

const WALLPAPERS: Record<string, string> = {
  bliss: '/wallpapers/bliss.jpg',
  azul: '/wallpapers/azul.jpg',
  autumn: '/wallpapers/autumn.jpg',
  none: '',
}

/** 顶部停靠放大条：壁纸以 level 倍放大，跟随鼠标光标（XP 真实停靠行为） */
function MagnifyBar({ level, invert }: { level: number; invert: boolean }) {
  const wallpaper = useXP((s) => s.wallpaper)
  const [m, setM] = useState({ x: 0, y: 0 })
  useEffect(() => {
    let queued = false
    let last = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY }
      if (!queued) {
        queued = true
        requestAnimationFrame(() => {
          queued = false
          setM(last)
        })
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const H = 138
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const { x, y } = m
  /* 源区域 (vw/level × H/level) 中心对齐光标 → 背景 position 反推 */
  const bgW = vw * level
  const bgH = vh * level
  const bgX = vw / 2 - x * level
  const bgY = H / 2 - y * level
  const url = WALLPAPERS[wallpaper] ?? WALLPAPERS.bliss

  return createPortal(
    <div
      className="fixed left-0 right-0 top-0 z-[7000] border-b-2 border-[#4a6a9a] bg-[#c8d8e8]"
      style={{ height: H, overflow: 'hidden' }}
    >
      {url ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: `${bgW}px ${bgH}px`,
            backgroundPosition: `${bgX}px ${bgY}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated' /* XP 放大镜为最近邻插值 → 马赛克像素块 */,
            filter: invert ? 'invert(1)' : undefined,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#3a6ea5]" />
      )}
      {/* 放大镜边框内的说明（极低透明度，模拟 XP 放大条顶部） */}
      <div className="absolute left-1 bottom-0 text-[9px] text-black/25 pointer-events-none">放大 {level}×</div>
    </div>,
    document.body,
  )
}

export function Magnifier({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)
  const [level, setLevel] = useState(2)
  const [follow, setFollow] = useState(true)
  const [invert, setInvert] = useState(false)

  useEffect(() => {
    setRect(win.id, { w: 420, h: 340 })
  }, [setRect, win.id])

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-3">
      {follow ? <MagnifyBar level={level} invert={invert} /> : null}
      <div className="text-[11px] leading-[16px] mb-2">
        放大镜可以放大屏幕上不同的区域。它显示鼠标指针周围的放大视图。
      </div>
      <div className="border border-[#b8b4a8] rounded-[4px] p-3 mb-2">
        <div className="text-[11px] font-bold mb-2">放大倍率(M)</div>
        <div className="flex items-center gap-2">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setLevel(n); playClick() }}
              className={`w-[30px] h-[20px] rounded-[2px] border text-[11px] ${
                level === n
                  ? 'bg-[#316ac5] border-[#1c4a9a] text-white'
                  : 'bg-gradient-to-b from-[#fdfdfb] to-[#e6e6dc] border-[#a8a89a] hover:border-[#7a9ac8]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-[#555] mt-1">当前倍率：{level} 倍</div>
      </div>
      <div className="border border-[#b8b4a8] rounded-[4px] p-3 mb-2">
        <div className="text-[11px] font-bold mb-1">跟踪(T)</div>
        <label className="flex items-center gap-[6px] text-[11px] leading-[20px] cursor-pointer">
          <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
          跟随鼠标光标(M)
        </label>
      </div>
      <div className="border border-[#b8b4a8] rounded-[4px] p-3 mb-2">
        <div className="text-[11px] font-bold mb-1">外观(P)</div>
        <label className="flex items-center gap-[6px] text-[11px] leading-[20px] cursor-pointer">
          <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
          颜色反转(N)
        </label>
      </div>
      <div className="flex-1" />
      <div className="flex justify-end gap-2">
        <XPButton onClick={() => useXP.getState().showToast('放大镜已最小化到任务栏；再次打开窗口可继续调整')}>隐藏(H)</XPButton>
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>退出(X)</XPButton>
      </div>
    </div>
  )
}

/* ══════════════════ 3. 讲述人 narrator.exe ══════════════════ */

export function Narrator({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const [lines, setLines] = useState<string[]>([
    '讲述人',
    '',
    '讲述人是一个屏幕阅读器，它将大声读出',
    '屏幕上显示的文本。',
    '',
    '正在朗读: 桌面',
  ])
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRect(win.id, { w: 400, h: 280 })
  }, [setRect, win.id])

  /* 聆听全局朗读事件（XPTip tooltip / 窗口标题）并复述 */
  useEffect(() => {
    const onNarrate = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (!text) return
      setLines((ls) => [...ls.slice(-80), `正在朗读: ${text}`])
    }
    window.addEventListener('xp-narrate', onNarrate)
    return () => window.removeEventListener('xp-narrate', onNarrate)
  }, [])

  /* 焦点窗口变化 → 朗读窗口标题（排除自身 + 值守卫，避免订阅回环） */
  useEffect(() => {
    const unsub = useXP.subscribe((st) => {
      const top = st.windows.filter((w) => !w.minimized && w.id !== win.id).sort((a, b) => b.z - a.z)[0]
      const me = st.windows.find((w) => w.id === win.id)
      const next = `讲述人 - ${top?.title ?? '桌面'}`
      if (me && me.title !== next) setWindowTitle(win.id, next)
    })
    return unsub
  }, [setWindowTitle, win.id])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [lines])

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <MenuBar
        compact
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '查看(V)',
            items: [
              { label: '放大朗读文本', onClick: () => useXP.getState().showToast('讲述人朗读文本大小已保持默认') },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '关于讲述人(A)', onClick: () => useXP.getState().openApp('dialog', { kind: 'ok', title: '关于讲述人', text: '讲述人 (narrator.exe)\nMicrosoft Windows XP\n版本 5.1.2600\n\n讲述人为视力较弱的用户读出屏幕内容。\n在本复刻版中，将鼠标悬停在任何对象上，\n讲述人都会在下方显示它正在朗读的文本。' }) },
            ],
          },
        ]}
      />
      <div className="flex-1 m-1 border border-[#8a8a7a] bg-white overflow-auto p-2" ref={boxRef}>
        {lines.map((l, i) => (
          <div key={i} className="text-[12px] leading-[17px] text-black whitespace-pre-wrap">
            {l || '\u00a0'}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════ 4. 辅助工具管理器 utilman.exe（Win+U） ══════════════════ */

type ToolRow = { app: 'magnifier' | 'narrator' | 'osk'; name: string; desc: string; icon: React.FC<{ size?: number; className?: string }> }

const TOOL_ROWS: ToolRow[] = [
  { app: 'magnifier', name: '放大镜(M)', desc: '放大屏幕上的部分区域，方便阅读。', icon: MagnifierIcon },
  { app: 'narrator', name: '讲述人(N)', desc: '读出屏幕上的文本和对象说明。', icon: NarratorIcon },
  { app: 'osk', name: '屏幕键盘(K)', desc: '在屏幕上显示一个可用鼠标操作的键盘。', icon: OSKIcon },
]

export function UtilityManager({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)
  const openApp = useXP((s) => s.openApp)
  const windows = useXP((s) => s.windows)
  const [autoMag, setAutoMag] = useState(false)
  const [autoNar, setAutoNar] = useState(false)

  useEffect(() => {
    setRect(win.id, { w: 440, h: 400 })
  }, [setRect, win.id])

  const runningApp = (app: string) => windows.find((w) => w.app === app)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-3">
      <div className="text-[11px] leading-[16px] mb-2">
        使用 Windows 辅助工具可以从当前的 Windows 会话中启动，或在登录时自动启动。
      </div>
      <div className="border border-[#b8b4a8] rounded-[4px] p-2 flex-1 flex flex-col justify-around">
        {TOOL_ROWS.map((t) => {
          const rw = runningApp(t.app)
          return (
            <div key={t.app} className="flex items-center gap-2 py-[6px]">
              <t.icon size={32} />
              <div className="flex-1">
                <label className="flex items-center gap-[6px] text-[11px] cursor-pointer">
                  <input type="checkbox" checked={!!rw} readOnly className="pointer-events-none" />
                  <span className="font-bold">{t.name}</span>
                </label>
                <div className="text-[11px] text-[#555] leading-[15px] pl-[20px]">{t.desc}</div>
              </div>
              <XPButton
                onClick={() => {
                  playClick()
                  if (rw) closeWindow(rw.id)
                  else openApp(t.app, {}, t.app === 'osk' ? '屏幕键盘' : t.app === 'magnifier' ? '放大镜设置' : '讲述人')
                }}
              >
                {rw ? '停止' : '启动'}
              </XPButton>
            </div>
          )
        })}
      </div>
      <div className="border border-[#b8b4a8] rounded-[4px] p-2 mt-2">
        <div className="text-[11px] font-bold mb-1">当 Windows 登录时(L)</div>
        <label className="flex items-center gap-[6px] text-[11px] leading-[20px] cursor-pointer">
          <input type="checkbox" checked={autoMag} onChange={(e) => setAutoMag(e.target.checked)} />
          启动放大镜(S)
        </label>
        <label className="flex items-center gap-[6px] text-[11px] leading-[20px] cursor-pointer">
          <input type="checkbox" checked={autoNar} onChange={(e) => setAutoNar(e.target.checked)} />
          启动讲述人(U)
        </label>
        {(autoMag || autoNar) && (
          <div className="text-[10px] text-[#8a6a2a] mt-1">已记录登录自启动偏好（下次登录时生效）。</div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <XPButton primary onClick={() => { playClick(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}
