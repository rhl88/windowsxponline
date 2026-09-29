'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { auxFetch } from '@/lib/api/aux-api'
import type { WinState, CtxItem } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { IEIcon, XPFlag } from '../icons'
import { playClick, playDing } from '../sounds'
import { openEditCtx } from '../ctx-menus'
import { imeEnter } from '../ime-keys'

/* ─────────── 类型 ─────────── */
type PageKind = 'home' | 'search' | 'help' | 'about' | 'error' | 'web'

interface HistEntry {
  kind: PageKind
  url?: string
  query?: string
  title: string
}

interface SearchResult {
  rank: number
  url: string
  title: string
  snippet: string
  host: string
  date: string
}

/* MSN 门户频道 → 真实网站 */
const CHANNELS: Array<[string, string]> = [
  ['新闻', 'https://news.sina.com.cn/'],
  ['财经', 'https://finance.sina.com.cn/'],
  ['体育', 'https://sports.sina.com.cn/'],
  ['科技', 'https://tech.sina.com.cn/'],
  ['娱乐', 'https://ent.sina.com.cn/'],
  ['汽车', 'https://auto.sina.com.cn/'],
  ['游戏', 'https://games.sina.com.cn/'],
]

/* ─────────── 小工具图标 ─────────── */
function NavBackIcon({ disabled }: { disabled?: boolean }) {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16">
      <path d="M11 2.5 L4.5 8 L11 13.5" stroke={disabled ? '#9a9a9a' : '#2a7a20'} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2.5 L2 8 L8 13.5" stroke={disabled ? '#c0c0c0' : '#7ab860'} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function NavFwdIcon({ disabled }: { disabled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <path d="M4 2 L10.5 7.5 L4 13" stroke={disabled ? '#9a9a9a' : '#2a7a20'} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function StopIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <circle cx="7.5" cy="7.5" r="6.5" fill="#d84a30" stroke="#8a2010" strokeWidth="0.8" />
      <path d="M4.5 4.5 L10.5 10.5 M10.5 4.5 L4.5 10.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <path d="M12.5 7.5 a5 5 0 1 1 -2 -4" fill="none" stroke="#2a8f2a" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.8 1.6 L13.3 5.4 L9.5 4.6" fill="#2a8f2a" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M8 2 L15 8 h-2 v6 h-4 v-4 h-2 v4 H3 V8 H1 Z" fill="#e8a020" stroke="#a05a08" strokeWidth="0.8" />
    </svg>
  )
}
function SearchGlyphIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <circle cx="6" cy="6" r="4" fill="#e8f0fb" stroke="#2a5fbc" strokeWidth="1.6" />
      <path d="M5 4.5 q1 -1.2 2.4 -0.6" stroke="#2a5fbc" strokeWidth="1" fill="none" />
      <rect x="9" y="9.2" width="4.4" height="3.2" rx="1.2" transform="rotate(-45 11.2 10.8)" fill="#f0b040" stroke="#a06010" strokeWidth="0.7" />
    </svg>
  )
}
function FaviconGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <path d="M8 1.5 L9.4 6 L14 7.4 L9.4 8.9 L8 13.5 L6.6 8.9 L2 7.4 L6.6 6 Z" fill="#f5c542" stroke="#a08010" strokeWidth="0.7" />
    </svg>
  )
}
function HistoryGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.3" fill="#3a8a2a" stroke="#1a5a10" strokeWidth="0.8" />
      <path d="M8 4.5 V8 L10.6 9.6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}
function PrintGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16">
      <rect x="4" y="2" width="8" height="3.5" fill="#d8e8f8" stroke="#5a86b0" strokeWidth="0.7" />
      <rect x="2" y="5" width="12" height="6" rx="1" fill="#8ab0d8" stroke="#3a5f8a" strokeWidth="0.8" />
      <rect x="4.5" y="8.5" width="7" height="5.5" fill="#fff" stroke="#5a86b0" strokeWidth="0.7" />
    </svg>
  )
}

