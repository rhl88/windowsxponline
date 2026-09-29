'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useXP, type CtxItem, type ClassicStartOpts } from './store'
import { MenuList } from './ui'
import { UserAvatar, LogOffIcon, FolderIcon, IEIcon, NetworkIcon, MyDocumentsIcon } from './icons'
import { Bmp } from './bmp'
import { resolvePath, myDocsPath, userStartPath, type FSNode } from './fs'
import { MagnifierIcon, NarratorIcon, OSKIcon, UtilManIcon } from './apps/Accessibility'
import { tbFileEntry } from './apps/TaskbarProps'
import {
  OutlookIcon, NotepadIcon, PaintIcon, CalculatorIcon, MineIcon, SolitaireIcon, WMPIcon, CmdIcon, HelpIcon, SearchIcon, RunIcon, ControlPanelIcon, TextFileIcon, ImageFileIcon,
  FreeCellIcon, HeartsIcon, WordPadIcon, PinballIcon, DiskCleanIcon, DefragIcon, SysInfoIcon, UserAccountIcon, TaskManagerIcon, SndRecIcon, CharMapIcon,
} from './app-icons'

interface Prog {
  label: string
  icon: React.ReactNode
  onClick: () => void
}

const ALLUSERS_START = ['本地磁盘 (C:)', 'Documents and Settings', 'All Users', '「开始」菜单']

