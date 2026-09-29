'use client'

import React, { useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { playClick } from '../sounds'

/* 字符映射表：字体选择 + 字符网格 + 复制 */

const FONTS: Array<[string, string]> = [
  ['宋体 SimSun', "'Noto Serif SC', serif"],
  ['黑体 SimHei', "'Noto Sans SC', sans-serif"],
  ['楷体 KaiTi', "'LXGW WenKai', serif"],
  ['微软雅黑 Microsoft YaHei', "'Noto Sans SC', sans-serif"],
  ['Arial', 'Arial, sans-serif'],
  ['Courier New', "'Courier New', monospace"],
]

function buildChars(): string[] {
  const out: string[] = []
  /* ASCII 可打印区 */
  for (let c = 0x20; c <= 0x7e; c++) out.push(String.fromCharCode(c))
  /* 全角标点与符号 */
  for (let c = 0xff00; c <= 0xff5e; c++) out.push(String.fromCharCode(c))
  /* CJK 常用汉字（前 2800 个） */
  for (let c = 0x4e00; c < 0x4e00 + 2800; c++) out.push(String.fromCharCode(c))
  return out
}

const ALL_CHARS = buildChars()

export default function CharMap({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [fontIdx, setFontIdx] = useState(1)
  const [picked, setPicked] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const font = FONTS[fontIdx][1]
  const chars = useMemo(() => ALL_CHARS, [])

  const doCopy = async () => {
    if (!picked) {
      showToast('请先单击字符将它们加入「复制的字符」')
      return
    }
    try {
      await navigator.clipboard.writeText(picked)
      showToast(`已复制「${picked.slice(0, 12)}${picked.length > 12 ? '…' : ''}」到剪贴板`)
    } catch {
      showToast('复制失败：浏览器剪贴板权限被拒绝')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-2 gap-2">
      {/* 字体选择 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#3a3a2a]">字体(F):</span>
        <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
          <select
            className="flex-1 text-[11px] outline-none bg-transparent h-[18px]"
            value={fontIdx}
            onChange={(e) => setFontIdx(Number(e.target.value))}
          >
            {FONTS.map((f, i) => (
              <option key={f[0]} value={i}>
                {f[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 字符网格 */}
      <div className="flex-1 min-h-0 flex gap-2">
        <div className="xp-sunken bg-white flex-1 overflow-auto xp-thin-scroll p-[2px]">
          <div className="grid gap-[1px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(21px, 1fr))' }}>
            {chars.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                className={`h-[21px] text-[12px] leading-none flex items-center justify-center hover:bg-[#cfe0f5] ${selected === `${i}` ? 'bg-[#99b8e8]' : ''}`}
                style={{ fontFamily: font }}
                onClick={() => {
                  setPicked((p) => p + c)
                  setSelected(`${i}`)
                  playClick()
                }}
                title={`U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`}
              >
                {c === ' ' ? '\u00A0' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 复制的字符 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#3a3a2a] shrink-0">复制的字符(C):</span>
        <div className="xp-sunken bg-white flex-1 h-[24px] flex items-center px-1">
          <input
            className="flex-1 text-[13px] outline-none min-w-0"
            style={{ fontFamily: font }}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="xp-btn px-3 h-[23px] text-[11px]" onClick={() => { setPicked(''); setSelected(null) }}>
          清除
        </button>
        <button type="button" className="xp-btn px-3 h-[23px] text-[11px]" onClick={doCopy}>
          复制(P)
        </button>
        <button type="button" className="xp-btn px-3 h-[23px] text-[11px]" onClick={() => closeWindow(win.id)}>
          关闭(X)
        </button>
      </div>
      <div className="text-[10px] text-[#8a8a8a]">
        {selected ? `已选字符 U+${chars[Number(selected)].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}` : '单击字符即可加入复制栏 · 共 2,895 个字符（含常用汉字）'}
      </div>
    </div>
  )
}
