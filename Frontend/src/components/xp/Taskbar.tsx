'use client'

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useXP, xpNow, type CtxItem, type TaskbarPos, type WinState } from './store'
import { XPFlag, VolumeIcon } from './icons'
import { Bmp } from './bmp'
import { IEIcon } from './icons'
import { APP_REGISTRY } from './registry'
import { setMasterVolume as applyVol, playClick } from './sounds'
import { windowSysMenu } from './ctx-menus'
import { resolvePath, userDesktopPath, quickLaunchPath, linksPath, type FSNode } from './fs'
import { TB_SYS_ICONS, tbFileEntry } from './apps/TaskbarProps'
import { XPCheck, XPTip } from './ui'
import type { NotifMode } from './model'

/* 通知区域图标闲置判定（演示用 45 秒；XP 真实为数分钟——e2e 可直接改写 trayActivity 时间戳） */
const TRAY_INACTIVE_MS = 45_000

function ShowDesktopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="1.5" y="2" width="13" height="9" rx="1" fill="#3a5a8a" stroke="#c8d8f0" strokeWidth="0.8" />
      <path d="M3 11.5 h10 M6 9.5 h4" stroke="#c8d8f0" strokeWidth="0.9" />
      <path d="M1.5 14 h13" stroke="#2a3a5a" strokeWidth="1.4" />
      <path d="M4 5 h5 M4 7 h3" stroke="#8ab0e8" strokeWidth="0.7" />
    </svg>
  )
}

/* XP 解锁任务栏时的拖动手柄（竖排圆点 grip） */
function TbGrip({ onDown, vertical }: { onDown: (e: React.PointerEvent) => void; vertical?: boolean }) {
  return (
    <XPTip text="拖动以移动任务栏">
      <div
        className={`flex items-center justify-center cursor-pointer group ${vertical ? 'w-full h-[10px] my-[2px]' : 'w-[10px] h-full mx-[1px]'}`}
        onPointerDown={onDown}
      >
        <div className={`rounded-full bg-white/15 group-hover:bg-white/35 ${vertical ? 'w-[16px] h-[4px]' : 'w-[4px] h-[16px]'}`} />
      </div>
    </XPTip>
  )
}

