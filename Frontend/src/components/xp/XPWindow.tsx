'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useXP, type WinState, type WinRect, APP_DEFAULTS, getWorkArea } from './store'
import { APP_REGISTRY } from './registry'
import { playWhoosh, playClick } from './sounds'
import { windowSysMenu } from './ctx-menus'
import { ErrorIcon, WarnIcon, InfoIcon, QuestionIcon } from './app-icons'
import { XPTip } from './ui'

/* 标题栏按钮的 XP 样式符号 */
function BtnGlyph({ kind }: { kind: 'min' | 'max' | 'close' }) {
  if (kind === 'min')
    return (
      <span className="block w-[10px] h-[9px] relative">
        <span className="absolute left-0 top-[6px] w-[10px] h-[3px] bg-[var(--luna-wbtn-fg)] rounded-[1px]" />
      </span>
    )
  if (kind === 'max')
    return (
      <span className="block w-[11px] h-[10px] relative">
        <span className="absolute left-0 top-0 w-[11px] h-[9px] border-[2.5px] border-[var(--luna-wbtn-fg)] rounded-[1px] border-b-[3.5px]" />
      </span>
    )
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <path d="M1.5 1.5 L9.5 9.5 M9.5 1.5 L1.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export default function XPWindow({ win }: { win: WinState }) {
  const focusWindow = useXP((s) => s.focusWindow)
  const closeWindow = useXP((s) => s.closeWindow)
  const minimizeWindow = useXP((s) => s.minimizeWindow)
  const toggleMaximize = useXP((s) => s.toggleMaximize)
  const setRect = useXP((s) => s.setRect)
  const zTop = useXP((s) => s.zTop)
  const winAnim = useXP((s) => s.visualFX.winAnim)
  const app = APP_REGISTRY[win.app] ?? APP_REGISTRY.dialog
  const AppBody = app.component
  const Icon = app.icon
  const focused = win.z === zTop && !win.minimized
  const taskbarPos = useXP((s) => s.taskbarPos)
  const taskbarH = useXP((s) => s.taskbarH)
  const taskbarAutoHide = useXP((s) => s.taskbarAutoHide)
  const taskbarOnTop = useXP((s) => s.taskbarOnTop)
  /* 自动隐藏/不置于前端：任务栏不保留空间（XP 真实行为） */
  const tbReserve = taskbarOnTop && !taskbarAutoHide ? taskbarH : 0

  /* ── 窗口动画状态机（XP「窗口最小化和最大化时显示动画」）──
   * minimizing：缩向任务栏按钮后卸载；restoring：从按钮处展开；closing：缩小淡出后真卸载 */
  const [anim, setAnim] = useState<'none' | 'minimizing' | 'gone' | 'restoring' | 'closing'>('none')

  /* 任务栏按钮锚点几何（渲染期同步查询；按钮为存量 DOM，位置稳定） */
  const animTarget = useMemo(() => {
    if (anim !== 'minimizing' && anim !== 'restoring') return null
    const btn =
      document.querySelector(`[data-task-btn="${win.id}"]`) ??
      document.querySelector(`[data-task-grp="${CSS.escape(win.app)}"]`)
    const b = btn?.getBoundingClientRect()
    if (!b) return null
    const r = win.maximized
      ? { left: 0, top: taskbarPos === 'top' ? tbReserve : 0, width: window.innerWidth, height: window.innerHeight - tbReserve }
      : { left: win.x, top: win.y, width: win.w, height: win.h }
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const bx = b.left + b.width / 2
    const by = b.top + b.height / 2
    return {
      dx: Math.round(bx - cx),
      dy: Math.round(by - cy),
      sx: Math.max(0.04, b.width / Math.max(1, r.width)),
      sy: Math.max(0.06, b.height / Math.max(1, r.height)),
    }
  }, [anim, win.id, win.app, win.x, win.y, win.w, win.h, win.maximized, taskbarPos, tbReserve])

  /* 渲染期检测最小化/还原转换（derived-state 模式；动画开关关闭时直接切换） */
  const [prevMin, setPrevMin] = useState(win.minimized)
  if (prevMin !== win.minimized) {
    setPrevMin(win.minimized)
    setAnim(winAnim ? (win.minimized ? 'minimizing' : 'restoring') : 'none')
  }

  /* 动画结束计时：minimizing→gone（卸载）；restoring→none */
  useEffect(() => {
    if (anim === 'minimizing') {
      const t = setTimeout(() => setAnim('gone'), 250)
      return () => clearTimeout(t)
    }
    if (anim === 'restoring') {
      const t = setTimeout(() => setAnim('none'), 270)
      return () => clearTimeout(t)
    }
  }, [anim])

  /* 关闭：先播缩小淡出，再真卸载（开关关闭时立即） */
  const doClose = useCallback(() => {
    playClick()
    if (!winAnim) {
      closeWindow(win.id)
      return
    }
    setAnim('closing')
    setTimeout(() => closeWindow(win.id), 170)
  }, [closeWindow, win.id, winAnim])

  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const minW = (APP_DEFAULTS[win.app]?.w ?? 300) * 0.55
  const minH = (APP_DEFAULTS[win.app]?.h ?? 300) * 0.5

  /* ── 键盘移动/大小模式（系统菜单「移动/大小」触发，方向键调整，Enter 确认 Esc 取消） ── */
  const [kbMode, setKbMode] = useState<'none' | 'move' | 'size'>('none')
  const savedRect = useRef<WinRect | null>(null)

  useEffect(() => {
    const onMoveReq = (ev: Event) => {
      const d = (ev as CustomEvent).detail
      if (d?.id !== win.id) return
      savedRect.current = { x: win.x, y: win.y, w: win.w, h: win.h }
      setKbMode('move')
    }
    const onSizeReq = (ev: Event) => {
      const d = (ev as CustomEvent).detail
      if (d?.id !== win.id) return
      savedRect.current = { x: win.x, y: win.y, w: win.w, h: win.h }
      setKbMode('size')
    }
    window.addEventListener('xp-win-move', onMoveReq)
    window.addEventListener('xp-win-size', onSizeReq)
    return () => {
      window.removeEventListener('xp-win-move', onMoveReq)
      window.removeEventListener('xp-win-size', onSizeReq)
    }
  }, [win.id, win.x, win.y, win.w, win.h])

  /* 键盘模式下的方向键处理 */
  useEffect(() => {
    if (kbMode === 'none') return
    const h = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow') && e.key !== 'Enter' && e.key !== 'Escape') return
      e.preventDefault()
      const step = e.shiftKey ? 16 : 8
      const s = savedRect.current ?? { x: win.x, y: win.y, w: win.w, h: win.h }
      if (e.key === 'Escape') {
        setRect(win.id, s)
        setKbMode('none')
        return
      }
      if (e.key === 'Enter') {
        setKbMode('none')
        return
      }
      if (kbMode === 'move') {
        if (e.key === 'ArrowLeft') setRect(win.id, { x: win.x - step })
        else if (e.key === 'ArrowRight') setRect(win.id, { x: win.x + step })
        else if (e.key === 'ArrowUp') setRect(win.id, { y: win.y - step })
        else if (e.key === 'ArrowDown') setRect(win.id, { y: win.y + step })
        else return
      } else {
        if (e.key === 'ArrowLeft') setRect(win.id, { w: Math.max(minW, win.w - step) })
        else if (e.key === 'ArrowRight') setRect(win.id, { w: Math.max(minW, win.w + step) })
        else if (e.key === 'ArrowUp') setRect(win.id, { h: Math.max(minH, win.h - step) })
        else if (e.key === 'ArrowDown') setRect(win.id, { h: Math.max(minH, win.h + step) })
        else return
      }
    }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [kbMode, win.id, win.x, win.y, win.w, win.h, setRect, minW, minH])

  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-titlebtn]')) return
      focusWindow(win.id)
      if (win.maximized) {
        /* XP 行为：拖动最大化窗口标题栏 → 自动还原窗口并跟随光标继续拖动 */
        if (app.resizable === false) return
        const r = win.prevRect ?? { x: 60, y: 60, w: Math.min(640, window.innerWidth - 120), h: Math.min(480, window.innerHeight - 140) }
        const wa = getWorkArea()
        const nx = Math.max(wa.left, Math.min(wa.left + wa.width - r.w, e.clientX - Math.round(r.w / 2)))
        const ny = Math.max(wa.top, Math.min(wa.top + wa.height - 24, e.clientY - 12))
        useXP.getState().toggleMaximize(win.id)
        setRect(win.id, { x: nx, y: ny, w: r.w, h: r.h })
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: nx, oy: ny, moved: true }
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* 合成事件无活动指针（自动化测试场景） */
        }
        return
      }
      dragRef.current = { sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y, moved: false }
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        /* 合成事件无活动指针 */
      }
    },
    [focusWindow, win.id, win.maximized, win.prevRect, win.x, win.y, setRect, app.resizable],
  )

  const onTitlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.sx
      const dy = e.clientY - d.sy
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return
      d.moved = true
      const wa = getWorkArea()
      const nx = Math.max(wa.left - win.w + 60, Math.min(wa.left + wa.width - 60, d.ox + dx))
      const ny = Math.max(wa.top, Math.min(wa.top + wa.height - 24, d.oy + dy))
      setRect(win.id, { x: nx, y: ny })
    },
    [setRect, win.id, win.w, taskbarPos, taskbarH],
  )

  const onTitlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  /* ── 缩放 ── */
  const resizeRef = useRef<{ dir: string; sx: number; sy: number; rect: { x: number; y: number; w: number; h: number } } | null>(null)

  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation()
    focusWindow(win.id)
    resizeRef.current = { dir, sx: e.clientX, sy: e.clientY, rect: { x: win.x, y: win.y, w: win.w, h: win.h } }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件无活动指针 */
    }
  }

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current
    if (!r) return
    const dx = e.clientX - r.sx
    const dy = e.clientY - r.sy
    let { x, y, w, h } = r.rect
    if (r.dir.includes('e')) w = Math.max(minW, r.rect.w + dx)
    if (r.dir.includes('s')) h = Math.max(minH, r.rect.h + dy)
    if (r.dir.includes('w')) {
      w = Math.max(minW, r.rect.w - dx)
      x = r.rect.x + (r.rect.w - w)
    }
    if (r.dir.includes('n')) {
      h = Math.max(minH, r.rect.h - dy)
      y = r.rect.y + (r.rect.h - h)
    }
    setRect(win.id, { x, y, w, h })
  }

  const endResize = () => {
    resizeRef.current = null
  }

  /* 最小化动画播放中保持可见；动画结束（'gone'）或未在动画中则卸载 */
  if (win.minimized && anim !== 'minimizing') return null

  const style: React.CSSProperties = win.maximized
    ? taskbarPos === 'top'
      ? { left: 0, top: tbReserve, width: '100vw', height: `calc(100vh - ${tbReserve}px)`, zIndex: win.z }
      : taskbarPos === 'left'
        ? { left: tbReserve, top: 0, width: `calc(100vw - ${tbReserve}px)`, height: '100vh', zIndex: win.z }
        : taskbarPos === 'right'
          ? { left: 0, top: 0, width: `calc(100vw - ${tbReserve}px)`, height: '100vh', zIndex: win.z }
          : { left: 0, top: 0, width: '100vw', height: `calc(100vh - ${tbReserve}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  const handles: Array<{ dir: string; cls: string }> = [
    { dir: 'n', cls: 'left-0 right-0 top-[-3px] h-[6px] cursor-ns-resize' },
    { dir: 's', cls: 'left-0 right-0 bottom-[-3px] h-[6px] cursor-ns-resize' },
    { dir: 'w', cls: 'top-0 bottom-0 left-[-3px] w-[6px] cursor-ew-resize' },
    { dir: 'e', cls: 'top-0 bottom-0 right-[-3px] w-[6px] cursor-ew-resize' },
    { dir: 'nw', cls: 'top-[-3px] left-[-3px] w-[10px] h-[10px] cursor-nwse-resize' },
    { dir: 'ne', cls: 'top-[-3px] right-[-3px] w-[10px] h-[10px] cursor-nesw-resize' },
    { dir: 'sw', cls: 'bottom-[-3px] left-[-3px] w-[10px] h-[10px] cursor-nesw-resize' },
    { dir: 'se', cls: 'bottom-[-3px] right-[-3px] w-[10px] h-[10px] cursor-nwse-resize' },
  ]

  const animCls =
    anim === 'closing'
      ? 'xp-win-closing'
      : anim === 'minimizing'
        ? animTarget
          ? 'xp-win-min'
          : 'xp-win-min-nobtn'
        : anim === 'restoring'
          ? animTarget
            ? 'xp-win-restore'
            : 'xp-win-restore-nobtn'
          : ''
  const animVars =
    animTarget && (anim === 'minimizing' || anim === 'restoring')
      ? ({
          '--wa-dx': `${animTarget.dx}px`,
          '--wa-dy': `${animTarget.dy}px`,
          '--wa-sx': animTarget.sx,
          '--wa-sy': animTarget.sy,
        } as React.CSSProperties)
      : undefined

  return (
    <div
      id={`xp-win-${win.id}`}
      className={`xp-window absolute select-none ${animCls}`}
      style={{ ...style, ...animVars }}
      onPointerDown={() => focusWindow(win.id)}
    >
      {/* 标题栏 */}
      <div
        className={`xp-titlebar ${focused ? 'xp-titlebar-active' : 'xp-titlebar-inactive'} ${win.maximized ? 'rounded-none' : ''}`}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={() => {
          if (app.resizable !== false) {
            playClick()
            toggleMaximize(win.id)
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          focusWindow(win.id)
          useXP.getState().openCtx(e.clientX, e.clientY, windowSysMenu(win, app.resizable !== false))
        }}
      >
        <div className="flex items-center gap-[5px] pl-[6px] pr-1 h-full min-w-0">
          <span className="shrink-0 flex items-center">
            {win.app === 'dialog' ? (
              /* XP MessageBox 行为：标题栏图标与消息级别一致 */
              win.props.kind === 'error' ? <ErrorIcon size={16} />
              : win.props.kind === 'warn' ? <WarnIcon size={16} />
              : win.props.kind === 'confirm' || win.props.kind === 'question' ? <QuestionIcon size={16} />
              : win.props.kind && win.props.kind !== 'shutdown' ? <InfoIcon size={16} />
              : <Icon size={16} />
            ) : (
              <Icon size={16} />
            )}
          </span>
          <span className="flex-1 truncate xp-luna-fg font-bold text-[12px] tracking-wide">
            {win.title}
          </span>
          <div className="flex gap-[2px] shrink-0" data-titlebtn>
            <XPTip text="最小化">
              <button
                type="button"
                className="xp-wbtn"
                onClick={() => {
                  playWhoosh(true)
                  minimizeWindow(win.id)
                }}
              >
                <BtnGlyph kind="min" />
              </button>
            </XPTip>
            {app.resizable !== false ? (
              <XPTip text={win.maximized ? '还原' : '最大化'}>
                <button
                  type="button"
                  className="xp-wbtn"
                  onClick={() => {
                    playClick()
                    toggleMaximize(win.id)
                  }}
                >
                  <BtnGlyph kind="max" />
                </button>
              </XPTip>
            ) : (
              <span className="w-[21px] h-[21px] flex items-center justify-center">
                <span className="w-[9px] h-[7px] border border-[#8a9fd0] rounded-[1px] opacity-70" />
              </span>
            )}
            <XPTip text="关闭">
              <button
                type="button"
                className="xp-wbtn xp-wbtn-close"
                onClick={doClose}
              >
                <BtnGlyph kind="close" />
              </button>
            </XPTip>
          </div>
        </div>
      </div>

      {/* 键盘移动/大小模式指示 */}
      {kbMode !== 'none' ? (
        <div className="absolute left-0 top-0 right-0 bottom-0 z-40 outline outline-2 outline-dotted outline-[#4a90d8] pointer-events-none flex items-center justify-center">
          <div className="bg-[#ece9d8] border border-[#8a867e] rounded px-3 py-1 text-[11px] shadow-lg">
            {kbMode === 'move' ? '移动：使用方向键移动窗口（Enter 确认，Esc 取消）' : '大小：使用方向键调整尺寸（Enter 确认，Esc 取消）'}
          </div>
        </div>
      ) : null}

      {/* 窗口主体 */}
      <div className="xp-window-body">
        <AppBody win={win} />
      </div>

      {/* 缩放手柄 */}
      {!win.maximized && app.resizable !== false
        ? handles.map((h) => (
            <div
              key={h.dir}
              className={`absolute z-40 ${h.cls}`}
              onPointerDown={startResize(h.dir)}
              onPointerMove={onResizeMove}
              onPointerUp={endResize}
            />
          ))
        : null}
    </div>
  )
}
