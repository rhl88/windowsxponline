'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP, xpNow } from '../store'
import { XPButton, GroupBox, XPRadio } from '../ui'
import { playClick } from '../sounds'
import { auxFetch } from '@/lib/api/aux-api'

/* 日期和时间 属性：可真实调整系统时钟（偏移）+ 时区 + Internet 时间同步 */

const TZ_LIST: Array<{ name: string; offset: number }> = [
  { name: '(GMT+08:00) 北京，重庆，香港特别行政区，乌鲁木齐', offset: 8 },
  { name: '(GMT+09:00) 大阪，扎幌，东京', offset: 9 },
  { name: '(GMT+07:00) 曼谷，河内，雅加达', offset: 7 },
  { name: '(GMT+06:00) 阿拉木图，新西伯利亚', offset: 6 },
  { name: '(GMT+05:30) 钦奈，加尔各答，孟买，新德里', offset: 5.5 },
  { name: '(GMT+04:00) 巴库，第比利斯，埃里温', offset: 4 },
  { name: '(GMT+02:00) 开罗，赫尔辛基，雅典，伊斯坦布尔', offset: 2 },
  { name: '(GMT+01:00) 阿姆斯特丹，柏林，罗马，维也纳', offset: 1 },
  { name: '(GMT) 格林威治标准时间 都柏林，爱丁堡，里斯本，伦敦', offset: 0 },
  { name: '(GMT-05:00) 美国东部时间 纽约，华盛顿', offset: -5 },
  { name: '(GMT-08:00) 美国太平洋时间 洛杉矶，西雅图', offset: -8 },
]

type Tab = 'datetime' | 'timezone' | 'inetsync'

function AnalogClock({ date }: { date: Date }) {
  const h = date.getHours() % 12
  const m = date.getMinutes()
  const s = date.getSeconds()
  const hand = (deg: number, len: number, w: number, color: string) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return (
      <line
        x1={50}
        y1={50}
        x2={50 + Math.cos(rad) * len}
        y2={50 + Math.sin(rad) * len}
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
    )
  }
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="#fff" stroke="#8a867e" strokeWidth="2" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#d8d5c8" strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const rad = ((i * 30 - 90) * Math.PI) / 180
        return <circle key={i} cx={50 + Math.cos(rad) * 40} cy={50 + Math.sin(rad) * 40} r="1.6" fill="#5a5a4a" />
      })}
      {hand((h + m / 60) * 30, 22, 3.4, '#2a2a2a')}
      {hand(m * 6, 32, 2.4, '#2a2a2a')}
      {hand(s * 6, 35, 1, '#c03020')}
      <circle cx="50" cy="50" r="2.6" fill="#2a2a2a" />
    </svg>
  )
}

