'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { imeEnter } from '../ime-keys'
import { useXP } from '../store'
import { XPButton, XPCheck, XPRadio } from '../ui'
import { flattenFS, type FSNode } from '../fs'
import { playClick } from '../sounds'

interface Hit {
  name: string
  path: string
  node: FSNode
}

/* ────────── 搜索伙伴 Rover（XP 搜索助理吉祥物）────────── */
/* 姿态：idle 坐姿摇尾巴 / sniff 嗅探地面 / run 搜索跑动 / found 找到庆祝 / sit 卧下 */
/* 真实 XP：搜索时 Rover 跑动嗅探、有结果时庆祝、单击切换随机动画 */
export type RoverPose = 'idle' | 'sniff' | 'run' | 'found' | 'sit'

function RoverSvg({ pose }: { pose: RoverPose }) {
  const body = pose === 'sit'
  return (
    <svg width="56" height="56" viewBox="0 0 64 58" className="block">
      {/* 尾巴（米黄+白尖，摇动） */}
      <g className="rover-tail" style={{ transformOrigin: '17px 36px' }}>
        <path d="M17 36 Q7 30 5 20" stroke="#d8a558" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="5" cy="19" r="3.4" fill="#f2e6cf" stroke="#c99b4e" strokeWidth="1" />
      </g>
      {/* 后腿蹲坐（卧姿时放平） */}
      {body ? (
        <ellipse cx="24" cy="47" rx="15" ry="6.5" fill="#d8a558" stroke="#b3833a" strokeWidth="1.2" />
      ) : (
        <ellipse cx="26" cy="42" rx="12" ry="10" fill="#d8a558" stroke="#b3833a" strokeWidth="1.2" />
      )}
      {/* 前腿（跑动时摆动） */}
      <g className={pose === 'run' ? 'rover-legs' : undefined}>
        <rect x="33" y="38" width="5" height="13" rx="2.4" fill="#e6b76a" stroke="#b3833a" strokeWidth="1" />
        <rect x="41" y="38" width="5" height="13" rx="2.4" fill="#e6b76a" stroke="#b3833a" strokeWidth="1" />
        <ellipse cx="35.5" cy="51.5" rx="3.6" ry="2" fill="#f2e6cf" stroke="#b3833a" strokeWidth="0.8" />
        <ellipse cx="43.5" cy="51.5" rx="3.6" ry="2" fill="#f2e6cf" stroke="#b3833a" strokeWidth="0.8" />
      </g>
      {/* 身体（胸口白毛） */}
      <ellipse cx="35" cy={body ? 43 : 38} rx="15" ry={body ? 9 : 12} fill="#e6b76a" stroke="#b3833a" strokeWidth="1.2" />
      <ellipse cx="38" cy={body ? 44 : 39} rx="7" ry={body ? 5.5 : 7} fill="#f2e6cf" opacity="0.9" />
      {/* 头部组（嗅探时下探、idle 偶尔歪头） */}
      <g className={`rover-head rover-head-${pose}`} style={{ transformOrigin: '38px 30px' }}>
        {/* 垂耳（棕色） */}
        <ellipse cx="29" cy="18" rx="4.4" ry="9" fill="#8a5a2a" stroke="#6b421c" strokeWidth="1" transform="rotate(-14 29 18)" className="rover-ear-l" />
        <ellipse cx="47" cy="18" rx="4.4" ry="9" fill="#8a5a2a" stroke="#6b421c" strokeWidth="1" transform="rotate(14 47 18)" className="rover-ear-r" />
        {/* 头 */}
        <circle cx="38" cy="19" r="10.5" fill="#e6b76a" stroke="#b3833a" strokeWidth="1.2" />
        {/* 口鼻（米白） */}
        <ellipse cx="38" cy="23.5" rx="6.5" ry="4.8" fill="#f2e6cf" stroke="#c99b4e" strokeWidth="0.8" />
        {/* 眼睛 + 高光 */}
        <circle cx="33.5" cy="17.5" r="1.7" fill="#2a1a0a" />
        <circle cx="42.5" cy="17.5" r="1.7" fill="#2a1a0a" />
        <circle cx="34.1" cy="16.9" r="0.6" fill="#fff" />
        <circle cx="43.1" cy="16.9" r="0.6" fill="#fff" />
        {/* 鼻子 + 嘴 */}
        <ellipse cx="38" cy="21.5" rx="2.6" ry="2" fill="#2a1a0a" />
        <path d={pose === 'found' ? 'M34.5 25.5 Q38 29 41.5 25.5' : 'M35 25.5 Q38 27.5 41 25.5'} stroke="#8a6a3a" strokeWidth="1" fill="none" strokeLinecap="round" />
        {pose === 'found' ? <ellipse cx="38" cy="28.5" rx="2.2" ry="3" fill="#e87a8a" stroke="#c95a6a" strokeWidth="0.7" /> : null}
        {/* 眉毛（庆祝时挑起） */}
        {pose === 'found' ? (
          <>
            <path d="M31.5 13.5 L35.5 12.2" stroke="#b3833a" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M44.5 13.5 L40.5 12.2" stroke="#b3833a" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : null}
      </g>
      {/* 嗅探嗅迹（搜索时鼻子下的气味线） */}
      {pose === 'sniff' ? (
        <g stroke="#7aa7d8" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.85">
          <path d="M28 55 q3 -2 6 0 t6 0" className="rover-sniff-line" />
        </g>
      ) : null}
      {/* 跑动速度线 */}
      {pose === 'run' ? (
        <g stroke="#f0c060" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M2 36 h9" />
          <path d="M4 42 h8" />
          <path d="M3 48 h7" />
        </g>
      ) : null}
    </svg>
  )
}

function Rover({ pose, onClick }: { pose: RoverPose; onClick?: () => void }) {
  return (
    <div
      className={`inline-flex cursor-pointer ${pose === 'run' ? 'rover-run' : pose === 'found' ? 'rover-found' : pose === 'sniff' ? 'rover-sniff' : 'rover-idle'}`}
      onClick={onClick}
      role="button"
      tabIndex={-1}
      aria-label="搜索伙伴"
    >
      <RoverSvg pose={pose} />
    </div>
  )
}

export default function SearchApp({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [query, setQuery] = useState('')
  const [wordInFile, setWordInFile] = useState('')
  const [where, setWhere] = useState<'all' | 'docs' | 'pics' | 'music'>('all')
  /* XP 搜索首选项：什么时候修改的 / 大小是（真实过滤条件） */
  const [whenMod, setWhenMod] = useState<'any' | 'day' | 'week' | 'month' | 'year'>('any')
  const [sizeCond, setSizeCond] = useState<'any' | 'small' | 'mid' | 'large'>('any')
  /* 高级选项（真实生效：系统/隐藏文件过滤） */
  const [optSys, setOptSys] = useState(true)
  const [optHidden, setOptHidden] = useState(false)
  const [moreOpts, setMoreOpts] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const [typingAnim, setTypingAnim] = useState(false)
  const [selHit, setSelHit] = useState<string | null>(null)
  /* Rover 姿态：idle 摇尾巴 / sniff 嗅探 / run 跑动 / found 庆祝 / sit 卧下 */
  const [pose, setPose] = useState<RoverPose>('idle')

  /* 点击 Rover 彩蛋：随机切换姿态（真实 XP 单击搜索助理切换动画） */
  const roverClick = () => {
    playClick()
    const pool: RoverPose[] = ['idle', 'sit', 'sniff', 'found']
    const next = pool[Math.floor(Math.random() * pool.length)]
    setPose(next)
    if (next === 'found') {
      showToast('汪！Rover 对你的点击表示满意')
      setTimeout(() => setPose('idle'), 1600)
    }
  }

  const doSearch = (ov?: { query?: string; word?: string }) => {
    const q = (ov?.query ?? query).trim().toLowerCase()
    const w = (ov?.word ?? wordInFile).trim().toLowerCase()
    if (!q && !w) {
      showToast('请输入全部或部分文件名（或文件中的一个字或词组）')
      return
    }
    setTypingAnim(true)
    setPose('run')
    setTimeout(() => setPose('sniff'), 450)
    setTimeout(() => {
      const now = Date.now()
      const whenMs = whenMod === 'day' ? 864e5 : whenMod === 'week' ? 7 * 864e5 : whenMod === 'month' ? 30 * 864e5 : whenMod === 'year' ? 365 * 864e5 : 0
      const all = flattenFS(useXP.getState().fsTree).filter((it) => {
        /* 高级选项：系统/隐藏文件过滤（默认不含系统文件——XP 真实默认） */
        if (it.node.system && !optSys) return false
        if (it.node.hidden && !optHidden) return false
        return true
      })
      const res = all.filter((it) => {
        /* 名称匹配 + 内容匹配（「文件中的一个字或词组」） */
        if (q && !it.node.name.toLowerCase().includes(q)) return false
        if (w) {
          const content = it.node.content ?? ''
          if (!content.toLowerCase().includes(w)) return false
        }
        /* 什么时候修改的 */
        if (whenMs) {
          const mod = it.node.modified ? new Date(it.node.modified).getTime() : 0
          if (!mod || now - mod > whenMs) return false
        }
        /* 大小是（解析「xx KB/MB/GB/B」） */
        if (sizeCond !== 'any') {
          const m = /([\d.,]+)\s*(KB|MB|GB|B)/.exec(it.node.size ?? '')
          if (!m) return false
          const kb = parseFloat(m[1].replace(/,/g, '')) * (m[2] === 'GB' ? 1e6 : m[2] === 'MB' ? 1e3 : m[2] === 'KB' ? 1 : 0.001)
          if (sizeCond === 'small' && kb >= 100) return false
          if (sizeCond === 'mid' && (kb < 100 || kb > 1024)) return false
          if (sizeCond === 'large' && kb <= 1024) return false
        }
        return true
      })
      const filtered =
        where === 'docs'
          ? res.filter((r) => r.node.icon === 'text' || r.node.icon === 'doc')
          : where === 'pics'
            ? res.filter((r) => r.node.icon === 'image' || r.node.icon === 'bmp' || r.path.includes('图片收藏'))
            : where === 'music'
              ? res.filter((r) => r.path.includes('My Music') || r.path.includes('音乐') || r.node.icon === 'audio')
              : res
      setHits(filtered)
      setSearched(true)
      setTypingAnim(false)
      setSelHit(null)
      /* 找到→庆祝 1.6s；没找到→歪头疑惑后回 idle */
      setPose(filtered.length > 0 ? 'found' : 'sit')
      playClick()
      setTimeout(() => setPose('idle'), 1600)
    }, 900)
  }

  const openHit = (h: Hit) => {
    const n = h.node
    if (n.appId) {
      openApp(n.appId, {})
    } else if (n.icon === 'text') {
      openApp('notepad', { fileName: n.name, content: n.content ?? '', parentPath: h.path.split('/').slice(0, -1) })
    } else if (n.kind === 'folder' || n.kind === 'drive') {
      openApp('explorer', { path: h.path }, h.name)
    } else {
      openApp('dialog', { kind: 'error', title: n.name, text: `Windows 无法打开此文件：\n\n"${n.name}"` })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
        <button type="button" className="flex items-center gap-1 px-2 py-[3px] rounded-[3px] hover:bg-[#fdf3e0] border border-transparent" onClick={() => doSearch()}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="#2a5fbc" strokeWidth="1.8" />
            <rect x="9.5" y="10" width="4" height="3.4" rx="1.2" transform="rotate(-45 11.5 11.7)" fill="#2a5fbc" />
          </svg>
          <span>立即搜索(S)</span>
        </button>
        <button type="button" className="flex items-center gap-1 px-2 py-[3px] rounded-[3px] hover:bg-[#fdf3e0] border border-transparent" onClick={() => { setQuery(''); setSearched(false); setHits([]) }}>
          <span className="text-[13px] leading-none">✕</span>
          <span>停止搜索</span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* 左：搜索窗格 */}
        <div className="w-[200px] shrink-0 xp-sidebar overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="flex items-center justify-center py-1">
              <Rover pose={pose} onClick={roverClick} />
            </div>
            <div className="text-center text-[11px] font-bold text-[#1a3f8f] mb-1">要搜索什么?</div>
            <div className="flex items-center gap-1 px-1 py-[4px] rounded-[3px] bg-white/70 border border-[#8ab0e8]">
              <input
                className="flex-1 bg-transparent outline-none text-[11px] px-1"
                placeholder="文件名或字词"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => imeEnter(e, (v) => doSearch({ query: v }))}
              />
            </div>
            <div className="mt-1 text-[11px] text-[#1a3f8f] font-bold">文件中的一个字或词组(W):</div>
            <div className="mt-1 flex items-center gap-1 px-1 py-[4px] rounded-[3px] bg-white/70 border border-[#8ab0e8]">
              <input
                className="flex-1 bg-transparent outline-none text-[11px] px-1"
                placeholder="在文件内容中搜索"
                value={wordInFile}
                onChange={(e) => setWordInFile(e.target.value)}
                onKeyDown={(e) => imeEnter(e, (v) => doSearch({ word: v }))}
              />
            </div>
            <div className="mt-2 text-[11px] text-[#1a3f8f] font-bold">搜索位置(L):</div>
            <div className="mt-1 space-y-[1px]">
              <XPRadio checked={where === 'all'} label="所有驱动器" onChange={() => setWhere('all')} />
              <XPRadio checked={where === 'docs'} label="文档" onChange={() => setWhere('docs')} />
              <XPRadio checked={where === 'pics'} label="图片" onChange={() => setWhere('pics')} />
              <XPRadio checked={where === 'music'} label="音乐" onChange={() => setWhere('music')} />
            </div>
            {/* XP 搜索首选项折叠面板：什么时候修改的 / 大小是 */}
            <div className="mt-2">
              <button type="button" className="flex items-center gap-1 text-[11px] text-[#1a3f8f] font-bold hover:underline" onClick={() => setMoreOpts((v) => !v)}>
                <span className="text-[9px]">{moreOpts ? '▼' : '▶'}</span>什么时候修改的?(D)
              </button>
              {moreOpts ? (
                <div className="mt-1 ml-2 space-y-[1px]">
                  <XPRadio checked={whenMod === 'any'} label="不记得" onChange={() => setWhenMod('any')} />
                  <XPRadio checked={whenMod === 'day'} label="昨天" onChange={() => setWhenMod('day')} />
                  <XPRadio checked={whenMod === 'week'} label="上个星期" onChange={() => setWhenMod('week')} />
                  <XPRadio checked={whenMod === 'month'} label="上个月" onChange={() => setWhenMod('month')} />
                  <XPRadio checked={whenMod === 'year'} label="过去一年" onChange={() => setWhenMod('year')} />
                </div>
              ) : null}
            </div>
            <div className="mt-2">
              <button type="button" className="flex items-center gap-1 text-[11px] text-[#1a3f8f] font-bold hover:underline" onClick={() => setMoreOpts((v) => !v)}>
                <span className="text-[9px]">{moreOpts ? '▼' : '▶'}</span>大小是?(Z)
              </button>
              {moreOpts ? (
                <div className="mt-1 ml-2 space-y-[1px]">
                  <XPRadio checked={sizeCond === 'any'} label="不记得" onChange={() => setSizeCond('any')} />
                  <XPRadio checked={sizeCond === 'small'} label="小（小于 100 KB）" onChange={() => setSizeCond('small')} />
                  <XPRadio checked={sizeCond === 'mid'} label="中（小于 1 MB）" onChange={() => setSizeCond('mid')} />
                  <XPRadio checked={sizeCond === 'large'} label="大（大于 1 MB）" onChange={() => setSizeCond('large')} />
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex justify-center">
              <button type="button" className="xp-btn xp-btn-primary px-4 h-[22px] text-[11px]" onClick={() => doSearch()}>
                搜索(S)
              </button>
            </div>
            {typingAnim ? <div className="text-center text-[10px] text-[#1a3f8f] mt-1 animate-pulse">Rover 正在嗅探 C 盘……</div> : null}
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mt-2">
            <div className="text-[11px] font-bold text-[#1a3f8f] mb-1">更多高级选项</div>
            <XPCheck checked={optSys} label="搜索系统文件夹(F)" onChange={() => setOptSys(!optSys)} />
            <XPCheck checked={optHidden} label="搜索隐藏的文件和文件夹(H)" onChange={() => setOptHidden(!optHidden)} />
          </div>
        </div>

        {/* 右：结果 */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-[#98b8e0]">
          <div className="text-[11px] px-2 py-[3px] bg-[#f2f7fd] border-b border-[#d8d5c8] text-[#1a3f8f]">
            {searched ? (typingAnim ? '正在搜索…' : hits.length ? `找到 ${hits.length} 个结果` : '没有找到结果。换个词试试？比如「Bliss」或「欢迎」') : '在左侧输入搜索条件，然后单击「搜索」'}
          </div>
          <div className="flex-1 overflow-y-auto xp-thin-scroll bg-white">
            <div className="flex bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8] sticky top-0">
              <div className="px-2 w-[180px] font-bold border-r border-[#d8d5c8]">名称</div>
              <div className="px-2 flex-1 font-bold border-r border-[#d8d5c8]">文件夹中的位置</div>
              <div className="px-2 w-[70px] font-bold border-r border-[#d8d5c8]">大小</div>
              <div className="px-2 w-[110px] font-bold">类型</div>
            </div>
            {hits.map((h) => (
              <button
                key={h.path}
                type="button"
                className={`w-full flex items-center text-left border-b border-[#f0ede4] ${selHit === h.path ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                onDoubleClick={() => openHit(h)}
                onClick={() => setSelHit(h.path)}
                title="双击打开"
              >
                <div className="px-2 w-[180px] truncate flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 14 14">
                    <rect x="1" y="3" width="12" height="9" rx="1" fill={h.node.icon === 'text' ? '#f0f0e8' : h.node.icon === 'image' ? '#c8e8f8' : '#f0e6c8'} stroke="#8a8a7a" />
                    {h.node.kind === 'folder' ? <path d="M1 5 h5 l1 -2 h5" fill="none" stroke="#a08020" /> : null}
                  </svg>
                  {h.name}
                </div>
                <div className={`px-2 flex-1 truncate ${selHit === h.path ? 'text-white/90' : 'text-[#5a5a4a]'}`}>{h.path.split('/').slice(0, -1).join(' / ') || '我的电脑'}</div>
                <div className={`px-2 w-[70px] ${selHit === h.path ? 'text-white/90' : 'text-[#5a5a4a]'}`}>{h.node.size ?? ''}</div>
                <div className={`px-2 w-[110px] truncate ${selHit === h.path ? 'text-white/90' : 'text-[#5a5a4a]'}`}>{h.node.type ?? (h.node.kind === 'folder' ? '文件夹' : h.node.kind === 'drive' ? '本地磁盘' : '文件')}</div>
              </button>
            ))}
          </div>
          <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a] justify-between">
            <span>{searched && !typingAnim ? `${hits.length} 个对象` : '就绪'}</span>
            <button type="button" className="hover:underline" onClick={() => closeWindow(win.id)}>
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
