'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar } from '../ui'
import { playClick, playDing } from '../sounds'

type Suit = 0 | 1 | 2 | 3 /* 0♠ 1♥ 2♣ 3♦ */

interface Card {
  id: number
  suit: Suit
  rank: number
}

const SUIT_CHAR = ['\u2660', '\u2665', '\u2663', '\u2666']
const RANK_STR = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const CW = 62
const CH = 84
const GAP = 10
const COL_X = (i: number) => 10 + i * (CW + GAP)
const FREE_Y = 8
const TAB_Y = 104
const STACK = 16
const BOARD_W = 10 * 2 + 8 * (CW + GAP) - GAP
const BOARD_H = 420

function isRed(s: Suit) {
  return s === 1 || s === 3
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Game {
  cols: Card[][] /* 8 列 */
  free: (Card | null)[] /* 4 空当格 */
  home: Card[][] /* 4 基础堆 */
  moves: number
}

function dealGame(): Game {
  const deck: Card[] = []
  let id = 0
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: id++, suit: s as Suit, rank: r })
  const sh = shuffle(deck)
  const cols: Card[][] = []
  for (let i = 0; i < 8; i++) cols.push(sh.splice(0, i < 4 ? 7 : 6))
  return { cols, free: [null, null, null, null], home: [[], [], [], []], moves: 0 }
}

const clone = (g: Game): Game => ({
  cols: g.cols.map((c) => c.map((x) => ({ ...x }))),
  free: g.free.map((f) => (f ? { ...f } : null)),
  home: g.home.map((h) => h.map((x) => ({ ...x }))),
  moves: g.moves,
})

/* 尾部连续可移动序列长度（交替色降序） */
function tailRun(col: Card[]): number {
  if (col.length === 0) return 0
  let n = 1
  for (let i = col.length - 1; i > 0; i--) {
    const a = col[i - 1]
    const b = col[i]
    if (a.rank === b.rank + 1 && isRed(a.suit) !== isRed(b.suit)) n++
    else break
  }
  return n
}

/* 最大可移动张数：(1+空格) × 2^空列(不含目标列) */
function maxMovable(g: Game, toCol: number): number {
  const freeCells = g.free.filter((f) => f === null).length
  const emptyCols = g.cols.filter((c, i) => i !== toCol && c.length === 0).length
  return (1 + freeCells) * Math.pow(2, emptyCols)
}

function canDropOnCol(card: Card, col: Card[]): boolean {
  if (col.length === 0) return true
  const top = col[col.length - 1]
  return top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit)
}

function autoSafeHome(g: Game, changed: boolean): { g: Game; changed: boolean } {
  /* 反复把「安全」的牌送回基础堆（红黑两张同点已上家 或 rank<=2） */
  let cur = clone(g)
  let did = changed
  for (let round = 0; round < 30; round++) {
    let moved = false
    /* 列顶 */
    for (let i = 0; i < 8; i++) {
      const col = cur.cols[i]
      if (col.length === 0) continue
      const c = col[col.length - 1]
      const home = cur.home[c.suit]
      if (home.length === c.rank - 1) {
        const otherHomeLen = cur.home[(c.suit + 2) % 4].length
        const safeMin = Math.min(...cur.home.map((h, si) => (si % 2 === c.suit % 2 ? h.length : 13)))
        const oppMin = Math.min(...cur.home.filter((_, si) => si % 2 !== c.suit % 2).map((h) => h.length))
        void otherHomeLen
        void safeMin
        if (c.rank <= 2 || c.rank - 1 <= oppMin + 1) {
          home.push({ ...c })
          col.pop()
          moved = true
          did = true
        }
      }
    }
    /* 空当格 */
    for (let i = 0; i < 4; i++) {
      const f = cur.free[i]
      if (!f) continue
      const home = cur.home[f.suit]
      if (home.length === f.rank - 1) {
        const oppMin = Math.min(...cur.home.filter((_, si) => si % 2 !== f.suit % 2).map((h) => h.length))
        if (f.rank <= 2 || f.rank - 1 <= oppMin + 1) {
          home.push({ ...f })
          cur.free[i] = null
          moved = true
          did = true
        }
      }
    }
    if (!moved) break
  }
  return { g: cur, changed: did }
}

