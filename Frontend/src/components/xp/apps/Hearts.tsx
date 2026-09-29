'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { playClick, playDing } from '../sounds'
import { CardBackArt } from './Solitaire'

type Suit = 0 | 1 | 2 | 3 /* 0♠ 1♥ 2♣ 3♦ */

interface Card {
  id: number
  suit: Suit
  rank: number
}

const SUIT_CHAR = ['\u2660', '\u2665', '\u2663', '\u2666']
const RANK_STR = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const NAMES = ['你', '西家', '北家', '东家'] /* 0南 1西 2北 3东，出牌顺序 (p+1)%4 顺时针 */
const CW = 46
const CH = 64
const isRed = (s: Suit) => s === 1 || s === 3

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function deal(): Card[][] {
  const deck: Card[] = []
  let id = 0
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: id++, suit: s as Suit, rank: r })
  const sh = shuffle(deck)
  const hands: Card[][] = []
  for (let i = 0; i < 4; i++) {
    const h = sh.splice(0, 13)
    h.sort((a, b) => (a.suit - b.suit) * 20 + (a.rank - b.rank))
    hands.push(h)
  }
  return hands
}

const PASS_LABEL = ['向左传牌', '向右传牌', '对家互传', '不传牌']
const passTarget = (dir: number, from: number) => (from + [1, 3, 2, 0][dir]) % 4

type Phase = 'passing' | 'playing' | 'trickEnd' | 'handScore' | 'gameOver'

interface GState {
  hands: Card[][]
  phase: Phase
  handNo: number
  passSel: number[]
  trick: Array<{ p: number; c: Card }>
  turn: number
  firstTrick: boolean
  heartsBroken: boolean
  taken: Array<{ hearts: number; queen: boolean }>
  scores: number[]
  handResult: number[] | null
  winnerNote: string
  msg: string
  trickNo: number
}

function initGame(): GState {
  const hands = deal()
  return {
    hands,
    phase: 'passing',
    handNo: 1,
    passSel: [],
    trick: [],
    turn: -1,
    firstTrick: true,
    heartsBroken: false,
    taken: [0, 1, 2, 3].map(() => ({ hearts: 0, queen: false })),
    scores: [0, 0, 0, 0],
    handResult: null,
    winnerNote: '',
    msg: '第 1 局：向左传牌。请选择 3 张牌传出。',
    trickNo: 0,
  }
}

function findStart(hs: Card[][]): number {
  for (let p = 0; p < 4; p++) {
    if (hs[p].some((c) => c.suit === 2 && c.rank === 2)) return p
  }
  return 0
}

function legalMoves(hand: Card[], trick: Array<{ p: number; c: Card }>, heartsBroken: boolean, firstTrick: boolean): Card[] {
  if (firstTrick) {
    const c2 = hand.find((c) => c.suit === 2 && c.rank === 2)
    if (c2) return [c2]
  }
  if (trick.length === 0) {
    if (!heartsBroken) {
      const nonHearts = hand.filter((c) => c.suit !== 1)
      if (nonHearts.length) return nonHearts
    }
    return hand
  }
  const lead = trick[0].c.suit
  const follow = hand.filter((c) => c.suit === lead)
  if (follow.length) return follow
  if (firstTrick) {
    const safe = hand.filter((c) => !(c.suit === 1 || (c.suit === 0 && c.rank === 12)))
    if (safe.length) return safe
  }
  return hand
}

