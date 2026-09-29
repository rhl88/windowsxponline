'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useXP } from './store'
import { MenuList } from './ui'
import { unlockAudio, playClick } from './sounds'
import XPWindow from './XPWindow'
import Desktop from './Desktop'
import Taskbar from './Taskbar'
import StartMenu from './StartMenu'
import AltTab from './AltTab'
import SecurityDialog from './SecurityDialog'
import { ScreenSaverHost } from './ScreenSaver'
import { BootScreen, WelcomeScreen, LockScreen, ShutdownScreen, PowerOffScreen, StandbyScreen, LogoffFlow } from './screens'
import { windowSysMenu } from './ctx-menus'
import { hydrateFromApi, initApiSync } from '@/lib/api/sync'

/* ─────────── 文件同步失败提示（fs-sync 广播 → 气泡，30s 节流防刷屏） ─────────── */
function FsSyncErrorHost() {
  useEffect(() => {
    let last = 0
    const h = (e: Event) => {
      const now = Date.now()
      if (now - last < 30000) return
      last = now
      const op = (e as CustomEvent<{ op?: string }>).detail?.op ?? '文件操作'
      useXP.getState().showToast(`${op} 未能保存到服务器，更改仅在本次会话内有效`)
    }
    window.addEventListener('xp-fs-sync-error', h)
    return () => window.removeEventListener('xp-fs-sync-error', h)
  }, [])
  return null
}

/* ─────────── 全局右键菜单 ─────────── */
/* 两阶段定位：先隐藏渲染测出真实尺寸，再按 XP 规则钳位（右缘→左翻、底缘→上翻），菜单永不出屏 */
function ContextMenuHost() {
  const ctxMenu = useXP((s) => s.ctxMenu)
  const closeCtx = useXP((s) => s.closeCtx)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const h = (e: PointerEvent) => {
      const el = e.target as HTMLElement
      /* .xp-menu 覆盖菜单本体与所有 fixed 级联子菜单 */
      if (!el.closest('.xp-menu')) closeCtx()
    }
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCtx()
    }
    document.addEventListener('pointerdown', h)
    window.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('pointerdown', h)
      window.removeEventListener('keydown', k)
    }
  }, [ctxMenu, closeCtx])

  /* 测量真实尺寸后直接写 DOM（measure-and-mutate，避免级联渲染） */
  useLayoutEffect(() => {
    const el = ref.current
    if (!ctxMenu || !el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = ctxMenu.x
    let y = ctxMenu.y
    if (x + w > vw - 2) x = Math.max(2, ctxMenu.x - w)
    if (y + h > vh - 2) y = Math.max(2, ctxMenu.y - h)
    /* 兜底：翻转后仍超（菜单比视口还高/宽）→ 贴边 */
    if (x + w > vw - 2) x = Math.max(2, vw - 2 - w)
    if (y + h > vh - 2) y = Math.max(2, vh - 2 - h)
    el.style.left = `${Math.round(x)}px`
    el.style.top = `${Math.round(y)}px`
    el.style.visibility = 'visible'
  }, [ctxMenu])

  if (!ctxMenu) return null

  return (
    <div ref={ref} className="fixed z-[760] xp-menu-shadow" style={{ left: -9999, top: -9999, visibility: 'hidden' }}>
      <MenuList items={ctxMenu.items} onClose={closeCtx} />
    </div>
  )
}

