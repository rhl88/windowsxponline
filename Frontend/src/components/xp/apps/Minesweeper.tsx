'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton } from '../ui'
import { MineSmiley } from '../app-icons'
import { playClick } from '../sounds'
import { imeEnter } from '../ime-keys'

/* ── 七段数码管 ── */
const SEGS: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
}

function Digit({ ch }: { ch: string }) {
  const s = SEGS[ch] ?? SEGS['0']
  const on = (i: number) => (s[i] ? '#f42424' : '#3a0808')
  return (
    <svg width="15" height="26" viewBox="0 0 13 23" className="block">
      <rect x="2.2" y="1" width="8.6" height="2.4" rx="1" fill={on(0)} />
      <rect x="10.5" y="3" width="2.4" height="7.6" rx="1" fill={on(1)} />
      <rect x="10.5" y="12.2" width="2.4" height="7.6" rx="1" fill={on(2)} />
      <rect x="2.2" y="19.6" width="8.6" height="2.4" rx="1" fill={on(3)} />
      <rect x="0.1" y="12.2" width="2.4" height="7.6" rx="1" fill={on(4)} />
      <rect x="0.1" y="3" width="2.4" height="7.6" rx="1" fill={on(5)} />
      <rect x="2.4" y="10.6" width="8.2" height="2.4" rx="1" fill={on(6)} />
    </svg>
  )
}

function LED({ value }: { value: number }) {
  const v = Math.max(-99, Math.min(999, value))
  const str = v < 0 ? `-${String(Math.abs(v)).padStart(2, '0')}` : String(v).padStart(3, '0')
  return (
    <div className="inline-flex gap-[1px] bg-black px-[2px] py-[1px] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white">
      {str.split('').map((c, i) => (
        <Digit key={i} ch={c} />
      ))}
    </div>
  )
}

/* ── 小红旗 ── */
function FlagGlyph() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13">
      <rect x="5.4" y="3" width="1.4" height="10" fill="#222" />
      <path d="M6.6 3 h4.6 l-2 1.8 l2 1.7 h-4.6 Z" fill="#e02020" />
      <rect x="3.4" y="11.4" width="5.4" height="1.8" fill="#222" />
    </svg>
  )
}

function MineGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="4" fill="#111" />
      <rect x="6.4" y="0.6" width="1.2" height="12.8" fill="#111" />
      <rect x="0.6" y="6.4" width="12.8" height="1.2" fill="#111" />
      <rect x="2.4" y="2.4" width="9.2" height="9.2" fill="none" stroke="#111" strokeWidth="1.1" transform="rotate(45 7 7)" />
      <circle cx="5.6" cy="5.6" r="1.2" fill="#fff" />
    </svg>
  )
}

const NUM_COLORS = ['', '#1428e0', '#0d7d22', '#d01818', '#101096', '#7a0d0d', '#0d7d7a', '#101010', '#7a7a7a']

type Level = { key: string; w: number; h: number; mines: number; label: string }
const LEVELS: Level[] = [
  { key: 'beginner', w: 9, h: 9, mines: 10, label: '初级' },
  { key: 'intermediate', w: 16, h: 16, mines: 40, label: '中级' },
  { key: 'expert', w: 30, h: 16, mines: 99, label: '高级' },
]

interface Cell {
  mine: boolean
  open: boolean
  flag: boolean
  adj: number
}

function buildField(lv: Level, safeIdx: number | null): Cell[] {
  const cells: Cell[] = Array.from({ length: lv.w * lv.h }, () => ({ mine: false, open: false, flag: false, adj: 0 }))
  if (safeIdx === null) {
    let placed = 0
    while (placed < lv.mines) {
      const i = Math.floor(Math.random() * cells.length)
      if (!cells[i].mine) {
        cells[i].mine = true
        placed++
      }
    }
  } else {
    const sx = safeIdx % lv.w
    const sy = Math.floor(safeIdx / lv.w)
    const forbidden = new Set<number>([safeIdx])
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = sx + dx
        const ny = sy + dy
        if (nx >= 0 && nx < lv.w && ny >= 0 && ny < lv.h) forbidden.add(ny * lv.w + nx)
      }
    let placed = 0
    while (placed < lv.mines) {
      const i = Math.floor(Math.random() * cells.length)
      if (!cells[i].mine && !forbidden.has(i)) {
        cells[i].mine = true
        placed++
      }
    }
  }
  /* 计算相邻数 */
  for (let i = 0; i < cells.length; i++) {
    const x = i % lv.w
    const y = Math.floor(i / lv.w)
    let n = 0
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < lv.w && ny >= 0 && ny < lv.h && cells[ny * lv.w + nx].mine) n++
      }
    cells[i].adj = n
  }
  return cells
}