/* ─────────── 主组件 ─────────── */
export default function InternetExplorer({ win }: { win: WinState }) {
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const ieHome = useXP((s) => s.ieHome)
  const ieHistory = useXP((s) => s.ieHistory)
  const ieFavorites = useXP((s) => s.ieFavorites)
  const addIEHistory = useXP((s) => s.addIEHistory)
  const clearIEHistory = useXP((s) => s.clearIEHistory)
  const addIEFavorite = useXP((s) => s.addIEFavorite)
  const removeIEFavorite = useXP((s) => s.removeIEFavorite)

  /* 初始入口：兼容旧 props.page，支持直接打开 URL */
  const urlProp = (win.props.url as string) ?? ''
  const initialKind: PageKind = urlProp ? 'web' : win.props.page === 'help' ? 'help' : 'home'
  const [hist, setHist] = useState<HistEntry[]>([
    urlProp
      ? { kind: 'web', url: urlProp, title: urlProp.replace(/^https?:\/\//i, '').split('/')[0] }
      : { kind: initialKind, title: initialKind === 'help' ? '帮助和支持中心' : 'MSN 中国' },
  ])
  const [hIdx, setHIdx] = useState(0)
  const cur = hist[hIdx]

  const [addr, setAddr] = useState('')
  const [addrDropdown, setAddrDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('完成')
  const [sidebar, setSidebar] = useState<'none' | 'fav' | 'hist'>('none')
  const [iframeKey, setIframeKey] = useState(0)
  const [netError, setNetError] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [pageTitle, setPageTitle] = useState(cur.title)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  /* 当前地址显示 */
  useEffect(() => {
    if (cur.kind === 'web') setAddr(cur.url ?? '')
    else if (cur.kind === 'home') setAddr(ieHome)
    else if (cur.kind === 'search') setAddr(`http://search.msn.com/results.aspx?q=${encodeURIComponent(cur.query ?? '')}`)
    else if (cur.kind === 'help') setAddr('http://help.support.microsoft.com/xp')
    else if (cur.kind === 'about') setAddr('http://localhost/about')
    else setAddr('about:blank')
  }, [cur, ieHome])

  /* 窗口标题 */
  useEffect(() => {
    setWindowTitle(win.id, `${pageTitle} - Microsoft Internet Explorer`)
  }, [pageTitle, setWindowTitle, win.id])

  /* ── 历史导航 ── */
  const pushEntry = useCallback(
    (e: HistEntry) => {
      setHist((h) => [...h.slice(0, hIdx + 1), e])
      setHIdx((i) => i + 1)
      setPageTitle(e.title)
      if (e.kind === 'web' && e.url) addIEHistory(e.url, e.title)
    },
    [hIdx, addIEHistory],
  )

  const goWeb = useCallback(
    (rawUrl: string) => {
      let url = rawUrl.trim()
      if (!url) return
      if (!/^https?:\/\//i.test(url)) url = `http://${url}`
      playClick()
      pushEntry({ kind: 'web', url, title: url.replace(/^https?:\/\//i, '').split('/')[0] })
      setNetError(false)
      setLoading(true)
      setStatus(`正在打开网页 ${url}...`)
    },
    [pushEntry],
  )

  const goHome = useCallback(() => {
    playClick()
    if (/msn\.com/i.test(ieHome) || ieHome === 'http://cn.msn.com/') {
      pushEntry({ kind: 'home', title: 'MSN 中国' })
      setQuery('')
      setSearchResults(null)
    } else goWeb(ieHome)
  }, [ieHome, pushEntry, goWeb])

  const goSearch = useCallback(
    (q: string) => {
      const qq = q.trim()
      if (!qq) return
      playClick()
      pushEntry({ kind: 'search', query: qq, title: `${qq} - MSN Search` })
      setQuery(qq)
    },
    [pushEntry],
  )

  /* 地址栏提交：URL 或关键词 */
  const submitAddr = useCallback(
    (raw: string) => {
      const v = raw.trim()
      if (!v) return
      setAddrDropdown(false)
      if (/^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+(\/|$|:)/i.test(v)) {
        goWeb(v)
        return
      }
      goSearch(v)
    },
    [goWeb, goSearch],
  )

  const back = () => {
    if (hIdx > 0) {
      playClick()
      setHIdx(hIdx - 1)
      setPageTitle(hist[hIdx - 1].title)
      if (hist[hIdx - 1].kind === 'web') setLoading(true)
    }
  }
  const forward = () => {
    if (hIdx < hist.length - 1) {
      playClick()
      setHIdx(hIdx + 1)
      setPageTitle(hist[hIdx + 1].title)
      if (hist[hIdx + 1].kind === 'web') setLoading(true)
    }
  }
  /* XP 真实行为：后退/前进旁下拉箭头列出本窗口访问历史（最近在最上方） */
  const gotoIdx = (i: number) => {
    playClick()
    setHIdx(i)
    setPageTitle(hist[i].title)
    if (hist[i].kind === 'web') setLoading(true)
  }
  const backMenu: CtxItem[] = hist.slice(0, hIdx).reverse().map((en, i) => ({
    label: en.title,
    bold: i === 0,
    onClick: () => gotoIdx(hIdx - 1 - i),
  }))
  const fwdMenu: CtxItem[] = hist.slice(hIdx + 1).map((en, i) => ({
    label: en.title,
    bold: i === 0,
    onClick: () => gotoIdx(hIdx + 1 + i),
  }))
  const refresh = () => {
    playClick()
    if (cur.kind === 'web') {
      setNetError(false)
      setLoading(true)
      setStatus(`正在打开网页 ${cur.url}...`)
    }
    if (cur.kind === 'search' && cur.query) {
      setSearching(true)
      void fetchSearch(cur.query)
    }
    setIframeKey((k) => k + 1)
  }
  const stop = () => {
    playClick()
    setLoading(false)
    setStatus('完成')
  }

  /* ── 真实搜索 ── */
  async function fetchSearch(q: string) {
    setSearching(true)
    setSearchResults(null)
    setStatus(`正在搜索 ${q}...`)
    try {
      const r = await auxFetch(`/api/search?q=${encodeURIComponent(q)}&num=12`)
      const j = (await r.json()) as { results?: SearchResult[]; error?: string }
      setSearchResults(j.results ?? [])
      if (j.error) setStatus(`搜索出错：${j.error}`)
      else setStatus(`完成 - 找到约 ${(j.results ?? []).length} 条结果`)
    } catch {
      setStatus('搜索失败：无法连接 MSN Search')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (cur.kind === 'search' && cur.query) void fetchSearch(cur.query)
    else if (cur.kind !== 'search') setSearchResults(null)

  }, [cur])

  /* ── iframe 加载完成（直接加载真实网页：跨域页面由宿主浏览器原生渲染） ── */
  const onIframeLoad = () => {
    setLoading(false)
    setNetError(false)
    setStatus('完成')
  }

  /* 加载超时 → IE6「无法显示网页」覆盖层（保持 XP 错误页视觉） */
  useEffect(() => {
    if (cur.kind !== 'web' || !loading) return
    const t = setTimeout(() => {
      setLoading(false)
      setNetError(true)
      setStatus('完毕（但出错了）')
    }, 15000)
    return () => clearTimeout(t)
  }, [cur.kind, loading, iframeKey])

  /* ── IE 导航快捷键（仅在本窗口聚焦时生效，与 IE6 键位一致） ── */
  const addrInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const isFocusedWin = () => {
      const st = useXP.getState()
      const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
      return top?.id === win.id
    }
    const h = (e: KeyboardEvent) => {
      if (!isFocusedWin()) return
      const k = e.key
      const inText = (() => { const el = document.activeElement; const t = el?.tagName; return t === 'INPUT' || t === 'TEXTAREA' })()

      /* Esc = 停止加载 */
      if (k === 'Escape' && loading) {
        e.preventDefault()
        stop()
        return
      }
      /* Alt+← / Alt+→ = 后退 / 前进 */
      if (e.altKey && !e.ctrlKey && k === 'ArrowLeft') {
        e.preventDefault()
        back()
        return
      }
      if (e.altKey && !e.ctrlKey && k === 'ArrowRight') {
        e.preventDefault()
        forward()
        return
      }
      /* Alt+Home = 主页 */
      if (e.altKey && !e.ctrlKey && k === 'Home') {
        e.preventDefault()
        goHome()
        return
      }
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const kl = k.toLowerCase()
        /* Ctrl+D = 添加到收藏夹 */
        if (kl === 'd') {
          e.preventDefault()
          const u = cur.url
          if (u) { addIEFavorite(u, pageTitle); playDing(); useXP.getState().showToast(`已将「${pageTitle}」加入收藏夹`) }
          else useXP.getState().showToast('本地页面不用收藏啦')
          return
        }
        /* Ctrl+H = 历史侧栏 */
        if (kl === 'h') {
          e.preventDefault()
          setSidebar('hist')
          return
        }
        /* Ctrl+I = 收藏夹侧栏 */
        if (kl === 'i') {
          e.preventDefault()
          setSidebar('fav')
          return
        }
        /* Ctrl+E = 搜索侧栏 */
        if (kl === 'e') {
          e.preventDefault()
          setSidebar('hist')
          return
        }
        /* Ctrl+N = 新窗口 */
        if (kl === 'n') {
          e.preventDefault()
          openApp('ie', {})
          return
        }
        /* Ctrl+O / Ctrl+L = 打开 */
        if (kl === 'o' || kl === 'l') {
          e.preventDefault()
          addrInputRef.current?.focus()
          addrInputRef.current?.select()
          return
        }
        /* Ctrl+P = 打印 */
        if (kl === 'p') {
          e.preventDefault()
          useXP.getState().openApp('print', { appName: win.title, pages: 1 })
          return
        }
      }
      /* Alt+D = 聚焦地址栏 */
      if (e.altKey && !e.ctrlKey && k.toLowerCase() === 'd') {
        e.preventDefault()
        addrInputRef.current?.focus()
        addrInputRef.current?.select()
        return
      }
      /* F11 = 全屏（复用窗口最大化） */
      if (k === 'F11') {
        e.preventDefault()
        useXP.getState().toggleMaximize(win.id)
        return
      }
      /* F5 全局已处理（xp-app-refresh），此处无需重复 */
      void inText
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [win.id, loading, cur.url, pageTitle, openApp, addIEFavorite, goHome, hIdx, hist.length])

  /* 全局 F5 转发到本窗口时刷新 */
  useEffect(() => {
    const h = (ev: Event) => {
      const d = (ev as CustomEvent).detail
      if (d?.id === win.id) refresh()
    }
    window.addEventListener('xp-app-refresh', h)
    return () => window.removeEventListener('xp-app-refresh', h)
  }, [win.id, cur])

  /* 查看源文件 */
  const viewSource = async () => {
    if (cur.kind !== 'web' || !cur.url) {
      useXP.getState().showToast('只有真实网页才能查看源文件')
      return
    }
    try {
      const r = await auxFetch(`/api/browse?raw=1&url=${encodeURIComponent(cur.url)}`)
      const text = await r.text()
      openApp('notepad', { fileName: `源文件 ${new URL(cur.url).hostname}.html`, content: text.slice(0, 60000) })
    } catch {
      useXP.getState().showToast('无法获取源文件')
    }
  }
  /* ── 地址栏下拉建议 ── */
  const suggestions = addr.trim()
    ? ieHistory.filter((h) => h.url.toLowerCase().includes(addr.toLowerCase()) || h.title.toLowerCase().includes(addr.toLowerCase())).slice(0, 8)
    : ieHistory.slice(0, 8)

  /* ─────────── 渲染 ─────────── */
  return (
    <div className="flex flex-col h-full bg-white select-none">
      <MenuBar
        menus={[
          {
            label: '文件(F)',
            items: [
              { label: '新建窗口(N)', onClick: () => openApp('ie', {}) },
              { label: '打开(O)...', onClick: () => iframeRef.current?.focus() },
              { separator: true },
              { label: '另存为(A)...', onClick: () => useXP.getState().showToast('另存为：当前页面已保存在你心里（不支持落盘）') },
              { label: '页面设置(U)...', disabled: true },
              { label: '打印(P)...', accelerator: 'Ctrl+P', onClick: () => useXP.getState().openApp('print', { appName: win.title, pages: 1 }) },
              { separator: true },
              { label: '关闭', onClick: () => closeWindow(win.id) },
            ],
          },
          {
            label: '编辑(E)',
            items: [
              { label: '全选(A)', disabled: true },
              { label: '查找(在本页上)(F)...', onClick: () => useXP.getState().showToast('页面内查找：请使用 Ctrl+F（浏览器原生功能）') },
            ],
          },
          {
            label: '查看(V)',
            items: [
              { label: '工具栏(T)', submenu: [{ label: '标准按钮', checked: true }, { label: '地址栏', checked: true }, { label: '链接', disabled: true }] },
              { label: '状态栏(B)', checked: true },
              { separator: true },
              { label: '刷新(R)', accelerator: 'F5', onClick: refresh },
              { label: '源文件(C)', onClick: viewSource },
              { separator: true },
              { label: '转到(G)', submenu: [{ label: '主页(H)', onClick: goHome }, { label: '搜索 Web(S)', onClick: () => goSearch('Windows XP') }] },
            ],
          },
          {
            label: '收藏(A)',
            items: [
              { label: '添加到收藏夹(D)...', onClick: () => { if (cur.kind === 'web' && cur.url) { addIEFavorite(cur.url, pageTitle); playDing(); useXP.getState().showToast(`已将「${pageTitle}」加入收藏夹`) } else useXP.getState().showToast('本地页面不用收藏啦') } },
              { label: '整理收藏夹(I)...', onClick: () => { setSidebar('fav'); useXP.getState().showToast('在左侧收藏夹栏中可以删除链接') } },
              { separator: true },
              ...ieFavorites.map((f) => ({ label: f.title, icon: <FaviconGlyph />, onClick: () => goWeb(f.url) })),
            ],
          },
          {
            label: '工具(T)',
            items: [
              { label: '邮件和新闻(M)', onClick: () => openApp('outlook', {}) },
              { label: '弹出窗口阻止程序(P)', checked: true, onClick: () => useXP.getState().showToast('弹出窗口阻止程序：已启用（XP SP2 的骄傲）') },
              { separator: true },
              { label: 'Internet 选项(O)...', onClick: () => openApp('inetopts', {}) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              { label: '目录和索引(C)', onClick: () => pushEntry({ kind: 'help', title: '帮助和支持中心' }) },
              { separator: true },
              { label: '关于 Internet Explorer(A)', onClick: () => useXP.getState().openApp('about', { title: '关于 Internet Explorer', text: 'Internet Explorer（Web 复刻版）\n版本 6.0.2600 · 真实联网框架模式\n\n网页在浏览器框架中直接原生加载，\nMSN Search 搜索、收藏夹、历史、源文件均可用。\n\n致敬那个没有弹窗拦截、却也有无限热情的浏览器时代。' }) },
            ],
          },
        ]}
      />

      {/* 工具栏 */}
      <div className="flex items-center gap-[2px] px-2 py-[3px] bg-gradient-to-b from-[#f4f2e8] to-[#ece9d8] border-b border-[#d8d5c8]">
        {/* 后退（拆分按钮 + ▼ 下拉历史，XP 真实工具栏行为） */}
        <div className="flex items-center">
          <button type="button" className="xp-tb-btn" disabled={hIdx === 0} onClick={back}>
            <NavBackIcon disabled={hIdx === 0} />
            <span className="text-[11px]">后退</span>
          </button>
          {backMenu.length > 0 ? (
            <button
              type="button"
              aria-label="最近的页"
              className="w-[13px] h-[22px] ml-[-5px] rounded-r-[3px] border border-transparent flex items-center justify-center text-[#0a3c94] hover:border-[#a8c4e8] hover:bg-gradient-to-b hover:from-[#fdfdfa] hover:to-[#e8f0fb]"
              onClick={(e) => {
                e.stopPropagation()
                playClick()
                useXP.getState().openCtx(e.clientX - 2, e.clientY + 6, backMenu)
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="flex items-center">
          <button type="button" className="xp-tb-btn" disabled={hIdx >= hist.length - 1} onClick={forward}>
            <NavFwdIcon disabled={hIdx >= hist.length - 1} />
            <span className="text-[11px]">前进</span>
          </button>
          {fwdMenu.length > 0 ? (
            <button
              type="button"
              aria-label="最近的页"
              className="w-[13px] h-[22px] ml-[-5px] rounded-r-[3px] border border-transparent flex items-center justify-center text-[#0a3c94] hover:border-[#a8c4e8] hover:bg-gradient-to-b hover:from-[#fdfdfa] hover:to-[#e8f0fb]"
              onClick={(e) => {
                e.stopPropagation()
                playClick()
                useXP.getState().openCtx(e.clientX - 2, e.clientY + 6, fwdMenu)
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <path d="M1 2.5 L4 5.5 L7 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <button type="button" className="xp-tb-btn" disabled={!loading} onClick={stop}>
          <StopIcon />
          <span className="text-[11px]">停止</span>
        </button>
        <button type="button" className="xp-tb-btn" onClick={refresh}>
          <RefreshIcon />
          <span className="text-[11px]">刷新</span>
        </button>
        <button type="button" className="xp-tb-btn" onClick={goHome}>
          <HomeIcon />
          <span className="text-[11px]">主页</span>
        </button>
        <div className="w-[8px]" />
        <button type="button" className={`xp-tb-btn ${sidebar === 'none' || sidebar === 'fav' ? '' : 'xp-tb-btn-on'}`} onClick={() => setSidebar(sidebar === 'hist' ? 'none' : 'hist')}>
          <SearchGlyphIcon />
          <span className="text-[11px]">搜索</span>
        </button>
        <button type="button" className={`xp-tb-btn ${sidebar === 'fav' ? 'xp-tb-btn-on' : ''}`} onClick={() => setSidebar(sidebar === 'fav' ? 'none' : 'fav')}>
          <FaviconGlyph />
          <span className="text-[11px]">收藏夹</span>
        </button>
        <button type="button" className={`xp-tb-btn ${sidebar === 'hist' ? 'xp-tb-btn-on' : ''}`} onClick={() => setSidebar(sidebar === 'hist' ? 'none' : 'hist')}>
          <HistoryGlyph />
          <span className="text-[11px]">历史</span>
        </button>
        <div className="flex-1" />
        <button type="button" className="xp-tb-btn" onClick={() => useXP.getState().openApp('print', { appName: win.title, pages: 1 })}>
          <PrintGlyph />
          <span className="text-[11px]">打印</span>
        </button>
      </div>

      {/* 地址栏 */}
      <div className="relative flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f4f2e8] to-[#ece9d8] border-b border-[#d8d5c8]">
        <span className="text-[11px] text-[#6a6a5a]">地址(D)</span>
        <div className="xp-sunken relative flex-1 flex items-center gap-1 h-[20px] px-1 bg-white">
          <IEIcon size={14} />
          <input
            ref={addrInputRef}
            className="flex-1 text-[11px] outline-none min-w-0"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onFocus={() => setAddrDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && addr && !addr.includes('.')) {
                /* Ctrl+Enter = 自动补全 www.xxx.com（IE 经典） */
                e.preventDefault()
                submitAddr(`www.${addr}.com`)
              } else if (e.key === 'Escape') {
                setAddrDropdown(false)
              } else {
                /* IME 安全回车：干净回车/组态回车统一处理 */
                imeEnter(e, (v) => submitAddr(v))
              }
            }}
            onContextMenu={openEditCtx}
            spellCheck={false}
          />
          {/* 地址下拉 */}
          {addrDropdown && suggestions.length > 0 ? (
            <div className="absolute left-[-1px] right-[-1px] top-[22px] z-50 bg-white border border-[#a0a090] shadow-md xp-menu-shadow">
              {suggestions.map((s) => (
                <button
                  key={s.url}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-[3px] text-left text-[11px] hover:bg-[#cfe0f5]"
                  onClick={() => {
                    setAddrDropdown(false)
                    goWeb(s.url)
                  }}
                >
                  <IEIcon size={13} />
                  <span className="flex-1 truncate">{s.url}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="xp-tb-btn !px-[6px]" onClick={() => submitAddr(addr)}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" fill="#2a9f2a" />
            <path d="M4.5 3.5 L9 6 L4.5 8.5 Z" fill="#fff" />
          </svg>
          <span className="text-[11px]">转到</span>
        </button>
      </div>

      {/* 主体：侧栏 + 内容 */}
      <div className="flex-1 flex min-h-0">
        {sidebar !== 'none' ? (
          <div className="w-[196px] shrink-0 bg-[#f0f4fa] border-r border-[#a8b8cc] flex flex-col xp-thin-scroll overflow-y-auto">
            <div className="bg-gradient-to-b from-[#7ba7e7] to-[#5a8ad0] px-2 py-[4px] flex items-center gap-2">
              {sidebar === 'fav' ? <FaviconGlyph /> : <HistoryGlyph />}
              <span className="text-[11px] font-bold text-white">{sidebar === 'fav' ? '收藏夹' : '历史记录'}</span>
              <div className="flex-1" />
              <button type="button" className="text-white/90 hover:text-white text-[11px] w-[16px]" title="关闭" onClick={() => setSidebar('none')}>✕</button>
            </div>
            {sidebar === 'fav' ? (
              <div className="p-1">
                <button type="button" className="w-full flex items-center gap-2 px-1 py-[3px] text-[11px] text-[#1145c4] hover:bg-[#d8e4f5] rounded-[2px]" onClick={() => { if (cur.kind === 'web' && cur.url) { addIEFavorite(cur.url, pageTitle); playDing() } }}>
                  <span className="text-[#2a7a20] font-bold">✚</span> 添加到收藏夹...
                </button>
                <div className="h-[1px] bg-[#c8d0da] my-1" />
                {ieFavorites.map((f) => (
                  <div key={f.url} className="group flex items-center">
                    <button type="button" className="flex-1 flex items-center gap-2 px-1 py-[3px] text-[11px] hover:bg-[#d8e4f5] rounded-[2px] text-left" onClick={() => goWeb(f.url)}>
                      <FaviconGlyph />
                      <span className="truncate">{f.title}</span>
                    </button>
                    <button type="button" className="opacity-0 group-hover:opacity-100 text-[#b03030] text-[11px] px-1" title="删除" onClick={() => removeIEFavorite(f.url)}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-1">
                <button type="button" className="w-full flex items-center gap-2 px-1 py-[3px] text-[11px] text-[#1145c4] hover:bg-[#d8e4f5] rounded-[2px]" onClick={() => { clearIEHistory(); useXP.getState().showToast('已清除历史记录') }}>
                  <span className="text-[#b03030]">✖</span> 清除历史记录...
                </button>
                <div className="h-[1px] bg-[#c8d0da] my-1" />
                {ieHistory.length === 0 ? (
                  <div className="text-[11px] text-[#8a8a8a] px-2 py-2">尚无浏览记录</div>
                ) : (
                  ieHistory.map((h) => (
                    <button key={h.url + h.ts} type="button" className="w-full flex items-center gap-2 px-1 py-[3px] text-[11px] hover:bg-[#d8e4f5] rounded-[2px] text-left" onClick={() => goWeb(h.url)}>
                      <HistoryGlyph />
                      <span className="flex-1 truncate">{h.title || h.url}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* 内容区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 relative overflow-hidden">
            {cur.kind === 'web' ? (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                className="w-full h-full border-0 bg-white"
                src={cur.url ?? ''}
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={onIframeLoad}
                title="web"
              />
            ) : null}
            {cur.kind === 'web' && netError ? (
              <div className="absolute inset-0 z-10 bg-white overflow-auto">
                <ErrorPage onHome={goHome} onRetry={refresh} externalUrl={cur.url} />
              </div>
            ) : null}
            {cur.kind === 'home' ? <MsnPortal query={query} setQuery={setQuery} onSearch={goSearch} onNav={goWeb} /> : null}
            {cur.kind === 'search' ? <SearchPage key={`${cur.query ?? ''}-${hIdx}`} query={cur.query ?? ''} results={searchResults} searching={searching} onNav={goWeb} onSearch={goSearch} /> : null}
            {cur.kind === 'help' ? <HelpPage /> : null}
            {cur.kind === 'about' ? <AboutPage /> : null}
            {cur.kind === 'error' ? <ErrorPage onHome={goHome} /> : null}
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center h-[20px] bg-[#ece9d8] border-t border-[#d8d5c8] text-[11px] px-2 gap-2">
        <span className="flex-1 text-[#3a3a3a] truncate">{status}</span>
        {loading ? (
          <div className="w-[80px] h-[11px] xp-sunken bg-white overflow-hidden">
            <div className="h-full bg-[#3a8a3a] xp-ie-progress" style={{ width: '40%' }} />
          </div>
        ) : null}
        <span className="text-[#3a3a3a] flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5.6" fill="#4a8ad0" />
            <path d="M1.5 7 h11 M7 1.5 a9 9 0 0 1 0 11 M7 1.5 a9 9 0 0 0 0 11" stroke="#fff" strokeWidth="0.8" fill="none" />
          </svg>
          Internet
        </span>
      </div>
    </div>
  )
}

/* ─────────── MSN 门户（本地渲染 + 真实外链） ─────────── */
function MsnPortal({ query, setQuery, onSearch, onNav }: { query: string; setQuery: (q: string) => void; onSearch: (q: string) => void; onNav: (url: string) => void }) {
  return (
    <div className="h-full overflow-auto bg-white xp-thin-scroll">
      <div className="min-h-full">
        <div className="bg-gradient-to-r from-[#0a4fb0] to-[#3a7fe0] px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-bold text-[20px]" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>
            <span className="text-[26px] italic">msn</span>
            <span className="text-[14px] font-normal opacity-90">中国</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <input className="xp-sunken h-[20px] w-[150px] text-[11px] px-1" placeholder="搜索 Web" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => imeEnter(e, onSearch)} onContextMenu={openEditCtx} />
            <button type="button" className="xp-btn !h-[20px] !min-w-[46px] text-[11px]" onClick={() => onSearch(query)}>搜索</button>
          </div>
        </div>
        <div className="flex">
          <div className="w-[160px] bg-[#e8f0f8] p-3 space-y-2 border-r border-[#c8d8e8]">
            <div className="text-[11px] font-bold text-[#0a4fb0] border-b border-[#c8d8e8] pb-1">频道 · 真实网站</div>
            {CHANNELS.map(([c, url]) => (
              <button key={c} type="button" className="block text-[12px] text-[#1a5fb0] hover:underline text-left" onClick={() => onNav(url)}>
                {c}
              </button>
            ))}
            <div className="text-[11px] font-bold text-[#0a4fb0] border-b border-[#c8d8e8] pb-1 pt-3">实用工具</div>
            <button type="button" className="block text-[12px] text-[#1a5fb0] hover:underline text-left" onClick={() => onNav('https://www.hao123.com/')}>网址之家</button>
            <button type="button" className="block text-[12px] text-[#1a5fb0] hover:underline text-left" onClick={() => onNav('https://zh.wikipedia.org/')}>维基百科</button>
          </div>
          <div className="flex-1 p-4">
            <div className="text-[16px] font-bold text-[#333] mb-3" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>2001 年 10 月 25 日 · 今天</div>
            <div className="space-y-3">
              <div className="border border-[#d8e0e8] rounded p-3 hover:bg-[#f4f8fb] cursor-pointer" onClick={() => onNav('https://zh.wikipedia.org/wiki/Windows_XP')}>
                <div className="text-[14px] font-bold text-[#1a5fb0]">Windows XP 正式发布：史上最好用的操作系统来了</div>
                <div className="text-[12px] text-[#666] mt-1">全新 Luna 界面、更快启动、内置 CD 刻录与远程协助——微软称其为「最可靠的 Windows」。点击阅读真实的维基百科词条。</div>
              </div>
              <div className="border border-[#d8e0e8] rounded p-3 hover:bg-[#f4f8fb] cursor-pointer" onClick={() => onNav('https://zh.wikipedia.org/wiki/拨号上网')}>
                <div className="text-[14px] font-bold text-[#1a5fb0]">拨号上网峰值突破 56K：网友们沸腾了</div>
                <div className="text-[12px] text-[#666] mt-1">电话线、猫的啸叫、按分钟计费……点开看看拨号上网的完整历史。</div>
              </div>
              <div className="border border-[#d8e0e8] rounded p-3 hover:bg-[#f4f8fb] cursor-pointer" onClick={() => onNav('https://zh.wikipedia.org/wiki/Bliss_(Windows_XP)')}>
                <div className="text-[14px] font-bold text-[#1a5fb0]">你桌面上的那片草地，名字叫 Bliss</div>
                <div className="text-[12px] text-[#666] mt-1">来自加州 Sonoma 县的一张真实照片，成为互联网史上出镜率最高的山丘。</div>
              </div>
            </div>
            <div className="mt-5 text-[11px] text-[#888]">提示：在上方地址栏输入任何网址（如 zh.wikipedia.org）即可真实访问；输入关键词则用 MSN Search 搜索。</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── 搜索结果页（真实网络搜索） ─────────── */
function SearchPage({ query, results, searching, onNav, onSearch }: { query: string; results: SearchResult[] | null; searching: boolean; onNav: (url: string) => void; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(query)
  return (
    <div className="h-full overflow-auto bg-white xp-thin-scroll">
      <div className="px-6 pt-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[20px] font-bold text-[#0a4fb0] italic" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>
            msn<span className="text-[13px] not-italic font-normal"> Search</span>
          </div>
          <div className="xp-sunken flex items-center h-[22px] bg-white flex-1 max-w-[320px]">
            <input className="flex-1 text-[12px] px-2 outline-none" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => imeEnter(e, onSearch)} />
          </div>
          <button type="button" className="xp-btn text-[11px]" onClick={() => onSearch(q)}>搜索</button>
        </div>
        <div className="border-b border-[#c8d0d8] pb-2 flex gap-4 text-[12px]">
          <span className="font-bold border-b-2 border-[#0a4fb0] pb-[2px] text-[#0a4fb0]">网页</span>
          <span className="text-[#5a5a5a]">图片</span>
          <span className="text-[#5a5a5a]">资讯</span>
          <span className="text-[#5a5a5a]">音乐</span>
        </div>
        <div className="text-[12px] text-[#666] py-3">
          {searching ? `正在搜索 ${query}...` : results ? `关于 “${query}” 的搜索结果（${results.length} 项，来自真实网络）` : '准备搜索...'}
        </div>
        {searching ? (
          <div className="py-10 text-center text-[12px] text-[#888]">
            <div className="inline-block w-[120px] h-[11px] xp-sunken bg-white overflow-hidden align-middle mr-2">
              <div className="h-full bg-[#3a8a3a] xp-ie-progress" />
            </div>
            正在请求数据...
          </div>
        ) : null}
        {results && results.length === 0 && !searching ? (
          <div className="py-8 text-[12px] text-[#666]">
            <div className="font-bold mb-2 text-[#333]">没有找到与 “{query}” 匹配的结果。</div>
            建议：检查关键词拼写，或尝试更换关键词。
          </div>
        ) : null}
        <div className="pb-6">
          {(results ?? []).map((r) => (
            <div key={r.url + r.rank} className="mb-4">
              <button type="button" className="text-[15px] text-[#0000cc] hover:underline text-left" onClick={() => onNav(r.url)}>
                {r.title}
              </button>
              <div className="text-[12px] text-[#008000]">{r.url}</div>
              <div className="text-[12px] text-[#333] mt-[2px]">{r.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────── 本地帮助页 ─────────── */
function HelpPage() {
  return (
    <div className="h-full overflow-auto bg-white xp-thin-scroll p-6 max-w-[640px]">
      <div className="flex items-center gap-3 mb-4">
        <XPFlag size={36} />
        <div className="text-[20px] font-bold text-[#0a4fb0]" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>帮助和支持中心</div>
      </div>
      <div className="text-[13px] text-[#333] leading-[20px] mb-4">Windows XP Web 复刻版 · 使用指南</div>
      {[
        ['真实上网', '在 IE 地址栏输入网址（如 zh.wikipedia.org），网页会直接在浏览器框架中原生加载；MSN 频道与搜索结果也都是真实的。'],
        ['打开程序', '双击桌面图标，或单击「开始」按钮，从左栏选择程序。「所有程序」里有完整的级联菜单。'],
        ['窗口操作', '拖动标题栏移动窗口；拖动边缘缩放；双击标题栏最大化；按钮依次是最小化/最大化/关闭。'],
        ['文件管理', '资源管理器支持复制/剪切/粘贴、拖放、重命名、删除（进回收站）、还原。'],
        ['玩扫雷', '左键翻开、右键插旗、双击数字快开。首次点击永远安全。'],
        ['快捷键', 'Ctrl+Shift+Esc 打开任务管理器；双击托盘时钟改时间；Win+D 显示桌面。'],
        ['关机', '开始菜单右下角「关闭计算机」，三种模式齐全（待机后按任意键唤醒）。'],
      ].map(([t, d]) => (
        <div key={t} className="border-l-[3px] border-[#3a7fe0] pl-3 mb-3">
          <div className="text-[13px] font-bold text-[#1a5fb0]">{t}</div>
          <div className="text-[12px] text-[#444] leading-[18px]">{d}</div>
        </div>
      ))}
    </div>
  )
}

/* ─────────── 关于页 ─────────── */
function AboutPage() {
  return (
    <div className="h-full overflow-auto p-6 max-w-[560px]" style={{ background: 'linear-gradient(180deg,#f0f6ff 0%, #ffffff 30%)' }}>
      <div className="flex items-center gap-3 mb-3">
        <XPFlag size={40} />
        <div className="text-[22px] font-bold" style={{ fontFamily: "'Trebuchet MS', sans-serif", color: '#0a4fb0' }}>Windows XP WebOS</div>
      </div>
      <div className="text-[13px] leading-[20px] text-[#333] space-y-3">
        <p>这是对 2001 年 Windows XP 的 1:1 Web 复刻：Bliss 壁纸、Luna 蓝色主题、开始菜单、任务栏、气泡通知、扫雷、纸牌、画图、计算器、IE……全部由 React + TypeScript 构建。</p>
        <p>IE 以浏览器框架直接加载真实网页：可以浏览任何网站、用 MSN Search 搜真实网页。文件系统支持删除到回收站、还原、复制粘贴与拖放。</p>
        <p>所有图标为手绘 SVG，音效由 WebAudio 实时合成，文件系统是可变的虚拟树——但情怀是真的。</p>
        <p className="text-[12px] text-[#666]">「To XP, with love.」</p>
      </div>
    </div>
  )
}

/* ──404── 错误页 ─────────── */
function ErrorPage({ onHome, onRetry, externalUrl }: { onHome: () => void; onRetry?: () => void; externalUrl?: string }) {
  return (
    <div className="p-8 max-w-[520px]">
      <div className="text-[16px] font-bold text-[#333] mb-4">无法显示网页</div>
      <div className="text-[12px] text-[#444] leading-[19px] space-y-2">
        <p>您正在查找的页面当前不可用。网站可能遇到技术问题，或者您需要调整浏览器设置。</p>
        <p className="text-[#666]">可能的原因：网站拒绝在框架内显示（X-Frame-Options）、连接超时或该地址不存在。</p>
        <hr className="border-[#ccc]" />
        <p className="font-bold">请尝试以下操作:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>单击<b>刷新</b>按钮，或稍后重试。{onRetry ? <button type="button" className="text-[#0000cc] underline ml-1" onClick={onRetry}>立即刷新</button> : null}</li>
          <li>如果您已经在地址栏中键入该网页的地址，请确认其拼写正确。</li>
          <li>要检查您的网络连接，请单击<b>工具</b>菜单，然后单击<b>Internet 选项</b>。</li>
          {externalUrl ? (
            <li><a href={externalUrl} target="_blank" rel="noreferrer" className="text-[#0000cc] underline">在系统浏览器中打开此页</a>（部分大站拒绝被嵌入）</li>
          ) : null}
          <li>或者 <button type="button" className="text-[#0000cc] underline" onClick={onHome}>返回 MSN 主页</button>，那里总有新鲜事。</li>
        </ul>
      </div>
      <div className="mt-6 text-[11px] text-[#888]">找不到服务器或发生 DNS 错误 · Internet Explorer 6.0（Web 复刻版）</div>
    </div>
  )
}
