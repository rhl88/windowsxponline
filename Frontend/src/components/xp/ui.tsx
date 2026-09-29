'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CtxItem } from './store'

/* ─────────── XP 按钮 ─────────── */
export function XPButton({
  children,
  onClick,
  disabled,
  wide,
  autoFocus,
  primary,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  wide?: boolean
  autoFocus?: boolean
  primary?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      disabled={disabled}
      onClick={onClick}
      className={`xp-btn ${primary ? 'xp-btn-primary' : ''} ${wide ? 'min-w-[75px]' : 'min-w-[70px]'} px-3 h-[23px] text-[11px] ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

/* ─────────── 锚定菜单（fixed 定位 + 两阶段视口钳位） ─────────── */
/* XP 行为：菜单超出屏幕右缘→向左翻转；超出底缘→向上展开；永不露出屏幕外 */
export function AnchoredMenu({
  items,
  anchor,
  width = 190,
  onClose,
  gutter = true,
  zIndex = 700,
  align = 'right',
}: {
  items: CtxItem[]
  anchor: DOMRect
  width?: number
  onClose: () => void
  gutter?: boolean
  zIndex?: number
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)

  /* 测量后直接写 DOM 样式（React 官方 measure-and-mutate 模式，避免级联渲染） */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    /* 默认：锚点下方展开（align=right 时右对齐锚点，即子菜单风格） */
    let x = align === 'left' ? anchor.left : anchor.right - 2
    let y = anchor.bottom + 1
    /* 右缘超出 → 翻到锚点左侧 */
    if (x + w > vw - 2) x = Math.max(2, anchor.left - w + 2)
    /* 底缘超出 → 从锚点向上展开（底对齐锚点顶部） */
    if (y + h > vh - 2) y = Math.max(2, anchor.top - h + 2)
    el.style.left = `${Math.round(x)}px`
    el.style.top = `${Math.round(y)}px`
    el.style.visibility = 'visible'
  }, [anchor, align])

  return (
    <div
      ref={ref}
      className="fixed xp-menu-shadow"
      style={{ left: -9999, top: -9999, visibility: 'hidden', zIndex }}
    >
      <MenuList items={items} width={width} onClose={onClose} gutter={gutter} />
    </div>
  )
}

/* ─────────── 菜单列表（下拉/右键通用，支持级联） ─────────── */

/* 菜单键盘访问键：栈顶（最近打开/最深）菜单响应字母键 —— XP 行为。
 * 多级菜单同时挂载时，只有栈顶（当前操作焦点）的那层响应，父层自动静默。 */
const menuKeyStack: number[] = []
let menuKeySeq = 0

/* 标签内访问字母下划线：「撤消(U)」→ 撤消(<u>U</u>)，无括号字母则原文 */
function MenuLabel({ label }: { label: string }) {
  const m = /\(([A-Za-z])\)$/.exec(label)
  if (!m) return <>{label}</>
  return (
    <>
      {label.slice(0, -3)}(<span className="underline">{m[1]}</span>)
    </>
  )
}

export function MenuList({
  items,
  width = 190,
  onClose,
  gutter = true,
}: {
  items: CtxItem[]
  width?: number
  onClose: () => void
  gutter?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const [subAnchor, setSubAnchor] = useState<DOMRect | null>(null)

  /* 键盘访问键：挂载时入栈成为栈顶，卸载时出栈；字母键匹配首个可用项并执行。
   * items/onClose 走 ref —— 避免内联重建数组导致 effect 频繁重挂、栈顶错乱 */
  const itemsRef = useRef(items)
  itemsRef.current = items
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const id = ++menuKeySeq
    menuKeyStack.push(id)
    const h = (e: KeyboardEvent) => {
      if (menuKeyStack[menuKeyStack.length - 1] !== id) return /* 只有栈顶菜单响应 */
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return
      /* 文本输入中不拦截（重命名等场景） */
      const ae = document.activeElement
      if (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement || (ae as HTMLElement | null)?.isContentEditable) return
      const key = e.key.toLowerCase()
      for (const it of itemsRef.current) {
        if (it.separator || it.disabled || it.submenu || !it.label) continue
        const paren = /\(([A-Za-z])\)/.exec(it.label)
        const acc = paren
          ? paren[1].toLowerCase()
          : /[A-Za-z]/.test(it.label)
            ? (it.label.match(/[A-Za-z]/) as RegExpMatchArray)[0].toLowerCase()
            : null
        if (acc === key) {
          e.preventDefault()
          it.onClick?.()
          onCloseRef.current()
          return
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => {
      window.removeEventListener('keydown', h)
      const i = menuKeyStack.indexOf(id)
      if (i >= 0) menuKeyStack.splice(i, 1)
    }
  }, [])

  return (
    <div
      className="xp-menu"
      style={{ width }}
      role="menu"
      onMouseLeave={() => setHover(null)}
    >
      {items.map((it, i) => {
        if (it.separator) return <div key={i} className="xp-menu-sep" />
        const hasSub = it.submenu && it.submenu.length > 0
        const highlighted = !it.disabled && hover === i
        return (
          <div
            key={i}
            className={`xp-menu-item ${it.disabled ? 'xp-menu-item-disabled' : ''} ${highlighted ? 'xp-menu-item-hover' : ''}`}
            role="menuitem"
            onMouseEnter={(e) => {
              setHover(i)
              if (hasSub) setSubAnchor(e.currentTarget.getBoundingClientRect())
              else setSubAnchor(null)
            }}
            /* XP 按住左键滑过菜单即可高亮（track menu） */
            onMouseDown={() => { if (!it.disabled) setHover(i) }}
            onClick={(e) => {
              e.stopPropagation()
              if (it.disabled || hasSub) return
              it.onClick?.()
              onClose()
            }}
            onContextMenu={(e) => {
              if (!it.onContextMenu || it.disabled) return
              /* 右键项：不关闭菜单链（开始菜单/级联保持，XP 手感），交给全局右键宿主渲染 */
              e.preventDefault()
              e.stopPropagation()
              it.onContextMenu(e)
            }}
          >
            <span className={`xp-menu-cell ${gutter ? 'w-[26px]' : 'w-[22px]'} flex items-center justify-center shrink-0`}>
              {it.checked ? (
                it.radio ? (
                  /* XP 互斥菜单项：实心圆点 */
                  <span className={`w-[7px] h-[7px] rounded-full ${it.disabled ? 'bg-[#a0a0a0]' : highlighted ? 'bg-white' : 'bg-[#0a246a]'}`} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2 6.5 L4.8 9.5 L10 3" stroke={highlighted ? '#fff' : '#111'} strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  </svg>
                )
              ) : (
                it.icon
              )}
            </span>
            <span className={`flex-1 truncate ${it.bold ? 'font-bold' : ''}`}>{it.label ? <MenuLabel label={it.label} /> : null}</span>
            {it.accelerator ? <span className={`ml-3 text-[11px] ${highlighted ? 'text-white/80' : 'text-[#8a8a8a]'}`}>{it.accelerator}</span> : null}
            {hasSub ? (
              <svg width="10" height="10" viewBox="0 0 10 10" className="ml-2 shrink-0">
                <path d="M3 1 L7.5 5 L3 9 Z" fill={highlighted ? '#fff' : '#333'} />
              </svg>
            ) : null}
            {hasSub && subAnchor && hover === i ? (
              <SubMenu items={it.submenu!} parentRect={subAnchor} onClose={onClose} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/* 子菜单：贴父项右侧展开，右缘/底缘越界自动翻转（XP 手感） */
function SubMenu({ items, parentRect, onClose }: { items: CtxItem[]; parentRect: DOMRect; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = parentRect.right - 3
    if (x + w > vw - 2) x = Math.max(2, parentRect.left - w + 3)
    let y = parentRect.top - 3
    if (y + h > vh - 2) y = Math.max(2, vh - h - 2)
    el.style.left = `${Math.round(x)}px`
    el.style.top = `${Math.round(y)}px`
    el.style.visibility = 'visible'
  }, [parentRect])

  return (
    <div
      ref={ref}
      className="fixed xp-menu-shadow"
      style={{ left: -9999, top: -9999, visibility: 'hidden', zIndex: 720 }}
    >
      <MenuList items={items} width={175} onClose={onClose} />
    </div>
  )
}

/* ─────────── 应用菜单栏 ─────────── */
export interface MenuDef {
  label: string
  items: CtxItem[]
}

export function MenuBar({ menus, compact = false }: { menus: MenuDef[]; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const [openRect, setOpenRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open === null) return
    const h = (e: MouseEvent) => {
      /* 子菜单 fixed 定位但仍在 DOM 树内，contains 依然有效 */
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className={`flex flex-nowrap select-none bg-[#ece9d8] border-b border-[#d8d5c8] relative z-30 ${compact ? 'overflow-visible' : ''}`} role="menubar">
      {menus.map((m, i) => (
        <div key={m.label} className="relative shrink-0">
          <button
            type="button"
            className={`${compact ? 'px-[5px] h-[20px] text-[10.5px]' : 'px-[9px] h-[21px] text-[11px]'} whitespace-nowrap leading-none rounded-[3px] ${open === i ? 'bg-gradient-to-b from-[#fbd5a0] to-[#f0b060] border border-[#c88a30]' : 'border border-transparent hover:bg-gradient-to-b hover:from-[#fdf3e0] hover:to-[#f5dcb0] hover:border-[#e0b878]'}`}
            onClick={(e) => {
              e.stopPropagation()
              if (open === i) {
                setOpen(null)
                setOpenRect(null)
              } else {
                setOpenRect(e.currentTarget.getBoundingClientRect())
                setOpen(i)
              }
            }}
            onMouseEnter={(e) => {
              if (open !== null && open !== i) {
                setOpenRect(e.currentTarget.getBoundingClientRect())
                setOpen(i)
              }
            }}
          >
            {m.label}
          </button>
          {open === i && openRect ? (
            <AnchoredMenu items={m.items} anchor={openRect} align="left" width={190} onClose={() => setOpen(null)} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/* ─────────── 凹陷边框容器（IE 地址栏等） ─────────── */
export function Sunken({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <div className={`xp-sunken ${className}`}>{children}</div>
}

/* ─────────── XP 复选框 ─────────── */
export function XPCheck({ checked = false, label, onChange }: { checked?: boolean; label?: string; onChange?: () => void }) {
  return (
    <button type="button" className="flex items-center gap-[6px] text-[11px] leading-[18px] hover:bg-[#f5f2e8]" onClick={onChange}>
      <span className="xp-checkbox" aria-checked={checked}>
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6.5 L4.8 9.5 L10 3" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  )
}

/* ─────────── XP 单选框 ─────────── */
export function XPRadio({ checked, label, onChange }: { checked: boolean; label: string; onChange?: () => void }) {
  return (
    <button type="button" className="flex items-center gap-[6px] text-[11px] leading-[18px] text-left hover:bg-[#f5f2e8]" onClick={onChange}>
      <span className="xp-radio" aria-checked={checked}>
        {checked ? <span className="block w-[6px] h-[6px] rounded-full bg-[#1145c4]" /> : null}
      </span>
      {label}
    </button>
  )
}

/* ─────────── XP 复选框 ─────────── */
export function XPCheckbox({ checked, label, onChange, disabled }: { checked: boolean; label: string; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} className="flex items-center gap-[6px] text-[11px] leading-[18px] text-left hover:bg-[#f5f2e8] disabled:opacity-50 disabled:hover:bg-transparent" onClick={() => onChange?.(!checked)}>
      <span className="xp-check" aria-checked={checked}>
        {checked ? (
          <svg viewBox="0 0 10 10" className="w-[10px] h-[10px]" aria-hidden>
            <path d="M1.6 5.3 3.9 7.6 8.4 2.1" fill="none" stroke="#0d3c8c" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  )
}

/* ─────────── 群组框 ─────────── */
export function GroupBox({ title, children, className = '' }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`border border-[#b8b4a8] rounded-[4px] px-3 pb-2 pt-1 mt-1 ${className}`}>
      <legend className="text-[11px] px-1 text-[#00309c]">{title}</legend>
      {children}
    </fieldset>
  )
}

/* ─────────── XP 工具提示（真实 XP：#FFFFE1 黄底 1px 黑框 约 500ms 延迟） ─────────── */
/* 用法：<XPTip text="单击这里开始"><button .../></XPTip> —— 自动锚定子元素下方（贴底时翻转到上方） */

let tipHideAll: (() => void) | null = null

export function XPTip({
  text,
  children,
  delay = 500,
  placement = 'auto',
}: {
  text: string
  children: React.ReactNode
  delay?: number
  placement?: 'auto' | 'top' | 'bottom'
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchor = useRef<HTMLElement | null>(null)

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPos(null)
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  /* 全局排他：任一 tooltip 显示时取消旧实例（XP 同屏仅一个） */
  useEffect(() => {
    if (!pos) return
    const prev = tipHideAll
    tipHideAll = hide
    const onDown = () => hide()
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onDown, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onDown, true)
      if (tipHideAll === hide) tipHideAll = prev
    }
  }, [pos])

  const enter = (e: React.MouseEvent) => {
    anchor.current = e.currentTarget as HTMLElement
    if (!text) return
    hide()
    timer.current = setTimeout(() => {
      const el = anchor.current
      if (!el || !el.isConnected) return
      const r = el.getBoundingClientRect()
      /* 先按内容宽度估算，生成后按真实尺寸二次钳位（同 MenuList 两阶段方案） */
      const estW = Math.max(24, text.length * 6.2 + 10)
      let x = Math.round(r.left)
      let y = Math.round(r.bottom + 4)
      if (placement !== 'bottom' && (placement === 'top' || r.bottom + 40 > window.innerHeight)) {
        y = Math.round(r.top) - 24 - 4
      }
      x = Math.max(2, Math.min(window.innerWidth - estW - 2, x))
      y = Math.max(2, y)
      setPos({ x, y })
      /* 讲述人集成：tooltip 显示时朗读文本（讲述人窗口监听此事件） */
      window.dispatchEvent(new CustomEvent('xp-narrate', { detail: { text } }))
    }, delay)
  }

  return (
    <>
      <span
        className="inline-flex"
        onMouseEnter={(e) => enter(e)}
        onMouseLeave={() => hide()}
      >
        {children}
      </span>
      {pos
        ? createPortal(
            <span
              className="fixed z-[8500] pointer-events-none bg-[#ffffe1] border border-[#1b1b1b] px-[6px] py-[2px] text-[11px] leading-[15px] text-black whitespace-nowrap shadow-[1px_1px_2px_rgba(0,0,0,0.28)]"
              style={{ left: pos.x, top: pos.y }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}

/* ─────────── 任务窗格面板（XP 真实行为：标题行整行可点折叠，右侧小箭头钮 ▼/▶） ─────────── */
export function TaskPanel({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="xp-taskpanel" data-pane={title}>
      <button type="button" className="xp-taskpanel-head" onClick={onToggle} aria-expanded={open}>
        <span className="truncate">{title}</span>
        <span className="xp-taskpanel-chev">
          {open ? (
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 2.5 L4 5.5 L6.5 2.5" fill="none" stroke="#1a5a9e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M3 1.5 L6 4 L3 6.5" fill="none" stroke="#1a5a9e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
      </button>
      {open ? <div className="xp-taskpanel-body">{children}</div> : null}
    </div>
  )
}
