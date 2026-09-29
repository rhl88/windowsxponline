'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, GroupBox } from '../ui'
import { Bmp } from '../bmp'
import { playClick, playDing } from '../sounds'

/* ═══════════ 网络连接（ncpa.cpl） ═══════════
   本地连接 + 1394 连接 + 拨号连接；双击看状态（含实时数据包计数）；启用/禁用 */

interface ConnState {
  name: string
  kind: 'lan' | 'dialup'
  enabled: boolean
  speed: string
  packets: number
}

function ConnStatusDlg({ conn, onClose }: { conn: ConnState; onClose: () => void }) {
  /* 持续时间 + 数据包实时跳动（已连接时） */
  const [secs, setSecs] = useState(Math.floor(Math.random() * 5400) + 300)
  const [sent, setSent] = useState(conn.packets)
  const [recv, setRecv] = useState(conn.packets * 2 + 137)
  useEffect(() => {
    if (!conn.enabled) return
    const t = setInterval(() => {
      setSecs((s) => s + 1)
      setSent((v) => v + Math.floor(Math.random() * 6))
      setRecv((v) => v + Math.floor(Math.random() * 11))
    }, 1000)
    return () => clearInterval(t)
  }, [conn.enabled])

  const dur = `${Math.floor(secs / 3600).toString().padStart(2, '0')}:${Math.floor((secs % 3600) / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10" onDoubleClick={(e) => e.stopPropagation()}>
      <div className="w-[330px] bg-[#ece9d8] rounded-[6px] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-2 h-[24px] bg-gradient-to-b from-[#2a72c8] to-[#1648a0] cursor-default">
          <span className="text-white text-[11px] font-bold">{conn.name} 状态</span>
          <button type="button" className="text-white/80 hover:text-white text-[12px] leading-none px-1" onClick={onClose}>✕</button>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-3">
            <Bmp name="cp-network" size={32} />
            <div className="leading-[15px]">
              <div className="font-bold">{conn.enabled ? '已连接' : '已禁用'}</div>
              <div className="text-[#5a5a4a]">{conn.name}</div>
            </div>
            <div className="flex-1" />
            <div className="text-[#5a5a4a] text-[10px]">常规</div>
          </div>
          <GroupBox title="连接" className="!mb-0">
            <div className="grid grid-cols-[92px_1fr] gap-y-[5px] px-2 py-1 leading-[14px]">
              <span className="text-[#5a5a4a]">状态:</span><span>{conn.enabled ? '已连接' : '已禁用'}</span>
              <span className="text-[#5a5a4a]">速度:</span><span>{conn.enabled ? conn.speed : '--'}</span>
              <span className="text-[#5a5a4a]">持续时间:</span><span>{conn.enabled ? dur : '--'}</span>
            </div>
          </GroupBox>
          <GroupBox title="活动" className="!mb-0">
            <div className="grid grid-cols-[92px_1fr] gap-y-[5px] px-2 py-1 leading-[14px]">
              <span className="text-[#5a5a4a]">数据包:</span>
              <span>已发送 {sent.toLocaleString()}，已收到 {recv.toLocaleString()}</span>
            </div>
            {/* 迷你数据包活动图（XP 状态窗双小灯） */}
            <div className="flex gap-4 justify-center py-1">
              {[['发送', sent], ['收到', recv]].map(([label, v]) => (
                <div key={label as string} className="flex items-center gap-1">
                  <span className="text-[9px] text-[#5a5a4a]">{label as string}</span>
                  <span className={`w-[8px] h-[8px] rounded-full ${conn.enabled ? 'bg-[#2a9e3a]' : 'bg-[#9a9a8a]'}`} style={{ opacity: conn.enabled ? 0.45 + ((v as number) % 5) * 0.13 : 1 }} />
                </div>
              ))}
            </div>
          </GroupBox>
          <div className="flex justify-end gap-2">
            <XPButton onClick={() => { playClick(); onClose() }}>属性(P)</XPButton>
            <XPButton primary onClick={() => { playClick(); onClose() }}>关闭(C)</XPButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NetworkConn({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openCtx = useXP((s) => s.openCtx)
  const [conns, setConns] = useState<ConnState[]>([
    { name: '本地连接', kind: 'lan', enabled: true, speed: '100.0 Mbps', packets: 4862 },
    { name: '1394 连接', kind: 'lan', enabled: false, speed: '400.0 Mbps', packets: 0 },
    { name: '拨号连接 (56K)', kind: 'dialup', enabled: false, speed: '56.6 Kbps', packets: 0 },
  ])
  const [statusOf, setStatusOf] = useState<string | null>(null)

  const stConn = useMemo(() => conns.find((c) => c.name === statusOf) ?? null, [conns, statusOf])

  const toggle = (name: string) => {
    setConns((cs) => cs.map((c) => (c.name === name ? { ...c, enabled: !c.enabled, packets: c.enabled ? c.packets : Math.floor(Math.random() * 400) + 800 } : c)))
    playClick()
  }

  const connCtx = (c: ConnState) => [
    { label: c.enabled ? '禁用(A)' : '启用(A)', bold: true, onClick: () => toggle(c.name) },
    { label: '状态(S)', onClick: () => setStatusOf(c.name) },
    { separator: true },
    { label: '重命名(M)', onClick: () => showToast('重命名：XP 复刻版的连接名刻在注册表深处 :)') },
    { label: '属性(R)', onClick: () => showToast('连接属性：Internet 协议 (TCP/IP) —— 自动获得 IP 地址') },
  ]

  return (
    <div className="relative flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '新建连接(N)...', onClick: () => showToast('新建连接向导：检测到 56K 调制解调器（安装后请勿占用家里的电话线）') }, { separator: true }, { label: '关闭(C)', onClick: () => closeWindow(win.id) }] },
          { label: '编辑(E)', items: [{ label: '禁用(D)', disabled: true }] },
          { label: '查看(V)', items: [{ label: '详细信息(D)', onClick: () => showToast('详细信息的"视图"对 2001 年的网卡同样适用') }] },
          { label: '工具(T)', items: [{ label: '拨号连接(P)...', onClick: () => showToast('拨号：正在拨 16300……对方计算机没有应答') }] },
          { label: '高级(A)', items: [{ label: '高级设置(S)...', onClick: () => showToast('高级设置：连接顺序 本地连接 → 1394 → 拨号') }] },
          { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('网络连接 —— Windows XP 复刻版') }] },
        ]}
      />
      <div className="flex-1 flex min-h-0">
        {/* 左侧任务栏 */}
        <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
            <div className="font-bold text-[#1a3f8f] mb-1">网络任务</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('新建连接向导：选择"连接到 Internet"→"手动设置我的连接"→一声猫叫之后你就在线了')}>
              创建一个新的连接
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('网络安装向导：检测到 56K 调制解调器与一根电话线，建议先别占线 :)')}>
              设置家庭或小型办公网络
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('Windows 防火墙：2001 年它还没出生（XP SP2 的救赎要等 2004 年）')}>
              更改 Windows 防火墙设置
            </button>
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="font-bold text-[#1a3f8f] mb-1">详细信息</div>
            <div className="leading-[15px] text-[#2a2a1a]">
              {conns.filter((c) => c.enabled).length} 个活动连接<br />
              <span className="text-[#5a5a5a]">LAN 或高速 Internet</span>
            </div>
          </div>
        </div>

        {/* 主列表 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll p-4">
          <div className="text-[12px] font-bold text-[#2a2a1a] mb-1">LAN 或高速 Internet</div>
          <div className="w-[220px] h-[2px] bg-[#5a86cf] mb-3" />
          <div className="flex flex-wrap gap-3">
            {conns.filter((c) => c.kind === 'lan').map((c) => (
              <button
                key={c.name}
                type="button"
                className="w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb]"
                onClick={() => playClick()}
                onDoubleClick={() => setStatusOf(c.name)}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, connCtx(c)) }}
              >
                <Bmp name="cp-network" size={32} className={c.enabled ? '' : 'opacity-40 grayscale'} />
                <span className="text-center leading-[13px]">{c.name}</span>
                <span className={`text-[10px] ${c.enabled ? 'text-[#2a7a2a]' : 'text-[#8a8a7a]'}`}>{c.enabled ? '已连接' : '已禁用'}</span>
              </button>
            ))}
          </div>
          <div className="text-[12px] font-bold text-[#2a2a1a] mt-4 mb-1">拨号</div>
          <div className="w-[220px] h-[2px] bg-[#5a86cf] mb-3" />
          <div className="flex flex-wrap gap-3">
            {conns.filter((c) => c.kind === 'dialup').map((c) => (
              <button
                key={c.name}
                type="button"
                className="w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb]"
                onClick={() => playClick()}
                onDoubleClick={() => setStatusOf(c.name)}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, connCtx(c)) }}
              >
                <Bmp name="cp-network" size={32} className={c.enabled ? '' : 'opacity-40 grayscale'} />
                <span className="text-center leading-[13px]">{c.name}</span>
                <span className={`text-[10px] ${c.enabled ? 'text-[#2a7a2a]' : 'text-[#8a8a7a]'}`}>{c.enabled ? '已连接' : '已断开'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        {conns.filter((c) => c.enabled).length} 个连接处于活动状态
      </div>

      {stConn ? <ConnStatusDlg conn={stConn} onClose={() => setStatusOf(null)} /> : null}
    </div>
  )
}
