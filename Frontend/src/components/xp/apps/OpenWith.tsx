'use client'

import React, { useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { resolvePath } from '../fs'
import { XPButton, XPCheck, XPRadio } from '../ui'
import { playClick } from '../sounds'
import { NotepadIcon, PaintIcon, WMPIcon, WordPadIcon, ImageFileIcon } from '../app-icons'
import { IEIcon } from '../icons'

/* ═══════════ 打开方式 对话框（XP 真实交互） ═══════════ */
/* 三种入口：
   ① 右键菜单 → 打开方式(H) → 选择程序(C)...   （mode='choose'）
   ② 双击无关联文件 → Windows 不能打开此文件 → 从列表选择 （mode='unknown'）
   ③ 文件夹选项 → 文件类型 → 更改 （props.ext，仅改关联不打开文件） */

interface ProgEntry {
  id: string
  name: string
  desc: string
  Icon: React.FC<{ size?: number; className?: string }>
  open: (node: { name: string; content?: string; src?: string }, parentPath: string[]) => void
}

/* 程序表（XP「打开方式」列表里的推荐程序；ctx-menus 子菜单共用） */
export const PROGRAMS: ProgEntry[] = [
  {
    id: 'notepad',
    name: '记事本',
    desc: '使用纯文本格式创建和编辑文档',
    Icon: NotepadIcon,
    open: (n, p) => useXP.getState().openApp('notepad', { fileName: n.name, content: n.content ?? '', parentPath: p }, `${n.name} - 记事本`),
  },
  {
    id: 'wordpad',
    name: '写字板',
    desc: '创建和编辑带格式的文本文档',
    Icon: WordPadIcon,
    open: (n, p) => useXP.getState().openApp('wordpad', { fileName: n.name, content: n.content ?? '' }, `${n.name} - 写字板`),
  },
  {
    id: 'imgviewer',
    name: 'Windows 图片和传真查看器',
    desc: '查看、旋转或打印图片',
    Icon: ImageFileIcon,
    open: (n, p) => useXP.getState().openApp('imgviewer', { parentPath: p, name: n.name, index: 0 }),
  },
  {
    id: 'paint',
    name: '画图',
    desc: '创建位图图像并对其进行编辑',
    Icon: PaintIcon,
    open: (n, p) => useXP.getState().openApp('paint', { fileName: n.name, parentPath: p, src: n.src }, `${n.name} - 画图`),
  },
  {
    id: 'wmp',
    name: 'Windows Media Player',
    desc: '播放数字媒体，包括音乐、视频和 CD',
    Icon: WMPIcon,
    open: (n, p) => useXP.getState().openApp('wmp', { track: n.name }),
  },
  {
    id: 'ie',
    name: 'Internet Explorer',
    desc: '浏览万维网 (WWW)',
    Icon: IEIcon,
    open: () => useXP.getState().openApp('ie', {}),
  },
]

/* 按文件类型给出推荐程序（XP：只显示推荐的程序子集） */
export function recommendedProgs(icon?: string): ProgEntry[] {
  switch (icon) {
    case 'text':
      return PROGRAMS.filter((p) => p.id === 'notepad' || p.id === 'wordpad')
    case 'image':
    case 'bmp':
      return PROGRAMS.filter((p) => p.id === 'imgviewer' || p.id === 'paint' || p.id === 'ie')
    case 'audio':
      return PROGRAMS.filter((p) => p.id === 'wmp' || p.id === 'ie')
    default:
      return PROGRAMS.filter((p) => p.id === 'wordpad' || p.id === 'notepad')
  }
}

export function OpenWith({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const parentPath = (win.props.parentPath as string[]) ?? []
  const name = (win.props.name as string) ?? ''
  /* 文件类型「更改」模式：仅针对扩展级关联操作，不定位具体文件 */
  const ext = (win.props.ext as string) ?? ''
  const startMode = (win.props.mode as 'choose' | 'unknown') ?? 'choose'
  const [mode, setMode] = useState<'ask' | 'list'>(startMode === 'unknown' ? 'ask' : 'list')
  const [choice, setChoice] = useState<'web' | 'pick'>('web')
  const [sel, setSel] = useState<string>(recommendedProgs(win.props.icon as string)[0]?.id ?? 'notepad')
  const [always, setAlways] = useState(Boolean(ext))

  const node = useMemo(() => (ext ? null : resolvePath([...parentPath, name], useXP.getState().fsTree)), [parentPath, name, ext])
  const selProg = PROGRAMS.find((p) => p.id === sel)

  const doOpen = () => {
    if (!selProg) return
    playClick()
    /* 文件类型「更改」：仅写扩展级关联（XP 语义：不打开任何文件） */
    if (ext) {
      useXP.getState().setExtAssoc(ext, selProg.id)
      showToast(`已将 .${ext} 文件更改为使用「${selProg.name}」打开`)
      closeWindow(win.id)
      return
    }
    if (!node) return
    /* 「始终使用选择的程序打开这种文件」→ 写入扩展级关联（XP 真实语义） */
    if (always) {
      const fileExt = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
      if (fileExt) {
        useXP.getState().setExtAssoc(fileExt, selProg.id)
        showToast(`已将 .${fileExt} 文件设置为使用「${selProg.name}」打开`)
      }
    }
    selProg.open({ name: node.name, content: node.content, src: node.src }, parentPath)
    closeWindow(win.id)
  }

  /* ── 双击无关联文件：XP 首屏两选项 ── */
  if (mode === 'ask') {
    return (
      <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-4">
        <div className="flex items-center gap-3 mb-4">
          <IEIcon size={32} />
          <div>
            <div className="text-[12px] font-bold mb-2">Windows 不能打开此文件:</div>
            <div className="text-[11px]">文件: {name}</div>
          </div>
        </div>
        <div className="mb-1">要打开此文件，Windows 需要知道您想用什么程序打开它。Windows 可以到网上自动搜索，或者您可以手动从已安装的程序列表中选择程序。</div>
        <div className="mt-3 space-y-2">
          <XPRadio checked={choice === 'web'} label="使用 Web 服务查找正确的程序(S)" onChange={() => setChoice('web')} />
          <XPRadio checked={choice === 'pick'} label="从已安装程序的列表中选择程序(P)" onChange={() => setChoice('pick')} />
        </div>
        <div className="flex-1" />
        <div className="flex justify-end gap-2">
          <XPButton onClick={() => {
            playClick()
            if (choice === 'pick') { setMode('list'); return }
            /* Web 服务：XP 跳转搜索页（复刻版用 MSN 搜索） */
            closeWindow(win.id)
            useXP.getState().openApp('ie', { url: `http://search.msn.com/results.asp?q=${encodeURIComponent(name)}` })
          }}>确定</XPButton>
          <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>取消</XPButton>
        </div>
      </div>
    )
  }

  /* ── 程序列表（「选择程序」/ 右键打开方式） ── */
  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3">
      <div className="mb-2">
        <div className="text-[12px] font-bold mb-1">打开方式</div>
        <div>{ext ? `选择您想要用来打开 .${ext} 文件的程序:` : <>选择您想要用来打开此文件 &ldquo;{name}&rdquo; 的程序:</>}</div>
      </div>
      <div className="flex-1 border border-[#7f9db9] bg-white overflow-y-auto min-h-[110px]">
        {PROGRAMS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`w-full flex items-center gap-2 px-2 py-[5px] text-left ${sel === p.id ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
            onClick={() => setSel(p.id)}
            onDoubleClick={doOpen}
          >
            <p.Icon size={16} className={sel === p.id ? '' : 'text-[#3a6ea5]'} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <div className="h-[34px] mt-1 text-[#4a4a3a] flex items-center">{selProg ? selProg.desc : ''}</div>
      <div className="mb-3">
        <XPCheck checked={always} label="始终使用选择的程序打开这种文件(A)" onChange={() => setAlways(!always)} />
      </div>
      <div className="flex justify-end gap-2">
        <XPButton onClick={doOpen}>确定</XPButton>
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>取消</XPButton>
      </div>
    </div>
  )
}