export default function DateTimeProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const clockOffsetMin = useXP((s) => s.clockOffsetMin)
  const setClockOffset = useXP((s) => s.setClockOffset)
  const setTZ = useXP((s) => s.setTZ)
  const tzName = useXP((s) => s.tzName)
  const tzOffsetH = useXP((s) => s.tzOffsetH)
  const showToast = useXP((s) => s.showToast)

  const [tab, setTab] = useState<Tab>('datetime')
  const [tick, setTick] = useState(0)
  const [autoSync, setAutoSync] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  /* 编辑字段（基于当前 XP 时钟） */
  const now = xpNow()
  const p2 = (n: number) => String(n).padStart(2, '0')
  const [y, setY] = useState(now.getFullYear())
  const [mo, setMo] = useState(now.getMonth() + 1)
  const [d, setD] = useState(now.getDate())
  const [hh, setH] = useState(now.getHours())
  const [mi, setMi] = useState(now.getMinutes())
  const [ss, setS] = useState(now.getSeconds())

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  /* 实时时钟（tick 每秒驱动重渲染） */
  const live = useMemo(() => xpNow(), [tick])

  const apply = () => {
    const target = new Date(y, mo - 1, d, hh, mi, ss)
    const deltaMs = target.getTime() - Date.now()
    setClockOffset(Math.round(deltaMs / 60000))
    playClick()
    showToast(`系统时钟已调整${Math.abs(deltaMs) > 60000 ? `（偏移 ${Math.round(deltaMs / 60000)} 分钟）` : '（与真实时间一致）'}`)
  }

  const tzIdx = TZ_LIST.findIndex((t) => t.name === tzName)
  const curTz = tzIdx >= 0 ? tzIdx : 0

  const doSync = async () => {
    setSyncing(true)
    setSyncMsg('正在与 time.windows.com 同步...')
    try {
      const r = await auxFetch('/api/netinfo?kind=time')
      const j = (await r.json()) as { iso?: string; ts?: number }
      if (j.ts) {
        setClockOffset(Math.round((j.ts - Date.now()) / 60000))
        const st = new Date(j.ts)
        setSyncMsg(`同步成功: ${st.toLocaleTimeString('zh-CN', { hour12: false })}`)
        playClick()
      } else {
        setSyncMsg('同步失败：无法联系时间服务器')
      }
    } catch {
      setSyncMsg('同步失败：网络超时')
    } finally {
      setSyncing(false)
    }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      className={`px-[10px] h-[21px] text-[11px] rounded-t-[3px] border border-b-0 ${tab === t ? 'bg-[#ece9d8] border-[#a0a090] relative z-10 -mb-[1px] pb-[1px]' : 'bg-gradient-to-b from-[#f4f2e8] to-[#dcddd0] border-[#b0b0a0]'}`}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      {/* 选项卡头 */}
      <div className="flex items-end px-2 pt-2 gap-[2px] border-b border-[#a0a090]">
        {tabBtn('datetime', '日期和时间')}
        {tabBtn('timezone', '时区')}
        {tabBtn('inetsync', 'Internet 时间')}
      </div>

      <div className="flex-1 p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'datetime' ? (
          <div className="flex gap-4">
            <div className="w-[190px] space-y-3">
              <GroupBox title="日期">
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="text-[11px]">日期</span>
                  <input className="xp-sunken bg-white w-[30px] h-[18px] text-center text-[11px]" value={d} onChange={(e) => setD(Math.max(1, Math.min(31, Number(e.target.value.replace(/\D/g, '')) || 1)))} />
                  <span className="text-[11px]">月</span>
                  <input className="xp-sunken bg-white w-[24px] h-[18px] text-center text-[11px]" value={mo} onChange={(e) => setMo(Math.max(1, Math.min(12, Number(e.target.value.replace(/\D/g, '')) || 1)))} />
                  <span className="text-[11px]">年</span>
                  <input className="xp-sunken bg-white w-[36px] h-[18px] text-center text-[11px]" value={y} onChange={(e) => setY(Number(e.target.value.replace(/\D/g, '')) || 2001)} />
                </div>
              </GroupBox>
              <GroupBox title="时间">
                <div className="flex items-center justify-center gap-1 py-1">
                  <input className="xp-sunken bg-white w-[26px] h-[18px] text-center text-[11px]" value={p2(hh)} onChange={(e) => setH(Math.max(0, Math.min(23, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
                  <span className="text-[11px] font-bold">:</span>
                  <input className="xp-sunken bg-white w-[26px] h-[18px] text-center text-[11px]" value={p2(mi)} onChange={(e) => setMi(Math.max(0, Math.min(59, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
                  <span className="text-[11px] font-bold">:</span>
                  <input className="xp-sunken bg-white w-[26px] h-[18px] text-center text-[11px]" value={p2(ss)} onChange={(e) => setS(Math.max(0, Math.min(59, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
                </div>
              </GroupBox>
              <div className="text-[10px] text-[#8a8a7a] px-1">修改后点「应用」生效，托盘时钟会同步更新。</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <AnalogClock date={live} />
              <div className="mt-2 text-[12px] font-mono">{live.toLocaleTimeString('zh-CN', { hour12: false })}</div>
              <div className="text-[11px] text-[#5a5a4a] mt-1">{live.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
            </div>
          </div>
        ) : null}

        {tab === 'timezone' ? (
          <div className="space-y-3">
            <div className="xp-sunken bg-white h-[120px] overflow-y-auto xp-thin-scroll">
              {TZ_LIST.map((t, i) => (
                <div key={t.name} className="px-2">
                  <XPRadio checked={curTz === i} label={t.name} onChange={() => setTZ(t.offset, t.name)} />
                </div>
              ))}
            </div>
            <XPCheck2 label="自动调整时钟以适应夏时制变化(D)" checked hint="（复刻版所在地不实行夏时制）" />
            <div className="text-[10px] text-[#8a8a7a]">当前时区：{tzName} · UTC+{tzOffsetH >= 0 ? `${String(Math.floor(tzOffsetH)).padStart(2, '0')}:${(tzOffsetH % 1) * 60 === 30 ? '30' : '00'}` : `-${String(Math.abs(Math.floor(tzOffsetH))).padStart(2, '0')}:${(Math.abs(tzOffsetH) % 1) * 60 === 30 ? '30' : '00'}`}</div>
          </div>
        ) : null}

        {tab === 'inetsync' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-[150px] h-[70px] flex items-center justify-center">
                <svg width="70" height="70" viewBox="0 0 70 70">
                  <circle cx="35" cy="35" r="30" fill="#e8f0fb" stroke="#5a86c8" strokeWidth="2" />
                  <path d="M35 22 v13 l9 7" stroke="#2a5abc" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="35" cy="35" r="2.4" fill="#2a5abc" />
                  <path d="M50 12 q6 8 0 16 M46 14 a14 14 0 0 1 0 12" stroke="#c8a030" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <div className="flex-1 space-y-3">
                <XPCheck2 label="自动与 Internet 时间服务器同步(S)" checked={autoSync} onChange={() => setAutoSync((v) => !v)} />
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">服务器(E):</span>
                  <div className="xp-sunken bg-white w-[150px] h-[20px] flex items-center px-1">
                    <input className="flex-1 text-[11px] outline-none" value="time.windows.com" readOnly />
                  </div>
                  <XPButton onClick={doSync} disabled={syncing}>
                    {syncing ? '同步中...' : '立即更新(U)'}
                  </XPButton>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#3a3a2a]">{syncMsg || '每次连接 Internet 时同步一次时钟（服务器取真实 UTC 时间）'}</div>
          </div>
        ) : null}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 px-3 py-2 border-t border-[#d8d5c8]">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={apply}>应用(A)</XPButton>
      </div>
    </div>
  )
}

function XPCheck2({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange?: () => void; hint?: string }) {
  return (
    <button type="button" className="flex items-center gap-[6px] text-[11px] leading-[18px] text-left" onClick={onChange}>
      <span className="xp-checkbox" aria-checked={checked}>
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6.5 L4.8 9.5 L10 3" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
      {label}
      {hint ? <span className="text-[#8a8a8a]">{hint}</span> : null}
    </button>
  )
}
