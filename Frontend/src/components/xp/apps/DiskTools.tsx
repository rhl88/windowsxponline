'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, XPCheck, GroupBox } from '../ui'
import { HardDriveIcon } from '../icons'
import { playDing } from '../sounds'

/* ═══════════ 磁盘清理 ═══════════ */

const CLEAN_ITEMS = [
  { label: 'Internet 临时文件', size: '38.2 MB', desc: '包含网页的暂时性记录，可以加快浏览最近访问过的网页。' },
  { label: '已下载的程序文件', size: '2.1 MB', desc: '从 Internet 下载的 ActiveX 控件和 Java 程序。' },
  { label: '回收站', size: '12.6 MB', desc: '「回收站」中被删除的文件。' },
  { label: '临时文件', size: '56.9 MB', desc: '程序运行时创建的暂时性文件。' },
  { label: '压缩旧文件', size: '204 MB', desc: '压缩较长时间内未被使用的文件以释放空间，但不删除。' },
  { label: '脱机网页', size: '8.4 MB', desc: '脱机浏览用的网页副本。' },
]

export function DiskClean({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const [drive, setDrive] = useState('C:')
  const [stage, setStage] = useState<'select' | 'scanning' | 'confirm' | 'cleaning' | 'done'>('select')
  const [checked, setChecked] = useState([true, false, true, true, false, false])
  const [prog, setProg] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setWindowTitle(win.id, '磁盘清理')
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [setWindowTitle, win.id])

  const totalClean = CLEAN_ITEMS.filter((_, i) => checked[i]).reduce((n, it) => n + parseFloat(it.size), 0)

  const scan = () => {
    setStage('scanning')
    setProg(0)
    let p = 0
    timerRef.current = window.setInterval(() => {
      p += 4 + Math.random() * 6
      setProg(Math.min(100, p))
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        setStage('confirm')
      }
    }, 90)
  }

  const clean = () => {
    setStage('cleaning')
    setProg(0)
    let p = 0
    timerRef.current = window.setInterval(() => {
      p += 2.5 + Math.random() * 4
      setProg(Math.min(100, p))
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        setStage('done')
        playDing()
      }
    }, 80)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '关闭(C)', onClick: () => closeWindow(win.id) }] },
          { label: '帮助(H)', items: [{ label: '关于磁盘清理(A)', onClick: () => useXP.getState().showToast('Windows 磁盘清理 Web 复刻版') }] },
        ]}
      />
      <div className="flex-1 p-3 overflow-y-auto xp-thin-scroll">
        {stage === 'select' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <HardDriveIcon size={38} />
              <div>
                <div className="font-bold">请选择要清理的驱动器。</div>
                <div>磁盘清理将释放硬盘空间并提高系统性能。</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>驱动器(D):</span>
              <select className="xp-sunken bg-white h-[20px] px-1" value={drive} onChange={(e) => setDrive(e.target.value)}>
                <option>(C:)</option>
                <option>(A:)</option>
                <option>(D:)</option>
              </select>
              <XPButton primary onClick={scan}>
                确定
              </XPButton>
            </div>
          </div>
        ) : null}

        {stage === 'scanning' || stage === 'cleaning' ? (
          <div className="flex flex-col gap-4 justify-center h-full">
            <div className="text-center font-bold">{stage === 'scanning' ? '磁盘清理正在计算可以释放多少空间。' : `正在清理 ${drive} 中的文件……`}</div>
            <div className="flex items-center justify-center gap-2">
              <svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin" style={{ animationDuration: '1.2s' }}>
                <circle cx="20" cy="20" r="16" fill="#dce0f0" stroke="#5060a0" strokeWidth="2" />
                <path d="M20 20 L20 6 A14 14 0 0 1 33 16 Z" fill="#f0c020" />
              </svg>
              <div className="flex-1">
                <div className="xp-sunken bg-white h-[16px] relative overflow-hidden">
                  <div className="h-full bg-gradient-to-b from-[#37c837] to-[#1f8f1f] xp-progress-blocks" style={{ width: `${prog}%` }} />
                </div>
                <div className="text-center mt-1">{Math.round(prog)}%</div>
              </div>
            </div>
          </div>
        ) : null}

        {stage === 'confirm' ? (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center gap-2">
              <HardDriveIcon size={30} />
              <span className="font-bold">{drive} 的磁盘清理</span>
            </div>
            <div className="flex items-center gap-1">
              <span>可用磁盘空间总计:</span>
              <span className="font-bold">18.6 GB</span>
            </div>
            <div className="xp-sunken bg-white flex-1 p-2 overflow-y-auto xp-thin-scroll">
              <div className="flex justify-between font-bold border-b border-[#d8d5c8] mb-1 pb-1">
                <span>要删除的文件(F):</span>
                <span>大小</span>
              </div>
              {CLEAN_ITEMS.map((it, i) => (
                <div key={it.label} className="mb-1">
                  <XPCheck checked={checked[i]} label={`${it.label}（${it.size}）`} onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <span>可以释放的磁盘空间总数: </span>
              <span className="font-bold">{totalClean.toFixed(1)} MB</span>
            </div>
            <div className="flex justify-end gap-2">
              <XPButton primary onClick={clean}>
                确定
              </XPButton>
              <XPButton onClick={() => setStage('select')}>取消</XPButton>
            </div>
          </div>
        ) : null}

        {stage === 'done' ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="21" fill="#d0e8d0" stroke="#2a7a2a" strokeWidth="2" />
              <path d="M14 25 L21 32 L34 17" stroke="#2a7a2a" strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
            <div className="font-bold">磁盘清理完成！</div>
            <div>已从 {drive} 释放 {totalClean.toFixed(1)} MB 空间</div>
            <XPButton primary onClick={() => setStage('select')}>
              再次清理
            </XPButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ═══════════ 磁盘碎片整理程序 ═══════════ */

const BLOCK = 220 /* 22 × 10 格图 */

function genBlocks(mode: 'fragmented' | 'analyzing' | 'defrag' | 'done', phase: number): Array<'free' | 'frag' | 'cont' | 'sys'> {
  const blocks: Array<'free' | 'frag' | 'cont' | 'sys'> = []
  if (mode === 'fragmented') {
    for (let i = 0; i < BLOCK; i++) {
      const r = Math.random()
      if (i < 6) blocks.push('sys')
      else if (r < 0.42) blocks.push('frag')
      else if (r < 0.5) blocks.push('cont')
      else blocks.push('free')
    }
  } else if (mode === 'analyzing') {
    for (let i = 0; i < BLOCK; i++) blocks.push(Math.random() < phase / 100 ? (Math.random() < 0.45 ? 'frag' : 'cont') : 'free')
  } else {
    /* defrag / done: 越来越连续 */
    const contCount = mode === 'done' ? BLOCK * 0.55 : Math.floor(BLOCK * 0.55 * (phase / 100))
    for (let i = 0; i < BLOCK; i++) {
      if (i < 6) blocks.push('sys')
      else if (i < 6 + contCount) blocks.push('cont')
      else if (mode !== 'done' && Math.random() < 0.2 * (1 - phase / 100)) blocks.push('frag')
      else blocks.push('free')
    }
  }
  return blocks
}

const BLOCK_COLOR: Record<'free' | 'frag' | 'cont' | 'sys', string> = {
  free: '#ffffff',
  frag: '#e03030',
  cont: '#2848c8',
  sys: '#28c028',
}

export function Defrag({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const [stage, setStage] = useState<'idle' | 'analyzing' | 'analyzed' | 'defrag'>('idle')
  const [prog, setProg] = useState(0)
  const [blocks, setBlocks] = useState<Array<'free' | 'frag' | 'cont' | 'sys'>>(() => genBlocks('fragmented', 0))
  const [phase2, setPhase2] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setWindowTitle(win.id, '磁盘碎片整理程序')
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [setWindowTitle, win.id])

  const analyze = () => {
    setStage('analyzing')
    setProg(0)
    let p = 0
    timerRef.current = window.setInterval(() => {
      p += 5
      setProg(Math.min(100, p))
      setBlocks(genBlocks('analyzing', p))
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        setBlocks(genBlocks('fragmented', 0))
        setStage('analyzed')
      }
    }, 100)
  }

  const defrag = () => {
    setStage('defrag')
    setProg(0)
    setPhase2(0)
    let p = 0
    let p2 = 0
    timerRef.current = window.setInterval(() => {
      p += 2
      p2 += 1.5
      setProg(Math.min(100, p))
      setPhase2(Math.min(100, p2))
      setBlocks(genBlocks('defrag', p2))
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        setBlocks(genBlocks('done', 100))
        setStage('idle')
        playDing()
        useXP.getState().showToast('碎片整理完成：C 盘现在健康极了')
      }
    }, 60)
  }

  const legend: Array<[string, string]> = [
    ['碎片', '#e03030'],
    ['连续', '#2848c8'],
    ['系统文件', '#28c028'],
    ['可用空间', '#ffffff'],
  ]

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
          {
            label: '操作(A)',
            items: [
              { label: '分析(A)', onClick: analyze },
              { label: '碎片整理(D)', onClick: defrag },
            ],
          },
          { label: '查看(V)', items: [{ label: '报告(R)', onClick: () => showToast('报告：碎片 38%，建议整理') }] },
          { label: '帮助(H)', items: [{ label: '关于碎片整理', onClick: () => showToast('Windows 磁盘碎片整理程序 Web 复刻版') }] },
        ]}
      />
      <div className="flex-1 p-2 overflow-y-auto xp-thin-scroll space-y-2">
        <div className="text-[12px] font-bold">卷</div>
        <div className="xp-sunken bg-white">
          <div className="flex bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
            <div className="px-2 w-[30px] border-r border-[#d8d5c8] font-bold">会话</div>
            <div className="px-2 w-[40px] border-r border-[#d8d5c8] font-bold">卷</div>
            <div className="px-2 flex-1 border-r border-[#d8d5c8] font-bold">状态</div>
            <div className="px-2 w-[80px] border-r border-[#d8d5c8] font-bold">文件系统</div>
            <div className="px-2 w-[70px] border-r border-[#d8d5c8] font-bold">容量</div>
            <div className="px-2 w-[70px] border-r border-[#d8d5c8] font-bold">可用空间</div>
            <div className="px-2 w-[60px] font-bold">% 可用</div>
          </div>
          <button type="button" className="w-full flex items-center text-left bg-[#0a5ec8] text-white">
            <div className="px-2 w-[30px] border-r border-[#d8d5c8]">1</div>
            <div className="px-2 w-[40px] border-r border-[#d8d5c8] flex items-center gap-1">
              <HardDriveIcon size={14} />(C:)
            </div>
            <div className="px-2 flex-1 border-r border-[#d8d5c8]">{stage === 'idle' ? '非常需要整理' : stage === 'analyzing' ? '正在分析' : stage === 'analyzed' ? '需要整理' : '正在整理碎片'}</div>
            <div className="px-2 w-[80px] border-r border-[#d8d5c8]">FAT32</div>
            <div className="px-2 w-[70px] border-r border-[#d8d5c8]">28 GB</div>
            <div className="px-2 w-[70px] border-r border-[#d8d5c8]">18.6 GB</div>
            <div className="px-2 w-[60px]">66 %</div>
          </button>
        </div>

        <div className="flex gap-1 justify-center">
          <XPButton primary onClick={analyze} disabled={stage === 'analyzing' || stage === 'defrag'}>
            分析(S)
          </XPButton>
          <XPButton onClick={defrag} disabled={stage === 'defrag' || stage === 'analyzing'}>
            碎片整理(D)
          </XPButton>
          <XPButton onClick={() => showToast('暂停/停止：复刻版任务不可中断（就像 2001 年那样）')} disabled={stage === 'idle'}>
            暂停/停止(P)
          </XPButton>
        </div>

        <GroupBox title="分析显示">
          <div className="xp-sunken bg-white p-[2px] flex flex-wrap w-[440px] mx-auto">
            {blocks.map((b, i) => (
              <div key={i} style={{ width: 19, height: 16, background: BLOCK_COLOR[b], border: '1px solid #d0d0d0', margin: 0.5 }} />
            ))}
          </div>
        </GroupBox>

        <div className="flex justify-center gap-4 flex-wrap">
          {legend.map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-[12px] h-[12px] border border-[#8a8a8a]" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-center">
          <span>碎片整理进度:</span>
          <div className="w-[260px] xp-sunken bg-white h-[14px] relative overflow-hidden">
            <div className="h-full bg-gradient-to-b from-[#37c837] to-[#1f8f1f]" style={{ width: `${prog}%` }} />
          </div>
          <span>{Math.round(prog)}%</span>
        </div>
        {stage === 'defrag' ? (
          <div className="flex items-center gap-2 justify-center">
            <span>压缩进度:</span>
            <div className="w-[260px] xp-sunken bg-white h-[14px] relative overflow-hidden">
              <div className="h-full bg-gradient-to-b from-[#3a8ae8] to-[#1a5ac8]" style={{ width: `${phase2}%` }} />
            </div>
            <span>{Math.round(phase2)}%</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ═══════════ 系统信息 ═══════════ */

export function SysInfo({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  useEffect(() => {
    setWindowTitle(win.id, '系统信息')
  }, [setWindowTitle, win.id])

  const [sel, setSel] = useState('系统摘要')

  const tree = [
    { label: '系统摘要', depth: 0 },
    { label: '硬件资源', depth: 0 },
    { label: '冲突/共享', depth: 1 },
    { label: 'DMA', depth: 1 },
    { label: '强制硬件', depth: 1 },
    { label: 'I/O', depth: 1 },
    { label: '组件', depth: 0 },
    { label: '存储', depth: 1 },
    { label: '显示', depth: 1 },
    { label: '输入', depth: 1 },
    { label: '网络', depth: 1 },
    { label: '软件环境', depth: 0 },
    { label: '驱动程序', depth: 1 },
    { label: '加载的模块', depth: 1 },
    { label: '服务', depth: 1 },
    { label: '启动程序', depth: 1 },
  ]

  const data: Record<string, Array<[string, string]>> = {
    系统摘要: [
      ['OS 名称', 'Microsoft Windows XP Professional'],
      ['OS 版本', '5.1.2600 Build 2600 (Web 复刻版)'],
      ['OS 制造商', 'Microsoft Corporation'],
      ['系统名称', 'MY-COMPUTER'],
      ['系统类型', 'X86-based PC'],
      ['处理器', 'x86 Family 15 Model 2 ~2400 Mhz'],
      ['BIOS 版本/日期', 'Award Modular BIOS v6.00PG, 2001'],
      ['Windows 目录', 'C:\\WINDOWS'],
      ['系统目录', 'C:\\WINDOWS\\system32'],
      ['总物理内存', '512 MB（复刻版：您的浏览器标签页）'],
      ['可用的物理内存', '≈ 212 MB'],
      ['总虚拟内存', '1.5 GB'],
      ['时区', '中国标准时间 GMT+8'],
    ],
    显示: [
      ['显示适配器', 'NVIDIA GeForce2 MX/MX 400 (复刻)'],
      ['分辨率', '1280 × 800 像素（跟随浏览器窗口）'],
      ['颜色', '最高 32 位'],
      ['刷新率', '60 Hz'],
    ],
    网络: [
      ['适配器', 'Realtek RTL8139 Family PCI (复刻)'],
      ['IP 地址', '192.168.0.100'],
      ['子网掩码', '255.255.255.0'],
      ['默认网关', '192.168.0.1'],
      ['连接速度', '56 Kbps（拨号上网的浪漫）'],
    ],
  }

  const rows = data[sel] ?? data['系统摘要']

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
          { label: '帮助(H)', items: [{ label: '关于系统信息', onClick: () => useXP.getState().showToast('Windows 系统信息 Web 复刻版') }] },
        ]}
      />
      <div className="flex-1 flex min-h-0">
        <div className="w-[170px] shrink-0 bg-white border-r border-[#d8d5c8] overflow-y-auto xp-thin-scroll p-1">
          {tree.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`w-full flex items-center gap-1 px-1 py-[2px] rounded-[2px] text-left ${sel === t.label ? 'bg-[#cfe0f5]' : 'hover:bg-[#e8f0fb]'}`}
              style={{ paddingLeft: 4 + t.depth * 14 }}
              onClick={() => setSel(t.label)}
            >
              <span className="text-[#8a8a6a]">{t.depth === 0 ? '📁' : ''}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white overflow-y-auto xp-thin-scroll">
          {rows.map(([k, v]) => (
            <div key={k} className="flex border-b border-[#f0ede4] hover:bg-[#e8f0fb]">
              <div className="w-[220px] shrink-0 px-2 py-[3px] truncate font-bold">{k}</div>
              <div className="flex-1 px-2 py-[3px]">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        系统信息 · 收集了 2001 年 10 月 25 日的数据
      </div>
    </div>
  )
}
