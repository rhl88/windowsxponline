'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP, type CtxItem } from '../store'
import { MenuBar, XPButton, GroupBox, XPRadio, XPCheck } from '../ui'
import { Bmp } from '../bmp'
import { playClick } from '../sounds'

/* ═══════════════ 共享数据 ═══════════════ */

interface SvcDef {
  name: string
  desc: string
  status: 'running' | 'stopped' | 'paused'
  startup: '自动' | '手动' | '已禁用'
  logon: string
  protect?: boolean /* 系统关键服务（停止时 XP 会拒绝或强提示） */
  canPause?: boolean
}

const SERVICES_INIT: SvcDef[] = [
  { name: 'Alerter', desc: '通知所选用户和计算机有关系统管理警报。', status: 'stopped', startup: '手动', logon: 'Local Service' },
  { name: 'Application Management', desc: '提供软件安装服务，诸如分派、发布以及删除。', status: 'stopped', startup: '手动', logon: '本地系统' },
  { name: 'ClipBook', desc: '支持"剪贴簿查看器"，以便从远程剪贴簿查阅剪贴页面。', status: 'stopped', startup: '已禁用', logon: '本地系统' },
  { name: 'COM+ Event System', desc: '支持系统事件通知服务(SENS)，在此情况下它才可以提供自动地分布事件。', status: 'running', startup: '手动', logon: '本地系统' },
  { name: 'Computer Browser', desc: '维护网络上计算机的更新列表，并将列表提供给指定为浏览器的计算机。', status: 'stopped', startup: '自动', logon: '本地系统' },
  { name: 'DHCP Client', desc: '通过注册和更改 IP 地址以及 DNS 名称来管理网络配置。', status: 'running', startup: '自动', logon: '本地系统' },
  { name: 'DNS Client', desc: '解析和缓冲域名系统(DNS)名称。', status: 'running', startup: '自动', logon: '网络服务' },
  { name: 'Event Log', desc: '记录来自程序和 Windows 的事件消息。事件日志包含诊断信息。', status: 'running', startup: '自动', logon: '本地系统', protect: true },
  { name: 'Plug and Play', desc: '管理设备安装以及设备配置，并且通知程序设备何时改变。', status: 'running', startup: '自动', logon: '本地系统', protect: true },
  { name: 'Print Spooler', desc: '将文件加载到内存中以便迟后打印。', status: 'running', startup: '自动', logon: '本地系统', canPause: true },
  { name: 'Remote Registry', desc: '允许远程用户修改此计算机上的注册表设置。', status: 'stopped', startup: '自动', logon: '本地服务' },
  { name: 'Server', desc: '支持此计算机通过网络的文件、打印、和命名管道共享。', status: 'running', startup: '自动', logon: '本地系统', canPause: true },
  { name: 'Task Scheduler', desc: '使用户能在此计算机上配置和制定自动任务的日程。', status: 'running', startup: '自动', logon: '本地系统' },
  { name: 'Themes', desc: '为用户提供使用主题管理经验。', status: 'running', startup: '自动', logon: '本地系统' },
  { name: 'Windows Audio', desc: '管理基于 Windows 的程序的音频设备。', status: 'running', startup: '自动', logon: '本地系统' },
  { name: 'Windows Time', desc: '维护在网络上的所有客户端和服务器的时间和日期同步化。', status: 'stopped', startup: '自动', logon: '网络服务' },
  { name: 'Workstation', desc: '创建和维护客户端网络的远程连接。', status: 'running', startup: '自动', logon: '本地系统' },
]

interface EventDef {
  log: 'app' | 'sec' | 'sys'
  type: '错误' | '警告' | '信息' | '审核成功'
  ago: number /* 距今分钟数（渲染时换算真实时钟，保证自洽） */
  source: string
  cat: string
  id: number
  user: string
  computer: string
  desc: string
}

const EVENTS_INIT: EventDef[] = [
  /* 系统 */
  { log: 'sys', type: '信息', ago: 6, source: 'Event Log', cat: '无', id: 6005, user: 'N/A', computer: 'MY-COMPUTER', desc: '事件日志服务已启动。' },
  { log: 'sys', type: '信息', ago: 7, source: 'Event Log', cat: '无', id: 6009, user: 'N/A', computer: 'MY-COMPUTER', desc: 'Microsoft (R) Windows (R) 5.01.2600 Service Pack 2 Uniprocessor Free。' },
  { log: 'sys', type: '信息', ago: 5, source: 'Service Control Manager', cat: '无', id: 7035, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: 'Print Spooler 服务成功地发送一个开始控件。' },
  { log: 'sys', type: '警告', ago: 4, source: 'DHCP', cat: '无', id: 1003, user: 'N/A', computer: 'MY-COMPUTER', desc: '您的计算机未能自动获取网络地址。这可能是由 DHCP 服务器不可达造成的。将使用备用专用地址 169.254.12.88。' },
  { log: 'sys', type: '错误', ago: 3, source: 'Service Control Manager', cat: '无', id: 7000, user: 'N/A', computer: 'MY-COMPUTER', desc: 'ClipBook 服务无法启动。服务并未报告一个具体的错误码。' },
  { log: 'sys', type: '信息', ago: 2, source: 'PlugPlayManager', cat: '无', id: 4001, user: 'N/A', computer: 'MY-COMPUTER', desc: '设备 Realtek RTL8139 Family PCI Fast Ethernet NIC 的配置已成功。' },
  { log: 'sys', type: '信息', ago: 137, source: 'EventLog', cat: '无', id: 6006, user: 'N/A', computer: 'MY-COMPUTER', desc: '事件日志服务已停止。' },
  /* 应用程序 */
  { log: 'app', type: '信息', ago: 8, source: 'Winlogon', cat: '无', id: 1002, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '欢迎登录会话已建立（Web 复刻版会话）。' },
  { log: 'app', type: '警告', ago: 95, source: 'Windows Media Player', cat: '无', id: 15, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '播放的文件所用的编码解码器报告了一个可恢复的错误。音频以备用管线继续播放。' },
  { log: 'app', type: '错误', ago: 96, source: 'Application Error', cat: '无', id: 1000, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '错误应用程序 movie.exe，版本 1.1.2427.1，错误模块 movie.exe，版本 1.1.2427.1，错误地址 0x00012a5f。' },
  { log: 'app', type: '信息', ago: 300, source: 'Winlogon', cat: '无', id: 1001, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '注销会话已结束（Web 复刻版会话）。' },
  /* 安全性 */
  { log: 'sec', type: '审核成功', ago: 9, source: 'Security', cat: '登录/注销', id: 528, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '成功登录：\n登录类型: 2（交互式，欢迎屏幕）\n登录进程: Advapi\n身份验证数据包: Negotiate\n工作站名: MY-COMPUTER' },
  { log: 'sec', type: '审核成功', ago: 1, source: 'Security', cat: '对象访问', id: 560, user: 'MY-COMPUTER\\Administrator', computer: 'MY-COMPUTER', desc: '对象服务器授予访问权限：\n对象: C:\\Documents and Settings\\Administrator\\桌面\n授予: Everyone 完全控制' },
]

