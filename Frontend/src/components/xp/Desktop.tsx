'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useXP, type CtxItem } from './store'
import { imeEnter } from './ime-keys'
import { MyComputerIcon, MyDocumentsIcon, NetworkIcon, IEIcon, RecycleBinIcon, FolderIcon } from './icons'
import { resolvePath, stripExt, typeOf, userDesktopPath, myDocsPath, type FSNode } from './fs'
import { playClick, playRecycle } from './sounds'
import { TextFileIcon, ImageFileIcon, ExeFileIcon, WMPIcon, ShortcutBadge } from './app-icons'
import { Bmp } from './bmp'
import { rightDragMenu, sendToItems, openWithItems } from './ctx-menus'
import { PROGRAMS } from './apps/OpenWith'

const DND_MIME = 'application/x-xp-paths'
const DESK_MIME = 'application/x-xp-desk'
/* 内置壁纸地址（自定义壁纸走 settings.customWallpaper） */
const WALLPAPER_SRC: Record<string, string> = {
  bliss: '/wallpapers/bliss.jpg',
  azul: '/wallpapers/azul.jpg',
  autumn: '/wallpapers/autumn.jpg',
}

interface DesktopItem {
  key: string
  label: string
  icon: React.FC<{ size?: number; className?: string }>
  node?: FSNode
  open: () => void
  system?: boolean
}

/* 拖拽落点目标类型 */
type DropTarget =
  | { kind: 'folder'; path: string[] }
  | { kind: 'mydocs' }
  | { kind: 'recycle' }
  | null