/* 工具栏段落的 » 展开钮（XP 双箭头） */
function ChevronBtn({ onClick, vertical }: { onClick: (e: React.MouseEvent) => void; vertical?: boolean }) {
  return (
    <XPTip text="展开">
      <button
        type="button"
        className={`${vertical ? 'w-[18px] h-[13px]' : 'w-[13px] h-[18px]'} flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20 shrink-0`}
        onClick={(e) => { e.stopPropagation(); onClick(e) }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9">
          <path d="M0.6 1 L4 4.5 L0.6 8" stroke="#e8f0ff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M3.8 1 L7.2 4.5 L3.8 8" stroke="#e8f0ff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      </button>
    </XPTip>
  )
}

/* 工具栏条目（桌面/链接/自定义工具栏共用） */
type TbEntry = { label: string; icon: React.ReactNode; open: () => void }

function entriesToCtx(entries: TbEntry[]): CtxItem[] {
  return entries.map((en) => ({ label: en.label, icon: en.icon, onClick: en.open }))
}

/* ─────────── XP 经典竖直音量弹出滑块 ─────────── */
function VolumeFlyout({ pos, th }: { pos: TaskbarPos; th: number }) {
  const masterVolume = useXP((s) => s.masterVolume)
  const volumeMuted = useXP((s) => s.volumeMuted)
  const setMasterVolume = useXP((s) => s.setMasterVolume)
  const setVolumeMuted = useXP((s) => s.setVolumeMuted)
  const setVolumeFlyout = useXP((s) => s.setVolumeFlyout)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('.xp-tray-vol')) {
        setVolumeFlyout(false)
      }
    }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [setVolumeFlyout])

  const trackH = 64
  const ballY = trackH - ((volumeMuted ? 0 : masterVolume) / 100) * trackH

  const anchorStyle: React.CSSProperties =
    pos === 'bottom'
      ? { bottom: th + 4, right: 26 }
      : pos === 'top'
        ? { top: th + 4, right: 26 }
        : pos === 'left'
          ? { left: th + 4, bottom: 8 }
          : { right: th + 4, bottom: 8 }

  return (
    <div ref={ref} className="fixed z-[520] xp-vol-flyout" style={anchorStyle}>
      <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[3px] shadow-[2px_2px_6px_rgba(0,0,0,0.35)] p-[7px] w-[66px]">
        <div className="text-[10px] text-center text-[#5a5a4a] mb-[3px]">音量</div>
        <div
          className="relative w-[22px] mx-auto select-none"
          style={{ height: trackH + 14 }}
          onPointerDown={(e) => {
            const el = e.currentTarget.getBoundingClientRect()
            const move = (cy: number) => {
              const v = Math.max(0, Math.min(100, Math.round(((trackH + 7 - (cy - el.top)) / trackH) * 100)))
              setMasterVolume(v)
              applyVol(v)
            }
            move(e.clientY)
            const mv = (ev: PointerEvent) => move(ev.clientY)
            const up = () => {
              window.removeEventListener('pointermove', mv)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', mv)
            window.addEventListener('pointerup', up)
          }}
        >
          {/* 轨道（锯齿槽） */}
          <div className="absolute left-[9px] top-[7px] w-[4px] rounded bg-[#d0cfc8] border-l border-t border-[#f4f2e8] border-r border-b border-[#8a8878]" style={{ height: trackH }} />
          {/* 滑块球 */}
          <div
            className="absolute left-0 w-[22px] h-[11px] rounded-[2px] bg-gradient-to-b from-[#f8f6ee] to-[#c8c6ba] border border-[#8a8878] shadow-[1px_1px_1px_rgba(0,0,0,0.25)] cursor-pointer"
            style={{ top: ballY + 1 }}
          >
            <div className="mx-auto mt-[4px] w-[10px] h-[1px] bg-[#8a8878]" />
          </div>
        </div>
        {/* XP 真实结构：滑块下方是「静音」复选框 */}
        <div className="flex justify-center mt-[6px]">
          <XPCheck
            checked={volumeMuted}
            label="静音"
            onChange={() => {
              setVolumeMuted(!volumeMuted)
              applyVol(volumeMuted ? masterVolume : 0)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Taskbar() {
  const windows = useXP((s) => s.windows)
  const zTop = useXP((s) => s.zTop)
  const startOpen = useXP((s) => s.startOpen)
  const toggleStart = useXP((s) => s.toggleStart)
  const focusWindow = useXP((s) => s.focusWindow)
  const minimizeWindow = useXP((s) => s.minimizeWindow)
  const minimizeAll = useXP((s) => s.minimizeAll)
  const restoreWindow = useXP((s) => s.restoreWindow)
  const openApp = useXP((s) => s.openApp)
  const openCtx = useXP((s) => s.openCtx)
  const showToast = useXP((s) => s.showToast)
  const volumeFlyout = useXP((s) => s.volumeFlyout)
  const setVolumeFlyout = useXP((s) => s.setVolumeFlyout)
  const volumeMuted = useXP((s) => s.volumeMuted)
  const taskbarLocked = useXP((s) => s.taskbarLocked)
  const taskbarPos = useXP((s) => s.taskbarPos)
  const taskbarH = useXP((s) => s.taskbarH)
  const setTaskbarLocked = useXP((s) => s.setTaskbarLocked)
  const setTaskbarPos = useXP((s) => s.setTaskbarPos)
  const setTaskbarH = useXP((s) => s.setTaskbarH)
  const showQuickLaunch = useXP((s) => s.showQuickLaunch)
  const setQuickLaunch = useXP((s) => s.setQuickLaunch)
  const taskbarAutoHide = useXP((s) => s.taskbarAutoHide)
  const taskbarOnTop = useXP((s) => s.taskbarOnTop)
  const taskbarGroup = useXP((s) => s.taskbarGroup)
  const showClock = useXP((s) => s.showClock)
  const notifPrefs = useXP((s) => s.notifPrefs)
  const tbDesktop = useXP((s) => s.tbDesktop)
  const tbLinks = useXP((s) => s.tbLinks)
  const tbCustom = useXP((s) => s.tbCustom)
  const setTbDesktop = useXP((s) => s.setTbDesktop)
  const setTbLinks = useXP((s) => s.setTbLinks)
  const removeTbCustom = useXP((s) => s.removeTbCustom)
  const tbTitles = useXP((s) => s.tbTitles)
  const setTbTitle = useXP((s) => s.setTbTitle)
  const fsMove = useXP((s) => s.fsMove)
  const restoreAllWindows = useXP((s) => s.restoreAllWindows)
  const fsTree = useXP((s) => s.fsTree)
  /* 会话用户（快速启动/桌面/链接工具栏均为当前帐户 profile 相对路径） */
  const sessionUser = useXP((s) => s.sessionUser)
  const QUICK_LAUNCH_PATH = useMemo(() => quickLaunchPath(sessionUser), [sessionUser])
  const DESKTOP_PATH = useMemo(() => userDesktopPath(sessionUser), [sessionUser])
  const LINKS_PATH = useMemo(() => linksPath(sessionUser), [sessionUser])
  const ieFavorites = useXP((s) => s.ieFavorites)
  const [time, setTime] = useState('--:--')
  const tbDragRef = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; h0: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const d = xpNow()
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    }
    update()
    const iv = setInterval(update, 3000)
    return () => clearInterval(iv)
  }, [])

  const now = xpNow()
  const dateStr = `${now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleDateString('zh-CN', { weekday: 'long' })}`

  const topZ = windows.filter((w) => !w.minimized).reduce((m, w) => Math.max(m, w.z), 0)
  const vert = taskbarPos === 'left' || taskbarPos === 'right'
  const [hh, mm] = time.split(':')

  /* ── 通知区域：不活动图标折叠体系（XP « 按钮）── */
  const hideInactiveIcons = useXP((s) => s.hideInactiveIcons)
  const trayExpanded = useXP((s) => s.trayExpanded)
  const trayActivity = useXP((s) => s.trayActivity)
  const setTrayExpanded = useXP((s) => s.setTrayExpanded)
  const touchTray = useXP((s) => s.touchTray)
  /* 周期重算：闲置图标到期折叠（展开态无需重算——全部可见） */
  const [, trayTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!hideInactiveIcons) return
    const iv = setInterval(trayTick, 4000)
    return () => clearInterval(iv)
  }, [hideInactiveIcons])
  /* 会话启动时刻：从未交互过的图标以此起算闲置（XP：开机展示一阵后收起） */
  const sessionT = useRef(Date.now()).current
  const trayActive = (key: string) => Date.now() - (trayActivity[key] ?? sessionT) < TRAY_INACTIVE_MS
  const trayShow = (key: string, def: NotifMode) => {
    const mode = notifPrefs[key] ?? def
    if (mode === 'always') return true
    if (mode === 'hide') return false
    return !hideInactiveIcons || trayExpanded || trayActive(key)
  }
  /* « 折叠箭头仅在有被藏图标时出现（XP 真实行为）
     显隐判定用「折叠态可见性」——不含 trayExpanded 项：展开时图标内联现身、按钮翻转为 » 驻留，
     可再点回收（旧实现 anyHidden 含 trayExpanded → 展开即消失、无法折叠，» 分支为死代码） */
  const trayShowCollapsed = (key: string, def: NotifMode) => {
    const mode = notifPrefs[key] ?? def
    if (mode === 'always') return true
    if (mode === 'hide') return false
    return !hideInactiveIcons || trayActive(key)
  }
  const anyHidden = hideInactiveIcons && (
    (!trayShowCollapsed('volume', 'inactive') && notifPrefs.volume !== 'hide') ||
    (!trayShowCollapsed('network', 'always') && notifPrefs.network !== 'hide')
  )
  /* 展开态下若已无任何被藏图标（全部转活动/被隐藏），自动回收 */
  useEffect(() => { if (trayExpanded && !anyHidden) setTrayExpanded(false) }, [trayExpanded, anyHidden, setTrayExpanded])
  const showVol = trayShow('volume', 'inactive')
  const showNet = trayShow('network', 'always')

  /* ── 语言栏 CH/EN 指示器（中文版 XP 托盘常驻；Ctrl+Shift 全局切换） ── */
  const inputLang = useXP((s) => s.inputLang)
  const langBarOn = useXP((s) => s.langBarOn)
  const setInputLang = useXP((s) => s.setInputLang)
  const setLangBarOn = useXP((s) => s.setLangBarOn)
  const langCtx: CtxItem[] = [
    {
      label: '还原语言栏(R)',
      onClick: () => showToast('语言栏已还原到任务栏（复刻版说明：CH 指示器即语言栏）'),
    },
    { separator: true },
    {
      label: '设置(S)...',
      onClick: () => openApp('intlprops', {}),
    },
  ]
  const LangBtn = langBarOn ? (
    <XPTip text={inputLang === 'ch' ? '中文(中国) 输入法' : '英语(美国) 输入法'}>
      <button
        type="button"
        data-tray-lang="1"
        className="w-[22px] h-[18px] flex items-center justify-center rounded-[2px] bg-[#f4f4ec] border border-[#9a9a8a] hover:bg-[#e8f0fb] text-[10px] font-bold font-['Tahoma']"
        style={{ color: inputLang === 'ch' ? '#1a3a8a' : '#8a6a1a' }}
        onClick={(e) => { e.stopPropagation(); setInputLang(inputLang === 'ch' ? 'en' : 'ch'); playClick() }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openCtx(e.clientX, e.clientY, langCtx)
        }}
      >
        {inputLang === 'ch' ? 'CH' : 'EN'}
      </button>
    </XPTip>
  ) : null

  /* 网络托盘右键菜单（真实 XP：状态 + 打开网络连接） */
  const netCtx: CtxItem[] = [
    { label: '状态(S)', bold: true, onClick: () => openApp('netconn', {}) },
    { separator: true },
    { label: '打开网络连接(O)', onClick: () => openApp('netconn', {}) },
  ]

  /* ── 任务栏拖动：未锁定时可拖往屏幕四边；边缘手柄可调高度/宽度 ── */
  const startTbMove = (e: React.PointerEvent) => {
    if (taskbarLocked || e.button !== 0) return
    tbDragRef.current = { mode: 'move', sx: e.clientX, sy: e.clientY, h0: taskbarH }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件无活动指针 */
    }
  }

  const startTbResize = (e: React.PointerEvent) => {
    if (taskbarLocked || e.button !== 0) return
    e.stopPropagation()
    tbDragRef.current = { mode: 'resize', sx: e.clientX, sy: e.clientY, h0: taskbarH }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件无活动指针 */
    }
  }

  const onTbPointerMove = (e: React.PointerEvent) => {
    const d = tbDragRef.current
    if (!d) return
    if (d.mode === 'resize') {
      let h = d.h0
      if (taskbarPos === 'bottom') h = d.h0 - (e.clientY - d.sy)
      else if (taskbarPos === 'top') h = d.h0 + (e.clientY - d.sy)
      else if (taskbarPos === 'left') h = d.h0 + (e.clientX - d.sx)
      else h = d.h0 - (e.clientX - d.sx)
      setTaskbarH(Math.round(h))
      return
    }
    /* move：按指针位置停靠到最近的屏幕边缘 */
    const vw = window.innerWidth
    const vh = window.innerHeight
    const dl = e.clientX
    const dr = vw - e.clientX
    const dtp = e.clientY
    const db = vh - e.clientY
    const min = Math.min(dl, dr, dtp, db)
    const pos: TaskbarPos = min === dl ? 'left' : min === dr ? 'right' : min === dtp ? 'top' : 'bottom'
    if (pos !== taskbarPos) setTaskbarPos(pos)
  }

  const endTbDrag = () => {
    tbDragRef.current = null
  }

  /* ── 自动隐藏：指针贴近停靠边缘或悬停任务栏时滑入，离开时滑出 ── */
  const tbRef = useRef<HTMLDivElement>(null)
  const [tbHidden, setTbHidden] = useState(false)
  useEffect(() => {
    if (!taskbarAutoHide) return
    const h = (e: PointerEvent) => {
      const el = tbRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const inBar =
        e.clientX >= r.left - 1 && e.clientX <= r.right + 1 &&
        e.clientY >= r.top - 2 && e.clientY <= r.bottom + 1
      const atEdge =
        taskbarPos === 'bottom'
          ? e.clientY >= window.innerHeight - 3
          : taskbarPos === 'top'
            ? e.clientY <= 3
            : taskbarPos === 'left'
              ? e.clientX <= 3
              : e.clientX >= window.innerWidth - 3
      const st = useXP.getState()
      setTbHidden(!(inBar || atEdge || st.startOpen || st.volumeFlyout))
    }
    window.addEventListener('pointermove', h)
    return () => window.removeEventListener('pointermove', h)
  }, [taskbarAutoHide, taskbarPos])

  const hideTransform =
    taskbarPos === 'bottom'
      ? 'translateY(calc(100% - 2px))'
      : taskbarPos === 'top'
        ? 'translateY(calc(-100% + 2px))'
        : taskbarPos === 'left'
          ? 'translateX(calc(-100% + 2px))'
          : 'translateX(calc(100% - 2px))'

  /* ── 显示桌面（XP：再点一次全部还原） ── */
  const showDesktopToggle = () => {
    const st = useXP.getState()
    if (st.windows.some((w) => !w.minimized)) st.minimizeAll()
    else st.restoreAllWindows()
  }

  const visibleWindows = windows.filter((w) => !w.noTaskbar)

  /* ── 分组相似任务栏按钮（XP 真实策略：按钮装不下时才按组合并） ── */
  const groupedApps = useMemo(() => {
    const map = new Map<string, WinState[]>()
    if (!taskbarGroup || visibleWindows.length === 0) return map
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const fixed = 96 + (showQuickLaunch ? 88 : 0) + (tbDesktop ? 140 : 0) + (tbLinks ? 56 : 0) + tbCustom.length * 90 + 104
    const capacity = vert
      ? Math.max(2, Math.floor((vh - fixed - 60) / 34))
      : Math.max(1, Math.floor((vw - fixed) / 138))
    const counts = new Map<string, number>()
    visibleWindows.forEach((w) => counts.set(w.app, (counts.get(w.app) ?? 0) + 1))
    let total = visibleWindows.length
    while (total > capacity) {
      let best: string | null = null
      let bestN = 1
      counts.forEach((n, app) => {
        if (n > bestN && !map.has(app)) {
          best = app
          bestN = n
        }
      })
      if (best == null) break
      map.set(best, visibleWindows.filter((w) => w.app === best))
      total -= bestN - 1
    }
    return map
  }, [visibleWindows, taskbarGroup, showQuickLaunch, tbDesktop, tbLinks, tbCustom, vert])

  type BtnEntry = { kind: 'win'; win: WinState } | { kind: 'grp'; app: string; wins: WinState[] }
  const btnEntries: BtnEntry[] = []
  visibleWindows.forEach((w) => {
    const g = groupedApps.get(w.app)
    if (g) {
      if (!btnEntries.some((e) => e.kind === 'grp' && e.app === w.app)) btnEntries.push({ kind: 'grp', app: w.app, wins: g })
    } else {
      btnEntries.push({ kind: 'win', win: w })
    }
  })

  /* ── 工具栏条目（桌面 / 链接 / 自定义） ── */
  /* 文件节点 → 任务栏条目（appId 快捷方式直达应用；修复 .lnk 落到记事本的旧缺口） */
  const fileEntryFor = (n: FSNode, parent: string[]): TbEntry => {
    if (n.appId === 'showdesktop' || /显示桌面/.test(n.name)) {
      return { label: '显示桌面', icon: <ShowDesktopIcon />, open: () => showDesktopToggle() }
    }
    if (n.appId) {
      const reg = APP_REGISTRY[n.appId]
      if (reg) {
        return {
          label: n.name.replace(/\.(lnk|url|scf)$/i, ''),
          icon: <reg.icon size={16} />,
          open: () => useXP.getState().openApp(n.appId as string, {}),
        }
      }
    }
    const e = tbFileEntry(n, parent)
    return { label: e.label, icon: e.icon, open: e.onClick }
  }

  /* 快速启动（d18：由真实文件夹驱动 → XP 可自定义：拖入/删除文件即增减按钮） */
  const quickEntries: TbEntry[] = useMemo(
    () => (resolvePath(QUICK_LAUNCH_PATH, fsTree)?.children ?? []).map((n) => fileEntryFor(n, QUICK_LAUNCH_PATH)),
    [fsTree],
  )

  const desktopEntries: TbEntry[] = useMemo(() => {
    const files = resolvePath(DESKTOP_PATH, fsTree)?.children ?? []
    return [
      ...TB_SYS_ICONS,
      ...files.map((n) => {
        const e = fileEntryFor(n, DESKTOP_PATH)
        return { label: e.label, icon: e.icon, open: e.open }
      }),
    ]
  }, [fsTree])

  const linkEntries: TbEntry[] = useMemo(
    () => ieFavorites.map((f) => ({ label: f.title, icon: <IEIcon size={16} />, open: () => useXP.getState().openApp('ie', { url: f.url }) })),
    [ieFavorites],
  )

  const customSegs = useMemo(
    () =>
      tbCustom.map((t) => ({
        name: t.name,
        path: t.path,
        entries: (resolvePath(t.path, fsTree)?.children ?? []).map((n) => {
          const e = fileEntryFor(n, t.path)
          return { label: e.label, icon: e.icon, open: e.open }
        }),
      })),
    [tbCustom, fsTree],
  )

  /* 工具栏段落「显示标题」（XP 默认：链接/自定义显示，快速启动/桌面不显示） */
  const titleShown = (key: string, def: boolean) => tbTitles[key] ?? def

  /* 工具栏段落右键菜单（XP 真实三件：打开文件夹/显示标题/关闭工具栏） */
  const sectionCtx = (key: string, defTitle: boolean, folderPath: string[] | null, onClose: () => void): CtxItem[] => [
    {
      label: '打开文件夹(O)',
      disabled: !folderPath,
      onClick: () => folderPath && openApp('explorer', { path: folderPath }, folderPath[folderPath.length - 1]),
    },
    { label: '显示标题(T)', checked: titleShown(key, defTitle), onClick: () => setTbTitle(key, !titleShown(key, defTitle)) },
    { separator: true },
    { label: '关闭工具栏(C)', onClick: onClose },
  ]

  const ALLUSERS_START = ['本地磁盘 (C:)', 'Documents and Settings', 'All Users', '「开始」菜单']

  const taskbarCtx: CtxItem[] = [
    {
      label: '工具栏(T)',
      submenu: [
        { label: '快速启动', checked: showQuickLaunch, onClick: () => setQuickLaunch(!showQuickLaunch) },
        { label: '语言栏', checked: langBarOn, onClick: () => setLangBarOn(!langBarOn) },
        { label: '桌面', checked: tbDesktop, onClick: () => setTbDesktop(!tbDesktop) },
        { label: '链接', checked: tbLinks, onClick: () => setTbLinks(!tbLinks) },
        ...tbCustom.map((t) => ({ label: t.name, checked: true, onClick: () => removeTbCustom(t.name) })),
        { separator: true },
        { label: '新建工具栏(D)...', onClick: () => openApp('newtoolbar', {}) },
      ],
    },
    { separator: true },
    { label: '层叠窗口(S)', disabled: windows.length === 0, onClick: () => {
      windows.forEach((w, i) => useXP.getState().setRect(w.id, { x: 30 + i * 28, y: 24 + i * 26, w: Math.min(w.w, 640), h: Math.min(w.h, 460) }))
    } },
    /* XP：横向平铺 = 每窗全宽、上下排布 */
    { label: '横向平铺窗口(H)', disabled: windows.length === 0, onClick: () => {
      const n = windows.length || 1
      const vw = window.innerWidth
      const vh = window.innerHeight - (taskbarPos === 'bottom' ? taskbarH : 0)
      const top = taskbarPos === 'top' ? taskbarH : 0
      windows.forEach((w, i) => useXP.getState().setRect(w.id, { x: 0, y: top + Math.round((vh / n) * i), w: vw, h: Math.round(vh / n) }))
    } },
    /* XP：纵向平铺 = 每窗全高、左右排布 */
    { label: '纵向平铺窗口(E)', disabled: windows.length === 0, onClick: () => {
      const n = windows.length || 1
      const vw = window.innerWidth
      const vh = window.innerHeight - (taskbarPos === 'bottom' ? taskbarH : 0)
      const top = taskbarPos === 'top' ? taskbarH : 0
      windows.forEach((w, i) => useXP.getState().setRect(w.id, { x: Math.round((vw / n) * i), y: top, w: Math.round(vw / n), h: vh }))
    } },
    { label: '显示桌面(D)', onClick: () => showDesktopToggle() },
    { separator: true },
    { label: '任务管理器(K)', accelerator: 'Ctrl+Shift+Esc', onClick: () => openApp('taskmgr', {}) },
    { separator: true },
    { label: '锁定任务栏(L)', checked: taskbarLocked, onClick: () => setTaskbarLocked(!taskbarLocked) },
    { label: '属性(R)', onClick: () => openApp('taskbarprops', {}) },
  ]

  /* 托盘时钟右键菜单（真实 XP 仅一项） */
  const clockCtx: CtxItem[] = [
    { label: '调整日期/时间(A)', bold: true, onClick: () => openApp('datetime', {}) },
  ]

  /* 音量托盘右键菜单（真实 XP 两项） */
  const volCtx: CtxItem[] = [
    { label: '打开音量控制(O)', bold: true, onClick: () => { setVolumeFlyout(false); openApp('volume', {}) } },
    { separator: true },
    { label: '调整音频属性(A)', onClick: () => { setVolumeFlyout(false); openApp('soundprops', {}) } },
  ]

  /* « 折叠按钮（XP 通知区域：闲置图标藏其后，点击展开/收起）
     1:1 依据 Wikipedia《Windows XP task grouping (Luna)》像素取证（d29）：
     单箭头（非 « 双箭头）、白色 1px 细线 ~5×9、浅蓝光面小胶囊 ~10×14（经典主题=3D 灰钮黑细箭头） */
  const TrayChevron = (
    <XPTip text={trayExpanded ? '折叠不活动的图标' : '显示隐藏的图标'}>
      <button
        type="button"
        data-tray-chevron="1"
        className="shrink-0 flex items-center justify-center xp-traychev"
        style={{ width: 10, height: 14 }}
        onClick={(e) => { e.stopPropagation(); setTrayExpanded(!trayExpanded); playClick() }}
      >
        <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
          <path
            d={trayExpanded ? 'M2 0.75 L6.5 5 L2 9.25' : 'M6 0.75 L1.5 5 L6 9.25'}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </XPTip>
  )

  /* 网络托盘图标（真实 XP：连接时常驻双显示器图标） */
  const NetBtn = (
    <XPTip text="本地连接 现在已连接（速度: 100.0 Mbps）">
      <button
        type="button"
        data-tray-net="1"
        className="w-[16px] h-[16px] flex items-center rounded-[2px] hover:bg-white/20"
        onClick={(e) => { e.stopPropagation(); touchTray('network') }}
        onDoubleClick={() => { touchTray('network'); openApp('netconn', {}) }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          touchTray('network')
          openCtx(e.clientX, e.clientY, netCtx)
        }}
      >
        <Bmp name="tray-network" size={16} />
      </button>
    </XPTip>
  )

  /* 音量托盘图标（交互刷新活动时间戳——闲置后自动收回 « 后面） */
  const VolBtn = (
    <XPTip text={volumeMuted ? '音量（已静音）' : '音量'}>
      <button
        type="button"
        data-tray-vol="1"
        className="xp-tray-vol w-[16px] h-[16px] flex items-center rounded-[2px] hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation()
          touchTray('volume')
          setVolumeFlyout(!volumeFlyout)
          playClick()
        }}
        onDoubleClick={() => {
          touchTray('volume')
          setVolumeFlyout(false)
          openApp('volume', {})
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          touchTray('volume')
          openCtx(e.clientX, e.clientY, volCtx)
        }}
      >
        <VolumeIcon size={16} />
      </button>
    </XPTip>
  )

  /* 开始按钮右键（真实 XP：打开/浏览所有用户 + 搜索 + 属性） */
  const startBtnCtx: CtxItem[] = [
    { label: '打开所有用户(O)', onClick: () => openApp('explorer', { path: ALLUSERS_START }, '「开始」菜单') },
    { label: '浏览所有用户(E)', onClick: () => openApp('explorer', { path: ALLUSERS_START }, '「开始」菜单') },
    { separator: true },
    { label: '搜索(S)...', onClick: () => openApp('search', {}) },
    { separator: true },
    { label: '属性(R)', onClick: () => openApp('taskbarprops', {}) },
  ]

  /* 调整高度的手柄位置（按任务栏所在边） */
  const resizeHandleCls =
    taskbarPos === 'bottom'
      ? 'absolute left-0 right-0 top-[-3px] h-[6px] cursor-ns-resize'
      : taskbarPos === 'top'
        ? 'absolute left-0 right-0 bottom-[-3px] h-[6px] cursor-ns-resize'
        : taskbarPos === 'left'
          ? 'absolute top-0 bottom-0 right-[-3px] w-[6px] cursor-ew-resize'
          : 'absolute top-0 bottom-0 left-[-3px] w-[6px] cursor-ew-resize'

  /* 共通样式：层级(置于前端) + 自动隐藏滑出 */
  const tbBaseStyle: React.CSSProperties = vert ? { width: taskbarH } : { height: taskbarH }
  const tbStyle: React.CSSProperties = {
    ...tbBaseStyle,
    zIndex: taskbarOnTop ? 500 : 5,
    transform: taskbarAutoHide && tbHidden ? hideTransform : undefined,
    transition: 'transform 160ms ease-out',
  }

  /* ── 垂直任务栏（左侧/右侧停靠） ── */
  if (vert) {
    return (
      <>
        {volumeFlyout && showVol ? <VolumeFlyout pos={taskbarPos} th={taskbarH} /> : null}
        <div
          ref={tbRef}
          className={`fixed top-0 bottom-0 xp-taskbar flex flex-col select-none ${taskbarPos === 'left' ? 'left-0' : 'right-0'}`}
          style={tbStyle}
          onPointerMove={onTbPointerMove}
          onPointerUp={endTbDrag}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openCtx(e.clientX, e.clientY, taskbarCtx)
          }}
        >
          {/* 开始按钮（垂直版） —— XP 真实悬停提示「单击这里开始」 */}
          <XPTip text="单击这里开始">
            <button
              type="button"
              className={`xp-start-btn-vert ${startOpen ? 'xp-start-btn-on' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleStart()
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openCtx(e.clientX, e.clientY, startBtnCtx)
              }}
            >
              <XPFlag size={20} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
              <span className="xp-luna-fg font-bold italic text-[11px] tracking-wide" style={{ writingMode: 'vertical-rl', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                开始
              </span>
            </button>
          </XPTip>

          {/* 未锁定：拖动手柄 + 宽度调整手柄 */}
          {!taskbarLocked ? <TbGrip vertical onDown={startTbMove} /> : null}
          {!taskbarLocked ? (
            <div className={`${resizeHandleCls} z-10`} onPointerDown={startTbResize} onPointerMove={onTbPointerMove} onPointerUp={endTbDrag} />
          ) : null}

          {/* 快速启动（垂直：Quick Launch 文件夹驱动） */}
          {showQuickLaunch ? (
            <div
              className="flex flex-col items-center gap-[3px] py-[4px] mx-[6px] border-l border-[#4a7ec8]/60 border-r border-[#4a7ec8]/60"
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openCtx(e.clientX, e.clientY, sectionCtx('quick', false, QUICK_LAUNCH_PATH, () => setQuickLaunch(false)))
              }}
            >
              {quickEntries.slice(0, 6).map((en) => (
                <XPTip key={`qlv-${en.label}`} text={en.label}>
                  <button type="button" className="w-[20px] h-[20px] flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20" onClick={en.open}>
                    {en.icon}
                  </button>
                </XPTip>
              ))}
            </div>
          ) : null}

          {/* 桌面 / 链接 / 自定义工具栏（垂直紧凑版：» 弹出菜单 + 段落右键） */}
          {tbDesktop ? (
            <div
              className="flex justify-center py-[3px] mx-[6px] border-l border-[#4a7ec8]/60 border-r border-[#4a7ec8]/60"
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, sectionCtx('desktop', false, DESKTOP_PATH, () => setTbDesktop(false))) }}
            >
              <ChevronBtn vertical onClick={(e) => openCtx(e.clientX - 190, e.clientY, entriesToCtx(desktopEntries))} />
            </div>
          ) : null}
          {tbLinks ? (
            <div
              className="flex justify-center py-[3px] mx-[6px] border-l border-[#4a7ec8]/60 border-r border-[#4a7ec8]/60"
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, sectionCtx('links', true, LINKS_PATH, () => setTbLinks(false))) }}
            >
              <ChevronBtn vertical onClick={(e) => openCtx(e.clientX - 190, e.clientY, linkEntries.length ? entriesToCtx(linkEntries) : [{ label: '(空)', disabled: true }])} />
            </div>
          ) : null}
          {customSegs.map((seg) => (
            <div
              key={seg.name}
              className="flex justify-center py-[3px] mx-[6px] border-l border-[#4a7ec8]/60 border-r border-[#4a7ec8]/60"
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, sectionCtx(seg.name, true, seg.path, () => removeTbCustom(seg.name))) }}
            >
              <ChevronBtn vertical onClick={(e) => openCtx(e.clientX - 190, e.clientY, seg.entries.length ? entriesToCtx(seg.entries) : [{ label: '(空)', disabled: true }])} />
            </div>
          ))}

          {/* 任务按钮区（垂直堆叠，支持分组） */}
          <div className="flex-1 flex flex-col gap-[2px] px-[3px] py-[3px] overflow-hidden">
            {btnEntries.map((en) => {
              if (en.kind === 'win') {
                const w = en.win
                const reg = APP_REGISTRY[w.app] ?? APP_REGISTRY.dialog
                const Icon = reg.icon
                const active = !w.minimized && w.z === topZ && w.z === zTop
              return (
                <XPTip key={w.id} text={w.title}>
                  <button
                    type="button"
                    data-task-btn={w.id}
                    className={`xp-taskbtn-vert ${active ? 'xp-taskbtn-on' : ''}`}
                    onClick={() => {
                      if (w.minimized) {
                        restoreWindow(w.id)
                      } else if (w.z === zTop) {
                        minimizeWindow(w.id)
                      } else {
                        focusWindow(w.id)
                      }
                    }}
                    onContextMenu={(e) => {
                      /* 任务按钮右键 → 窗口系统菜单（XP 经典） */
                      e.preventDefault()
                      e.stopPropagation()
                      focusWindow(w.id)
                      openCtx(e.clientX, e.clientY, windowSysMenu(w as WinState, reg.resizable !== false))
                    }}
                  >
                    <span className="shrink-0 flex items-center">
                      <Icon size={16} />
                    </span>
                    {taskbarH >= 56 ? (
                      <span className="text-[10px] max-h-[64px] overflow-hidden text-center" style={{ writingMode: 'vertical-rl' }}>
                        {w.title}
                      </span>
                    ) : null}
                  </button>
                </XPTip>
              )
              }
              /* 分组按钮（垂直） */
              const reg = APP_REGISTRY[en.app] ?? APP_REGISTRY.dialog
              const Icon = reg.icon
              const gActive = en.wins.some((w) => !w.minimized && w.z === topZ && w.z === zTop)
              const grpMenu: CtxItem[] = en.wins.map((w) => ({
                label: w.title,
                icon: <Icon size={16} />,
                onClick: () => (w.minimized ? restoreWindow(w.id) : focusWindow(w.id)),
              }))
              return (
                <XPTip key={`grp-${en.app}`} text={en.wins.map((w) => w.title).join('、')}>
                  <button
                    type="button"
                    data-task-grp={en.app}
                    className={`xp-taskbtn-vert ${gActive ? 'xp-taskbtn-on' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      openCtx(e.clientX + 6, e.clientY, grpMenu)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openCtx(e.clientX, e.clientY, [
                        ...grpMenu,
                        { separator: true },
                        { label: '关闭组(C)', onClick: () => en.wins.forEach((w) => useXP.getState().closeWindow(w.id)) },
                      ])
                    }}
                  >
                  <span className="relative shrink-0 w-[18px] h-[18px]">
                    <span className="absolute right-[-1px] bottom-[-1px] opacity-55">
                      <Icon size={12} />
                    </span>
                    <span className="absolute left-0 top-0">
                      <Icon size={15} />
                    </span>
                  </span>
                  </button>
                </XPTip>
              )
            })}
          </div>

          {/* 系统托盘（垂直：« 折叠 + 网络 + 音量 | 语言栏 | 时钟） */}
          <div className="flex flex-col items-center gap-[5px] px-0 py-[5px] xp-tray">
            {anyHidden ? TrayChevron : null}
            {showNet ? NetBtn : null}
            {showVol ? VolBtn : null}
            {LangBtn}
            {showClock ? (
              <XPTip text={dateStr}>
                <button
                  type="button"
                  className="xp-luna-fg text-[10px] leading-[11px] cursor-default w-full text-center"
                  style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
                  onDoubleClick={() => {
                    playClick()
                    openApp('datetime', {})
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openCtx(e.clientX, e.clientY, clockCtx)
                  }}
                >
                  <div>{hh}</div>
                  <div>{mm}</div>
                </button>
              </XPTip>
            ) : null}
          </div>
        </div>
      </>
    )
  }

  /* ── 水平任务栏（底部/顶部） ── */
  return (
    <>
      {volumeFlyout && showVol ? <VolumeFlyout pos={taskbarPos} th={taskbarH} /> : null}
      <div
        ref={tbRef}
        className={`fixed left-0 right-0 xp-taskbar flex items-stretch select-none ${taskbarPos === 'bottom' ? 'bottom-0' : 'top-0'}`}
        style={tbStyle}
        onPointerMove={onTbPointerMove}
        onPointerUp={endTbDrag}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openCtx(e.clientX, e.clientY, taskbarCtx)
        }}
      >
        {/* 未锁定：调高手柄（外缘） */}
        {!taskbarLocked ? (
          <div className={`${resizeHandleCls} z-10`} onPointerDown={startTbResize} onPointerMove={onTbPointerMove} onPointerUp={endTbDrag} />
        ) : null}

        {/* 开始按钮 —— XP 真实悬停提示「单击这里开始」 */}
        <XPTip text="单击这里开始">
          <button
            type="button"
            className={`xp-start-btn ${startOpen ? 'xp-start-btn-on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleStart()
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCtx(e.clientX, e.clientY, startBtnCtx)
            }}
          >
            <XPFlag size={20} className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
            <span className="xp-luna-fg font-bold italic text-[17px] tracking-wide" style={{ fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif", textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              开始
            </span>
          </button>
        </XPTip>

        {/* 快速启动（Quick Launch 真实文件夹驱动：拖入/删除文件即自定义） */}
        {showQuickLaunch ? (
          <div
            className="flex items-center gap-[3px] px-[6px] ml-[6px] border-l border-[#4a7ec8]/60 border-r border-[#4a7ec8]/60 xp-qlaunch"
            data-tb-section="quick"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCtx(e.clientX, e.clientY, sectionCtx('quick', false, QUICK_LAUNCH_PATH, () => setQuickLaunch(false)))
            }}
            onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-xp-paths')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
            onDrop={(e) => {
              const raw = e.dataTransfer.getData('application/x-xp-paths')
              if (!raw) return
              e.preventDefault()
              e.stopPropagation()
              try {
                const paths = JSON.parse(raw) as string[][]
                fsMove(paths, QUICK_LAUNCH_PATH)
                playClick()
              } catch { /* 非 XP 内部拖放（如浏览器文件），忽略 */ }
            }}
          >
            {!taskbarLocked ? <TbGrip vertical={false} onDown={startTbMove} /> : null}
            {titleShown('quick', false) ? (
              <span className="text-[11px] text-white/90 px-[2px] cursor-default" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>快速启动</span>
            ) : null}
            {quickEntries.slice(0, 8).map((en) => (
              <XPTip key={`ql-${en.label}`} text={en.label}>
                <button
                  type="button"
                  className="w-[20px] h-[20px] flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20"
                  onClick={en.open}
                >
                  {en.icon}
                </button>
              </XPTip>
            ))}
            {quickEntries.length > 8 ? (
              <ChevronBtn onClick={(e) => openCtx(e.clientX - 170, e.clientY - 6, entriesToCtx(quickEntries))} />
            ) : null}
          </div>
        ) : null}

        {/* 桌面工具栏 */}
        {tbDesktop ? (
          <div
            className="flex items-center gap-[2px] px-[4px] border-l border-r border-[#4a7ec8]/60"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCtx(e.clientX, e.clientY, sectionCtx('desktop', false, DESKTOP_PATH, () => setTbDesktop(false)))
            }}
          >
            {!taskbarLocked ? <TbGrip vertical={false} onDown={startTbMove} /> : null}
            {titleShown('desktop', false) ? (
              <span className="text-[11px] text-white/90 px-[2px] cursor-default" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>桌面</span>
            ) : null}
            {desktopEntries.slice(0, 5).map((en) => (
              <XPTip key={`dtb-${en.label}`} text={en.label}>
                <button
                  type="button"
                  className="w-[20px] h-[20px] flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20 shrink-0"
                  onClick={en.open}
                >
                  {en.icon}
                </button>
              </XPTip>
            ))}
            {desktopEntries.length > 5 ? (
              <ChevronBtn onClick={(e) => openCtx(e.clientX - 170, e.clientY - 6, entriesToCtx(desktopEntries))} />
            ) : null}
          </div>
        ) : null}

        {/* 链接工具栏 */}
        {tbLinks ? (
          <div
            className="flex items-center gap-[2px] px-[4px] border-l border-r border-[#4a7ec8]/60"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCtx(e.clientX, e.clientY, sectionCtx('links', true, LINKS_PATH, () => setTbLinks(false)))
            }}
          >
            {!taskbarLocked ? <TbGrip vertical={false} onDown={startTbMove} /> : null}
            {titleShown('links', true) ? (
              <span className="text-[11px] text-white/90 px-[2px] cursor-default" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>链接</span>
            ) : null}
            {linkEntries.slice(0, 2).map((en) => (
              <XPTip key={`ltb-${en.label}`} text={en.label}>
                <button
                  type="button"
                  className="w-[20px] h-[20px] flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20 shrink-0"
                  onClick={en.open}
                >
                  {en.icon}
                </button>
              </XPTip>
            ))}
            <ChevronBtn onClick={(e) => openCtx(e.clientX - 170, e.clientY - 6, linkEntries.length ? entriesToCtx(linkEntries) : [{ label: '(空)', disabled: true }])} />
          </div>
        ) : null}

        {/* 自定义工具栏 */}
        {customSegs.map((seg) => (
          <div
            key={`ctb-${seg.name}`}
            className="flex items-center gap-[2px] px-[4px] border-l border-r border-[#4a7ec8]/60"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openCtx(e.clientX, e.clientY, sectionCtx(seg.name, true, seg.path, () => removeTbCustom(seg.name)))
            }}
          >
            {!taskbarLocked ? <TbGrip vertical={false} onDown={startTbMove} /> : null}
            {titleShown(seg.name, true) ? (
              <span className="text-[11px] text-white/90 px-[2px] cursor-default max-w-[92px] truncate" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>{seg.name}</span>
            ) : null}
            {seg.entries.slice(0, 3).map((en) => (
              <XPTip key={`ctb-${seg.name}-${en.label}`} text={en.label}>
                <button
                  type="button"
                  className="w-[20px] h-[20px] flex items-center justify-center rounded-[2px] hover:bg-white/25 active:bg-black/20 shrink-0"
                  onClick={en.open}
                >
                  {en.icon}
                </button>
              </XPTip>
            ))}
            <ChevronBtn
              onClick={(e) =>
                openCtx(
                  e.clientX - 170,
                  e.clientY - 6,
                  seg.entries.length ? entriesToCtx(seg.entries) : [{ label: '(空)', disabled: true }],
                )
              }
            />
          </div>
        ))}

        {/* 任务按钮区（支持分组） */}
        <div className="flex-1 flex items-center gap-[3px] px-2 overflow-hidden">
          {btnEntries.map((en) => {
            if (en.kind === 'win') {
              const w = en.win
              const reg = APP_REGISTRY[w.app] ?? APP_REGISTRY.dialog
              const Icon = reg.icon
              const active = !w.minimized && w.z === topZ && w.z === zTop
              return (
                <XPTip key={w.id} text={w.title}>
                  <button
                    type="button"
                    data-task-btn={w.id}
                    className={`xp-taskbtn ${active ? 'xp-taskbtn-on' : ''}`}
                    onClick={() => {
                      if (w.minimized) {
                        restoreWindow(w.id)
                      } else if (w.z === zTop) {
                        minimizeWindow(w.id)
                      } else {
                        focusWindow(w.id)
                      }
                    }}
                    onContextMenu={(e) => {
                      /* 任务按钮右键 → 窗口系统菜单（XP 经典） */
                      e.preventDefault()
                      e.stopPropagation()
                      focusWindow(w.id)
                      openCtx(e.clientX, e.clientY, windowSysMenu(w as WinState, reg.resizable !== false))
                    }}
                  >
                  <span className="shrink-0 flex items-center">
                    <Icon size={16} />
                  </span>
                  <span className="truncate text-[11px]">{w.title}</span>
                  </button>
                </XPTip>
              )
            }
            /* 分组按钮（XP 堆叠图标 + 点击弹出窗口列表） */
            const reg = APP_REGISTRY[en.app] ?? APP_REGISTRY.dialog
            const Icon = reg.icon
            const gActive = en.wins.some((w) => !w.minimized && w.z === topZ && w.z === zTop)
            const label = [...en.wins].sort((a, b) => b.z - a.z)[0]?.title ?? ''
            const grpMenu: CtxItem[] = en.wins.map((w) => ({
              label: w.title,
              icon: <Icon size={16} />,
              onClick: () => (w.minimized ? restoreWindow(w.id) : focusWindow(w.id)),
            }))
            return (
              <XPTip key={`grp-${en.app}`} text={label}>
                <button
                  type="button"
                  data-task-grp={en.app}
                  className={`xp-taskbtn ${gActive ? 'xp-taskbtn-on' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    openCtx(e.clientX - 4, e.clientY - 8, grpMenu)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openCtx(e.clientX, e.clientY, [
                      ...grpMenu,
                      { separator: true },
                      { label: '关闭组(C)', onClick: () => en.wins.forEach((w) => useXP.getState().closeWindow(w.id)) },
                    ])
                  }}
                >
                <span className="relative shrink-0 w-[19px] h-[16px]">
                  <span className="absolute right-[-1px] bottom-[-1px] opacity-55">
                    <Icon size={12} />
                  </span>
                  <span className="absolute left-0 top-0">
                    <Icon size={15} />
                  </span>
                </span>
                <span className="truncate text-[11px]">{label}</span>
                </button>
              </XPTip>
            )
          })}
        </div>

        {/* 系统托盘（« 折叠不活动图标 + 网络 + 音量 | 语言栏 | 时钟） */}
        <div className="flex items-center gap-[6px] pl-[6px] pr-[9px] xp-tray">
          {anyHidden ? TrayChevron : null}
          {showNet ? NetBtn : null}
          {showVol ? VolBtn : null}
          {LangBtn}
          {showClock ? (
            <XPTip text={dateStr}>
              <button
                type="button"
                className="xp-luna-fg text-[11px] pl-[2px] pr-[2px] cursor-default"
                style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
                onDoubleClick={() => {
                  playClick()
                  openApp('datetime', {})
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openCtx(e.clientX, e.clientY, clockCtx)
                }}
              >
                {time}
              </button>
            </XPTip>
          ) : null}
        </div>
      </div>
    </>
  )
}
