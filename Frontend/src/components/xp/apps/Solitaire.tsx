'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, XPRadio, XPCheckbox } from '../ui'
import { playClick } from '../sounds'

type Suit = 0 | 1 | 2 | 3 /* 0♠ 1♥ 2♣ 3♦ */

interface Card {
  id: number
  suit: Suit
  rank: number /* 1..13 */
  faceUp: boolean
}

interface Piles {
  stock: Card[]
  waste: Card[]
  foundations: Card[][] /* 4 */
  tableau: Card[][] /* 7 */
}

const SUIT_CHAR = ['\u2660', '\u2665', '\u2663', '\u2666']
const RANK_STR = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const CW = 71
const CH = 96

/* ═════════ 牌背美术（XP cards.dll 十二款复刻）═════════
 * viewBox 71×96（XP 标准牌面比例），自带白色边框；preserveAspectRatio=none 任意缩放填充。
 * 索引即设置项 solitaireBack，1 为出厂「经典蓝」。Hearts 共用（cards.dll 全局牌背语义）。 */
function backFrame(children: React.ReactNode) {
  return (
    <svg viewBox="0 0 71 96" preserveAspectRatio="none" className="w-full h-full block">
      <rect x="0" y="0" width="71" height="96" rx="4" fill="#ffffff" />
      <rect x="4" y="4" width="63" height="88" rx="2" fill="#20408c" />
      {children}
    </svg>
  )
}