export default function Desktop() {
  const wallpaper = useXP((s) => s.wallpaper)
  const wallpaperPos = useXP((s) => s.wallpaperPos)
  const bgColor = useXP((s) => s.bgColor)
  const customWallpaper = useXP((s) => s.customWallpaper)
  const deskIcons = useXP((s) => s.deskIcons)
  const deskIconOverrides = useXP((s) => s.deskIconOverrides)
  const iconSize = useXP((s) => s.iconSize)
  const openCtx = useXP((s) => s.openCtx)
  const openApp = useXP((s) => s.openApp)
  const fsTree = useXP((s) => s.fsTree)
  /* 桌面/我的文档为登录帐户 profile 相对路径（每帐户独立） */
  const sessionUser = useXP((s) => s.sessionUser)
  const DESKTOP_PATH = useMemo(() => userDesktopPath(sessionUser), [sessionUser])
  const MYDOCS_PATH = useMemo(() => myDocsPath(sessionUser), [sessionUser])
  const recycleBin = useXP((s) => s.recycleBin)
  const clipboard = useXP((s) => s.clipboard)
  const desktopPos = useXP((s) => s.desktopPos)
  const autoArrange = useXP((s) => s.autoArrange)
  const alignGrid = useXP((s) => s.alignGrid)
  const desktopSort = useXP((s) => s.desktopSort)
  const taskbarPos = useXP((s) => s.taskbarPos)
  const taskbarH = useXP((s) => s.taskbarH)
  const setDesktopPos = useXP((s) => s.setDesktopPos)
  const fsDelete = useXP((s) => s.fsDelete)
  const fsRename = useXP((s) => s.fsRename)
  const fsPaste = useXP((s) => s.fsPaste)
  const fsMove = useXP((s) => s.fsMove)
  const fsDuplicate = useXP((s) => s.fsDuplicate)
  const fsCreateFolder = useXP((s) => s.fsCreateFolder)
  const fsCreateFile = useXP((s) => s.fsCreateFile)
  const fsCreateShortcut = useXP((s) => s.fsCreateShortcut)
  const setClipboard = useXP((s) => s.setClipboard)
  const showToast = useXP((s) => s.showToast)
  /* XP「隐藏已知文件类型的扩展名」联动（文件夹选项→查看） */
  const hideFileExt = useXP((s) => s.hideFileExt)
  const openDialog = useXP((s) => s.openApp)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [renaming, setRenaming] = useState<{ name: string; value: string } | null>(null)
  /* 延迟双击重命名：选中时刻 + 拖拽抑制 */
  const selAtRef = useRef(0)
  const justDraggedRef = useRef(false)
  useEffect(() => { selAtRef.current = Date.now() }, [selected])
  const [refreshBlink, setRefreshBlink] = useState(false)
  const [dropCell, setDropCell] = useState<{ x: number; y: number } | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  /* 右键拖放（XP：按住右键拖文件 → 释放弹菜单 移动/复制/快捷方式/取消） */
  const rdRef = useRef<{ x: number; y: number; started: boolean; keys: string[]; ghost: HTMLDivElement | null } | null>(null)
  const [rdTarget, setRdTarget] = useState<string | null>(null)
  /* 最新 itemMenu 引用（右键释放时调用，避免监听器频繁重挂） */
  const itemMenuRef = useRef<(it: DesktopItem) => CtxItem[]>(null as unknown as (it: DesktopItem) => CtxItem[])
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })
  const marqueeRef = useRef<{ x: number; y: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const upd = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  /* 桌面文件夹内容（真实文件） */
  const desktopFiles = useMemo(() => {
    const node = resolvePath(DESKTOP_PATH, fsTree)
    return (node?.children ?? []).map((n) => ({ node: n, key: `file:${n.name}` }))
  }, [fsTree, DESKTOP_PATH])

  /* 图标清单：系统图标（受「自定义桌面」显隐/图标覆盖控制）+ 真实文件 */
  const icons: DesktopItem[] = useMemo(() => {
    const sysIcon = (key: string, def: React.FC<{ size?: number; className?: string }>) => {
      const ov = deskIconOverrides[key]
      return ov ? (p: { size?: number; className?: string }) => <Bmp name={ov} size={p.size} className={p.className} /> : def
    }
    const sys: DesktopItem[] = [
      {
        key: 'sys:mydocs',
        label: '我的文档',
        icon: sysIcon('sys:mydocs', MyDocumentsIcon),
        system: true,
        open: () => openApp('explorer', { path: MYDOCS_PATH }, '我的文档'),
      },
      {
        key: 'sys:mycomputer',
        label: '我的电脑',
        icon: sysIcon('sys:mycomputer', MyComputerIcon),
        system: true,
        open: () => openApp('explorer', { path: [] }, '我的电脑'),
      },
      {
        key: 'sys:network',
        label: '网上邻居',
        icon: sysIcon('sys:network', NetworkIcon),
        system: true,
        open: () => openApp('explorer', { path: ['网上邻居'] }, '网上邻居'),
      },
      {
        key: 'sys:ie',
        label: 'Internet Explorer',
        icon: sysIcon('sys:ie', IEIcon),
        system: true,
        open: () => openApp('ie', {}),
      },
      {
        key: 'sys:recycle',
        label: '回收站',
        icon: (p) => <RecycleBinIcon size={p.size} full={recycleBin.length > 0} className={p.className} />,
        system: true,
        open: () => openApp('explorer', { path: ['回收站'] }, '回收站'),
      },
    ].filter((ic) => deskIcons[ic.key] !== false)
    const files: DesktopItem[] = desktopFiles.map(({ node, key }) => ({
      key,
      /* XP「隐藏已知文件类型的扩展名」联动（重命名输入仍显示全名） */
      label: hideFileExt && node.kind === 'file' ? stripExt(node.name) : node.name,
      node,
      icon:
        node.icon === 'shortcut' ? (p) => (
          <span className="relative inline-flex" style={{ width: p.size, height: p.size }}>
            {(() => {
              const target = node.shortcutTo ? resolvePath(node.shortcutTo, fsTree) : null
              const tk = target?.icon ?? 'text'
              const Comp = tk === 'image' || tk === 'bmp' ? ImageFileIcon : tk === 'exe' ? ExeFileIcon : tk === 'folder' ? FolderIcon : TextFileIcon
              return <Comp size={p.size} />
            })()}
            <ShortcutBadge size={Math.round((p.size ?? 32) * 0.5)} />
          </span>
        )
        : node.icon === 'image' || node.icon === 'bmp' ? ImageFileIcon : node.kind === 'folder' ? (p) => (
          node.icon === 'pictures' ? <FolderIcon size={p.size} variant="pictures" /> : node.icon === 'music' ? <FolderIcon size={p.size} variant="music" /> : node.icon === 'shared' ? <Bmp name="folder-shared" size={p.size} /> : <FolderIcon size={p.size} />
        )
        : node.icon === 'zip' ? (p) => <Bmp name="zipfile" size={p.size} />
        : node.icon === 'font' ? (p) => <Bmp name="fontfile" size={p.size} />
        : node.icon === 'doc' ? (p) => <Bmp name="docfile" size={p.size} />
        : node.icon === 'audio' ? WMPIcon
        : node.appId ? ExeFileIcon
        : TextFileIcon,
      open: () => {
        /* 快捷方式：跳转目标 */
        if (node.shortcutTo) {
          const target = resolvePath(node.shortcutTo, fsTree)
          if (!target) {
            openDialog('dialog', { kind: 'error', title: node.name, text: `无法找到 ${node.name}。\n该快捷方式指向的目标已被删除或移动。` })
            return
          }
          if (target.kind === 'drive' || target.kind === 'folder') {
            openApp('explorer', { path: node.shortcutTo }, target.name)
            return
          }
          if (target.icon === 'text') {
            useXP.getState().pushRecentDoc(node.shortcutTo)
            openApp('notepad', { fileName: target.name, content: target.content ?? '', parentPath: node.shortcutTo.slice(0, -1) })
            return
          }
          if (target.icon === 'image' || target.icon === 'bmp') {
            useXP.getState().pushRecentDoc(node.shortcutTo)
            openApp('imgviewer', { parentPath: node.shortcutTo.slice(0, -1), name: target.name, index: 0 })
            return
          }
          if (target.appId) {
            openApp(target.appId, {})
            return
          }
        }
        if (node.kind === 'folder') {
          openApp('explorer', { path: [...DESKTOP_PATH, node.name] }, node.name)
          return
        }
        /* 「打开方式→始终使用」写入的扩展级关联优先（XP 真实语义） */
        const dotAt = node.name.lastIndexOf('.')
        const assoc = dotAt > 0 ? useXP.getState().extAssoc[node.name.slice(dotAt + 1).toLowerCase()] : undefined
        if (assoc) {
          const prog = PROGRAMS.find((p) => p.id === assoc)
          if (prog) {
            useXP.getState().pushRecentDoc([...DESKTOP_PATH, node.name])
            prog.open({ name: node.name, content: node.content, src: node.src }, DESKTOP_PATH)
            return
          }
        }
        if (node.icon === 'text') {
          useXP.getState().pushRecentDoc([...DESKTOP_PATH, node.name])
          openApp('notepad', { fileName: node.name, content: node.content ?? '', parentPath: DESKTOP_PATH })
          return
        }
        if (node.icon === 'doc') {
          useXP.getState().pushRecentDoc([...DESKTOP_PATH, node.name])
          openApp('wordpad', { fileName: node.name, content: node.content ?? '' })
          return
        }
        if (node.icon === 'image' || node.icon === 'bmp') {
          useXP.getState().pushRecentDoc([...DESKTOP_PATH, node.name])
          openApp('imgviewer', { parentPath: DESKTOP_PATH, name: node.name, index: 0 })
          return
        }
        if (node.appId) {
          openApp(node.appId, { fileName: node.name, content: node.content, src: node.src })
          return
        }
        /* 双击无关联文件 → XP「打开方式」对话框（Web 服务 / 从列表选择） */
        openApp('openwith', { parentPath: DESKTOP_PATH, name: node.name, mode: 'unknown' }, '打开方式')
      },
    }))
    /* 排列图标 → 名称/大小/类型/修改时间（XP：系统图标与文件混排，同名做次序键） */
    const nameOf = (ic: DesktopItem) => ic.node?.name ?? ic.label
    const sizeOf = (ic: DesktopItem) => {
      if (!ic.node || ic.node.kind !== 'file') return -1
      const m = /([\d.,]+)\s*(KB|MB|GB|B)/.exec(ic.node.size ?? '')
      if (!m) return 0
      const mult = m[2] === 'GB' ? 1e6 : m[2] === 'MB' ? 1e3 : m[2] === 'KB' ? 1 : 0.001
      return parseFloat(m[1].replace(/,/g, '')) * mult
    }
    const typeOfIc = (ic: DesktopItem) =>
      ic.system ? (ic.key === 'sys:ie' ? 'Internet 快捷方式' : '系统对象') : ic.node ? typeOf(ic.node) : '文件'
    const modOf = (ic: DesktopItem) => (ic.node?.modified ? new Date(ic.node.modified).getTime() : 0)
    const list = [...sys, ...files]
    if (desktopSort !== 'none') {
      list.sort((a, b) => {
        const byName = nameOf(a).localeCompare(nameOf(b), 'zh')
        if (desktopSort === 'name') return byName
        if (desktopSort === 'size') return sizeOf(a) - sizeOf(b) || byName
        if (desktopSort === 'type') return typeOfIc(a).localeCompare(typeOfIc(b), 'zh') || byName
        return modOf(a) - modOf(b) || byName
      })
    }
    return list
  }, [desktopFiles, recycleBin.length, openApp, openDialog, hideFileExt, deskIcons, deskIconOverrides, desktopSort, DESKTOP_PATH, MYDOCS_PATH])

  /* ── 网格参数（适配任务栏位置；XP 度量：小图标列间距 75px / 大图标 84px） ── */
  const cellW = iconSize >= 48 ? 84 : 75
  const cellH = iconSize + 44
  const areaTop = taskbarPos === 'top' ? taskbarH : 0
  const areaBottom = taskbarPos === 'bottom' ? viewport.h - taskbarH : viewport.h
  const areaH = Math.max(cellH, areaBottom - areaTop)
  const perCol = Math.max(1, Math.floor((areaH - 26) / cellH))
  const defPos = useCallback(
    (idx: number) => {
      const col = Math.floor(idx / perCol)
      const row = idx % perCol
      return { x: 18 + col * cellW, y: areaTop + 12 + row * cellH }
    },
    [perCol, areaTop],
  )
  const posOf = (key: string, idx: number) => (autoArrange ? defPos(idx) : desktopPos[key] ?? defPos(idx))

  /* 最近空闲网格单元（XP：图标落点永不重叠） */
  const findFreeCell = useCallback(
    (cx: number, cy: number, excludeKeys: Set<string>) => {
      const occupied = new Set<string>()
      icons.forEach((ic, i) => {
        if (excludeKeys.has(ic.key)) return
        const p = posOf(ic.key, i)
        occupied.add(`${Math.round((p.x - 18) / cellW)},${Math.round((p.y - areaTop - 12) / cellH)}`)
      })
      const gx = Math.max(0, Math.round((cx - 18 - 38) / cellW))
      const gy = Math.max(0, Math.min(perCol - 1, Math.round((cy - areaTop - 12 - iconSize / 2 - 22) / cellH)))
      const cand: Array<{ x: number; y: number; d: number }> = []
      for (let col = 0; col <= Math.floor((viewport.w - 90) / cellW) + 1; col++) {
        for (let row = 0; row < perCol; row++) {
          if (occupied.has(`${col},${row}`)) continue
          const x = 18 + col * cellW
          const y = areaTop + 12 + row * cellH
          cand.push({ x, y, d: Math.abs(col - gx) + Math.abs(row - gy) * 1.4 })
        }
      }
      cand.sort((a, b) => a.d - b.d)
      return cand[0] ?? { x: 18, y: areaTop + 12 }
    },
    [icons, perCol, viewport.w, areaTop, autoArrange, desktopPos, iconSize, cellW, cellH],
  )

  /* 对齐到网格（XP：每个图标吸附到最近网格单元，碰撞时顺延到下一个空格；不改变排序） */
  const alignToGrid = () => {
    const occupied = new Set<string>()
    icons.forEach((ic, i) => {
      const cur = posOf(ic.key, i)
      let col = Math.max(0, Math.round((cur.x - 18) / cellW))
      let row = Math.max(0, Math.min(perCol - 1, Math.round((cur.y - areaTop - 12) / cellH)))
      let guard = 0
      while (occupied.has(`${col},${row}`) && guard++ < 600) {
        row++
        if (row >= perCol) {
          row = 0
          col++
        }
      }
      occupied.add(`${col},${row}`)
      setDesktopPos(ic.key, 18 + col * cellW, areaTop + 12 + row * cellH)
    })
    setSelected(new Set())
    playClick()
  }

  /* 壁纸渲染（XP 语义：拉伸=100% 100% 变形铺满 / 居中=原尺寸居中 / 平铺=重复；未覆盖处露出背景色） */
  const bg = useMemo(() => {
    if (wallpaper === 'none-blue' || wallpaper === 'none-teal') return { backgroundColor: bgColor } as React.CSSProperties
    const src = wallpaper === 'custom' ? customWallpaper : WALLPAPER_SRC[wallpaper]
    if (!src) return { backgroundColor: bgColor } as React.CSSProperties
    if (wallpaperPos === 'center') return { backgroundColor: bgColor, backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    if (wallpaperPos === 'tile') return { backgroundColor: bgColor, backgroundImage: `url(${src})`, backgroundRepeat: 'repeat' }
    return { backgroundColor: bgColor, backgroundImage: `url(${src})`, backgroundSize: '100% 100%' } as React.CSSProperties
  }, [wallpaper, wallpaperPos, bgColor, customWallpaper])

  /* ── 文件操作 ── */
  const deleteSelected = useCallback(() => {
    const names = [...selected].filter((k) => k.startsWith('file:')).map((k) => k.slice(5))
    if (names.length === 0) {
      showToast('系统图标不能删除（可以用「属性 → 桌面」清理）')
      return
    }
    const label = names.length === 1 ? `"${names[0]}"` : `这 ${names.length} 个项目`
    openDialog('dialog', {
      kind: 'confirm',
      title: '确认文件删除',
      text: `确实要把 ${label} 放入回收站吗？`,
      onYes: () => {
        fsDelete(names.map((n) => [...DESKTOP_PATH, n]))
        setSelected(new Set())
        playClick()
      },
    })
  }, [selected, openDialog, fsDelete, showToast])

  const openProps = (node: FSNode) => {
    openApp('fileprops', {
      name: node.name,
      type: node.type ?? (node.kind === 'folder' ? '文件夹' : '文件'),
      size: node.size,
      path: `${DESKTOP_PATH.join('/')}/${node.name}`,
      modified: node.modified,
      created: node.created,
      icon: node.icon,
      appId: node.appId,
    })
  }

  /* ── 拖拽落点目标（文件夹 / 我的文档 / 回收站） ── */
  const dropTargetOf = (ic: DesktopItem): DropTarget => {
    if (ic.key === 'sys:recycle') return { kind: 'recycle' }
    if (ic.key === 'sys:mydocs') return { kind: 'mydocs' }
    if (ic.node && ic.node.kind === 'folder') return { kind: 'folder', path: [...DESKTOP_PATH, ic.node.name] }
    return null
  }

  /* XP 拖拽鬼影：仅图标、65% 透明、多选拖动时并排显示（svg 与位图 img 均支持） */
  const buildDragGhost = (keys: string[]) => {
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-300px;left:-300px;display:flex;gap:6px;align-items:center;pointer-events:none;'
    let any = false
    keys.slice(0, 5).forEach((k) => {
      const svg = rootRef.current?.querySelector(`[data-desk="${k}"] span :is(svg,img)`) as SVGElement | null
      if (!svg) return
      any = true
      const c = svg.cloneNode(true) as SVGElement
      c.setAttribute('width', String(iconSize))
      c.setAttribute('height', String(iconSize))
      c.style.opacity = '0.65'
      ghost.appendChild(c)
    })
    if (!any) {
      ghost.remove()
      return null
    }
    document.body.appendChild(ghost)
    return ghost
  }

  /* ── 图标拖拽（XP 行为：默认移动 / Ctrl 复制 / 拖入文件夹或回收站 / 拖入资源管理器窗口） ── */
  const onIconDragStart = (e: React.DragEvent, ic: DesktopItem) => {
    if (renaming) {
      e.preventDefault()
      return
    }
    const sel = selected.has(ic.key) ? selected : new Set([ic.key])
    if (!selected.has(ic.key)) setSelected(sel)
    const keys = [...sel]
    const fileKeys = keys.filter((k) => k.startsWith('file:'))
    e.dataTransfer.setData(DND_MIME, JSON.stringify(fileKeys.map((k) => [...DESKTOP_PATH, k.slice(5)])))
    e.dataTransfer.setData(DESK_MIME, JSON.stringify(keys))
    e.dataTransfer.effectAllowed = 'copyMove'
    const ghost = buildDragGhost(keys)
    if (ghost) {
      const w = Math.max(iconSize, Math.min(keys.length, 5) * (iconSize + 6))
      e.dataTransfer.setDragImage(ghost, Math.min(iconSize / 2, w / 2), iconSize / 2)
      setTimeout(() => ghost.remove(), 80)
    }
  }

  const onIconDragOver = (e: React.DragEvent, ic: DesktopItem) => {
    const t = dropTargetOf(ic)
    const hasFiles = e.dataTransfer.types.includes(DND_MIME)
    /* 只有携带文件数据的拖拽才允许落点 */
    if (!t || !hasFiles) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect =
      (e.ctrlKey && e.shiftKey) || e.altKey ? 'link' : e.ctrlKey && t.kind !== 'recycle' ? 'copy' : 'move'
    setDropTargetKey(ic.key)
  }

  const onIconDrop = (e: React.DragEvent, ic: DesktopItem) => {
    const t = dropTargetOf(ic)
    if (!t) return
    e.preventDefault()
    e.stopPropagation()
    setDropTargetKey(null)
    setDropCell(null)
    const raw = e.dataTransfer.getData(DND_MIME)
    if (!raw) return
    const paths = JSON.parse(raw) as string[][]
    if (paths.length === 0) return

    if (t.kind === 'recycle') {
      const label = paths.length === 1 ? `"${paths[0][paths[0].length - 1]}"` : `这 ${paths.length} 个项目`
      openDialog('dialog', {
        kind: 'confirm',
        title: '确认文件删除',
        text: `确实要把 ${label} 放入回收站吗？`,
        onYes: () => {
          fsDelete(paths)
          setSelected(new Set())
          playClick()
        },
      })
      return
    }

    const dest = t.kind === 'mydocs' ? MYDOCS_PATH : t.path
    const destLabel = t.kind === 'mydocs' ? '我的文档' : `"${dest[dest.length - 1]}"`
    /* XP 左键拖放修饰键：Ctrl+Shift/Alt=创建快捷方式、Ctrl=强制复制、Shift/无=移动 */
    if ((e.ctrlKey && e.shiftKey) || e.altKey) {
      const names = paths.map((p) => fsCreateShortcut(dest, p)).filter(Boolean)
      showToast(names.length > 0 ? `已在 ${destLabel} 创建 ${names.length} 个快捷方式` : '创建失败')
    } else if (e.ctrlKey) {
      paths.forEach((p) => fsDuplicate(p))
      showToast(`已复制 ${paths.length} 个项目到 ${destLabel}`)
    } else {
      fsMove(paths, dest)
      showToast(`已移动 ${paths.length} 个项目到 ${destLabel}`)
    }
    setSelected(new Set())
    playClick()
  }

  /* ── 背景拖拽落点：吸附空闲网格 ── */
  const onBgDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DND_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = (e.ctrlKey && e.shiftKey) || e.altKey ? 'link' : e.ctrlKey ? 'copy' : 'move'
    const raw = e.dataTransfer.getData(DESK_MIME)
    let exclude: Set<string> = new Set()
    try {
      if (raw) exclude = new Set(JSON.parse(raw) as string[])
    } catch {
      /* 来自资源管理器 */
    }
    setDropCell(findFreeCell(e.clientX, e.clientY, exclude))
  }

  const onBgDrop = (e: React.DragEvent) => {
    if (e.target !== e.currentTarget) return
    const raw = e.dataTransfer.getData(DND_MIME)
    if (!raw) return
    e.preventDefault()
    setDropCell(null)
    setDropTargetKey(null)
    const paths = JSON.parse(raw) as string[][]
    const deskRaw = e.dataTransfer.getData(DESK_MIME)
    const deskKeys: string[] = deskRaw ? (JSON.parse(deskRaw) as string[]) : []
    const cell = alignGrid
      ? findFreeCell(e.clientX, e.clientY, new Set(deskKeys))
      : {
          /* 对齐到网格关闭：XP 自由落点（跟随鼠标，不吸附） */
          x: Math.max(2, Math.min(e.clientX - iconSize / 2, viewport.w - cellW)),
          y: Math.max(areaTop + 2, Math.min(e.clientY - iconSize / 2 - 22, areaBottom - cellH)),
        }

    if (deskKeys.length > 0) {
      /* 桌面内重排：Ctrl = 复制出副本，否则移动到落点格 */
      if (e.ctrlKey) {
        let i = 0
        deskKeys
          .filter((k) => k.startsWith('file:'))
          .forEach((k) => {
            const newName = fsDuplicate([...DESKTOP_PATH, k.slice(5)])
            if (newName) {
              setDesktopPos(`file:${newName}`, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
              i++
            }
          })
        showToast('已在桌面创建副本')
      } else {
        deskKeys.forEach((k, i) => {
          setDesktopPos(k, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
        })
      }
      playClick()
      return
    }

    /* 来自资源管理器：按修饰键决定 移动/复制/创建快捷方式，落在鼠标位置 */
    if ((e.ctrlKey && e.shiftKey) || e.altKey) {
      paths.forEach((p) => {
        fsCreateShortcut(DESKTOP_PATH, p)
        const nm = `${p[p.length - 1]} 的快捷方式`
        setDesktopPos(`file:${nm}`, cell.x, cell.y)
      })
      showToast(`已在桌面创建 ${paths.length} 个快捷方式`)
    } else if (e.ctrlKey) {
      paths.forEach((p, i) => {
        const nm = fsDuplicate(p)
        if (nm) setDesktopPos(`file:${nm}`, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
      })
      showToast(`已复制 ${paths.length} 个项目到桌面`)
    } else {
      fsMove(paths, DESKTOP_PATH)
      paths.forEach((_, i) => {
        const name = paths[i][paths[i].length - 1]
        setDesktopPos(`file:${name}`, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
      })
    }
    setSelected(new Set())
    playClick()
  }

  /* ── 右键拖放（XP 经典：按住右键拖文件 → 松开弹出「移动到当前位置/复制到当前位置/在当前位置创建快捷方式」） ──
   * HTML5 DnD 不支持右键拖动 → 自建 pointer 跟踪：pointerdown(右键)记录 → move 超阈值生成鬼影 →
   * pointerup 命中检测(elementFromPoint) → rightDragMenu；未拖动则按 XP 原位弹普通菜单
   * contextmenu 双时序兼容（Linux=mousedown 时 / Windows=mouseup 时）：一次性全局捕获拦截 */
  const rdBlockRef = useRef(false)
  useEffect(() => {
    const resolveAt = (x: number, y: number): { ic: DesktopItem; t: NonNullable<DropTarget> } | { bg: true } | null => {
      const el = document.elementFromPoint(x, y)
      const desk = el?.closest('[data-desk]') as HTMLElement | null
      if (desk) {
        const key = desk.getAttribute('data-desk') ?? ''
        const ic = icons.find((i) => i.key === key)
        if (ic) {
          const t = dropTargetOf(ic)
          if (t) return { ic, t }
        }
        return null
      }
      if (el === rootRef.current) return { bg: true }
      return null
    }

    const onMove = (e: PointerEvent) => {
      const rd = rdRef.current
      if (!rd || !(e.buttons & 2)) return
      if (!rd.started) {
        if (Math.hypot(e.clientX - rd.x, e.clientY - rd.y) < 6) return
        rd.started = true
        const ghost = document.createElement('div')
        ghost.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;display:flex;gap:5px;align-items:center;opacity:0.72;'
        rd.keys.slice(0, 4).forEach((k) => {
          const src = rootRef.current?.querySelector(`[data-desk="${k}"] span :is(svg,img)`) as HTMLElement | null
          if (!src) return
          const c = src.cloneNode(true) as HTMLElement
          if (c instanceof SVGElement) {
            c.setAttribute('width', '32')
            c.setAttribute('height', '32')
          } else {
            c.style.width = '32px'
            c.style.height = '32px'
            c.style.imageRendering = 'pixelated'
          }
          ghost.appendChild(c)
        })
        document.body.appendChild(ghost)
        rd.ghost = ghost
      }
      if (rd.ghost) {
        rd.ghost.style.left = `${e.clientX + 10}px`
        rd.ghost.style.top = `${e.clientY + 10}px`
      }
      const hit = resolveAt(e.clientX, e.clientY)
      setRdTarget(hit && 'ic' in hit ? hit.ic.key : null)
    }

    const onUp = (e: PointerEvent) => {
      const rd = rdRef.current
      if (!rd) return
      rdRef.current = null
      rd.ghost?.remove()
      setRdTarget(null)
      /* 装填期间松开的不是右键（如左键单击）→ 中止右键拖放 */
      if (e.button !== 2) {
        rdBlockRef.current = false
        return
      }

      const paths = rd.keys.filter((k) => k.startsWith('file:')).map((k) => [...DESKTOP_PATH, k.slice(5)])
      if (paths.length === 0) return

      if (!rd.started) {
        /* 原地右键：手动弹普通菜单（contextmenu 已被拦截） */
        const ic = icons.find((i) => i.key === rd.keys[0])
        if (ic && !ic.system && ic.node) {
          if (!selected.has(ic.key)) setSelected(new Set([ic.key]))
          useXP.getState().openCtx(e.clientX, e.clientY, itemMenuRef.current(ic))
        }
        return
      }

      const hit = resolveAt(e.clientX, e.clientY)
      if (hit && 'ic' in hit) {
        const { t } = hit
        if (t.kind === 'recycle') {
          rightDragMenu(e.clientX, e.clientY, paths, ['回收站'], '回收站', {
            move: () => {
              openDialog('dialog', {
                kind: 'confirm',
                title: '确认文件删除',
                text: `确实要把这 ${paths.length} 个项目放入回收站吗？`,
                onYes: () => {
                  fsDelete(paths)
                  setSelected(new Set())
                  playClick()
                },
              })
            },
            copy: () => undefined,
            shortcut: () => undefined,
          }, true)
          return
        }
        const dest = t.kind === 'mydocs' ? MYDOCS_PATH : t.path
        const destLabel = t.kind === 'mydocs' ? '我的文档' : dest[dest.length - 1]
        rightDragMenu(e.clientX, e.clientY, paths, dest, destLabel, {
          move: () => {
            fsMove(paths, dest)
            setSelected(new Set())
            playClick()
          },
          copy: () => {
            setClipboard('copy', paths)
            fsPaste(dest)
            playClick()
          },
          shortcut: () => {
            paths.forEach((p) => fsCreateShortcut(dest, p))
            playClick()
          },
        })
        return
      }

      if (hit && hit.bg) {
        const cell = findFreeCell(e.clientX, e.clientY, new Set(rd.keys))
        rightDragMenu(e.clientX, e.clientY, paths, DESKTOP_PATH, '桌面', {
          move: () => {
            rd.keys.forEach((k, i) => setDesktopPos(k, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH))
            playClick()
          },
          copy: () => {
            let i = 0
            rd.keys.filter((k) => k.startsWith('file:')).forEach((k) => {
              const newName = fsDuplicate([...DESKTOP_PATH, k.slice(5)])
              if (newName) {
                setDesktopPos(`file:${newName}`, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
                i++
              }
            })
            playClick()
          },
          shortcut: () => {
            paths.forEach((p, i) => {
              const n = fsCreateShortcut(DESKTOP_PATH, p)
              setDesktopPos(`file:${n}`, cell.x + Math.floor(i / perCol) * cellW, cell.y + (i % perCol) * cellH)
            })
            playClick()
          },
        })
      }
      /* 落在普通图标/窗口/任务栏 → 不弹菜单（XP 行为） */
    }

    /* 一次性 contextmenu 拦截（capture 阶段吃掉右键拖放期间的浏览器菜单） */
    const onCtx = (ev: MouseEvent) => {
      if (rdBlockRef.current) {
        rdBlockRef.current = false
        ev.preventDefault()
        ev.stopPropagation()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('contextmenu', onCtx, true)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('contextmenu', onCtx, true)
    }
  }, [icons, findFreeCell, selected, perCol, cellW, cellH, fsDelete, fsMove, fsDuplicate, fsCreateShortcut, fsPaste, setClipboard, setDesktopPos, openDialog])

  /* ── 右键菜单 ── */
  const itemMenu = (it: DesktopItem): CtxItem[] => {
    /* 回收站：打开/资源管理器/清空/属性（真实 XP 菜单项） */
    if (it.key === 'sys:recycle') {
      return [
        { label: '打开(O)', bold: true, onClick: () => openApp('explorer', { path: ['回收站'] }, '回收站') },
        { label: '资源管理器(X)', onClick: () => openApp('explorer', { path: ['回收站'] }, '回收站') },
        { separator: true },
        {
          label: '清空回收站(B)...',
          disabled: recycleBin.length === 0,
          onClick: () =>
            openDialog('dialog', {
              kind: 'confirm',
              title: '确认文件删除',
              text: `确实要永久删除这 ${recycleBin.length} 个项目吗？`,
              onYes: () => {
                useXP.getState().fsEmptyRecycle()
                playRecycle()
              },
            }),
        },
        { separator: true },
        { label: '创建快捷方式(S)', disabled: true },
        { label: '删除(D)', disabled: true },
        { label: '重命名(M)', disabled: true },
        { separator: true },
        { label: '属性(R)', onClick: () => openApp('recycleprops', {}, '回收站 属性') },
      ]
    }
    /* Internet Explorer：打开/无加载项/属性 */
    if (it.key === 'sys:ie') {
      return [
        { label: '打开(O)', bold: true, onClick: it.open },
        { label: '无加载项的情况下启动(B)', onClick: () => { it.open(); showToast('已启动无加载项模式：所有工具栏/插件均未加载（复刻版无差异）') } },
        { separator: true },
        { label: '创建快捷方式(S)', onClick: () => {
            const name = fsCreateFile(DESKTOP_PATH, 'Internet Explorer - 快捷方式', { icon: 'shortcut', appId: 'ie', type: '快捷方式' })
            showToast(`已在桌面创建 "${name}"`)
            playClick()
          } },
        { label: '删除(D)', disabled: true },
        { label: '重命名(M)', disabled: true },
        { separator: true },
        { label: '属性(R)', onClick: () => openApp('inetopts', {}, 'Internet 选项') },
      ]
    }
    if (it.system || !it.node) {
      /* 我的电脑：管理/映射网络驱动器/断开网络驱动器（真实 XP 菜单项） */
      if (it.key === 'sys:mycomputer') {
        return [
          { label: '打开(O)', bold: true, onClick: it.open },
          { label: '资源管理器(X)', onClick: it.open },
          { label: '搜索(E)...', onClick: () => openApp('search', {}, '搜索结果') },
          { separator: true },
          { label: '管理(G)...', onClick: () => openApp('compmgmt', {}, '计算机管理') },
          { label: '映射网络驱动器(N)...', onClick: () => openApp('mapdrive', {}, '映射网络驱动器') },
          { label: '断开网络驱动器(D)...', onClick: () => openApp('unmapdrive', {}, '断开网络驱动器') },
          { separator: true },
          { label: '创建快捷方式(S)', onClick: () => {
              const name = fsCreateFile(DESKTOP_PATH, '我的电脑 - 快捷方式', { icon: 'shortcut', appId: 'explorer', type: '快捷方式' })
              showToast(`已在桌面创建 "${name}"`)
              playClick()
            } },
          { label: '删除(D)', disabled: true },
          { label: '重命名(M)', disabled: true },
          { separator: true },
          { label: '属性(R)', onClick: () => openApp('sysprops', {}, '系统属性') },
        ]
      }
      /* 我的文档：搜索/属性 → 我的文档属性框 */
      if (it.key === 'sys:mydocs') {
        return [
          { label: '打开(O)', bold: true, onClick: it.open },
          { label: '资源管理器(X)', onClick: it.open },
          { label: '搜索(E)...', onClick: () => openApp('search', {}, '搜索结果') },
          { separator: true },
          { label: '创建快捷方式(S)', onClick: () => {
              const name = fsCreateFile(DESKTOP_PATH, '我的文档 - 快捷方式', { icon: 'shortcut', appId: 'explorer', type: '快捷方式' })
              showToast(`已在桌面创建 "${name}"`)
              playClick()
            } },
          { label: '删除(D)', disabled: true },
          { label: '重命名(M)', disabled: true },
          { separator: true },
          { label: '属性(R)', onClick: () => openApp('mydocsprops', {}, '我的文档 属性') },
        ]
      }
      /* 网上邻居 */
      return [
        { label: '打开(O)', bold: true, onClick: it.open },
        { label: '资源管理器(X)', onClick: it.open },
        { label: '搜索(E)...', onClick: () => openApp('search', {}, '搜索结果') },
        { separator: true },
        { label: '创建快捷方式(S)', onClick: () => {
            const name = fsCreateFile(DESKTOP_PATH, '网上邻居 - 快捷方式', { icon: 'shortcut', appId: 'explorer', type: '快捷方式' })
            showToast(`已在桌面创建 "${name}"`)
            playClick()
          } },
        { label: '删除(D)', disabled: true },
        { label: '重命名(M)', disabled: true },
        { separator: true },
        { label: '属性(R)', onClick: () =>
            openDialog('dialog', {
              kind: 'info',
              title: '网上邻居 属性',
              text: '目标位置： 网上邻居\n\n「网上邻居」显示指向共享文件夹、Web 文件夹和 FTP 站点的快捷方式。\n\n要添加新的网络位置，请打开「网上邻居」后单击左侧的「添加一个网上邻居」。',
            }) },
      ]
    }
    const node = it.node
    return [
      { label: '打开(O)', bold: true, onClick: it.open },
      ...(node.kind === 'folder'
        ? [
            { label: '资源管理器(X)', onClick: it.open },
            { label: '搜索(E)...', onClick: () => openApp('search', {}, '搜索结果') },
            {
              label: '共享和安全(H)...',
              onClick: () =>
                openDialog('dialog', {
                  kind: 'info',
                  title: '共享',
                  text: `要共享「${node.name}」吗？\n\n若要与其他人共享此文件夹，请选择「在网络上共享这个文件夹」。\n\n（复刻版运行在单人宇宙里——简单文件共享已启用，但没有别的机器来访问你。）`,
                }),
            },
          ]
        : []),
      ...(node.kind === 'file' ? [{ label: '打开方式(H)', submenu: openWithItems(DESKTOP_PATH, node.name, node.icon) }] : []),
      ...(node.kind === 'file' || node.kind === 'folder'
        ? [
            { separator: true },
            { label: '发送到(N)', submenu: sendToItems(DESKTOP_PATH, node.name) },
          ]
        : []),
      { separator: true },
      { label: '剪切(T)', onClick: () => { setClipboard('cut', [[...DESKTOP_PATH, node.name]]); showToast(`已剪切 "${node.name}"`) } },
      { label: '复制(C)', onClick: () => { setClipboard('copy', [[...DESKTOP_PATH, node.name]]); showToast(`已复制 "${node.name}"`) } },
      { separator: true },
      { label: '创建快捷方式(S)', onClick: () => { const name = fsCreateShortcut(DESKTOP_PATH, [...DESKTOP_PATH, node.name]); showToast(`已在桌面创建 "${name}"`); playClick() } },
      { label: '删除(D)', onClick: () => { setSelected(new Set([it.key])); setTimeout(() => deleteSelected(), 0) } },
      { label: '重命名(M)', onClick: () => setRenaming({ name: node.name, value: node.name }) },
      { separator: true },
      { label: '属性(R)', onClick: () => openProps(node) },
    ]
  }

  /* itemMenu 每次渲染重建 → ref 同步给右键拖放监听器 */
  useEffect(() => { itemMenuRef.current = itemMenu })

  const desktopCtx: CtxItem[] = [
    {
      label: '排列图标(I)',
      submenu: [
        { label: '名称(N)', radio: true, checked: desktopSort === 'name', onClick: () => { setSelected(new Set()); useXP.getState().setDesktopSort('name'); playClick() } },
        { label: '大小(S)', radio: true, checked: desktopSort === 'size', onClick: () => { setSelected(new Set()); useXP.getState().setDesktopSort('size'); playClick() } },
        { label: '类型(T)', radio: true, checked: desktopSort === 'type', onClick: () => { setSelected(new Set()); useXP.getState().setDesktopSort('type'); playClick() } },
        { label: '修改时间(M)', radio: true, checked: desktopSort === 'modified', onClick: () => { setSelected(new Set()); useXP.getState().setDesktopSort('modified'); playClick() } },
        { separator: true },
        { label: '对齐到网格(G)', checked: alignGrid, onClick: () => { useXP.getState().setAlignGrid(!alignGrid); if (!alignGrid) alignToGrid(); else playClick() } },
        { label: '自动排列(A)', checked: autoArrange, onClick: () => useXP.getState().setAutoArrange(!autoArrange) },
      ],
    },
    { label: '刷新(R)', accelerator: 'F5', onClick: () => setSelected(new Set()) },
    { separator: true },
    { label: '粘贴(P)', accelerator: 'Ctrl+V', disabled: !clipboard, onClick: () => { fsPaste(DESKTOP_PATH); playClick() } },
    { label: '粘贴快捷方式(S)', disabled: true },
    { separator: true },
    {
      label: '新建(W)',
      submenu: [
        {
          label: '文件夹(F)',
          onClick: () => {
            const name = fsCreateFolder(DESKTOP_PATH)
            setSelected(new Set([`file:${name}`]))
            setRenaming({ name, value: name })
            playClick()
          },
        },
        { separator: true },
        {
          label: '文本文档(T)',
          onClick: () => {
            const name = fsCreateFile(DESKTOP_PATH, '新建文本文档.txt', { content: '' })
            setSelected(new Set([`file:${name}`]))
            setRenaming({ name, value: name })
            playClick()
          },
        },
        {
          label: '快捷方式(S)',
          onClick: () => {
            /* XP 快捷方式向导：简化为直接创建指向网上冲浪指南的演示快捷方式 */
            const guide = resolvePath([...DESKTOP_PATH, '网上冲浪指南.txt'], fsTree)
            const name = guide
              ? fsCreateShortcut(DESKTOP_PATH, [...DESKTOP_PATH, '网上冲浪指南.txt'])
              : fsCreateFile(DESKTOP_PATH, '新建快捷方式', { icon: 'shortcut', appId: 'ie', type: '快捷方式' })
            setSelected(new Set([`file:${name}`]))
            playClick()
          },
        },
        {
          label: '位图图像(B)',
          onClick: () => {
            const name = fsCreateFile(DESKTOP_PATH, '新建位图图像.bmp', { icon: 'bmp', type: '位图图像' })
            setSelected(new Set([`file:${name}`]))
            playClick()
          },
        },
        {
          label: '压缩(zipped)文件夹(Z)',
          onClick: () => {
            const name = fsCreateFile(DESKTOP_PATH, '新建压缩文件夹.zip', { icon: 'zip', type: '压缩(zipped)文件夹' })
            setSelected(new Set([`file:${name}`]))
            setRenaming({ name, value: name })
            playClick()
          },
        },
      ],
    },
    { separator: true },
    { label: '属性(R)', onClick: () => openApp('display', { tab: '桌面' }) },
  ]

  /* ── 背景交互（框选） ── */
  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setSelected(new Set())
    setRenaming(null)
    marqueeRef.current = { x: e.clientX, y: e.clientY }
    setMarquee({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY })
    rootRef.current?.focus()
    /* 指针捕获：拖过窗口/任务栏上方松开时仍能收到 pointerup，避免框选卡死 */
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件无活动指针 */
    }
  }

  const onBgPointerMove = useCallback((e: React.PointerEvent) => {
    const m = marqueeRef.current
    if (!m) return
    setMarquee((prev) => (prev ? { ...prev, x2: e.clientX, y2: e.clientY } : prev))
  }, [])

  const onBgPointerUp = (e: React.PointerEvent) => {
    const m = marqueeRef.current
    marqueeRef.current = null
    if (m) {
      const x1 = Math.min(m.x, e.clientX)
      const x2 = Math.max(m.x, e.clientX)
      const y1 = Math.min(m.y, e.clientY)
      const y2 = Math.max(m.y, e.clientY)
      if (x2 - x1 > 4 || y2 - y1 > 4) {
        const hit = new Set<string>()
        icons.forEach((ic, i) => {
          const p = posOf(ic.key, i)
          if (x1 < p.x + 76 && x2 > p.x && y1 < p.y + iconSize + 40 && y2 > p.y) hit.add(ic.key)
        })
        if (hit.size > 0) setSelected(hit)
      }
    }
    setMarquee(null)
  }

  /* 键盘：方向键导航 / Enter 打开 / F2 重命名 / Menu 键 / Ctrl+A / Delete / Ctrl+V（XP 桌面完整键位） */
  const onKey = (e: React.KeyboardEvent) => {
    if (renaming) return
    const k = e.key
    if (k === 'Delete') {
      e.preventDefault()
      deleteSelected()
    } else if (e.ctrlKey && k.toLowerCase() === 'v' && clipboard) {
      e.preventDefault()
      fsPaste(DESKTOP_PATH)
      playClick()
    } else if (e.ctrlKey && k.toLowerCase() === 'a') {
      /* Ctrl+A 全选（含系统图标） */
      e.preventDefault()
      setSelected(new Set(icons.map((i) => i.key)))
    } else if (e.ctrlKey && k.toLowerCase() === 'c' && selected.size > 0) {
      const names = [...selected].filter((key) => key.startsWith('file:')).map((key) => key.slice(5))
      if (names.length) setClipboard('copy', names.map((n) => [...DESKTOP_PATH, n]))
    } else if (e.ctrlKey && k.toLowerCase() === 'x' && selected.size > 0) {
      const names = [...selected].filter((key) => key.startsWith('file:')).map((key) => key.slice(5))
      if (names.length) setClipboard('cut', names.map((n) => [...DESKTOP_PATH, n]))
    } else if (k === 'F2') {
      /* F2 重命名（选中单个文件时） */
      const fileKeys = [...selected].filter((key) => key.startsWith('file:'))
      if (fileKeys.length === 1) {
        e.preventDefault()
        const name = fileKeys[0].slice(5)
        setRenaming({ name, value: name })
      }
    } else if (k === 'Enter') {
      /* Enter 打开选中项 */
      if (selected.size >= 1) {
        e.preventDefault()
        selected.forEach((key) => {
          const ic = icons.find((i) => i.key === key)
          ic?.open()
        })
      }
    } else if (k === 'ContextMenu' || (e.shiftKey && k === 'F10')) {
      /* 菜单键 / Shift+F10 */
      e.preventDefault()
      if (selected.size >= 1) {
        const key = [...selected].slice(-1)[0]
        const ic = icons.find((i) => i.key === key)
        if (ic) {
          const el = rootRef.current?.querySelector(`[data-desk="${key}"]`) as HTMLElement | null
          const r = el?.getBoundingClientRect()
          openCtx(r ? r.right + 2 : 200, r ? r.top + 10 : 200, itemMenu(ic))
        }
      } else {
        /* 无选中 → 背景菜单（定位到桌面左上角首个图标位，XP 行为） */
        openCtx(16, 16, desktopCtx)
      }
    } else if (k.startsWith('Arrow') && icons.length > 0) {
      /* 方向键按网格位置移动焦点 */
      e.preventDefault()
      const arr = icons.map((ic, i) => ({ key: ic.key, ...posOf(ic.key, i) }))
      const curKey = [...selected].slice(-1)[0]
      const curIdx = arr.findIndex((a) => a.key === curKey)
      let target: { key: string } | null = null
      if (curIdx < 0) {
        target = arr[0]
      } else {
        const c = arr[curIdx]
        if (k === 'ArrowRight') target = arr.filter((a) => a.x > c.x + 10 && a.y > c.y - 40).sort((a, b) => (b.y - a.y) + (b.x - a.x) * 2)[0] ?? arr.slice(curIdx + 1)[0] ?? null
        else if (k === 'ArrowLeft') target = arr.filter((a) => a.x < c.x - 10 && a.y > c.y - 40).sort((a, b) => (b.y - a.y) + (b.x - a.x) * 2)[0] ?? arr.slice(0, curIdx).slice(-1)[0] ?? null
        else if (k === 'ArrowDown') target = arr.filter((a) => a.y > c.y + 10 && a.x > c.x - 60).sort((a, b) => (b.y - a.y) + (b.x - a.x) * 2)[0] ?? arr.slice(curIdx + 1)[0] ?? null
        else if (k === 'ArrowUp') target = arr.filter((a) => a.y < c.y - 10 && a.x > c.x - 60).sort((a, b) => (b.y - a.y) + (b.x - a.x) * 2)[0] ?? arr.slice(0, curIdx).slice(-1)[0] ?? null
      }
      if (target) {
        if (e.ctrlKey || e.shiftKey) setSelected((prev) => new Set([...prev, target!.key]))
        else setSelected(new Set([target.key]))
      }
    }
  }

  /* 全局 F5 → 桌面刷新（清空选择 + 视觉反馈） */
  useEffect(() => {
    const h = () => {
      setSelected(new Set())
      setRenaming(null)
      setRefreshBlink(true)
      setTimeout(() => setRefreshBlink(false), 300)
    }
    window.addEventListener('xp-desktop-refresh', h)
    return () => window.removeEventListener('xp-desktop-refresh', h)
  }, [])

  /* 拖拽结束：清理高亮 */
  const clearDropState = () => {
    setDropTargetKey(null)
    setDropCell(null)
    /* 拖拽后抑制一次 click —— 防止拖放结束的 click 误触发延迟重命名 */
    justDraggedRef.current = true
    setTimeout(() => { justDraggedRef.current = false }, 60)
  }

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 overflow-hidden xp-desktop outline-none ${refreshBlink ? 'xp-desktop-refreshing' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      style={bg}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onBgPointerDown(e)
      }}
      onPointerMove={onBgPointerMove}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget) onBgPointerUp(e)
      }}
      onDragOver={onBgDragOver}
      onDragLeave={clearDropState}
      onDrop={onBgDrop}
      onDragEnd={clearDropState}
      onContextMenu={(e) => {
        e.preventDefault()
        if (e.target === e.currentTarget) openCtx(e.clientX, e.clientY, desktopCtx)
      }}
    >
      {/* 图标（绝对定位 + HTML5 拖拽：实时鬼影跟随、多选拖动、拖入文件夹/回收站） */}
      {icons.map((ic, i) => {
        const Icon = ic.icon
        const isSel = selected.has(ic.key)
        const p = posOf(ic.key, i)
        const isRenaming = renaming?.name === ic.label
        const isDropTarget = (dropTargetKey === ic.key || rdTarget === ic.key) && !!dropTargetOf(ic)
        return (
          <div
            key={ic.key}
            data-desk={ic.key}
            className={`xp-desk-icon absolute w-[76px] flex flex-col items-center gap-[3px] rounded-[2px] p-[2px] select-none ${isDropTarget ? 'xp-desk-drop' : ''}`}
            style={{ left: p.x, top: p.y }}
            draggable={!isRenaming && !autoArrange}
            onDragStart={(e) => onIconDragStart(e, ic)}
            onDragEnd={clearDropState}
            onDragOver={(e) => onIconDragOver(e, ic)}
            onDragLeave={() => setDropTargetKey((k) => (k === ic.key ? null : k))}
            onDrop={(e) => onIconDrop(e, ic)}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (e.button === 2) {
                /* 右键拖放装填（XP：按住右键拖动文件）；contextmenu 由全局拦截 */
                if (!renaming && ic.key.startsWith('file:')) {
                  const sel = selected.has(ic.key) ? selected : new Set([ic.key])
                  if (!selected.has(ic.key)) setSelected(sel)
                  rdBlockRef.current = true
                  rdRef.current = { x: e.clientX, y: e.clientY, started: false, keys: [...sel], ghost: null }
                }
                return
              }
              if (e.button !== 0) return
              if (!isSel) setSelected(new Set([ic.key]))
              rootRef.current?.focus()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (e.button !== 0 || justDraggedRef.current) return
              /* XP 延迟双击重命名：选中 ≥500ms 后再单击同一桌面文件 → 内联重命名 */
              if (
                isSel &&
                !renaming &&
                ic.key.startsWith('file:') &&
                Date.now() - selAtRef.current >= 500
              ) {
                setRenaming({ name: ic.label, value: ic.label })
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (renaming) return
              playClick()
              ic.open()
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isSel) setSelected(new Set([ic.key]))
              openCtx(e.clientX, e.clientY, itemMenu(ic))
            }}
          >
            <span className={`${isSel || isDropTarget ? 'xp-icon-sel' : ''} rounded-[2px] flex items-center justify-center p-[1px]`}>
              <Icon size={iconSize} />
            </span>
            {isRenaming ? (
              <input
                autoFocus
                className="xp-sunken bg-white text-[12px] px-[2px] w-[74px] outline-none h-[18px]"
                value={renaming.value}
                onChange={(e) => setRenaming({ ...renaming, value: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    setRenaming(null)
                    return
                  }
                  /* IME 安全回车：中文文件名组态确认回车直接提交改名 */
                  imeEnter(e, (v) => {
                    const r = fsRename([...DESKTOP_PATH, renaming.name], v)
                    if (r) playClick()
                    setRenaming(null)
                  })
                }}
                onBlur={() => setRenaming(null)}
                onPointerDown={(e) => e.stopPropagation()}
                spellCheck={false}
              />
            ) : (
              <span
                className={`xp-desk-label ${isSel ? 'is-sel' : ''} text-white text-[12px] leading-[14px] px-[2px] rounded-[2px] text-center [overflow-wrap:anywhere] line-clamp-2 ${isSel ? 'bg-[#0a5ec8]/85' : ''}`}
                style={{ textShadow: isSel ? 'none' : '1px 1px 2px rgba(0,0,0,0.55)' }}
              >
                {ic.label}
              </span>
            )}
          </div>
        )
      })}

      {/* 拖拽落点网格预览（XP 吸附提示） */}
      {dropCell ? (
        <div
          className="absolute pointer-events-none rounded-[2px] border-2 border-dashed border-white/70 bg-white/15"
          style={{ left: dropCell.x, top: dropCell.y, width: 72, height: iconSize + 34 }}
        />
      ) : null}

      {/* 框选矩形 */}
      {marquee ? (
        <div
          className="absolute border border-dotted border-[#4a7fd0] bg-[#5a9af0]/20 pointer-events-none"
          style={{
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          }}
        />
      ) : null}
    </div>
  )
}