function countMovesLeft(g: Game): number {
  let n = 0
  /* 空当格数 */
  const freeCells = g.free.filter((f) => f === null).length
  n += freeCells
  /* 列间可移动 */
  for (let i = 0; i < 8; i++) {
    const col = g.cols[i]
    if (col.length === 0) continue
    const run = tailRun(col)
    const take = Math.min(run, maxMovable(g, -1))
    for (let j = 0; j < 8; j++) {
      if (i === j) continue
      const target = g.cols[j]
      if (take > 0 && canDropOnCol(col[col.length - take], target)) n++
    }
    /* 单张可回基础堆 */
    const c = col[col.length - 1]
    if (g.home[c.suit].length === c.rank - 1) n++
  }
  for (const f of g.free) {
    if (f && g.home[f.suit].length === f.rank - 1) n++
  }
  return n
}

function CardView({ card, style, onPointerDown, onDoubleClick }: { card: Card; style: React.CSSProperties; onPointerDown?: (e: React.PointerEvent) => void; onDoubleClick?: () => void }) {
  return (
    <div
      className="absolute rounded-[5px] overflow-hidden bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.35)] select-none touch-none cursor-default"
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <span className="absolute left-[3px] top-[1px] font-bold leading-[12px] text-[11px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111', fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
        {RANK_STR[card.rank]}
      </span>
      <span className="absolute right-[3px] top-[1px] font-bold leading-[12px] text-[11px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
        {SUIT_CHAR[card.suit]}
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-[28px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
        {SUIT_CHAR[card.suit]}
      </span>
      <span className="absolute left-[3px] bottom-[1px] font-bold text-[11px] rotate-180" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
        {SUIT_CHAR[card.suit]}
      </span>
    </div>
  )
}

type Drag = {
  cards: Card[]
  from: { zone: 'free' | 'col'; index: number }
  count: number
  x: number
  y: number
}

export default function FreeCell({ win }: { win: WinState }) {
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const openApp = useXP((s) => s.openApp)
  const [game, setGame] = useState<Game>(dealGame)
  const [gameNo, setGameNo] = useState(() => Math.floor(Math.random() * 32000) + 1)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [won, setWon] = useState(false)
  const historyRef = useRef<Game[]>([])
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWindowTitle(win.id, `游戏 #${gameNo} - 空当接龙`)
  }, [gameNo, setWindowTitle, win.id])

  useEffect(() => {
    if (won) return
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(iv)
  }, [won])

  const checkWin = (g: Game): boolean => g.home.every((h) => h.length === 13)

  const commit = (g: Game) => {
    const r = autoSafeHome(g, false)
    const finalG = { ...r.g, moves: g.moves + 1 }
    setGame(finalG)
    if (checkWin(finalG)) {
      setWon(true)
      playDing()
    }
  }

  const pushHistory = (g: Game) => {
    historyRef.current.push(clone(g))
    if (historyRef.current.length > 80) historyRef.current.shift()
  }

  const newGame = useCallback(() => {
    const g = dealGame()
    historyRef.current = []
    setGame(g)
    setWon(false)
    setSeconds(0)
    setGameNo(Math.floor(Math.random() * 32000) + 1)
    playClick()
  }, [])

  const restart = useCallback(() => {
    const first = historyRef.current[0]
    if (first) {
      setGame({ ...clone(first), moves: 0 })
      setWon(false)
    }
  }, [])

  const undo = useCallback(() => {
    const h = historyRef.current.pop()
    if (h) {
      setGame(h)
      setWon(false)
    }
  }, [])

  /* 拖起：空当格或列尾序列 */
  const startDrag = (e: React.PointerEvent, zone: 'free' | 'col', index: number) => {
    if (won) return
    let cards: Card[] = []
    if (zone === 'free') {
      const f = game.free[index]
      if (!f) return
      cards = [f]
    } else {
      const col = game.cols[index]
      if (col.length === 0) return
      const run = tailRun(col)
      const allowed = Math.min(run, maxMovable(game, -1))
      if (allowed < 1) return
      cards = col.slice(-allowed)
    }
    const br = boardRef.current!.getBoundingClientRect()
    setDrag({
      cards,
      from: { zone, index },
      count: cards.length,
      x: e.clientX - br.left,
      y: e.clientY - br.top,
    })
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  const onDragMove = (e: React.PointerEvent) => {
    if (!drag) return
    const br = boardRef.current!.getBoundingClientRect()
    setDrag({ ...drag, x: e.clientX - br.left, y: e.clientY - br.top })
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return
    const br = boardRef.current!.getBoundingClientRect()
    const px = e.clientX - br.left
    const py = e.clientY - br.top
    const d = drag
    setDrag(null)

    const tryDrop = (place: (g: Game) => string | null) => {
      const g = clone(game)
      const err = place(g)
      if (err === null) {
        pushHistory(game)
        commit(g)
      }
    }

    /* 空当格命中（仅单张） */
    if (d.count === 1) {
      for (let i = 0; i < 4; i++) {
        const fx = 10 + i * (CW + GAP)
        if (px >= fx && px <= fx + CW && py >= FREE_Y && py <= FREE_Y + CH) {
          if (game.free[i] === null) {
            tryDrop((g) => {
              if (d.from.zone === 'free') g.free[d.from.index] = null
              else g.cols[d.from.index].pop()
              g.free[i] = { ...d.cards[0] }
              return null
            })
            return
          }
        }
      }
    }
    /* 基础堆命中（仅单张） */
    if (d.count === 1) {
      for (let i = 0; i < 4; i++) {
        const fx = BOARD_W - 10 - 4 * (CW + GAP) + GAP + i * (CW + GAP)
        if (px >= fx && px <= fx + CW && py >= FREE_Y && py <= FREE_Y + CH) {
          const home = game.home[i]
          const c = d.cards[0]
          const fits = home.length === 0 ? c.rank === 1 : home[home.length - 1].suit === c.suit && home[home.length - 1].rank === c.rank - 1
          if (fits) {
            tryDrop((g) => {
              if (d.from.zone === 'free') g.free[d.from.index] = null
              else g.cols[d.from.index].pop()
              g.home[i].push({ ...c })
              return null
            })
            return
          }
        }
      }
    }
    /* 列命中 */
    for (let i = 0; i < 8; i++) {
      const cx = COL_X(i)
      const colH = TAB_Y + game.cols[i].length * STACK + (game.cols[i].length ? CH - STACK : 0)
      if (px >= cx && px <= cx + CW && py >= TAB_Y - 20 && py <= colH + 20) {
        const canDrop = game.cols[i].length === 0 || (canDropOnCol(d.cards[0], game.cols[i]) && d.count <= maxMovable(game, i))
        if (canDrop) {
          tryDrop((g) => {
            if (d.from.zone === 'free') g.free[d.from.index] = null
            else {
              for (let k = 0; k < d.count; k++) g.cols[d.from.index].pop()
            }
            d.cards.forEach((c) => g.cols[i].push({ ...c }))
            return null
          })
          return
        }
      }
    }
  }

  /* 双击：自动送基础堆 */
  const quickHome = (zone: 'free' | 'col', index: number) => {
    let c: Card | null = null
    if (zone === 'free') c = game.free[index]
    else {
      const col = game.cols[index]
      if (col.length) c = col[col.length - 1]
    }
    if (!c) return
    const home = game.home[c.suit]
    if (home.length === c.rank - 1) {
      const g = clone(game)
      if (zone === 'free') g.free[index] = null
      else g.cols[index].pop()
      g.home[c.suit].push({ ...c })
      pushHistory(game)
      commit(g)
      playClick()
    }
  }

  const movesLeft = won ? 0 : countMovesLeft(game)
  const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const cardsLayer: React.ReactNode[] = []

  /* 空当格 */
  for (let i = 0; i < 4; i++) {
    const f = game.free[i]
    cardsLayer.push(
      <div key={`fs${i}`} className="absolute rounded-[5px] border-2 border-[#0a6a2a]/70 bg-[#0a7a30]/25" style={{ left: 10 + i * (CW + GAP), top: FREE_Y, width: CW, height: CH }} />,
    )
    if (f && !(drag && drag.from.zone === 'free' && drag.from.index === i)) {
      cardsLayer.push(<CardView key={`f${f.id}`} card={f} style={{ left: 10 + i * (CW + GAP), top: FREE_Y, width: CW, height: CH }} onPointerDown={(e) => startDrag(e, 'free', i)} onDoubleClick={() => quickHome('free', i)} />)
    }
  }
  /* 基础堆 */
  const homeX0 = BOARD_W - 10 - 4 * (CW + GAP) + GAP
  for (let i = 0; i < 4; i++) {
    const h = game.home[i]
    cardsLayer.push(
      <div key={`hs${i}`} className="absolute rounded-[5px] border-2 border-[#0a6a2a]/70 bg-[#0a7a30]/25 flex items-center justify-center text-[22px] text-[#0a5a24]/60" style={{ left: homeX0 + i * (CW + GAP), top: FREE_Y, width: CW, height: CH }}>
        {SUIT_CHAR[i]}
      </div>,
    )
    if (h.length) {
      const c = h[h.length - 1]
      cardsLayer.push(<CardView key={`h${c.id}`} card={c} style={{ left: homeX0 + i * (CW + GAP), top: FREE_Y, width: CW, height: CH }} />)
    }
  }
  /* 列 */
  for (let i = 0; i < 8; i++) {
    const col = game.cols[i]
    cardsLayer.push(
      <div key={`cs${i}`} className="absolute rounded-[5px] border-2 border-dashed border-[#0a6a2a]/50 bg-[#0a7a30]/15" style={{ left: COL_X(i), top: TAB_Y, width: CW, height: CH }} />,
    )
    const draggingFromCol = drag && drag.from.zone === 'col' && drag.from.index === i
    col.forEach((c, j) => {
      if (draggingFromCol && j >= col.length - drag!.count) return
      cardsLayer.push(<CardView key={`c${c.id}`} card={c} style={{ left: COL_X(i), top: TAB_Y + j * STACK, width: CW, height: CH, zIndex: 1 }} onPointerDown={(e) => startDrag(e, 'col', i)} onDoubleClick={() => quickHome('col', i)} />)
    })
  }
  /* 拖动中的牌 */
  if (drag) {
    drag.cards.forEach((c, j) => {
      cardsLayer.push(<CardView key={`d${c.id}`} card={c} style={{ left: drag.x - CW / 2, top: drag.y - CH / 2 + j * STACK, width: CW, height: CH, zIndex: 50 }} />)
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#008000] select-none">
      <MenuBar
        menus={[
          {
            label: '游戏(F)',
            items: [
              { label: '新游戏(F2)', onClick: newGame },
              { label: '重新开始游戏(R)', onClick: restart },
              { separator: true },
              { label: '撤销(Z)', accelerator: 'Ctrl+Z', onClick: undo },
              { separator: true },
              { label: '选择游戏(S)...', onClick: () => openApp('dialog', { kind: 'info', title: '选择游戏', text: `当前游戏编号：#${gameNo}\n\n本复刻版随机发牌，\n无法指定编号（抱歉！）。` }) },
              { separator: true },
              { label: '退出(X)', onClick: () => useXP.getState().closeWindow(win.id) },
            ],
          },
          { label: '帮助(H)', items: [{ label: '关于空当接龙(A)...', onClick: () => openApp('dialog', { kind: 'info', title: '关于空当接龙', text: 'Windows 空当接龙 Web 复刻版\n\n规则：将所有牌按花色移回右上角\n基础堆（A 到 K）。\n\n空当格与空列越多，可一次性\n移动的牌序列越长。' }) }] },
        ]}
      />
      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 h-[26px] bg-gradient-to-b from-[#0a8a3a] to-[#067a2e] border-y border-[#056a26]">
        <span className="text-white text-[11px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>剩余可移动: {movesLeft}</span>
        <span className="text-white text-[11px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>游戏 #{gameNo}</span>
        <span className="text-white text-[11px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          时间: {timeStr} · 移动: {game.moves}
        </span>
      </div>
      {/* 牌桌 */}
      <div ref={boardRef} className="flex-1 bg-[#008000] overflow-hidden relative" style={{ minWidth: BOARD_W }} onPointerMove={onDragMove} onPointerUp={endDrag}>
        <div className="absolute" style={{ width: BOARD_W, height: BOARD_H }}>
          {cardsLayer}
        </div>
        {won ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[6px] shadow-lg p-5 text-center">
              <div className="text-[16px] font-bold mb-2 text-[#0a6a2a]">太棒了！你赢了！</div>
              <div className="text-[11px] mb-4">
                用时 {timeStr} · {game.moves} 次移动
              </div>
              <div className="flex justify-center gap-2">
                <button type="button" className="xp-btn xp-btn-primary px-4 h-[23px] text-[11px]" onClick={newGame}>
                  再来一局
                </button>
                <button type="button" className="xp-btn px-4 h-[23px] text-[11px]" onClick={() => useXP.getState().closeWindow(win.id)}>
                  退出
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {movesLeft === 0 && !won && game.moves > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[6px] shadow-lg p-5 text-center max-w-[280px]">
              <div className="text-[14px] font-bold mb-2 text-[#c02020]">没有可用的移动了</div>
              <div className="text-[11px] mb-4">游戏似乎无法继续。可以撤销几步试试。</div>
              <div className="flex justify-center gap-2">
                <button type="button" className="xp-btn xp-btn-primary px-4 h-[23px] text-[11px]" onClick={undo}>
                  撤销
                </button>
                <button type="button" className="xp-btn px-4 h-[23px] text-[11px]" onClick={newGame}>
                  新游戏
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