export default function Minesweeper({ win }: { win: WinState }) {
  const [level, setLevel] = useState<Level>(LEVELS[0])
  const [cells, setCells] = useState<Cell[]>(() => buildField(LEVELS[0], null))
  const [state, setState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready')
  const [time, setTime] = useState(0)
  const [pressing, setPressing] = useState(false)
  const [best, setBest] = useState<Record<string, number>>({})
  /* 自定义棋盘对话框（XP 游戏菜单 → 自定义…）：高 9-24 / 宽 9-30 / 雷 1-(w*h-10)，确定时钳位 */
  const [customDlg, setCustomDlg] = useState<{ h: string; w: string; m: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const setRect = useXP((s) => s.setRect)

  /* 自适应窗口尺寸 */
  useEffect(() => {
    const w = Math.max(180, level.w * 16 + 24)
    const h = level.h * 16 + 105
    setRect(win.id, { w, h })
  }, [level, setRect, win.id])

  const reset = useCallback(
    (lv: Level) => {
      setCells(buildField(lv, null))
      setState('ready')
      setTime(0)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    },
    [],
  )

  /* F2 = 新游戏（XP 扫雷键位，仅聚焦本窗口时） */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const st = useXP.getState()
      const top = st.windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
      if (top?.id !== win.id) return
      if (e.key === 'F2') {
        e.preventDefault()
        reset(level)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [win.id, level, reset])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startTimer = () => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const flags = useMemo(() => cells.filter((c) => c.flag).length, [cells])

  const revealAll = (arr: Cell[]) => {
    for (const c of arr) if (c.mine) c.open = true
  }

  const checkWin = (arr: Cell[]) => arr.every((c) => c.open || c.mine)

  const openCell = (idx: number) => {
    if (state === 'won' || state === 'lost') return
    let arr = cells
    if (state === 'ready') {
      /* 首次点击保证安全 */
      arr = buildField(level, idx)
      setState('playing')
      startTimer()
    }
    const next = arr.map((c) => ({ ...c }))
    if (next[idx].open || next[idx].flag) return
    /* 洪水填充展开 */
    const stack = [idx]
    while (stack.length) {
      const i = stack.pop()!
      const c = next[i]
      if (c.open || c.flag) continue
      c.open = true
      if (c.adj === 0 && !c.mine) {
        const x = i % level.w
        const y = Math.floor(i / level.w)
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < level.w && ny >= 0 && ny < level.h) {
              const ni = ny * level.w + nx
              if (!next[ni].open && !next[ni].mine) stack.push(ni)
            }
          }
      }
    }
    if (next[idx].mine) {
      revealAll(next)
      next[idx].open = true
      setCells(next)
      setState('lost')
      stopTimer()
      return
    }
    setCells(next)
    if (checkWin(next)) {
      setState('won')
      stopTimer()
      /* XP 行为：自定义棋盘不进英雄榜 */
      if (level.key !== 'custom') setBest((b) => ({ ...b, [level.key]: Math.min(b[level.key] ?? 999, time || 1) }))
      /* 胜利时自动插旗 */
      setCells(next.map((c) => (c.mine ? { ...c, flag: true } : c)))
    }
  }

  const toggleFlag = (idx: number) => {
    if (state === 'won' || state === 'lost') return
    if (cells[idx].open) return
    playClick()
    setCells(cells.map((c, i) => (i === idx ? { ...c, flag: !c.flag } : c)))
  }

  /* 双击和弦：周围旗数满足则展开邻居 */
  const chord = (idx: number) => {
    if (state !== 'playing') return
    const c = cells[idx]
    if (!c.open || c.adj === 0) return
    const x = idx % level.w
    const y = Math.floor(idx / level.w)
    let f = 0
    const neighbors: number[] = []
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if ((dx || dy) && nx >= 0 && nx < level.w && ny >= 0 && ny < level.h) {
          const ni = ny * level.w + nx
          if (cells[ni].flag) f++
          else neighbors.push(ni)
        }
      }
    if (f === c.adj) {
      for (const n of neighbors) openCell(n)
    }
  }

  const smiley = state === 'won' ? 'win' : state === 'lost' ? 'lose' : pressing ? 'press' : 'normal'

  /* 自定义棋盘：确定 → 钳位到 XP 边界（高 9-24 / 宽 9-30 / 雷 ≤(h-1)(w-1)，30×24 上限 667）并开局
   * 读 customDlgRef 防高负载下渲染延迟导致的旧值提交（effect 同步为 lint 合规写法） */
  const customDlgRef = useRef(customDlg)
  useEffect(() => {
    customDlgRef.current = customDlg
  })
  const applyCustom = () => {
    const d = customDlgRef.current
    if (!d) return
    const h = Math.max(9, Math.min(24, parseInt(d.h || '9', 10) || 9))
    const w = Math.max(9, Math.min(30, parseInt(d.w || '9', 10) || 9))
    const m = Math.max(1, Math.min((h - 1) * (w - 1), parseInt(d.m || '10', 10) || 10))
    const lv: Level = { key: 'custom', w, h, mines: m, label: '自定义' }
    playClick()
    setLevel(lv)
    reset(lv)
    setCustomDlg(null)
  }

  return (
    <div className="relative flex flex-col h-full select-none xp-minesweeper">
      <MenuBar
        menus={[
          {
            label: '游戏(G)',
            items: [
              { label: '新游戏(N)', accelerator: 'F2', onClick: () => reset(level) },
              { separator: true },
              ...LEVELS.map((lv) => ({
                label: lv.label,
                checked: lv.key === level.key,
                onClick: () => {
                  setLevel(lv)
                  reset(lv)
                },
              })),
              {
                label: '自定义(C)...',
                checked: level.key === 'custom',
                onClick: () => setCustomDlg({ h: String(Math.min(24, level.h)), w: String(Math.min(30, level.w)), m: String(level.mines) }),
              },
              { separator: true },
              {
                label: '扫雷英雄榜(T)...',
                onClick: () =>
                  useXP.getState().openApp('dialog', {
                    kind: 'info',
                    title: '扫雷英雄榜',
                    text: `复刻版最佳成绩：\n初级：${best.beginner ? `${best.beginner} 秒` : '999 秒'}\n中级：${best.intermediate ? `${best.intermediate} 秒` : '999 秒'}\n高级：${best.expert ? `${best.expert} 秒` : '999 秒'}`,
                  }),
              },
              { separator: true },
              { label: '退出(X)', onClick: () => useXP.getState().closeWindow(win.id) },
            ],
          },
          {
            label: '帮助(H)',
            items: [
              {
                label: '关于扫雷(A)',
                onClick: () =>
                  useXP.getState().openApp('about', {
                    title: '关于“扫雷”',
                    text: '扫雷（Web 复刻版）\n版本 5.1 (Build 2600)\n\n左键翻开，右键插旗，双击已翻开的数字可快速展开。\n首次点击永远安全——比真实 XP 更贴心。',
                  }),
              },
            ],
          },
        ]}
      />

      <div className="flex-1 p-[6px] bg-[#c0c0c0]">
        {/* 面板 */}
        <div className="border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] p-[5px] inline-block">
          <div className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-[3px] flex items-center justify-between mb-[6px] min-w-[150px]">
            <LED value={level.mines - flags} />
            <button
              type="button"
              className="w-[28px] h-[28px] flex items-center justify-center border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] active:border-2 active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white active:pt-[2px]"
              onClick={() => reset(level)}
            >
              <MineSmiley size={22} state={smiley as 'normal' | 'press' | 'win' | 'lose'} />
            </button>
            <LED value={time} />
          </div>

          {/* 雷区 */}
          <div
            className="border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white inline-block"
            onPointerDown={() => setPressing(true)}
            onPointerUp={() => setPressing(false)}
            onPointerLeave={() => setPressing(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {cells.map((c, i) => {
              const revealed = c.open || (state === 'lost' && c.mine)
              const isBoom = state === 'lost' && c.open && c.mine
              return (
                <button
                  key={i}
                  type="button"
                  className={`ms-cell ${revealed ? 'ms-open' : ''} ${isBoom ? 'ms-boom' : ''}`}
                  onClick={() => openCell(i)}
                  onDoubleClick={() => chord(i)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    toggleFlag(i)
                  }}
                >
                  {c.flag && !c.open ? <FlagGlyph /> : null}
                  {!c.flag && c.open && c.mine ? <MineGlyph /> : null}
                  {c.open && !c.mine && c.adj > 0 ? (
                    <span style={{ color: NUM_COLORS[c.adj] }} className="font-bold text-[12px] leading-none">
                      {c.adj}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {state === 'won' || state === 'lost' ? (
            <div className="text-[11px] text-center mt-[5px]">
              {state === 'won' ? '胜利！双击笑脸再来一局' : '踩雷了！单击笑脸重开'}
            </div>
          ) : (
            <div className="text-[10px] text-[#606060] text-center mt-[5px] leading-[13px]">左键翻开 · 右键插旗 · 双击数字快开</div>
          )}
        </div>
      </div>

      {/* XP「自定义棋盘」对话框：居中模态（窗口内） */}
      {customDlg ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-[#ece9d8] border-2 border-white border-r-[#7f7f7f] border-b-[#7f7f7f] shadow-[2px_2px_4px_rgba(0,0,0,0.35)] p-3 w-[196px]">
            <div className="text-[11px] font-bold mb-2">自定义棋盘</div>
            <div className="space-y-[6px]">
              {([
                ['高度(H):', 'h'],
                ['宽度(W):', 'w'],
                ['雷数(M):', 'm'],
              ] as const).map(([label, k]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[11px] w-[56px]">{label}</span>
                  <input
                    className="xp-sunken bg-white h-[20px] w-[60px] px-1 text-[11px] outline-none"
                    value={customDlg[k]}
                    autoFocus={k === 'h'}
                    onChange={(e) => setCustomDlg({ ...customDlg, [k]: e.target.value.replace(/[^0-9]/g, '') })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setCustomDlg(null)
                        return
                      }
                      imeEnter(e, () => applyCustom())
                    }}
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <XPButton primary onClick={() => applyCustom()}>
                确定
              </XPButton>
              <XPButton onClick={() => setCustomDlg(null)}>取消</XPButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