function aiPass(h: Card[]): Card[] {
  const scored = h.map((c) => {
    let s = c.rank
    if (c.suit === 0 && c.rank >= 12) s = 40 + c.rank /* ♠Q ♠K ♠A 危险 */
    else if (c.suit === 1 && c.rank >= 10) s = 25 + c.rank
    return { c, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, 3).map((x) => x.c)
}

function aiChoose(hand: Card[], trick: Array<{ p: number; c: Card }>, heartsBroken: boolean, firstTrick: boolean): Card {
  const legal = legalMoves(hand, trick, heartsBroken, firstTrick)
  if (legal.length === 1) return legal[0]
  const leadSuit = trick.length ? trick[0].c.suit : null
  const trickPoints = trick.reduce((n, t) => n + (t.c.suit === 1 ? 1 : t.c.suit === 0 && t.c.rank === 12 ? 13 : 0), 0)

  if (leadSuit === null) {
    /* 领出：安全低牌 */
    const candidates = legal.filter((c) => !(c.suit === 0 && c.rank >= 12))
    const pool = [...(candidates.length ? candidates : legal)]
    pool.sort((a, b) => a.rank - b.rank)
    return pool[0]
  }
  const following = legal[0].suit === leadSuit && hand.some((c) => c.suit === leadSuit)
  if (following) {
    const trickMax = trick.filter((t) => t.c.suit === leadSuit).reduce((m, t) => Math.max(m, t.c.rank), 0)
    const isLast = trick.length === 3
    const lower = legal.filter((c) => c.rank < trickMax).sort((a, b) => b.rank - a.rank)
    if (isLast && trickPoints === 0) {
      /* 最后一家且无分：出高牌清场 */
      const pool = [...legal.filter((c) => !(c.suit === 0 && c.rank === 12))]
      pool.sort((a, b) => b.rank - a.rank)
      return pool[0]
    }
    if (lower.length) {
      const nonQ = lower.filter((c) => !(c.suit === 0 && c.rank === 12))
      return nonQ.length ? nonQ[0] : lower[0]
    }
    /* 只能赢：最小者，避开♠Q */
    return [...legal].sort((a, b) => (a.suit === 0 && a.rank === 12 ? 99 : a.rank) - (b.suit === 0 && b.rank === 12 ? 99 : b.rank))[0]
  }
  /* 垫牌：♠Q > 大♠ > 大♥ > 大牌 */
  for (const c of legal) if (c.suit === 0 && c.rank === 12) return c
  const bigSpade = legal.filter((c) => c.suit === 0 && c.rank >= 13)
  if (bigSpade.length) return [...bigSpade].sort((a, b) => b.rank - a.rank)[0]
  const hearts = legal.filter((c) => c.suit === 1)
  if (hearts.length) return [...hearts].sort((a, b) => b.rank - a.rank)[0]
  return [...legal].sort((a, b) => b.rank - a.rank)[0]
}

function CardView({ card, style, onClick, dimmed, selected }: { card: Card; style: React.CSSProperties; onClick?: () => void; dimmed?: boolean; selected?: boolean }) {
  return (
    <div
      className={`rounded-[4px] overflow-hidden shadow-[1px_1px_2px_rgba(0,0,0,0.35)] select-none ${onClick ? 'cursor-pointer' : 'cursor-default'} bg-white`}
      style={{ ...style, opacity: dimmed ? 0.45 : 1, outline: selected ? '2px solid #ffd020' : undefined, outlineOffset: selected ? '1px' : undefined, transition: 'transform 0.12s' }}
      onClick={onClick}
    >
      <span className="absolute left-[3px] top-[1px] font-bold leading-[11px] text-[10px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111', fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
        {RANK_STR[card.rank]}
      </span>
      <span className="absolute right-[3px] top-[1px] font-bold leading-[11px] text-[10px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
        {SUIT_CHAR[card.suit]}
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-[20px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
        {SUIT_CHAR[card.suit]}
      </span>
    </div>
  )
}

export default function Hearts({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  /* cards.dll 全局牌背（与纸牌「选定纸牌背面」联动） */
  const back = useXP((s) => s.solitaireBack)
  const [G, setG] = useState<GState>(initGame)
  const gRef = useRef(G)
  useEffect(() => {
    gRef.current = G
  }, [G])
  const timersRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms)
    timersRef.current.push(t)
  }
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const act = (patch: (g: GState) => Partial<GState>) => setG((g) => ({ ...g, ...patch(g) }))

  const startPlaying = (hs: Card[][]): Partial<GState> => {
    const st = findStart(hs)
    return {
      phase: 'playing',
      trick: [],
      turn: st,
      firstTrick: true,
      heartsBroken: false,
      taken: [0, 1, 2, 3].map(() => ({ hearts: 0, queen: false })),
      trickNo: 0,
      msg: `${NAMES[st]} 持有 2${SUIT_CHAR[2]}，首先出牌`,
    }
  }

  const scheduleNext = (turnNow: number) => {
    if (turnNow !== 0) {
      later(() => {
        const g = gRef.current
        if (g.phase !== 'playing' || g.turn !== turnNow) return
        const card = aiChoose(g.hands[turnNow], g.trick, g.heartsBroken, g.firstTrick)
        if (card) playCard(turnNow, card)
      }, 700)
    }
  }

  const playCard = (player: number, card: Card) => {
    const g = gRef.current
    const newTrick = [...g.trick, { p: player, c: card }]
    const nh = g.hands.map((h, p) => (p === player ? h.filter((c2) => c2.id !== card.id) : h))
    const broke = g.heartsBroken || (card.suit === 1 && !(g.trick.length && g.trick[0].c.suit === 1))

    if (newTrick.length < 4) {
      const nxt = (player + 1) % 4
      act((gg) => ({ hands: nh, trick: newTrick, heartsBroken: broke, turn: nxt, msg: broke && !gg.heartsBroken ? '红心已被垫出！' : gg.msg }))
      later(() => {
        const g2 = gRef.current
        if (g2.phase !== 'playing' || g2.turn !== nxt) return
        if (nxt !== 0) {
          const c2 = aiChoose(g2.hands[nxt], g2.trick, g2.heartsBroken, g2.firstTrick)
          if (c2) playCard(nxt, c2)
        }
      }, 650)
      return
    }

    /* 墩结束 */
    const leadSuit = newTrick[0].c.suit
    let wIdx = 0
    for (let i = 1; i < 4; i++) {
      if (newTrick[i].c.suit === leadSuit && (newTrick[wIdx].c.suit !== leadSuit || newTrick[i].c.rank > newTrick[wIdx].c.rank)) wIdx = i
    }
    const winner = newTrick[wIdx].p
    const pts = newTrick.reduce((n, t) => n + (t.c.suit === 1 ? 1 : t.c.suit === 0 && t.c.rank === 12 ? 13 : 0), 0)
    const trickNo = g.trickNo + 1
    act(() => ({
      hands: nh,
      trick: newTrick,
      heartsBroken: broke,
      phase: 'trickEnd',
      msg: `${NAMES[winner]} 赢得此墩${pts > 0 ? `（${pts} 分）` : ''}`,
      trickNo,
    }))
    later(() => {
      const g2 = gRef.current
      const taken = g2.taken.map((t, p) =>
        p === winner ? { hearts: t.hearts + newTrick.filter((x) => x.c.suit === 1).length, queen: t.queen || newTrick.some((x) => x.c.suit === 0 && x.c.rank === 12) } : t,
      )
      if (trickNo >= 13) {
        /* 结算一手 */
        const pts2 = taken.map((t) => t.hearts + (t.queen ? 13 : 0))
        let final = [...pts2]
        let note = ''
        const shooter = pts2.findIndex((p) => p === 26)
        if (shooter >= 0) {
          final = final.map((_, p) => (p === shooter ? 0 : 26))
          note = `${NAMES[shooter]} 全收 26 分！其余各家加 26 分。`
        }
        const ns = g2.scores.map((s, p) => s + final[p])
        act(() => ({
          taken,
          trick: [],
          handResult: final,
          winnerNote: note,
          scores: ns,
          phase: ns.some((s) => s >= 100) ? 'gameOver' : 'handScore',
          msg: '本局结束',
        }))
        playDing()
        return
      }
      act(() => ({
        taken,
        trick: [],
        firstTrick: false,
        turn: winner,
        phase: 'playing',
      }))
      scheduleNext(winner)
    }, 1150)
  }

  const doPass = () => {
    const g = gRef.current
    if (g.passSel.length !== 3) return
    const dir = (g.handNo - 1) % 4
    const passCards: Card[][] = []
    passCards[0] = g.passSel.map((i) => g.hands[0][i])
    for (let p = 1; p < 4; p++) passCards[p] = aiPass(g.hands[p])
    const nh = g.hands.map((h, p) => {
      const outIds = new Set(passCards[p].map((c) => c.id))
      return h.filter((c) => !outIds.has(c.id))
    })
    for (let p = 0; p < 4; p++) {
      const to = passTarget(dir, p)
      nh[to] = [...nh[to], ...passCards[p]]
    }
    nh.forEach((h) => h.sort((a, b) => (a.suit - b.suit) * 20 + (a.rank - b.rank)))
    act(() => ({ hands: nh, passSel: [], msg: `已${PASS_LABEL[dir]}，即将开始出牌` }))
    playClick()
    later(() => {
      const st = startPlaying(gRef.current.hands)
      act(() => st)
      /* st.turn 是 findStart 的新首出者；AI 需在其后再延迟调度 */
      if (typeof st.turn === 'number' && st.turn !== 0) {
        later(() => scheduleNext(st.turn!), 500)
      }
    }, 600)
  }

  const nextHand = () => {
    const nHand = gRef.current.handNo + 1
    const hands = deal()
    playClick()
    if ((nHand - 1) % 4 === 3) {
      act(() => ({ ...startPlaying(hands), hands, handNo: nHand, passSel: [], handResult: null, winnerNote: '', msg: '本局不传牌' }))
      later(() => scheduleNext(gRef.current.turn), 500)
    } else {
      act(() => ({ hands, handNo: nHand, passSel: [], handResult: null, winnerNote: '', phase: 'passing', trick: [], msg: `第 ${nHand} 局：${PASS_LABEL[(nHand - 1) % 4]}。请选择 3 张牌传出。` }))
    }
  }

  const newGame = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setG(initGame())
    playClick()
  }

  const clickCard = (idx: number) => {
    const g = gRef.current
    if (g.phase === 'passing') {
      act((gg) => {
        const s = gg.passSel.includes(idx) ? gg.passSel.filter((x) => x !== idx) : gg.passSel.length < 3 ? [...gg.passSel, idx] : [gg.passSel[1], gg.passSel[2], idx]
        return { passSel: s }
      })
      return
    }
    if (g.phase !== 'playing' || g.turn !== 0) return
    const card = g.hands[0][idx]
    if (!card) return
    const legal = legalMoves(g.hands[0], g.trick, g.heartsBroken, g.firstTrick)
    if (!legal.some((c) => c.id === card.id)) {
      act(() => ({ msg: '这张牌现在不能出（需跟花色 / 首墩规则）' }))
      return
    }
    playCard(0, card)
    playClick()
  }

  /* 渲染 */
  const dir = (G.handNo - 1) % 4
  const legalSet = G.phase === 'playing' && G.turn === 0 ? new Set(legalMoves(G.hands[0], G.trick, G.heartsBroken, G.firstTrick).map((c) => c.id)) : null
  const passSet = new Set(G.passSel)

  const trickPos = (p: number): React.CSSProperties => {
    const cx = 300
    const cy = 200
    if (p === 0) return { left: cx - CW / 2, top: cy + 34 }
    if (p === 2) return { left: cx - CW / 2, top: cy - CH - 34 }
    if (p === 1) return { left: cx - CW - 52, top: cy - CH / 2 }
    return { left: cx + 52, top: cy - CH / 2 }
  }

  return (
    <div className="flex flex-col h-full bg-[#0055a0] select-none" style={{ minWidth: 640 }}>
      <MenuBar
        menus={[
          {
            label: '游戏(G)',
            items: [
              { label: '新游戏(N)', onClick: newGame },
              { separator: true },
              { label: '退出(X)', onClick: () => closeWindow(win.id) },
            ],
          },
          { label: '帮助(H)', items: [{ label: '关于红心大战(A)...', onClick: () => openApp('dialog', { kind: 'info', title: '关于红心大战', text: 'Windows 红心大战 Web 复刻版\n\n目标：尽可能少得分。\n每张红心 1 分，黑桃 Q 13 分。\n一人独收 26 分时其余各家加 26 分。\n任一玩家达到 100 分即结束，\n分数最低者获胜。' }) }] },
        ]}
      />
      <div className="flex-1 relative overflow-hidden bg-[#0055a0]" style={{ minWidth: 640 }}>
        {/* 名字+分数 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[8px] text-white text-[11px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          北家 · {G.scores[2]} 分
        </div>
        <div className="absolute left-[26px] top-1/2 -translate-y-1/2 -rotate-90 text-white text-[11px] font-bold whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          西家 · {G.scores[1]} 分
        </div>
        <div className="absolute right-[26px] top-1/2 -translate-y-1/2 rotate-90 text-white text-[11px] font-bold whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          东家 · {G.scores[3]} 分
        </div>

        {/* 其他玩家牌背（cards.dll 全局牌背：随「选定纸牌背面」联动） */}
        <div className="absolute left-1/2 top-[28px] -translate-x-1/2 flex gap-[3px]">
          {G.hands[2].map((c) => (
            <div key={c.id} className="w-[28px] h-[40px] rounded-[3px] overflow-hidden bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.3)]"><CardBackArt idx={back} /></div>
          ))}
        </div>
        <div className="absolute left-[40px] top-1/2 -translate-y-1/2 flex flex-col gap-[3px]">
          {G.hands[1].map((c) => (
            <div key={c.id} className="w-[28px] h-[40px] rounded-[3px] overflow-hidden bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.3)]"><CardBackArt idx={back} /></div>
          ))}
        </div>
        <div className="absolute right-[40px] top-1/2 -translate-y-1/2 flex flex-col gap-[3px]">
          {G.hands[3].map((c) => (
            <div key={c.id} className="w-[28px] h-[40px] rounded-[3px] overflow-hidden bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.3)]"><CardBackArt idx={back} /></div>
          ))}
        </div>

        {/* 回合指示 */}
        {G.phase === 'playing' ? (
          <>
            <div className={`absolute left-1/2 -translate-x-1/2 top-[74px] text-[#ffd020] text-[10px] font-bold ${G.turn === 2 ? 'opacity-100' : 'opacity-0'}`}>▼ 出牌中</div>
            <div className={`absolute left-[70px] top-1/2 -translate-y-1/2 text-[#ffd020] text-[10px] font-bold ${G.turn === 1 ? 'opacity-100' : 'opacity-0'}`}>◀</div>
            <div className={`absolute right-[70px] top-1/2 -translate-y-1/2 text-[#ffd020] text-[10px] font-bold ${G.turn === 3 ? 'opacity-100' : 'opacity-0'}`}>▶</div>
          </>
        ) : null}

        {/* 中央出牌区 */}
        {G.trick.map((t) => (
          <div key={t.c.id} className="absolute" style={trickPos(t.p)}>
            <CardView card={t.c} style={{ position: 'relative', width: CW, height: CH }} />
          </div>
        ))}

        {/* 玩家手牌 */}
        <div className="absolute bottom-[24px] left-0 right-0 flex justify-center gap-[2px]">
          {G.hands[0].map((c, i) => {
            const isLegal = legalSet ? legalSet.has(c.id) : true
            const clickable = G.phase === 'passing' || (G.phase === 'playing' && G.turn === 0)
            const sel = passSet.has(i)
            return (
              <CardView
                key={c.id}
                card={c}
                style={{ position: 'relative', width: CW, height: CH, transform: sel ? 'translateY(-12px)' : undefined, zIndex: sel ? 5 : 1 }}
                onClick={clickable ? () => clickCard(i) : undefined}
                dimmed={G.phase === 'playing' && G.turn === 0 && !isLegal}
                selected={sel}
              />
            )
          })}
        </div>
        <div className="absolute bottom-[4px] left-0 right-0 text-center text-white text-[11px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          你 · 总分 {G.scores[0]} · 本局 {G.taken[0].hearts + (G.taken[0].queen ? 13 : 0)} 分
        </div>

        {/* 消息 */}
        <div className="absolute top-[3px] left-[8px] text-white/95 text-[11px] max-w-[230px] leading-[14px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          {G.msg}
        </div>

        {/* 传牌面板 */}
        {G.phase === 'passing' ? (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[6px] shadow-lg p-4 w-[300px] text-center">
              <div className="text-[13px] font-bold mb-1">{PASS_LABEL[dir]}</div>
              <div className="text-[11px] mb-3">请点击选择 3 张牌传出（已选 {G.passSel.length}/3）</div>
              <XPButton primary onClick={doPass} disabled={G.passSel.length !== 3}>
                传牌
              </XPButton>
            </div>
          </div>
        ) : null}

        {/* 一手结束 */}
        {G.phase === 'handScore' && G.handResult ? (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[6px] shadow-lg p-4 w-[330px]">
              <div className="text-[13px] font-bold mb-2 text-center">第 {G.handNo} 局结束</div>
              <table className="w-full text-[11px] mb-2">
                <tbody>
                  {NAMES.map((n, p) => (
                    <tr key={n}>
                      <td className="py-[3px]">{n}</td>
                      <td className="text-right">+{(G.handResult ?? [0, 0, 0, 0])[p]}</td>
                      <td className="text-right">总分 {G.scores[p]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {G.winnerNote ? <div className="text-[11px] text-[#c02020] mb-2 text-center font-bold">{G.winnerNote}</div> : null}
              <div className="text-center">
                <XPButton primary onClick={nextHand}>
                  继续
                </XPButton>
              </div>
            </div>
          </div>
        ) : null}

        {/* 游戏结束 */}
        {G.phase === 'gameOver' ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-[#ece9d8] border border-[#8a867e] rounded-[6px] shadow-lg p-5 w-[330px] text-center">
              <div className="text-[15px] font-bold mb-2">游戏结束</div>
              <div className="text-[11px] mb-3">
                胜者：<b>{NAMES[G.scores.indexOf(Math.min(...G.scores))]}</b>（{Math.min(...G.scores)} 分）
              </div>
              <div className="flex justify-center gap-2">
                <XPButton primary onClick={newGame}>
                  再来一局
                </XPButton>
                <XPButton onClick={() => closeWindow(win.id)}>退出</XPButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