const EVT_ICON: Record<EventDef['type'], string> = {
  '错误': 'dlg-error', '警告': 'dlg-warn', '信息': 'dlg-info', '审核成功': 'dlg-info',
}

/* ═══════════════ 服务面板（独立 app 与计算机管理共用） ═══════════════ */

export function ServicesPanel({ win, compact = false }: { win: WinState; compact?: boolean }) {
  const showToast = useXP((s) => s.showToast)
  const openCtx = useXP((s) => s.openCtx)
  const openDialog = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const setMasterVolume = useXP((s) => s.setMasterVolume)
  const [svcs, setSvcs] = useState<SvcDef[]>(SERVICES_INIT)
  const [sel, setSel] = useState<string | null>('Event Log')

  const cur = svcs.find((s) => s.name === sel)

  const setSvc = (name: string, patch: Partial<SvcDef>) =>
    setSvcs((list) => list.map((s) => (s.name === name ? { ...s, ...patch } : s)))

  const act = (s: SvcDef, op: 'start' | 'stop' | 'pause' | 'resume' | 'restart') => {
    playClick()
    if (op === 'start') {
      if (s.startup === '已禁用') { showToast(`服务 ${s.name} 已被禁用，无法启动（请在属性中先改为自动/手动）`); return }
      setSvc(s.name, { status: 'running' }); showToast(`服务 ${s.name} 已启动`)
    } else if (op === 'stop') {
      if (s.protect) {
        openDialog('dialog', {
          kind: 'warn', title: '服务', icon: 'warn',
          text: `Windows 无法停止 ${s.name} 服务。\n\n此服务是 Windows XP 的关键组件，停止它将导致系统不稳定（真实 XP 也不允许）。`,
        })
        return
      }
      setSvc(s.name, { status: 'stopped' }); showToast(`服务 ${s.name} 已停止`)
      if (s.name === 'Windows Audio') { setMasterVolume(0); showToast('Windows Audio 已停止：系统声音已随之静音（真实行为）') }
      if (s.name === 'Themes') showToast('Themes 已停止：Luna 主题回到经典灰（复刻版保留 Luna 以示敬意）')
    } else if (op === 'pause') {
      if (!s.canPause) { showToast(`服务 ${s.name} 不接受暂停或继续请求`); return }
      setSvc(s.name, { status: 'paused' }); showToast(`服务 ${s.name} 已暂停`)
    } else if (op === 'resume') {
      setSvc(s.name, { status: 'running' }); showToast(`服务 ${s.name} 已恢复运行`)
    } else {
      if (s.protect) { showToast(`${s.name} 是关键系统服务，无法重新启动`); return }
      setSvc(s.name, { status: 'running' }); showToast(`服务 ${s.name} 正在重新启动……已恢复`)
    }
  }

  const svcCtx = (s: SvcDef): CtxItem[] => [
    { label: '启动', bold: true, disabled: s.status !== 'stopped', onClick: () => act(s, 'start') },
    { label: '停止', disabled: s.status === 'stopped', onClick: () => act(s, 'stop') },
    { label: '暂停', disabled: !s.canPause || s.status !== 'running', onClick: () => act(s, 'pause') },
    { label: '恢复', disabled: s.status !== 'paused', onClick: () => act(s, 'resume') },
    { label: '重新启动', disabled: s.status !== 'running', onClick: () => act(s, 'restart') },
    { separator: true },
    { label: '属性(R)', onClick: () => showProps(s) },
  ]

  const showProps = (s: SvcDef) => {
    openDialog('dialog', {
      kind: 'info', title: `${s.name} 的属性` + '（复刻版摘要）', icon: 'info',
      text: `${s.desc}\n\n状态: ${s.status === 'running' ? '已启动' : s.status === 'paused' ? '已暂停' : '未启动'}\n启动类型: ${s.startup}\n登录身份: ${s.logon}\n可执行文件路径: C:\\WINDOWS\\system32\\svchost.exe -k ${s.name}`,
    })
  }

  return (
    <div className="flex flex-col h-full select-none text-[11px]">
      {!compact ? (
        <MenuBar menus={[
          { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
          { label: '操作(A)', items: [
            { label: '刷新(R)', onClick: () => showToast('服务列表已刷新（共 ' + svcs.length + ' 个服务）') },
            { separator: true },
            { label: '属性(R)', onClick: () => cur && showProps(cur) },
          ] },
          { label: '查看(V)', items: [{ label: '详细(D)', checked: true, onClick: () => showToast('详细视图：名称/描述/状态/启动类型/登录') }, { label: '简单(S)', onClick: () => showToast('简单视图仅显示名称与状态，复刻版保持详细') }] },
          { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('服务 —— MMC 管理单元 · Windows XP 复刻版') }] },
        ]} />
      ) : null}
      <div className="flex-1 flex min-h-0">
        {/* 左栏：服务分类 */}
        {!compact ? (
          <div className="w-[150px] shrink-0 border-r border-[#d8d5c8] bg-white overflow-y-auto xp-thin-scroll p-1">
            <div className="flex items-center gap-1 px-1 py-[3px] rounded-[2px] bg-[#316ac5] text-white font-bold">
              <span className="text-[9px]">▣</span> 服务（本地）
            </div>
          </div>
        ) : null}
        {/* 右侧：服务列表 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-[1] overflow-auto xp-thin-scroll">
            <table className="w-full border-collapse" cellPadding={0} cellSpacing={0}>
              <thead>
                <tr className="sticky top-0 z-10">
                  {['名称', '描述', '状态', '启动类型', '登录身份'].map((h, i) => (
                    <th key={h} className={`bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal whitespace-nowrap ${i === 0 ? 'w-[170px]' : ''} ${i === 2 ? 'w-[70px]' : ''} ${i === 3 ? 'w-[80px]' : ''} ${i === 4 ? 'w-[90px]' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {svcs.map((s) => (
                  <tr
                    key={s.name}
                    className={`cursor-default ${sel === s.name ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                    onClick={() => setSel(s.name)}
                    onDoubleClick={() => showProps(s)}
                    onContextMenu={(e) => { e.preventDefault(); setSel(s.name); openCtx(e.clientX, e.clientY, svcCtx(s)) }}
                  >
                    <td className="px-2 py-[2px] truncate">{s.name}</td>
                    <td className="px-2 py-[2px] truncate text-[#5a5a5a]">{s.desc}</td>
                    <td className="px-2 py-[2px]">{s.status === 'running' ? '已启动' : s.status === 'paused' ? '已暂停' : ''}</td>
                    <td className="px-2 py-[2px]">{s.startup}</td>
                    <td className="px-2 py-[2px]">{s.logon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 底部操作条 */}
          <div className="shrink-0 flex gap-2 px-2 py-[4px] border-t border-[#d8d5c8] bg-[#f6f4ea]">
            <XPButton onClick={() => cur && act(cur, 'start')} disabled={!cur || cur.status !== 'stopped'}>启动(S)</XPButton>
            <XPButton onClick={() => cur && act(cur, 'stop')} disabled={!cur || cur.status === 'stopped'}>停止(T)</XPButton>
            <XPButton onClick={() => cur && act(cur, 'pause')} disabled={!cur || !cur.canPause || cur.status !== 'running'}>暂停(P)</XPButton>
            <XPButton onClick={() => cur && act(cur, 'resume')} disabled={!cur || cur.status !== 'paused'}>继续(R)</XPButton>
            <XPButton onClick={() => cur && act(cur, 'restart')} disabled={!cur || cur.status !== 'running'}>重新启动(E)</XPButton>
          </div>
        </div>
      </div>
      {!compact ? (
        <div className="h-[20px] shrink-0 flex items-center gap-4 px-2 bg-[#ece9d8] border-t border-[#d8d5c8] text-[#5a5a4a]">
          <span>{svcs.length} 个服务</span>
          <span>已启动 {svcs.filter((s) => s.status === 'running').length} · 已停止 {svcs.filter((s) => s.status === 'stopped').length}</span>
        </div>
      ) : null}
    </div>
  )
}

