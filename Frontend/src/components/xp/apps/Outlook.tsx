'use client'

/* ═══════════════════════════════════════════════════════════════
 * Outlook Express 6 复刻
 * 结构依据：真实 OE6 截图（.zscripts/ref/oe6-2.jpg）
 *   菜单：文件/编辑/查看/工具/邮件/帮助（顺序经参考截图逐字转录确认）
 *   工具栏：创建邮件(▾)/答复/全部答复/转发/打印/删除/发送/接收(▾)/地址簿/查找
 *   左侧：Outlook Express 根 + 本地文件夹树（收件箱/发件箱/已发送/已删除/草稿）+ 联系人窗格
 *   中上：邮件列表（优先级/附件/标记/发件人/主题/接收时间 列头可排序）
 *   中下：预览窗格； 底部：状态栏（联机 + n 封邮件，n 封未读）
 * 撰写邮件 = 独立子窗口（oecompose），真实 XP 行为
 * ═══════════════════════════════════════════════════════════════ */

import React, { useSyncExternalStore, useCallback, useEffect, useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { playClick, playDing } from '../sounds'

/* ─────────── 数据模型 ─────────── */
export type { OeFolder, OeMail } from '../model'
import type { OeMail as Mail, OeFolder } from '../model'
import { DEFAULT_OE_MAILS } from '../model'

const CONTACTS = ['比尔·盖茨', '老王(隔壁)', '前台小刘', '网管老张', '班长大人', '表哥']

const FOLDERS: Array<{ key: OeFolder; label: string }> = [
  { key: 'inbox', label: '收件箱' },
  { key: 'outbox', label: '发件箱' },
  { key: 'sent', label: '已发送邮件' },
  { key: 'deleted', label: '已删除邮件' },
  { key: 'drafts', label: '草稿' },
]

let nextId = 100
const SEED: Mail[] = DEFAULT_OE_MAILS

/* 新邮件池（发送/接收 时随机到达） */
const NEWMAIL_POOL: Array<Pick<Mail, 'from' | 'fromAddr' | 'subject' | 'body'>> = [
  {
    from: '天涯社区', fromAddr: 'notify@tianya.cn', subject: '您订阅的帖子「xp 复刻有没有搞头」有了新回复',
    body: '楼主你好：\n\n网友「蓝色狼人」回复了您的帖子：\n\n「有搞头！建议把任务栏的气泡提示也复刻了，\n 那个『您的计算机可能存在风险』是全 XP 最有味道的回忆。」\n\n—— 天涯社区',
  },
  {
    from: '瑞星杀毒', fromAddr: 'service@rising.com', subject: '升级提示：2001-10-30 版病毒库已发布',
    body: '尊敬的用户：\n\n今日病毒库已更新（版本号 13.42.60）。\n新增可查杀：I-Worm/Chinese...（此处省略 47 种）\n\n—— 瑞星，让计算机更安全',
  },
  {
    from: '网易邮箱', fromAddr: 'system@163.com', subject: '恭喜您成为第 1000000 位用户！',
    body: '亲爱的用户：\n\n恭喜！您的邮箱 5MB 容量免费扩容到 6MB！\n\n（这封不是垃圾邮件，真的。）\n\n—— 网易免费邮箱',
  },
  {
    from: '老王(隔壁)', fromAddr: 'laowang@sohu.com', subject: '晚上来我家看《大宅门》？',
    body: '老张：\n\n今晚央视八点档《大宅门》大结局，\n我家刚装了 29 寸大彩电，带 S 端子！\n\n来的时候带两瓶北冰洋。\n\n—— 老王',
  },
]

/* ─────────── 模块级邮件仓库（跨窗口共享：主窗口 + 撰写窗口；API 持久化镜像于 store.oeMails） ─────────── */
let mails: Mail[] = [...SEED]
const listeners = new Set<() => void>()
/* hydrate：启动同步引擎拉取服务端邮件后注入模块仓库（仅一次；之后模块仓库为唯一写入口） */
let hydrated = false
export function oeHydrate(m: Mail[]): void {
  if (hydrated || !Array.isArray(m)) return
  hydrated = true
  mails = [...m]
  nextId = Math.max(100, ...mails.map((x) => x.id + 1))
  listeners.forEach((l) => l())
}
function commit(fn: (m: Mail[]) => Mail[]) {
  mails = fn(mails)
  /* 镜像到全局 store → 触发 API 整表 PUT（脱机时静默重试由同步引擎负责） */
  try { useXP.getState().setOeMails(mails) } catch { /* store 尚未就绪（SSR/早期挂载）时跳过镜像 */ }
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
function useMails(): Mail[] {
  return useSyncExternalStore(subscribe, () => mails)
}
export function nowStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export function oeSend(opts: { to: string; subject: string; body: string; attach?: string | null }): void {
  const m: Mail = {
    id: nextId++, from: 'Administrator', fromAddr: 'admin@webxp.local', to: opts.to || '(无收件人)',
    subject: opts.subject || '(无主题)', body: opts.body, date: nowStr(),
    read: true, folder: 'outbox', attach: opts.attach ?? undefined,
  }
  commit((ms) => [m, ...ms])
}
export function oeOutboxCount(): number {
  return mails.filter((m) => m.folder === 'outbox').length
}
export function oeFlushOutbox(): number {
  const n = oeOutboxCount()
  if (n > 0) commit((ms) => ms.map((m) => (m.folder === 'outbox' ? { ...m, folder: 'sent' as const, date: nowStr() } : m)))
  return n
}
export function oeDeliverRandom(): Mail | null {
  if (Math.random() > 0.45) return null
  const p = NEWMAIL_POOL[Math.floor(Math.random() * NEWMAIL_POOL.length)]
  const m: Mail = {
    id: nextId++, from: p.from, fromAddr: p.fromAddr, to: 'Administrator',
    subject: p.subject, body: p.body, date: nowStr(), read: false, folder: 'inbox',
  }
  commit((ms) => [m, ...ms])
  return m
}

/* ─────────── XP 风图标（16px 矢量，OE6 信封族） ─────────── */
function EnvIcon({ kind }: { kind: 'inbox' | 'outbox' | 'sent' | 'deleted' | 'drafts' }) {
  const body = '#f4e9b8'
  const rim = '#8a734f'
  return (
    <svg width="16" height="13" viewBox="0 0 16 13">
      <rect x="1" y="2.5" width="14" height="9.5" rx="0.8" fill={body} stroke={rim} strokeWidth="0.8" />
      <path d="M1 3 L8 8 L15 3" fill="none" stroke={rim} strokeWidth="0.9" />
      {kind === 'inbox' && <><path d="M8 8 L8 11" stroke="#c8b088" strokeWidth="0.8" /><circle cx="12.6" cy="2.6" r="2.2" fill="#e04828" stroke="#8a2010" strokeWidth="0.6" /><path d="M11.8 1.9 l1.6 1.6 M13.4 1.9 l-1.6 1.6" stroke="#fff" strokeWidth="0.7" /></>}
      {kind === 'outbox' && <path d="M8.5 11 V6.5 M6.5 8 L8.5 6 L10.5 8" stroke="#2a7a2a" strokeWidth="1.1" fill="none" strokeLinecap="round" />}
      {kind === 'sent' && <path d="M5 6.5 l2.2 2.2 L11.5 4.5" stroke="#2a5fc0" strokeWidth="1.3" fill="none" strokeLinecap="round" />}
      {kind === 'deleted' && <path d="M4.5 4.5 h7 M6 4.5 V3 h4 v1.5" fill="none" stroke="#8a5a20" strokeWidth="0.9" />}
      {kind === 'drafts' && <path d="M5 9 h6" stroke="#8a734f" strokeWidth="0.9" />}
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13">
      <circle cx="7" cy="3.8" r="2.6" fill="#f0c8a0" stroke="#8a6a4a" strokeWidth="0.7" />
      <path d="M2 12 q0-5 5-5 t5 5 Z" fill="#4a86d8" stroke="#2a5a9a" strokeWidth="0.7" />
    </svg>
  )
}
function OeRootIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14">
      <ellipse cx="8" cy="7" rx="7" ry="6.2" fill="#2a6ac8" />
      <ellipse cx="8" cy="7" rx="4.6" ry="6.2" fill="#5a9ce0" />
      <ellipse cx="8" cy="7" rx="2.2" ry="6.2" fill="#8ad0fc" />
    </svg>
  )
}

