'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { DEFAULT_VISUAL_FX, type VisualFXOpts } from '../model'
import { XPButton, GroupBox, XPRadio, XPCheck } from '../ui'
import { playClick } from '../sounds'

/* ═══════════════════════════════════════════════════════════════
 * 性能选项（sysdm.cpl → 高级 → 性能 → 设置）
 * XP「视觉效果」页：四预设单选 + 自定义复选清单。
 * winAnim / menuFade / menuShadow 三项真实控制系统动画（body class 驱动）。
 * ═══════════════════════════════════════════════════════════════ */

type Preset = 'letWindows' | 'bestLook' | 'bestPerf' | 'custom'

const ALL_ON: VisualFXOpts = { ...DEFAULT_VISUAL_FX }
/* 「让 Windows 选择」：XP 出厂默认（指针阴影关，其余开） */
const WINDOWS_CHOICE: VisualFXOpts = { ...DEFAULT_VISUAL_FX, cursorShadow: false }
const ALL_OFF: VisualFXOpts = {
  dragWindowContents: false,
  winAnim: false,
  smoothScroll: false,
  menuFade: false,
  slideCombo: false,
  menuShadow: false,
  cursorShadow: false,
  visualStyles: false,
}

function presetOf(v: VisualFXOpts): Preset {
  if (eq(v, WINDOWS_CHOICE)) return 'letWindows'
  if (eq(v, ALL_ON)) return 'bestLook'
  if (eq(v, ALL_OFF)) return 'bestPerf'
  return 'custom'
}
const eq = (a: VisualFXOpts, b: VisualFXOpts) => JSON.stringify(a) === JSON.stringify(b)

const FX_ITEMS: Array<{ key: keyof VisualFXOpts; label: string }> = [
  { key: 'dragWindowContents', label: '拖动时显示窗口内容(D)' },
  { key: 'winAnim', label: '窗口最小化和最大化时显示动画(W)' },
  { key: 'smoothScroll', label: '平滑滚动列表框(S)' },
  { key: 'menuFade', label: '淡入淡出或滑动菜单到视图(F)' },
  { key: 'slideCombo', label: '滑动打开组合框(L)' },
  { key: 'menuShadow', label: '在菜单下显示阴影(M)' },
  { key: 'cursorShadow', label: '在鼠标指针下显示阴影(U)' },
  { key: 'visualStyles', label: '在窗口和按钮上使用视觉样式(V)' },
]

export default function PerfOptions({ win: _win }: { win: WinState }) {
  const visualFX = useXP((s) => s.visualFX)
  const setVisualFX = useXP((s) => s.setVisualFX)
  const closeWindow = useXP((s) => s.closeWindow)
  const id = _win.id
  /* 本地草稿（确定才落库——XP 真实行为：复选即时生效仅「应用」后） */
  const [draft, setDraft] = useState<VisualFXOpts>({ ...visualFX })
  const preset = presetOf(draft)

  const apply = () => {
    setVisualFX(draft)
  }
  const ok = () => {
    apply()
    playClick()
    closeWindow(id)
  }
  const setPreset = (p: Preset) => {
    if (p === 'letWindows') setDraft({ ...WINDOWS_CHOICE })
    else if (p === 'bestLook') setDraft({ ...ALL_ON })
    else if (p === 'bestPerf') setDraft({ ...ALL_OFF })
    playClick()
  }
  const toggle = (k: keyof VisualFXOpts) => setDraft((d) => ({ ...d, [k]: !d[k] }))

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] font-normal xp-font">
      <div className="px-3 pt-3 pb-1 flex-1 overflow-auto">
        <GroupBox title="选择最佳外观设置">
          <div className="flex flex-col gap-[7px] pt-1 pb-2 px-1">
            <XPRadio checked={preset === 'letWindows'} label="让 Windows 选择计算机的最佳设置" onChange={() => setPreset('letWindows')} />
            <XPRadio checked={preset === 'bestLook'} label="调整为最佳外观" onChange={() => setPreset('bestLook')} />
            <XPRadio checked={preset === 'bestPerf'} label="调整为最佳性能" onChange={() => setPreset('bestPerf')} />
            <XPRadio checked={preset === 'custom'} label="自定义(C)" onChange={() => setPreset('custom')} />
          </div>
        </GroupBox>

        <div className="mt-2 mb-1 text-[11px]">或从以下列表选择个项目:</div>
        <div className="border border-[#919b9c] bg-white rounded-[1px] py-[6px] px-2">
          {FX_ITEMS.map((it) => (
            <div key={it.key} className="py-[2px]">
              <XPCheck checked={draft[it.key]} label={it.label} onChange={() => toggle(it.key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 p-2 border-t border-[#d8d4c8] bg-[#ece9d8]">
        <XPButton onClick={ok}>确定</XPButton>
        <XPButton onClick={() => { setDraft({ ...visualFX }); playClick() }}>取消</XPButton>
        <XPButton
          onClick={() => {
            apply()
            playClick()
          }}
        >
         应用(A)
        </XPButton>
      </div>
    </div>
  )
}
