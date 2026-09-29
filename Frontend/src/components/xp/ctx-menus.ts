'use client'

import type { CtxItem } from './store'
import { useXP } from './store'
import type { WinState } from './store'
import { resolvePath, userDesktopPath, myDocsPath } from './fs'
import { driveNameByLetter } from './apps/DriveProps'
import { PROGRAMS, recommendedProgs } from './apps/OpenWith'

/* ─────────── 通用文本编辑右键菜单（XP 风格） ─────────── */
/* 适用于 <input> / <textarea>：撤消 / 剪切 / 复制 / 粘贴 / 删除 / 全选 */

export function editCtxItems(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  extra: CtxItem[] = [],
): CtxItem[] {
  if (!el) {
    return [
      { label: '剪切(T)', accelerator: 'Ctrl+X', disabled: true },
      { label: '复制(C)', accelerator: 'Ctrl+C', disabled: true },
      { label: '粘贴(P)', accelerator: 'Ctrl+V', disabled: true },
    ]
  }
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const hasSel = end > start
  const canPaste = (navigator.clipboard && 'clipboard' in navigator) || document.queryCommandSupported?.('paste')

  const doc = (cmd: string) => {
    try {
      document.execCommand(cmd)
    } catch {
      /* ignore */
    }
  }

  const items: CtxItem[] = [
    { label: '撤消(U)', accelerator: 'Ctrl+Z', disabled: el.readOnly, onClick: () => doc('undo') },
    { separator: true },
    { label: '剪切(T)', accelerator: 'Ctrl+X', disabled: !hasSel || el.readOnly, onClick: () => doc('cut') },
    { label: '复制(C)', accelerator: 'Ctrl+C', disabled: !hasSel, onClick: () => doc('copy') },
    { label: '粘贴(P)', accelerator: 'Ctrl+V', disabled: !canPaste || el.readOnly, onClick: () => doc('paste') },
    { label: '删除(D)', accelerator: 'Del', disabled: !hasSel || el.readOnly, onClick: () => doc('delete') },
    { separator: true },
    {
      label: '全选(A)',
      accelerator: 'Ctrl+A',
      onClick: () => {
        el.focus()
        el.select()
      },
    },
  ]
  if (extra.length > 0) return [...items, { separator: true }, ...extra]
  return items
}

/* 便捷 handler：给输入元素的 onContextMenu 用 */
export function openEditCtx(e: React.MouseEvent, extra?: CtxItem[]) {
  e.preventDefault()
  e.stopPropagation()
  const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement
  useXP.getState().openCtx(e.clientX, e.clientY, editCtxItems(el, extra))
}

/* ─────────── 窗口系统菜单（标题栏右键 / Alt+Space / 任务按钮右键共用） ─────────── */
export function windowSysMenu(win: WinState, appResizable = true): CtxItem[] {
  const st = useXP.getState()
  const items: CtxItem[] = [
    {
      label: '还原(R)',
      accelerator: 'Alt+R',
      disabled: !win.maximized,
      onClick: () => st.toggleMaximize(win.id),
    },
    {
      label: '移动(M)',
      accelerator: 'Alt+M',
      disabled: win.maximized,
      onClick: () => {
        /* 进入键盘移动模式由 XPWindow 处理：此处直接聚焦并提示可用方向键 */
        st.focusWindow(win.id)
        window.dispatchEvent(new CustomEvent('xp-win-move', { detail: { id: win.id } }))
      },
    },
    {
      label: '大小(S)',
      accelerator: 'Alt+S',
      disabled: win.maximized || !appResizable,
      onClick: () => {
        st.focusWindow(win.id)
        window.dispatchEvent(new CustomEvent('xp-win-size', { detail: { id: win.id } }))
      },
    },
    { label: '最小化(N)', accelerator: 'Alt+N', onClick: () => st.minimizeWindow(win.id) },
    {
      label: '最大化(X)',
      accelerator: 'Alt+X',
      disabled: win.maximized || !appResizable,
      onClick: () => st.toggleMaximize(win.id),
    },
    { separator: true },
    {
      label: '关闭(C)',
      accelerator: 'Alt+F4',
      bold: true,
      onClick: () => st.closeWindow(win.id),
    },
  ]
  return items
}

/* ─────────── 页面主体（非输入元素）通用右键：后退/前进/刷新等由调用方拼装 ─────────── */
export function openMenuAt(x: number, y: number, items: CtxItem[]) {
  useXP.getState().openCtx(Math.round(x), Math.round(y), items)
}

