'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP } from '../store'
import { playClick, playPrintDone } from '../sounds'
import { TaskPanel } from '../ui'

interface Topic {
  title: string
  body: Array<string | [string, string]>
}

const TOPICS: Record<string, Topic> = {
  whatsnew: {
    title: 'Windows XP 的新增功能',
    body: [
      'h4:焕然一新的外观',
      'p:Windows XP 采用全新的 Luna 界面设计，圆角窗口、渐变蓝色标题栏与重新绘制的图标让整个系统焕然一新。任务栏合并了快速启动区域，开始菜单分为左右两栏，常用程序一目了然。若怀念传统外观，也可切换回 Windows 经典样式。',
      'h4:更快的用户切换',
      'p:快速用户切换允许多个用户保持登录状态并同时切换，无需关闭正在运行的程序。在 512MB 内存的机器上，这是 2001 年令人惊叹的体验。',
      'h4:集成的多媒体',
      'p:Windows Media Player 8、Windows Movie Maker 与 CD 刻录支持首次内置系统。扫描仪和照相机向导让导入照片变得简单。',
      'h4:更可靠的网络',
      'p:Internet 连接防火墙（ICF）与网络安装向导让家庭组网变得简单。远程协助功能允许朋友帮你修电脑——当然，前提是他没在用 56K 拨号。',
    ],
  },
  basics: {
    title: '基础知识',
    body: [
      'h4:使用桌面',
      'p:桌面是您工作的主屏幕区域。双击图标可以打开文件或文件夹；右键单击桌面可以新建文件夹或调整显示属性；将窗口拖动到屏幕边缘可以整齐排列。',
      'h4:使用「开始」菜单',
      'p:单击任务栏左侧的「开始」按钮，左栏显示常用程序与所有程序列表，右栏提供我的文档、我的电脑、控制面板等入口。将鼠标悬停在「所有程序」上可展开完整的程序树。',
      'h4:窗口操作',
      'p:标题栏右侧的三个按钮分别为最小化、最大化/还原与关闭。拖动标题栏可移动窗口，拖动边缘可调整大小。按 Alt+Tab 可在打开的窗口之间快速切换（本复刻版同样支持）。',
      'h4:任务栏与通知区域',
      'p:任务栏记录每个打开的窗口，单击即可切换。右侧的通知区域（系统托盘）显示时钟与音量等后台程序图标，单击音量图标可直接调节音量（试试看！）。',
      'h4:任务栏工具栏',
      'p:右键单击任务栏空白处，指向「工具栏」，可以启用快速启动、桌面、链接等工具栏。快速启动区由真实文件夹驱动：把快捷方式拖进去即可自定义（和真正的 XP 一样）。',
    ],
  },
  networking: {
    title: '网络和 Web 工作',
    body: [
      'h4:连接到 Internet',
      'p:通过「开始 → 所有程序 → 附件 → 新建连接向导」创建拨号或宽带连接。56K 调制解调器需要先确认电话线未被占用，否则连接时会听到刺耳的忙音。',
      'h4:浏览网页',
      'p:Internet Explorer 6 内置 MSN 中国门户与搜索。弹窗拦截已默认开启（终于！）。',
      'h4:收发电子邮件',
      'p:Outlook Express 6 管理您的邮件账户，支持多用户标识与 HTML 邮件编写。注意定期更新病毒库——附件千万别乱点。',
    ],
  },
  games: {
    title: '游戏与多媒体',
    body: [
      'h4:自带游戏',
      'p:扫雷：经典 9×9 / 16×16 / 30×16 三种难度，第一次点击永远是安全的（本复刻版忠实还原）。',
      'p:纸牌：Klondike 规则，翻一张模式，双击自动收牌。',
      'p:空当接龙：所有发局均可解（微软认证 32000 局），利用空当格与空列可以整段移动牌。',
      'p:红心大战：四人对战，目标是少得分。黑桃皇后 13 分，全收 26 分反而让别人加分。',
      'p:三维弹球「太空军校生」：左右挡板与发射器，完成军官任务。复刻版用空格蓄力发射。',
      'h4:音乐与电影',
      'p:Windows Media Player 8 支持皮肤模式与可视化效果；录音机可以录制麦克风音频；CD 播放器在放入唱片后自动启动。',
    ],
  },
  customization: {
    title: '自定义计算机',
    body: [
      'h4:更改桌面背景',
      'p:在桌面空白处右键单击并选择「属性」，切换到「桌面」选项卡，即可选择 Bliss（默认的绿色山坡）或其他壁纸。双击列表项可立即应用。',
      'h4:屏幕保护程序',
      'p:在显示属性中切换到「屏幕保护程序」选项卡，选择星空或变幻线，并设置等待时间。键盘鼠标无操作一段时间后，屏幕保护会自动启动（按任意键退出——本复刻版同样实现）。',
      'h4:更改主题颜色',
      'p:「外观」选项卡提供蓝（默认）、橄榄绿与银色三种 Windows XP 颜色方案；切换到「Windows 经典样式」还可以从 22 种色彩方案中选择，实时切换整个系统的色彩氛围。',
    ],
  },
  troubleshoot: {
    title: '故障排除',
    body: [
      'h4:计算机运行缓慢',
      'p:打开任务管理器（Ctrl+Shift+Esc）查看 CPU 占用率。结束无响应的任务，或使用「性能和维护 → 整理磁盘碎片」优化磁盘。重启永远是最有效的一招。',
      'h4:没有声音',
      "p:单击通知区域的音量图标，确认未勾选「静音」。双击图标打开音量控制，检查主音量与波形滑块。声卡驱动请确认已安装 Realtek AC'97。",
      'h4:蓝屏了怎么办',
      'p:记下 STOP 错误代码，重启并在安全模式（开机按 F8）中卸载最近安装的驱动。2001 年的标准答案是：格式化 C 盘，重装 Windows（笑）。',
    ],
  },
}