/* 工具栏按钮（32 位图标风格大按钮） */
function TBtn({ icon, label, onClick, split, disabled, title }: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  split?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      className={`flex items-center gap-1 px-[5px] py-[2px] rounded-[3px] border border-transparent ${disabled ? 'opacity-40' : 'hover:bg-gradient-to-b hover:from-[#fdf3e0] hover:to-[#f5dcb0] hover:border-[#e0b878] active:from-[#f0d8a8] active:to-[#e8c880]'}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[11px]">{label}</span>
      {split ? <span className="text-[8px] ml-[1px] text-[#5a5a4a]">▾</span> : null}
    </button>
  )
}

/* ─────────── 主组件 ─────────── */
export default function Outlook({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openApp = useXP((s) => s.openApp)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const openCtx = useXP((s) => s.openCtx)
  const allMails = useMails()
  const [folder, setFolder] = useState<OeFolder>('inbox')
  const [selId, setSelId] = useState<number | null>(null)
  const [treeOpen, setTreeOpen] = useState(true)
  const [contactsOpen, setContactsOpen] = useState(true)
  const [sortKey, setSortKey] = useState<'from' | 'subject' | 'date'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [sending, setSending] = useState(false)

  const list = useMemo(() => {
    const l = allMails.filter((m) => m.folder === folder)
    const dir = sortAsc ? 1 : -1
    return [...l].sort((a, b) => {
      if (sortKey === 'date') return (a.date < b.date ? -1 : 1) * dir
      if (sortKey === 'from') return a.from.localeCompare(b.from, 'zh') * dir
      return a.subject.localeCompare(b.subject, 'zh') * dir
    })
  }, [allMails, folder, sortKey, sortAsc])
  const sel = allMails.find((m) => m.id === selId) ?? null
  const unread = (f: OeFolder) => allMails.filter((m) => m.folder === f && !m.read).length
  const count = (f: OeFolder) => allMails.filter((m) => m.folder === f).length

  useEffect(() => {
    setWindowTitle(win.id, `${FOLDERS.find((f) => f.key === folder)?.label} - Outlook Express`)
  }, [folder, setWindowTitle, win.id])

  const selectMail = (m: Mail) => {
    setSelId(m.id)
    if (!m.read) commit((ms) => ms.map((x) => (x.id === m.id ? { ...x, read: true } : x)))
  }

  const del = (m: Mail) => {
    if (m.folder === 'deleted') {
      commit((ms) => ms.filter((x) => x.id !== m.id))
      if (selId === m.id) setSelId(null)
    } else {
      commit((ms) => ms.map((x) => (x.id === m.id ? { ...x, folder: 'deleted' as OeFolder, read: true } : x)))
      if (selId === m.id) setSelId(null)
    }
    playClick()
  }

  const compose = (opts?: { to?: string; subject?: string; body?: string; attach?: string | null }) => {
    openApp('oecompose', {
      to: opts?.to ?? '',
      subject: opts?.subject ?? '',
      body: opts?.body ?? '',
      attach: opts?.attach ?? null,
    })
  }
  const reply = (all: boolean) => {
    if (!sel) return
    compose({
      to: all ? `${sel.fromAddr}, ${CONTACTS[1]}@sohu.com` : sel.fromAddr,
      subject: `回复: ${sel.subject}`,
      body: `\n\n----- 原始邮件 -----\n发件人: ${sel.from} <${sel.fromAddr}>\n主题: ${sel.subject}\n日期: ${sel.date}\n\n${sel.body}`,
      attach: null,
    })
  }
  const forward = () => {
    if (!sel) return
    compose({
      subject: `转发: ${sel.subject}`,
      body: `\n\n----- 转发邮件 -----\n发件人: ${sel.from} <${sel.fromAddr}>\n主题: ${sel.subject}\n日期: ${sel.date}\n\n${sel.body}`,
      attach: sel.attach ?? null,
    })
  }

  const sendRecv = () => {
    if (sending) return
    setSending(true)
    playClick()
    setTimeout(() => {
      const flushed = oeFlushOutbox()
      const nm = oeDeliverRandom()
      setSending(false)
      if (nm) {
        playDing()
        showToast({ icon: 'mail', title: 'Outlook Express', text: `您有新邮件：${nm.subject}` })
      } else if (flushed > 0) {
        showToast(`已发送 ${flushed} 封邮件（发件箱已清空）`)
      } else {
        showToast('没有新邮件。')
      }
    }, 1400)
  }

  const fromCol = folder === 'sent' || folder === 'drafts' || folder === 'outbox'
  const colTitle = (key: 'from' | 'subject' | 'date', label: string, w?: string) => (
    <button
      type="button"
      className={`flex items-center gap-1 px-2 py-[2px] text-left hover:bg-[#f0ede2] border-r border-[#d8d5c8] ${w ?? 'flex-1'}`}
      onClick={() => {
        if (sortKey === key) setSortAsc((v) => !v)
        else { setSortKey(key); setSortAsc(true) }
      }}
    >
      <span className="font-bold text-[11px]">{label}</span>
      {sortKey === key ? <span className="text-[8px] text-[#5a5a4a]">{sortAsc ? '▲' : '▼'}</span> : null}
    </button>
  )

  return (
    <div className="relative flex flex-col h-full bg-[#ece9d8] select-none overflow-hidden">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建(N)', submenu: [{ label: '邮件(M)...', onClick: () => compose() }, { label: '文件夹(F)...', onClick: () => showToast('新建文件夹：本地文件夹结构在复刻版中固定') }, { label: '联系人(C)...', onClick: () => showToast('新建联系人已加入「联系人」窗格（示例）') }] },
              { separator: true },
              { label: '文件夹(F)', submenu: FOLDERS.map((f) => ({ label: f.label, onClick: () => setFolder(f.key) })) },
              { separator: true },
              { label: '导入(M)...', onClick: () => showToast('导入：通讯簿 / 邮件（复刻版无外部数据源）') },
              { label: '导出(E)...', onClick: () => showToast('导出功能在复刻版中省略') },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '复制(C)', accelerator: 'Ctrl+C', onClick: () => sel && showToast(`已复制主题「${sel.subject}」`) },
              { label: '全选(A)', onClick: () => showToast(`已选中 ${list.length} 封邮件`) },
              { separator: true },
              { label: '删除(D)', accelerator: 'Ctrl+D', disabled: !sel, onClick: () => sel && del(sel) },
              { label: '移动到文件夹(V)...', disabled: !sel, onClick: () => sel && showToast('移动到文件夹：请使用删除（→已删除邮件）') },
              { label: '标记为已读(M)', disabled: !sel, onClick: () => sel && commit((ms) => ms.map((x) => (x.id === sel.id ? { ...x, read: true } : x))) },
            ],
          },
          {
            label: '查看(V)',
            items: [
              { label: '当前视图(W)', submenu: [{ label: '显示所有邮件(S)', checked: true, onClick: () => {} }, { label: '隐藏已读或忽略的邮件(H)', onClick: () => showToast('视图筛选在复刻版中省略') }] },
              { label: '排序方式(B)', submenu: [{ label: '接收时间', checked: sortKey === 'date', onClick: () => setSortKey('date') }, { label: '发件人', checked: sortKey === 'from', onClick: () => setSortKey('from') }, { label: '主题', checked: sortKey === 'subject', onClick: () => setSortKey('subject') }] },
              { separator: true },
              { label: '布局(L)...', onClick: () => showToast('布局：复刻版固定为「文件夹+联系人+预览窗格」三窗格') },
              { label: '文本大小(T)', submenu: [{ label: '较小', onClick: () => showToast('文本大小：较小') }, { label: '中等', checked: true, onClick: () => {} }, { label: '较大', onClick: () => showToast('文本大小：较大') }] },
            ],
          },
          {
            label: '工具(T)',
            items: [
              { label: '发送和接收(S)', accelerator: 'Ctrl+M', onClick: sendRecv },
              { separator: true },
              { label: '通讯簿(B)...', accelerator: 'Ctrl+Shift+B', onClick: () => showToast(`通讯簿：${CONTACTS.length} 位联系人`) },
              { label: '邮件规则(R)...', onClick: () => showToast('邮件规则：没有规则（2001 年的邮箱还很干净）') },
              { label: '帐户(A)...', onClick: () => showToast('Internet 帐户：邮件(POP3)×1 · 新闻(NNTP)×1 · 目录服务(LDAP)×1') },
              { label: '选项(O)...', onClick: () => showToast('选项：常规/发送/阅读/安全/回执/拼写检查/签名 在复刻版中省略') },
            ],
          },
          {
            label: '邮件(M)',
            items: [
              { label: '新邮件(N)', accelerator: 'Ctrl+N', onClick: () => compose() },
              { separator: true },
              { label: '答复发件人(R)', accelerator: 'Ctrl+R', disabled: !sel, onClick: () => reply(false) },
              { label: '全部答复(A)', disabled: !sel, onClick: () => reply(true) },
              { label: '转发(F)', accelerator: 'Ctrl+F', disabled: !sel, onClick: forward },
              { separator: true },
              { label: '创建规则(R)', submenu: [{ label: '发件人', disabled: !sel, onClick: () => showToast('已按发件人创建规则（示例）') }] },
              { label: '阻止发件人(K)', disabled: !sel, onClick: () => sel && showToast(`已将 ${sel.fromAddr} 加入阻止发件人名单`) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '目录和索引(C)', onClick: () => openApp('helpcenter', { topic: '邮件' }) },
              { separator: true },
              { label: '关于 Outlook Express(A)', onClick: () => openApp('about', { title: '关于 Outlook Express', text: 'Microsoft® Outlook® Express\n版本 6.00.2900.2180\n\nMicrosoft® Windows® Operating System\n版权所有 (C) 1985-2001 Microsoft Corp.\n\n本复刻版为教育怀旧用途。\n邮件数据保存在浏览器内存中。' }) },
            ],
          },
        ]}
      />

      {/* 工具栏（真实 OE6：创建邮件▾ / 答复 / 全部答复 / 转发 / 打印 / 删除 / 发送接收▾ / 地址簿 / 查找） */}
      <div className="flex items-center gap-[3px] px-1 py-[2px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] shrink-0 overflow-x-auto">
        <TBtn
          icon={<svg width="21" height="19" viewBox="0 0 22 20"><rect x="1" y="4" width="20" height="14" rx="1" fill="#fff" stroke="#4a6fd0" strokeWidth="1" /><path d="M1 4 L11 12 L21 4" fill="none" stroke="#4a6fd0" strokeWidth="1" /><path d="M15 1 L15 7 M12 4 h6" stroke="#2a8f2a" strokeWidth="1.6" strokeLinecap="round" /></svg>}
          label="创建邮件" split
          onClick={() => compose()}
        />
        <TBtn
          icon={<svg width="21" height="19" viewBox="0 0 22 20"><path d="M2 1 L20 1 L12 10" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" /><rect x="1" y="9" width="20" height="10" rx="1" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" /><path d="M1 9 L11 16 L21 9" fill="none" stroke="#8a734f" strokeWidth="0.9" /><path d="M15 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M21 12 L21 18 M19 16 L21 18 L23 16" fill="none" stroke="#2a7ab0" strokeWidth="1.3" /></svg>}
          label="答复" disabled={!sel} onClick={() => reply(false)}
        />
        <TBtn
          icon={<svg width="21" height="19" viewBox="0 0 22 20"><path d="M2 1 L20 1 L12 10" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" /><rect x="1" y="9" width="20" height="10" rx="1" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" /><path d="M1 9 L11 16 L21 9" fill="none" stroke="#8a734f" strokeWidth="0.9" /><path d="M1 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M1 12 L1 18 M-1 16 L1 18 L3 16" fill="none" stroke="#2a7ab0" strokeWidth="1.3" /><path d="M15 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M21 12 L21 18 M19 16 L21 18 L23 16" fill="none" stroke="#2a7ab0" strokeWidth="1.3" /></svg>}
          label="全部答复" disabled={!sel} onClick={() => reply(true)}
        />
        <TBtn
          icon={<svg width="21" height="19" viewBox="0 0 22 20"><rect x="1" y="3" width="20" height="12" rx="1" fill="#f4e9b8" stroke="#8a734f" strokeWidth="1" /><path d="M1 3 L11 10 L21 3" fill="none" stroke="#8a734f" strokeWidth="0.9" /><path d="M4 17 L18 15 M4 15 L18 17" stroke="#2a8f2a" strokeWidth="1.4" strokeLinecap="round" /></svg>}
          label="转发" disabled={!sel} onClick={forward}
        />
        <div className="w-[3px] self-stretch border-l border-[#d8d5c8] mx-[2px]" />
        <TBtn
          icon={<svg width="19" height="19" viewBox="0 0 20 20"><rect x="6" y="1.5" width="8" height="4" fill="#d8e8f8" stroke="#5a86b0" strokeWidth="0.8" /><rect x="1.5" y="5" width="17" height="8" rx="1" fill="#8ab0d8" stroke="#3a5f8a" strokeWidth="0.9" /><rect x="4.5" y="9" width="11" height="9" fill="#fff" stroke="#5a86b0" strokeWidth="0.8" /><path d="M7 12 h6 M7 14.5 h6 M7 12 h6" stroke="#5a86b0" strokeWidth="0.7" /></svg>}
          label="打印" disabled={!sel}
          onClick={() => sel && showToast(`正在打印「${sel.subject}」…`)}
        />
        <TBtn
          icon={<svg width="18" height="19" viewBox="0 0 19 20"><path d="M3 4 h13 M6.5 4 V1.5 h6 V4 M4 4 l1.2 14.5 h8.6 L15 4" fill="none" stroke="#8a5a20" strokeWidth="1.1" /><path d="M7 8 l5 5 M12 8 l-5 5" stroke="#c02818" strokeWidth="1.2" strokeLinecap="round" /></svg>}
          label="删除" disabled={!sel} onClick={() => sel && del(sel)}
        />
        <div className="w-[3px] self-stretch border-l border-[#d8d5c8] mx-[2px]" />
        <TBtn
          icon={<svg width="21" height="19" viewBox="0 0 22 20"><path d="M2 10 L20 3 L15 17 L11 11 Z" fill="#f4e9b8" stroke="#8a734f" strokeWidth="0.9" /><path d="M20 3 L11 11" stroke="#a08a60" strokeWidth="0.8" /><path d="M20 3 L11 11" stroke="#2a8f2a" strokeWidth="0" /></svg>}
          label={sending ? '检查中…' : '发送/接收'} split
          onClick={sendRecv}
        />
        <TBtn
          icon={<svg width="19" height="19" viewBox="0 0 20 20"><rect x="2" y="1.5" width="7.5" height="9.5" rx="0.8" fill="#5a9ce0" stroke="#2a5a9a" strokeWidth="0.8" /><rect x="10.5" y="9" width="7.5" height="9.5" rx="0.8" fill="#e04828" stroke="#8a2010" strokeWidth="0.8" /><path d="M4 4.5 h3.5 M4 6.5 h3.5 M12.5 12 h3.5 M12.5 14 h3.5" stroke="#fff" strokeWidth="0.8" /></svg>}
          label="地址簿" onClick={() => showToast(`通讯簿：${CONTACTS.join('、')} 等 ${CONTACTS.length} 人`)}
        />
        <TBtn
          icon={<svg width="19" height="19" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5" fill="#e8f0fb" stroke="#2a5fbc" strokeWidth="1.2" /><path d="M6.5 8.5 a2 2 0 0 1 2 -2" fill="none" stroke="#2a5fbc" strokeWidth="0.9" /><path d="M13 13 L18 18" stroke="#a06010" strokeWidth="2.2" strokeLinecap="round" /></svg>}
          label="查找" onClick={() => showToast('查找邮件：请直接使用列头排序（复刻版省略查找窗）')}
        />
      </div>

      {/* 主体：文件夹树+联系人 | 邮件列表+预览 */}
      <div className="flex-1 flex min-h-0">
        <div className="w-[196px] shrink-0 bg-[#ece9d8] border-r border-[#d8d5c8] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto xp-thin-scroll p-1">
            <button
              type="button"
              className="w-full flex items-center gap-[6px] px-1 py-[2px] rounded-[2px] text-left text-[11px] hover:bg-[#e8f0fb]"
              onClick={() => showToast('Outlook Express：欢迎使用（请从本地文件夹选择邮件文件夹）')}
            >
              <OeRootIcon />
              <span className="text-[#00309c] font-bold">Outlook Express</span>
            </button>
            <div className="flex items-start pl-1 mt-[2px]">
              <button
                type="button"
                className="w-[11px] h-[11px] mt-[2px] mr-1 shrink-0 bg-white border border-[#8a867e] text-[8px] leading-[9px] text-[#3a3a3a] flex items-center justify-center"
                onClick={() => setTreeOpen((v) => !v)}
                aria-label={treeOpen ? '折叠本地文件夹' : '展开本地文件夹'}
              >
                {treeOpen ? '−' : '+'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#00309c] font-bold leading-[17px]">本地文件夹</div>
                {treeOpen ? (
                  <div className="relative ml-[7px] border-l border-[#b8b4a8] pl-2 space-y-[1px] mt-[1px]">
                    {FOLDERS.map((f) => {
                      const u = unread(f.key)
                      const isSel = folder === f.key
                      return (
                        <button
                          key={f.key}
                          type="button"
                          className={`w-full flex items-center gap-[6px] px-1 py-[2px] rounded-[2px] text-left text-[11px] ${isSel ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'border border-transparent hover:bg-[#e8f0fb]'}`}
                          onClick={() => { setFolder(f.key); setSelId(null) }}
                        >
                          <EnvIcon kind={f.key} />
                          <span className={`truncate flex-1 ${u ? 'font-bold' : ''}`}>{f.label}{u > 0 ? ` (${u})` : ''}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {/* 联系人窗格（真实 OE6 布局） */}
          <div className="border-t border-[#d8d5c8] shrink-0">
            <button
              type="button"
              className="w-full flex items-center gap-1 px-2 py-[3px] text-[11px] text-[#00309c] font-bold hover:bg-[#e8f0fb]"
              onClick={() => setContactsOpen((v) => !v)}
            >
              <span className="w-[9px] text-[8px] inline-block">{contactsOpen ? '▾' : '▸'}</span>
              联系人
            </button>
            {contactsOpen ? (
              <div className="max-h-[110px] overflow-y-auto xp-thin-scroll pb-1">
                {CONTACTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-full flex items-center gap-[6px] px-3 py-[2px] text-left text-[11px] hover:bg-[#e8f0fb]"
                    onDoubleClick={() => compose({ to: `${c}@example.com` })}
                    onClick={() => {}}
                    title={`双击给 ${c} 写邮件`}
                  >
                    <PersonIcon />
                    <span className="truncate">{c}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* 邮件列表 + 预览窗格 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-[148px] shrink-0 bg-white border-b border-[#d8d5c8] overflow-y-auto xp-thin-scroll">
            <div className="flex items-center h-[20px] sticky top-0 z-[1] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] text-[11px]">
              <div className="w-[22px] shrink-0 text-center text-[9px] text-[#5a5a4a] border-r border-[#d8d5c8]" title="优先级">!</div>
              <div className="w-[22px] shrink-0 text-center text-[9px] text-[#5a5a4a] border-r border-[#d8d5c8]" title="附件">📎</div>
              <div className="w-[22px] shrink-0 text-center text-[9px] text-[#5a5a4a] border-r border-[#d8d5c8]" title="标记">⚑</div>
              {colTitle('from', fromCol ? '收件人' : '发件人', 'w-[150px] shrink-0')}
              {colTitle('subject', '主题')}
              {colTitle('date', '接收时间', 'w-[110px] shrink-0')}
            </div>
            {list.length === 0 ? (
              <div className="flex items-center justify-center h-[100px] text-[11px] text-[#8a8a8a]">此文件夹中没有邮件。</div>
            ) : (
              list.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center h-[19px] text-[11px] cursor-default border-b border-[#f0ede4] ${selId === m.id ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
                  onClick={() => selectMail(m)}
                  onDoubleClick={() => selectMail(m)}
                >
                  <div className="w-[22px] shrink-0 text-center">
                    {m.prio === 'high' ? <span className="text-[#c02818] font-bold" title="高优先级">!</span> : null}
                  </div>
                  <div className="w-[22px] shrink-0 flex items-center justify-center">
                    {m.attach ? (
                      <svg width="10" height="11" viewBox="0 0 10 11"><path d="M4 1 h4 v7 a2 2 0 1 1 -4 0 V3 h2 v5" fill="none" stroke={selId === m.id ? '#fff' : '#5a5a4a'} strokeWidth="1" /></svg>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="w-[22px] shrink-0 flex items-center justify-center"
                    title={m.flagged ? '清除标记' : '标记邮件'}
                    onClick={(e) => { e.stopPropagation(); commit((ms) => ms.map((x) => (x.id === m.id ? { ...x, flagged: !x.flagged } : x))) }}
                  >
                    {m.flagged ? <span className="text-[#c02818] text-[10px]">⚑</span> : null}
                  </button>
                  <div className={`w-[150px] shrink-0 truncate pl-[4px] ${m.read ? 'font-normal' : 'font-bold'}`}>{fromCol ? m.to : m.from}</div>
                  <div className={`flex-1 truncate pr-2 flex items-center gap-1 ${m.read ? '' : 'font-bold'}`}>
                    <svg width="15" height="12" viewBox="0 0 16 12" className="shrink-0">
                      {m.read ? (
                        <>
                          <rect x="1" y="1" width="14" height="10" rx="0.8" fill="#fff" stroke="#8a867e" strokeWidth="0.8" />
                          <path d="M1 1 L8 7 L15 1" fill="none" stroke="#8a867e" strokeWidth="0.8" />
                        </>
                      ) : (
                        <>
                          <rect x="1" y="1" width="14" height="10" rx="0.8" fill="#f4e9b8" stroke="#8a734f" strokeWidth="0.8" />
                          <path d="M1 1 L8 7 L15 1" fill="none" stroke="#8a734f" strokeWidth="0.9" />
                        </>
                      )}
                    </svg>
                    <span className="truncate">{m.subject}</span>
                  </div>
                  <div className={`w-[110px] shrink-0 truncate pr-2 ${m.read ? '' : 'font-bold'}`}>{m.date}</div>
                </div>
              ))
            )}
          </div>
          {/* 预览窗格 */}
          <div className="flex-1 bg-white overflow-y-auto xp-thin-scroll min-h-0" onContextMenu={(e) => {
            if (!sel) return
            e.preventDefault()
            openCtx(e.clientX, e.clientY, [
              { label: '答复发件人(R)', disabled: !sel, onClick: () => reply(false) },
              { label: '全部答复(A)', disabled: !sel, onClick: () => reply(true) },
              { label: '转发(F)', disabled: !sel, onClick: forward },
              { separator: true },
              { label: sel?.read ? '标记为未读(U)' : '标记为已读(M)', onClick: () => sel && commit((ms) => ms.map((x) => (x.id === sel.id ? { ...x, read: !x.read } : x))) },
              { label: sel?.flagged ? '清除标记(L)' : '标记邮件(K)', onClick: () => sel && commit((ms) => ms.map((x) => (x.id === sel.id ? { ...x, flagged: !x.flagged } : x))) },
              { separator: true },
              { label: '删除(D)', disabled: !sel, onClick: () => sel && del(sel) },
            ])
          }}>
            {sel ? (
              <div className="p-2">
                <div className="border-b border-[#d8d5c8] pb-[6px] mb-2 text-[11px] text-[#3a3a3a] leading-[17px]">
                  <div><span className="text-[#5a5a4a]">{fromCol ? '收件人:' : '发件人:'}</span> {fromCol ? sel.to : `${sel.from} <${sel.fromAddr}>`}</div>
                  <div><span className="text-[#5a5a4a]">主题:</span> {sel.subject}</div>
                  <div><span className="text-[#5a5a4a]">接收时间:</span> {sel.date}</div>
                </div>
                <div className="text-[11px] leading-[18px] whitespace-pre-wrap">{sel.body}</div>
                {sel.attach ? (
                  <div className="mt-3 inline-flex items-center gap-2 border border-[#c8c4b8] rounded-[4px] bg-[#f5f2e8] px-3 py-2">
                    <svg width="26" height="26" viewBox="0 0 28 28">
                      <rect x="4" y="2" width="20" height="24" rx="2" fill="#fff" stroke="#8a8a8a" />
                      <rect x="8" y="8" width="12" height="3" fill="#7ab0e8" />
                      <path d="M8 14 h12 M8 18 h12 M8 22 h7" stroke="#5a5a5a" strokeWidth="1.2" />
                    </svg>
                    <div className="text-[11px]">
                      <div className="font-bold">{sel.attach.split(' (')[0]}</div>
                      <div className="text-[#5a5a4a]">附件：{sel.attach.match(/\((.+)\)/)?.[1]}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[11px] text-[#8a8a8a]">单击邮件以在预览窗格中查看</div>
            )}
          </div>
        </div>
      </div>

      {/* 状态栏（真实 OE6：联机 | n 封邮件，n 封未读 | OE 徽标） */}
      <div className="flex items-center h-[20px] bg-[#ece9d8] border-t border-[#d8d5c8] text-[11px] shrink-0">
        <div className="px-2 flex items-center gap-1 border-r border-[#d8d5c8]">
          <span className="w-[9px] h-[9px] rounded-full bg-[#2a9c2a] border border-[#146014]" />
          联机
        </div>
        <div className="px-2 flex-1 border-r border-[#d8d5c8]">
          {count(folder)} 封邮件，{unread(folder)} 封未读{folder === 'outbox' && count('outbox') > 0 ? `（待发送 ${count('outbox')} 封）` : ''}
        </div>
        <div className="px-2 flex items-center gap-1 text-[#5a5a4a]">
          <OeRootIcon />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ 撰写邮件窗口（独立子窗口，真实 XP 行为） ═══════════════ */
export function OeCompose({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [to, setTo] = useState((win.props.to as string) ?? '')
  const [cc] = useState('')
  const [subject, setSubject] = useState((win.props.subject as string) ?? '')
  const [body, setBody] = useState((win.props.body as string) ?? '')
  const [attach, setAttach] = useState<string | null>((win.props.attach as string) ?? null)
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)

  const send = useCallback(() => {
    oeSend({ to, subject, body, attach })
    closeWindow(win.id)
    playDing()
    showToast('邮件已放入发件箱（将在下次「发送/接收」时发出）')
  }, [to, subject, body, attach, closeWindow, win.id, showToast])

  const close = useCallback(() => closeWindow(win.id), [closeWindow, win.id])

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none overflow-hidden">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '发送邮件(S)', accelerator: 'Alt+S', onClick: send },
              { separator: true },
              { label: '保存(S)', onClick: () => { oeSend({ to, subject, body: `${body}\n\n[草稿 ${nowStr()}]`, attach }); showToast('草稿已保存到「草稿」文件夹'); closeWindow(win.id) } },
              { label: '另存为(A)...', onClick: () => showToast('另存为在复刻版中省略') },
              { separator: true },
              { label: '退出(X)', onClick: close },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '撤消(U)', accelerator: 'Ctrl+Z', onClick: () => showToast('撤消（浏览器编辑器内置）') },
              { separator: true },
              { label: '剪切(T)', accelerator: 'Ctrl+X', onClick: () => document.execCommand('cut') },
              { label: '复制(C)', accelerator: 'Ctrl+C', onClick: () => document.execCommand('copy') },
              { label: '粘贴(P)', accelerator: 'Ctrl+V', onClick: () => showToast('请使用 Ctrl+V 粘贴') },
            ],
          },
          {
            label: '查看(V)',
            items: [{ label: '所有标题(A)', checked: true, onClick: () => {} }, { label: '工具栏(T)', checked: true, onClick: () => {} }],
          },
          {
            label: '插入(I)',
            items: [
              { label: '文件附件(F)...', accelerator: 'Alt+A', onClick: () => setAttach('luna_theme.jpg (216 KB)') },
              { label: '文本文件中的文本(T)...', onClick: () => showToast('插入文本文件在复刻版中省略') },
              { label: '图片(P)...', onClick: () => showToast('插入图片在复刻版中省略') },
              { separator: true },
              { label: '签名(S)', submenu: [{ label: 'Administrator', onClick: () => setBody((b) => `${b}\n\n—— Administrator\nWebXP 复刻工作组`) }] },
            ],
          },
          {
            label: '格式(O)',
            items: [
              { label: '多信息文本(HTML)(R)', checked: true, onClick: () => {} },
              { label: '纯文本(P)', onClick: () => showToast('纯文本模式在复刻版中省略') },
            ],
          },
          { label: '帮助(H)', items: [{ label: '关于 Outlook Express(A)', onClick: () => showToast('Microsoft Outlook Express 6 · Web 复刻版') }] },
        ]}
      />
      {/* 工具栏 */}
      <div className="flex items-center gap-[3px] px-1 py-[2px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] shrink-0">
        <TBtn icon={<svg width="20" height="19" viewBox="0 0 21 20"><path d="M2 10 L19 3 L13 17 L9.5 11 Z" fill="#f4e9b8" stroke="#8a734f" strokeWidth="0.9" /><path d="M19 3 L9.5 11" stroke="#a08a60" strokeWidth="0.8" /></svg>} label="发送" onClick={send} />
        <div className="w-[3px] self-stretch border-l border-[#d8d5c8] mx-[2px]" />
        <TBtn icon={<svg width="17" height="18" viewBox="0 0 18 19"><path d="M3 1.5 L8 9 L3 16.5 M8 9 h6" fill="none" stroke="#2a3a5a" strokeWidth="1.6" strokeLinecap="round" /></svg>} label="剪切" onClick={() => document.execCommand('cut')} />
        <TBtn icon={<svg width="16" height="18" viewBox="0 0 17 19"><rect x="3.5" y="1.5" width="10" height="16" rx="1" fill="#fff" stroke="#2a3a5a" strokeWidth="1.1" /><path d="M6.5 5 h4 M6.5 8 h4 M6.5 11 h4" stroke="#2a3a5a" strokeWidth="0.9" /></svg>} label="复制" onClick={() => document.execCommand('copy')} />
        <TBtn icon={<svg width="16" height="18" viewBox="0 0 17 19"><path d="M5 1.5 h9 v13 l-2.5 3 l-2.5 -3 l-2.5 3 l-1.5 -3 Z" fill="#f4e9b8" stroke="#8a734f" strokeWidth="0.9" /><path d="M2 1.5 h9 v13 l-2.5 3 l-2.5 -3 l-2.5 3 l-1.5 -3 Z" fill="#fff" stroke="#2a3a5a" strokeWidth="0.9" /></svg>} label="粘贴" onClick={() => showToast('请使用 Ctrl+V 粘贴')} />
        <div className="w-[3px] self-stretch border-l border-[#d8d5c8] mx-[2px]" />
        <TBtn icon={<svg width="18" height="18" viewBox="0 0 19 19"><path d="M9.5 2 a4 4 0 0 1 4 4 v7 a4 4 0 0 1 -8 0 V6 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#5a5a4a" strokeWidth="1.2" /><path d="M2 9 v3 a7.5 7.5 0 0 0 15 0 V9" fill="none" stroke="#8a867e" strokeWidth="1.2" /><path d="M17 9 h2 M0 9 h2" stroke="#8a867e" strokeWidth="1.2" /></svg>} label="检查姓名" onClick={() => showToast(to ? `「${to}」已在通讯簿中找到` : '请填写收件人')} />
        <TBtn
          icon={<svg width="17" height="18" viewBox="0 0 18 19"><path d="M9 1 L11 7 L17 7 L12 11 L14 17 L9 13 L4 17 L6 11 L1 7 L7 7 Z" fill="#f0d040" stroke="#a08010" strokeWidth="0.8" /></svg>}
          label="优先级" onClick={() => showToast('优先级：高（收件人将看到红色感叹号）')}
        />
        <TBtn
          icon={<svg width="18" height="18" viewBox="0 0 19 19"><path d="M5 1.5 h9 v13 l-2.5 3 l-2.5 -3 l-2.5 3 l-1.5 -3 Z" fill="#fff" stroke="#2a3a5a" strokeWidth="1" /><path d="M10.5 12 a2.5 2.5 0 1 0 -1.5 -4.5" fill="none" stroke="#8a867e" strokeWidth="1.1" /></svg>}
          label="附件" onClick={() => setAttach('luna_theme.jpg (216 KB)')}
        />
      </div>
      {/* 字段区 */}
      <div className="px-2 pt-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] w-[52px] text-right">收件人:</span>
          <input className="xp-sunken bg-white h-[20px] flex-1 px-1 text-[11px] outline-none min-w-0" value={to} onChange={(e) => setTo(e.target.value)} placeholder="friend@hotmail.com" aria-label="收件人" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] w-[52px] text-right">抄送:</span>
          <input className="xp-sunken bg-white h-[20px] flex-1 px-1 text-[11px] outline-none min-w-0" value={cc} readOnly aria-label="抄送" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-[52px] text-right">主题:</span>
          <input className="xp-sunken bg-white h-[20px] flex-1 px-1 text-[11px] outline-none min-w-0" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="主题" />
        </div>
      </div>
      {/* 格式栏 */}
      <div className="flex items-center gap-1 px-2 py-1 border-y border-[#d8d5c8] mt-2 shrink-0">
        <select className="xp-sunken bg-white h-[20px] text-[11px] px-1" defaultValue="宋体" aria-label="字体">
          <option>宋体</option><option>新宋体</option><option>楷体_GB2312</option><option>隶书</option>
        </select>
        <select className="xp-sunken bg-white h-[20px] text-[11px] px-1" defaultValue="五号" aria-label="字号">
          <option>七号</option><option>小五</option><option>五号</option><option>小四</option><option>四号</option>
        </select>
        <div className="w-[2px] self-stretch border-l border-[#d8d5c8] mx-1" />
        <button type="button" className={`w-[24px] h-[20px] text-[12px] rounded-[2px] border ${bold ? 'border-[#99b8e8] bg-[#cfe0f5]' : 'border-transparent hover:bg-[#e8f0fb]'}`} style={{ fontWeight: bold ? 700 : 400 }} onClick={() => setBold((v) => !v)} aria-label="粗体">B</button>
        <button type="button" className={`w-[24px] h-[20px] text-[12px] rounded-[2px] border ${italic ? 'border-[#99b8e8] bg-[#cfe0f5]' : 'border-transparent hover:bg-[#e8f0fb]'}`} style={{ fontStyle: italic ? 'italic' : 'normal', fontFamily: 'serif' }} onClick={() => setItalic((v) => !v)} aria-label="斜体">I</button>
        <button type="button" className={`w-[24px] h-[20px] text-[12px] rounded-[2px] border ${underline ? 'border-[#99b8e8] bg-[#cfe0f5]' : 'border-transparent hover:bg-[#e8f0fb]'}`} style={{ textDecoration: underline ? 'underline' : 'none' }} onClick={() => setUnderline((v) => !v)} aria-label="下划线">U</button>
      </div>
      {/* 正文 */}
      <textarea
        className="xp-sunken bg-white flex-1 mx-2 my-2 p-2 text-[11px] leading-[17px] outline-none resize-none min-h-0"
        style={{ fontWeight: bold ? 700 : 400, fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none' }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="在此输入正文……"
        aria-label="正文"
      />
      {attach ? (
        <div className="mx-2 mb-1 flex items-center gap-2 border border-[#d8d5c8] bg-[#f4f2e8] px-2 py-[3px] text-[10px] text-[#3a3a3a] shrink-0">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M5 1 h5 v8 a2.5 2.5 0 1 1 -5 0 V4 h3 v5" fill="none" stroke="#5a5a4a" strokeWidth="1.1" /></svg>
          附件: {attach}
          <button type="button" className="ml-auto text-[#c02818] hover:underline" onClick={() => setAttach(null)}>移除</button>
        </div>
      ) : null}
      <div className="flex justify-end gap-2 px-2 pb-2 shrink-0">
        <button type="button" className="xp-btn xp-btn-primary px-5 h-[23px] text-[11px]" onClick={send}>发送</button>
        <button type="button" className="xp-btn px-5 h-[23px] text-[11px]" onClick={close}>取消</button>
      </div>
    </div>
  )
}