/* ─────────── 右键拖放释放菜单（XP 经典行为） ─────────── */
/* 按住右键拖动文件到目标上释放 → 移动/复制/创建快捷方式/取消 */
export function rightDragMenu(
  x: number,
  y: number,
  paths: string[][],
  dest: string[],
  destLabel: string,
  handlers: {
    move: () => void
    copy: () => void
    shortcut: () => void
  },
  recycle = false,
): void {
  const st = useXP.getState()
  const items: CtxItem[] = recycle
    ? [
        { label: '移动到当前位置(M)', bold: true, onClick: handlers.move },
        { separator: true },
        { label: '取消', onClick: () => undefined },
      ]
    : [
        { label: '移动到当前位置(M)', bold: true, onClick: handlers.move },
        { label: '复制到当前位置(C)', onClick: handlers.copy },
        { label: '在当前位置创建快捷方式(S)', onClick: handlers.shortcut },
        { separator: true },
        { label: '取消', onClick: () => undefined },
      ]
  void paths
  void dest
  void destLabel
  st.openCtx(Math.round(x), Math.round(y), items)
}

/* ─────────── 发送到(N) 子菜单（XP 真实五项） ─────────── */
export function sendToItems(srcParentPath: string[], name: string): CtxItem[] {
  const st = useXP.getState()
  const path = [...srcParentPath, name]
  return [
    {
      label: '3.5 英寸软盘 (A:)',
      onClick: () => {
        const aName = driveNameByLetter('A:', st.fsTree)
        const a = resolvePath([aName], st.fsTree)
        if (!a || a.error) {
          st.openApp('dialog', { kind: 'error', title: name, text: '无法访问 A:。\n\n设备未就绪。\n\n请插入软盘后重试（或先格式化一张软盘）。' })
          return
        }
        /* XP 行为：发送到软盘 = 复制（原文件保留） */
        st.setClipboard('copy', [path])
        st.fsPaste([aName])
        st.showToast(`正在将 "${name}" 复制到 A:...（已完成）`)
      },
    },
    {
      label: '桌面快捷方式',
      onClick: () => {
        /* 发送到当前登录帐户的桌面（每帐户独立） */
        const DESKTOP = userDesktopPath(st.sessionUser)
        const n = st.fsCreateShortcut(DESKTOP, path)
        st.showToast(n ? `已在桌面创建 "${n}"` : '创建失败')
      },
    },
    {
      label: '邮件接收者',
      onClick: () => {
        st.openApp('oecompose', { attach: name })
      },
    },
    {
      label: '压缩(zipped)文件夹',
      onClick: () => {
        const base = name.replace(/\.[^.]+$/, '')
        const zname = `${base}.zip`
        /* XP 原生压缩：zip 内填充源文件副本（双击可进入压缩文件夹浏览/提取） */
        const src = resolvePath(path, st.fsTree)
        const children = src ? (src.children ?? [src]).map((c) => structuredClone(c)) : undefined
        st.fsCreateFile(srcParentPath, zname, { icon: 'zip', type: '压缩(zipped)文件夹', children })
        st.showToast(`已创建压缩文件夹 "${zname}"`)
      },
    },
    {
      label: '我的文档',
      onClick: () => {
        /* 发送到当前登录帐户的「我的文档」（每帐户独立） */
        const MYDOCS = myDocsPath(st.sessionUser)
        st.fsMove([path], MYDOCS)
        st.showToast(`已将 "${name}" 发送到我的文档`)
      },
    },
  ]
}

/* ─────────── 打开方式(H) 子菜单（XP 真实行为） ─────────── */
/* 文件右键菜单：顶部 = 当前关联程序（粗体），其后推荐程序，末尾「选择程序(C)...」 */
export function openWithItems(srcParentPath: string[], name: string, nodeIcon?: string): CtxItem[] {
  const st = useXP.getState()
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  /* 「始终使用」写入的扩展级关联优先 */
  const assocApp = ext ? st.extAssoc[ext] : undefined
  const recs = recommendedProgs(nodeIcon).filter((p) => p.id !== assocApp)
  const assocProg = PROGRAMS.find((p) => p.id === assocApp)
  /* 解析真实节点（带上 content/src，记事本/画图打开不丢内容） */
  const node = resolvePath([...srcParentPath, name], st.fsTree)
  const data = { name, content: node?.content, src: node?.src }
  const items: CtxItem[] = []
  if (assocProg) items.push({ label: assocProg.name, bold: true, onClick: () => assocProg.open(data, srcParentPath) })
  items.push(
    ...recs.map((p) => ({
      label: p.name,
      onClick: () => p.open(data, srcParentPath),
    })),
    { separator: true },
    {
      label: '选择程序(C)...',
      onClick: () => st.openApp('openwith', { parentPath: srcParentPath, name, mode: 'choose' }, '打开方式'),
    },
  )
  return items
}