/* ═══════════════ 事件查看器面板（独立 app 与计算机管理共用） ═══════════════ */

const LOG_NAMES: Record<EventDef['log'], string> = { app: '应用程序', sec: '安全性', sys: '系统' }

export function EventsPanel({ win, compact = false, log: initLog = 'sys' }: { win: WinState; compact?: boolean; log?: EventDef['log'] }) {
  const showToast = useXP((s) => s.showToast)
  const openDialog = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const [log, setLog] = useState<EventDef['log']>(initLog)
  const [sel, setSel] = useState<number | null>(null)
  const [now] = useState(() => Date.now())
  /* ago(分钟前) → 真实时钟的 日期/时间 字符串（与任务栏时钟自洽） */
  const events = useMemo(() => {
    const fmt = (ms: number) => {
      const d = new Date(ms)
      const p = (n: number) => String(n).padStart(2, '0')
      return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }
    }
    return EVENTS_INIT.filter((e) => e.log === log)
      .map((e) => ({ ...e, ...fmt(now - e.ago * 60000) }))
      .sort((a, b) => b.ago - a.ago)
  }, [log, now])
  const cur = events.find((e) => e.id === sel && e.log === log)

  const showDetail = (e: typeof events[number]) => {
    openDialog('dialog', {
      kind: e.type === '错误' ? 'error' : e.type === '警告' ? 'warn' : 'info',
      title: '事件属性',
      text: `${LOG_NAMES[e.log]} 日志 · ${e.type}\n\n日期: ${e.date}   时间: ${e.time}\n来源: ${e.source}   类别: ${e.cat}\n事件 ID: ${e.id}   用户: ${e.user}\n计算机: ${e.computer}\n\n描述:\n${e.desc}`,
    })
  }

  return (
    <div className="flex flex-col h-full select-none text-[11px]">
      {!compact ? (
        <MenuBar menus={[
          { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
          { label: '操作(A)', items: [
            { label: '打开(O)', onClick: () => cur && showDetail(cur) },
            { label: '刷新(R)', onClick: () => showToast('事件列表已刷新') },
            { separator: true },
            { label: '清除所有事件(C)', onClick: () => showToast('复刻版的事件是珍贵的历史文物，拒绝清除 :)') },
          ] },
          { label: '查看(V)', items: [{ label: '详细(D)', checked: true, onClick: () => showToast('详细视图）当前）') }] },
          { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('事件查看器 —— MMC 管理单元 · Windows XP 复刻版') }] },
        ]} />
      ) : null}
      <div className="flex-1 flex min-h-0">
        {/* 左树：三种日志 */}
        <div className="w-[150px] shrink-0 border-r border-[#d8d5c8] bg-white overflow-y-auto xp-thin-scroll p-1">
          <div className="flex items-center gap-1 px-1 py-[3px] font-bold text-[#3a3a3a]">
            <span className="text-[9px]">⊟</span> 事件查看器（本地）
          </div>
          {(['app', 'sec', 'sys'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`w-full flex items-center gap-[6px] pl-[18px] pr-1 py-[3px] text-left rounded-[2px] ${log === k ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
              onClick={() => { setLog(k); setSel(null) }}
            >
              <Bmp name={EVT_ICON[EVENTS_INIT.find((e) => e.log === k)!.type]} size={16} />
              {LOG_NAMES[k]}
            </button>
          ))}
        </div>
        {/* 右侧：事件列表 */}
        <div className="flex-1 min-w-0 bg-white overflow-auto xp-thin-scroll">
          <table className="border-collapse table-fixed min-w-[780px] w-full" cellPadding={0} cellSpacing={0}>
            <thead>
              <tr className="sticky top-0 z-10">
                {['类型', '日期', '时间', '来源', '分类', '事件', '用户', '计算机'].map((h, i) => (
                  <th key={h} className={`bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal whitespace-nowrap ${['w-[96px]', 'w-[92px]', 'w-[80px]', 'w-[170px]', 'w-[56px]', 'w-[48px]', 'w-[140px]', 'w-[98px]'][i]}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr
                  key={`${e.log}-${e.id}-${e.time}`}
                  className={`cursor-default ${sel === e.id && cur === e ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                  onClick={() => setSel(e.id)}
                  onDoubleClick={() => showDetail(e)}
                >
                  <td className="px-2 py-[2px] whitespace-nowrap overflow-hidden"><span className="inline-flex items-center gap-1"><Bmp name={EVT_ICON[e.type]} size={16} />{e.type}</span></td>
                  <td className="px-2 py-[2px] whitespace-nowrap overflow-hidden">{e.date}</td>
                  <td className="px-2 py-[2px] whitespace-nowrap overflow-hidden">{e.time}</td>
                  <td className="px-2 py-[2px] truncate" title={e.source}>{e.source}</td>
                  <td className="px-2 py-[2px]">{e.cat}</td>
                  <td className="px-2 py-[2px]">{e.id}</td>
                  <td className="px-2 py-[2px] truncate" title={e.user}>{e.user}</td>
                  <td className="px-2 py-[2px]">{e.computer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!compact ? (
        <div className="h-[20px] shrink-0 flex items-center gap-4 px-2 bg-[#ece9d8] border-t border-[#d8d5c8] text-[#5a5a4a]">
          <span>{LOG_NAMES[log]} 日志 · {events.length} 个事件</span>
        </div>
      ) : null}
    </div>
  )
}

/* ═══════════════ 性能监视器 ═══════════════ */

export function PerfMon({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [running, setRunning] = useState(true)
  const [hist, setHist] = useState<number[]>(() => Array.from({ length: 60 }, () => 5 + Math.random() * 20))
  const tRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      tRef.current += 1
      setHist((h) => {
        const last = h[h.length - 1]
        const drift = (Math.sin(tRef.current / 7) * 18 + Math.sin(tRef.current / 2.3) * 9 + Math.random() * 14) + 22
        const next = Math.max(3, Math.min(98, last * 0.35 + drift * 0.65))
        return [...h.slice(1), next]
      })
    }, 600)
    return () => window.clearInterval(t)
  }, [running])

  const W = 600, H = 150
  const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * W},${H - (v / 100) * (H - 8) - 4}`).join(' ')
  const cur = Math.round(hist[hist.length - 1])

  return (
    <div className="flex flex-col h-full select-none text-[11px]">
      <MenuBar menus={[
        { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
        { label: '操作(A)', items: [{ label: running ? '暂停(J)' : '继续(J)', onClick: () => setRunning(!running) }] },
        { label: '查看(V)', items: [{ label: '图表(C)', checked: true, onClick: () => showToast('图表视图：处理器时间 %') }, { label: '报告(R)', onClick: () => showToast('报告视图：当前值 ' + cur + ' %') }] },
        { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('性能监视器 —— Windows XP 复刻版') }] },
      ]} />
      <div className="flex-1 flex min-h-0">
        {/* 左树 */}
        <div className="w-[150px] shrink-0 border-r border-[#d8d5c8] bg-white p-1 overflow-y-auto xp-thin-scroll">
          <div className="flex items-center gap-1 px-1 py-[3px] font-bold text-[#3a3a3a]"><span className="text-[9px]">⊟</span> 性能日志和警报</div>
          <div className="pl-[18px] py-[3px] text-[#5a5a5a]">计数器日志</div>
          <div className="pl-[18px] py-[3px] text-[#5a5a5a]">跟踪日志</div>
          <div className="pl-[18px] py-[3px] bg-[#316ac5] text-white rounded-[2px] px-1">警报</div>
        </div>
        {/* 图表 */}
        <div className="flex-1 min-w-0 bg-white p-2 flex flex-col">
          <div className="flex-[1] min-h-0 border border-[#d8d5c8] bg-[#fafaff] relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
              {[0.2, 0.4, 0.6, 0.8].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="#c8d4e8" strokeWidth={1} />)}
              {Array.from({ length: 11 }, (_, i) => <line key={i} x1={(i / 10) * W} x2={(i / 10) * W} y1={0} y2={H} stroke="#e0e8f4" strokeWidth={1} />)}
              <polyline points={pts} fill="none" stroke="#1a6b1a" strokeWidth={1.6} />
            </svg>
            <div className="absolute top-1 right-2 font-mono text-[11px] text-[#1a6b1a] bg-white/80 px-1">{cur} %</div>
          </div>
          <div className="shrink-0 flex items-center gap-4 border border-t-0 border-[#d8d5c8] bg-[#f6f4ea] px-2 py-[4px]">
            <Bmp name="adm-perfmon" size={16} />
            <span className="font-mono">\Processor(_Total)\% Processor Time</span>
            <span className="text-[#5a5a4a]">最后值: {cur} · 平均: {Math.round(hist.reduce((a, b) => a + b, 0) / hist.length)} · 最大: {Math.round(Math.max(...hist))}</span>
            <div className="flex-1" />
            <XPButton onClick={() => setRunning(!running)}>{running ? '暂停' : '继续'}</XPButton>
          </div>
        </div>
      </div>
      <div className="h-[20px] shrink-0 flex items-center px-2 bg-[#ece9d8] border-t border-[#d8d5c8] text-[#5a5a4a]">
        性能 · 采样间隔 0.6 秒 · 绿色 = 处理器时间百分比
      </div>
    </div>
  )
}