const LINKS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'whatsnew', label: 'Windows XP 的新增功能', desc: '了解 Luna 界面、快速用户切换等新特性' },
  { key: 'basics', label: '基础知识', desc: '桌面、开始菜单、窗口与任务栏的使用' },
  { key: 'networking', label: '网络和 Web 工作', desc: '拨号上网、浏览网页与电子邮件' },
  { key: 'games', label: '游戏与多媒体', desc: '扫雷、纸牌、空当接龙、红心大战与弹珠台' },
  { key: 'customization', label: '自定义计算机', desc: '壁纸、屏幕保护与主题颜色' },
  { key: 'troubleshoot', label: '故障排除', desc: '声音、性能与蓝屏的解决方案' },
]

/* 「您知道吗?」轮播提示（XP helpctr 特色栏目） */
const DID_YOU_KNOW = [
  '按 Win+D 可以快速显示桌面；再按一次即可全部还原。',
  '按住 Ctrl 键拖动文件即可复制，按住 Alt 键拖动则创建快捷方式。',
  '右键单击任务栏空白处选择「工具栏」，可以把「桌面」搬进任务栏。',
  '双击托盘时钟可以打开「日期和时间 属性」，时区、Internet 时间同步都在那里。',
  '在「运行」对话框输入 winver 可以查看 Windows 版本信息。',
  '记事本按 F5 可插入当前时间——按一下试试！',
]

/* ─────────── 工具栏按钮（XP helpctr 风格：图标+文字） ─────────── */
function HcToolbarBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-[4px] px-[7px] py-[3px] rounded-[3px] border border-white/25 text-white/95 text-[11px] ${disabled ? 'opacity-40 cursor-default' : 'hover:bg-white/20 active:bg-black/20'}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

