'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, XPCheck } from '../ui'

/* ─────────── 垂直滑块（XP 音量控制） ─────────── */
function VSlider({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const trackH = 92
  const ballY = trackH - (value / 100) * trackH
  return (
    <div
      className="relative w-[20px] mx-auto select-none"
      style={{ height: trackH + 16 }}
      onPointerDown={(e) => {
        if (disabled) return
        const el = e.currentTarget.getBoundingClientRect()
        const move = (cy: number) => {
          const v = Math.max(0, Math.min(100, Math.round(((trackH + 8 - (cy - el.top)) / trackH) * 100)))
          onChange(v)
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
      {/* 轨道 */}
      <div className="absolute left-[8px] top-[8px] w-[4px] rounded bg-[#d0cfc8] border-l border-t border-[#f4f2e8] border-r border-b border-[#8a8878]" style={{ height: trackH }} />
      {/* 滑块球 */}
      <div
        className="absolute left-0 w-[20px] h-[11px] rounded-[2px] bg-gradient-to-b from-[#f8f6ee] to-[#c8c6ba] border border-[#8a8878] shadow-[1px_1px_1px_rgba(0,0,0,0.25)]"
        style={{ top: ballY + 2 }}
      >
        <div className="mx-auto mt-[4px] w-[8px] h-[1px] bg-[#8a8878]" />
      </div>
    </div>
  )
}

interface Ch {
  label: string
  value: number
  mute: boolean
  balance: number
}

export default function VolumeControl({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const setVolume = useXP((s) => s.setMasterVolume)
  const [ch, setCh] = useState<Ch[]>([
    { label: '主音量', value: 72, mute: false, balance: 0 },
    { label: '波形', value: 64, mute: false, balance: 0 },
    { label: '软件合成器', value: 58, mute: false, balance: 0 },
    { label: 'CD 唱机', value: 80, mute: false, balance: 0 },
    { label: '线路输入', value: 50, mute: false, balance: 0 },
  ])
  const [advanced, setAdvanced] = useState(true)

  const upd = (i: number, patch: Partial<Ch>) => {
    setCh((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)))
    if (i === 0 && patch.value !== undefined && !ch[0].mute) setVolume(patch.value)
    if (i === 0 && patch.mute !== undefined) setVolume(patch.mute ? 0 : ch[0].value)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '选项(O)', items: [{ label: '属性(P)...', onClick: () => showToast('音频属性：Realtek AC\'97（复刻）') }, { label: '高级控制(C)', checked: advanced }] },
          { label: '帮助(H)', items: [{ label: '关于音量控制', onClick: () => showToast('Windows 音量控制 Web 复刻版\n主音量滑块真实联动 WebAudio 音量') }] },
        ]}
      />
      {/* 标签行 */}
      <div className="flex border-b border-[#d8d5c8] bg-[#ece9d8]">
        <div className="flex items-center justify-center w-[26px] border-r border-[#d8d5c8]" />
        {ch.map((c) => (
          <div key={c.label} className="flex-1 text-center py-[3px] border-r border-[#d8d5c8] font-bold truncate px-1">
            {c.label}
          </div>
        ))}
      </div>
      {/* 均衡滑块行 */}
      <div className="flex border-b border-[#d8d5c8] bg-[#ece9d8]">
        <div className="flex items-center justify-center w-[26px] border-r border-[#d8d5c8] text-[9px] text-[#5a5a4a]">平衡</div>
        {ch.map((c, i) => (
          <div key={c.label} className="flex-1 flex items-center justify-center py-[6px] border-r border-[#d8d5c8] px-1">
            <div className="relative w-[110px] h-[14px]">
              <div className="absolute left-0 right-0 top-[6px] h-[3px] bg-[#d0cfc8] border-l border-t border-[#f4f2e8] border-r border-b border-[#8a8878]" />
              <div className="absolute top-0 w-[7px] h-[14px] rounded-[1px] bg-gradient-to-b from-[#f8f6ee] to-[#c8c6ba] border border-[#8a8878]" style={{ left: 55 - 3 }} />
              <div className="absolute left-1/2 -translate-x-1/2 top-[2px] w-[1px] h-[10px] bg-[#5a5a4a]" />
            </div>
          </div>
        ))}
      </div>
      {/* 音量滑块行 */}
      <div className="flex-1 flex bg-[#ece9d8] min-h-0">
        <div className="flex items-center justify-center w-[26px] border-r border-[#d8d5c8] text-[9px] text-[#5a5a4a]" style={{ writingMode: 'vertical-rl' }}>
          音量
        </div>
        {ch.map((c, i) => (
          <div key={c.label} className="flex-1 flex flex-col items-center pt-[10px] border-r border-[#d8d5c8] px-1">
            <VSlider value={c.mute ? 0 : c.value} onChange={(v) => upd(i, { value: v, mute: false })} />
          </div>
        ))}
      </div>
      {/* 静音行 */}
      <div className="flex border-t border-b border-[#d8d5c8] bg-[#ece9d8] pb-1 pt-1">
        <div className="w-[26px] border-r border-[#d8d5c8]" />
        {ch.map((c, i) => (
          <div key={c.label} className="flex-1 flex justify-center border-r border-[#d8d5c8]">
            <XPCheck checked={c.mute} label="静音" onChange={() => upd(i, { mute: !c.mute })} />
          </div>
        ))}
      </div>
      <div className="flex justify-end p-1">
        <XPButton primary onClick={() => closeWindow(win.id)}>
          确定
        </XPButton>
        <div className="w-[4px]" />
        <XPButton onClick={() => closeWindow(win.id)}>退出(X)</XPButton>
      </div>
    </div>
  )
}