const CARD_BACK_ART: Array<() => React.ReactNode> = [
  /* 0 经典红：斜纹网格 + 双细框 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#b02020" />
      <path d="M7 7 L64 89 M64 7 L7 89 M7 48 L35.5 7 M35.5 89 L64 48 M35.5 7 L7 48 M64 48 L35.5 89" stroke="#e85050" strokeWidth="1.1" />
      <path d="M7 7 L64 89 M64 7 L7 89" stroke="#7a1010" strokeWidth="2.2" />
      <rect x="7" y="7" width="57" height="82" fill="none" stroke="#ffffff" strokeWidth="1.6" />
    </>,
  ),
  /* 1 经典蓝（出厂）：斜纹网格 —— 与旧 .sol-card-back 观感同源 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#1a4fa8" />
      <path d="M7 7 L64 89 M64 7 L7 89 M7 48 L35.5 7 M35.5 89 L64 48 M35.5 7 L7 48 M64 48 L35.5 89" stroke="#5a8ae0" strokeWidth="1.1" />
      <path d="M7 7 L64 89 M64 7 L7 89" stroke="#12398a" strokeWidth="2.2" />
      <rect x="7" y="7" width="57" height="82" fill="none" stroke="#ffffff" strokeWidth="1.6" />
    </>,
  ),
  /* 2 宇航 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#0c1440" />
      {[[14, 16], [26, 12], [55, 22], [18, 40], [58, 52], [12, 62], [50, 74], [30, 82], [44, 34], [22, 72]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} fill="#cdd8ff" />
      ))}
      <circle cx="54" cy="24" r="9" fill="#2a6ad0" />
      <ellipse cx="54" cy="24" rx="4" ry="8.5" fill="#3a8ae8" opacity="0.7" />
      {/* 宇航员 */}
      <circle cx="30" cy="36" r="9" fill="#e8e8f0" />
      <circle cx="30" cy="36" r="6.5" fill="#183058" />
      <circle cx="27.5" cy="33.5" r="1.6" fill="#9ac0ff" />
      <rect x="24" y="44" width="12" height="20" rx="5" fill="#e8e8f0" />
      <rect x="24" y="44" width="12" height="20" rx="5" fill="none" stroke="#b8b8cc" strokeWidth="0.8" />
      <rect x="17" y="47" width="7" height="14" rx="3.5" fill="#d8d8e4" />
      <rect x="36" y="47" width="7" height="14" rx="3.5" fill="#d8d8e4" />
      <rect x="26" y="63" width="4" height="12" rx="2" fill="#d8d8e4" />
      <rect x="32" y="63" width="4" height="12" rx="2" fill="#d8d8e4" />
      <rect x="26.5" y="76" width="9" height="3.5" rx="1" fill="#c02020" />
    </>,
  ),
  /* 3 海滩 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#ffd090" />
      <rect x="7" y="7" width="57" height="34" fill="#8ac8f8" />
      <circle cx="53" cy="18" r="7" fill="#ffd840" />
      <path d="M7 41 Q 20 36 35 41 T 64 41 L 64 48 L 7 48 Z" fill="#3a9ad8" />
      <rect x="7" y="46" width="57" height="6" fill="#e8e0c8" />
      <path d="M7 52 Q 24 48 40 53 T 64 51 L 64 89 L 7 89 Z" fill="#f0dca8" />
      {/* 遮阳伞 */}
      <path d="M20 52 L 44 30 L 49 34 L 25 56 Z" fill="#c08040" />
      <path d="M25 18 Q 40 8 55 22 Q 47 26 42 24 Q 36 28 30 26 Q 26 30 22 28 Q 22 22 25 18 Z" fill="#e04848" />
      <path d="M30 20 Q 32 24 31 27 M38 18 Q 41 23 40 27 M46 20 Q 49 24 48 26" stroke="#ffffff" strokeWidth="1.4" fill="none" />
      <circle cx="48" cy="60" r="2.2" fill="#e8b060" />
      <circle cx="52" cy="66" r="1.8" fill="#e8b060" />
      <circle cx="45" cy="68" r="1.6" fill="#e8b060" />
    </>,
  ),
  /* 4 城堡 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#a8d8f0" />
      <circle cx="54" cy="17" r="5.5" fill="#fff0b0" />
      <ellipse cx="20" cy="22" rx="8" ry="3" fill="#ffffff" opacity="0.85" />
      <ellipse cx="28" cy="19" rx="6" ry="2.5" fill="#ffffff" opacity="0.7" />
      <path d="M7 62 Q 20 52 35 58 T 64 56 L 64 89 L 7 89 Z" fill="#5aa048" />
      <path d="M7 70 Q 24 62 40 68 T 64 66 L 64 89 L 7 89 Z" fill="#489040" />
      {/* 城堡主体 */}
      <rect x="22" y="42" width="27" height="26" fill="#d8d0c0" />
      <rect x="19" y="36" width="8" height="32" fill="#d8d0c0" />
      <rect x="44" y="36" width="8" height="32" fill="#d8d0c0" />
      <path d="M19 36 L23 28 L27 36 Z M44 36 L48 28 L52 36 Z" fill="#b02828" />
      <rect x="22" y="42" width="27" height="26" fill="none" stroke="#a8a090" strokeWidth="0.8" />
      <rect x="24" y="38" width="3" height="4" fill="#585850" />
      <rect x="44" y="38" width="3" height="4" fill="#585850" />
      <rect x="33" y="56" width="6" height="12" rx="3" fill="#585850" />
      <rect x="25" y="47" width="5" height="5" fill="#585850" />
      <rect x="41" y="47" width="5" height="5" fill="#585850" />
      <path d="M23 28 L 23 20 L 27 22 Z" fill="#585850" />
      <path d="M48 28 L 48 20 L 52 22 Z" fill="#585850" />
      <path d="M23 20 Q 27 17 31 20" stroke="#e8c030" strokeWidth="1.2" fill="none" />
      <path d="M48 20 Q 52 17 56 20" stroke="#e8c030" strokeWidth="1.2" fill="none" />
    </>,
  ),
  /* 5 热带鱼 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#1a8ab0" />
      <path d="M7 30 Q 30 20 64 32 L 64 60 Q 30 76 7 64 Z" fill="#2aa8cc" opacity="0.5" />
      <g>
        <ellipse cx="24" cy="38" rx="8" ry="5" fill="#f0a020" />
        <path d="M32 38 L 38 33 L 38 43 Z" fill="#e08818" />
        <circle cx="20" cy="37" r="1.2" fill="#222" />
        <path d="M21 41 Q 24 44 27 41" stroke="#c07010" strokeWidth="0.8" fill="none" />
      </g>
      <g>
        <ellipse cx="46" cy="58" rx="10" ry="6" fill="#e04848" />
        <path d="M56 58 L 63 52 L 63 64 Z" fill="#c03030" />
        <circle cx="41" cy="56.5" r="1.4" fill="#222" />
        <path d="M43 61 Q 47 65 51 61" stroke="#a02020" strokeWidth="0.8" fill="none" />
        <path d="M42 52 Q 46 48 50 52" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.7" />
      </g>
      <g>
        <ellipse cx="30" cy="74" rx="7" ry="4.5" fill="#48c0a0" />
        <path d="M37 74 L 42 70 L 42 78 Z" fill="#30a088" />
        <circle cx="26.5" cy="73" r="1" fill="#222" />
      </g>
      <g>
        <ellipse cx="52" cy="24" rx="6" ry="4" fill="#c060d0" />
        <path d="M58 24 L 63 20.5 L 63 27.5 Z" fill="#a040b0" />
        <circle cx="49" cy="23" r="0.9" fill="#222" />
      </g>
      <circle cx="16" cy="20" r="1.6" fill="#ffffff" opacity="0.6" />
      <circle cx="20" cy="16" r="1" fill="#ffffff" opacity="0.5" />
      <circle cx="58" cy="78" r="1.4" fill="#ffffff" opacity="0.5" />
      <path d="M10 80 Q 14 76 18 80" stroke="#3a7a4a" strokeWidth="1.6" fill="none" />
      <path d="M56 84 Q 61 80 64 84" stroke="#3a7a4a" strokeWidth="1.4" fill="none" />
    </>,
  ),
  /* 6 玫瑰 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#1a4a2a" />
      <path d="M35 50 L 35 88" stroke="#2a6a3a" strokeWidth="2.4" />
      <path d="M35 66 Q 24 62 21 54 Q 32 54 35 62 Z" fill="#2f7a42" />
      <path d="M35 74 Q 46 70 49 62 Q 38 62 35 70 Z" fill="#2f7a42" />
      <circle cx="35" cy="38" r="14" fill="#c01828" />
      <circle cx="30" cy="33" r="9" fill="#d82838" />
      <circle cx="40" cy="34" r="8" fill="#a81020" />
      <circle cx="34" cy="43" r="7" fill="#d02838" />
      <circle cx="35" cy="38" r="4.5" fill="#8a0a16" />
      <path d="M28 30 Q 32 26 36 29 M38 28 Q 42 30 41 34" stroke="#e86070" strokeWidth="1" fill="none" />
      <path d="M48 60 Q 52 56 51 50" stroke="#2a6a3a" strokeWidth="1.6" fill="none" />
      <circle cx="51" cy="48" r="2.6" fill="#d82838" />
      <circle cx="55" cy="55" r="1.8" fill="#c01828" />
    </>,
  ),
  /* 7 月夜 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#101848" />
      {[[16, 18], [24, 30], [14, 44], [58, 30], [52, 16], [60, 60], [20, 78], [50, 80], [38, 22], [44, 52], [28, 62], [56, 42]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.4 : 0.9} fill="#e8ecff" />
      ))}
      <path d="M46 20 A 13 13 0 1 0 46 46 A 10 10 0 1 1 46 20 Z" fill="#f0e0a0" />
      <circle cx="42" cy="30" r="2" fill="#d8c880" opacity="0.6" />
      <circle cx="48" cy="38" r="1.4" fill="#d8c880" opacity="0.5" />
      <path d="M7 78 Q 22 68 38 76 T 64 72 L 64 89 L 7 89 Z" fill="#0a1030" />
      <path d="M7 84 Q 26 76 46 84 T 64 82 L 64 89 L 7 89 Z" fill="#060a20" />
      <path d="M24 78 L 24 66 M22 68 L 24 62 L 26 68" stroke="#1a2050" strokeWidth="1.6" fill="none" />
    </>,
  ),
  /* 8 沙漠 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#f8c060" />
      <rect x="7" y="7" width="57" height="40" fill="#f8a840" />
      <circle cx="22" cy="22" r="8" fill="#fff0b8" />
      <path d="M7 48 Q 22 40 36 46 T 64 44 L 64 58 L 7 58 Z" fill="#e8a850" />
      <path d="M7 58 Q 28 52 46 58 T 64 56 L 64 74 L 7 74 Z" fill="#d89840" />
      <path d="M7 74 Q 26 68 44 74 T 64 72 L 64 89 L 7 89 Z" fill="#c88830" />
      {/* 仙人掌 */}
      <rect x="46" y="60" width="5" height="18" rx="2.5" fill="#3a8a4a" />
      <rect x="40" y="66" width="4" height="10" rx="2" fill="#3a8a4a" />
      <rect x="40" y="64" width="10" height="4" rx="2" fill="#3a8a4a" />
      <rect x="52" y="68" width="4" height="8" rx="2" fill="#3a8a4a" />
      <rect x="49" y="66" width="7" height="4" rx="2" fill="#3a8a4a" />
      <circle cx="30" cy="80" r="1.4" fill="#b07828" />
      <circle cx="34" cy="84" r="1" fill="#b07828" />
    </>,
  ),
  /* 9 赛车 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#c8ccd4" />
      <rect x="7" y="7" width="57" height="82" fill="none" />
      <path d="M7 74 L 64 74" stroke="#ffffff" strokeWidth="4" strokeDasharray="7 5" />
      <path d="M7 82 L 64 82" stroke="#ffffff" strokeWidth="4" strokeDasharray="7 5" />
      {/* 速度线 */}
      <path d="M10 32 L 24 32 M8 40 L 20 40 M12 48 L 22 48" stroke="#8a90a0" strokeWidth="1.6" />
      {/* 车身 */}
      <path d="M20 58 Q 24 44 34 42 L 44 42 Q 54 44 58 52 L 60 58 Q 60 62 55 62 L 24 62 Q 19 62 20 58 Z" fill="#d02020" />
      <path d="M30 44 L 43 44 L 46 50 L 27 50 Z" fill="#a8e0f0" />
      <rect x="36" y="42" width="3" height="9" fill="#d02020" />
      {/* 尾翼 */}
      <path d="M20 46 L 14 44 L 14 41 L 22 42 Z" fill="#a01818" />
      {/* 车轮 */}
      <circle cx="28" cy="62" r="6" fill="#222" />
      <circle cx="28" cy="62" r="2.6" fill="#c0c0c8" />
      <circle cx="52" cy="62" r="6" fill="#222" />
      <circle cx="52" cy="62" r="2.6" fill="#c0c0c8" />
      <circle cx="58" cy="20" r="4" fill="#f0f0f0" />
      <text x="58" y="22" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#d02020" fontFamily="Arial">1</text>
    </>,
  ),
  /* 10 鹦鹉 */
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#e8f0a0" />
      <path d="M7 7 L 64 7 L 64 26 Q 40 18 7 30 Z" fill="#f8b8c8" opacity="0.5" />
      <path d="M10 88 Q 30 80 62 86" stroke="#8a6a3a" strokeWidth="3" fill="none" />
      {/* 鹦鹉 */}
      <ellipse cx="34" cy="52" rx="13" ry="17" fill="#e03030" />
      <path d="M40 44 Q 50 48 46 60 Q 40 56 38 50 Z" fill="#2a7ad0" />
      <path d="M28 38 Q 34 30 42 34 Q 44 40 40 44 Z" fill="#e03030" />
      <circle cx="36" cy="37" r="2.6" fill="#ffffff" />
      <circle cx="36.5" cy="37.5" r="1.3" fill="#222" />
      <path d="M40 38 L 48 40 L 41 43 Z" fill="#e8a020" />
      <path d="M30 42 Q 26 44 28 47" stroke="#c02020" strokeWidth="1" fill="none" />
      <path d="M32 68 Q 30 76 24 82" stroke="#c02020" strokeWidth="2.4" fill="none" />
      <path d="M24 82 Q 20 84 22 87 Q 26 88 27 85" fill="#8a6a3a" stroke="#8a6a3a" strokeWidth="1" />
      <path d="M42 64 Q 46 74 50 80" stroke="#c02020" strokeWidth="2.2" fill="none" />
      <path d="M50 80 Q 54 82 52 85 Q 48 86 47 83" fill="#8a6a3a" stroke="#8a6a3a" strokeWidth="1" />
      <path d="M22 48 Q 16 52 18 60 Q 24 58 26 52 Z" fill="#48c0a0" />
      <path d="M22 26 Q 28 22 32 26" stroke="#2a7ad0" strokeWidth="1.6" fill="none" />
      <circle cx="52" cy="30" r="3" fill="#f8d040" />
      <path d="M52 27 Q 52 23 55 22" stroke="#2a7ad0" strokeWidth="1" fill="none" />
    </>,
  ),
  /* 11 方片（扑克菱形阵）*/
  () => backFrame(
    <>
      <rect x="7" y="7" width="57" height="82" fill="#3a2a6a" />
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <g key={`${r}-${c}`}>
            <path
              d={(() => {
                const cx = 14 + c * 14 + (r % 2 === 0 ? 0 : 7)
                const cy = 16 + r * 13
                return `M ${cx} ${cy - 5} L ${cx + 4} ${cy} L ${cx} ${cy + 5} L ${cx - 4} ${cy} Z`
              })()}
              fill={(r + c) % 2 === 0 ? '#e8e0ff' : '#8a78e0'}
            />
          </g>
        )),
      )}
      <rect x="7" y="7" width="57" height="82" fill="none" stroke="#ffffff" strokeWidth="1.4" />
    </>,
  ),
]

