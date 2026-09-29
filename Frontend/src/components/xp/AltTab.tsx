'use client'

import React from 'react'
import { useXP } from './store'
import { APP_REGISTRY } from './registry'

/* XP 经典 Alt+Tab 任务切换面板（深蓝渐变 + 图标网格 + 标题条） */
export default function AltTab() {
  const altTab = useXP((s) => s.altTab)
  const windows = useXP((s) => s.windows)

  if (!altTab.open) return null
  const list = windows.filter((w) => !w.noTaskbar).sort((a, b) => b.z - a.z)
  if (list.length === 0) return null
  const idx = ((altTab.index % list.length) + list.length) % list.length
  const sel = list[idx]

  const cols = Math.min(list.length, 8)
  const cellW = 52
  const cellH = 56
  const panelW = cols * cellW + 24
  const rows = Math.ceil(list.length / cols)

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/10" style={{ pointerEvents: 'none' }}>
      <div
        className="rounded-[6px] overflow-hidden xp-alttab-shadow"
        style={{ width: panelW }}
      >
        <div className="px-3 py-[7px] bg-gradient-to-b from-[#2a70d0] to-[#1648a0] border-b border-[#0a2a70]">
          <div className="text-white text-[11px] font-bold truncate" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {sel.title}
          </div>
        </div>
        <div className="p-2 bg-gradient-to-b from-[#3a6ea5] to-[#254a80]">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cellW}px)` }}>
            {Array.from({ length: rows }).map((_, r) =>
              list.slice(r * cols, r * cols + cols).map((w, c) => {
                const i = r * cols + c
                const reg = APP_REGISTRY[w.app] ?? APP_REGISTRY.dialog
                const Icon = reg.icon
                const active = i === idx
                return (
                  <div
                    key={w.id}
                    className={`flex flex-col items-center justify-center rounded-[4px] ${active ? 'bg-white/25 border border-[#e8f0ff]' : 'border border-transparent'}`}
                    style={{ width: cellW - 6, height: cellH - 6, margin: 3 }}
                  >
                    <Icon size={30} />
                    {active ? <div className="text-[9px] text-white mt-[2px] truncate w-full text-center px-1">{i + 1}</div> : null}
                  </div>
                )
              }),
            )}
          </div>
        </div>
        <div className="px-3 py-[4px] bg-gradient-to-b from-[#1648a0] to-[#0a2a70] border-t border-[#0a2a70] text-[10px] text-white/70">
          按 Alt+Tab 切换 · 松开 Alt 选择 · 共 {list.length} 个窗口
        </div>
      </div>
    </div>
  )
}
