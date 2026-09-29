'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { Bmp } from '../bmp'

const TABS = ['应用程序', '进程', '性能', '联网', '用户'] as const
type Tab = (typeof TABS)[number]

interface Proc {
  name: string
  cpu: number
  mem: number
}

const BASE_PROCS: Proc[] = [
  { name: 'System Idle Process', cpu: 0, mem: 28 },
  { name: 'explorer.exe', cpu: 2, mem: 13492 },
  { name: 'svchost.exe', cpu: 0, mem: 4820 },
  { name: 'winlogon.exe', cpu: 0, mem: 3412 },
  { name: 'services.exe', cpu: 0, mem: 3960 },
  { name: 'lsass.exe', cpu: 0, mem: 1272 },
  { name: 'csrss.exe', cpu: 0, mem: 2208 },
  { name: 'smss.exe', cpu: 0, mem: 388 },
]

export default function TaskManager({ win }: { win: WinState }) {
  const windows = useXP((s) => s.windows)
  const closeWindow = useXP((s) => s.closeWindow)
  const focusWindow = useXP((s) => s.focusWindow)
  const restoreWindow = useXP((s) => s.restoreWindow)
  const sessionUser = useXP((s) => s.sessionUser)
  const accounts = useXP((s) => s.accounts)
  const setPhase = useXP((s) => s.setPhase)
  const setSwitchFrom = useXP((s) => s.setSwitchFrom)
  const closeAll = useXP((s) => s.closeAll)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<Tab>('应用程序')
  const [sel, setSel] = useState<number | null>(null)
  const [procs, setProcs] = useState<Proc[]>(BASE_PROCS)
  const [selProc, setSelProc] = useState<string | null>(null)
  const [killed, setKilled] = useState<string[]>([])
  const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(60).fill(0))
  const cpuRef = useRef<HTMLDivElement>(null)

  /* 模拟 CPU */
  useEffect(() => {
    const iv = setInterval(() => {
      const load = Math.min(100, 8 + windows.filter((w) => !w.minimized).length * 14 + Math.random() * 22)
      const idle = 100 - load
      setProcs((ps) =>
        ps.map((p) =>
          p.name === 'System Idle Process' ? { ...p, cpu: Math.round(idle) } : p.name === 'explorer.exe' ? { ...p, cpu: Math.round(load / 2) } : p,
        ),
      )
      setCpuHistory((h) => [...h.slice(1), Math.round(load)])
    }, 1000)
    return () => clearInterval(iv)
  }, [windows])

  /* CPU 曲线（Canvas，绿色网格风） */
  useEffect(() => {
    if (tab !== '性能') return
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const el = cpuRef.current
      if (!el) return
      const canvas = el.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      /* 网格 */
      ctx.strokeStyle = '#0a5f14'
      ctx.lineWidth = 1
      for (let x = 0; x <= w; x += 13) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += 11) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      /* 曲线 */
      ctx.strokeStyle = '#2af23a'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      cpuHistory.forEach((v, i) => {
        const x = (i / (cpuHistory.length - 1)) * w
        const y = h - (v / 100) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      /* 填充渐变 */
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(42,242,58,0.25)')
      grad.addColorStop(1, 'rgba(42,242,58,0)')
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [tab, cpuHistory])

  const cur = cpuHistory[cpuHistory.length - 1] ?? 0

  return (
    <div className="flex flex-col h-full bg-[#d8d5c8] select-none">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [{ label: '新任务(运行...)', accelerator: 'Ctrl+N', onClick: () => useXP.getState().openApp('run', {}) }],
          },
          {
            label: '选项(O)',
            items: [{ label: '总在最前(T)', checked: false }],
          },
          {
            label: '查看(V)',
            items: [{ label: '刷新', accelerator: 'Ctrl+R', onClick: () => setCpuHistory((h) => [...h.slice(1), h[h.length - 1]]) }, { label: '更新速度(U)', submenu: [{ label: '高' }, { label: '正常', checked: true }, { label: '低' }, { label: '暂停' }] }],
          },
          {
            label: '关机(U)',
            items: [
              { label: '关闭计算机...', onClick: () => useXP.getState().openApp('dialog', { kind: 'shutdown' }) },
              { label: '注销(L)...', onClick: () => { useXP.getState().closeAll(); useXP.getState().setPhase('logging-off') } },
            ],
          },
          {
            label: '帮助(H)',
            items: [{ label: '帮助主题' }, { label: '关于任务管理器(A)', onClick: () => useXP.getState().openApp('about', { title: '关于“Windows 任务管理器”', text: 'Windows 任务管理器（Web 复刻版）\n版本 5.1 (Build 2600)\n\n「结束任务」对复刻版窗口是真的有效——\n毕竟这里没有真正的蓝屏给你看。' }) }],
          },
        ]}
      />
      {/* 状态栏 */}
      <div className="flex items-center gap-2 px-3 py-[3px] border-b border-[#a8a498] bg-[#d8d5c8] text-[11px]">
        <span className="flex-1" />
        <span>进程数: {procs.filter((p) => !killed.includes(p.name)).length + windows.length}</span>
        <span>CPU 使用: {cur}%</span>
        <span className="w-[46px] h-[10px] bg-black border border-[#6a665e] relative overflow-hidden">
          <span className="absolute inset-y-0 left-0 bg-[#2af23a]" style={{ width: `${cur}%` }} />
        </span>
        <span>提交更改: 168M/372M</span>
      </div>
      {/* 选项卡 */}
      <div className="flex gap-[2px] px-1 pt-1 bg-[#d8d5c8] border-b border-[#a8a498]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`px-3 h-[20px] text-[11px] rounded-t-[3px] ${tab === t ? 'bg-[#ece9d8] border border-b-0 border-[#a8a498] font-bold' : 'border border-transparent hover:border-[#c8c4b8]'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 bg-[#ece9d8] border-x border-[#a8a498] p-2 overflow-hidden">
        {tab === '应用程序' ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 xp-sunken bg-white overflow-y-auto xp-thin-scroll">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#ece9d8] sticky top-0">
                    <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-1 w-[60%]">任务</th>
                    <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-1">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.filter((w) => !w.noTaskbar).map((w) => (
                    <tr key={w.id} className={sel === w.id ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'} onClick={() => setSel(w.id)}>
                      <td className="px-2 py-[3px] border-b border-[#f0ede4]">{w.title}</td>
                      <td className="px-2 py-[3px] border-b border-[#f0ede4]">{w.minimized ? '已最小化' : '正在运行'}</td>
                    </tr>
                  ))}
                  {windows.filter((w) => !w.noTaskbar).length === 0 ? (
                    <tr>
                      <td className="px-2 py-4 text-[#888] text-center" colSpan={2}>
                        没有运行中的应用程序（连扫雷都没开，你还好意思用 XP？）
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="xp-btn px-4 h-[23px] text-[11px]"
                disabled={sel === null}
                onClick={() => {
                  if (sel !== null) {
                    closeWindow(sel)
                    setSel(null)
                  }
                }}
              >
                结束任务
              </button>
              <button type="button" className="xp-btn px-4 h-[23px] text-[11px]" onClick={() => useXP.getState().openApp('run', {})}>
                新任务
              </button>
              <button type="button" className="xp-btn px-4 h-[23px] text-[11px]" disabled={sel === null} onClick={() => {
                /* 切换至：还原并聚焦选中任务（XP 真实行为） */
                if (sel !== null) {
                  const w = windows.find((x) => x.id === sel)
                  if (w) {
                    if (w.minimized) restoreWindow(w.id)
                    focusWindow(w.id)
                  }
                }
              }}>
                切换至
              </button>
              <button type="button" className="xp-btn px-4 h-[23px] text-[11px]" onClick={() => {
                /* 注销当前用户（XP 真实行为；保留 FUS 会话语义为关机菜单服务） */
                closeAll()
                setPhase('logging-off')
              }}>
                注销
              </button>
            </div>
          </div>
        ) : null}

        {tab === '进程' ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 xp-sunken bg-white overflow-y-auto xp-thin-scroll">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[#ece9d8] sticky top-0">
                    <th className="text-left font-normal border-b border-[#d8d5c8] px-2 py-1">映像名称</th>
                    <th className="text-right font-normal border-b border-[#d8d5c8] px-2 py-1">CPU</th>
                    <th className="text-right font-normal border-b border-[#d8d5c8] px-2 py-1">内存</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...windows.map((w) => ({ name: `${w.app}.exe`, cpu: 1 + Math.round(Math.random() * 3), mem: 2000 + w.id * 1337, winId: w.id })),
                    ...procs.map((p) => ({ ...p, winId: undefined as number | undefined })),
                  ].filter((p) => !killed.includes(p.name)).map((p) => (
                    <tr
                      key={p.name + p.mem}
                      className={selProc === p.name ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}
                      onClick={() => setSelProc(p.name)}
                    >
                      <td className="px-2 py-[2px] border-b border-[#f0ede4]">{p.name}</td>
                      <td className="px-2 py-[2px] text-right border-b border-[#f0ede4]">{String(p.cpu).padStart(2, '0')}</td>
                      <td className="px-2 py-[2px] text-right border-b border-[#f0ede4]">{p.mem.toLocaleString()} K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="xp-btn px-4 h-[23px] text-[11px]"
                disabled={selProc === null}
                onClick={() => {
                  if (!selProc) return
                  const winProc = windows.find((w) => `${w.app}.exe` === selProc)
                  if (winProc) {
                    /* 窗口进程：直接关窗（真实生效） */
                    closeWindow(winProc.id)
                    showToast(`已终止进程 ${selProc}`)
                  } else {
                    /* 系统进程：移出列表（XP 会对关键进程警告，这里按普通进程处理） */
                    setKilled((k) => [...k, selProc])
                    showToast(`已终止进程 ${selProc}`)
                  }
                  setSelProc(null)
                }}
              >
                结束进程
              </button>
            </div>
          </div>
        ) : null}

        {tab === '性能' ? (
          <div className="h-full flex flex-col gap-2" ref={cpuRef}>
            <div className="flex gap-2">
              <div className="xp-sunken bg-black p-1 relative">
                <div className="text-[10px] text-[#2af23a] absolute top-[2px] left-[4px]">CPU 使用</div>
                <div className="text-[16px] text-[#2af23a] absolute bottom-[2px] right-[36px] font-mono">{cur}%</div>
                <canvas width={260} height={110} className="mt-[14px] block" />
              </div>
              <div className="w-[110px] flex flex-col gap-2">
                <div className="xp-sunken bg-white p-2 text-[11px] leading-[16px]">
                  <b>CPU 使用记录</b>
                  <div>句柄数: 4,096</div>
                  <div>线程数: 372</div>
                  <div>进程数: {procs.filter((p) => !killed.includes(p.name)).length + windows.length}</div>
                  <div>正常运行时间: {Math.floor(performance.now() / 1000 / 60)}:{String(Math.floor((performance.now() / 1000) % 60)).padStart(2, '0')}:00</div>
                </div>
                <div className="xp-sunken bg-white p-2 text-[11px]">
                  <b>物理内存</b>
                  <div>总数: 523,760 K</div>
                  <div>可用: 218,456 K</div>
                  <div>系统缓存: 91,234 K</div>
                </div>
              </div>
            </div>
            <div className="xp-sunken bg-white p-2 text-[11px]">
              <b>提交更改 (K)</b> · 总计 380,232 · 限制 1,356,440 · 峰值 412,016
            </div>
          </div>
        ) : null}

        {tab === '联网' ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 xp-sunken bg-white p-2 m-2 text-[11px]">
              <span className="w-[16px] h-[16px]"><svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="4" width="14" height="9" rx="1" fill="#4a8a4a" /><rect x="3" y="6" width="10" height="2" fill="#8af28a" /></svg></span>
              本地连接 2 / 56K 调制解调器
            </div>
            <div className="flex-1 xp-sunken bg-black m-2 mt-0 relative overflow-hidden">
              <div className="text-[10px] text-[#2af23a] absolute top-1 left-2">网络利用率 0.7% · 链路速度 56 Kbps</div>
              <svg width="100%" height="100%" className="absolute inset-0" preserveAspectRatio="none">
                <polyline points={cpuHistory.map((v, i) => `${(i / 59) * 100}%,${100 - (v / 8)}%`).join(' ')} fill="none" stroke="#2af23a" strokeWidth="1.4" />
              </svg>
            </div>
          </div>
        ) : null}

        {tab === '用户' ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 xp-sunken bg-white m-2 p-2 text-[11px]">
              {accounts.map((a) => (
                <div key={a.name} className={`flex items-center gap-3 py-1 px-2 ${a.name === sessionUser ? 'bg-[#0a5ec8] text-white' : ''}`}>
                  <Bmp name={a.avatar} size={24} />
                  <div>
                    <div className="font-bold">{a.name}</div>
                    <div className={a.name === sessionUser ? 'text-white/80' : 'text-[#666]'}>
                      ID: {a.name === sessionUser ? 0 : 1} · 会话: Console · 状态: {a.name === sessionUser ? '活动' : '断开'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-2 pb-2">
              <button
                type="button"
                className="xp-btn px-4 h-[23px] text-[11px]"
                disabled={false}
                onClick={() => {
                  /* 断开 = FUS 语义：保留会话回欢迎屏 */
                  setSwitchFrom(sessionUser)
                  setPhase('welcome')
                }}
              >
                断开(D)
              </button>
              <button
                type="button"
                className="xp-btn px-4 h-[23px] text-[11px]"
                onClick={() => {
                  closeAll()
                  setPhase('logging-off')
                }}
              >
                注销(L)
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
