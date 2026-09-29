'use client'

import React from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton } from '../ui'
import { TextFileIcon, ImageFileIcon, ExeFileIcon } from '../app-icons'
import { formatBytes } from '../fs'

/* 属性对话框：常规选项卡（类型/位置/大小/日期/属性） */

interface PropsSnapshot {
  name: string
  type: string
  size?: string
  stats?: { files: number; folders: number; bytes: number }
  path: string
  modified?: string
  created?: string
  readonly?: boolean
  icon?: string
  appId?: string
}

function fmt(iso?: string): string {
  if (!iso) return '2001 年 10 月 25 日, 10:00:00'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function FileProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const ps = (win.props as unknown as PropsSnapshot) ?? { name: '未知', type: '文件', path: '' }

  const isFolder = ps.stats !== undefined
  const sizeLine = isFolder
    ? `大小: ${formatBytes(ps.stats!.bytes || 1)} (${ps.stats!.bytes || 0} 字节)`
    : `大小: ${ps.size ?? '1 KB'}`
  const contains = isFolder
    ? `包含: ${ps.stats!.files} 个文件, ${ps.stats!.folders} 个文件夹`
    : null

  const BigIcon =
    ps.appId === 'notepad' || ps.icon === 'text' ? TextFileIcon : ps.icon === 'image' || ps.icon === 'bmp' ? ImageFileIcon : ps.appId ? ExeFileIcon : null

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      {/* 选项卡 */}
      <div className="flex items-end px-2 pt-2 gap-[2px] border-b border-[#a0a090]">
        <div className="px-[10px] h-[21px] text-[11px] rounded-t-[3px] border border-b-0 bg-[#ece9d8] border-[#a0a090] relative z-10 -mb-[1px] pb-[1px]">
          常规
        </div>
        {isFolder ? <div className="px-[10px] h-[21px] text-[11px] rounded-t-[3px] bg-gradient-to-b from-[#f4f2e8] to-[#dcddd0] border border-b-0 border-[#b0b0a0] text-[#8a8a8a]">共享</div> : null}
      </div>

      <div className="flex-1 p-3 overflow-y-auto xp-thin-scroll">
        {/* 图标 + 名称 */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#d8d5c8]">
          {BigIcon ? <BigIcon size={44} /> : (
            <svg width="44" height="44" viewBox="0 0 32 32">
              <path d="M2 8 Q2 5 5 5 h9 l3 3 h13 q3 0 3 3 v15 q0 3 -3 3 H5 q-3 0 -3 -3 Z" fill="#f5c753" stroke="#a07818" strokeWidth="1" />
            </svg>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[#1a1a1a] truncate">{ps.name}</div>
            {ps.appId ? <div className="text-[10px] text-[#8a8a8a] truncate">{ps.appId}.exe</div> : null}
          </div>
        </div>

        {/* 信息列表 */}
        <div className="pt-3 space-y-[6px] text-[11px] text-[#2a2a2a]">
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">类型:</span>
            <span className="flex-1 truncate">{ps.type}</span>
          </div>
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">位置:</span>
            <span className="flex-1 truncate">{ps.path.replace(/\//g, ' \\ ')}</span>
          </div>
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">大小:</span>
            <span className="flex-1">{sizeLine}</span>
          </div>
          {contains ? (
            <div className="flex">
              <span className="w-[80px] shrink-0" />
              <span className="flex-1">{contains}</span>
            </div>
          ) : null}
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">创建时间:</span>
            <span className="flex-1">{fmt(ps.created ?? '2001-10-25T10:00:00')}</span>
          </div>
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">修改时间:</span>
            <span className="flex-1">{fmt(ps.modified ?? '2001-10-25T10:00:00')}</span>
          </div>
          <div className="flex">
            <span className="w-[80px] shrink-0 text-right pr-3 text-[#5a5a4a]">访问时间:</span>
            <span className="flex-1">{fmt()}</span>
          </div>
        </div>

        {/* 属性复选框 */}
        <div className="mt-3 pt-3 border-t border-[#d8d5c8] space-y-[4px]">
          <div className="text-[11px] text-[#5a5a4a] mb-1">属性:</div>
          <label className="flex items-center gap-[6px] text-[11px] cursor-default">
            <span className="xp-checkbox" aria-checked={!!ps.readonly}>
              {ps.readonly ? (
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 6.5 L4.8 9.5 L10 3" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                </svg>
              ) : null}
            </span>
            只读(R)
          </label>
          <label className="flex items-center gap-[6px] text-[11px] cursor-default">
            <span className="xp-checkbox" />
            隐藏(H)
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-3 py-2 border-t border-[#d8d5c8]">
        <XPButton primary autoFocus onClick={() => closeWindow(win.id)}>
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}
