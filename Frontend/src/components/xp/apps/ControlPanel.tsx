'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP, type AccountItem } from '../store'
import { MenuBar, XPButton, GroupBox } from '../ui'
import { playClick } from '../sounds'
import { UserAvatar } from '../icons'
import { Bmp } from '../bmp'
import { apiCreateAccount, apiPatchAccount, apiDeleteAccount } from '@/lib/api/endpoints'
import { ACCOUNT_AVATARS } from '../model'

/* ─────────── 控制面板图标（内联） ─────────── */

function CPIcon({ kind, size = 32 }: { kind: string; size?: number }) {
  /* PIL 位图图标(public/icons/{48,32,16}/cp-*.png) — 与全系统图标同工艺 */
  return <Bmp name={`cp-${kind}`} size={size} />
}

/* ─────────── 控制面板主组件 ─────────── */

interface Cat {
  key: string
  title: string
  desc: string
  icon: string
  tasks: Array<{ label: string; action: () => void }>
}

export function ControlPanel({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [view, setView] = useState<'category' | 'classic'>('category')
  const [cat, setCat] = useState<string | null>(null)

  const cats: Cat[] = [
    {
      key: 'appearance',
      title: '外观和主题',
      desc: '更改桌面背景、主题以及屏幕保护程序',
      icon: 'appearance',
      tasks: [
        { label: '更改桌面背景', action: () => openApp('display', { tab: '桌面' }, '显示 属性') },
        { label: '更改屏幕保护程序', action: () => openApp('display', { tab: '屏幕保护程序' }, '显示 属性') },
        { label: '更改 Windows 外观和主题', action: () => openApp('display', { tab: '外观' }, '显示 属性') },
        { label: '更改屏幕分辨率', action: () => openApp('display', { tab: '设置' }, '显示 属性') },
        { label: '任务栏和「开始」菜单', action: () => openApp('taskbarprops', {}, '任务栏和「开始」菜单属性') },
      ],
    },
    {
      key: 'network',
      title: '网络和 Internet 连接',
      desc: '设置或更改 Internet 和网络连接',
      icon: 'network',
      tasks: [
        { label: '设置或更改 Internet 连接', action: () => openApp('ie', { page: 'conn' }) },
        { label: '创建家庭或小型办公网络', action: () => showToast('网络向导：检测到 56K 调制解调器与一根电话线，建议先别占线 :)') },
        { label: '查看网络连接', action: () => openApp('netconn', {}, '网络连接') },
      ],
    },
    {
      key: 'programs',
      title: '添加或删除程序',
      desc: '安装或删除程序以及 Windows 组件',
      icon: 'programs',
      tasks: [
        { label: '更改或删除程序', action: () => openApp('addremove', {}, '添加或删除程序') },
        { label: '添加新程序', action: () => openApp('addremove', {}, '添加或删除程序') },
        { label: '添加/删除 Windows 组件', action: () => openApp('addremove', { tab: 'comps' }, '添加或删除程序') },
      ],
    },
    {
      key: 'sound',
      title: '声音、语音和音频设备',
      desc: '调整音量、更改声音方案和音频设置',
      icon: 'sound',
      tasks: [
        { label: '调整系统音量', action: () => openApp('soundprops', {}, '声音和音频设备 属性') },
        { label: '更改声音方案', action: () => openApp('soundprops', { tab: '声音' }, '声音和音频设备 属性') },
        { label: '更改扬声器设置', action: () => openApp('soundprops', {}, '声音和音频设备 属性') },
      ],
    },
    {
      key: 'perf',
      title: '性能和维护',
      desc: '查看系统信息、管理磁盘和维护系统',
      icon: 'perf',
      tasks: [
        { label: '查看系统信息', action: () => openApp('sysinfo', {}, '系统信息') },
        { label: '管理磁盘空间（磁盘清理）', action: () => openApp('diskclean', {}, '磁盘清理') },
        { label: '整理磁盘碎片', action: () => openApp('defrag', {}, '磁盘碎片整理程序') },
        { label: '任务管理器', action: () => openApp('taskmgr', {}) },
        { label: '管理工具', action: () => openApp('admintools', {}, '管理工具') },
      ],
    },
    {
      key: 'user',
      title: '用户帐户',
      desc: '更改帐户设置和密码',
      icon: 'user',
      tasks: [
        { label: '更改帐户', action: () => openApp('useraccounts', {}, '用户帐户') },
        { label: '创建新帐户', action: () => openApp('useraccounts', {}, '用户帐户') },
      ],
    },
    {
      key: 'clock',
      title: '日期、时间、语言和区域选项',
      desc: '更改日期、时间和时区',
      icon: 'clock',
      tasks: [
        { label: '更改日期和时间', action: () => openApp('datetime', {}, '日期和时间 属性') },
        { label: '更改数字、日期和时间的格式', action: () => openApp('intlprops', {}, '区域和语言选项') },
        { label: '添加其他语言', action: () => openApp('intlprops', { tab: '语言' }, '区域和语言选项') },
      ],
    },
    {
      key: 'printer',
      title: '打印机和其它硬件',
      desc: '添加打印机、鼠标、游戏控制器',
      icon: 'printer',
      tasks: [
        { label: '添加打印机', action: () => openApp('printfax', {}, '打印机和传真') },
        { label: '鼠标属性', action: () => openApp('mouseprops', {}, '鼠标 属性') },
        { label: '键盘属性', action: () => openApp('keyboardprops', {}, '键盘 属性') },
        { label: '游戏控制器', action: () => showToast('检测到：没有游戏手柄。建议用键盘玩弹珠台。') },
      ],
    },
    {
      key: 'access',
      title: '辅助功能选项',
      desc: '调整视觉、听觉和移动性设置',
      icon: 'access',
      tasks: [
        { label: '配置辅助功能', action: () => openApp('accessprops', {}, '辅助功能选项') },
        { label: '调整视觉显示效果', action: () => openApp('accessprops', { tab: '显示' }, '辅助功能选项') },
        { label: '调整听觉提示', action: () => openApp('accessprops', { tab: '声音' }, '辅助功能选项') },
      ],
    },
  ]

  const catSel = cats.find((c) => c.key === cat)

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar
        menus={[
          { label: '文件(F)', items: [{ label: '关闭(C)', onClick: () => closeWindow(win.id) }] },
          { label: '查看(V)', items: [{ label: '类别视图(C)', checked: view === 'category', onClick: () => setView('category') }, { label: '经典视图(L)', checked: view === 'classic', onClick: () => setView('classic') }] },
          { label: '帮助(H)', items: [{ label: '帮助和支持中心', onClick: () => openApp('helpcenter', {}) }] },
        ]}
      />
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
        <button type="button" className={`px-2 py-[2px] rounded-[3px] ${cat && view === 'category' ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'hover:bg-[#e8f0fb] border border-transparent'}`} onClick={() => setCat(null)} disabled={view === 'classic'}>
          ← 后退
        </button>
        <span className="font-bold">{catSel ? catSel.title : view === 'category' ? '控制面板' : '控制面板（经典视图）'}</span>
        <div className="flex-1" />
        <button type="button" className="px-2 py-[2px] rounded-[3px] hover:bg-[#e8f0fb] border border-transparent" onClick={() => setView(view === 'category' ? 'classic' : 'category')}>
          {view === 'category' ? '切换到经典视图' : '切换到类别视图'}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 左栏：蓝色 XP 侧栏 */}
        <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
            <div className="font-bold text-[#1a3f8f] mb-1">请参阅</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('helpcenter', {})}>
              帮助和支持中心
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('Windows Update：正在检查……建议升级到 SP2（2004 年的救赎）')}>
              Windows Update
            </button>
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="font-bold text-[#1a3f8f] mb-1">其他控制面板选项</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('sysprops', {}, '系统属性')}>
              系统属性
            </button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('display', { tab: '设置' }, '显示 属性')}>
              显示属性
            </button>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 bg-white">
          {!catSel && view === 'category' ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-w-[560px]">
              {cats.map((c) => (
                <button key={c.key} type="button" className="flex items-start gap-3 text-left p-2 rounded-[4px] hover:bg-[#e8f0fb]" onClick={() => { setCat(c.key); playClick() }}>
                  <CPIcon kind={c.icon} size={32} />
                  <div>
                    <div className="text-[#1145c4] text-[12px]">{c.title}</div>
                    <div className="text-[11px] text-[#5a5a5a] leading-[15px] mt-[2px]">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {catSel ? (
            <div className="max-w-[460px]">
              <div className="flex items-center gap-3 mb-4">
                <CPIcon kind={catSel.icon} size={48} />
                <div className="text-[13px] font-bold">{catSel.title}</div>
              </div>
              <div className="rounded-[4px] bg-[#f2f7fd] border border-[#b8d0ee] p-3">
                <div className="text-[#1a3f8f] font-bold mb-2">选择一个任务(T):</div>
                {catSel.tasks.map((t) => (
                  <button key={t.label} type="button" className="flex items-center gap-2 text-[#1145c4] hover:underline text-left py-[3px]" onClick={t.action}>
                    <span className="text-[#8ab0e8]">▸</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-3 text-[#1145c4] hover:underline" onClick={() => setCat(null)}>
                ← 返回控制面板
              </button>
            </div>
          ) : null}

          {view === 'classic' ? (
            <div className="flex flex-wrap gap-2 content-start">
              {([
                { label: '打印机和传真', icon: 'printer', action: () => openApp('printfax', {}, '打印机和传真') },
                { label: '电源选项', icon: 'power', action: () => openApp('powerprops', {}, '电源选项 属性') },
                { label: '辅助功能选项', icon: 'access', action: () => openApp('accessprops', {}, '辅助功能选项') },
                { label: '管理工具', icon: 'admin', action: () => openApp('admintools', {}, '管理工具') },
                { label: '键盘', icon: 'keyboard', action: () => openApp('keyboardprops', {}, '键盘 属性') },
                { label: '区域和语言选项', icon: 'intl', action: () => openApp('intlprops', {}, '区域和语言选项') },
                { label: '任务计划', icon: 'tasks', action: () => openApp('taskssched', {}, 'Tasks') },
                { label: '日期和时间', icon: 'clock', action: () => openApp('datetime', {}, '日期和时间 属性') },
                { label: '扫描仪和照相机', icon: 'scanner', action: () => openApp('dialog', { kind: 'info', title: '扫描仪和照相机', text: '没有安装扫描仪或照相机。\n\n要安装设备，请从「添加硬件向导」开始（或买一台 2001 年的 Umax 扫描仪）。' }) },
                { label: '声音和音频设备', icon: 'sound', action: () => openApp('soundprops', {}, '声音和音频设备 属性') },
                { label: '添加或删除程序', icon: 'programs', action: () => openApp('addremove', {}, '添加或删除程序') },
                { label: '网络连接', icon: 'network', action: () => openApp('netconn', {}, '网络连接') },
                { label: '文件夹选项', icon: 'folderopts', action: () => openApp('folderoptions', {}, '文件夹选项') },
                { label: '显示', icon: 'appearance', action: () => openApp('display', { tab: '设置' }, '显示 属性') },
                { label: '用户帐户', icon: 'user', action: () => openApp('useraccounts', {}, '用户帐户') },
                { label: '鼠标', icon: 'mouse', action: () => openApp('mouseprops', {}, '鼠标 属性') },
                { label: '字体', icon: 'fonts', action: () => openApp('fonts', {}, 'Fonts') },
                { label: '自动更新', icon: 'autoupd', action: () => openApp('dialog', { kind: 'info', title: '自动更新', text: '自动更新：\n\n您的计算机当前状态：最新（SP2 手动集成版，2004 年 8 月的光盘荣耀）\n\n在真实 XP 中，此小程序可设置「自动下载并安装」等三种更新策略——SP2 时代它可是气泡提醒常客。' }) },
                { label: '系统', icon: 'perf', action: () => openApp('sysprops', {}, '系统属性') },
              ]).map((it) => (
                <button key={it.label} type="button" className="w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb]" onClick={() => { playClick(); it.action() }}>
                  <CPIcon kind={it.icon} size={32} />
                  <span className="text-[11px] text-center leading-[13px]">{it.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        {catSel ? `${catSel.title}` : `${cats.length} 个类别`}
      </div>
    </div>
  )
}

/* ─────────── 系统属性 ─────────── */

const SP_TABS = ['常规', '计算机名', '硬件', '高级'] as const

export function SystemProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openApp = useXP((s) => s.openApp)
  const [tab, setTab] = useState<(typeof SP_TABS)[number]>('常规')

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        {SP_TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === t ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '常规' ? (
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <div className="font-bold text-[12px]">系统:</div>
                <div className="pl-3 pt-1 space-y-[3px]">
                  <div>Microsoft Windows XP</div>
                  <div>Professional</div>
                  <div>Version 2002</div>
                  <div>Service Pack 2 (Web 复刻版)</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[12px]">注册到:</div>
                <div className="pl-3 pt-1 space-y-[3px]">
                  <div>Administrator</div>
                  <div>家庭版快乐用户</div>
                  <div>55274-640-1234567-23456</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[12px]">计算机:</div>
                <div className="pl-3 pt-1 space-y-[3px]">
                  <div>Genuine Intel(R) CPU T2400 @ 1.83GHz（复刻）</div>
                  <div>512 MB 的 RAM（实际：您浏览器的内存）</div>
                </div>
              </div>
            </div>
            <div className="w-[130px] shrink-0 flex items-center justify-center">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <rect x="4" y="4" width="102" height="102" rx="8" fill="url(#spg)" stroke="#7a90b8" />
                <defs>
                  <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#e8f0fa" />
                    <stop offset="1" stopColor="#b8d0e8" />
                  </linearGradient>
                </defs>
                <path d="M55 22 L62 38 h-7 v6 h-7 v-6 h7 Z" fill="#e8a020" transform="rotate(12 55 30)" />
                <path d="M30 60 q25 -22 50 0" fill="none" stroke="#3a6ea5" strokeWidth="3" />
                <path d="M22 70 q33 -20 66 0" fill="none" stroke="#5a8ad0" strokeWidth="2.5" opacity="0.7" />
                <rect x="26" y="82" width="58" height="10" rx="5" fill="#c8a860" opacity="0.8" />
                <text x="55" y="90" textAnchor="middle" fontSize="7" fill="#6a5a30" fontWeight="bold">Windows XP</text>
              </svg>
            </div>
          </div>
        ) : null}
        {tab === '计算机名' ? (
          <div className="space-y-3">
            <div className="xp-sunken bg-white p-3">
              <div>完整的计算机名: MY-COMPUTER</div>
              <div className="mt-1">工作组: WORKGROUP</div>
            </div>
            <div className="text-[#5a5a4a]">使用「网络标识向导」可以加入域或重命名此计算机。</div>
            <div className="text-right">
              <XPButton onClick={() => showToast('更改名称为「MY-COMPUTER-2001」：复刻版保持原名以示敬意')}>更改(C)...</XPButton>
            </div>
          </div>
        ) : null}
        {tab === '硬件' ? (
          <div className="space-y-3">
            <GroupBox title="设备管理器">
              <div className="xp-sunken bg-white h-[130px] p-2 text-[11px] leading-[16px]">
                <div>▸ 显示卡</div>
                <div className="pl-4">NVIDIA GeForce2 MX/MX 400</div>
                <div>▸ 声音、视频和游戏控制器</div>
                <div className="pl-4">Realtek AC'97 Audio</div>
                <div>▸ 网络适配器</div>
                <div className="pl-4">Realtek RTL8139 Family PCI</div>
                <div>▸ 软盘驱动器</div>
                <div className="pl-4">3.5 英寸软盘驱动器</div>
              </div>
              <div className="text-right mt-2">
                <XPButton onClick={() => openApp('compmgmt', { node: 'devmgr' }, '计算机管理')}>设备管理器(G)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="驱动程序">
              <div>驱动程序签名让您可以确认程序安装源。要启动「驱动程序签名」，请单击「驱动程序签名」。</div>
              <div className="text-right mt-2">
                <XPButton onClick={() => showToast('驱动程序签名：忽略（勇士模式）')}>驱动程序签名(S)</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}
        {tab === '高级' ? (
          <div className="space-y-2">
            <GroupBox title="性能">
              <div className="flex justify-between items-center">
                <span>视觉效果、处理器计划、内存用法和虚拟内存</span>
                <XPButton onClick={() => openApp('perfopts', {})}>设置(S)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="用户配置文件">
              <div className="flex justify-between items-center">
                <span>与登录相关的桌面设置</span>
                <XPButton onClick={() => showToast('本地配置文件 1 个：Administrator (2.3 MB)')}>设置(E)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="启动和故障恢复">
              <div className="flex justify-between items-center">
                <span>系统启动、系统失败和调试信息</span>
                <XPButton onClick={() => showToast('默认操作系统：Microsoft Windows XP Professional /fastdetect')}>设置(T)</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2">
        <XPButton primary onClick={() => closeWindow(win.id)}>
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => showToast('应用：系统属性已保持原样（复刻版一切安好）')}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ─────────── 用户帐户（API 驱动：多帐户 / 密码 / 密码提示 / 更改图片） ─────────── */

type UAPage =
  | { page: 'home' }
  | { page: 'account'; name: string }
  | { page: 'rename'; name: string }
  | { page: 'password'; name: string }
  | { page: 'picture'; name: string }
  | { page: 'delete'; name: string }
  | { page: 'create' }

export function UserAccounts({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const accounts = useXP((s) => s.accounts)
  const setAccounts = useXP((s) => s.setAccounts)
  const sessionUser = useXP((s) => s.sessionUser)
  const [view, setView] = useState<UAPage>({ page: 'home' })
  const [nameInput, setNameInput] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [hint, setHint] = useState('')
  const [newType, setNewType] = useState<'admin' | 'user'>('user')
  const [busy, setBusy] = useState(false)

  const typeLabel = (t: AccountItem['type']) => (t === 'admin' ? '计算机管理员' : t === 'guest' ? '来宾帐户' : '受限帐户')
  const accName = 'name' in view ? view.name : null
  const acc = accName ? accounts.find((a) => a.name === accName) ?? null : null

  const bannerTitle =
    view.page === 'home' ? '用户帐户'
      : view.page === 'account' ? `更改 ${view.name} 的帐户`
        : view.page === 'rename' ? `为 ${view.name} 键入一个新名称`
          : view.page === 'password' ? (acc?.hasPassword ? `更改 ${view.name} 的密码` : `为 ${view.name} 创建一个密码`)
            : view.page === 'picture' ? `为 ${view.name} 挑选一个新图片`
              : view.page === 'delete' ? `您确实要删除 ${view.name} 的帐户吗？`
                : '命名新的帐户并选择帐户类型'

  /* ── API 操作（成功后镜像更新本地列表；失败 toast 错误） ── */
  const doCreate = async () => {
    if (busy) return
    const name = nameInput.trim()
    if (!name) { showToast('请键入新帐户的名称。'); return }
    setBusy(true)
    try {
      const created = await apiCreateAccount({ name, type: newType })
      setAccounts([...accounts, created])
      /* 主目录镜像：服务端已种子，本地树同步补齐（独立「我的文档」立即可用） */
      useXP.getState().seedAccountHome(created.name)
      setView({ page: 'account', name: created.name })
      showToast(`已创建帐户「${created.name}」`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const doRename = async () => {
    if (!acc || busy) return
    const nn = nameInput.trim()
    if (!nn) { showToast('请键入新名称。'); return }
    setBusy(true)
    try {
      const updated = await apiPatchAccount(acc.name, { newName: nn })
      setAccounts(accounts.map((a) => (a.name === acc.name ? updated : a)))
      useXP.getState().renameAccountHome(acc.name, updated.name) /* 主目录同步改名 */
      setView({ page: 'account', name: updated.name })
      showToast(`已将帐户名更改为「${updated.name}」`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const doPassword = async (remove = false) => {
    if (!acc || busy) return
    if (!remove && pwd !== pwd2) { showToast('键入的密码与确认密码不一致。'); return }
    setBusy(true)
    try {
      const updated = await apiPatchAccount(acc.name, remove ? { password: '', hint: '' } : { password: pwd, hint })
      setAccounts(accounts.map((a) => (a.name === acc.name ? updated : a)))
      setView({ page: 'account', name: acc.name })
      showToast(remove ? `已删除 ${acc.name} 的密码` : `已为 ${acc.name} ${acc.hasPassword ? '更改' : '创建'}密码`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const doPicture = async (avatar: string) => {
    if (!acc || busy) return
    setBusy(true)
    try {
      const updated = await apiPatchAccount(acc.name, { avatar })
      setAccounts(accounts.map((a) => (a.name === acc.name ? updated : a)))
      showToast('帐户图片已更改')
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const doDelete = async () => {
    if (!acc || busy) return
    setBusy(true)
    try {
      await apiDeleteAccount(acc.name)
      setAccounts(accounts.filter((a) => a.name !== acc.name))
      useXP.getState().removeAccountHome(acc.name) /* 主目录同步移除（「我的文档」受帐户控制） */
      setView({ page: 'home' })
      showToast(`已删除帐户「${acc.name}」`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  /* 表单行（label + input，XP 用户帐户向导样式） */
  const field = (label: string, value: string, set: (v: string) => void, type = 'text', width = 200) => (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="w-[150px] text-right shrink-0">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="xp-sunken bg-white text-[11px] px-2 h-[20px] outline-none"
        style={{ width }}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      <div className="flex-1 flex min-h-0">
        <div className="w-full flex flex-col">
          {/* 顶部横幅（任务名随视图变化，XP nusrmgr 布局） */}
          <div className="xp-sidebar px-4 py-3 flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 36 36">
              <circle cx="18" cy="11" r="7" fill="#fff" opacity="0.9" />
              <path d="M5 32 q13 -16 26 0 Z" fill="#fff" opacity="0.9" />
            </svg>
            <div className="text-white font-bold text-[13px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {bannerTitle}
            </div>
          </div>
          <div className="flex-1 flex min-h-0">
            {/* 左栏：相关任务 */}
            <div className="w-[150px] shrink-0 border-r border-[#98b8e0] p-2" style={{ background: 'var(--luna-sm-panel)' }}>
              <div className="text-[#1a3f8f] font-bold mb-2">相关任务</div>
              <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => { setView({ page: 'create' }); setNameInput(''); playClick() }}>
                创建一个新帐户
              </button>
              <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px] mt-1" onClick={() => showToast('更改用户登录或注销方式：欢迎使用欢迎屏幕（当前）')}>
                更改用户登录或注销方式
              </button>
              {view.page !== 'home' ? (
                <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px] mt-2" onClick={() => { setView({ page: 'home' }); playClick() }}>
                  ← 返回帐户列表
                </button>
              ) : null}
              {view.page === 'account' ? (
                <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px] mt-1" onClick={() => { setView({ page: 'home' }); playClick() }}>
                  ↑ 返回上一页
                </button>
              ) : null}
            </div>

            {/* 主区 */}
            <div className="flex-1 p-4 overflow-y-auto xp-thin-scroll">
              {view.page === 'home' ? (
                <>
                  <div className="text-[12px] font-bold mb-1">挑选一项任务…</div>
                  <div className="text-[#5a5a5a] mb-4">您可以从下面的列表中选择一个帐户进行更改。</div>
                  <div className="flex flex-wrap gap-4">
                    {accounts.map((a) => (
                      <button key={a.name} type="button" className="w-[150px] p-3 rounded-[4px] hover:bg-[#e8f0fb] text-center" onClick={() => { setView({ page: 'account', name: a.name }); playClick() }}>
                        <div className="mx-auto w-[48px] h-[48px] rounded-[6px] border-2 border-[#7a90c8] shadow mb-2 overflow-hidden">
                          <Bmp name={a.avatar} size={48} style={{ width: 48, height: 48 }} />
                        </div>
                        <div className="font-bold">{a.name}</div>
                        <div className="text-[#5a5a5a]">{typeLabel(a.type)}</div>
                        {a.name === sessionUser ? <div className="text-[9px] text-[#8a8a8a] mt-1">您当前的身份</div> : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {view.page === 'account' && acc ? (
                <div className="max-w-[420px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-[54px] h-[54px] rounded-[6px] border-2 border-[#7a90c8] shadow overflow-hidden shrink-0">
                      <Bmp name={acc.avatar} size={48} style={{ width: 48, height: 48 }} />
                    </div>
                    <div>
                      <div className="font-bold text-[12px]">{acc.name}</div>
                      <div className="text-[#5a5a5a]">{typeLabel(acc.type)} · 帐户类型</div>
                      <div className="text-[#5a5a5a]">{acc.hasPassword ? '已设置密码' : '未设置密码'}</div>
                    </div>
                  </div>
                  <div className="rounded-[4px] bg-[#f2f7fd] border border-[#b8d0ee] p-3 space-y-1">
                    {[
                      { t: '更改我的名称', go: () => { setNameInput(acc.name); setView({ page: 'rename', name: acc.name }) } },
                      { t: acc.hasPassword ? '更改我的密码' : '创建密码', go: () => { setPwd(''); setPwd2(''); setHint(acc.hint); setView({ page: 'password', name: acc.name }) } },
                      { t: '更改我的图片', go: () => setView({ page: 'picture', name: acc.name }) },
                      { t: '设置我的帐户以使用 .NET Passport', go: () => showToast('.NET Passport：2001 年的宏图大业，此处仅致敬') },
                      ...(acc.name !== 'Administrator' && acc.name !== 'Guest' ? [{ t: '删除帐户', go: () => setView({ page: 'delete', name: acc.name }) }] : []),
                    ].map((item) => (
                      <button key={item.t} type="button" className="flex items-center gap-2 text-[#1145c4] hover:underline text-left py-[3px]" onClick={item.go}>
                        <span className="text-[#8ab0e8]">▸</span>
                        {item.t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {view.page === 'rename' && acc ? (
                <div className="max-w-[420px]">
                  <div className="mb-2">为 <b>{acc.name}</b> 键入一个新名称，然后单击「更改名称」。</div>
                  {field('键入一个新名称(T):', nameInput, setNameInput)}
                  <div className="mt-4 flex gap-2">
                    <XPButton disabled={busy} onClick={doRename}>更改名称</XPButton>
                    <XPButton onClick={() => setView({ page: 'account', name: acc.name })}>取消</XPButton>
                  </div>
                </div>
              ) : null}

              {view.page === 'password' && acc ? (
                <div className="max-w-[440px]">
                  <div className="mb-3">
                    {acc.hasPassword
                      ? <>更改 <b>{acc.name}</b> 的密码。为保险起见，请牢记密码提示。</>
                      : <>为 <b>{acc.name}</b> 创建一个密码。密码提示可在登录时帮您回忆密码。</>}
                  </div>
                  <div className="rounded-[4px] bg-[#f2f7fd] border border-[#b8d0ee] p-3">
                    {field('键入一个新密码(T):', pwd, setPwd, 'password')}
                    {field('再次键入密码以确认(C):', pwd2, setPwd2, 'password')}
                    <div className="flex items-start gap-2 py-[3px]">
                      <span className="w-[150px] text-right shrink-0 leading-[20px]">输入一个单词或短语作为密码提示(E):</span>
                      <input
                        type="text"
                        value={hint}
                        onChange={(e) => setHint(e.target.value)}
                        className="xp-sunken bg-white text-[11px] px-2 h-[20px] outline-none flex-1"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 items-center">
                    <XPButton disabled={busy} onClick={() => doPassword(false)}>{acc.hasPassword ? '更改密码' : '创建密码'}</XPButton>
                    <XPButton onClick={() => setView({ page: 'account', name: acc.name })}>取消</XPButton>
                    {acc.hasPassword ? (
                      <XPButton disabled={busy} onClick={() => doPassword(true)}>删除密码</XPButton>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {view.page === 'picture' && acc ? (
                <div className="max-w-[440px]">
                  <div className="mb-3">单击想要使用的图片即可将其用作 <b>{acc.name}</b> 的帐户图片。</div>
                  <div className="grid grid-cols-5 gap-3">
                    {ACCOUNT_AVATARS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        disabled={busy}
                        className={`p-1 rounded-[4px] border-2 ${acc.avatar === av ? 'border-[#316ac5] bg-[#dce9f9]' : 'border-transparent hover:border-[#a8c4e8]'}`}
                        onClick={() => doPicture(av)}
                        title="单击更改图片"
                      >
                        <Bmp name={av} size={48} style={{ width: 48, height: 48 }} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <XPButton onClick={() => setView({ page: 'account', name: acc.name })}>返回</XPButton>
                  </div>
                </div>
              ) : null}

              {view.page === 'delete' && acc ? (
                <div className="max-w-[420px]">
                  <div className="mb-2">
                    您确实要删除 <b>{acc.name}</b> 的帐户吗？<br />
                    <span className="text-[#5a5a5a]">删除后该帐户将无法登录欢迎屏幕（桌面文件与系统设置保留，以示复刻版的温柔）。</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <XPButton disabled={busy} onClick={doDelete}>删除帐户</XPButton>
                    <XPButton onClick={() => setView({ page: 'account', name: acc.name })}>取消</XPButton>
                  </div>
                </div>
              ) : null}

              {view.page === 'create' ? (
                <div className="max-w-[440px]">
                  <div className="mb-3">键入新帐户的名称，单击「下一步」，然后为该帐户选择类型。</div>
                  <div className="rounded-[4px] bg-[#f2f7fd] border border-[#b8d0ee] p-3">
                    {field('键入一个名称(T):', nameInput, setNameInput)}
                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="uatype" checked={newType === 'user'} onChange={() => setNewType('user')} />
                        受限帐户(R)
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="uatype" checked={newType === 'admin'} onChange={() => setNewType('admin')} />
                        计算机管理员(M)
                      </label>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <XPButton disabled={busy} onClick={doCreate}>创建帐户</XPButton>
                    <XPButton onClick={() => setView({ page: 'home' })}>取消</XPButton>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        <button type="button" onClick={() => closeWindow(win.id)} className="hover:underline">
          关闭
        </button>
      </div>
    </div>
  )
}