export const CARD_BACK_NAMES = ['经典红', '经典蓝', '宇航', '海滩', '城堡', '热带鱼', '玫瑰', '月夜', '沙漠', '赛车', '鹦鹉', '方片']

/* 牌背组件：任意容器尺寸自适应拉伸（Solitaire 71×96 / Hearts 28×40 共用） */
export function CardBackArt({ idx }: { idx: number }) {
  const Art = CARD_BACK_ART[Math.max(0, Math.min(CARD_BACK_ART.length - 1, idx | 0))] ?? CARD_BACK_ART[1]
  return <>{Art()}</>
}

const GAP = 13
const COL_X = (i: number) => 18 + i * (CW + GAP)

/* 秒数 → m:ss（纸牌计时显示） */
const fmtSolTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const TABLEAU_Y = 128
const STACK_DOWN = 5
const STACK_UP = 18

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

function deal(): Piles {
  const deck: Card[] = []
  let id = 0
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: id++, suit: s as Suit, rank: r, faceUp: false })
  const sh = shuffle(deck)
  const tableau: Card[][] = []
  for (let i = 0; i < 7; i++) {
    const col = sh.splice(0, i + 1)
    col[col.length - 1].faceUp = true
    tableau.push(col)
  }
  return { stock: sh, waste: [], foundations: [[], [], [], []], tableau }
}