/* ═══════════════ 计算机管理（MMC 主壳） ═══════════════ */

type MgmtNode =
  | { key: 'sysinfo' }
  | { key: 'eventvwr' }
  | { key: 'devmgr' }
  | { key: 'users' }
  | { key: 'diskmgr' }
  | { key: 'services' }

const TREE: Array<{ group: string; items: Array<{ label: string; node: MgmtNode; icon: string }> }> = [
  {
    group: '系统工具', items: [
      { label: '事件查看器', node: { key: 'eventvwr' }, icon: 'adm-eventvwr' },
      { label: '系统信息', node: { key: 'sysinfo' }, icon: 'sysinfo' },
      { label: '设备管理器', node: { key: 'devmgr' }, icon: 'cp-perf' },
      { label: '本地用户和组', node: { key: 'users' }, icon: 'cp-user' },
    ],
  },
  {
    group: '存储', items: [
      { label: '磁盘管理', node: { key: 'diskmgr' }, icon: 'harddrive' },
    ],
  },
  {
    group: '服务和应用程序', items: [
      { label: '服务', node: { key: 'services' }, icon: 'adm-services' },
    ],
  },
]

export function ComputerManagement({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [sel, setSel] = useState<string>(typeof win.props?.node === 'string' && ['sysinfo', 'eventvwr', 'devmgr', 'users', 'diskmgr', 'services'].includes(win.props.node as string) ? (win.props.node as string) : 'eventvwr')
  const [open, setOpen] = useState<Record<string, boolean>>({ '系统工具': true, '服务和应用程序': true })
  const selItem = TREE.flatMap((g) => g.items).find((i) => i.node.key === sel)

  return (
    <div className="flex flex-col h-full select-none text-[11px]">
      <MenuBar menus={[
        { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
        { label: '操作(A)', items: [{ label: '刷新(R)', onClick: () => showToast('计算机管理已刷新') }] },
        { label: '查看(V)', items: [{ label: '大图标', onClick: () => showToast('MMC 大图标视图在复刻版中保持详细列表') }] },
        { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('计算机管理 —— Microsoft Management Console · Windows XP 复刻版') }] },
      ]} />
      {/* MMC 工具栏 */}
      <div className="flex items-center gap-1 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
        <button type="button" className="w-[22px] h-[20px] rounded-[3px] hover:bg-[#e8f0fb] flex items-center justify-center" title="后退" onClick={() => showToast('MMC 后退：无历史记录')}>←</button>
        <button type="button" className="w-[22px] h-[20px] rounded-[3px] hover:bg-[#e8f0fb] flex items-center justify-center text-[#9a9a9a]" title="前进">→</button>
        <div className="w-[1px] h-[16px] bg-[#d8d5c8] mx-1" />
        <Bmp name="adm-compmgmt" size={16} />
        <span className="font-bold ml-1">控制台根节点</span>
      </div>
      <div className="flex-1 flex min-h-0">
        {/* 左树 */}
        <div className="w-[190px] shrink-0 border-r border-[#d8d5c8] bg-white overflow-y-auto xp-thin-scroll p-1">
          <div className="flex items-center gap-1 px-1 py-[3px] font-bold text-[#3a3a3a]">
            <span className="text-[9px]">⊟</span> 计算机管理（本地）
          </div>
          {TREE.map((g) => (
            <div key={g.group}>
              <button
                type="button"
                className="w-full flex items-center gap-1 px-1 py-[3px] text-left rounded-[2px] hover:bg-[#e8f0fb] font-bold text-[#3a3a3a]"
                onClick={() => setOpen((o) => ({ ...o, [g.group]: !o[g.group] }))}
              >
                <span className="text-[9px]">{open[g.group] ? '⊟' : '⊞'}</span> {g.group}
              </button>
              {open[g.group] ? g.items.map((it) => (
                <button
                  key={it.node.key}
                  type="button"
                  className={`w-full flex items-center gap-[6px] pl-[18px] pr-1 py-[3px] text-left rounded-[2px] ${sel === it.node.key ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                  onClick={() => { setSel(it.node.key); playClick() }}
                >
                  <Bmp name={it.icon} size={16} />
                  {it.label}
                </button>
              )) : null}
            </div>
          ))}
        </div>
        {/* 右内容 */}
        <div className="flex-1 min-w-0 bg-white overflow-auto xp-thin-scroll">
          {sel === 'eventvwr' ? <div className="h-full"><EventsPanel win={win} compact /></div> : null}
          {sel === 'services' ? <div className="h-full"><ServicesPanel win={win} compact /></div> : null}
          {sel === 'sysinfo' ? (
            <div className="p-3 space-y-2">
              <div className="font-bold text-[12px]">系统信息</div>
              <div className="grid grid-cols-[110px_1fr] gap-y-[4px] max-w-[420px]">
                <span className="text-[#5a5a5a]">OS 名称:</span><span>Microsoft Windows XP Professional</span>
                <span className="text-[#5a5a5a]">OS 版本:</span><span>5.1.2600 Service Pack 2 Build 2600</span>
                <span className="text-[#5a5a5a]">系统制造商:</span><span>Dell Computer Corporation（复刻）</span>
                <span className="text-[#5a5a5a]">处理器:</span><span>Genuine Intel(R) CPU T2400 @ 1.83GHz</span>
                <span className="text-[#5a5a5a]">BIOS 版本:</span><span>A08（Phoenix）</span>
                <span className="text-[#5a5a5a]">物理内存:</span><span>512 MB（浏览器分配）</span>
                <span className="text-[#5a5a5a]">页面文件空间:</span><span>1.5 GB（C:\pagefile.sys）</span>
              </div>
              <XPButton onClick={() => showToast('完整的系统信息请使用「系统信息」工具（sysinfo）')}>查看完整系统信息…</XPButton>
            </div>
          ) : null}
          {sel === 'devmgr' ? (
            <div className="p-2">
              {[
                { g: 'DVD/CD-ROM 驱动器', items: ['HL-DT-ST CD-RW GCE-8481B'] },
                { g: 'IDE ATA/ATAPI 控制器', items: ['Intel 82801G Ultra ATA Storage Controllers', '主要 IDE 通道', '次要 IDE 通道'] },
                { g: '磁盘驱动器', items: ['ST340014A'] },
                { g: '监视器', items: ['默认监视器'] },
                { g: '软盘驱动器', items: ['3.5 英寸软盘驱动器'] },
                { g: '声音、视频和游戏控制器', items: ['Audio Codecs', 'Legacy Audio Drivers', 'Realtek AC\'97 Audio'] },
                { g: '显示卡', items: ['NVIDIA GeForce2 MX/MX 400'] },
                { g: '网络适配器', items: ['Realtek RTL8139 Family PCI Fast Ethernet NIC', 'WAN 微型端口 (IP)'] },
                { g: '键盘', items: ['标准 101/102 键或 Microsoft 自然 PS/2 键盘'] },
                { g: '鼠标', items: ['PS/2 Compatible Mouse'] },
              ].map((d) => (
                <div key={d.g}>
                  <div className="flex items-center gap-1 py-[2px] font-bold">
                    <span className="text-[9px] text-[#5a5a5a]">⊞</span> {d.g}
                  </div>
                  {d.items.map((i) => (
                    <div key={i} className="flex items-center gap-1 pl-[18px] py-[2px] hover:bg-[#e8f0fb] rounded-[2px]">
                      <Bmp name="cp-perf" size={16} /> {i}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {sel === 'users' ? (
            <div className="p-3">
              <div className="font-bold text-[12px] mb-2">本地用户和组 → 用户</div>
              <table className="border-collapse w-full max-w-[420px]">
                <thead><tr>
                  {['名称', '描述', '已启用'].map((h) => <th key={h} className="bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal">{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr className="hover:bg-[#e8f0fb]"><td className="border border-[#d8d5c8] px-2 py-[2px]"><Bmp name="cp-user" size={16} className="inline mr-1 -align-middle" />Administrator</td><td className="border border-[#d8d5c8] px-2 py-[2px]">管理计算机(域)的内置帐户</td><td className="border border-[#d8d5c8] px-2 py-[2px]">是</td></tr>
                  <tr className="hover:bg-[#e8f0fb]"><td className="border border-[#d8d5c8] px-2 py-[2px]"><Bmp name="cp-user" size={16} className="inline mr-1 -align-middle" />Guest</td><td className="border border-[#d8d5c8] px-2 py-[2px]">供来宾访问计算机或访问域的内置帐户</td><td className="border border-[#d8d5c8] px-2 py-[2px] text-[#b03030]">否</td></tr>
                  <tr className="hover:bg-[#e8f0fb]"><td className="border border-[#d8d5c8] px-2 py-[2px]"><Bmp name="cp-user" size={16} className="inline mr-1 -align-middle" />HelpAssistant</td><td className="border border-[#d8d5c8] px-2 py-[2px]">远程协助帐户</td><td className="border border-[#d8d5c8] px-2 py-[2px] text-[#b03030]">否</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {sel === 'diskmgr' ? (
            <div className="p-3">
              <div className="font-bold text-[12px] mb-2">磁盘管理</div>
              {/* 上：卷列表 */}
              <table className="border-collapse w-full max-w-[520px] mb-3">
                <thead><tr>
                  {['卷', '布局', '类型', '文件系统', '状态', '容量', '可用空间'].map((h) => <th key={h} className="bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal">{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr className="hover:bg-[#e8f0fb]">
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">(C:)</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">基本</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">逻辑驱动器</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">NTFS</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px] text-[#1a7a1a]">状态良好(系统)</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">37.26 GB</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">21.94 GB</td>
                  </tr>
                </tbody>
              </table>
              {/* 下：磁盘图示 */}
              <GroupBox title="磁盘图示">
                <div className="flex items-center gap-[8px] p-2">
                  <Bmp name="harddrive" size={32} />
                  <div className="flex-1 h-[38px] border border-[#7a90b8] rounded-[3px] overflow-hidden flex">
                    <div className="w-[38%] bg-gradient-to-b from-[#5a86d8] to-[#2a56a8] text-white text-[10px] flex items-center justify-center border-r border-[#1a3a78]">38.7 GB 已用</div>
                    <div className="flex-1 bg-gradient-to-b from-[#eef4ff] to-[#c8d8f0] text-[#3a3a3a] text-[10px] flex items-center justify-center">21.94 GB 可用</div>
                  </div>
                </div>
              </GroupBox>
            </div>
          ) : null}
        </div>
      </div>
      <div className="h-[20px] shrink-0 flex items-center px-2 bg-[#ece9d8] border-t border-[#d8d5c8] text-[#5a5a4a]">
        计算机(MY-COMPUTER) · {selItem ? selItem.label : ''}
      </div>
    </div>
  )
}

/* ═══════════════ 管理工具文件夹（控制面板入口视图） ═══════════════ */

const ADMIN_ITEMS: Array<{ label: string; icon: string; app: string; desc: string }> = [
  { label: '本地安全策略', icon: 'adm-secu', app: 'secpol', desc: '配置帐户策略与本地策略' },
  { label: '服务', icon: 'adm-services', app: 'services', desc: '查看和管理系统服务' },
  { label: '计算机管理', icon: 'adm-compmgmt', app: 'compmgmt', desc: '系统工具 · 存储 · 服务' },
  { label: '数据源 (ODBC)', icon: 'adm-odbc', app: 'odbc', desc: '管理 ODBC 驱动程序与数据源' },
  { label: '事件查看器', icon: 'adm-eventvwr', app: 'eventvwr', desc: '查看应用程序/安全/系统日志' },
  { label: '性能', icon: 'adm-perfmon', app: 'perfmon', desc: '性能日志和警报' },
  { label: '数据源设置', icon: 'adm-odbc', app: 'apicfg', desc: '配置 API 数据后台地址（开发者）' },
]

export function AdmToolsFolder({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [sel, setSel] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar menus={[
        { label: '文件(F)', items: [{ label: '关闭(C)', onClick: () => closeWindow(win.id) }] },
        { label: '编辑(E)', items: [{ label: '全选(S)', onClick: () => showToast('已选中全部 7 个管理工具') }] },
        { label: '查看(V)', items: [{ label: '平铺(T)', checked: true, onClick: () => showToast('平铺视图（当前）') }, { label: '详细信息(D)', onClick: () => showToast('详细信息视图在复刻版中省略') }] },
        { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('管理工具 —— Windows XP 复刻版') }] },
      ]} />
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
        <button type="button" className="px-2 py-[2px] rounded-[3px] hover:bg-[#e8f0fb] border border-transparent" onClick={() => showToast('后退：控制面板（请用左侧链接）')}>← 后退</button>
        <span className="font-bold">管理工具</span>
      </div>
      <div className="flex-1 flex min-h-0">
        {/* 左栏任务 */}
        <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
            <div className="font-bold text-[#1a3f8f] mb-1">请参阅</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('controlpanel', {}, '控制面板')}>控制面板</button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('helpcenter', {})}>帮助和支持中心</button>
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="font-bold text-[#1a3f8f] mb-1">管理工具</div>
            <div className="text-[11px] text-[#3a3a3a] leading-[15px]">这些工具为系统管理员和高级用户提供。双击图标启动对应管理单元。</div>
          </div>
        </div>
        {/* 图标网格 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 bg-white">
          <div className="flex flex-wrap gap-2 content-start max-w-[460px]">
            {ADMIN_ITEMS.map((it) => (
              <button
                key={it.label}
                type="button"
                title={it.desc}
                className={`w-[104px] flex flex-col items-center gap-1 p-2 rounded-[4px] ${sel === it.label ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'hover:bg-[#e8f0fb] border border-transparent'}`}
                onClick={() => { setSel(it.label); playClick() }}
                onDoubleClick={() => openApp(it.app, {}, it.label)}
              >
                <Bmp name={it.icon} size={32} />
                <span className="text-[11px] text-center leading-[13px]">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        7 个对象（双击打开）
      </div>
    </div>
  )
}

/* ═══════════════ 本地安全策略 ═══════════════ */

const SEC_POLICIES: Array<{ path: string[]; entries: Array<{ name: string; policy: string; setting: string }> }> = [
  {
    path: ['帐户策略', '密码策略'], entries: [
      { name: '密码必须符合复杂性要求', policy: '已启用', setting: '至少六个字符，包含大写/小写/数字' },
      { name: '密码长度最小值', policy: '0 个字符', setting: '（当前允许空密码——像 2001 年的家庭电脑）' },
      { name: '密码最长存留期', policy: '42 天', setting: '默认' },
      { name: '强制密码历史', policy: '记住 0 个密码', setting: '默认' },
    ],
  },
  {
    path: ['帐户策略', '帐户锁定策略'], entries: [
      { name: '复位帐户锁定计数器', policy: '60 分钟之后', setting: '默认' },
      { name: '帐户锁定时间', policy: '30 分钟', setting: '默认' },
      { name: '帐户锁定阈值', policy: '5 次无效登录', setting: 'Administrator 帐户不会锁定' },
    ],
  },
  {
    path: ['本地策略', '审核策略'], entries: [
      { name: '审核登录事件', policy: '成功', setting: '事件查看器·安全性可见' },
      { name: '审核对象访问', policy: '成功', setting: '默认' },
      { name: '审核策略更改', policy: '无审核', setting: '默认' },
    ],
  },
  {
    path: ['本地策略', '安全选项'], entries: [
      { name: '交互式登录: 不显示上次的用户名', policy: '已禁用', setting: '欢迎屏显示 Administrator' },
      { name: '关机: 允许系统在未登录的情况下关闭', policy: '已启用', setting: '欢迎屏右下角电源钮' },
      { name: '帐户: 来宾帐户状态', policy: '已停用', setting: 'Guest 不可用' },
    ],
  },
]

export function SecuPolicy({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [sel, setSel] = useState(0)
  const group = SEC_POLICIES[sel]
  const groups = Array.from(new Set(SEC_POLICIES.map((p) => p.path[0])))

  return (
    <div className="flex flex-col h-full select-none text-[11px]">
      <MenuBar menus={[
        { label: '文件(F)', items: [{ label: '退出(X)', onClick: () => closeWindow(win.id) }] },
        { label: '操作(A)', items: [{ label: '属性(R)', onClick: () => showToast('安全策略为只读展示（复刻版）') }] },
        { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('本地安全设置 —— Windows XP 复刻版') }] },
      ]} />
      <div className="flex-1 flex min-h-0">
        {/* 左树 */}
        <div className="w-[190px] shrink-0 border-r border-[#d8d5c8] bg-white overflow-y-auto xp-thin-scroll p-1">
          <div className="flex items-center gap-1 px-1 py-[3px] font-bold text-[#3a3a3a]"><span className="text-[9px]">⊟</span> 本地安全设置</div>
          {groups.map((g) => (
            <div key={g}>
              <div className="flex items-center gap-1 px-1 py-[3px] font-bold text-[#3a3a3a]"><span className="text-[9px]">⊟</span> {g}</div>
              {SEC_POLICIES.map((p, i) => p.path[0] !== g ? null : (
                <button
                  key={p.path[1]}
                  type="button"
                  className={`w-full flex items-center gap-[6px] pl-[18px] pr-1 py-[3px] text-left rounded-[2px] ${sel === i ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                  onClick={() => setSel(i)}
                >
                  <Bmp name="key" size={16} />
                  {p.path[1]}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* 右侧策略表 */}
        <div className="flex-1 min-w-0 bg-white overflow-auto xp-thin-scroll">
          <table className="w-full border-collapse">
            <thead><tr>
              {['策略', '本地设置', '有效设置'].map((h) => <th key={h} className="bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal sticky top-0">{h}</th>)}
            </tr></thead>
            <tbody>
              {group.entries.map((e) => (
                <tr key={e.name} className="hover:bg-[#e8f0fb] cursor-default">
                  <td className="border border-[#d8d5c8] px-2 py-[2px]"><Bmp name="key" size={16} className="inline mr-1 -align-middle" />{e.name}</td>
                  <td className="border border-[#d8d5c8] px-2 py-[2px]">{e.policy}</td>
                  <td className="border border-[#d8d5c8] px-2 py-[2px] text-[#5a5a5a]">{e.setting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="h-[20px] shrink-0 flex items-center px-2 bg-[#ece9d8] border-t border-[#d8d5c8] text-[#5a5a4a]">
        {group.path.join(' → ')} · {group.entries.length} 个策略
      </div>
    </div>
  )
}

/* ═══════════════ 数据源 (ODBC) ═══════════════ */

export function OdbcSources({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<'user' | 'sys' | 'drv'>('user')

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['user', '用户 DSN'], ['sys', '系统 DSN'], ['drv', '驱动程序']] as const).map(([k, t]) => (
          <button key={k} type="button" className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'user' || tab === 'sys' ? (
          <div>
            <div className="mb-2">{tab === 'user' ? '用户数据源（只对此计算机上的当前用户可见）:' : '系统数据源（可被此计算机上的所有用户使用）:'}</div>
            <table className="border-collapse w-full">
              <thead><tr>
                {['名称', '驱动程序'].map((h) => <th key={h} className="bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal">{h}</th>)}
              </tr></thead>
              <tbody>
                {(tab === 'user' ? [
                  ['dBASE Files', 'Microsoft dBase Driver (*.dbf)'],
                  ['Excel Files', 'Microsoft Excel Driver (*.xls)'],
                  ['MS Access 97 Database', 'Microsoft Access Driver (*.mdb)'],
                ] : [
                  ['LocalServer', 'SQL Server'],
                  ['dBASE Files - Word', 'Microsoft dBase Driver (*.dbf)'],
                ]).map(([n, d]) => (
                  <tr key={n} className="hover:bg-[#e8f0fb] cursor-default">
                    <td className="border border-[#d8d5c8] px-2 py-[2px]"><Bmp name="adm-odbc" size={16} className="inline mr-1 -align-middle" />{n}</td>
                    <td className="border border-[#d8d5c8] px-2 py-[2px]">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[10px] text-[#5a5a4a] mt-2">双击数据源以配置。复刻版为只读展示。</div>
          </div>
        ) : (
          <table className="border-collapse w-full">
            <thead><tr>
              {['名称', '版本', '公司', '文件', '日期'].map((h) => <th key={h} className="bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border border-[#d8d5c8] px-2 py-[3px] text-left font-normal">{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                ['SQL Server', '3.70.11.30', 'Microsoft Corporation', 'SQLSRV32.DLL', '2001-8-17'],
                ['Microsoft Access Driver (*.mdb)', '4.00.6200.00', 'Microsoft Corporation', 'ODBCJT32.DLL', '2001-8-23'],
                ['Microsoft dBase Driver (*.dbf)', '4.00.6200.00', 'Microsoft Corporation', 'ODBCJT32.DLL', '2001-8-23'],
                ['Microsoft Excel Driver (*.xls)', '4.00.6200.00', 'Microsoft Corporation', 'ODBCJT32.DLL', '2001-8-23'],
                ['Microsoft Text Driver (*.txt; *.csv)', '4.00.6200.00', 'Microsoft Corporation', 'ODBCJT32.DLL', '2001-8-23'],
              ].map((r) => (
                <tr key={r[0]} className="hover:bg-[#e8f0fb] cursor-default">
                  {r.map((c, i) => <td key={i} className="border border-[#d8d5c8] px-2 py-[2px]">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end gap-2 p-2">
        <XPButton onClick={() => showToast('添加/删除数据源：复刻版为只读展示')}>添加(D)...</XPButton>
        <XPButton onClick={() => showToast('配置数据源：复刻版为只读展示')}>配置(C)...</XPButton>
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
      </div>
    </div>
  )
}
