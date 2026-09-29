'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useXP, getWorkArea, type WinState } from './store'

/* ═══════════ 贴边停靠 hook（MSN 主面板经典「靠边隐藏」） ═══════════
 * 行为（1:1 复刻经典 IM 面板）：
 * 1. 拖动面板到屏幕 左/右/上 缘松手 → 面板滑出屏幕，只留 2px 边条 + 热区
 * 2. 鼠标碰热区 → 面板滑回展开
 * 3. 鼠标离开面板 → 面板再次滑出收起（全局 mousemove 跟踪：碰一下边条就跑开也会收起）
 * 4. 展开时抓住标题栏把面板拖离边缘 → 解除停靠（自由窗口）
 *
 * 实现：
 * - 拖动判定：监听 win.x/y 变化 + 280ms 防抖（拖动中 setRect 连续触发会不断重置计时，
 *   天然等于「松手后判定」，拖动过程面板不会被中途吞走）。
 * - 展开保持：全局 mousemove + getBoundingClientRect 命中检测（不依赖 React mouseleave
 *   ——鼠标碰边条展开后从未进入面板本体时，mouseleave 永远不触发）。
 */

export interface DockState {
  side: 'left' | 'right' | 'top'
  shown: boolean
  /* 收起时面板在屏幕内的锚定位置（展开/收起都恢复到这个位置） */
  top: number
  left: number
  w: number
  h: number
}

const STRIP = 2 /* 收起后留在屏幕内的像素宽度（经典 IM 是 2px 细条） */
const HIDE_DELAY = 350 /* 鼠标离开面板后多久收起（ms） */

export function useEdgeDock(win: WinState, opts?: { onCollapse?: () => void; onExpand?: () => void }) {
  const setRect = useXP((s) => s.setRect)
  const focusWindow = useXP((s) => s.focusWindow)
  const [dock, setDock] = useState<DockState | null>(null)
  const dockRef = useRef<DockState | null>(null)
  const rectRef = useRef({ x: win.x, y: win.y, w: win.w, h: win.h })
  const leaveTimer = useRef<number>(0)
  const optsRef = useRef(opts)

  /* ref 更新全部放在 effect 里（react-hooks/refs：渲染期禁写 ref） */
  useEffect(() => {
    dockRef.current = dock
  }, [dock])
  useEffect(() => {
    rectRef.current = { x: win.x, y: win.y, w: win.w, h: win.h }
  }, [win.x, win.y, win.w, win.h])
  useEffect(() => {
    optsRef.current = opts
  })

  /* 收起：面板滑出屏幕（读 ref 内部状态，依赖稳定可 useCallback） */
  const collapse = useCallback(() => {
    const d = dockRef.current
    if (!d || !d.shown) return
    const wa = getWorkArea()
    setDock({ ...d, shown: false })
    if (d.side === 'top') setRect(win.id, { x: d.left, y: d.top - d.h + STRIP })
    else setRect(win.id, { x: d.side === 'left' ? wa.left - d.w + STRIP : wa.left + wa.width - STRIP, y: d.top })
    optsRef.current?.onCollapse?.()
  }, [win.id, setRect])

  /* 展开：面板滑回停靠位置 */
  const expand = useCallback(() => {
    const d = dockRef.current
    if (!d || d.shown) return
    window.clearTimeout(leaveTimer.current)
    focusWindow(win.id)
    setDock({ ...d, shown: true })
    setRect(win.id, { x: d.left, y: d.top })
    optsRef.current?.onExpand?.()
  }, [win.id, setRect, focusWindow])

  /* 拖动判定逻辑：位置停止变化 280ms 后运行 */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const d = dockRef.current
      const { x, y, w, h } = rectRef.current
      const wa = getWorkArea()
      if (!d) {
        /* 未停靠 → 判定是否贴边（以工作区为基准，避开任务栏） */
        const atLeft = x <= wa.left + 2 && x + w > wa.left /* 未完全越界 */
        const atRight = x + w >= wa.left + wa.width - 2 && x < wa.left + wa.width
        const atTop = y <= wa.top + 2 && y + h > wa.top
        if (atLeft) {
          const top = Math.max(wa.top, Math.min(y, wa.top + wa.height - h))
          setDock({ side: 'left', shown: false, top, left: wa.left, w, h })
          setRect(win.id, { x: wa.left - w + STRIP, y: top })
        } else if (atRight) {
          const top = Math.max(wa.top, Math.min(y, wa.top + wa.height - h))
          setDock({ side: 'right', shown: false, top, left: wa.left + wa.width - w, w, h })
          setRect(win.id, { x: wa.left + wa.width - STRIP, y: top })
        } else if (atTop) {
          const left = Math.max(wa.left, Math.min(x, wa.left + wa.width - w))
          setDock({ side: 'top', shown: false, top: wa.top, left, w, h })
          setRect(win.id, { x: left, y: wa.top - h + STRIP })
        }
      } else if (d.shown) {
        /* 展开状态：若面板被拖离了停靠缘 → 解除停靠（自由窗口） */
        const atEdge = d.side === 'left' ? x <= d.left + 2 : d.side === 'right' ? x + w >= d.left + d.w - 2 : y <= d.top + 2
        if (!atEdge) setDock(null)
      }
      /* 已收起（d && !shown）：位置固定在屏幕外，无需处理 */
    }, 280)
    return () => window.clearTimeout(t)
  }, [win.x, win.y, win.w, win.h, win.id, setRect])

  /* 展开保持：全局 mousemove 命中检测（面板 rect 外 → 350ms 后收起；回来则取消） */
  useEffect(() => {
    if (!dock?.shown) return
    const inPanel = (el: HTMLElement, cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      return cx >= r.left - 3 && cx <= r.right + 3 && cy >= r.top - 3 && cy <= r.bottom + 3
    }
    const onMove = (e: MouseEvent) => {
      const el = document.getElementById(`xp-win-${win.id}`)
      if (!el) return
      window.clearTimeout(leaveTimer.current)
      if (inPanel(el, e.clientX, e.clientY)) return
      leaveTimer.current = window.setTimeout(() => {
        const el2 = document.getElementById(`xp-win-${win.id}`)
        if (el2 && (el2.matches(':hover') || inPanel(el2, e.clientX, e.clientY))) return
        collapse()
      }, HIDE_DELAY)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.clearTimeout(leaveTimer.current)
    }
  }, [dock?.shown, win.id, collapse])

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  /* 边条热区（收起时渲染；fixed 定位贴屏幕缘，覆盖面板原范围 ±12px 便于命中） */
  const stripZone: React.ReactNode =
    dock && !dock.shown ? (
      <div
        className="fixed z-[900] cursor-pointer"
        style={{
          left: dock.side === 'top' ? dock.left : dock.side === 'left' ? 0 : undefined,
          right: dock.side === 'right' ? 0 : undefined,
          top: dock.side === 'top' ? 0 : dock.top - 12,
          width: dock.side === 'top' ? dock.w : 7,
          height: dock.side === 'top' ? 7 : dock.h + 24,
        }}
        onMouseEnter={expand}
        title="拖出面板"
      />
    ) : null

  return { dock, stripZone, onPanelLeave: () => window.clearTimeout(0), expand, collapse }
}