const clone = (p: Piles): Piles => ({
  stock: p.stock.map((c) => ({ ...c })),
  waste: p.waste.map((c) => ({ ...c })),
  foundations: p.foundations.map((f) => f.map((c) => ({ ...c }))),
  tableau: p.tableau.map((t) => t.map((c) => ({ ...c }))),
})

type Drag = {
  cards: Card[]
  from: { pile: 'waste' | 'found' | 'tab'; index: number }
  offX: number
  offY: number
  x: number
  y: number
  tableRect: { left: number; top: number }
}

function SolCardView({ card, style, onPointerDown, onDoubleClick }: { card: Card; style: React.CSSProperties; onPointerDown?: (e: React.PointerEvent) => void; onDoubleClick?: () => void }) {
  /* 牌背全局设置（选定纸牌背面对话框；cards.dll 语义） */
  const back = useXP((s) => s.solitaireBack)
  return (
    <div
      className="absolute rounded-[5px] overflow-hidden bg-white shadow-[1px_1px_2px_rgba(0,0,0,0.35)] select-none touch-none"
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {card.faceUp ? (
        <>
          <span className="absolute left-[3px] top-[1px] font-bold leading-[13px] text-[12px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111', fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
            {RANK_STR[card.rank]}
          </span>
          <span className="absolute right-[3px] top-[1px] font-bold leading-[13px] text-[12px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
            {SUIT_CHAR[card.suit]}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[34px]" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
            {SUIT_CHAR[card.suit]}
          </span>
          <span className="absolute left-[3px] bottom-[1px] font-bold text-[12px] rotate-180" style={{ color: isRed(card.suit) ? '#c02020' : '#111' }}>
            {SUIT_CHAR[card.suit]}
          </span>
        </>
      ) : (
        <CardBackArt idx={back} />
      )}
    </div>
  )
}

