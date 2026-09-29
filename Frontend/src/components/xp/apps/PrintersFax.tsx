'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, GroupBox, XPRadio } from '../ui'
import { Bmp } from '../bmp'
import { playClick, playDing, playPrintDone } from '../sounds'

/* ═══════════ 打印机和传真 ═══════════
   空文件夹 + 添加打印机向导（本地/网络 → 厂商型号 → 命名 → 测试页 → 安装）
   安装结果写入 store.printers（全局），供各应用"打印"功能使用 */

const MAKERS: Record<string, string[]> = {
  'HP（惠普）': ['HP LaserJet 6L', 'HP LaserJet 1000', 'HP DeskJet 5600'],
  'Epson（爱普生）': ['Epson LQ-1600K', 'Epson Stylus C41'],
  '联想（Legend）': ['联想 LJ2400', '联想 LJ2312P'],
  'Star（斯大）': ['Star AR-3200+', 'Star CR-3240'],
}

function AddPrinterWiz({ onClose }: { onClose: (installed?: string) => void }) {
  const [step, setStep] = useState(0) /* 0 欢迎 1 本地/网络 2 型号 3 命名 4 测试页 5 复制 6 完成 */
  const [local, setLocal] = useState(true)
  const [maker, setMaker] = useState('HP（惠普）')
  const [model, setModel] = useState('HP LaserJet 6L')
  const [name, setName] = useState('HP LaserJet 6L')
  const [defPrint, setDefPrint] = useState(true)
  const [testPage, setTestPage] = useState(true)
  const [pct, setPct] = useState(0)
  const showToast = useXP((s) => s.showToast)

  useEffect(() => {
    if (step !== 5) return
    if (pct >= 100) {
      const t = setTimeout(() => { setStep(6); playDing() }, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setPct((p) => Math.min(100, p + 4 + Math.random() * 10)), 80)
    return () => clearTimeout(t)
  }, [step, pct])

  const HDR = (
    <div className="flex items-start gap-3 pb-3 border-b border-[#d8d5c8] mb-3">
      <Bmp name="printer" size={34} />
      <div className="text-[13px] font-bold leading-[17px]">添加打印机向导</div>
    </div>
  )

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10">
      <div className="w-[420px] bg-[#ece9d8] rounded-[6px] border border-[#0a3c94] shadow-[4px_4px_14px_rgba(0,0,40,0.4)] overflow-hidden">
        <div className="flex items-center justify-between px-2 h-[24px] bg-gradient-to-b from-[#2a72c8] to-[#1648a0] cursor-default">
          <span className="text-white text-[11px] font-bold">添加打印机向导</span>
          <button type="button" className="text-white/80 hover:text-white text-[12px] leading-none px-1" onClick={() => onClose()}>✕</button>
        </div>
        <div className="p-4 min-h-[240px] flex flex-col">
          {step === 0 ? (
            <div className="flex-1">
              {HDR}
              <div className="leading-[17px] text-[#2a2a1a]">
                此向导帮助您安装打印机或连接网络中的打印机。<br /><br />
                <span className="text-[#5a5a4a]">单击"下一步"继续。</span>
              </div>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="flex-1">
              {HDR}
              <div className="font-bold mb-2">请选择描述您想使用的打印机的选项：</div>
              <div className="space-y-2">
                <XPRadio checked={local} label="连接到此计算机的本地打印机(L)" onChange={() => { setLocal(true); playClick() }} />
                <div className="pl-5 text-[10px] text-[#5a5a4a] -mt-1">自动检测并安装即插即用打印机(A)</div>
                <XPRadio checked={!local} label="连接到这台计算机的网络打印机(E)" onChange={() => { setLocal(false); playClick() }} />
                <div className="pl-5 text-[10px] text-[#5a5a4a] -mt-1">浏览打印机(R)…</div>
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="flex-1">
              {HDR}
              <div className="font-bold mb-1">制造商(M):</div>
              <div className="border border-[#8a867e] bg-white rounded-[2px] h-[120px] overflow-y-auto xp-thin-scroll mb-2">
                {Object.keys(MAKERS).map((m) => (
                  <button key={m} type="button" className={`w-full text-left px-2 py-[3px] ${maker === m ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`} onClick={() => { setMaker(m); setModel(MAKERS[m][0]); setName(MAKERS[m][0]); playClick() }}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="font-bold mb-1">打印机(P):</div>
              <div className="border border-[#8a867e] bg-white rounded-[2px] h-[80px] overflow-y-auto xp-thin-scroll">
                {MAKERS[maker].map((mm) => (
                  <button key={mm} type="button" className={`w-full text-left px-2 py-[3px] ${model === mm ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`} onClick={() => { setModel(mm); setName(mm); playClick() }}>
                    {mm}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="flex-1">
              {HDR}
              <div className="font-bold mb-2">打印机名(P):</div>
              <input
                className="w-full h-[20px] border border-[#8a867e] bg-white rounded-[2px] px-1 text-[11px] mb-3 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <div className="leading-[16px] text-[#2a2a1a]">
                <span className="font-bold">是否希望将这台打印机设置为默认打印机?</span>
                <div className="mt-2 space-y-2">
                  <XPRadio checked={defPrint} label="是(Y)" onChange={() => { setDefPrint(true); playClick() }} />
                  <XPRadio checked={!defPrint} label="否(N)" onChange={() => { setDefPrint(false); playClick() }} />
                </div>
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="flex-1">
              {HDR}
              <div className="leading-[16px] text-[#2a2a1a] mb-2">
                要打印测试页吗?<br />
                <span className="text-[#5a5a4a] text-[10px]">（确认打印机已连接、通电并装入纸张）</span>
              </div>
              <div className="space-y-2">
                <XPRadio checked={testPage} label="是(Y) - 打印测试页（推荐）" onChange={() => { setTestPage(true); playClick() }} />
                <XPRadio checked={!testPage} label="否(N)" onChange={() => { setTestPage(false); playClick() }} />
              </div>
            </div>
          ) : null}
          {step === 5 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="text-[12px] font-bold">正在复制文件…</div>
              <div className="w-[260px] h-[18px] bg-[#ece9d8] border border-[#8a867e] rounded-[2px] overflow-hidden">
                <div className="h-full bg-gradient-to-b from-[#5a8ae8] to-[#2a5ac0]" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[#5a5a4a]">{Math.round(pct)}%（从 Windows XP 安装光盘复制驱动…）</div>
            </div>
          ) : null}
          {step === 6 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Bmp name="printer" size={40} />
              <div className="text-[12px] font-bold">已成功完成添加打印机向导</div>
              <div className="text-center leading-[15px] text-[#3a3a2a]">
                您已经成功安装了打印机：<br />
                <span className="font-bold">{local ? '' : '网络打印机 '}{name}</span>
                {testPage ? <div className="mt-2 text-[#5a5a4a] text-[10px]">（测试页已发送到打印机：一张印着 Windows XP 徽标的纸）</div> : null}
              </div>
            </div>
          ) : null}

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#d8d5c8] mt-2">
            <XPButton disabled={step === 0 || step === 5 || step === 6} onClick={() => { setStep((s) => Math.max(0, s - 1)); playClick() }}>上一步(B) &lt;</XPButton>
            {step < 5 ? <XPButton primary onClick={() => { setStep((s) => s + 1); playClick() }}>下一步(N) &gt;</XPButton> : null}
            {step === 5 ? <XPButton primary disabled>下一步(N) &gt;</XPButton> : null}
            {step === 6 ? <XPButton primary onClick={() => { if (testPage) { playPrintDone(); showToast(`正在打印测试页到 ${name}……一张印着 Windows XP 徽标的纸从 LPT1 飘出`) } onClose(name || model) }}>完成</XPButton> : null}
            {step < 5 ? <XPButton onClick={() => onClose()}>取消</XPButton> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ 打印队列管理器（双击打印机打开，XP 真实布局） ═══════════ */
export function PrintQueue({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const openCtx = useXP((s) => s.openCtx)
  const allJobs = useXP((s) => s.printJobs)
  const pausePrintJob = useXP((s) => s.pausePrintJob)
  const cancelPrintJob = useXP((s) => s.cancelPrintJob)
  const cancelAllPrintJobs = useXP((s) => s.cancelAllPrintJobs)
  const printers = useXP((s) => s.printers)
  const addPrinter = useXP((s) => s.addPrinter)
  const printer = (win.props.printer as string) ?? ''
  const jobs = allJobs.filter((j) => j.printer === printer)
  const mine = printers.find((p) => p.name === printer)
  const [sel, setSel] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  /* 提交时间实时刷新（每秒重绘一次时间列） */
  useEffect(() => {
    const t = window.setInterval(() => forceTick((v) => v + 1), 1000)
    return () => window.clearInterval(t)
  }, [])

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    const h = d.getHours()
    const am = h < 12 ? '上午' : '下午'
    const hh = h % 12 === 0 ? 12 : h % 12
    const p = (n: number) => String(n).padStart(2, '0')
    return `${am} ${hh}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  const docCtx = (job: { id: number; status: string }) => [
    { label: job.status === 'printing' ? '暂停(A)' : '继续(E)', bold: true, onClick: () => { pausePrintJob(job.id); playClick() } },
    { label: '取消(C)', onClick: () => { cancelPrintJob(job.id); playClick() } },
    { separator: true },
    { label: '属性(R)...', onClick: () => useXP.getState().openApp('dialog', { kind: 'info', title: '文档属性', text: `文档名: ${allJobs.find((j) => j.id === job.id)?.doc ?? ''}\n\n状态: ${job.status === 'printing' ? '正在打印' : '已暂停'}\n所有者: Administrator\n提交时间: ${allJobs.find((j) => j.id === job.id) ? fmtTime(allJobs.find((j) => j.id === job.id)!.submitted) : ''}` }) },
  ]

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar
        menus={[
          {
            label: '打印机(P)',
            items: [
              { label: '暂停打印(A)', checked: jobs.some((j) => j.status === 'paused'), onClick: () => jobs.filter((j) => j.status === 'paused').length > 0 ? jobs.filter((j) => j.status === 'paused').forEach((j) => pausePrintJob(j.id)) : jobs.filter((j) => j.status === 'printing').forEach((j) => pausePrintJob(j.id)) },
              { label: '设为默认打印机(F)', checked: mine?.def ?? false, disabled: mine?.def, onClick: () => { if (mine) addPrinter(mine.name) } },
              { label: '打印首选项(F)...', onClick: () => useXP.getState().showToast('打印首选项：纵向 / A4 / 300dpi') },
              { label: '属性(R)', onClick: () => useXP.getState().showToast(`${printer} 属性：端口 LPT1，双向支持已启用`) },
              { separator: true },
              { label: '暂停打印所有文档(A)', disabled: jobs.length === 0, onClick: () => jobs.filter((j) => j.status === 'printing').forEach((j) => pausePrintJob(j.id)) },
              { label: '取消所有文档(L)', disabled: jobs.length === 0, onClick: () => { cancelAllPrintJobs(printer); playClick() } },
              { separator: true },
              { label: '关闭(C)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '文档(D)',
            items: [
              { label: '暂停(A)', disabled: sel === null, onClick: () => sel !== null && pausePrintJob(sel) },
              { label: '继续(E)', disabled: sel === null, onClick: () => sel !== null && pausePrintJob(sel) },
              { label: '取消(C)', disabled: sel === null, onClick: () => { if (sel !== null) { cancelPrintJob(sel); setSel(null) } } },
              { separator: true },
              { label: '属性(R)...', disabled: sel === null, onClick: () => { const j = allJobs.find((x) => x.id === sel); if (j) useXP.getState().openApp('dialog', { kind: 'info', title: '文档属性', text: `文档名: ${j.doc}\n\n状态: ${j.status === 'printing' ? '正在打印' : '已暂停'}\n所有者: Administrator\n提交时间: ${fmtTime(j.submitted)}` }) } },
            ],
          },
          { label: '查看(V)', items: [{ label: '刷新(R)', accelerator: 'F5', onClick: () => useXP.getState().showToast('队列已刷新') }] },
          { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => useXP.getState().openApp('dialog', { kind: 'info', title: '关于', text: `${printer}\n\nWindows XP 打印队列复刻版\n文档打印完成后自动出队，暂停的文档保留在队列中。` }) }] },
        ]}
      />
      {/* 文档列表（XP 真实列：文档名/状态/所有者/页数/大小/提交时间） */}
      <div className="flex-1 overflow-y-auto xp-thin-scroll min-h-0">
        <div className="flex h-[19px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] sticky top-0">
          <div className="pl-2 w-[30%] font-bold border-r border-[#d8d5c8]">文档名</div>
          <div className="px-2 w-[90px] font-bold border-r border-[#d8d5c8]">状态</div>
          <div className="px-2 w-[100px] font-bold border-r border-[#d8d5c8]">所有者</div>
          <div className="px-2 w-[52px] font-bold border-r border-[#d8d5c8] text-right">页数</div>
          <div className="px-2 flex-1 font-bold border-r border-[#d8d5c8] text-right">大小</div>
          <div className="px-2 w-[104px] font-bold">提交时间</div>
        </div>
        {jobs.map((j) => (
          <div
            key={j.id}
            className={`flex items-center h-[18px] border-b border-[#f0ede4] cursor-default ${sel === j.id ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
            onClick={() => setSel(j.id)}
            onDoubleClick={() => setSel(j.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setSel(j.id)
              openCtx(e.clientX, e.clientY, docCtx(j))
            }}
          >
            <div className="pl-2 w-[30%] truncate flex items-center gap-1">
              <Bmp name="printer" size={13} />
              {j.doc}
            </div>
            <div className="px-2 w-[90px] truncate">{j.status === 'printing' ? '正在打印' : '已暂停'}</div>
            <div className="px-2 w-[100px] truncate">{j.owner}</div>
            <div className="px-2 w-[52px] text-right">{j.pages}</div>
            <div className="px-2 flex-1 text-right truncate">{j.size}</div>
            <div className="px-2 w-[104px] truncate">{fmtTime(j.submitted)}</div>
          </div>
        ))}
        {jobs.length === 0 ? <div className="h-full flex items-center justify-center text-[#8a8a8a]">没有排队的打印文档</div> : null}
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a] justify-between">
        <span>{jobs.length} 个文档</span>
        <span>{mine?.def ? '默认打印机' : printer}</span>
      </div>
    </div>
  )
}

export default function PrintersFax({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openCtx = useXP((s) => s.openCtx)
  const printers = useXP((s) => s.printers)
  const addPrinter = useXP((s) => s.addPrinter)
  const removePrinter = useXP((s) => s.removePrinter)
  const focusWindow = useXP((s) => s.focusWindow)
  const windows = useXP((s) => s.windows)
  const [wiz, setWiz] = useState(false)

  /* 打开打印队列（同打印机已有队列窗口则聚焦） */
  const openQueue = (name: string) => {
    const exist = windows.find((w) => w.app === 'printqueue' && w.props.printer === name)
    if (exist) {
      focusWindow(exist.id)
      return
    }
    useXP.getState().openApp('printqueue', { printer: name }, name)
    playClick()
  }

  const printerCtx = (p: { name: string; def: boolean }) => [
    { label: '打开(O)', bold: true, onClick: () => openQueue(p.name) },
    { label: '设为默认打印机(A)', checked: p.def, onClick: () => { addPrinter(p.name); showToast(`${p.name} 已设为默认打印机`) } },
    { separator: true },
    { label: '打印首选项(F)...', onClick: () => showToast('打印首选项：纵向 / A4 / 300dpi（2001 年的激光标准）') },
    { label: '属性(R)', onClick: () => showToast(`${p.name} 属性：端口 LPT1，驱动自带，那个年代不需要更新`) },
    { separator: true },
    { label: '删除(D)', onClick: () => removePrinter(p.name) },
  ]

  return (
    <div className="relative flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '添加打印机(A)...', onClick: () => setWiz(true) }, { separator: true }, { label: '关闭(C)', onClick: () => closeWindow(win.id) }] },
          { label: '编辑(E)', items: [{ label: '全选(S)', onClick: () => showToast('没有可选中项') }] },
          { label: '查看(V)', items: [{ label: '详细信息(D)', onClick: () => showToast('详细视图：可以看到"打印机名 / 状态 / 备注"') }] },
          { label: '工具(T)', items: [{ label: '文件夹选项(O)...', onClick: () => showToast('文件夹选项：显示所有文件和文件夹（隐藏受保护的操作系统文件）') }] },
          { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('打印机和传真 —— Windows XP 复刻版') }] },
        ]}
      />
      <div className="flex-1 flex min-h-0">
        {/* 左侧任务栏 */}
        <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
            <div className="font-bold text-[#1a3f8f] mb-1">打印机任务</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => setWiz(true)}>
              添加打印机
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('设置打印首选项：需要先安装一台打印机')}>
              设置打印首选项
            </button>
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="font-bold text-[#1a3f8f] mb-1">其它位置</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => useXP.getState().openApp('controlpanel', {})}>
              控制面板
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => useXP.getState().openApp('explorer', { path: [] }, '我的电脑')}>
              我的电脑
            </button>
          </div>
        </div>

        {/* 主列表 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll p-4">
          <div className="text-[12px] font-bold text-[#2a2a1a] mb-1">打印机</div>
          <div className="w-[220px] h-[2px] bg-[#5a86cf] mb-3" />
          <div className="flex flex-wrap gap-3">
            {/* 添加打印机图标（永远第一项） */}
            <button
              type="button"
              className="w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb]"
              onClick={() => playClick()}
              onDoubleClick={() => setWiz(true)}
            >
              <Bmp name="printer" size={32} className="opacity-60" />
              <span className="text-center leading-[13px]">添加打印机</span>
            </button>
            {printers.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`relative w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb]`}
                onClick={() => playClick()}
                onDoubleClick={() => openQueue(p.name)}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openCtx(e.clientX, e.clientY, printerCtx(p)) }}
              >
                <Bmp name="printer" size={32} />
                {/* 默认打印机小勾角标（XP 经典） */}
                {p.def ? (
                  <span className="absolute left-[4px] top-[4px] w-[15px] h-[15px] rounded-full bg-[#2a9e3a] text-white text-[10px] leading-[15px] text-center font-bold shadow">✓</span>
                ) : null}
                <span className="text-center leading-[13px]">{p.name}</span>
                <span className="text-[10px] text-[#2a7a2a]">就绪</span>
              </button>
            ))}
          </div>
          {printers.length === 0 ? (
            <div className="mt-6 text-[#8a8a7a] text-[11px] leading-[16px]">
              尚未安装打印机。双击"添加打印机"开始安装向导。<br />
              安装后，记事本 / 写字板 / Internet Explorer 的打印功能即可使用。
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        {printers.length} 台打印机　{printers.find((p) => p.def) ? `默认: ${printers.find((p) => p.def)!.name}` : ''}
      </div>

      {wiz ? (
        <AddPrinterWiz onClose={(installed) => {
          setWiz(false)
          if (installed) addPrinter(installed)
        }} />
      ) : null}
    </div>
  )
}