export default function StartMenu() {
  const startOpen = useXP((s) => s.startOpen)
  const setStartOpen = useXP((s) => s.setStartOpen)
  const openApp = useXP((s) => s.openApp)
  const showToast = useXP((s) => s.showToast)
  const openCtx = useXP((s) => s.openCtx)
  const setPhase = useXP((s) => s.setPhase)
  const closeAll = useXP((s) => s.closeAll)
  const programUse = useXP((s) => s.programUse)
  const startPinned = useXP((s) => s.startPinned)
  const taskbarPos = useXP((s) => s.taskbarPos)
  const taskbarH = useXP((s) => s.taskbarH)
  const reorderStartPinned = useXP((s) => s.reorderStartPinned)
  const pinStartItem = useXP((s) => s.pinStartItem)
  const unpinStartItem = useXP((s) => s.unpinStartItem)
  const removeFromMFU = useXP((s) => s.removeFromMFU)
  const sessionUser = useXP((s) => s.sessionUser)
  /* 我的文档/图片收藏/我的音乐均为登录帐户 profile 相对路径（每帐户独立） */
  const MY_DOCS_PATH = useMemo(() => myDocsPath(sessionUser), [sessionUser])
  const PIC_PATH = useMemo(() => [...myDocsPath(sessionUser), '图片收藏'], [sessionUser])
  const MUSIC_PATH = useMemo(() => [...myDocsPath(sessionUser), 'My Music'], [sessionUser])
  const USER_START = useMemo(() => userStartPath(sessionUser), [sessionUser])
  const curAvatar = useXP((s) => s.accounts.find((a) => a.name === s.sessionUser)?.avatar ?? 'avatar-admin')
  const startClassic = useXP((s) => s.startClassic)
  const classicOpts = useXP((s) => s.classicOpts)
  const startOpts = useXP((s) => s.startOpts)
  const fsTree = useXP((s) => s.fsTree)
  const printers = useXP((s) => s.printers)
  const netDrives = useXP((s) => s.netDrives)
  const recentDocs = useXP((s) => s.recentDocs)
  /* pin 区拖拽：拖动源（pin 重排 / MFU 拖入）+ 插入指示（目标项索引 + 前/后）；
   * dragOver 同步存 ref（合成事件连发时 drop 也能读到最新落点），state 仅驱动指示线渲染 */
  const pinDragRef = useRef<{ source: 'pin' | 'mfu'; key?: string; idx?: number } | null>(null)
  const dragOverRef = useRef<{ idx: number; before: boolean } | null>(null)
  const [dragOver, setDragOver] = useState<{ idx: number; before: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  const setDragOverSync = (v: { idx: number; before: boolean } | null) => {
    dragOverRef.current = v
    setDragOver(v)
  }

  useEffect(() => {
    if (!startOpen) return
    const h = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('.xp-startmenu') && !el.closest('.xp-start-btn')) {
        setStartOpen(false)
      }
    }
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [startOpen, setStartOpen])

  if (!startOpen) return null

  /* 位置随任务栏停靠边变化（XP：开始菜单始终贴着开始按钮） */
  const anchor =
    taskbarPos === 'bottom'
      ? { bottom: taskbarH, left: 0 }
      : taskbarPos === 'top'
        ? { top: taskbarH, left: 0 }
        : taskbarPos === 'left'
          ? { left: taskbarH, bottom: taskbarH }
          : { right: taskbarH, bottom: taskbarH }

  const PIN_LABELS: Record<string, { label: string; lines?: boolean }> = {
    ie: { label: 'Internet' },
    outlook: { label: '电子邮件 Outlook Express', lines: true },
    wmp: { label: 'Windows Media Player', lines: true },
    notepad: { label: '记事本' },
    wordpad: { label: '写字板' },
    paint: { label: '画图' },
    calculator: { label: '计算器' },
    minesweeper: { label: '扫雷' },
    solitaire: { label: '纸牌' },
    freecell: { label: '空当接龙' },
    hearts: { label: '红心大战' },
    pinball: { label: '三维弹球' },
    cmd: { label: '命令提示符' },
  }
  const pinIcon = (key: string, size: number) => {
    const map: Record<string, React.ReactNode> = {
      ie: <IEIcon size={size} />,
      outlook: <OutlookIcon size={size} />,
      wmp: <WMPIcon size={size} />,
      notepad: <NotepadIcon size={size} />,
      wordpad: <WordPadIcon size={size} />,
      paint: <PaintIcon size={size} />,
      calculator: <CalculatorIcon size={size} />,
      minesweeper: <MineIcon size={size} />,
      solitaire: <SolitaireIcon size={size} />,
      freecell: <FreeCellIcon size={size} />,
      hearts: <HeartsIcon size={size} />,
      pinball: <PinballIcon size={size} />,
      cmd: <CmdIcon size={size} />,
    }
    return map[key] ?? <FolderIcon size={size} />
  }

  /* ── 最常用程序（按使用次数动态排序，数目由「自定义开始菜单」控制；墓碑 -1=已从列表删除） ── */
  const ALL_PROGS: Array<Prog & { key: string }> = [
    { key: 'ie', label: 'Internet', icon: <IEIcon size={24} />, onClick: () => openApp('ie', {}) },
    { key: 'outlook', label: 'Outlook Express', icon: <OutlookIcon size={24} />, onClick: () => openApp('outlook', {}) },
    { key: 'wmp', label: 'Windows Media Player', icon: <WMPIcon size={24} />, onClick: () => openApp('wmp', {}) },
    { key: 'notepad', label: '记事本', icon: <NotepadIcon size={24} />, onClick: () => openApp('notepad', {}) },
    { key: 'wordpad', label: '写字板', icon: <WordPadIcon size={24} />, onClick: () => openApp('wordpad', {}) },
    { key: 'paint', label: '画图', icon: <PaintIcon size={24} />, onClick: () => openApp('paint', {}) },
    { key: 'calculator', label: '计算器', icon: <CalculatorIcon size={24} />, onClick: () => openApp('calculator', {}) },
    { key: 'minesweeper', label: '扫雷', icon: <MineIcon size={24} />, onClick: () => openApp('minesweeper', {}) },
    { key: 'solitaire', label: '纸牌', icon: <SolitaireIcon size={24} />, onClick: () => openApp('solitaire', {}) },
    { key: 'freecell', label: '空当接龙', icon: <FreeCellIcon size={24} />, onClick: () => openApp('freecell', {}) },
    { key: 'hearts', label: '红心大战', icon: <HeartsIcon size={24} />, onClick: () => openApp('hearts', {}) },
    { key: 'pinball', label: '三维弹球', icon: <PinballIcon size={24} />, onClick: () => openApp('pinball', {}) },
    { key: 'cmd', label: '命令提示符', icon: <CmdIcon size={24} />, onClick: () => openApp('cmd', {}) },
    { key: 'taskmgr', label: '任务管理器', icon: <TaskManagerIcon size={24} />, onClick: () => openApp('taskmgr', {}) },
    { key: 'search', label: '搜索', icon: <SearchIcon size={24} />, onClick: () => openApp('search', {}) },
    { key: 'helpcenter', label: '帮助和支持', icon: <HelpIcon size={24} />, onClick: () => openApp('helpcenter', {}) },
  ]

  const used = Object.entries(programUse)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => ({ prog: ALL_PROGS.find((p) => p.key === key), n }))
    .filter((x): x is { prog: Prog & { key: string }; n: number } => !!x.prog)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.prog)

  /* 全新系统出厂列表（XP 预填；被「从列表中删除」置墓碑 -1 的不再回填，0=未使用仍回填） */
  const FACTORY_MFU: Array<Prog & { key: string }> = [
    { key: 'notepad', label: '记事本', icon: <NotepadIcon size={24} />, onClick: () => openApp('notepad', {}) },
    { key: 'paint', label: '画图', icon: <PaintIcon size={24} />, onClick: () => openApp('paint', {}) },
    { key: 'wmp', label: 'Windows Media Player', icon: <WMPIcon size={24} />, onClick: () => openApp('wmp', {}) },
    { key: 'calculator', label: '计算器', icon: <CalculatorIcon size={24} />, onClick: () => openApp('calculator', {}) },
    { key: 'minesweeper', label: '扫雷', icon: <MineIcon size={24} />, onClick: () => openApp('minesweeper', {}) },
    { key: 'solitaire', label: '纸牌', icon: <SolitaireIcon size={24} />, onClick: () => openApp('solitaire', {}) },
  ].filter((f) => (programUse[f.key] ?? 0) >= 0)

  const recent: Array<Prog> = (used.length >= 1 ? used : FACTORY_MFU).slice(0, startOpts.progCount)

  /* ── 所有程序级联菜单（完整版，无占位；叶子项带 XP shell 右键：打开/附到开始菜单/属性） ── */
  const progItem = (key: string, label: string, icon: React.ReactNode, open: () => void): CtxItem => ({
    label,
    icon,
    onClick: open,
    onContextMenu: (e) => {
      e.preventDefault()
      openCtx(e.clientX, e.clientY, [
        { label: '打开(O)', bold: true, onClick: open },
        { separator: true },
        {
          label: '附到「开始」菜单(P)',
          onClick: () => {
            pinStartItem({ key, label })
            showToast(`已将「${label}」附到「开始」菜单`)
          },
        },
        { separator: true },
        {
          label: '属性(R)',
          onClick: () =>
            openApp('fileprops', {
              name: label,
              type: '快捷方式',
              appId: key,
              path: `C:\\Documents and Settings\\${sessionUser}\\「开始」菜单\\程序\\${label}.lnk`,
              modified: '2001-10-25T10:00:00.000Z',
              created: '2001-10-25T10:00:00.000Z',
            }),
        },
      ], { keepStart: true })
    },
  })

  const allPrograms: CtxItem[] = [
    {
      label: '附件',
      submenu: [
        {
          label: '系统工具',
          submenu: [
            progItem('diskclean', '磁盘清理', <DiskCleanIcon size={16} />, () => openApp('diskclean', {})),
            progItem('defrag', '磁盘碎片整理程序', <DefragIcon size={16} />, () => openApp('defrag', {})),
            progItem('taskmgr', '任务管理器', <CmdIcon size={16} />, () => openApp('taskmgr', {})),
            progItem('sysinfo', '系统信息', <SysInfoIcon size={16} />, () => openApp('sysinfo', {})),
            progItem('charmap', '字符映射表', <CharMapIcon size={16} />, () => openApp('charmap', {})),
          ],
        },
        {
          label: '娱乐',
          submenu: [
            progItem('sndrec', '录音机', <SndRecIcon size={16} />, () => openApp('sndrec', {})),
            progItem('wmp', 'Windows Media Player', <WMPIcon size={16} />, () => openApp('wmp', {})),
            progItem('volume', '音量控制', <SndRecIcon size={16} />, () => openApp('volume', {})),
          ],
        },
        {
          label: '辅助工具',
          submenu: [
            progItem('magnifier', '放大镜', <MagnifierIcon size={16} />, () => openApp('magnifier', {})),
            progItem('narrator', '讲述人', <NarratorIcon size={16} />, () => openApp('narrator', {})),
            progItem('osk', '屏幕键盘', <OSKIcon size={16} />, () => openApp('osk', {})),
            { separator: true },
            progItem('utilman', '工具管理器', <UtilManIcon size={16} />, () => openApp('utilman', {})),
          ],
        },
        progItem('calculator', '计算器', <CalculatorIcon size={16} />, () => openApp('calculator', {})),
        progItem('cmd', '命令提示符', <CmdIcon size={16} />, () => openApp('cmd', {})),
        progItem('notepad', '记事本', <NotepadIcon size={16} />, () => openApp('notepad', {})),
        progItem('wordpad', '写字板', <WordPadIcon size={16} />, () => openApp('wordpad', {})),
        progItem('paint', '画图', <PaintIcon size={16} />, () => openApp('paint', {})),
        progItem('ttf', ' TrueType 字体预览（简体中文）', <TextFileIcon size={16} />, () =>
          openApp('notepad', { fileName: '字体预览.txt', content: '宋体 SimSun —— 中文 Windows 的默认正文\r\n\r\n黑体 SimHei\r\n楷体 KaiTi\r\n仿宋 FangSong\r\n微软雅黑（2008 年才来，XP 时代还没它）\r\n' })),
      ],
    },
    {
      label: '游戏',
      submenu: [
        progItem('freecell', '空当接龙', <FreeCellIcon size={16} />, () => openApp('freecell', {})),
        progItem('hearts', '红心大战', <HeartsIcon size={16} />, () => openApp('hearts', {})),
        progItem('minesweeper', '扫雷', <MineIcon size={16} />, () => openApp('minesweeper', {})),
        progItem('solitaire', '纸牌', <SolitaireIcon size={16} />, () => openApp('solitaire', {})),
        progItem('pinball', '三维弹球', <PinballIcon size={16} />, () => openApp('pinball', {})),
      ],
    },
    progItem('ie', 'Internet Explorer', <IEIcon size={16} />, () => openApp('ie', {})),
    progItem('outlook', 'Outlook Express', <OutlookIcon size={16} />, () => openApp('outlook', {})),
    progItem('wmp', 'Windows Media Player', <WMPIcon size={16} />, () => openApp('wmp', {})),
    progItem('moviemaker', 'Windows Movie Maker', <TextFileIcon size={16} />, () =>
      useXP.getState().openApp('dialog', {
        kind: 'error',
        title: 'Windows Movie Maker',
        text: '无法启动 Windows Movie Maker。\n\n此复刻版的导演还在拍 56K 短片，\n建议先用「画图」分镜。',
      })),
  ]

  /* ── 右栏：支持「不显示/链接/菜单」三种模式（自定义开始菜单→高级） ── */
  const modeOf = (k: string) => startOpts.itemMode[k] ?? (k === 'network' ? 'none' : 'link')
  const fsMenu = (path: string[]): CtxItem[] =>
    (resolvePath(path, fsTree)?.children ?? []).map((n) => {
      const e = tbFileEntry(n, path)
      return { label: e.label, icon: e.icon, onClick: e.onClick }
    })

  const controlPanelMenu: CtxItem[] = [
    { label: '打印机和传真', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('printfax', {}, '打印机和传真') },
    { label: '电源选项', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('powerprops', {}, '电源选项 属性') },
    { label: '辅助功能选项', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('accessprops', {}, '辅助功能选项') },
    { label: '管理工具', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('admintools', {}, '管理工具') },
    { label: '键盘', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('keyboardprops', {}, '键盘 属性') },
    { label: '区域和语言选项', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('intlprops', {}, '区域和语言选项') },
    { label: '任务计划', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('taskssched', {}, 'Tasks') },
    { label: '日期和时间', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('datetime', {}, '日期和时间 属性') },
    { label: '声音和音频设备', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('soundprops', {}, '声音和音频设备 属性') },
    { label: '添加或删除程序', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('addremove', {}, '添加或删除程序') },
    { label: '网络连接', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('netconn', {}, '网络连接') },
    { label: '显示', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('display', { tab: '设置' }, '显示 属性') },
    { label: '用户帐户', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('useraccounts', {}, '用户帐户') },
    { label: '鼠标', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('mouseprops', {}, '鼠标 属性') },
    { label: '字体', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('fonts', {}, 'Fonts') },
    { label: '系统', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('sysprops', {}, '系统属性') },
  ]

  const myComputerMenu: CtxItem[] = [
    ...(fsTree.children ?? []).map((c) => ({ label: c.name, icon: <FolderIcon size={16} />, onClick: () => openApp('explorer', { path: [c.name] }, c.name) })),
    ...netDrives.map((d) => ({ label: `${d.letter} (${d.path})`, icon: <NetworkIcon size={16} />, onClick: () => openApp('explorer', { path: [] }, '我的电脑') })),
    { separator: true },
    { label: '控制面板', icon: <ControlPanelIcon size={16} />, submenu: controlPanelMenu },
  ]

  const networkMenu: CtxItem[] = [
    { label: '整个网络', icon: <NetworkIcon size={16} />, onClick: () => openApp('explorer', { path: ['网上邻居'] }, '网上邻居') },
    { separator: true },
    { label: '添加网上邻居(A)...', icon: <FolderIcon size={16} />, onClick: () => openApp('explorer', { path: ['网上邻居'] }, '网上邻居') },
  ]

  const printfaxMenu: CtxItem[] = [
    ...printers.map((p) => ({ label: p.name, icon: <ControlPanelIcon size={16} />, onClick: () => openApp('printfax', {}, '打印机和传真') })),
    { separator: true },
    { label: '添加打印机(A)...', icon: <ControlPanelIcon size={16} />, onClick: () => openApp('printfax', {}) },
  ]

  /* 右栏条目右键（XP 真实：打开 + 属性；我的电脑→系统属性；保持开始菜单展开） */
  const shellCtx = (open: () => void, props?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openCtx(
      e.clientX,
      e.clientY,
      [
        { label: '打开(O)', bold: true, onClick: open },
        ...(props ? [{ separator: true } as CtxItem, { label: '属性(R)', onClick: props }] : []),
      ],
      { keepStart: true },
    )
  }

  const rightCol: Array<{ label: string; icon: React.ReactNode; onClick?: () => void; separator?: boolean; bold?: boolean; modeKey?: string; menu?: CtxItem[]; onCtx?: (e: React.MouseEvent) => void }> = [
    {
      label: '我的文档', icon: <MyDocumentsIcon size={16} />, modeKey: 'mydocs', menu: fsMenu(MY_DOCS_PATH), onClick: () => openApp('explorer', { path: MY_DOCS_PATH }, '我的文档'),
      onCtx: shellCtx(
        () => openApp('explorer', { path: MY_DOCS_PATH }, '我的文档'),
        () => openApp('fileprops', { name: '我的文档', type: '文件夹', path: 'C:\\Documents and Settings\\' + sessionUser + '\\My Documents', stats: { files: 7, folders: 3, bytes: 1024000 } }),
      ),
    },
    {
      label: '图片收藏', icon: <FolderIcon size={16} variant="pictures" />, modeKey: 'pics', menu: fsMenu(PIC_PATH), onClick: () => openApp('explorer', { path: PIC_PATH }, '图片收藏'),
      onCtx: shellCtx(
        () => openApp('explorer', { path: PIC_PATH }, '图片收藏'),
        () => openApp('fileprops', { name: '图片收藏', type: '文件夹', path: 'C:\\Documents and Settings\\' + sessionUser + '\\My Documents\\My Pictures', stats: { files: 4, folders: 0, bytes: 512000 } }),
      ),
    },
    {
      label: '我的音乐', icon: <FolderIcon size={16} variant="music" />, modeKey: 'music', menu: fsMenu(MUSIC_PATH), onClick: () => openApp('explorer', { path: MUSIC_PATH }, 'My Music'),
      onCtx: shellCtx(
        () => openApp('explorer', { path: MUSIC_PATH }, 'My Music'),
        () => openApp('fileprops', { name: 'My Music', type: '文件夹', path: 'C:\\Documents and Settings\\' + sessionUser + '\\My Documents\\My Music', stats: { files: 3, folders: 0, bytes: 3072000 } }),
      ),
    },
    {
      label: '我的电脑', icon: <FolderIcon size={16} />, modeKey: 'mycomputer', menu: myComputerMenu, onClick: () => openApp('explorer', { path: [] }, '我的电脑'),
      onCtx: shellCtx(
        () => openApp('explorer', { path: [] }, '我的电脑'),
        () => openApp('sysprops', {}, '系统属性'),
      ),
    },
    { label: '', icon: null, separator: true },
    {
      label: '网上邻居', icon: <NetworkIcon size={16} />, modeKey: 'network', menu: networkMenu, onClick: () => openApp('explorer', { path: ['网上邻居'] }, '网上邻居'),
      onCtx: shellCtx(
        () => openApp('explorer', { path: ['网上邻居'] }, '网上邻居'),
        () => openApp('fileprops', { name: '网上邻居', type: '系统文件夹', path: '网上邻居' }),
      ),
    },
    {
      label: '控制面板(C)', icon: <ControlPanelIcon size={16} />, modeKey: 'controlpanel', menu: controlPanelMenu, onClick: () => openApp('controlpanel', {}),
      onCtx: shellCtx(
        () => openApp('controlpanel', {}),
        () => openApp('fileprops', { name: '控制面板', type: '系统文件夹', path: '控制面板' }),
      ),
    },
    {
      label: '打印机和传真', icon: <ControlPanelIcon size={16} />, modeKey: 'printfax', menu: printfaxMenu, onClick: () => openApp('printfax', {}, '打印机和传真'),
      onCtx: shellCtx(
        () => openApp('printfax', {}, '打印机和传真'),
        () => openApp('fileprops', { name: '打印机和传真', type: '系统文件夹', path: '控制面板\\打印机和传真' }),
      ),
    },
    { label: '', icon: null, separator: true },
    { label: '帮助和支持(H)', icon: <HelpIcon size={16} />, onClick: () => openApp('helpcenter', {}), onCtx: shellCtx(() => openApp('helpcenter', {}), () => openApp('fileprops', { name: '帮助和支持', type: '快捷方式', appId: 'helpcenter', path: 'C:\\Documents and Settings\\All Users\\「开始」菜单\\帮助和支持.lnk' })) },
    { label: '搜索(S)', icon: <SearchIcon size={16} />, onClick: () => openApp('search', {}), onCtx: shellCtx(() => openApp('search', {}), () => openApp('fileprops', { name: '搜索', type: '快捷方式', appId: 'search', path: 'C:\\Documents and Settings\\All Users\\「开始」菜单\\搜索.lnk' })) },
    { label: '运行(R)...', icon: <RunIcon size={16} />, onClick: () => openApp('run', {}), onCtx: shellCtx(() => openApp('run', {}), () => openApp('fileprops', { name: '运行', type: '快捷方式', appId: 'run', path: 'C:\\Documents and Settings\\All Users\\「开始」菜单\\运行.lnk' })) },
  ]

  /* 经典菜单固定区条目（带 key：拖拽排序 + 右键脱离） */
  const classicPinned = startPinned.map((p, idx) => ({
    key: p.key,
    idx,
    label: (PIN_LABELS[p.key]?.label ?? p.label).replace(/\n/g, ' '),
    icon: pinIcon(p.key, 16),
    onClick: () => openApp(p.key, {}),
  }))

  /* 我最近的文档：真实记录（XP 最多 15 条，点击按类型打开） */
  const recentIcon = (n: FSNode | null): React.ReactNode => {
    if (!n) return <TextFileIcon size={16} />
    switch (n.icon) {
      case 'image': case 'bmp': return <ImageFileIcon size={16} />
      case 'audio': return <WMPIcon size={16} />
      case 'font': return <Bmp name="fontfile" size={16} />
      case 'zip': return <Bmp name="zipfile" size={16} />
      case 'text': default: return <TextFileIcon size={16} />
    }
  }
  const openRecentDoc = (p: string[]) => {
    const node = resolvePath(p, fsTree)
    const name = p[p.length - 1] ?? ''
    if (!node) {
      openApp('dialog', { kind: 'error', title: 'Windows', text: `无法找到 "${name}"。\n该文件可能已被删除或移动。` })
      return
    }
    const parent = p.slice(0, -1)
    if (node.icon === 'text') openApp('notepad', { fileName: node.name, content: node.content ?? '', parentPath: parent })
    else if (node.icon === 'image' || node.icon === 'bmp') openApp('imgviewer', { parentPath: parent, name: node.name, index: 0 })
    else if (node.icon === 'audio') openApp('wmp', { track: node.name })
    else if (node.icon === 'font') openApp('fontview', { font: node.name })
    else if (node.kind === 'folder' || node.kind === 'drive') openApp('explorer', { path: parent }, name)
    else if (node.appId) openApp(node.appId, {})
    else openApp('dialog', { kind: 'error', title: node.name, text: `Windows 无法打开此文件：\n\n"${node.name}"\n\n要打开此文件，Windows 需要知道由哪个程序创建它。` })
  }
  const recentDocItems: CtxItem[] = recentDocs.map((p) => {
    const node = resolvePath(p, fsTree)
    return {
      label: p[p.length - 1] ?? '',
      icon: recentIcon(node),
      onClick: () => openRecentDoc(p),
    }
  })

  /* 经典「开始」菜单分支 */
  if (startClassic) {
    return (
      <ClassicStartMenu
        anchor={anchor}
        allPrograms={allPrograms}
        opts={classicOpts}
        pinnedItems={classicPinned}
        recentDocItems={recentDocItems}
        openApp={openApp}
        openCtx={openCtx}
        onUnpin={(key, label) => {
          unpinStartItem(key)
          showToast(`已从「开始」菜单脱离「${label}」`)
        }}
        onProps={(key, label) =>
          openApp('fileprops', {
            name: label,
            type: '快捷方式',
            appId: key,
            path: `C:\\Documents and Settings\\${sessionUser}\\「开始」菜单\\${label}.lnk`,
            modified: '2001-10-25T10:00:00.000Z',
            created: '2001-10-25T10:00:00.000Z',
          })
        }
        onLogoff={() => useXP.getState().openApp('dialog', { kind: 'logoff' }, '注销 Windows')}
        onShutdown={() => useXP.getState().openApp('dialog', { kind: 'shutdown' })}
        onClose={() => setStartOpen(false)}
        pinDragRef={pinDragRef}
        dragOverRef={dragOverRef}
        dragOver={dragOver}
        setDragOver={setDragOverSync}
      />
    )
  }

  return (
    <div
      className="xp-startmenu fixed z-[480] w-[384px] rounded-t-[8px] overflow-visible xp-startmenu-anim select-none"
      style={anchor}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openCtx(e.clientX, e.clientY, [
          { label: '打开所有用户(O)', onClick: () => openApp('explorer', { path: ALLUSERS_START }, '「开始」菜单') },
          { label: '浏览所有用户(E)', onClick: () => openApp('explorer', { path: ALLUSERS_START }, '「开始」菜单') },
          { separator: true },
          { label: '属性(R)', onClick: () => openApp('taskbarprops', { tab: 'start' }) },
        ], { keepStart: true })
      }}
    >
      {/* 用户头部（当前登录帐户） */}
      <div className="xp-startmenu-header flex items-center gap-[10px] px-[10px] py-[7px] rounded-t-[8px]">
        <div className="w-[46px] h-[46px] rounded-[4px] border-2 border-white/95 shadow-md overflow-hidden shrink-0">
          <Bmp name={curAvatar} size={46} style={{ width: 46, height: 46 }} />
        </div>
        <div className="text-white font-bold text-[15px] tracking-wide xp-luna-fg !text-[15px]">{sessionUser}</div>
      </div>

      {/* 双栏主体 */}
      <div className="flex bg-white border-x border-b border-[#0a3c94]">
        {/* 左栏 */}
        <div className="w-[196px] bg-white py-[4px] px-[3px]">
          {/* 固定区（可拖动重排/从常用区拖入；XP 蓝色插入线指示落点；右键脱离/属性） */}
          <div className={`grid ${startOpts.bigIcons ? 'grid-cols-1' : 'grid-cols-2'} gap-[1px] px-[2px] mb-[4px]`}>
            {startPinned.map((p, idx) => (
              <button
                key={p.key}
                type="button"
                className="xp-sm-pin relative cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  pinDragRef.current = { source: 'pin', key: p.key, idx }
                  e.dataTransfer.effectAllowed = 'move'
                  setDragging(true)
                }}
                onDragEnd={() => {
                  pinDragRef.current = null
                  setDragOverSync(null)
                  setDragging(false)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setDragOverSync({ idx, before: e.clientX < r.left + r.width / 2 })
                }}
                onDragLeave={() => { if (dragOverRef.current?.idx === idx) setDragOverSync(null) }}
                onDrop={(e) => {
                  e.preventDefault()
                  const drag = pinDragRef.current
                  const over = dragOverRef.current
                  pinDragRef.current = null
                  setDragOverSync(null)
                  setDragging(false)
                  if (!drag || !over) return
                  if (drag.source === 'mfu' && drag.key) {
                    /* 常用程序 → pin 区：附到开始菜单并落到插入位 */
                    const st = useXP.getState()
                    if (st.startPinned.some((x) => x.key === drag.key)) return
                    const label = ALL_PROGS.find((x) => x.key === drag.key)?.label ?? drag.key
                    pinStartItem({ key: drag.key, label })
                    const from = useXP.getState().startPinned.length - 1
                    const to = over.idx + (over.before ? 0 : 1)
                    if (to !== from) reorderStartPinned(from, to)
                    showToast(`已将「${label}」附到「开始」菜单`)
                  } else if (drag.source === 'pin' && drag.idx !== undefined) {
                    let to = over.idx + (over.before ? 0 : 1)
                    if (drag.idx < to) to -= 1
                    if (to !== drag.idx && to >= 0) reorderStartPinned(drag.idx, to)
                  }
                }}
                onClick={() => openApp(p.key, {})}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openCtx(e.clientX, e.clientY, [
                    { label: '打开', bold: true, onClick: () => openApp(p.key, {}) },
                    { separator: true },
                    { label: '从「开始」菜单脱离(U)', onClick: () => { unpinStartItem(p.key); showToast(`已从「开始」菜单脱离「${p.label}」`) } },
                    { separator: true },
                    {
                      label: '属性(R)',
                      onClick: () =>
                        openApp('fileprops', {
                          name: PIN_LABELS[p.key]?.label?.replace(/\n/g, ' ') ?? p.label,
                          type: '快捷方式',
                          appId: p.key,
                          path: `C:\\Documents and Settings\\${sessionUser}\\「开始」菜单\\${(PIN_LABELS[p.key]?.label ?? p.label).replace(/\n/g, ' ')}.lnk`,
                          modified: '2001-10-25T10:00:00.000Z',
                          created: '2001-10-25T10:00:00.000Z',
                        }),
                    },
                  ], { keepStart: true })
                }}
              >
                {/* 插入指示线（XP：蓝色竖线标示落点前/后） */}
                {dragOver?.idx === idx ? (
                  <span
                    className={`absolute top-[2px] bottom-[2px] w-[2px] bg-[#2a6ad0] rounded-full z-10 ${dragOver.before ? 'left-[-1px]' : 'right-[-1px]'}`}
                  />
                ) : null}
                <span className={`${startOpts.bigIcons ? 'w-[36px] h-[36px]' : 'w-[30px] h-[30px]'} flex items-center justify-center`}>{pinIcon(p.key, startOpts.bigIcons ? 34 : 28)}</span>
                <span className="text-[11px] leading-[13px] text-left" style={PIN_LABELS[p.key]?.lines || startOpts.bigIcons ? { whiteSpace: 'pre-line' } : undefined}>
                  {PIN_LABELS[p.key]?.label ?? p.label}
                </span>
              </button>
            ))}
          </div>
          <div className="xp-sm-sep" />
          {/* 常用程序（动态 · 可拖入固定区 · 右键附到开始菜单/从列表中删除 · 大图标可放大） */}
          <div className="grid grid-cols-1">
            {recent.slice(0, startOpts.progCount).map((r) => {
              const rk = ALL_PROGS.find((p) => p.label === r.label)?.key ?? ''
              return (
                <button
                  key={r.label}
                  type="button"
                  className="xp-sm-recent cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    pinDragRef.current = { source: 'mfu', key: rk }
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => { pinDragRef.current = null; setDragOverSync(null) }}
                  onClick={r.onClick}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openCtx(e.clientX, e.clientY, [
                      { label: '打开', bold: true, onClick: r.onClick },
                      { separator: true },
                      {
                        label: '附到「开始」菜单(P)',
                        onClick: () => {
                          if (rk) {
                            pinStartItem({ key: rk, label: r.label })
                            showToast(`已将「${r.label}」附到「开始」菜单`)
                          }
                        },
                      },
                      {
                        label: '从列表中删除(I)',
                        onClick: () => {
                          if (rk) {
                            removeFromMFU(rk)
                            showToast(`已从列表中删除「${r.label}」`)
                          }
                        },
                      },
                      { separator: true },
                      {
                        label: '属性(R)',
                        onClick: () =>
                          openApp('fileprops', {
                            name: r.label,
                            type: '应用程序',
                            appId: rk,
                            path: `C:\\Program Files\\${r.label}\\${r.label}.exe`,
                            modified: '2001-10-25T10:00:00.000Z',
                            created: '2001-10-25T10:00:00.000Z',
                          }),
                      },
                    ], { keepStart: true })
                  }}
                >
                  <span className="shrink-0 flex items-center" style={startOpts.bigIcons ? { transform: 'scale(1.3)', transformOrigin: 'center left' } : undefined}>{r.icon}</span>
                  <span className="text-[11px] truncate">{r.label}</span>
                </button>
              )
            })}
          </div>
          <div className="xp-sm-sep" />
          {/* 所有程序 */}
          <div className="relative px-[2px] py-[2px]">
            <MenuList
              items={[
                {
                  label: '所有程序 (A)',
                  bold: true,
                  submenu: allPrograms,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14">
                      <circle cx="4" cy="3.5" r="1.7" fill="#2a72c8" />
                      <circle cx="4" cy="10.5" r="1.7" fill="#2a72c8" />
                      <rect x="6.5" y="2.5" width="6.5" height="2" rx="1" fill="#8a8a8a" />
                      <rect x="6.5" y="9.5" width="6.5" height="2" rx="1" fill="#8a8a8a" />
                    </svg>
                  ),
                },
              ]}
              width={182}
              gutter={false}
              onClose={() => setStartOpen(false)}
            />
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-[2px] bg-gradient-to-b from-[#d8e8f8] via-[#b8d0f0] to-[#98bce8] my-[4px]" />

        {/* 右栏 */}
        <div className="flex-1 py-[4px] px-[3px]" style={{ background: 'var(--luna-sm-panel)' }}>
          {rightCol.map((r, i) => {
            if (r.separator) {
              return <div key={i} className="mx-[6px] my-[4px] border-t border-[#98b8e0]/80" />
            }
            const mode = r.modeKey ? modeOf(r.modeKey) : 'link'
            if (mode === 'none') return null
            /* 显示为菜单：右栏条目变级联菜单（自定义开始菜单 → 高级） */
            if (mode === 'menu' && r.menu && r.menu.length > 0) {
              return (
                <div key={r.label} className="px-[1px]">
                  <MenuList
                    items={[{ label: `${r.label} `, bold: r.bold, submenu: r.menu, icon: r.icon }]}
                    width={176}
                    gutter={false}
                    onClose={() => setStartOpen(false)}
                  />
                </div>
              )
            }
            return (
              <button key={r.label} type="button" className="xp-sm-right" onClick={r.onClick} onContextMenu={r.onCtx}>
                {r.icon}
                <span className={`text-[11px] truncate ${r.bold ? 'font-bold' : ''}`}>{r.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 底部页脚 */}
      <div className="xp-startmenu-footer rounded-b-[4px] flex justify-end items-center gap-[10px] px-[12px] py-[6px]">
        <button
          type="button"
          className="xp-sm-foot"
          onClick={() => {
            useXP.getState().openApp('dialog', { kind: 'logoff' }, '注销 Windows')
          }}
        >
          <LogOffIcon size={24} />
          <span className="text-[11px]">注销 (L)</span>
        </button>
        <button
          type="button"
          className="xp-sm-foot"
          onClick={() => {
            useXP.getState().openApp('dialog', { kind: 'shutdown' })
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10.5" fill="#d84a30" stroke="#fff" strokeWidth="1.4" />
            <g stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M12 6.5 v6" />
              <path d="M7.5 9 a6.2 6.2 0 1 0 9 0" />
            </g>
          </svg>
          <span className="text-[11px]">关闭计算机 (U)</span>
        </button>
      </div>
    </div>
  )
}

/* ═══════════════ 经典「开始」菜单（Win2000 风格 + XP 品牌竖条） ═══════════════ */

function ClsRow({
  icon,
  label,
  onClick,
  arrow,
  tall,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  dropHint,
  onContextMenu,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  arrow?: boolean
  tall?: boolean
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  dropHint?: 'before' | 'after' | null
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <div className="relative">
      {/* 插入指示线（单列：横向蓝线） */}
      {dropHint ? <div className={`absolute left-[4px] right-[4px] h-[2px] bg-[#2a6ad0] z-10 ${dropHint === 'before' ? '-top-[1px]' : '-bottom-[1px]'}`} /> : null}
      <button
        type="button"
        className={`w-full flex items-center gap-[7px] pl-[7px] pr-[5px] ${tall ? 'h-[30px]' : 'h-[24px]'} hover:bg-[#316ac5] hover:text-white text-left text-[11px] text-[#1a1a1a] ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onContextMenu={onContextMenu}
      >
        <span className="w-[20px] flex items-center justify-center shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {arrow ? (
          <span className="shrink-0 text-[7px] text-[#4a6a9a]">▶</span>
        ) : null}
      </button>
    </div>
  )
}

function ClassicStartMenu({
  anchor,
  allPrograms,
  opts,
  pinnedItems,
  recentDocItems,
  openApp,
  openCtx,
  onUnpin,
  onProps,
  onLogoff,
  onShutdown,
  onClose,
  pinDragRef,
  dragOverRef,
  dragOver,
  setDragOver,
}: {
  anchor: React.CSSProperties
  allPrograms: CtxItem[]
  opts: ClassicStartOpts
  pinnedItems: Array<{ key: string; idx: number; label: string; icon: React.ReactNode; onClick: () => void }>
  recentDocItems: CtxItem[]
  openApp: (app: string, props?: Record<string, unknown>, titleOverride?: string) => void
  openCtx: (x: number, y: number, items: CtxItem[], opts?: { keepStart?: boolean }) => void
  onUnpin: (key: string, label: string) => void
  onProps: (key: string, label: string) => void
  onLogoff: () => void
  onShutdown: () => void
  onClose: () => void
  pinDragRef: React.MutableRefObject<{ source: 'pin' | 'mfu'; key?: string; idx?: number } | null>
  dragOverRef: React.MutableRefObject<{ idx: number; before: boolean } | null>
  dragOver: { idx: number; before: boolean } | null
  setDragOver: (v: { idx: number; before: boolean } | null) => void
}) {
  return (
    <div
      className="xp-startmenu fixed z-[480] w-[206px] select-none xp-startmenu-anim"
      style={anchor}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openCtx(e.clientX, e.clientY, [
          { label: '属性(R)', onClick: () => openApp('taskbarprops', { tab: 'start' }) },
        ], { keepStart: true })
      }}
    >
      <div className="flex rounded-[2px] overflow-hidden border border-[#7a9ac8] shadow-[3px_3px_9px_rgba(0,0,0,0.4)] bg-white">
        {/* 左侧品牌竖条：Windows XP Professional */}
        <div
          className="w-[23px] shrink-0 relative"
          style={{ background: 'linear-gradient(to bottom, #0a246a 0%, #16499c 40%, #3a74c0 75%, #a6caf0 100%)' }}
        >
          <span
            className="absolute bottom-[8px] left-1/2 text-[10px] font-bold text-white whitespace-nowrap tracking-wide"
            style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) rotate(180deg)', textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
          >
            Windows XP Professional
          </span>
        </div>
        {/* 菜单主体 */}
        <div className="flex-1 min-w-0 bg-white">
          {/* 顶部固定分隔 */}
          <div className="h-[2px] mt-[3px] mx-[3px] rounded-full bg-gradient-to-r from-[#c8ccd8] via-[#e8eaf0] to-[#c8ccd8]" />
          {pinnedItems.map((p) => (
            <ClsRow
              key={p.key}
              icon={p.icon}
              label={p.label}
              onClick={p.onClick}
              draggable
              onDragStart={(e) => {
                pinDragRef.current = { source: 'pin', key: p.key, idx: p.idx }
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => {
                pinDragRef.current = null
                setDragOver(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setDragOver({ idx: p.idx, before: e.clientY < r.top + r.height / 2 })
              }}
              onDragLeave={() => { if (dragOverRef.current?.idx === p.idx) setDragOver(null) }}
              onDrop={(e) => {
                e.preventDefault()
                const drag = pinDragRef.current
                const over = dragOverRef.current
                pinDragRef.current = null
                setDragOver(null)
                if (!drag || drag.idx === undefined || !over) return
                let to = over.idx + (over.before ? 0 : 1)
                if (drag.idx < to) to -= 1
                if (to !== drag.idx && to >= 0) useXP.getState().reorderStartPinned(drag.idx, to)
              }}
              dropHint={dragOver?.idx === p.idx ? (dragOver.before ? 'before' : 'after') : null}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openCtx(e.clientX, e.clientY, [
                  { label: '打开(O)', bold: true, onClick: p.onClick },
                  { separator: true },
                  { label: '从「开始」菜单脱离(U)', onClick: () => onUnpin(p.key, p.label) },
                  { separator: true },
                  { label: '属性(R)', onClick: () => onProps(p.key, p.label) },
                ], { keepStart: true })
              }}
            />
          ))}
          <div className="h-[1px] my-[3px] mx-[4px] bg-[#d4d0c8]" />
          {opts.myDocs ? (
            <ClsRow
              icon={<MyDocumentsIcon size={16} />}
              label="我的文档(D)"
              onClick={() => openApp('explorer', { path: myDocsPath(useXP.getState().sessionUser) }, '我的文档')}
            />
          ) : null}
          {opts.recentDocs ? (
            <div className="px-[1px]">
              <MenuList
                items={[
                  {
                    label: '我最近的文档 (E)',
                    submenu: recentDocItems.length
                      ? recentDocItems
                      : [{ label: '(空)', disabled: true }],
                    icon: <FolderIcon size={16} />,
                  },
                ]}
                width={200}
                gutter={false}
                onClose={onClose}
              />
            </div>
          ) : null}
          {opts.search ? (
            <div className="px-[1px]">
              <MenuList
                items={[
                  {
                    label: '搜索 (S)',
                    submenu: [
                      { label: '文件或文件夹(F)...', icon: <SearchIcon size={16} />, onClick: () => openApp('search', {}) },
                      { separator: true },
                      { label: '在 Internet 上(I)', icon: <IEIcon size={16} />, onClick: () => openApp('ie', {}) },
                      { label: '用户(P)...', disabled: true },
                    ],
                    icon: <SearchIcon size={16} />,
                  },
                ]}
                width={176}
                gutter={false}
                onClose={onClose}
              />
            </div>
          ) : null}
          {opts.help ? (
            <ClsRow icon={<HelpIcon size={16} />} label="帮助和支持(H)" onClick={() => openApp('helpcenter', {})} />
          ) : null}
          {opts.run ? (
            <ClsRow icon={<RunIcon size={16} />} label="运行(R)..." onClick={() => openApp('run', {})} />
          ) : null}
          <div className="h-[1px] my-[3px] mx-[4px] bg-[#d4d0c8]" />
          {opts.allPrograms ? (
            <div className="px-[1px]">
              <MenuList
                items={[{ label: '所有程序 (P)', bold: true, submenu: allPrograms, icon: <FolderIcon size={16} /> }]}
                width={176}
                gutter={false}
                onClose={onClose}
              />
            </div>
          ) : null}
          <div className="h-[1px] my-[3px] mx-[4px] bg-[#d4d0c8]" />
          {opts.logoff ? (
            <ClsRow tall icon={<LogOffIcon size={16} />} label="注销(L)..." onClick={onLogoff} />
          ) : null}
          {opts.shutdown ? (
            <ClsRow
              tall
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10.5" fill="#d84a30" stroke="#fff" strokeWidth="1.4" />
                  <g stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round">
                    <path d="M12 6.5 v6" />
                    <path d="M7.5 9 a6.2 6.2 0 1 0 9 0" />
                  </g>
                </svg>
              }
              label="关闭计算机(U)..."
              onClick={onShutdown}
            />
          ) : null}
          <div className="h-[3px]" />
        </div>
      </div>
    </div>
  )
}