export default function Solitaire({ win }: { win: WinState }) {
  const [piles, setPiles] = useState<Piles>(deal)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [won, setWon] = useState(false)
  /* 胜利时飞牌动画数据 */
  const [flyCards, setFlyCards] = useState<Array<{ card: Card; x: number; y: number; delay: number; rot: number }>>([])
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  /* 计时（选项「计时游戏」）：首次动牌起表，胜利停表 */
  const [elapsed, setElapsed] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const historyRef = useRef<Piles[]>([])
  const tableRef = useRef<HTMLDivElement>(null)
  /* 纸牌选项（翻牌方式/计分/计时；选项对话框实时改这里） */
  const solitaireOpts = useXP((s) => s.solitaireOpts)

  useEffect(() => {
    if (!timerOn || won) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [timerOn, won])

  const pushHistory = (p: Piles) => {
    historyRef.current.push(clone(p))
    if (historyRef.current.length > 60) historyRef.current.shift()
  }

  const undo = useCallback(() => {
    const h = historyRef.current.pop()
    if (h) {
      setPiles(h)
      setMoves((m) => m + 1)
      setWon(false)
      setFlyCards([])
    }
  }, [])

  const newGame = () => {
    historyRef.current = []
    setPiles(deal())
    setWon(false)
    setScore(0)
    setMoves(0)
    setElapsed(0)
    setTimerOn(false)
    setFlyCards([])
  }

  /* F2 = 发牌（XP 纸牌键位，仅聚焦本窗口时） */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const st = useXP.getState()
      const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
      if (top?.id !== win.id) return
      if (e.key === 'F2') {
        e.preventDefault()
        newGame()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [win.id])

  /* 列表中被点击卡牌的索引 → 数组位置 */
  const findCard = (id: number): { pile: 'stock' | 'waste' | 'found' | 'tab'; index: number; col: number; pos: number } | null => {
    if (piles.stock.find((c) => c.id === id)) return { pile: 'stock', index: 0, col: 0, pos: piles.stock.findIndex((c) => c.id === id) }
    if (piles.waste.find((c) => c.id === id)) return { pile: 'waste', index: 0, col: 0, pos: piles.waste.findIndex((c) => c.id === id) }
    for (let i = 0; i < 4; i++) {
      const pos = piles.foundations[i].findIndex((c) => c.id === id)
      if (pos >= 0) return { pile: 'found', index: i, col: i, pos }
    }
    for (let i = 0; i < 7; i++) {
      const pos = piles.tableau[i].findIndex((c) => c.id === id)
      if (pos >= 0) return { pile: 'tab', index: i, col: i, pos }
    }
    return null
  }

  /* 从牌堆移除若干卡 */
  const takeCards = (p: Piles, loc: { pile: string; index: number; pos: number }, count: number): Card[] => {
    if (loc.pile === 'waste') return p.waste.splice(Math.max(0, loc.pos))
    if (loc.pile === 'found') return p.foundations[loc.index].splice(Math.max(0, loc.pos))
    if (loc.pile === 'tab') return p.tableau[loc.index].splice(Math.max(0, loc.pos))
    return []
  }

  /* 拖拽开始 */
  const startDrag = (card: Card, e: React.PointerEvent) => {
    if (won) return
    const loc = findCard(card.id)
    if (!loc) return
    const rect = tableRef.current!.getBoundingClientRect()
    /* 检查可拖：waste 顶牌 / foundation 顶牌 / tableau 明牌 */
    if (loc.pile === 'waste' && loc.pos !== piles.waste.length - 1) return
    if (loc.pile === 'stock') return
    if (loc.pile === 'tab' && !card.faceUp) return
    let cards: Card[]
    if (loc.pile === 'tab') {
      cards = piles.tableau[loc.index].slice(loc.pos)
      /* 必须连续降序交替色 */
      for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].rank !== cards[i + 1].rank + 1 || isRed(cards[i].suit) === isRed(cards[i + 1].suit)) return
      }
    } else {
      cards = [card]
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ cards, from: { pile: loc.pile as 'waste' | 'found' | 'tab', index: loc.index }, offX: e.clientX - rect.left - cardX(card), offY: e.clientY - rect.top - cardY(card), x: e.clientX, y: e.clientY, tableRect: { left: rect.left, top: rect.top } })
  }

  const cardX = (card: Card): number => {
    const loc = findCard(card.id)
    if (!loc) return 0
    if (loc.pile === 'stock') return COL_X(0)
    if (loc.pile === 'waste') {
      /* 翻三张：顶部最多三张扇形展开（XP 观感）；翻一张堆叠 */
      if (solitaireOpts.draw === 1) return COL_X(1)
      const fan = Math.min(3, piles.waste.length)
      return COL_X(1) + Math.max(0, loc.pos - (piles.waste.length - fan)) * 18
    }
    if (loc.pile === 'found') return COL_X(3 + loc.index)
    return COL_X(loc.index)
  }

  const cardY = (card: Card): number => {
    const loc = findCard(card.id)
    if (!loc) return 0
    if (loc.pile === 'stock' || loc.pile === 'waste' || loc.pile === 'found') return 14
    let y = TABLEAU_Y
    for (let i = 0; i < loc.pos; i++) {
      y += piles.tableau[loc.index][i].faceUp ? STACK_UP : STACK_DOWN
    }
    return y
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return
    const d = drag
    setDrag(null)
    const rect = tableRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    /* 计算落点中心 */
    const cx = px - d.offX + CW / 2
    const cy = py - d.offY + CH / 2

    /* 尝试放到 tableau */
    let target: { pile: 'tab' | 'found'; index: number } | null = null
    for (let i = 0; i < 7; i++) {
      const col = piles.tableau[i]
      const topY = col.length === 0 ? TABLEAU_Y : cardY(col[col.length - 1])
      if (cx > COL_X(i) - 10 && cx < COL_X(i) + CW + 10 && cy > topY - 40 && cy < topY + CH + 60) {
        target = { pile: 'tab', index: i }
        break
      }
    }
    if (!target) {
      for (let i = 0; i < 4; i++) {
        if (Math.abs(cx - (COL_X(3 + i) + CW / 2)) < CW / 2 + 8 && Math.abs(cy - (14 + CH / 2)) < CH / 2 + 16) {
          target = { pile: 'found', index: i }
          break
        }
      }
    }
    if (target) tryMove(d, target)
  }

  const tryMove = (d: Drag, target: { pile: 'tab' | 'found'; index: number }) => {
    const first = d.cards[0]
    setTimerOn(true)
    let ok = false
    if (target.pile === 'tab') {
      const col = piles.tableau[target.index]
      const top = col[col.length - 1]
      if (!top || (top.faceUp && top.rank === first.rank + 1 && isRed(top.suit) !== isRed(first.suit))) {
        /* 空列只允许 K 开头 */
        if (!top && first.rank !== 13) ok = false
        else ok = true
      }
    } else {
      if (d.cards.length === 1) {
        const f = piles.foundations[target.index]
        const top = f[f.length - 1]
        if (first.suit === (top ? top.suit : first.suit) && first.rank === (top ? top.rank + 1 : 1)) ok = true
      }
    }
    if (!ok) return
    pushHistory(piles)
    const next = clone(piles)
    /* 从源移除 */
    const loc = findCard(first.id)!
    const srcPile = loc.pile
    const srcIndex = loc.index
    const srcPos = loc.pos
    if (srcPile === 'waste') next.waste.splice(srcPos)
    else if (srcPile === 'found') next.foundations[srcIndex].splice(srcPos)
    else next.tableau[srcIndex].splice(srcPos)
    /* 计分（选项）：标准=翻牌+5/上基础堆+10；维加斯=牌堆→列+5、列→基础堆+5、牌堆→基础堆+4；无=不计分 */
    const scoring = solitaireOpts.scoring
    if (srcPile === 'tab') {
      const col = next.tableau[srcIndex]
      if (col.length > 0 && !col[col.length - 1].faceUp) {
        col[col.length - 1].faceUp = true
        if (scoring === 'std') setScore((s) => s + 5)
      }
    }
    if (target.pile === 'tab') {
      next.tableau[target.index].push(...d.cards)
      if (scoring === 'vegas' && srcPile === 'waste') setScore((s) => s + 5)
    } else {
      next.foundations[target.index].push(first)
      if (scoring === 'std') setScore((s) => s + 10)
      else if (scoring === 'vegas') setScore((s) => s + (srcPile === 'waste' ? 4 : 5))
    }
    playClick()
    setMoves((m) => m + 1)
    setPiles(next)
    checkWin(next)
  }

  const checkWin = (p: Piles) => {
    if (p.foundations.every((f) => f.length === 13)) {
      setWon(true)
      setScore((s) => (solitaireOpts.scoring === 'std' ? s + 100 : s))
      /* 生成胜利飞牌动画数据 */
      const all = p.foundations.flat()
      const tw = tableRef.current?.clientWidth ?? 500
      const th = tableRef.current?.clientHeight ?? 380
      setFlyCards(
        all.map((card, i) => ({
          card,
          x: Math.random() * Math.max(50, tw - CW),
          y: Math.random() * Math.max(50, th - CH),
          delay: i * 0.07,
          rot: Math.random() * 360 - 180,
        })),
      )
    }
  }

  /* 翻牌堆点击 */
  const clickStock = () => {
    if (won) return
    setTimerOn(true)
    pushHistory(piles)
    const next = clone(piles)
    if (next.stock.length > 0) {
      /* 翻牌方式（选项）：一次翻一张 / 一次翻三张（不足三张翻剩余） */
      const n = solitaireOpts.draw === 3 ? Math.min(3, next.stock.length) : 1
      for (let i = 0; i < n; i++) {
        const c = next.stock.pop()!
        c.faceUp = true
        next.waste.push(c)
      }
    } else if (next.waste.length > 0) {
      next.stock = next.waste.reverse().map((c) => ({ ...c, faceUp: false }))
      next.waste = []
      /* 标准计分：重发 -20；维加斯/无计分不扣 */
      if (solitaireOpts.scoring === 'std') setScore((s) => Math.max(0, s - 20))
    }
    playClick()
    setMoves((m) => m + 1)
    setPiles(next)
  }

  /* 双击自动上基础堆 */
  const autoFoundation = (card: Card) => {
    if (won) return
    for (let i = 0; i < 4; i++) {
      const f = piles.foundations[i]
      const top = f[f.length - 1]
      if (card.suit === (top ? top.suit : card.suit) && card.rank === (top ? top.rank + 1 : 1)) {
        const loc = findCard(card.id)!
        if (loc.pile === 'tab' && loc.pos !== piles.tableau[loc.index].length - 1) return
        if (loc.pile === 'waste' && loc.pos !== piles.waste.length - 1) return
        tryMove({ cards: [card], from: { pile: loc.pile as 'waste', index: loc.index }, offX: 0, offY: 0, x: 0, y: 0, tableRect: { left: 0, top: 0 } }, { pile: 'found', index: i })
        return
      }
    }
  }

  return (
    <div className="flex flex-col h-full select-none">
      <MenuBar
        menus={[
          {
            label: '游戏(G)',
            items: [
              { label: '发牌(D)', accelerator: 'F2', onClick: newGame },
              { label: '撤销(U)', accelerator: 'Ctrl+Z', onClick: undo },
              { separator: true },
              { label: '重发(R)', onClick: newGame },
              { separator: true },
              { label: '选定纸牌背面(B)...', onClick: () => { useXP.getState().openApp('deckopts', {}); playClick() } },
              { label: '选项(O)...', onClick: () => { useXP.getState().openApp('solopts', {}); playClick() } },
              { separator: true },
              { label: '退出(X)', onClick: () => useXP.getState().closeWindow(win.id) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              {
                label: '关于纸牌(A)',
                onClick: () =>
                  useXP.getState().openApp('about', {
                    title: '关于“纸牌”',
                    text: '纸牌（Web 复刻版）\n版本 5.1 (Build 2600)\n\n经典 Klondike 规则：拖动或双击上基础堆，K 开空列。\n胜利时有惊喜（试试就知道了）。',
                  }),
              },
            ],
          },
        ]}
      />
      <div
        ref={tableRef}
        className="flex-1 relative overflow-hidden sol-table touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* 发牌位 */}
        <div data-sol-stock className="absolute rounded-[5px] border-2 border-[#0a5a1a]/70" style={{ left: COL_X(0), top: 14, width: CW, height: CH }} onClick={clickStock} />
        {piles.stock.length > 0 ? (
          <SolCardView
            card={{ id: -1, suit: 0, rank: 0, faceUp: false } as Card}
            style={{ left: COL_X(0), top: 14, width: CW, height: CH, zIndex: 2 }}
            onPointerDown={clickStock}
          />
        ) : null}
        <div className="absolute rounded-[5px] border-2 border-[#0a5a1a]/70" style={{ left: COL_X(1), top: 14, width: CW, height: CH }} />
        {piles.waste.length > 0 ? (
          <SolCardView card={piles.waste[piles.waste.length - 1]} style={{ left: COL_X(1), top: 14, width: CW, height: CH, zIndex: 2 }} onPointerDown={(e) => startDrag(piles.waste[piles.waste.length - 1], e)} onDoubleClick={() => autoFoundation(piles.waste[piles.waste.length - 1])} />
        ) : null}

        {/* 基础堆占位 */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="absolute rounded-[5px] border-2 border-[#0a5a1a]/70 flex items-center justify-center" style={{ left: COL_X(3 + i), top: 14, width: CW, height: CH }}>
            <span className="text-[26px] text-[#0a5a1a]/60">{SUIT_CHAR[i]}</span>
          </div>
        ))}
        {piles.foundations.map((f, i) =>
          f.length > 0 ? <SolCardView key={f[f.length - 1].id} card={f[f.length - 1]} style={{ left: COL_X(3 + i), top: 14, width: CW, height: CH, zIndex: 3 }} onPointerDown={(e) => startDrag(f[f.length - 1], e)} /> : null,
        )}

        {/* 列堆占位 */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="absolute rounded-[5px] border-2 border-[#0a5a1a]/70" style={{ left: COL_X(i), top: TABLEAU_Y, width: CW, height: CH }} />
        ))}

        {/* 列牌 */}
        {piles.tableau.map((col, i) =>
          col.map((card, j) => (
            <SolCardView
              key={card.id}
              card={card}
              style={{ left: COL_X(i), top: cardY(card), width: CW, height: CH, zIndex: 10 + j }}
              onPointerDown={(e) => {
                if (card.faceUp) startDrag(card, e)
              }}
              onDoubleClick={() => card.faceUp && autoFoundation(card)}
            />
          )),
        )}

        {/* 拖拽中的牌 */}
        {drag ? (
          <div className="absolute z-[500]">
            {drag.cards.map((c, i) => (
              <SolCardView
                key={c.id}
                card={c}
                style={{ left: drag.x - drag.tableRect.left - drag.offX, top: drag.y - drag.tableRect.top - drag.offY + i * STACK_UP, width: CW, height: CH, zIndex: 500 + i }}
              />
            ))}
          </div>
        ) : null}

        {/* 胜利动画 */}
        {won ? (
          <>
            {flyCards.map((fc) => (
              <SolCardView
                key={fc.card.id}
                card={fc.card}
                style={{
                  left: COL_X(3) + 40,
                  top: 14,
                  width: CW,
                  height: CH,
                  zIndex: 900,
                  animation: `solFly 1.6s ease-in ${fc.delay}s forwards`,
                  ['--fx' as string]: `${fc.x - (COL_X(3) + 40)}px`,
                  ['--fy' as string]: `${fc.y - 14}px`,
                  ['--rot' as string]: `${fc.rot}deg`,
                }}
              />
            ))}
            <div className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none">
              <div className="bg-black/55 text-white rounded px-6 py-4 text-center">
                <div className="text-[18px] font-bold mb-1">优 + 胜！</div>
                <div className="text-[12px]">{[solitaireOpts.scoring === 'none' ? null : `得分 ${score}`, solitaireOpts.timed ? `用时 ${fmtSolTime(elapsed)}` : null, `${moves} 步`].filter(Boolean).join(' · ')}</div>
                <div className="text-[11px] opacity-70 mt-1">按 F2 或「游戏 → 发牌」再来一局</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="h-[20px] bg-[#ece9d8] border-t border-[#d8d5c8] flex items-center text-[11px] px-2 gap-4">
        {solitaireOpts.scoring === 'none' ? <span>计分: 无</span> : <span>得分: {score}</span>}
        <span>步数: {moves}</span>
        {solitaireOpts.timed ? <span>时间: {fmtSolTime(elapsed)}</span> : null}
        <span className="flex-1" />
        <span className="text-[#4a5a4a]">拖动卡牌 / 双击自动收牌 · 翻牌: 一次{solitaireOpts.draw === 3 ? '三' : '一'}张</span>
      </div>
    </div>
  )
}

