'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP, type CtxItem } from '../store'
import { FS, resolvePath, displayPath, pathKey, formatBytes, countStats, stripExt, typeOf, myDocsPath, type FSNode } from '../fs'
import { FolderIcon, HardDriveIcon, CDDriveIcon, FloppyDriveIcon, IEIcon, RecycleBinIcon, MyDocumentsIcon, NetworkIcon } from '../icons'
import { TextFileIcon, ImageFileIcon, ExeFileIcon, CalculatorIcon, NotepadIcon, PaintIcon, MineIcon, WMPIcon, CmdIcon, TaskManagerIcon, ShortcutBadge } from '../app-icons'
import { Bmp } from '../bmp'
import { MenuBar, TaskPanel } from '../ui'
import { playClick, playRecycle } from '../sounds'
import { openEditCtx, rightDragMenu, sendToItems, openWithItems } from '../ctx-menus'
import { imeEnter } from '../ime-keys'
import { PROGRAMS } from './OpenWith'

function nodeIcon(n: FSNode, size: number, fsTree?: FSNode) {
  const map: Record<string, React.FC<{ size?: number }>> = {
    folder: (p) => (n.icon === 'pictures' ? <FolderIcon size={p.size} variant="pictures" /> : n.icon === 'music' ? <FolderIcon size={p.size} variant="music" /> : n.icon === 'shared' ? <Bmp name="folder-shared" size={p.size} /> : <FolderIcon size={p.size} />),
    hd: HardDriveIcon,
    cd: CDDriveIcon,
    floppy: FloppyDriveIcon,
    text: TextFileIcon,
    image: ImageFileIcon,
    bmp: ImageFileIcon,
    audio: WMPIcon,
    exe: ExeFileIcon,
    font: (p) => <Bmp name="fontfile" size={p.size} />,
    doc: (p) => <Bmp name="docfile" size={p.size} />,
    shared: (p) => <Bmp name="folder-shared" size={p.size} />,
    zip: (p) => <Bmp name="zipfile" size={p.size} />,
    shortcut: (p) => {
      const target = n.shortcutTo && fsTree ? resolvePath(n.shortcutTo, fsTree) : null
      const tk = target?.icon ?? 'text'
      const Comp = map[tk] ?? TextFileIcon
      return (
        <span className="relative inline-flex" style={{ width: p.size, height: p.size }}>
          <Comp size={p.size} />
          <ShortcutBadge size={Math.round((p.size ?? 32) * 0.5)} />
        </span>
      )
    },
  }
  const Comp = map[n.icon ?? 'folder'] ?? FolderIcon
  return <Comp size={size} />
}

const APP_FILE_ICON: Record<string, React.FC<{ size?: number }>> = {
  ie: IEIcon,
  notepad: NotepadIcon,
  paint: PaintIcon,
  calc: CalculatorIcon,
  minesweeper: MineIcon,
  wmp: WMPIcon,
  cmd: CmdIcon,
  taskmgr: TaskManagerIcon,
  explorer: FolderIcon,
  regedit: (p) => <Bmp name="regedit" size={p.size} />,
}

const DND_MIME = 'application/x-xp-paths'

