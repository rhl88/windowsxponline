'use client'

import React, { useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP, type NotifMode } from '../store'
import { XPButton, GroupBox, XPRadio, XPCheck } from '../ui'
import { playClick } from '../sounds'
import { resolvePath, myDocsPath, type FSNode } from '../fs'
import { VolumeIcon, IEIcon, FolderIcon, MyComputerIcon, MyDocumentsIcon, NetworkIcon, RecycleBinIcon } from '../icons'
import { TextFileIcon, ImageFileIcon } from '../app-icons'
import { Bmp } from '../bmp'

/* ═══════════════════ 迷你预览图（XP 属性框顶部的"监视器"示意图） ═══════════════════ */

/* 任务栏页签预览：Bliss 风桌面 + 随复选项实时变化的 Luna 任务栏 */
function TbPreview({ qlaunch, clock, group, autohide }: { qlaunch: boolean; clock: boolean; group: boolean; autohide: boolean }) {
  return (
    <div className="w-[246px] h-[78px] mx-auto border border-[#8a867e] rounded-[2px] overflow-hidden relative select-none">
      {/* 桌面：蓝天 + 绿丘 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2f6fd0] via-[#5da4ea] to-[#9fd0f5]" />
      <svg className="absolute bottom-0 left-0 w-full" height="30" viewBox="0 0 246 30" preserveAspectRatio="none">
        <ellipse cx="205" cy="34" rx="70" ry="16" fill="#ffffff" opacity="0.5" />
        <path d="M0 30 C 40 8, 92 4, 132 12 C 175 20, 212 14, 246 22 L246 30 Z" fill="#3f9c3a" />
        <path d="M0 30 C 50 16, 100 12, 150 18 L246 30 Z" fill="#2e7d2a" opacity="0.55" />
      </svg>
      {/* 任务栏（autohide 时缩为边缘细条） */}
      <div
        className={`absolute left-0 right-0 bottom-0 h-[17px] flex items-center px-[2px] gap-[2px] border-t border-[#5b9fe8] ${autohide ? 'opacity-0' : ''}`}
        style={{ background: 'linear-gradient(to bottom, #3f8cf3 0%, #2464d4 12%, #2358c0 60%, #2f7ae0 100%)' }}
      >
        {/* 开始按钮 */}
        <div className="w-[36px] h-[14px] rounded-[4px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(to bottom, #5eac56 0%, #3c8a38 50%, #2f702c 100%)' }}>
          <span className="text-[7px] italic font-bold text-white" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>开始</span>
        </div>
        {/* 快速启动 */}
        {qlaunch ? (
          <div className="flex items-center gap-[1px] px-[2px] border-l border-r border-[#4a7ec8]/70 shrink-0">
            <span className="w-[6px] h-[8px]" /><span className="w-[6px] h-[8px]" />
          </div>
        ) : null}
        {/* 任务按钮（分组=堆叠双按钮） */}
        {group ? (
          <div className="relative flex-1 max-w-[84px] h-[13px] rounded-[3px] border border-[#1845a0] bg-gradient-to-b from-[#4f96ec] to-[#3270d8] flex items-center px-[3px]">
            <span className="w-[7px] h-[7px] rounded-[1px] bg-white/90 mr-[2px]" />
            <span className="text-[6px] text-white truncate">记事本 - 桌面备…</span>
          </div>
        ) : (
          <>
            <div className="flex-1 h-[13px] rounded-[3px] border border-[#1845a0] bg-gradient-to-b from-[#4f96ec] to-[#3270d8] flex items-center px-[3px]">
              <span className="w-[7px] h-[7px] rounded-[1px] bg-white/90 mr-[2px]" />
              <span className="text-[6px] text-white truncate">记事本 - 桌面备…</span>
            </div>
            <div className="flex-1 h-[13px] rounded-[3px] border border-[#1845a0] bg-gradient-to-b from-[#316fcd] to-[#1f55ac] flex items-center px-[3px]">
              <span className="w-[7px] h-[7px] rounded-[1px] bg-white/70 mr-[2px]" />
              <span className="text-[6px] text-white truncate">扫雷</span>
            </div>
          </>
        )}
        {/* 托盘 + 时钟 */}
        <div className="ml-auto flex items-center gap-[2px] pl-[3px] pr-[2px] h-[13px] rounded-l-[4px] bg-gradient-to-b from-[#1d5bb8] to-[#17458c] border-l border-t border-[#5b9fe8]/60 shrink-0">
          <span className="w-[7px] h-[7px] bg-white/80 rounded-[1px]" />
          {clock ? <span className="text-[6px] text-white pl-[1px]">14:30</span> : null}
        </div>
      </div>
      {/* autohide：仅剩屏幕底部细边 */}
      {autohide ? <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#2358c0]" /> : null}
    </div>
  )
}

/* 「开始」菜单页签：Luna 版缩略图 */
function LunaThumb() {
  const sessionUser = useXP((s) => s.sessionUser)
  return (
    <div className="w-[124px] h-[92px] border border-[#8a867e] rounded-[2px] overflow-hidden mx-auto select-none bg-white">
      <div className="h-[13px] rounded-t-[5px] flex items-center px-[3px]" style={{ background: 'linear-gradient(to bottom, #1d6fe0, #0f4fb8)' }}>
        <span className="w-[8px] h-[8px] rounded-[1px] bg-white/90" />
        <span className="text-[5px] font-bold text-white ml-[2px]">{sessionUser}</span>
      </div>
      <div className="flex h-[58px]">
        <div className="w-[58px] p-[1px]">
          <div className="grid grid-cols-2 gap-[1px]">
            {[0, 1, 2, 3].map((i) => <span key={i} className="w-full h-[10px] rounded-[1px] bg-[#e8f0fb] flex items-center px-[1px]"><span className="w-[6px] h-[6px] rounded-[1px] bg-[#3a7bd5] mr-[1px]" /><span className="h-[2px] w-[14px] bg-[#9ab]" /></span>)}
          </div>
          <div className="h-[1px] bg-[#d0d8e8] my-[2px]" />
          {[0, 1, 2].map((i) => <span key={i} className="block w-full h-[9px] rounded-[1px] hover:bg-[#e8f0fb] flex items-center px-[1px]"><span className="w-[6px] h-[6px] rounded-[1px] bg-[#5a8ac0] mr-[1px]" /><span className="h-[2px] w-[18px] bg-[#9ab]" /></span>)}
          <div className="h-[1px] bg-[#d0d8e8] my-[2px]" />
          <span className="block w-full h-[9px] bg-[#dfe9f8] rounded-[1px] flex items-center px-[1px]"><span className="h-[2px] w-[22px] bg-[#3a6ea5] ml-auto mr-[1px]" /></span>
        </div>
        <div className="w-[1px] bg-[#c8d8ee] my-[2px]" />
        <div className="flex-1 p-[1px] space-y-[1px]">
          {[0, 1, 2].map((i) => <span key={i} className="block w-full h-[9px] flex items-center px-[1px]"><span className="w-[6px] h-[6px] rounded-[1px] bg-[#c8a048] mr-[1px]" /><span className="h-[2px] w-[16px] bg-[#9ab]" /></span>)}
          <div className="h-[1px] bg-[#d0d8e8]" />
          {[0, 1].map((i) => <span key={i} className="block w-full h-[9px] flex items-center px-[1px]"><span className="w-[6px] h-[6px] rounded-[1px] bg-[#6a9ad0] mr-[1px]" /><span className="h-[2px] w-[14px] bg-[#9ab]" /></span>)}
        </div>
      </div>
      <div className="h-[13px] flex items-center justify-end gap-[2px] px-[3px] border-t border-[#f0a050]" style={{ background: 'linear-gradient(to bottom, #34a3e8, #1b62c4)' }}>
        <span className="w-[7px] h-[7px] rounded-full bg-[#7ab8f0]/80" />
        <span className="w-[7px] h-[7px] rounded-full bg-[#e05a3a]/90" />
      </div>
    </div>
  )
}

/* 「开始」菜单页签：经典版缩略图 */
function ClassicThumb() {
  return (
    <div className="w-[124px] h-[92px] border border-[#8a867e] rounded-[2px] overflow-hidden mx-auto select-none flex bg-white">
      {/* 左竖条 */}
      <div className="w-[13px] h-full relative" style={{ background: 'linear-gradient(to bottom, #0a246a, #3a6ea5 70%, #a6caf0)' }}>
        <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 text-[5px] font-bold text-white whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'translateX(-50%) rotate(180deg)' }}>Windows XP</span>
      </div>
      {/* 菜单主体 */}
      <div className="flex-1 p-[2px]">
        <div className="h-[1px] bg-[#d4d0c8] mb-[2px]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="block w-full h-[11px] rounded-[1px] hover:bg-[#316ac5] flex items-center px-[2px] mb-[1px]">
            <span className="w-[7px] h-[7px] rounded-[1px] bg-[#c8a048] mr-[2px]" />
            <span className="h-[2px] w-[24px] bg-[#789]" />
            {i === 1 ? <span className="ml-auto text-[5px] text-[#456]">▶</span> : null}
          </span>
        ))}
        <div className="h-[1px] bg-[#d4d0c8] my-[2px]" />
        <span className="block w-full h-[11px] flex items-center px-[2px] mb-[1px]">
          <span className="w-[7px] h-[7px] rounded-[1px] bg-[#5a8ac0] mr-[2px]" />
          <span className="h-[2px] w-[28px] bg-[#789]" />
          <span className="ml-auto text-[5px] text-[#456]">▶</span>
        </span>
        <div className="h-[1px] bg-[#d4d0c8] my-[2px]" />
        {[0, 1].map((i) => (
          <span key={i} className="block w-full h-[12px] rounded-[1px] bg-[#d4d0c8] flex items-center px-[2px] mb-[1px]">
            <span className={`w-[8px] h-[8px] rounded-full ${i === 0 ? 'bg-[#7ab8f0]' : 'bg-[#e05a3a]'} mr-[2px]`} />
            <span className="h-[2px] w-[30px] bg-[#667]" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ 任务栏和「开始」菜单属性 ═══════════════════ */

export function TaskbarProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const [tab, setTab] = useState<'taskbar' | 'start'>((win.props?.tab === 'start' ? 'start' : 'taskbar'))

  /* XP 行为：复选项先写入草稿，点「应用/确定」才生效，「取消」还原 */
  const st0 = useXP.getState()
  const [d, setD] = useState({
    locked: st0.taskbarLocked,
    autohide: st0.taskbarAutoHide,
    ontop: st0.taskbarOnTop,
    group: st0.taskbarGroup,
    qlaunch: st0.showQuickLaunch,
    clock: st0.showClock,
    hideInactive: st0.hideInactiveIcons,
    classic: st0.startClassic,
  })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }))

  const apply = () => {
    const a = useXP.getState()
    a.setTaskbarLocked(d.locked)
    a.setTaskbarAutoHide(d.autohide)
    a.setTaskbarOnTop(d.ontop)
    a.setTaskbarGroup(d.group)
    a.setQuickLaunch(d.qlaunch)
    a.setShowClock(d.clock)
    a.setHideInactiveIcons(d.hideInactive)
    a.setStartClassic(d.classic)
    playClick()
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      {/* 页签 */}
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['taskbar', '任务栏'], ['start', '「开始」菜单']] as const).map(([k, t]) => (
          <button
            key={k}
            type="button"
            className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
            onClick={() => { setTab(k); playClick() }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'taskbar' ? (
          <div className="space-y-2">
            <TbPreview qlaunch={d.qlaunch} clock={d.clock} group={d.group} autohide={d.autohide} />
            <GroupBox title="任务栏外观">
              <div className="space-y-[2px] p-1">
                <XPCheck checked={d.locked} label="锁定任务栏(L)" onChange={() => set('locked', !d.locked)} />
                <XPCheck checked={d.autohide} label="自动隐藏任务栏(U)" onChange={() => set('autohide', !d.autohide)} />
                <XPCheck checked={d.ontop} label="将任务栏保持在其它窗口的前端(T)" onChange={() => set('ontop', !d.ontop)} />
                <XPCheck checked={d.group} label="分组相似任务栏按钮(G)" onChange={() => set('group', !d.group)} />
                <XPCheck checked={d.qlaunch} label="显示快速启动(Q)" onChange={() => set('qlaunch', !d.qlaunch)} />
              </div>
            </GroupBox>
            <GroupBox title="通知区域">
              <div className="space-y-[2px] p-1">
                <XPCheck checked={d.clock} label="显示时钟(K)" onChange={() => set('clock', !d.clock)} />
                <XPCheck checked={d.hideInactive} label="隐藏不活动的图标(H)" onChange={() => set('hideInactive', !d.hideInactive)} />
                <div className="flex justify-end mt-[4px]">
                  <XPButton onClick={() => openApp('customnotif', {})}>自定义通知(C)...</XPButton>
                </div>
              </div>
            </GroupBox>
          </div>
        ) : (
          <div className="flex gap-2">
            <GroupBox title="「开始」菜单" className="flex-1">
              <div className="flex flex-col items-center gap-2 p-1">
                <LunaThumb />
                <XPRadio checked={!d.classic} label="「开始」菜单(S)" onChange={() => set('classic', false)} />
                <XPButton onClick={() => openApp('customstart', {})}>自定义(C)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="经典「开始」菜单" className="flex-1">
              <div className="flex flex-col items-center gap-2 p-1">
                <ClassicThumb />
                <XPRadio checked={d.classic} label="经典「开始」菜单(C)" onChange={() => set('classic', true)} />
                <XPButton onClick={() => openApp('customclassic', {})}>自定义(C)...</XPButton>
              </div>
            </GroupBox>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 pt-2 pb-1 pr-1">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={apply}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 自定义通知 ═══════════════════ */

const NOTIF_MODES: Array<[NotifMode, string]> = [
  ['always', '总是显示'],
  ['hide', '总是隐藏'],
  ['inactive', '不活动时隐藏'],
]

export function CustomizeNotif({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const notifPrefs = useXP((s) => s.notifPrefs)
  const setNotifPref = useXP((s) => s.setNotifPref)
  const trayActivity = useXP((s) => s.trayActivity)
  const hideInactive = useXP((s) => s.hideInactiveIcons)
  /* 开机时刻：未交互过的图标以此起算闲置 */
  const sessionT = useRef(Date.now()).current
  /* 图标当前是否可见（与任务栏渲染同一套语义） */
  const liveNow = (key: string, def: NotifMode) => {
    const mode = notifPrefs[key] ?? def
    if (mode === 'always') return true
    if (mode === 'hide') return false
    return !hideInactive || Date.now() - (trayActivity[key] ?? sessionT) < 45_000
  }

  const items: Array<{ key: string; name: string; icon: React.ReactNode; def: NotifMode; current: string }> = [
    { key: 'volume', name: '音量', icon: <VolumeIcon size={16} />, def: 'inactive', current: liveNow('volume', 'inactive') ? '活动' : '不活动' },
    { key: 'network', name: '本地连接', icon: <Bmp name="tray-network" size={16} />, def: 'always', current: liveNow('network', 'always') ? '活动' : '不活动' },
    {
      key: 'printer',
      name: '打印机',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3" y="2" width="10" height="4" rx="0.5" fill="#f8f8f0" stroke="#5a5a5a" strokeWidth="0.8" />
          <rect x="1.5" y="6" width="13" height="6" rx="1" fill="#d8d8d0" stroke="#5a5a5a" strokeWidth="0.8" />
          <rect x="4" y="8.5" width="8" height="5" rx="0.5" fill="#fff" stroke="#5a5a5a" strokeWidth="0.7" />
          <rect x="5" y="10" width="6" height="0.7" fill="#9ab" />
          <rect x="5" y="11.6" width="4" height="0.7" fill="#9ab" />
          <circle cx="12.6" cy="7.2" r="0.6" fill="#3a9a3a" />
        </svg>
      ),
      def: 'hide',
      current: '无',
    },
  ]
  const [sel, setSel] = useState('volume')
  const selItem = items.find((i) => i.key === sel) ?? items[0]
  const selMode = notifPrefs[selItem.key] ?? selItem.def

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3 gap-2">
      <div className="leading-[16px] text-[#1a1a1a]">
        为图标选择一个行为。
        <br />
        选择一个图标，然后在“行为”下拉列表中选择所需的行为。
      </div>
      {/* 列表 */}
      <div className="border border-[#7a9ab8] bg-white rounded-[2px] overflow-hidden">
        <div className="flex bg-[#ece9d8] border-b border-[#d8d5c8] text-[#333] font-bold">
          <div className="w-[46%] px-2 py-[3px] border-r border-[#d8d5c8]">名称</div>
          <div className="w-[33%] px-2 py-[3px] border-r border-[#d8d5c8]">行为</div>
          <div className="w-[21%] px-2 py-[3px]">当前</div>
        </div>
        {items.map((it) => {
          const mode = notifPrefs[it.key] ?? it.def
          const modeLabel = NOTIF_MODES.find((m) => m[0] === mode)?.[1] ?? ''
          return (
            <button
              key={it.key}
              type="button"
              className={`w-full flex items-center text-left ${sel === it.key ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
              onClick={() => setSel(it.key)}
            >
              <div className="w-[46%] px-2 py-[4px] flex items-center gap-2 border-r border-[#e8e5d8]">
                {it.icon}
                <span className="truncate">{it.name}</span>
              </div>
              <div className="w-[33%] px-2 py-[4px] border-r border-[#e8e5d8]">{modeLabel}</div>
              <div className="w-[21%] px-2 py-[4px]">{it.current}</div>
            </button>
          )
        })}
      </div>
      {/* 行为下拉 */}
      <div className="flex items-center gap-2">
        <span>当前项目(C):</span>
        <span className="flex-1 border border-[#7a9ab8] bg-white rounded-[2px] px-2 py-[3px] flex items-center gap-2">
          {selItem.icon}
          {selItem.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span>行为(B):</span>
        <select
          className="flex-1 h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none"
          value={selMode}
          onChange={(e) => setNotifPref(selItem.key, e.target.value as NotifMode)}
        >
          {NOTIF_MODES.map(([m, label]) => (
            <option key={m} value={m}>{label}</option>
          ))}
        </select>
      </div>
      <div className="mt-1">
        <XPButton onClick={() => { /* 还原默认行为 */ setNotifPref('volume', 'inactive'); setNotifPref('network', 'always'); setNotifPref('printer', 'hide') }}>还原默认项(R)</XPButton>
      </div>
      <div className="flex justify-end gap-2 mt-auto pt-2">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 自定义「开始」菜单（Luna 版） ═══════════════════ */

/* 「开始」菜单项目：key 对应 StartMenu 右栏；tri=false 的项目不支持"显示为菜单" */
const START_ITEM_DEFS: Array<{ key: string; label: string; tri: boolean }> = [
  { key: 'mydocs', label: '我的文档', tri: true },
  { key: 'pics', label: '图片收藏', tri: true },
  { key: 'music', label: '我的音乐', tri: true },
  { key: 'mycomputer', label: '我的电脑', tri: true },
  { key: 'network', label: '网上邻居', tri: false },
  { key: 'controlpanel', label: '控制面板', tri: true },
  { key: 'printfax', label: '打印机和传真', tri: true },
]

export function CustomizeStart({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const [tab, setTab] = useState<'general' | 'advanced'>('general')

  const st0 = useXP.getState()
  const [d, setD] = useState({
    bigIcons: st0.startOpts.bigIcons,
    progCount: st0.startOpts.progCount,
    itemMode: { ...st0.startOpts.itemMode } as Record<string, 'none' | 'link' | 'menu'>,
    recentDocs: st0.classicOpts.recentDocs,
  })
  const modeOf = (k: string) => d.itemMode[k] ?? 'link'

  const apply = () => {
    const a = useXP.getState()
    a.setStartOpts({ bigIcons: d.bigIcons, progCount: d.progCount, itemMode: { ...d.itemMode } })
    a.setClassicOpt('recentDocs', d.recentDocs)
    playClick()
  }

  /* 数字微调（XP updown 风格） */
  const NumSpin = () => (
    <div className="flex">
      <input
        readOnly
        value={String(d.progCount)}
        className="w-[34px] h-[20px] border border-[#7a9ab8] bg-white rounded-l-[2px] text-center text-[11px] outline-none"
      />
      <div className="flex flex-col">
        <button type="button" className="w-[16px] h-[10px] text-[7px] leading-none text-[#333] border border-[#7a9ab8] rounded-tr-[2px] bg-gradient-to-b from-[#faf8f0] to-[#dcdaCC]" onClick={() => setD((p) => ({ ...p, progCount: Math.min(9, p.progCount + 1) }))}>▲</button>
        <button type="button" className="w-[16px] h-[10px] text-[7px] leading-none text-[#333] border border-t-0 border-[#7a9ab8] rounded-br-[2px] bg-gradient-to-b from-[#faf8f0] to-[#dcdacc]" onClick={() => setD((p) => ({ ...p, progCount: Math.max(0, p.progCount - 1) }))}>▼</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['general', '常规'], ['advanced', '高级']] as const).map(([k, t]) => (
          <button
            key={k}
            type="button"
            className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
            onClick={() => { setTab(k); playClick() }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'general' ? (
          <div className="space-y-2">
            <GroupBox title="为程序选择一个图标大小">
              <div className="flex flex-col p-1">
                <XPRadio checked={!d.bigIcons} label="小图标(S)" onChange={() => setD((p) => ({ ...p, bigIcons: false }))} />
                <XPRadio checked={d.bigIcons} label="大图标(L)" onChange={() => setD((p) => ({ ...p, bigIcons: true }))} />
              </div>
            </GroupBox>
            <GroupBox title="程序">
              <div className="space-y-2 p-1">
                <div className="flex items-center gap-2">
                  <span>「开始」菜单显示的程序数目(P):</span>
                  <NumSpin />
                </div>
                <div className="text-[10px] text-[#3a3a3a]">要清除最近使用的程序列表，请单击“清除列表”。</div>
                <div><XPButton onClick={() => useXP.setState({ programUse: {} })}>清除列表(L)</XPButton></div>
              </div>
            </GroupBox>
            <GroupBox title="最近使用的文档">
              <div className="space-y-2 p-1">
                <div className="text-[10px] text-[#3a3a3a]">要删除最近访问的文档的快捷方式，请单击“清除列表”。</div>
                <div><XPButton onClick={() => useXP.getState().clearRecentDocs()}>清除列表(C)</XPButton></div>
              </div>
            </GroupBox>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[#1a1a1a]">「开始」菜单项目(S):</div>
            <div className="border border-[#7a9ab8] bg-white rounded-[2px] p-2 space-y-2">
              {START_ITEM_DEFS.map((it) => (
                <div key={it.key}>
                  <div className="font-bold mb-[2px]">{it.label}</div>
                  <div className="pl-[18px] space-y-[1px]">
                    <XPRadio checked={modeOf(it.key) === 'none'} label="不显示此项目" onChange={() => setD((p) => ({ ...p, itemMode: { ...p.itemMode, [it.key]: 'none' } }))} />
                    <XPRadio checked={modeOf(it.key) === 'link'} label="显示为链接" onChange={() => setD((p) => ({ ...p, itemMode: { ...p.itemMode, [it.key]: 'link' } }))} />
                    {it.tri ? (
                      <XPRadio checked={modeOf(it.key) === 'menu'} label="显示为菜单" onChange={() => setD((p) => ({ ...p, itemMode: { ...p.itemMode, [it.key]: 'menu' } }))} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <GroupBox title="最近使用的文档">
              <div className="space-y-2 p-1">
                <XPCheck checked={d.recentDocs} label="列出我最近打开的文档(R)" onChange={() => setD((p) => ({ ...p, recentDocs: !p.recentDocs }))} />
                <div><XPButton onClick={() => useXP.getState().clearRecentDocs()}>清除列表(C)</XPButton></div>
              </div>
            </GroupBox>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 pb-1 pr-1">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 自定义经典「开始」菜单 ═══════════════════ */

const CLASSIC_ITEM_DEFS: Array<{ key: keyof import('../store').ClassicStartOpts; label: string }> = [
  { key: 'myDocs', label: '我的文档' },
  { key: 'recentDocs', label: '我最近的文档' },
  { key: 'search', label: '搜索' },
  { key: 'help', label: '帮助和支持' },
  { key: 'run', label: '运行...' },
  { key: 'allPrograms', label: '所有程序' },
  { key: 'logoff', label: '注销...' },
  { key: 'shutdown', label: '关闭计算机' },
]

export function CustomizeClassic({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const st0 = useXP.getState()
  const [d, setD] = useState({ ...st0.classicOpts })

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3 gap-2">
      <div className="text-[#1a1a1a] leading-[16px]">通过选择下面的复选框，可以在「开始」菜单上显示或删除项目。</div>
      <div className="border border-[#7a9ab8] bg-white rounded-[2px] p-2 space-y-[3px]">
        {CLASSIC_ITEM_DEFS.map((it) => (
          <XPCheck
            key={it.key}
            checked={d[it.key]}
            label={it.label}
            onChange={() => setD((p) => ({ ...p, [it.key]: !p[it.key] }))}
          />
        ))}
      </div>
      <div className="text-[10px] text-[#3a3a3a] leading-[14px] mt-1">
        注意：若删除「所有程序」，经典「开始」菜单将只保留基本项目。
      </div>
      <div className="flex items-center gap-2 mt-1">
        <XPButton onClick={() => { useXP.getState().clearRecentDocs(); playClick() }}>清除(C)</XPButton>
        <span className="text-[10px] text-[#3a3a3a]">删除最近访问的文档的快捷方式</span>
      </div>
      <div className="flex justify-end gap-2 mt-auto pt-2">
        <XPButton primary onClick={() => { useXP.getState().setClassicOpt('myDocs', d.myDocs); useXP.getState().setClassicOpt('recentDocs', d.recentDocs); useXP.getState().setClassicOpt('search', d.search); useXP.getState().setClassicOpt('help', d.help); useXP.getState().setClassicOpt('run', d.run); useXP.getState().setClassicOpt('allPrograms', d.allPrograms); useXP.getState().setClassicOpt('logoff', d.logoff); useXP.getState().setClassicOpt('shutdown', d.shutdown); playClick(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 新建工具栏（从文件系统选文件夹） ═══════════════════ */

function FsTreeRow({
  node,
  path,
  depth,
  selected,
  onSelect,
}: {
  node: FSNode
  path: string[]
  depth: number
  selected: string
  onSelect: (name: string, path: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const fsTree = useXP((s) => s.fsTree)
  /* 从实时树里重新解析（保持展开状态与真实 fs 同步） */
  const live = resolvePath(path, fsTree) ?? node
  const isSel = selected === path.join('/')

  if (live.kind !== 'folder' && live.kind !== 'drive') return null
  return (
    <div>
      <div
        className={`flex items-center gap-1 h-[19px] cursor-pointer ${isSel ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
        style={{ paddingLeft: 4 + depth * 13 }}
        onClick={() => onSelect(live.name, path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(live.name, path) }}
      >
        <button
          type="button"
          className={`w-[13px] h-[13px] flex items-center justify-center shrink-0 ${live.children?.length ? '' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        >
          <span className="text-[7px]">{open ? '▼' : '▶'}</span>
        </button>
        {live.kind === 'drive' ? <MyComputerIcon size={16} /> : <FolderIcon size={16} />}
        <span className="truncate">{live.name}</span>
      </div>
      {open && live.children
        ? live.children
            .filter((c) => c.kind === 'folder' || c.kind === 'drive')
            .map((c) => (
              <FsTreeRow key={c.name} node={c} path={[...path, c.name]} depth={depth + 1} selected={selected} onSelect={onSelect} />
            ))
        : null}
    </div>
  )
}

export function NewToolbar({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const fsTree = useXP((s) => s.fsTree)
  const addTbCustom = useXP((s) => s.addTbCustom)
  const openApp = useXP((s) => s.openApp)
  const [sel, setSel] = useState<{ name: string; path: string[] } | null>(null)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3 gap-2">
      <div className="leading-[16px] text-[#1a1a1a]">
        选择一个文件夹或键入一个 Internet 地址，为您的任务栏创建一个工具栏。
      </div>
      <div className="flex items-center gap-2">
        <span>文件夹(F):</span>
      </div>
      <div className="flex-1 min-h-0 border border-[#7a9ab8] bg-white rounded-[2px] overflow-y-auto xp-thin-scroll py-1">
        <div className="flex items-center gap-1 h-[19px] px-1 hover:bg-[#e8f0fb]" onClick={() => setSel({ name: '我的电脑', path: [] })}>
          <MyComputerIcon size={16} />
          <span className="font-bold">我的电脑</span>
        </div>
        {(fsTree.children ?? []).map((c) => (
          <FsTreeRow key={c.name} node={c} path={[c.name]} depth={1} selected={sel?.path.join('/') ?? ''} onSelect={(name, path) => setSel({ name, path })} />
        ))}
      </div>
      {sel ? (
        <div className="text-[10px] text-[#3a3a3a] truncate">
          已选择: {sel.name}（{resolvePath(sel.path, fsTree)?.children?.length ?? 0} 个项目）
        </div>
      ) : (
        <div className="text-[10px] text-[#5a5a4a]">请选择一个文件夹</div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <XPButton
          primary
          disabled={!sel}
          onClick={() => {
            if (sel) {
              addTbCustom(sel.name, sel.path)
              playClick()
              openApp('dialog', { kind: 'info', title: '新建工具栏', text: `已创建工具栏「${sel.name}」。\n\n它已出现在任务栏上；右键任务栏 → 工具栏 可随时将其关闭。` })
            }
            closeWindow(win.id)
          }}
        >
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* 供任务栏工具栏段落使用：系统桌面图标集（我的文档按登录帐户解析） */
export const TB_SYS_ICONS = [
  { label: '我的文档', icon: <MyDocumentsIcon size={16} />, open: () => useXP.getState().openApp('explorer', { path: myDocsPath(useXP.getState().sessionUser) }, '我的文档') },
  { label: '我的电脑', icon: <MyComputerIcon size={16} />, open: () => useXP.getState().openApp('explorer', { path: [] }, '我的电脑') },
  { label: '网上邻居', icon: <NetworkIcon size={16} />, open: () => useXP.getState().openApp('explorer', { path: ['网上邻居'] }, '网上邻居') },
  { label: 'Internet Explorer', icon: <IEIcon size={16} />, open: () => useXP.getState().openApp('ie', {}) },
  { label: '回收站', icon: <RecycleBinIcon size={16} />, open: () => useXP.getState().openApp('explorer', { path: ['回收站'] }, '回收站') },
]

/* 文件节点 → 图标 + 打开方式（工具栏/菜单共用） */
export function tbFileEntry(node: FSNode, parentPath: string[]): { label: string; icon: React.ReactNode; onClick: () => void } {
  const st = useXP.getState()
  if (node.kind === 'folder' || node.kind === 'drive') {
    return {
      label: node.name,
      icon: <FolderIcon size={16} />,
      onClick: () => st.openApp('explorer', { path: [...parentPath, node.name] }, node.name),
    }
  }
  if (node.icon === 'image') {
    return {
      label: node.name,
      icon: <ImageFileIcon size={16} />,
      onClick: () => st.openApp('imgviewer', { parentPath, name: node.name, index: 0 }),
    }
  }
  if (node.icon === 'audio') {
    return {
      label: node.name,
      icon: <VolumeIcon size={16} />,
      onClick: () => st.openApp('wmp', {}),
    }
  }
  return {
    label: node.name,
    icon: <TextFileIcon size={16} />,
    onClick: () => st.openApp('notepad', { fileName: node.name, content: node.content ?? '', parentPath }),
  }
}