/* ═══════════════════ 选定纸牌背面对话框（XP 游戏 → 选定纸牌背面）═══════════════════
 * 4×3 网格十二款牌背；单击选中（蓝框）、双击直接确定；确定落库 / 取消还原 */
export function DeckOptions({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setSolitaireBack = useXP((s) => s.setSolitaireBack)
  const [sel, setSel] = useState(() => useXP.getState().solitaireBack)

  const apply = () => {
    setSolitaireBack(sel)
    playClick()
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <div className="flex-1 overflow-y-auto xp-thin-scroll p-3">
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 justify-items-center">
          {CARD_BACK_ART.map((_, i) => (
            <button
              key={i}
              type="button"
              title={CARD_BACK_NAMES[i]}
              onClick={() => setSel(i)}
              onDoubleClick={() => { apply(); closeWindow(win.id) }}
              className={`p-[3px] rounded-[3px] border-2 ${sel === i ? 'border-[#316ac5] bg-[#cfe0f5]' : 'border-transparent hover:border-[#9ab8e0]'}`}
            >
              <div className="w-[64px] h-[86px] rounded-[4px] overflow-hidden shadow-[1px_1px_2px_rgba(0,0,0,0.3)]">
                <CardBackArt idx={i} />
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-3 pb-3">
        <XPButton primary autoFocus onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 纸牌选项对话框（XP 游戏 → 选项）═══════════════════
 * 翻牌方式（一次翻一张/三张）· 得分（无/标准/维加斯）· 计时游戏
 * 翻牌与计分实时作用于当前牌局（XP 语义为下一局生效——这里即时生效更直观，新局计分清零） */
export function SolOptions({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setSolitaireOpts = useXP((s) => s.setSolitaireOpts)
  const setRect = useXP((s) => s.setRect)
  const [draft, setDraft] = useState(() => ({ ...useXP.getState().solitaireOpts }))
  /* 确定按钮闭包永远读最新 draft（防高负载下渲染延迟导致的旧值提交；effect 同步为 lint 合规写法） */
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  })

  useEffect(() => {
    setRect(win.id, { w: 320, h: 262 })
    const vw = window.innerWidth
    setRect(win.id, { x: Math.round((vw - 320) / 2), y: 150, w: 320, h: 262 })
  }, [setRect, win.id])

  const apply = () => {
    setSolitaireOpts({ ...draftRef.current })
    playClick()
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-4 text-[11px]">
      <div className="font-bold">选项</div>
      <div className="mt-3 space-y-4">
        <div>
          <div className="font-bold mb-[2px]">翻牌方式:</div>
          <div className="pl-3 space-y-[2px]">
            <XPRadio checked={draft.draw === 1} label="一次翻一张牌(R)" onChange={() => setDraft((p) => ({ ...p, draw: 1 }))} />
            <XPRadio checked={draft.draw === 3} label="一次翻三张牌(D)" onChange={() => setDraft((p) => ({ ...p, draw: 3 }))} />
          </div>
        </div>
        <div>
          <div className="font-bold mb-[2px]">得分:</div>
          <div className="pl-3 space-y-[2px]">
            <XPRadio checked={draft.scoring === 'none'} label="无(N)" onChange={() => setDraft((p) => ({ ...p, scoring: 'none' }))} />
            <XPRadio checked={draft.scoring === 'std'} label="标准(S)" onChange={() => setDraft((p) => ({ ...p, scoring: 'std' }))} />
            <XPRadio checked={draft.scoring === 'vegas'} label="维加斯(V)" onChange={() => setDraft((p) => ({ ...p, scoring: 'vegas' }))} />
          </div>
        </div>
        <XPCheckbox checked={draft.timed} label="计时游戏(T)" onChange={(v) => setDraft((p) => ({ ...p, timed: v }))} />
      </div>
      <div className="flex-1" />
      <div className="flex justify-end gap-2">
        <XPButton primary autoFocus onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}
