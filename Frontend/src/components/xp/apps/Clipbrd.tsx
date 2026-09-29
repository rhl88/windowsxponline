'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { Bmp } from '../bmp'
import { playClick } from '../sounds'
import { userDesktopPath } from '../fs'

/* ═══════════ 剪贴板查看器（clipbrd.exe） ═══════════
   XP 真实布局：左侧格式列表 + 右侧内容区
   数据源：store.clipboard（文件剪切/复制）+ 浏览器文本剪贴板（需授权读取）
   删除(D) = 清空剪贴板（粘贴随之失效，与真实 XP 一致） */

type Fmt = 'auto' | 'shell' | 'fgd' | 'effect' | 'text'

const FMT_LABEL: Record<Fmt, string> = {
  auto: '自动',
  shell: 'Shell IDList Array',
  fgd: 'FileGroupDescriptorW',
  effect: 'Preferred DropEffect',
  text: '文本 (Unicode)',
}

export default function Clipbrd({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const clipboard = useXP((s) => s.clipboard)
  const setClipboard = useXP((s) => s.setClipboard)
  const showToast = useXP((s) => s.showToast)
  /* 保存目标为登录帐户桌面（每帐户独立） */
  const DESKTOP_PATH = userDesktopPath(useXP((s) => s.sessionUser))
  const fsCreateFile = useXP((s) => s.fsCreateFile)
  const [fmt, setFmt] = useState<Fmt>('auto')
  const [text, setText] = useState<string | null>(null)

  /* 尝试读取浏览器文本剪贴板（需授权；失败保持 null） */
  const readText = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText()
      setText(t)
    } catch {
      setText(null)
    }
  }, [])

  /* 初始延迟读取（避开 effect 内同步 setState；窗口聚焦时也刷新一次） */
  useEffect(() => {
    const t = window.setTimeout(() => void readText(), 60)
    const onFocus = () => void readText()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [readText])

  const hasFiles = clipboard !== null && clipboard.paths.length > 0
  const hasText = text !== null && text.length > 0

  /* 左侧格式列表：按当前剪贴板内容动态生成（XP 真实格式名） */
  const fmts: Fmt[] = []
  if (hasFiles) fmts.push('shell', 'fgd', 'effect')
  if (hasText) fmts.push('text')
  const cur: Fmt = fmts.includes(fmt) ? fmt : 'auto'

  /* 删除 = 清空剪贴板（Del 快捷键 + 菜单） */
  const doDelete = useCallback(() => {
    setClipboard('copy', [])
    try {
      void navigator.clipboard.writeText('')
    } catch {
      /* 无权限时忽略（文件剪贴板已清空） */
    }
    setText(null)
    playClick()
    showToast('剪贴板已清空')
  }, [setClipboard, showToast])

  /* 另存为 = 落盘 .clp 文件到桌面（XP 的剪贴板文件格式） */
  const doSave = () => {
    const n = fsCreateFile(DESKTOP_PATH, '剪贴板.clp', { icon: 'text', type: '剪贴板文件' })
    showToast(n ? `已将剪贴板保存到桌面 "${n}"` : '保存失败')
  }

  /* 渲染内容区 */
  const renderBody = () => {
    if (cur === 'text' || (cur === 'auto' && !hasFiles && hasText)) {
      return (
        <div className="p-2 text-[11px] whitespace-pre-wrap break-all select-text leading-[16px] font-mono">
          {text ?? '（无文本内容）'}
        </div>
      )
    }
    if (hasFiles) {
      return (
        <div className="p-2 space-y-[6px] text-[11px]">
          {cur === 'effect' ? (
            <div className="leading-[16px]">
              <div>Preferred DropEffect: {clipboard!.op === 'copy' ? '2 (COPY)' : '3 (MOVE)'}</div>
              <div className="text-[#5a5a4a] mt-1">拖放时将执行的操作：{clipboard!.op === 'copy' ? '复制' : '移动'}</div>
            </div>
          ) : cur === 'shell' ? (
            <div className="leading-[16px] text-[#2a2a2a]">
              <div className="font-bold mb-1">Shell IDList Array ({clipboard!.paths.length} 项)</div>
              {clipboard!.paths.map((p, i) => (
                <div key={i} className="pl-2 text-[#5a5a4a]">pidl[{i}]: {p.join('\\')}</div>
              ))}
            </div>
          ) : (
            <div className="space-y-[4px]">
              <div className="font-bold">{clipboard!.op === 'copy' ? '复制的文件:' : '剪切的文件:'}</div>
              {clipboard!.paths.map((p, i) => {
                const name = p[p.length - 1]
                return (
                  <div key={i} className="flex items-center gap-2 px-2 py-[3px] rounded-[2px] hover:bg-[#e8f0fb]">
                    <Bmp name="txt" size={16} />
                    <span className="flex-1">{name}</span>
                    <span className="text-[#5a5a4a]">{p.slice(0, -1).join('\\') || '桌面'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }
    if (hasText) {
      /* auto 且文件剪贴板为空但有文本 */
      return (
        <div className="p-2 text-[11px] whitespace-pre-wrap break-all select-text leading-[16px] font-mono">
          {text ?? ''}
        </div>
      )
    }
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-[#8a8a8a] text-[11px]">
        <Bmp name="txt" size={32} />
        <div>剪贴板为空</div>
        <button type="button" className="text-[#1145c4] hover:underline" onClick={() => void readText()}>
          刷新（读取系统文本剪贴板）
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]" onContextMenu={(e) => e.preventDefault()}>
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '另存为(A)...', disabled: !hasFiles && !hasText, onClick: doSave },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [{ label: '删除(D)', accelerator: 'Del', disabled: !hasFiles && !hasText, onClick: doDelete }],
          },
          {
            label: '显示(V)',
            items: [
              { label: '自动(A)', checked: cur === 'auto', onClick: () => setFmt('auto') },
              ...(fmts.includes('shell') ? [{ label: FMT_LABEL.shell, checked: cur === 'shell', onClick: () => setFmt('shell') }] : []),
              ...(fmts.includes('fgd') ? [{ label: FMT_LABEL.fgd, checked: cur === 'fgd', onClick: () => setFmt('fgd') }] : []),
              ...(fmts.includes('effect') ? [{ label: FMT_LABEL.effect, checked: cur === 'effect', onClick: () => setFmt('effect') }] : []),
              ...(fmts.includes('text') ? [{ label: FMT_LABEL.text, checked: cur === 'text', onClick: () => setFmt('text') }] : []),
            ],
          },
          {
            label: '帮助(H)',
            items: [
              {
                label: '关于剪贴板(A)...',
                onClick: () =>
                  useXP.getState().openApp('dialog', {
                    kind: 'info',
                    title: '关于剪贴板',
                    text: '剪贴板查看器（clipbrd.exe）\n版本 5.1 (Build 2600)\n\n实时显示当前剪贴板内容：\n文件列表（复制/剪切）与文本。',
                  }),
              },
            ],
          },
        ]}
      />
      <div className="flex-1 flex min-h-0">
        {/* 左：格式列表（XP 真实「显示」框） */}
        <div className="w-[170px] shrink-0 border-r border-[#d8d5c8] p-2">
          <div className="font-bold text-[#1a3f8f] mb-1">显示</div>
          <div className="xp-sunken bg-white h-full max-h-[220px] overflow-y-auto xp-thin-scroll">
            <div
              className={`px-2 py-[2px] cursor-default ${cur === 'auto' ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
              onClick={() => setFmt('auto')}
            >
              自动
            </div>
            {fmts.map((f) => (
              <div
                key={f}
                className={`px-2 py-[2px] cursor-default ${cur === f ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8eef8]'}`}
                onClick={() => setFmt(f)}
              >
                {FMT_LABEL[f]}
              </div>
            ))}
            {fmts.length === 0 ? <div className="px-2 py-[2px] text-[#8a8a8a]">（无格式）</div> : null}
          </div>
        </div>
        {/* 右：内容区 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll min-w-0">{renderBody()}</div>
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a] justify-between">
        <span>{hasFiles ? `${clipboard!.paths.length} 个文件（${clipboard!.op === 'copy' ? '复制' : '剪切'}）` : hasText ? `${text!.length} 个字符` : '空'}</span>
        <XPButton onClick={() => void readText()}>刷新</XPButton>
      </div>
    </div>
  )
}