function fmtDate(iso?: string): string {
  if (!iso) return '2001-10-25 10:00'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* 组头行（XP：粗体 + 展开箭头 + 贯穿分隔线；按组排列用） */
function GroupHead({ text }: { text: string }) {
  return (
    <div data-nomarq data-group={text} className="w-full flex items-end h-[21px] mt-[4px] px-[3px] select-none">
      <svg width="9" height="9" viewBox="0 0 9 9" className="mb-[4px] mr-[5px] shrink-0"><path d="M2 1 L7.5 4.5 L2 8 Z" fill="#5a5a5a" /></svg>
      <span className="text-[11px] font-bold text-[#3a3a3a] border-b border-[#b8b4a2] pb-[3px] w-full">{text}</span>
    </div>
  )
}

export default function Explorer({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const fsTree = useXP((s) => s.fsTree)
  const recycleBin = useXP((s) => s.recycleBin)
  const clipboard = useXP((s) => s.clipboard)
  const fsDelete = useXP((s) => s.fsDelete)
  const fsRestore = useXP((s) => s.fsRestore)
  const fsRemoveRecycle = useXP((s) => s.fsRemoveRecycle)
  const fsEmptyRecycle = useXP((s) => s.fsEmptyRecycle)
  const fsRename = useXP((s) => s.fsRename)
  const fsPaste = useXP((s) => s.fsPaste)
  const fsCreateFolder = useXP((s) => s.fsCreateFolder)
  const fsCreateFile = useXP((s) => s.fsCreateFile)
  const fsCreateShortcut = useXP((s) => s.fsCreateShortcut)
  const setClipboard = useXP((s) => s.setClipboard)
  const fsMove = useXP((s) => s.fsMove)
  const showToast = useXP((s) => s.showToast)
  /* 文件夹选项联动设置（XP「工具→文件夹选项」） */
  const hideFileExt = useXP((s) => s.hideFileExt)
  const showHiddenFiles = useXP((s) => s.showHiddenFiles)
  const showSystemFiles = useXP((s) => s.showSystemFiles)
  const showCommonTasks = useXP((s) => s.showCommonTasks)

  const initial = (win.props.path as string[]) ?? []
  const [path, setPath] = useState<string[]>(initial)
  const [history, setHistory] = useState<string[][]>([initial])
  const [hIndex, setHIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'tiles' | 'icons' | 'list' | 'details' | 'thumbnails' | 'filmstrip'>('tiles')
  /* 用户手动改过视图后不再跟随文件夹模板（XP「记住每个文件夹的视图设置」） */
  const viewTouchedRef = useRef(false)
  /* 幻灯片旋转角度（会话内有效，key=图片名） */
  const [rot, setRot] = useState<Record<string, number>>({})
  const [rename, setRename] = useState<{ name: string; value: string } | null>(null)
  /* 延迟双击重命名：记录选中发生的时刻（XP —— 选中后 ≥500ms 再单击同一项进入内联重命名） */
  const selAtRef = useRef(0)
  useEffect(() => { selAtRef.current = Date.now() }, [selected])
  const [addrText, setAddrText] = useState('')
  const [editingAddr, setEditingAddr] = useState(false)
  const [dropHover, setDropHover] = useState<string | null>(null)
  /* 详细信息视图：列排序 + 列宽 */
  const [sortCol, setSortCol] = useState<'name' | 'size' | 'type' | 'modified'>('name')
  const [sortAsc, setSortAsc] = useState(true)
  /* 按组排列（XP SP2「Show in Groups」）：按当前排序列分组渲染 */
  const [groupBy, setGroupBy] = useState(false)
  const [colW, setColW] = useState({ name: 190, size: 70, type: 110 })
  /* 文件列表框选 */
  const [marq, setMarq] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const marqRef = useRef<{ x: number; y: number } | null>(null)
  /* 框选结束后浏览器还会在容器上补发 click，抑制一次避免清空刚选中的内容 */
  const suppressClickRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const addrBoxRef = useRef<HTMLDivElement>(null)
  /* 右键拖放（XP：按住右键拖文件到文件夹/空白处 → 释放弹菜单） */
  const rdRef = useRef<{ x: number; y: number; started: boolean; names: string[]; ghost: HTMLDivElement | null } | null>(null)
  const rdBlockRef = useRef(false)
  const [rdHover, setRdHover] = useState<string | null>(null)
  /* 最新 itemMenu 引用 */
  const itemMenuRef = useRef<(n: FSNode) => CtxItem[]>(null as unknown as (n: FSNode) => CtxItem[])

  /* F5 / 全局刷新事件 → 清空选择并重新聚焦（视图本身随 fsTree 实时更新） */
  useEffect(() => {
    const h = (ev: Event) => {
      const d = (ev as CustomEvent).detail
      if (d?.id !== undefined && d.id !== win.id) return
      setSelected([])
      setRename(null)
      rootRef.current?.focus()
    }
    window.addEventListener('xp-app-refresh', h)
    return () => window.removeEventListener('xp-app-refresh', h)
  }, [win.id])

  const isRecycle = path[0] === '回收站'
  const isNetwork = path[0] === '网上邻居'

  const node = useMemo(() => {
    if (isRecycle || isNetwork) return null
    return resolvePath(path, fsTree)
  }, [path, fsTree, isRecycle, isNetwork])

  const items: Array<FSNode & { _recycleKey?: string; _origKey?: string }> = useMemo(() => {
    if (isRecycle) {
      return recycleBin.map((r) => ({ ...r.node, _recycleKey: r.key, _origKey: r.origKey }))
    }
    if (isNetwork) {
      return [
        { name: '整个网络', kind: 'folder' as const, children: [] },
      ]
    }
    /* 隐藏/系统文件过滤（XP「文件夹选项→查看」真实联动；系统文件独立受系统开关控制） */
    return (node?.children ?? []).filter((c) => {
      if (c.system) return showSystemFiles
      if (c.hidden) return showHiddenFiles
      return true
    })
  }, [isRecycle, isNetwork, recycleBin, node, showHiddenFiles, showSystemFiles])

  /* 排序后的显示列表（XP：名称/大小/时间排序时 驱动器/文件夹恒在文件之前） */
  const sortedItems = useMemo(() => {
    const rank = (n: FSNode) => (n.kind === 'drive' ? 0 : n.kind === 'folder' ? 1 : 2)
    const sizeVal = (n: FSNode) => {
      if (n.kind === 'folder' || n.kind === 'drive') return -1
      const m = /([\d.]+)\s*(KB|MB|GB|B)/.exec(n.size ?? '')
      if (!m) return 0
      const mult = m[2] === 'GB' ? 1e6 : m[2] === 'MB' ? 1e3 : m[2] === 'KB' ? 1 : 0.001
      return parseFloat(m[1]) * mult
    }
    const dir = sortAsc ? 1 : -1
    return [...items].sort((a, b) => {
      /* XP「排列图标→类型」：纯类型描述字符串比较，文件夹/驱动器不强制置顶
       * （中文 XP 拼音序「文本文档」先于「文件夹」→ C:\ 里 boot.ini 会排到最前）
       * 回收站「类型」列实为「原位置」→ 按原路径排序，与分组口径一致 */
      if (sortCol === 'type') {
        const tv = (n: FSNode & { _origKey?: string }) => (isRecycle ? (n._origKey ?? '未知') : typeOf(n))
        return (tv(a).localeCompare(tv(b), 'zh') || a.name.localeCompare(b.name, 'zh')) * dir
      }
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      let cmp = 0
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name, 'zh')
      else if (sortCol === 'size') cmp = sizeVal(a) - sizeVal(b)
      else cmp = new Date(a.modified ?? 0).getTime() - new Date(b.modified ?? 0).getTime()
      return cmp * dir
    })
  }, [items, sortCol, sortAsc, isRecycle])

  const toggleSort = (col: 'name' | 'size' | 'type' | 'modified') => {
    if (sortCol === col) setSortAsc((v) => !v)
    else {
      setSortCol(col)
      setSortAsc(true)
    }
    playClick()
  }

  /* ── 文件夹模板：图片文件夹（含 ≥1 张图片）→ XP 默认幻灯片视图 ── */
  const pictures = useMemo(
    () => items.filter((i) => (i.icon === 'image' || i.icon === 'bmp') && i.src),
    [items],
  )
  const isPictureFolder = !isRecycle && !isNetwork && pictures.length > 0
  /* 未手动改过视图 → 导航时跟随文件夹模板（图片→幻灯片/其余→平铺） */
  useEffect(() => {
    if (!viewTouchedRef.current) setViewMode(isPictureFolder ? 'filmstrip' : 'tiles')
  }, [isPictureFolder, path])
  const changeView = (m: 'tiles' | 'icons' | 'list' | 'details' | 'thumbnails' | 'filmstrip') => {
    viewTouchedRef.current = true
    setViewMode(m)
    playClick()
  }

  /* ── zip 原生压缩文件夹（XP：双击进入，任务窗格提供提取） ── */
  /* 浏览 zip 内部：当前节点即压缩文件夹（path 终点 icon=zip 且含 children） */
  const inZip = node?.icon === 'zip' && Array.isArray(node.children)
  const extractZipTo = useCallback(
    (zipPath: string[]) => {
      const st = useXP.getState()
      const zipNode = resolvePath(zipPath, st.fsTree)
      const childPaths = (zipNode?.children ?? []).map((c) => [...zipPath, c.name])
      if (childPaths.length === 0) {
        showToast('此压缩文件夹是空的')
        return
      }
      const dest = zipPath.slice(0, -1)
      st.setClipboard('copy', childPaths)
      st.fsPaste(dest)
      showToast(`已将 ${childPaths.length} 个项目提取到 ${dest.length ? dest[dest.length - 1] : '当前文件夹'}`)
      playClick()
    },
    [showToast],
  )

  /* 显示名（XP「隐藏已知文件类型的扩展名」真实联动；重命名输入仍显示全名） */
  const dispName = useCallback(
    (n: FSNode) => (hideFileExt && n.kind === 'file' ? stripExt(n.name) : n.name),
    [hideFileExt],
  )

  /* ── 按组排列：按当前排序列分组（XP SP2；组头带数量，XP 样式）── */
  const groups = useMemo(() => {
    if (!groupBy) return null
    type Row = FSNode & { _recycleKey?: string; _origKey?: string }
    const sizeBucket = (n: Row) => {
      if (n.kind === 'folder' || n.kind === 'drive') return '无'
      const m = /([\d.,]+)\s*(KB|MB|GB|B)/.exec(n.size ?? '')
      if (!m) return '无'
      const kb = parseFloat(m[1].replace(/,/g, '')) * (m[2] === 'GB' ? 1e6 : m[2] === 'MB' ? 1e3 : m[2] === 'KB' ? 1 : 0.001)
      if (kb <= 0) return '无'
      if (kb <= 16) return '微小'
      if (kb <= 1024) return '小'
      if (kb <= 131072) return '中'
      return '巨大'
    }
    const dateBucket = (n: Row) => {
      const t = n.modified ? new Date(n.modified).getTime() : 0
      if (!t) return '未知'
      const nowD = new Date()
      const startToday = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate()).getTime()
      const day = 864e5
      if (t >= startToday) return '今天'
      if (t >= startToday - day) return '昨天'
      if (t >= startToday - 7 * day) return '本周'
      if (t >= startToday - 14 * day) return '上周'
      if (t >= startToday - 31 * day) return '一个月前'
      return '很久以前'
    }
    const keyOf = (n: Row) => {
      if (sortCol === 'name') return (dispName(n).trim()[0] ?? '?').toUpperCase()
      if (sortCol === 'size') return sizeBucket(n)
      if (sortCol === 'modified') return dateBucket(n)
      return isRecycle ? (n._origKey ?? '未知') : typeOf(n)
    }
    const map = new Map<string, Row[]>()
    for (const n of sortedItems) {
      const k = keyOf(n)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(n)
    }
    const colLabel =
      sortCol === 'name' ? '名称'
      : sortCol === 'size' ? '大小'
      : sortCol === 'modified' ? (isRecycle ? '删除日期' : '修改时间')
      : (isRecycle ? '原位置' : '类型')
    return [...map.entries()].map(([k, items]) => ({ head: `${colLabel}: ${k} (${items.length})`, items }))
  }, [groupBy, sortCol, sortedItems, isRecycle, dispName])

  /* 表头排序列（升/降箭头指示） */
  const sortArrow = (col: string) =>
    sortCol === col ? (
      <span className="text-[#4a6a9a] ml-[2px]">{sortAsc ? '▲' : '▼'}</span>
    ) : null

  const navigate = useCallback(
    (p: string[]) => {
      setPath(p)
      setSelected([])
      setRename(null)
      const h = history.slice(0, hIndex + 1)
      h.push(p)
      setHistory(h)
      setHIndex(h.length - 1)
      const title = p.length === 0 ? '我的电脑' : p[0] === '回收站' ? '回收站' : p[p.length - 1] === 'My Documents' ? '我的文档' : p[p.length - 1]
      setWindowTitle(win.id, title)
    },
    [history, hIndex, setWindowTitle, win.id],
  )

  /* ── 打开 ── */
  const openItem = (n: FSNode & { _recycleKey?: string }) => {
    /* 快捷方式：解析目标后按目标类型打开 */
    if (n.shortcutTo) {
      const target = resolvePath(n.shortcutTo, fsTree)
      if (!target) {
        openApp('dialog', { kind: 'error', title: n.name, text: `无法找到 ${n.name}。\n该快捷方式指向的目标已被删除或移动。` })
        return
      }
      openItem({ ...target })
      return
    }
    if (n.error) {
      openApp('dialog', { kind: 'error', title: n.name, text: n.error })
      return
    }
    if (n.kind === 'drive' || n.kind === 'folder') {
      /* 特殊外壳文件夹（Fonts/Tasks）→ 打开专用视图（XP shell folder 行为） */
      if (n.appId) { openApp(n.appId, {}, n.name === 'Fonts' ? 'Fonts' : n.name === 'Tasks' ? 'Tasks' : n.name) }
      else navigate([...path, n.name])
      return
    }
    if (n.icon === 'font') {
      useXP.getState().pushRecentDoc([...path, n.name])
      openApp('fontview', { font: n.name })
      return
    }
    if (n.icon === 'doc') {
      useXP.getState().pushRecentDoc([...path, n.name])
      openApp('wordpad', { fileName: n.name, content: n.content ?? '' })
      return
    }
    if (n.appId) {
      openApp(n.appId, { fileName: n.name, content: n.content, src: n.src })
      return
    }
    /* 「打开方式→始终使用」写入的扩展级关联优先（XP 真实语义） */
    const dotAt = n.name.lastIndexOf('.')
    const assoc = dotAt > 0 ? useXP.getState().extAssoc[n.name.slice(dotAt + 1).toLowerCase()] : undefined
    if (assoc) {
      const prog = PROGRAMS.find((p) => p.id === assoc)
      if (prog) {
        useXP.getState().pushRecentDoc([...path, n.name])
        prog.open({ name: n.name, content: n.content, src: n.src }, path)
        return
      }
    }
    if (n.icon === 'text') {
      useXP.getState().pushRecentDoc([...path, n.name])
      openApp('notepad', { fileName: n.name, content: n.content ?? '', parentPath: path })
      return
    }
    if (n.icon === 'image' || n.icon === 'bmp') {
      useXP.getState().pushRecentDoc([...path, n.name])
      const images = items.filter((i) => i.icon === 'image' || i.icon === 'bmp')
      const index = images.findIndex((i) => i.name === n.name)
      openApp('imgviewer', { parentPath: path, name: n.name, index: Math.max(0, index) })
      return
    }
    if (n.icon === 'audio') {
      useXP.getState().pushRecentDoc([...path, n.name])
      openApp('wmp', { track: n.name })
      return
    }
    if (n.icon === 'zip') {
      /* XP 原生压缩文件夹：双击进入内部浏览（只读视图 + 提取任务窗格） */
      useXP.getState().pushRecentDoc([...path, n.name])
      navigate([...path, n.name])
      return
    }
    /* 双击无关联文件 → XP「打开方式」对话框（Web 服务 / 从列表选择） */
    openApp('openwith', { parentPath: path, name: n.name, mode: 'unknown' }, '打开方式')
  }

  /* ── 删除（进回收站） ── */
  const deleteSelected = useCallback(() => {
    if (isRecycle) {
      /* 回收站内：永久删除（询问） */
      const keys = selected.map((s) => recycleBin.find((r) => r.name === s)?.key).filter(Boolean) as string[]
      if (keys.length) {
        openApp('dialog', {
          kind: 'confirm',
          title: '确认文件删除',
          text: `确实要永久删除这 ${keys.length} 个项目吗？`,
          onYes: () => {
            keys.forEach((k) => fsRemoveRecycle(k))
            setSelected([])
            playClick()
          },
        })
      }
      return
    }
    if (selected.length === 0 || path.length === 0) return
    const paths = selected.map((name) => [...path, name])
    const label = selected.length === 1 ? `"${selected[0]}"` : `这 ${selected.length} 个项目`
    openApp('dialog', {
      kind: 'confirm',
      title: '确认文件删除',
      text: `确实要把 ${label} 放入回收站吗？`,
      onYes: () => {
        fsDelete(paths)
        setSelected([])
        playClick()
      },
    })
  }, [isRecycle, selected, recycleBin, path, openApp, fsRemoveRecycle, fsDelete])

  /* ── 剪贴板 ── */
  const doCopy = useCallback(() => {
    if (isRecycle || selected.length === 0) return
    setClipboard('copy', selected.map((name) => [...path, name]))
    showToast(`已复制 ${selected.length} 个项目`)
  }, [isRecycle, selected, path, setClipboard, showToast])

  const doCut = useCallback(() => {
    if (isRecycle || selected.length === 0) return
    setClipboard('cut', selected.map((name) => [...path, name]))
    showToast(`已剪切 ${selected.length} 个项目`)
  }, [isRecycle, selected, path, setClipboard, showToast])

  const doPaste = useCallback(() => {
    if (isRecycle || isNetwork || !clipboard || path.length === 0) return
    if (pathKey(path) === clipboard.paths[0]?.slice(0, -1).join('/') && clipboard.op === 'cut') return
    fsPaste(path)
    playClick()
  }, [isRecycle, isNetwork, clipboard, path, fsPaste])

  /* ── 列宽拖动（详细信息视图表头） ── */
  const colResizeRef = useRef<{ col: 'name' | 'size' | 'type'; sx: number; w: number } | null>(null)
  const startColResize = (e: React.PointerEvent, col: 'name' | 'size' | 'type') => {
    e.stopPropagation()
    e.preventDefault()
    colResizeRef.current = { col, sx: e.clientX, w: colW[col] }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* 合成事件无活动指针 */
    }
  }
  const onColResizeMove = (e: React.PointerEvent) => {
    const r = colResizeRef.current
    if (!r) return
    const nw = Math.max(40, r.w + e.clientX - r.sx)
    setColW((c) => ({ ...c, [r.col]: nw }))
  }
  const endColResize = () => {
    colResizeRef.current = null
  }

  const colHandle = (col: 'name' | 'size' | 'type') => (
    <span
      className="absolute right-[-2px] top-0 h-full w-[5px] cursor-col-resize hover:bg-[#2a7ac8]/50"
      onPointerDown={(e) => startColResize(e, col)}
      onPointerMove={onColResizeMove}
      onPointerUp={endColResize}
    />
  )

  /* ── 拖放 ── */
  const onDragStart = (e: React.DragEvent, name: string) => {
    const names = selected.includes(name) ? selected : [name]
    e.dataTransfer.setData(DND_MIME, JSON.stringify(names.map((n) => [...path, n])))
    e.dataTransfer.effectAllowed = 'move'
  }

  /* 修饰键对应光标效果（Ctrl=复制 +、Ctrl+Shift/Alt=链接箭头、默认=移动） */
  const dropEffectFor = (e: React.DragEvent): 'copy' | 'link' | 'move' => ((e.ctrlKey && e.shiftKey) || e.altKey ? 'link' : e.ctrlKey ? 'copy' : 'move')

  const onDropOn = (e: React.DragEvent, destPath: string[]) => {
    e.preventDefault()
    e.stopPropagation()
    setDropHover(null)
    if (isRecycle || isNetwork) return
    const raw = e.dataTransfer.getData(DND_MIME)
    if (!raw) return
    const paths = JSON.parse(raw) as string[][]
    /* XP 左键拖放修饰键：Ctrl+Shift/Alt=创建快捷方式、Ctrl=强制复制、Shift/无=移动 */
    if ((e.ctrlKey && e.shiftKey) || e.altKey) {
      paths.forEach((p) => fsCreateShortcut(destPath, p))
      showToast(`已在 "${destPath[destPath.length - 1]}" 创建 ${paths.length} 个快捷方式`)
      playClick()
      return
    }
    if (e.ctrlKey) {
      setClipboard('copy', paths)
      fsPaste(destPath)
      showToast(`已复制 ${paths.length} 个项目到 "${destPath[destPath.length - 1]}"`)
      playClick()
      return
    }
    fsMove(paths, destPath)
    playClick()
  }

  /* ── 键盘（资源管理器完整键位） ── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (rename) return
    if (e.key === 'Delete') {
      e.preventDefault()
      if (e.shiftKey && !isRecycle && selected.length > 0) {
        /* Shift+Delete = 永久删除（不进回收站，XP 经典） */
        openApp('dialog', {
          kind: 'confirm',
          title: '确认文件删除',
          text: `确实要永久删除这 ${selected.length} 个项目吗？\n（按住 Shift 删除将绕过回收站）`,
          onYes: () => { useXP.getState().fsDeletePermanent(selected.map((n) => [...path, n])); setSelected([]); playClick() },
        })
        return
      }
      deleteSelected()
    } else if (e.key === 'F2') {
      e.preventDefault()
      if (selected.length === 1) setRename({ name: selected[0], value: selected[0] })
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      doCopy()
    } else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
      doCut()
    } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
      doPaste()
    } else if (e.ctrlKey && e.key.toLowerCase() === 'a' && !isRecycle) {
      /* Ctrl+A 全选 */
      e.preventDefault()
      setSelected(items.map((i) => i.name))
    } else if (e.ctrlKey && e.key.toLowerCase() === 'd' && !isRecycle) {
      /* Ctrl+D 删除（XP 习惯） */
      e.preventDefault()
      deleteSelected()
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      if (path.length > 0) navigate(path.slice(0, -1))
    } else if (e.key === 'Enter' && e.altKey && selected.length >= 1) {
      /* Alt+Enter = 属性 */
      e.preventDefault()
      const n = items.find((i) => i.name === selected[selected.length - 1])
      if (n) openProps(n)
    } else if (e.key === 'Enter' && selected.length === 1) {
      e.preventDefault()
      const n = items.find((i) => i.name === selected[0])
      if (n) openItem(n)
    } else if (e.key === 'Enter' && selected.length > 1 && !isRecycle) {
      e.preventDefault()
      selected.forEach((name) => {
        const n = items.find((i) => i.name === name)
        if (n && (n.kind === 'folder' || n.kind === 'drive')) openItem(n)
      })
    } else if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && selected.length >= 1) {
      /* 菜单键 / Shift+F10 → 选中项菜单（定位到该项右侧，XP 行为） */
      e.preventDefault()
      const n = items.find((i) => i.name === selected[selected.length - 1])
      if (n) {
        const el = listRef.current?.querySelector(`[data-item="${CSS.escape(n.name)}"]`) as HTMLElement | null
        const r = el?.getBoundingClientRect()
        const x = r ? r.right + 2 : win.x + 140
        const y = r ? r.top + 8 : win.y + 140
        useXP.getState().openCtx(x, y, itemMenu(n))
      }
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      /* 菜单键且无选中 → 背景菜单（定位到列表区域左上） */
      e.preventDefault()
      const r = listRef.current?.getBoundingClientRect()
      useXP.getState().openCtx(r ? r.left + 90 : win.x + 130, r ? r.top + 50 : win.y + 110, bgMenu)
    } else if (e.key.startsWith('Arrow') && items.length > 0) {
      /* 方向键在网格内移动选择 */
      e.preventDefault()
      const cols = Math.max(1, Math.floor((win.w - 60) / 92))
      const idx = items.findIndex((i) => i.name === selected[selected.length - 1])
      let ni = idx
      if (e.key === 'ArrowRight') ni = idx < 0 ? 0 : Math.min(items.length - 1, idx + 1)
      else if (e.key === 'ArrowLeft') ni = idx < 0 ? 0 : Math.max(0, idx - 1)
      else if (e.key === 'ArrowDown') ni = idx < 0 ? 0 : Math.min(items.length - 1, idx + cols)
      else if (e.key === 'ArrowUp') ni = idx < 0 ? 0 : Math.max(0, idx - cols)
      if (ni >= 0 && items[ni]) {
        if (e.ctrlKey) setSelected((prev) => (prev.includes(items[ni].name) ? prev : [...prev, items[ni].name]))
        else if (e.shiftKey) {
          const [a, b] = idx < ni ? [Math.max(0, idx), ni] : [ni, Math.max(0, idx)]
          setSelected(items.slice(a, b + 1).map((i) => i.name))
        } else setSelected([items[ni].name])
      }
    }
  }

  /* ── 右键菜单 ── */
  const itemMenu = (n: FSNode & { _recycleKey?: string; _origKey?: string }): CtxItem[] => {
    if (isRecycle) {
      return [
        { label: '还原', bold: true, onClick: () => { fsRestore(n._recycleKey); playClick() } },
        { label: '删除', onClick: () => { fsRemoveRecycle(n._recycleKey!); playClick() } },
        { separator: true },
        { label: '属性', onClick: () => openProps(n) },
      ]
    }
    /* 驱动器菜单（真实 XP：打开/资源管理器/搜索/共享和安全/格式化/属性） */
    if (n.kind === 'drive') {
      const driveLetter = (n.name.match(/\(([A-Z]:)\)/) ?? [null, 'C:'])[1] as string
      const ready = !n.error
      const openDriveProps = () => {
        if (!ready) {
          openApp('dialog', { kind: 'error', title: n.name, text: `${n.error}` })
          return
        }
        openApp('driveprops', { drive: driveLetter }, `${n.name} 属性`)
      }
      return [
        { label: '打开(O)', bold: true, onClick: () => openItem(n) },
        { label: '资源管理器(X)', onClick: () => openItem(n) },
        { label: '搜索(E)...', onClick: () => openApp('search', {}, '搜索结果') },
        { separator: true },
        {
          label: '共享和安全(H)...',
          onClick: () => {
            if (driveLetter === 'C:') openDriveProps()
            else openApp('dialog', { kind: 'info', title: n.name, text: `${n.name}\n\n共享选项只对本地磁盘可用。软盘和 CD 驱动器不支持共享。` })
          },
        },
        { label: '格式化(A)...', onClick: () => openApp('format', { drive: driveLetter }, `格式化 ${n.name}`) },
        { separator: true },
        { label: '属性(R)', onClick: openDriveProps },
      ]
    }
    const isFolder = n.kind === 'folder'
    return [
      /* XP 原生：zip 右键首项「全部提取」 */
      ...(n.icon === 'zip' ? [{ label: '全部提取(A)...', bold: true, onClick: () => extractZipTo([...path, n.name]) }] : []),
      { label: '打开(O)', bold: true, disabled: !isFolder && !n.appId && n.icon !== 'text' && n.icon !== 'image' && n.icon !== 'bmp' && n.icon !== 'audio' && n.icon !== 'zip', onClick: () => openItem(n) },
      ...(isFolder ? [{ label: '资源管理器(E)', onClick: () => openItem(n) }] : []),
      ...(n.kind === 'file' ? [{ label: '打开方式(H)', submenu: openWithItems(path, n.name, n.icon) }] : []),
      ...(n.kind === 'file' || n.kind === 'folder'
        ? [
            { separator: true },
            { label: '发送到(N)', submenu: sendToItems(path, n.name) },
          ]
        : []),
      { separator: true },
      { label: '剪切(T)', onClick: () => { setClipboard('cut', [[...path, n.name]]); showToast(`已剪切 "${n.name}"`) } },
      { label: '复制(C)', onClick: () => { setClipboard('copy', [[...path, n.name]]); showToast(`已复制 "${n.name}"`) } },
      { separator: true },
      { label: '创建快捷方式(S)', onClick: () => {
          const name = fsCreateShortcut(path, [...path, n.name])
          setSelected([name])
          playClick()
        } },
      { label: '删除(D)', onClick: () => { setSelected([n.name]); setTimeout(() => deleteSelected(), 0) } },
      { label: '重命名(M)', onClick: () => setRename({ name: n.name, value: n.name }) },
      { separator: true },
      { label: '属性(R)', onClick: () => openProps(n) },
    ]
  }

  /* itemMenu 每次渲染重建 → ref 同步给右键拖放监听器 */
  useEffect(() => { itemMenuRef.current = itemMenu })

  /* ── 右键拖放（XP 经典）：按住右键拖文件到文件夹行/列表空白处 → 释放弹菜单 ── */
  useEffect(() => {
    const resolveAt = (x: number, y: number): { name: string } | { bg: true } | null => {
      const el = document.elementFromPoint(x, y)
      if (!el) return null
      const row = el.closest('[data-item]') as HTMLElement | null
      if (row) {
        const name = row.getAttribute('data-item') ?? ''
        const it = items.find((i) => i.name === name)
        if (it && it.kind === 'folder') return { name }
        return null
      }
      if (listRef.current && listRef.current.contains(el)) return { bg: true }
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
        rd.names.slice(0, 4).forEach((nm) => {
          const src = listRef.current?.querySelector(`[data-item="${CSS.escape(nm)}"] :is(svg,img)`) as HTMLElement | null
          if (!src) return
          const c = src.cloneNode(true) as HTMLElement
          if (c instanceof SVGElement) {
            c.setAttribute('width', '28')
            c.setAttribute('height', '28')
          } else {
            c.style.width = '28px'
            c.style.height = '28px'
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
      setRdHover(hit && 'name' in hit ? hit.name : null)
    }

    const onUp = (e: PointerEvent) => {
      const rd = rdRef.current
      if (!rd) return
      rdRef.current = null
      rd.ghost?.remove()
      setRdHover(null)
      if (e.button !== 2) {
        rdBlockRef.current = false
        return
      }

      const paths = rd.names.map((nm) => [...path, nm])
      if (paths.length === 0) return

      if (!rd.started) {
        /* 原地右键：手动弹普通菜单（contextmenu 已被拦截） */
        const it = items.find((i) => i.name === rd.names[0])
        if (it) {
          if (!selected.includes(it.name)) setSelected([it.name])
          useXP.getState().openCtx(e.clientX, e.clientY, itemMenuRef.current(it))
        }
        return
      }

      const hit = resolveAt(e.clientX, e.clientY)
      if (!hit) return /* 无效目标：不弹菜单 */
      const dest = 'name' in hit ? [...path, hit.name] : path
      const destLabel = 'name' in hit ? hit.name : path[path.length - 1]
      rightDragMenu(e.clientX, e.clientY, paths, dest, destLabel, {
        move: () => {
          fsMove(paths, dest)
          setSelected([])
          playClick()
        },
        copy: () => {
          setClipboard('copy', paths)
          useXP.getState().fsPaste(dest)
          playClick()
        },
        shortcut: () => {
          paths.forEach((p) => fsCreateShortcut(dest, p))
          playClick()
        },
      })
    }

    /* 一次性 contextmenu 拦截（capture 阶段） */
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
  }, [items, path, isRecycle, isNetwork, selected, fsMove, fsCreateShortcut, setClipboard])

  const openProps = (n: FSNode & { _origKey?: string }) => {
    const stats = n.kind === 'file' ? undefined : countStats(n)
    openApp('fileprops', {
      name: n.name,
      type: typeOf(n),
      size: n.size,
      stats,
      path: n._origKey ? `${n._origKey}/${n.name}` : `${pathKey(path)}/${n.name}`,
      modified: n.modified,
      created: n.created,
      readonly: n.readonly,
      icon: n.icon,
      appId: n.appId,
    })
  }

  const bgMenu: CtxItem[] = isRecycle
    ? [
        { label: '还原所有项目', bold: true, disabled: recycleBin.length === 0, onClick: () => { fsRestore(); playClick() } },
        { label: '清空回收站(B)', disabled: recycleBin.length === 0, onClick: () => openApp('dialog', { kind: 'confirm', title: '确认文件删除', text: `确实要永久删除这 ${recycleBin.length} 个项目吗？`, onYes: () => { fsEmptyRecycle(); playRecycle() } }) },
        { separator: true },
        { label: '属性(R)', onClick: () => showToast(`回收站 · 共 ${recycleBin.length} 个项目 · 容量无上限（复刻版特权）`) },
      ]
    : [
        {
          label: '查看(V)',
          submenu: [
            { label: '幻灯片', radio: true, checked: viewMode === 'filmstrip', disabled: !isPictureFolder, onClick: () => changeView('filmstrip') },
            { label: '缩略图', radio: true, checked: viewMode === 'thumbnails', onClick: () => changeView('thumbnails') },
            { label: '平铺', radio: true, checked: viewMode === 'tiles', onClick: () => changeView('tiles') },
            { label: '图标', radio: true, checked: viewMode === 'icons', onClick: () => changeView('icons') },
            { label: '列表', radio: true, checked: viewMode === 'list', onClick: () => changeView('list') },
            { label: '详细信息', radio: true, checked: viewMode === 'details', onClick: () => changeView('details') },
          ],
        },
        {
          label: '排列图标(I)',
          submenu: [
            { label: '名称(N)', radio: true, checked: sortCol === 'name', onClick: () => { setSortCol('name'); setSortAsc(true); playClick() } },
            { label: '大小(Z)', radio: true, checked: sortCol === 'size', onClick: () => { setSortCol('size'); setSortAsc(true); playClick() } },
            { label: '类型(T)', radio: true, checked: sortCol === 'type', onClick: () => { setSortCol('type'); setSortAsc(true); playClick() } },
            { label: '修改时间(M)', radio: true, checked: sortCol === 'modified', onClick: () => { setSortCol('modified'); setSortAsc(true); playClick() } },
            { separator: true },
            { label: '按组排列(B)', checked: groupBy, onClick: () => { setGroupBy((v) => !v); playClick() } },
          ],
        },
        { label: '刷新(R)', accelerator: 'F5', onClick: () => setSelected([]) },
        { separator: true },
        { label: '粘贴(P)', accelerator: 'Ctrl+V', disabled: !clipboard || path.length === 0, onClick: doPaste },
        { separator: true },
        {
          label: '新建(W)',
          disabled: path.length === 0 || isNetwork,
          submenu: [
            {
              label: '文件夹(F)',
              onClick: () => {
                const name = fsCreateFolder(path)
                setSelected([name])
                setRename({ name, value: name })
                playClick()
              },
            },
            { separator: true },
            {
              label: '文本文档(T)',
              onClick: () => {
                const name = fsCreateFile(path, '新建文本文档.txt', { content: '' })
                setSelected([name])
                playClick()
              },
            },
            {
              label: '位图图像(B)',
              onClick: () => {
                const name = fsCreateFile(path, '新建位图图像.bmp', { icon: 'bmp', type: '位图图像' })
                setSelected([name])
                playClick()
              },
            },
          ],
        },
        { separator: true },
        { label: '属性(R)', onClick: () => node && openProps(node) },
      ]

  /* ── 工具栏导航 ── */
  const pathLabel = (p: string[]) =>
    p.length === 0 ? '我的电脑' : p[0] === '回收站' ? '回收站' : p[0] === '网上邻居' ? '网上邻居' : p[p.length - 1] === 'My Documents' ? '我的文档' : p[p.length - 1]
  const applyPath = (p: string[]) => {
    setPath(p)
    setSelected([])
    setRename(null)
    setWindowTitle(win.id, pathLabel(p))
  }
  const back = () => {
    if (hIndex > 0) {
      setHIndex(hIndex - 1)
      applyPath(history[hIndex - 1])
    }
  }
  const forward = () => {
    if (hIndex < history.length - 1) {
      setHIndex(hIndex + 1)
      applyPath(history[hIndex + 1])
    }
  }
  const gotoIdx = (i: number) => {
    setHIndex(i)
    applyPath(history[i])
  }
  /* XP 真实行为：后退/前进旁的下拉箭头列出访问历史（最近的在最上方） */
  const backMenu: CtxItem[] = history.slice(0, hIndex).reverse().map((p, i) => ({
    label: pathLabel(p),
    bold: i === 0,
    onClick: () => gotoIdx(hIndex - 1 - i),
  }))
  const fwdMenu: CtxItem[] = history.slice(hIndex + 1).map((p, i) => ({
    label: pathLabel(p),
    bold: i === 0,
    onClick: () => gotoIdx(hIndex + 1 + i),
  }))
  const up = () => {
    if (path.length > 0) navigate(path.slice(0, -1))
  }

  /* 地址栏：显示或手动输入路径 */
  const addrDisplay = isRecycle ? '回收站' : isNetwork ? '网上邻居' : displayPath(path)
  const submitAddrPath = (v0?: string) => {
    const v = (v0 ?? addrText).trim().replace(/^C:\\/i, '').replace(/\\+$/, '')
    if (!v) {
      setEditingAddr(false)
      return
    }
    const segs = v.split(/[\\/]+/).map((s) => s.trim()).filter(Boolean)
    const target = segs.length === 0 ? [] : segs
    if (resolvePath(target, fsTree) || target[0] === '回收站' || target[0] === '网上邻居') {
      navigate(target)
      setEditingAddr(false)
    } else {
      openApp('dialog', { kind: 'error', title: '错误', text: `找不到 "${addrText}"。请检查拼写并重试。` })
    }
  }

  const selNode = items.find((i) => i.name === selected[0])

  /* ── 任务窗格（d18）：面板折叠状态 + 上下文化任务区 ── */
  const [panesOpen, setPanesOpen] = useState<Record<string, boolean>>({})
  const paneIsOpen = (k: string) => panesOpen[k] ?? true
  const paneToggle = (k: string) => { setPanesOpen((p) => ({ ...p, [k]: !(p[k] ?? true) })); playClick() }

  const isPictures = node?.icon === 'pictures'
  const isMusic = node?.icon === 'music'
  /* 第一面板键与标题（XP 真实语义：按位置上下文切换任务区） */
  const pane1Key = inZip ? 'zip' : isRecycle ? 'recycle' : isPictures ? 'pics' : isMusic ? 'music' : path.length === 0 ? 'sys' : 'files'
  const pane1Title = inZip ? '压缩文件夹任务' : isRecycle ? '回收站任务' : isPictures ? '图片任务' : isMusic ? '音乐任务' : path.length === 0 ? '系统任务' : '文件和文件夹任务'

  /* 文件夹图片集合（图片任务「作为幻灯片查看」） */
  const picImages = useMemo(() => items.filter((i) => (i.icon === 'image' || i.icon === 'bmp') && i.src), [items])

  /* ── 渲染 ── */
  const renderItem = (n: FSNode & { _recycleKey?: string; _origKey?: string }) => {
    const Icon = n.appId ? APP_FILE_ICON[n.appId] : null
    const isSel = selected.includes(n.name)
    const isRenaming = rename?.name === n.name
    const isDropTarget = (dropHover === n.name || rdHover === n.name) && (n.kind === 'folder' || n.kind === 'drive')
    const rowCls = `text-left ${isSel ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'border border-transparent hover:bg-[#e8f0fb]'} ${isDropTarget ? '!border-[#2a7ac8] !bg-[#bcd8f2]' : ''}`

    const commonEvents = {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        if (e.ctrlKey) {
          setSelected((s) => (s.includes(n.name) ? s.filter((x) => x !== n.name) : [...s, n.name]))
        } else if (
          !isRenaming &&
          !isRecycle &&
          selected.includes(n.name) &&
          Date.now() - selAtRef.current >= 500
        ) {
          /* XP 延迟双击重命名：选中项停留 500ms 后再单击 → 内联重命名 */
          setRename({ name: n.name, value: n.name })
        } else {
          setSelected([n.name])
        }
        rootRef.current?.focus()
      },
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        if (rename) return /* 重命名刚由慢双击触发时，不再当作双击打开 */
        openItem(n)
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!selected.includes(n.name)) setSelected([n.name])
        useXP.getState().openCtx(e.clientX, e.clientY, itemMenu(n))
      },
      onPointerDown: (e: React.PointerEvent) => {
        /* 右键拖放装填（XP：按住右键拖动文件，松开弹菜单）；菜单键/非文件列表不触发 */
        if (e.button === 2 && !isRecycle && !isNetwork && path.length > 0 && n.kind !== 'drive' && !isRenaming) {
          const sel = selected.includes(n.name) ? selected : [n.name]
          if (!selected.includes(n.name)) setSelected(sel)
          rdBlockRef.current = true
          rdRef.current = { x: e.clientX, y: e.clientY, started: false, names: [...sel], ghost: null }
        }
      },
    }

    if (viewMode === 'details') {
      return (
        <button
          key={n.name}
          type="button"
          data-item={n.name}
          className={`w-full flex items-center h-[18px] text-[11px] border-b border-[#f0ede4] ${rowCls} ${isRenaming ? 'p-0' : ''}`}
          draggable={!isRecycle && !isRenaming}
          onDragStart={(e) => onDragStart(e, n.name)}
          onDragOver={(e) => { if (n.kind === 'folder' || n.kind === 'drive') { e.preventDefault(); e.dataTransfer.dropEffect = dropEffectFor(e); setDropHover(n.name) } }}
          onDragLeave={() => setDropHover((d) => (d === n.name ? null : d))}
          onDrop={(e) => { if (n.kind === 'folder' || n.kind === 'drive') onDropOn(e, [...path, n.name]) }}
          {...commonEvents}
        >
          <div className="pl-[4px] shrink-0 truncate flex items-center gap-[5px]" style={{ width: colW.name }}>
            {Icon ? <Icon size={16} /> : nodeIcon(n, 16, fsTree)}
            {isRenaming ? (
              <RenameInput rename={rename} setRename={setRename} onDone={(v) => { const r = fsRename([...path, n.name], v); if (r) { setSelected([r]); playClick() } }} />
            ) : (
              <span className="truncate">{dispName(n)}</span>
            )}
          </div>
          <div className="px-2 shrink-0 text-[#5a5a5a]" style={{ width: colW.size }}>{n.size ?? ''}</div>
          <div className="px-2 shrink-0 truncate text-[#5a5a5a]" style={{ width: colW.type }}>
            {isRecycle ? (n._origKey ?? '') : typeOf(n)}
          </div>
          <div className="px-2 flex-1 text-[#5a5a5a]">{isRecycle ? fmtDate(new Date(recycleBin.find((r) => r.key === n._recycleKey)?.deletedAt ?? Date.now()).toISOString()) : fmtDate(n.modified)}</div>
        </button>
      )
    }

    if (viewMode === 'list') {
      return (
        <button
          key={n.name}
          type="button"
          data-item={n.name}
          className={`w-full flex items-center gap-[6px] px-1 h-[18px] rounded-[2px] ${rowCls}`}
          draggable={!isRecycle && !isRenaming}
          onDragStart={(e) => onDragStart(e, n.name)}
          onDragOver={(e) => { if (n.kind === 'folder' || n.kind === 'drive') { e.preventDefault(); e.dataTransfer.dropEffect = dropEffectFor(e); setDropHover(n.name) } }}
          onDragLeave={() => setDropHover((d) => (d === n.name ? null : d))}
          onDrop={(e) => { if (n.kind === 'folder' || n.kind === 'drive') onDropOn(e, [...path, n.name]) }}
          {...commonEvents}
        >
          {Icon ? <Icon size={16} /> : nodeIcon(n, 16, fsTree)}
          {isRenaming ? (
            <RenameInput rename={rename} setRename={setRename} onDone={(v) => { const r = fsRename([...path, n.name], v); if (r) { setSelected([r]); playClick() } }} />
          ) : (
            <span className="text-[11px] truncate">{dispName(n)}</span>
          )}
        </button>
      )
    }

    if (viewMode === 'icons') {
      return (
        <button
          key={n.name}
          type="button"
          data-item={n.name}
          className={`w-[76px] flex flex-col items-center gap-[4px] p-[4px] rounded-[2px] text-center ${rowCls}`}
          draggable={!isRecycle && !isRenaming}
          onDragStart={(e) => onDragStart(e, n.name)}
          onDragOver={(e) => { if (n.kind === 'folder' || n.kind === 'drive') { e.preventDefault(); e.dataTransfer.dropEffect = dropEffectFor(e); setDropHover(n.name) } }}
          onDragLeave={() => setDropHover((d) => (d === n.name ? null : d))}
          onDrop={(e) => { if (n.kind === 'folder' || n.kind === 'drive') onDropOn(e, [...path, n.name]) }}
          {...commonEvents}
        >
          {Icon ? <Icon size={32} /> : nodeIcon(n, 32, fsTree)}
          {isRenaming ? (
            <RenameInput rename={rename} setRename={setRename} onDone={(v) => { const r = fsRename([...path, n.name], v); if (r) { setSelected([r]); playClick() } }} />
          ) : (
            <div className="text-[11px] leading-[13px] [overflow-wrap:anywhere] line-clamp-2">{dispName(n)}</div>
          )}
        </button>
      )
    }

    /* 缩略图（XP「查看→缩略图」：图片显示真实缩略，其余大图标） */
    if (viewMode === 'thumbnails') {
      const isImg = (n.icon === 'image' || n.icon === 'bmp') && n.src
      return (
        <button
          key={n.name}
          type="button"
          data-item={n.name}
          className={`w-[116px] flex flex-col items-center gap-[3px] p-[4px] rounded-[2px] text-center ${rowCls}`}
          draggable={!isRecycle && !isRenaming}
          onDragStart={(e) => onDragStart(e, n.name)}
          onDragOver={(e) => { if (n.kind === 'folder' || n.kind === 'drive') { e.preventDefault(); e.dataTransfer.dropEffect = dropEffectFor(e); setDropHover(n.name) } }}
          onDragLeave={() => setDropHover((d) => (d === n.name ? null : d))}
          onDrop={(e) => { if (n.kind === 'folder' || n.kind === 'drive') onDropOn(e, [...path, n.name]) }}
          {...commonEvents}
        >
          {isImg ? (
            <div className="w-[96px] h-[96px] border border-[#b8b4a8] bg-white flex items-center justify-center overflow-hidden shadow-[1px_1px_0_rgba(0,0,0,0.08)]">
              <img src={n.src} alt="" draggable={false} className="max-w-[88px] max-h-[88px] object-contain" />
            </div>
          ) : (
            <div className="w-[96px] h-[96px] flex items-center justify-center">
              {Icon ? <Icon size={48} /> : nodeIcon(n, 48, fsTree)}
            </div>
          )}
          {isRenaming ? (
            <RenameInput rename={rename} setRename={setRename} onDone={(v) => { const r = fsRename([...path, n.name], v); if (r) { setSelected([r]); playClick() } }} />
          ) : (
            <div className="text-[11px] leading-[13px] [overflow-wrap:anywhere] line-clamp-2 w-full break-words">{dispName(n)}</div>
          )}
        </button>
      )
    }

    /* tiles */
    return (
      <button
        key={n.name}
        type="button"
        data-item={n.name}
        className={`w-[150px] flex items-center gap-[7px] p-[4px] rounded-[2px] ${rowCls}`}
        draggable={!isRecycle && !isRenaming}
        onDragStart={(e) => onDragStart(e, n.name)}
        onDragOver={(e) => { if (n.kind === 'folder' || n.kind === 'drive') { e.preventDefault(); e.dataTransfer.dropEffect = dropEffectFor(e); setDropHover(n.name) } }}
        onDragLeave={() => setDropHover((d) => (d === n.name ? null : d))}
        onDrop={(e) => { if (n.kind === 'folder' || n.kind === 'drive') onDropOn(e, [...path, n.name]) }}
        {...commonEvents}
      >
        {Icon ? <Icon size={44} /> : nodeIcon(n, 44, fsTree)}
        {isRenaming ? (
          <RenameInput rename={rename} setRename={setRename} onDone={(v) => { const r = fsRename([...path, n.name], v); if (r) { setSelected([r]); playClick() } }} />
        ) : (
          <div className="min-w-0 flex-1 leading-[13px]">
            <div className="text-[11px] truncate">{dispName(n)}</div>
            <div className="text-[11px] truncate text-[#5a5a5a]">{isRecycle ? (n._origKey ?? '') : typeOf(n)}</div>
          </div>
        )}
      </button>
    )
  }

  return (
    <div ref={rootRef} tabIndex={0} className="flex flex-col h-full bg-white select-none outline-none" onKeyDown={onKeyDown}>
      {/* 菜单栏 */}
      <div className="order-1">
        <MenuBar
          menus={[
            {
              label: '文件(F)',
              items: [
                { label: '打开', disabled: !selNode, onClick: () => selNode && openItem(selNode) },
                { separator: true },
                { label: '新建(N)', disabled: isRecycle || isNetwork || path.length === 0, submenu: [
                  { label: '文件夹(F)', onClick: () => { const name = fsCreateFolder(path); setSelected([name]); setRename({ name, value: name }); playClick() } },
                  { label: '文本文档(T)', onClick: () => { const name = fsCreateFile(path, '新建文本文档.txt', { content: '' }); setSelected([name]); playClick() } },
                ] },
                { separator: true },
                { label: '关闭', onClick: () => useXP.getState().closeWindow(win.id) },
              ],
            },
            {
              label: '编辑(E)',
              items: [
                { label: '撤销(U)', accelerator: 'Ctrl+Z', disabled: true },
                { separator: true },
                { label: '剪切(T)', accelerator: 'Ctrl+X', disabled: isRecycle || !selNode, onClick: doCut },
                { label: '复制(C)', accelerator: 'Ctrl+C', disabled: isRecycle || !selNode, onClick: doCopy },
                { label: '粘贴(P)', accelerator: 'Ctrl+V', disabled: !clipboard || path.length === 0, onClick: doPaste },
                { separator: true },
                { label: '全选(A)', accelerator: 'Ctrl+A', disabled: isRecycle, onClick: () => setSelected(items.map((i) => i.name)) },
                { separator: true },
                { label: '删除(D)', accelerator: 'Del', disabled: selected.length === 0, onClick: deleteSelected },
              ],
            },
            {
              label: '查看(V)',
              items: [
                { label: '幻灯片', checked: viewMode === 'filmstrip', disabled: !isPictureFolder, onClick: () => changeView('filmstrip') },
                { label: '缩略图', checked: viewMode === 'thumbnails', onClick: () => changeView('thumbnails') },
                { label: '平铺', checked: viewMode === 'tiles', onClick: () => changeView('tiles') },
                { label: '图标', checked: viewMode === 'icons', onClick: () => changeView('icons') },
                { label: '列表', checked: viewMode === 'list', onClick: () => changeView('list') },
                { label: '详细信息', checked: viewMode === 'details', onClick: () => changeView('details') },
                { separator: true },
                { label: '刷新', accelerator: 'F5', onClick: () => setSelected([]) },
              ],
            },
            {
              label: '收藏(A)',
              items: [
                { label: '添加到收藏夹...', onClick: () => showToast('文件夹收藏：请用左侧「其他位置」快速跳转') },
              ],
            },
            {
              label: '工具(T)',
              items: [
                { label: '映射网络驱动器...', onClick: () => navigate(['网上邻居']) },
                { separator: true },
                { label: '文件夹选项(O)...', onClick: () => openApp('folderoptions', {}, '文件夹选项') },
              ],
            },
            { label: '帮助(H)', items: [{ label: '帮助和支持中心', onClick: () => openApp('helpcenter', {}) }] },
          ]}
        />
      </div>

      {/* 工具栏 */}
      <div className="order-2 flex items-center gap-1 px-2 py-[3px] bg-gradient-to-b from-[#f4f2e8] to-[#ece9d8] border-b border-[#d8d5c8]">
        {/* 后退（拆分按钮 + ▼ 下拉历史，XP 真实工具栏行为） */}
        <div className="flex items-center">
          <button type="button" className="xp-tb-btn" disabled={hIndex === 0} onClick={back}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M10 3 L4.5 8 L10 13" stroke="#2a5fbc" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              <path d="M7.5 3 L2.5 8 L7.5 13" stroke="#7aa0e0" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px]">后退</span>
          </button>
          {backMenu.length > 0 ? (
            <button
              type="button"
              aria-label="最近的页"
              className="w-[13px] h-[22px] ml-[-5px] rounded-r-[3px] border border-transparent flex items-center justify-center text-[#0a3c94] hover:border-[#a8c4e8] hover:bg-gradient-to-b hover:from-[#fdfdfa] hover:to-[#e8f0fb]"
              onClick={(e) => {
                e.stopPropagation()
                playClick()
                useXP.getState().openCtx(e.clientX - 2, e.clientY + 6, backMenu)
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="flex items-center">
          <button type="button" className="xp-tb-btn" disabled={hIndex >= history.length - 1} onClick={forward}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M4 2 L10 7 L4 12" stroke="#2a5fbc" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {fwdMenu.length > 0 ? (
            <button
              type="button"
              aria-label="最近的页"
              className="w-[13px] h-[22px] ml-[-5px] rounded-r-[3px] border border-transparent flex items-center justify-center text-[#0a3c94] hover:border-[#a8c4e8] hover:bg-gradient-to-b hover:from-[#fdfdfa] hover:to-[#e8f0fb]"
              onClick={(e) => {
                e.stopPropagation()
                playClick()
                useXP.getState().openCtx(e.clientX - 2, e.clientY + 6, fwdMenu)
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="w-[10px]" />
        <button type="button" className="xp-tb-btn" disabled={path.length === 0} onClick={up}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 8 L8 2 L14 8" stroke="#2a5fbc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3.5" y="8" width="9" height="5.5" rx="1" fill="none" stroke="#2a5fbc" strokeWidth="1.8" />
          </svg>
          <span className="text-[11px]">向上</span>
        </button>
        <div className="flex-1" />
        <button type="button" className="xp-tb-btn" onClick={() => openApp('search', {})}>
          <svg width="15" height="15" viewBox="0 0 15 15">
            <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="#2a5fbc" strokeWidth="1.8" />
            <rect x="9.5" y="10" width="4" height="3.4" rx="1.2" transform="rotate(-45 11.5 11.7)" fill="#2a5fbc" />
          </svg>
          <span className="text-[11px]">搜索</span>
        </button>
      </div>

      {/* 地址栏 */}
      <div className="order-3 flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f4f2e8] to-[#ece9d8] border-b border-[#d8d5c8]">
        <span className="text-[11px] text-[#6a6a5a]">地址(D)</span>
        <div ref={addrBoxRef} className="xp-sunken flex-1 flex items-center gap-1 h-[20px] px-1 bg-white relative">
          {isRecycle ? <RecycleBinIcon size={14} full={recycleBin.length > 0} /> : isNetwork ? <NetworkIcon size={14} /> : path.length === 0 ? <HardDriveIcon size={14} /> : <FolderIcon size={14} />}
          {editingAddr ? (
            <input
              autoFocus
              className="flex-1 text-[11px] outline-none min-w-0"
              value={addrText}
              onChange={(e) => setAddrText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') imeEnter(e, (v) => submitAddrPath(v))
                else if (e.key === 'Escape') setEditingAddr(false)
              }}
              onBlur={() => setEditingAddr(false)}
              onContextMenu={openEditCtx}
              spellCheck={false}
            />
          ) : (
            <button
              type="button"
              className="flex-1 text-left text-[11px] text-[#00309c] truncate"
              onClick={() => {
                setAddrText(addrDisplay.replace(/ \\ /g, '\\'))
                setEditingAddr(true)
              }}
            >
              {addrDisplay}
            </button>
          )}
          {/* XP 地址栏下拉箭头：展开路径层级树，单击任意祖先直达 */}
          <button
            type="button"
            title="选择路径"
            className="w-[15px] h-[17px] shrink-0 flex items-center justify-center rounded-[2px] hover:bg-[#e8eefc] active:bg-[#c8d8f0]"
            onClick={(e) => {
              e.stopPropagation()
              playClick()
              const rect = addrBoxRef.current?.getBoundingClientRect()
              if (!rect) return
              const items: CtxItem[] = [
                { label: '我的电脑', icon: <HardDriveIcon size={16} />, bold: path.length === 0, onClick: () => navigate([]) },
              ]
              let acc: string[] = []
              for (const seg of path) {
                acc = [...acc, seg]
                const target = [...acc]
                items.push({
                  label: seg,
                  icon: <span style={{ marginLeft: 8 + items.length * 10 }}><FolderIcon size={16} /></span>,
                  bold: acc.length === path.length,
                  onClick: () => navigate(target),
                })
              }
              useXP.getState().openCtx(rect.left, rect.bottom + 2, items)
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <path d="M1.5 3 L4.5 6 L7.5 3" fill="none" stroke="#333" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <button type="button" className="xp-tb-btn !px-[6px]" onClick={() => (editingAddr ? submitAddrPath() : showToast('提示：单击路径文本即可输入新路径（如 C:\\WINDOWS）'))}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" fill="#2a9f2a" />
            <path d="M4.5 3.5 L9 6 L4.5 8.5 Z" fill="#fff" />
          </svg>
          <span className="text-[11px]">转到</span>
        </button>
      </div>

      {/* 主体 */}
      <div className="order-4 flex-1 flex min-h-0">
        {/* 左侧任务窗格（XP「文件夹选项→常规→使用 Windows 传统风格的文件夹」时隐藏） */}
        {showCommonTasks ? (
        <div className="w-[184px] shrink-0 xp-sidebar overflow-y-auto p-[6px] space-y-[6px] xp-thin-scroll">
          {/* 第一面板：按位置上下文（系统/文件和文件夹/图片/音乐/回收站/压缩） */}
          <TaskPanel title={pane1Title} open={paneIsOpen(pane1Key)} onToggle={() => paneToggle(pane1Key)}>
            {inZip ? (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => extractZipTo(path)}>
                  提取所有文件
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => showToast('压缩文件夹内的项目为只读副本')}>
                  关于压缩文件夹
                </button>
              </>
            ) : isRecycle ? (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => { fsRestore(); playClick() }}>
                  还原所有项目
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('dialog', { kind: 'confirm', title: '确认文件删除', text: `确实要永久删除这 ${recycleBin.length} 个项目吗？`, onYes: () => { fsEmptyRecycle(); playRecycle() } })}>
                  清空回收站
                </button>
              </>
            ) : isPictures ? (
              <>
                <button
                  type="button"
                  className="xp-taskpane-link disabled:opacity-50 disabled:cursor-default"
                  disabled={picImages.length === 0}
                  onClick={() => { if (picImages.length) openApp('imgviewer', { parentPath: path, name: picImages[0].name, index: 0 }) }}
                >
                  作为幻灯片查看
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => showToast('照片打印向导：请选择图片后在「文件」菜单中打印')}>
                  打印图片
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('ie', {}, 'Internet Explorer')}>
                  联机订购照片
                </button>
              </>
            ) : isMusic ? (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('wmp', {}, 'Windows Media Player')}>
                  全部播放
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('ie', {}, 'Internet Explorer')}>
                  联机购买音乐
                </button>
              </>
            ) : path.length === 0 ? (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('sysinfo', {}, '系统信息')}>
                  查看系统信息
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('controlpanel', {}, '控制面板')}>
                  添加/删除程序
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('controlpanel', {}, '控制面板')}>
                  更改一个设置
                </button>
              </>
            ) : selNode ? (
              /* 文件和文件夹任务（XP：选中项时切换为对选中项的操作） */
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => { setRename({ name: selNode.name, value: selNode.name }); playClick() }}>
                  重命名这个{selNode.kind === 'folder' ? '文件夹' : '文件'}
                </button>
                <button type="button" className="xp-taskpane-link" onClick={doCopy}>
                  复制这个{selNode.kind === 'folder' ? '文件夹' : '文件'}
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => setTimeout(deleteSelected, 0)}>
                  删除这个{selNode.kind === 'folder' ? '文件夹' : '文件'}
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => { doCut(); showToast('已剪切到剪贴板：到目标文件夹按 Ctrl+V 即可移动') }}>
                  移动这个{selNode.kind === 'folder' ? '文件夹' : '文件'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => { const name = fsCreateFolder(path); setSelected([name]); setRename({ name, value: name }); playClick() }}>
                  创建一个新文件夹
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => showToast('已与 Administrator 共享此文件夹')}>
                  共享此文件夹
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('ie', {}, 'Internet Explorer')}>
                  将这个文件夹发布到 Web
                </button>
              </>
            )}
          </TaskPanel>

          {/* 其他位置（XP 真实集合：文件夹=我的文档/共享文档/我的电脑/网上邻居；我的电脑=网上邻居/我的文档/共享文档/控制面板） */}
          <TaskPanel title="其他位置" open={paneIsOpen('other')} onToggle={() => paneToggle('other')}>
            {path.length === 0 ? (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(['网上邻居'])}>
                  <NetworkIcon size={16} /> 网上邻居
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(myDocsPath(useXP.getState().sessionUser))}>
                  <MyDocumentsIcon size={16} /> 我的文档
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(['共享文档'])}>
                  <Bmp name="folder-shared" size={16} /> 共享文档
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => openApp('controlpanel', {}, '控制面板')}>
                  <Bmp name="controlpanel" size={16} /> 控制面板
                </button>
              </>
            ) : (
              <>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(myDocsPath(useXP.getState().sessionUser))}>
                  <MyDocumentsIcon size={16} /> 我的文档
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(['共享文档'])}>
                  <Bmp name="folder-shared" size={16} /> 共享文档
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate([])}>
                  <HardDriveIcon size={16} /> 我的电脑
                </button>
                <button type="button" className="xp-taskpane-link" onClick={() => navigate(['网上邻居'])}>
                  <NetworkIcon size={16} /> 网上邻居
                </button>
              </>
            )}
          </TaskPanel>

          {/* 详细信息（XP：48px 大图标 + 名称 + 类型/大小/修改日期） */}
          <TaskPanel title="详细信息" open={paneIsOpen('detail')} onToggle={() => paneToggle('detail')}>
            <div className="px-2 pb-[6px] text-[11px] leading-[16px] xp-taskpane-meta">
              {selNode ? (
                <>
                  <div className="flex justify-center py-[2px] pb-[4px]">{nodeIcon(selNode, 48, fsTree)}</div>
                  <div className="font-bold">{dispName(selNode)}</div>
                  <div>{typeOf(selNode)}</div>
                  {selNode.size ? <div>大小: {selNode.size}</div> : null}
                  {!isRecycle ? <div>修改日期: {fmtDate(selNode.modified)}</div> : null}
                  {isRecycle ? <div>原位置: {selNode._origKey ?? '未知'}</div> : null}
                </>
              ) : isRecycle ? (
                <div className="opacity-70">回收站 · {recycleBin.length} 个对象</div>
              ) : node ? (
                (() => {
                  /* XP 任务窗格「对象」= 直接子项数（非属性对话框的递归统计） */
                  const direct = (node.children ?? []).filter((c) => !c.hidden || showHiddenFiles).length
                  return (
                    <>
                      <div className="flex justify-center py-[2px] pb-[4px]">{nodeIcon(node, 48, fsTree)}</div>
                      <div className="font-bold">{dispName(node)}</div>
                      <div>对象: {direct}</div>
                      <div>修改日期: {fmtDate(node.modified)}</div>
                    </>
                  )
                })()
              ) : isNetwork ? (
                <div className="opacity-70">网络位置</div>
              ) : (
                <div className="opacity-70">系统文件夹</div>
              )}
            </div>
          </TaskPanel>
        </div>
        ) : null}

        {/* 文件列表（支持框选） */}
        <div
          ref={listRef}
          className="flex-1 bg-white overflow-y-auto xp-thin-scroll p-[6px] relative"
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false
              rootRef.current?.focus()
              return
            }
            setSelected([])
            rootRef.current?.focus()
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            /* 仅在非条目区域按下才启动框选（条目/表头不参与） */
            if ((e.target as HTMLElement).closest('[data-item],[data-nomarq]')) return
            marqRef.current = { x: e.clientX, y: e.clientY }
            setMarq({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY })
            /* 指针捕获：拖出列表后 pointerup 仍能回落到本容器，避免框选卡死 */
            try {
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            } catch {
              /* 合成事件无活动指针 */
            }
          }}
          onPointerMove={(e) => {
            const m = marqRef.current
            if (!m) return
            setMarq((prev) => (prev ? { ...prev, x2: e.clientX, y2: e.clientY } : prev))
          }}
          onPointerUp={(e) => {
            const m = marqRef.current
            marqRef.current = null
            if (m) {
              const x1 = Math.min(m.x, e.clientX)
              const x2 = Math.max(m.x, e.clientX)
              const y1 = Math.min(m.y, e.clientY)
              const y2 = Math.max(m.y, e.clientY)
              if (x2 - x1 > 4 || y2 - y1 > 4) {
                suppressClickRef.current = true
                const hits: string[] = []
                listRef.current?.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => {
                  const r = el.getBoundingClientRect()
                  if (x1 < r.right && x2 > r.left && y1 < r.bottom && y2 > r.top && el.dataset.item) hits.push(el.dataset.item)
                })
                if (hits.length) setSelected(hits)
              }
            }
            setMarq(null)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            useXP.getState().openCtx(e.clientX, e.clientY, bgMenu)
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(DND_MIME)) {
              e.preventDefault()
              e.dataTransfer.dropEffect = dropEffectFor(e)
            }
          }}
          onDrop={(e) => {
            if (!isRecycle && !isNetwork && path.length > 0) onDropOn(e, path)
          }}
        >
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[11px] text-[#8a8a8a]">
              {isRecycle ? '回收站是空的' : '该文件夹为空'}
            </div>
          ) : viewMode === 'filmstrip' ? (
            /* 幻灯片（XP 图片文件夹专属视图：大图预览 + 按钮行 + 底部胶片条） */
            <div data-nomarq className="h-full flex flex-col min-h-0">
              <div className="flex-1 min-h-0 mx-2 mt-1 bg-[#f4f3ee] border border-[#d8d5c8] flex items-center justify-center overflow-hidden">
                {(() => {
                  const filmSel = selected.find((s) => pictures.some((p) => p.name === s)) ?? pictures[0]?.name
                  const cur = pictures.find((p) => p.name === filmSel) ?? pictures[0]
                  if (!cur) return null
                  return (
                    <img
                      src={cur.src}
                      alt=""
                      draggable={false}
                      className="max-w-[94%] max-h-[92%] object-contain"
                      style={{ transform: `rotate(${rot[cur.name] ?? 0}deg)` }}
                    />
                  )
                })()}
              </div>
              {/* 按钮行（XP 幻灯片：上一张/下一张/顺时针/逆时针，蓝底圆形按钮） */}
              {(() => {
                const filmSel = selected.find((s) => pictures.some((p) => p.name === s)) ?? pictures[0]?.name
                const curIdx = Math.max(0, pictures.findIndex((p) => p.name === filmSel))
                const cur = pictures[curIdx]
                const go = (d: number) => { const nx = pictures[(curIdx + d + pictures.length) % pictures.length]; if (nx) setSelected([nx.name]) }
                const rotBy = (deg: number) => { if (cur) setRot((r) => ({ ...r, [cur.name]: ((r[cur.name] ?? 0) + deg + 360) % 360 })) }
                const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
                  <button
                    type="button"
                    title={title}
                    className="w-[23px] h-[23px] rounded-full border border-[#1a4a9a] flex items-center justify-center text-white shadow-[1px_1px_2px_rgba(0,0,0,0.3)] hover:brightness-110 active:brightness-90"
                    style={{ background: 'radial-gradient(circle at 35% 30%, #5a8ee0, #1d55b8 70%)' }}
                    onClick={(e) => { e.stopPropagation(); onClick(); playClick() }}
                  >
                    {children}
                  </button>
                )
                return (
                  <div className="flex items-center justify-center gap-[8px] py-[4px]">
                    <Btn title="上一张" onClick={() => go(-1)}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8.5 1.5 L3.5 6 L8.5 10.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Btn>
                    <Btn title="下一张" onClick={() => go(1)}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3.5 1.5 L8.5 6 L3.5 10.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Btn>
                    <Btn title="顺时针旋转" onClick={() => rotBy(90)}>
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M10.5 6.5 A4 4 0 1 1 6.5 2.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M6.5 0.2 L9.6 2.5 L6.2 4.4 Z" fill="#fff" /></svg>
                    </Btn>
                    <Btn title="逆时针旋转" onClick={() => rotBy(-90)}>
                      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2.5 6.5 A4 4 0 1 0 6.5 2.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M6.5 0.2 L3.4 2.5 L6.8 4.4 Z" fill="#fff" /></svg>
                    </Btn>
                    {cur ? <span className="ml-[10px] text-[11px] text-[#3a3a3a] truncate max-w-[220px]">{dispName(cur)}</span> : null}
                  </div>
                )
              })()}
              {/* 底部胶片条（水平滚动，当前项蓝色高亮框） */}
              <div className="h-[84px] mx-2 mb-2 bg-[#f6f4ea] border border-[#d8d5c8] overflow-x-auto overflow-y-hidden flex items-center gap-[4px] px-[4px] xp-thin-scroll">
                {sortedItems.map((n) => {
                  const isImg = (n.icon === 'image' || n.icon === 'bmp') && n.src
                  const filmSel = selected.find((s) => pictures.some((p) => p.name === s)) ?? pictures[0]?.name
                  const isCur = n.name === filmSel
                  return (
                    <button
                      key={n.name}
                      type="button"
                      data-item={n.name}
                      className={`shrink-0 w-[70px] h-[72px] flex flex-col items-center justify-center gap-[2px] rounded-[2px] border ${isCur ? 'border-[#316ac5] bg-[#cfe0f8]' : 'border-transparent hover:bg-[#e8eef8]'}`}
                      onClick={(e) => { e.stopPropagation(); setSelected([n.name]); rootRef.current?.focus() }}
                      onDoubleClick={(e) => { e.stopPropagation(); openItem(n) }}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation()
                        if (!selected.includes(n.name)) setSelected([n.name])
                        useXP.getState().openCtx(e.clientX, e.clientY, itemMenu(n))
                      }}
                    >
                      {isImg ? (
                        <img src={n.src} alt="" draggable={false} className="w-[56px] h-[52px] object-contain" style={{ transform: `rotate(${rot[n.name] ?? 0}deg)` }} />
                      ) : (
                        <span className="h-[52px] flex items-center">{nodeIcon(n, 40, fsTree)}</span>
                      )}
                      <span className="text-[10px] leading-[11px] w-[66px] truncate text-center">{dispName(n)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : viewMode === 'details' ? (
            <div>
              <div data-nomarq className="flex items-center h-[19px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] text-[11px] sticky top-[-6px] z-10">
                <div
                  className="pl-[4px] shrink-0 font-bold border-r border-[#d8d5c8] relative flex items-center cursor-pointer select-none hover:bg-[#e8e4d8]"
                  style={{ width: colW.name }}
                  onClick={() => toggleSort('name')}
                >
                  名称{sortArrow('name')}{colHandle('name')}
                </div>
                <div
                  className="px-2 shrink-0 font-bold border-r border-[#d8d5c8] relative flex items-center cursor-pointer select-none hover:bg-[#e8e4d8]"
                  style={{ width: colW.size }}
                  onClick={() => toggleSort('size')}
                >
                  大小{sortArrow('size')}{colHandle('size')}
                </div>
                <div
                  className="px-2 shrink-0 font-bold border-r border-[#d8d5c8] relative flex items-center cursor-pointer select-none hover:bg-[#e8e4d8]"
                  style={{ width: colW.type }}
                  onClick={() => toggleSort('type')}
                >
                  {isRecycle ? '原位置' : '类型'}{sortArrow('type')}{colHandle('type')}
                </div>
                <div
                  className="px-2 flex-1 font-bold relative flex items-center cursor-pointer select-none hover:bg-[#e8e4d8]"
                  onClick={() => toggleSort('modified')}
                >
                  {isRecycle ? '删除日期' : '修改日期'}{sortArrow('modified')}
                </div>
              </div>
              {groups
                ? groups.map((g) => (
                    <div key={g.head}>
                      <GroupHead text={g.head} />
                      {g.items.map((n) => renderItem(n))}
                    </div>
                  ))
                : sortedItems.map((n) => renderItem(n))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col">
              {groups
                ? groups.map((g) => (
                    <div key={g.head}>
                      <GroupHead text={g.head} />
                      {g.items.map((n) => renderItem(n))}
                    </div>
                  ))
                : sortedItems.map((n) => renderItem(n))}
            </div>
          ) : viewMode === 'icons' ? (
            <div className="flex flex-wrap gap-[4px] content-start">
              {groups
                ? groups.map((g) => (
                    <div key={g.head} className="contents">
                      <GroupHead text={g.head} />
                      {g.items.map((n) => renderItem(n))}
                    </div>
                  ))
                : sortedItems.map((n) => renderItem(n))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-[2px] content-start">
              {groups
                ? groups.map((g) => (
                    <div key={g.head} className="contents">
                      <GroupHead text={g.head} />
                      {g.items.map((n) => renderItem(n))}
                    </div>
                  ))
                : sortedItems.map((n) => renderItem(n))}
            </div>
          )}

          {/* 框选矩形（换算为列表容器本地坐标并钳制在可视区内，避免撑出幽灵滚动条） */}
          {marq ? (() => {
            const el = listRef.current
            const r = el?.getBoundingClientRect()
            if (!el || !r) return null
            const lx1 = Math.min(marq.x1, marq.x2) - r.left + el.scrollLeft
            const lx2 = Math.max(marq.x1, marq.x2) - r.left + el.scrollLeft
            const ly1 = Math.min(marq.y1, marq.y2) - r.top + el.scrollTop
            const ly2 = Math.max(marq.y1, marq.y2) - r.top + el.scrollTop
            const left = Math.max(0, lx1)
            const top = Math.max(0, ly1)
            return (
              <div
                className="absolute border border-dotted border-[#4a7fd0] bg-[#5a9af0]/20 pointer-events-none z-20"
                style={{
                  left,
                  top,
                  width: Math.max(0, Math.min(lx2, el.clientWidth) - left),
                  height: Math.max(0, Math.min(ly2, el.clientHeight) - top),
                }}
              />
            )
          })() : null}
        </div>
      </div>

      {/* 状态栏 */}
      <div className="order-5 flex items-center gap-0 h-[20px] bg-[#ece9d8] border-t border-[#d8d5c8] text-[11px]">
        <div className="px-2 border-r border-[#d8d5c8] flex-1">{items.length} 个对象</div>
        {selected.length > 0 ? (
          <div className="px-2 border-r border-[#d8d5c8]">{selected.length} 个对象被选定</div>
        ) : (
          <div className="px-2 border-r border-[#d8d5c8]">&nbsp;</div>
        )}
        <div className="px-2 flex items-center gap-1">
          <svg width="13" height="13" viewBox="0 0 14 14">
            <rect x="1" y="2.5" width="12" height="9" rx="1" fill="#3a5f9a" />
            <rect x="1.6" y="3.1" width="10.8" height="3" fill="#5a8ad0" />
          </svg>
          <span className="text-[#4a5a8a]">我的电脑</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────── 行内重命名输入框 ─────────── */
function RenameInput({ rename, setRename, onDone }: { rename: { name: string; value: string } | null; setRename: (r: { name: string; value: string } | null) => void; onDone: (v: string) => void }) {
  if (!rename) return null
  return (
    <input
      autoFocus
      className="xp-sunken bg-white text-[11px] px-[3px] min-w-0 max-w-full outline-none h-[15px]"
      value={rename.value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setRename({ ...rename, value: e.target.value })}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          setRename(null)
          return
        }
        /* IME 安全回车：中文文件名组态确认回车直接提交改名 */
        imeEnter(e, (v) => {
          onDone(v)
          setRename(null)
        })
      }}
      onBlur={() => setRename(null)}
      spellCheck={false}
    />
  )
}

/* 供 SearchApp 等复用：全量文件（实时树） */
export function useLiveFiles() {
  const fsTree = useXP((s) => s.fsTree)
  return React.useMemo(() => {
    const out: Array<{ name: string; path: string; node: FSNode }> = []
    const walk = (n: FSNode, cur: string) => {
      for (const c of n.children ?? []) {
        const p = cur ? `${cur}/${c.name}` : c.name
        out.push({ name: c.name, path: p, node: c })
        if (c.kind === 'folder' || c.kind === 'drive') walk(c, p)
      }
    }
    walk(fsTree, '')
    return out
  }, [fsTree])
}

export const FS_ROOT = FS