/* ─────────── 通知气球（真实 XP：锦定托盘 + 小尾巴 + 关闭钮） ─────────── */
function BalloonIcon({ kind }: { kind?: 'shield' | 'mail' | 'info' | 'warn' }) {
  switch (kind) {
    case 'shield':
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
          <path d="M10 1.5 L17.5 4 V9 q0 6.5 -7.5 9.5 Q2.5 15.5 2.5 9 V4 Z" fill="#e04030" stroke="#7a1a10" strokeWidth="1" />
          <path d="M10 1.5 L10 19 Q17.5 15.5 17.5 9 V4 Z" fill="#c02818" />
          <path d="M10 4.2 L13 5.3 V9 q0 3.8 -3 5.5 q-3 -1.7 -3 -5.5 V5.3 Z" fill="none" stroke="#fff" strokeWidth="1.1" />
          <path d="M8.7 8.2 l1 1.8 l2 -3" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'mail':
      return (
        <svg width="18" height="16" viewBox="0 0 20 17" className="shrink-0">
          <rect x="1" y="2.5" width="18" height="12" rx="0.8" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" />
          <path d="M1 2.5 L10 9.5 L19 2.5" fill="none" stroke="#8a734f" strokeWidth="1" />
          <circle cx="15.5" cy="12" r="3.4" fill="#e04828" stroke="#8a2010" strokeWidth="0.8" />
          <path d="M14.2 10.8 l2.6 2.6 M16.8 10.8 l-2.6 2.6" stroke="#fff" strokeWidth="1" />
        </svg>
      )
    case 'warn':
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
          <path d="M10 1.5 L19 18 H1 Z" fill="#f5d43a" stroke="#8a6a10" strokeWidth="1" />
          <path d="M10 6.5 v6" stroke="#3a2a00" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="15.8" r="1.2" fill="#3a2a00" />
        </svg>
      )
    case 'info':
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
          <circle cx="10" cy="10" r="8.5" fill="#3a78d8" stroke="#1c4a9c" strokeWidth="1" />
          <circle cx="10" cy="6" r="1.3" fill="#fff" />
          <path d="M10 8.5 v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

function Toast() {
  const toast = useXP((s) => s.toast)
  const taskbarPos = useXP((s) => s.taskbarPos)
  const taskbarH = useXP((s) => s.taskbarH)
  const [hover, setHover] = useState(false)
  const spec = typeof toast === 'string' ? { text: toast } : toast

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useXP.getState().showToast(null), hover ? 6000 : 6400)
    return () => clearTimeout(t)
  }, [toast, hover])

  if (!spec) return null

  const pos: React.CSSProperties =
    taskbarPos === 'bottom' ? { bottom: taskbarH + 13, right: 14 }
      : taskbarPos === 'top' ? { top: taskbarH + 13, right: 14 }
        : taskbarPos === 'right' ? { bottom: 10, right: taskbarH + 13 }
          : { bottom: 10, left: taskbarH + 13 }

  return (
    <div className="fixed z-[560] xp-balloon-anim" style={pos}>
      <div
        className="relative bg-[#ffffe1] border border-black rounded-[8px] px-3 py-2 shadow-[2px_2px_6px_rgba(0,0,0,0.28)] max-w-[300px]"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={() => {
          if (spec.onClick) {
            spec.onClick()
            useXP.getState().showToast(null)
          }
        }}
        role="status"
      >
        {/* 尾巴（指向托盘；仅底锦时绘制） */}
        {taskbarPos === 'bottom' ? (
          <>
            <div className="absolute" style={{ bottom: -10, right: 26, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '10px solid black' }} />
            <div className="absolute" style={{ bottom: -8, right: 28, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '8px solid #ffffe1' }} />
          </>
        ) : null}
        <button
          type="button"
          aria-label="关闭"
          className="absolute right-[5px] top-[4px] w-[15px] h-[15px] flex items-center justify-center text-[10px] text-[#5a5a3a] hover:text-black rounded-[2px] hover:bg-[#e8e0a0]"
          onClick={(e) => {
            e.stopPropagation()
            useXP.getState().showToast(null)
          }}
        >
          ✕
        </button>
        <div className={`flex items-start gap-2 ${spec.onClick ? 'cursor-pointer' : ''}`}>
          <BalloonIcon kind={spec.icon} />
          <div className="min-w-0 pr-[14px]">
            {spec.title ? <div className="text-[11px] font-bold leading-[15px]">{spec.title}</div> : null}
            <div className="text-[11px] leading-[15px]">{spec.text}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── 系统根组件 ─────────── */
export default function XPSystem() {
  const phase = useXP((s) => s.phase)
  const windows = useXP((s) => s.windows)
  const theme = useXP((s) => s.theme)
  const classicScheme = useXP((s) => s.classicScheme)
  const visualFX = useXP((s) => s.visualFX)

  /* ── 性能选项 → 视觉效果全局开关（body class 驱动 CSS 动画启停） ── */
  useEffect(() => {
    document.body.classList.toggle('xp-no-winanim', !visualFX.winAnim)
    document.body.classList.toggle('xp-no-menufade', !visualFX.menuFade)
    document.body.classList.toggle('xp-no-menushadow', !visualFX.menuShadow)
  }, [visualFX])

  /* ── API 数据源：启动 hydrate（服务端为数据权威）→ 成功后建立 diff 订阅同步 ──
   * hydrate 失败（数据源不可达）= 脱机模式：保留本地默认状态，不建立推送基线 */
  useEffect(() => {
    void hydrateFromApi().finally(() => initApiSync())
  }, [])

  /* 首次手势解锁音频 */
  useEffect(() => {
    const h = () => unlockAudio()
    window.addEventListener('pointerdown', h, { once: true })
    return () => window.removeEventListener('pointerdown', h)
  }, [])

  /* ── 全局快捷键：Win单键/Ctrl+Esc/Alt+Tab/Alt+F4/Alt+Space/Alt+Esc/Ctrl+Alt+Del/Win组合/F5/PrintScreen ── */
  useEffect(() => {
    const altTabList = () => useXP.getState().windows.filter((w) => !w.noTaskbar).sort((a, b) => b.z - a.z)

    /* Win 键单独按下检测：keydown 记录，期间按过其它键则作废，keyup 时触发开始菜单 */
    let winSolo = false
    /* 粘滞键计数（5 次 Shift / 10 秒窗口） */
    let stickyCount = 0
    let stickyLast = 0

    /* 输入上下文守卫：焦点在输入框内时不处理单键类快捷键（避免打字误触） */
    const inTextField = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
    }

    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'desktop') return
      const st = useXP.getState()
      const k = e.key

      /* ── 粘滞键：连摁 5 次 Shift（XP 经典打扰，其它键重置计数；10 秒窗口） ── */
      if (k === 'Shift') {
        /* Ctrl+Shift 同时按下 → 切换输入语言（XP 输入法热键；仅桌面态） */
        if (e.ctrlKey) {
          st.setInputLang(st.inputLang === 'ch' ? 'en' : 'ch')
          return
        }
        const now = Date.now()
        if (now - stickyLast > 10000) stickyCount = 0
        stickyCount++
        stickyLast = now
        if (stickyCount >= 5) {
          stickyCount = 0
          if (!st.stickyKeys)
            st.openApp('dialog', {
              kind: 'sticky',
              title: '粘滞键',
              text: '您已连续按了五次 Shift 键。要启用粘滞键吗？\n\n粘滞键是键盘的一种特性，使您可一次只按一个键来使用 Shift、Ctrl 或 Alt 键。',
            })
        }
      } else {
        stickyCount = 0
      }

      /* Alt+Tab 任务切换 */
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        const list = altTabList()
        if (list.length === 0) return
        if (!st.altTab.open) {
          st.setAltTab({ open: true, index: list.length > 1 ? 1 : 0 })
        } else {
          st.setAltTab({ open: true, index: (st.altTab.index + 1) % list.length })
        }
        return
      }

      /* Alt+F4 → 关闭当前窗口（无窗口时弹出关机对话框，与 XP 一致） */
      if (e.altKey && !e.ctrlKey && k === 'F4') {
        e.preventDefault()
        const visible = st.windows.filter((w) => !w.minimized && !w.noTaskbar).sort((a, b) => b.z - a.z)
        const top = visible[0] ?? st.windows.filter((w) => !w.noTaskbar).slice(-1)[0]
        if (top) st.closeWindow(top.id)
        else st.openApp('dialog', { kind: 'shutdown', title: '关闭 Windows' })
        return
      }

      /* Alt+Space → 当前窗口系统菜单（弹出在窗口左上角） */
      if (e.altKey && !e.ctrlKey && !e.shiftKey && k === ' ' && !inTextField()) {
        e.preventDefault()
        const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
        if (top) {
          st.focusWindow(top.id)
          st.openCtx(top.x + 6, top.y + 26, windowSysMenu(top))
        }
        return
      }

      /* Alt+Esc → 按窗口 z 序循环切换到最底层窗口 */
      if (e.altKey && !e.ctrlKey && k === 'Escape') {
        e.preventDefault()
        const list = st.windows.filter((w) => !w.noTaskbar)
        if (list.length > 0) {
          const bottom = list.reduce((m, w) => (w.z < m.z ? w : m), list[0])
          st.restoreWindow(bottom.id)
        }
        return
      }

      /* Ctrl+Shift+Esc → 任务管理器 */
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault()
        const existing = st.windows.find((w) => w.app === 'taskmgr')
        if (existing) st.focusWindow(existing.id)
        else st.openApp('taskmgr', {})
        return
      }

      /* Ctrl+Esc → 开始菜单（Windows 传统切换键） */
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'Escape') {
        e.preventDefault()
        st.toggleStart()
        return
      }

      /* Ctrl+Alt+Del / Ctrl+Alt+End → Windows 安全对话框 */
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'End')) {
        e.preventDefault()
        st.setSecurity(!st.security)
        return
      }

      /* Win(Meta) 快捷键 */
      if (e.metaKey && !e.ctrlKey && !e.altKey) {
        winSolo = false
        const kl = k.toLowerCase()
        if (kl === 'd') {
          e.preventDefault()
          st.minimizeAll()
        } else if (kl === 'm') {
          e.preventDefault()
          if (e.shiftKey) {
            /* Win+Shift+M：撤销全部最小化 */
            st.windows.filter((w) => w.minimized && !w.noTaskbar).forEach((w) => st.restoreWindow(w.id))
          } else {
            st.minimizeAll()
          }
        } else if (kl === 'e') {
          e.preventDefault()
          st.openApp('explorer', { path: [] }, '我的电脑')
        } else if (k === 'r') {
          e.preventDefault()
          st.openApp('run', {})
        } else if (k === 'u') {
          e.preventDefault()
          /* 辅助工具管理器（Win+U）→ 真实 utilman.exe 对话框 */
          st.closeCtx()
          st.setStartOpen(false)
          st.openApp('utilman', {}, '辅助工具管理器')
        } else if (kl === 'f') {
          e.preventDefault()
          st.openApp('search', {})
        } else if (kl === 'l') {
          e.preventDefault()
          /* Win+L → 锁定计算机（XP：窗口保留，欢迎屏解锁） */
          st.closeCtx()
          st.setStartOpen(false)
          st.setPhase('locked')
        } else if (kl === 'b') {
          e.preventDefault()
          st.showToast('焦点已转到系统托盘')
        } else if (kl === 'pause' || kl === 'break') {
          e.preventDefault()
          st.openApp('sysprops', {})
        }
        return
      }

      /* Win 键单独按下：等待 keyup 判定（期间按过其它键则作废） */
      if (k === 'Meta' || k === 'OS') {
        winSolo = true
        return
      }
      if (k.length <= 1 || k === 'Tab' || k === 'Escape' || k === 'Enter' || k === 'Backspace') {
        winSolo = false
      }

      /* ── 单键功能（需要输入守卫，避免打字误触） ── */
      if (inTextField()) return

      /* F5 → 刷新桌面 / 当前资源管理器 / IE */
      if (k === 'F5') {
        e.preventDefault()
        const focused = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
        if (focused && (focused.app === 'explorer' || focused.app === 'ie')) {
          window.dispatchEvent(new CustomEvent('xp-app-refresh', { detail: { id: focused.id } }))
        } else {
          window.dispatchEvent(new CustomEvent('xp-desktop-refresh'))
        }
        return
      }

      if (k === 'Escape') {
        if (st.security) st.setSecurity(false)
        else if (st.startOpen) st.setStartOpen(false)
        else if (st.ctxMenu) st.closeCtx()
        return
      }

      /* PrintScreen → 提示（XP 键盘行为） */
      if (k === 'PrintScreen' || k === 'Print') {
        st.showToast('屏幕内容已复制到剪贴板')
        return
      }
    }

    /* 松开 Alt → 提交 Alt+Tab 选择 */
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        const st = useXP.getState()
        if (st.altTab.open) {
          const list = altTabList()
          const idx = ((st.altTab.index % list.length) + list.length) % list.length
          const target = list[idx]
          st.setAltTab({ open: false, index: 0 })
          if (target) st.restoreWindow(target.id)
        }
        return
      }
      /* 松开 Win 键：期间没按过其它键 → 切换开始菜单 */
      if ((e.key === 'Meta' || e.key === 'OS') && phase === 'desktop') {
        const solo = winSolo
        winSolo = false
        if (solo && !useXP.getState().altTab.open) {
          useXP.getState().toggleStart()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [phase])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black xp-root" data-theme={theme} data-scheme={theme === 'classic' ? classicScheme : undefined}>
      {phase === 'boot' ? <BootScreen /> : null}
      {phase === 'welcome' ? <WelcomeScreen /> : null}
      {phase === 'locked' ? <LockScreen /> : null}
      {phase === 'logging-in' ? <ShutdownScreen label="正在登录..." /> : null}
      {phase === 'logging-off' ? <LogoffFlow /> : null}
      {phase === 'restarting' ? <ShutdownScreen label="正在重新启动..." /> : null}
      {phase === 'shutting-down' ? <ShutdownScreen label="正在关机..." /> : null}
      {phase === 'poweroff' ? <PowerOffScreen /> : null}
      {phase === 'standby' ? <StandbyScreen /> : null}

      {(phase === 'desktop' || phase === 'logging-off') ? (
        <>
          <Desktop />
          {windows.map((w) => (
            <XPWindow key={w.id} win={w} />
          ))}
          <StartMenu />
          <Taskbar />
          <ContextMenuHost />
          <Toast />
          <AltTab />
          <FsSyncErrorHost />
          <SecurityGate />
          <ScreenSaverHost />
        </>
      ) : null}
    </div>
  )
}

/* security 订阅渲染（避免 getState 渲染期读取） */
function SecurityGate() {
  const security = useXP((s) => s.security)
  return security ? <SecurityDialog /> : null
}