export default function HelpCenter({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const showToast = useXP((s) => s.showToast)
  /* 历史栈（后退/前进——XP helpctr 真实行为） */
  const [topic, setTopic] = useState<string>('home')
  const [hist, setHist] = useState<string[]>([])
  const [fwd, setFwd] = useState<string[]>([])
  /* 搜索词与结果 */
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState<Array<{ key: string; snippet: string }> | null>(null)
  /* 右栏面板折叠 */
  const [panesOpen, setPanesOpen] = useState<Record<string, boolean>>({})
  const paneIsOpen = (k: string) => panesOpen[k] ?? true
  const paneToggle = (k: string) => { setPanesOpen((p) => ({ ...p, [k]: !(p[k] ?? true) })); playClick() }
  /* 「您知道吗?」轮播 */
  const [dyk, setDyk] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setDyk((i) => (i + 1) % DID_YOU_KNOW.length), 12000)
    return () => clearInterval(iv)
  }, [])

  const t = TOPICS[topic]

  /* 历史条目：'home' / 主题键 / 'search:关键词'（搜索视图也进入历史栈，XP 真实导航行为） */
  const goto = (k: string) => {
    setHist((h) => [...h, results ? `search:${searchQ}` : topic])
    setFwd([])
    setTopic(k)
    setResults(null)
    playClick()
  }
  const back = () => {
    if (hist.length === 0) return
    const prev = hist[hist.length - 1]
    setFwd((f) => [results ? `search:${searchQ}` : topic, ...f])
    setHist((h) => h.slice(0, -1))
    if (prev.startsWith('search:')) {
      const q = prev.slice(7)
      setSearchQ(q)
      setResults(computeHits(q))
    } else {
      setTopic(prev)
      setResults(null)
    }
    playClick()
  }
  const forward = () => {
    if (fwd.length === 0) return
    const next = fwd[0]
    setHist((h) => [...h, results ? `search:${searchQ}` : topic])
    setFwd((f) => f.slice(1))
    if (next.startsWith('search:')) {
      const q = next.slice(7)
      setSearchQ(q)
      setResults(computeHits(q))
    } else {
      setTopic(next)
      setResults(null)
    }
    playClick()
  }

  /* 站内搜索：标题+正文包含匹配 → 结果列表 + 摘要片段 */
  const computeHits = (q: string): Array<{ key: string; snippet: string }> => {
    const hits: Array<{ key: string; snippet: string }> = []
    for (const l of LINKS) {
      const tp = TOPICS[l.key]
      const titleHit = tp.title.includes(q) || l.label.includes(q)
      for (const b of tp.body) {
        const text = typeof b === 'string' ? b.replace(/^(h4|p):/, '') : `${b[0]} ${b[1]}`
        if (titleHit || text.includes(q)) {
          const idx = text.indexOf(q)
          const snip = idx >= 0 ? text.slice(Math.max(0, idx - 16), idx + q.length + 30) : text.slice(0, 46)
          hits.push({ key: l.key, snippet: snip })
          break
        }
      }
    }
    return hits
  }
  const doSearch = (v0?: string) => {
    const q = (v0 ?? searchQ).trim()
    if (!q) return
    setHist((h) => [...h, results ? `search:${v0 ?? searchQ}` : topic])
    setFwd([])
    setResults(computeHits(q))
    playClick()
  }

  /* 主题正文渲染（h4:/p: 前缀标记） */
  const renderBody = (body: Topic['body']) =>
    body.map((b, i) => {
      if (typeof b === 'string') {
        if (b.startsWith('h4:')) return <div key={i} className="text-[#1a3f8f] font-bold text-[12px] mt-3 mb-1">{b.slice(3)}</div>
        return <p key={i} className="mb-2">{b.slice(2)}</p>
      }
      const [k, v] = b
      return (
        <div key={i} className="flex gap-2">
          <span className="font-bold">{k}</span>
          <span>{v}</span>
        </div>
      )
    })

  const sidebarPanes = (
      <>
        <TaskPanel title="请求帮助" open={paneIsOpen('ask')} onToggle={() => paneToggle('ask')}>
          <button type="button" className="xp-taskpane-link" onClick={() => openApp('dialog', { kind: 'info', title: '远程协助', text: '远程协助允许您邀请信任的人通过 Internet 连接到您的计算机，并帮助您解决问题。\n\n（在 2001 年，这是一项革命性的功能——前提是您的朋友不害怕看见您的桌面。）' })}>
            邀请某人帮助您(远程协助)
          </button>
          <button type="button" className="xp-taskpane-link" onClick={() => openApp('msmsgs', {}, 'Windows Messenger')}>
            通过 Windows Messenger 请求帮助
          </button>
        </TaskPanel>
        <TaskPanel title="选择一个任务" open={paneIsOpen('task')} onToggle={() => paneToggle('task')}>
          <button type="button" className="xp-taskpane-link" onClick={() => openApp('sysinfo', {}, '系统信息')}>
            使用工具查看计算机信息并分析问题
          </button>
          <button type="button" className="xp-taskpane-link" onClick={() => openApp('ie', {}, 'Internet Explorer')}>
            使用 Windows Update 保持计算机最新
          </button>
          <button type="button" className="xp-taskpane-link" onClick={() => openApp('cleanmgr', {}, '磁盘清理')}>
            使用「磁盘清理」释放磁盘空间
          </button>
        </TaskPanel>
        <TaskPanel title="您知道吗?" open={paneIsOpen('dyk')} onToggle={() => paneToggle('dyk')}>
          <div className="px-2 pb-[6px] text-[11px] leading-[16px] xp-taskpane-meta">
            {DID_YOU_KNOW[dyk]}
            <button type="button" className="block text-[11px] text-[#1145c4] hover:underline mt-[3px] text-left" onClick={() => setDyk((i) => (i + 1) % DID_YOU_KNOW.length)}>
              下一个提示 »
            </button>
          </div>
        </TaskPanel>
      </>
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      {/* 工具栏（XP helpctr：后退/前进/主页/打印/支持/选项 + 搜索框） */}
      <div className="flex items-center gap-[4px] px-2 h-[32px] bg-gradient-to-b from-[#3a8ae8] to-[#1a5ac8] border-b border-[#0a3c94] shrink-0">
        <HcToolbarBtn label="后退" onClick={back} disabled={hist.length === 0}>
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M8 1.5 L3 5.5 L8 9.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </HcToolbarBtn>
        <HcToolbarBtn label="前进" onClick={forward} disabled={fwd.length === 0}>
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M3 1.5 L8 5.5 L3 9.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </HcToolbarBtn>
        <HcToolbarBtn label="主页" onClick={() => goto('home')}>
          <svg width="11" height="11" viewBox="0 0 11 11"><path d="M5.5 1.5 L10 5.2 H8.5 V9.5 H6.4 V7 H4.6 V9.5 H2.5 V5.2 H1 Z" fill="#fff" /></svg>
        </HcToolbarBtn>
        <div className="w-[1px] h-[18px] bg-white/30 mx-[2px]" />
        <HcToolbarBtn label="打印" onClick={() => { showToast(`已将「${topic === 'home' ? '帮助和支持中心' : TOPICS[topic]?.title}」发送到打印机`); playPrintDone() }}>
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="2" y="4" width="7" height="4" fill="#fff" /><rect x="3" y="1.5" width="5" height="3" fill="none" stroke="#fff" strokeWidth="1" /><rect x="3" y="7" width="5" height="2.5" fill="#fff" /></svg>
        </HcToolbarBtn>
        <HcToolbarBtn label="支持" onClick={() => openApp('dialog', { kind: 'info', title: '支持', text: '若要获得产品支持，请联系您的系统管理员，或访问 support.microsoft.com。\n\n本复刻版的作者建议：先重启试试。' })}>
          <svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="4.3" fill="none" stroke="#fff" strokeWidth="1.2" /><path d="M5.5 3 v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /><circle cx="5.5" cy="8.2" r="0.8" fill="#fff" /></svg>
        </HcToolbarBtn>
        <HcToolbarBtn label="选项" onClick={() => openApp('dialog', { kind: 'info', title: '帮助和支持选项', text: '帮助主题基于 Windows XP SP2 复刻。\n\n搜索框可检索全部帮助主题正文。' })}>
          <svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="2.4" r="1.2" fill="#fff" /><path d="M5.5 4 v5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </HcToolbarBtn>
        <div className="flex-1" />
        {/* 搜索框（XP helpctr 右上角） */}
        <div className="flex items-center gap-[3px]" data-hc-search>
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => imeEnter(e, doSearch)}
            placeholder="搜索帮助主题"
            className="w-[150px] h-[20px] px-[5px] text-[11px] bg-white border border-[#7f9db9] rounded-[2px] outline-none placeholder:text-[#9a9a9a]"
          />
          <button
            type="button"
            className="w-[22px] h-[20px] flex items-center justify-center rounded-[3px] border border-white/30 hover:bg-white/25 active:bg-black/20"
            onClick={() => doSearch()}
            aria-label="搜索"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="4.2" cy="4.2" r="2.8" fill="none" stroke="#fff" strokeWidth="1.3" /><path d="M6.3 6.3 L9 9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-y-auto xp-thin-scroll bg-white">
          {results ? (
            /* 搜索结果页 */
            <div className="p-4 max-w-[640px]">
              <div className="text-[13px] font-bold text-[#1a3f8f] mb-1">搜索结果</div>
              <div className="text-[11px] text-[#5a5a5a] mb-3">关于「{searchQ}」找到 {results.length} 个结果</div>
              {results.length === 0 ? (
                <div className="text-[11px] leading-[17px]">
                  没有找到与「{searchQ}」匹配的帮助主题。
                  <div className="mt-2 text-[#5a5a5a]">建议：检查拼写，或尝试更简短的关键词。</div>
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.key} className="mb-3">
                    <button type="button" className="text-[12px] text-[#1145c4] hover:underline text-left" onClick={() => goto(r.key)}>
                      {TOPICS[r.key].title}
                    </button>
                    <div className="text-[11px] text-[#3a3a3a] leading-[16px] mt-[2px]">…{r.snippet}…</div>
                  </div>
                ))
              )}
              <div className="mt-4 pt-3 border-t border-[#d8d5c8]">
                <button type="button" className="text-[#1145c4] hover:underline" onClick={() => goto('home')}>
                  ← 返回帮助和支持中心主页
                </button>
              </div>
            </div>
          ) : topic === 'home' ? (
            /* 主页：选择一个帮助主题（双列） */
            <div className="flex-1">
              <div className="bg-gradient-to-b from-[#5c9ef0] to-[#2a6ad0] px-4 py-3 flex items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="17" fill="#ffd020" stroke="#b89010" strokeWidth="2" />
                  <path d="M20 10 q8 5 8 12 q-8 5 -16 0 q0 -7 8 -12 Z" fill="#e8a020" />
                  <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">?</text>
                </svg>
                <div>
                  <div className="text-white font-bold text-[14px]">帮助和支持中心</div>
                  <div className="text-white/85 text-[11px]">Windows XP Professional（Web 复刻版）</div>
                </div>
              </div>
              <div className="bg-[#e8f0fb] border-b border-[#98b8e0] px-4 py-2 text-[#1a3f8f] font-bold">
                选择一个帮助主题(S)
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 max-w-[660px]" data-hc-topics>
                {LINKS.map((l) => (
                  <button key={l.key} type="button" className="flex items-start gap-2 text-left p-2 rounded-[4px] hover:bg-[#e8f0fb]" onClick={() => goto(l.key)}>
                    <span className="text-[#2a9f2a] text-[16px] leading-[14px]">▸</span>
                    <div>
                      <div className="text-[#1145c4] text-[12px] hover:underline">{l.label}</div>
                      <div className="text-[#5a5a5a] text-[11px] leading-[15px] mt-[2px]">{l.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 主题内容页 */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-gradient-to-b from-[#5c9ef0] to-[#2a6ad0] px-4 py-[8px] flex items-center justify-between shrink-0">
                <div className="text-white font-bold text-[12px]">{t.title}</div>
                <button type="button" className="text-white/85 hover:text-white text-[11px]" onClick={() => goto('home')}>
                  主页 ↑
                </button>
              </div>
              <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 leading-[17px] max-w-[620px]">
                {renderBody(t.body)}
                <div className="mt-4 pt-3 border-t border-[#d8d5c8] text-[#5a5a4a]">
                  <button type="button" className="text-[#1145c4] hover:underline" onClick={() => goto('home')}>
                    ← 返回帮助和支持中心主页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧选项栏（XP helpctr：请求帮助/选择一个任务/您知道吗?） */}
        <div className="w-[180px] shrink-0 xp-sidebar p-[6px] space-y-[6px] overflow-y-auto xp-thin-scroll">
          {sidebarPanes}
        </div>
      </div>

      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a] shrink-0">
        帮助和支持中心 · 复刻自 Windows XP SP2
      </div>
    </div>
  )
}
