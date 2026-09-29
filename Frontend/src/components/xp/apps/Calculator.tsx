'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP, type CtxItem } from '../store'
import { MenuBar } from '../ui'

type Op = '+' | '-' | '×' | '÷' | null
type Mode = 'standard' | 'scientific'
type Angle = 'deg' | 'rad'
type Base = 16 | 10 | 8 | 2

/* 进制显示/解析工具 */
const toBaseStr = (n: number, b: Base): string => {
  const v = Math.trunc(n)
  if (v === 0) return '0'
  const neg = v < 0
  const av = Math.abs(v)
  const digits = '0123456789ABCDEF'
  let out = ''
  let x = av
  while (x > 0) { out = digits[x % b] + out; x = Math.floor(x / b) }
  return (neg ? '-' : '') + out
}
const parseBase = (s: string, b: Base): number => {
  const neg = s.startsWith('-')
  const body = neg ? s.slice(1) : s
  const v = parseInt(body || '0', b)
  return isFinite(v) ? (neg ? -v : v) : NaN
}
const digitOk = (d: string, b: Base): boolean => {
  if (b === 16) return /^[0-9A-F]$/.test(d)
  if (b === 10) return /^[0-9]$/.test(d)
  if (b === 8) return /^[0-7]$/.test(d)
  return /^[01]$/.test(d)
}

function CalcBtn({ label, onClick, color, wide, small }: { label: string; onClick?: () => void; color?: 'red' | 'blue'; wide?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`xp-btn h-[26px] ${wide ? 'col-span-2' : ''} ${small ? 'text-[10px]' : 'text-[11px]'} active:pt-[2px]`}
      style={{ color: color === 'red' ? '#a03030' : color === 'blue' ? '#23539a' : '#1a1a1a' }}
    >
      {label}
    </button>
  )
}

/* 单选小按钮（进制/角度制，XP 科学型左侧栏） */
function RadioTab({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-[20px] text-[11px] text-left px-[6px] rounded-[2px] ${checked ? 'bg-[#d8e5f8] border border-[#7a9ad0] font-bold' : 'hover:bg-[#e8eef8] border border-transparent'}`}
      style={{ color: '#1a1a1a' }}
    >
      {label}
    </button>
  )
}

export default function Calculator({ win }: { win: WinState }) {
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<Op>(null)
  const [fresh, setFresh] = useState(true)
  const [memory, setMemory] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>('standard')
  const [angle, setAngle] = useState<Angle>('deg')
  const [base, setBase] = useState<Base>(10)
  const setWinSize = useXP((s) => s.setWinSize)

  const fmt = (n: number) => {
    if (!isFinite(n)) return '溢出'
    if (base !== 10) return toBaseStr(n, base) /* 非十进制：取整显示（XP 行为） */
    const s = +n.toPrecision(14)
    return String(s)
  }

  /* 当前显示值（按当前进制解析） */
  const curVal = () => (base === 10 ? parseFloat(display) : parseBase(display, base))

  const inputDigit = (d: string) => {
    if (base !== 10 && !digitOk(d, base)) return /* 越界数字忽略（XP 行为） */
    setDisplay((prev) => {
      if (fresh || prev === '0') return d === '.' ? '0.' : d
      if (d === '.' && prev.includes('.')) return prev
      return prev.length >= 18 ? prev : prev + d
    })
    setFresh(false)
  }

  /* 切换进制：当前值换算到新进制显示（XP 真实行为） */
  const switchBase = (b: Base) => {
    if (b === base) return
    const v = curVal()
    setBase(b)
    if (isFinite(v)) setDisplay(toBaseStr(v, b))
    setFresh(true)
  }

  const compute = (a: number, b: number, o: Op): number | 'error' => {
    switch (o) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? 'error' : a / b
      default: return b
    }
  }

  const applyOp = (nextOp: Op) => {
    const cur = curVal()
    if (acc !== null && op && !fresh) {
      const r = compute(acc, cur, op)
      if (r === 'error') {
        setDisplay('除数不能为零')
        setAcc(null)
        setOp(null)
        setFresh(true)
        return
      }
      setAcc(r)
      setDisplay(fmt(r))
    } else {
      setAcc(cur)
    }
    setOp(nextOp)
    setFresh(true)
  }

  const equals = () => {
    const cur = curVal()
    if (acc !== null && op) {
      const r = compute(acc, cur, op)
      if (r === 'error') {
        setDisplay('除数不能为零')
        setAcc(null)
        setOp(null)
        setFresh(true)
        return
      }
      setDisplay(fmt(r))
      setAcc(null)
      setOp(null)
      setFresh(true)
    }
  }

  const clearAll = () => {
    setDisplay('0')
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  const unary = (kind: 'sqrt' | 'inv' | 'neg' | 'pct') => {
    const cur = curVal()
    let r: number
    switch (kind) {
      case 'sqrt':
        if (cur < 0) {
          setDisplay('函数输入无效')
          setFresh(true)
          return
        }
        r = Math.sqrt(cur)
        break
      case 'inv':
        if (cur === 0) {
          setDisplay('除数不能为零')
          setFresh(true)
          return
        }
        r = 1 / cur
        break
      case 'neg':
        r = -cur
        break
      case 'pct':
        r = (acc ?? 0) * (cur / 100)
        break
    }
    setDisplay(fmt(r))
    setFresh(true)
  }

  /* ── 科学型函数 ── */
  const trig = (fn: 'sin' | 'cos' | 'tan') => {
    const cur = curVal()
    const v = angle === 'deg' ? (cur * Math.PI) / 180 : cur
    const r = fn === 'sin' ? Math.sin(v) : fn === 'cos' ? Math.cos(v) : Math.tan(v)
    setDisplay(fmt(+r.toFixed(12)))
    setFresh(true)
  }

  const invTrig = (fn: 'asin' | 'acos' | 'atan') => {
    const cur = curVal()
    if ((fn !== 'atan' && (cur > 1 || cur < -1))) {
      setDisplay('函数输入无效')
      setFresh(true)
      return
    }
    let r = fn === 'asin' ? Math.asin(cur) : fn === 'acos' ? Math.acos(cur) : Math.atan(cur)
    if (angle === 'deg') r = (r * 180) / Math.PI
    setDisplay(fmt(+r.toFixed(12)))
    setFresh(true)
  }

  const sciFn = (kind: 'ln' | 'log' | 'sq' | 'cube' | 'exp10' | 'expe' | 'fact' | 'pi' | 'e') => {
    const cur = curVal()
    let r: number
    switch (kind) {
      case 'ln': r = Math.log(cur); break
      case 'log': r = Math.log10(cur); break
      case 'sq': r = cur * cur; break
      case 'cube': r = cur * cur * cur; break
      case 'exp10': r = Math.pow(10, cur); break
      case 'expe': r = Math.exp(cur); break
      case 'fact': {
        if (cur < 0 || cur > 170 || cur !== Math.floor(cur)) {
          setDisplay('函数输入无效')
          setFresh(true)
          return
        }
        r = 1
        for (let i = 2; i <= cur; i++) r *= i
        break
      }
      case 'pi': r = Math.PI; break
      case 'e': r = Math.E; break
    }
    if (!isFinite(r)) {
      setDisplay('函数输入无效')
      setFresh(true)
      return
    }
    setDisplay(fmt(r))
    setFresh(true)
  }

  const pow = () => {
    const cur = curVal()
    if (acc !== null) {
      setDisplay(fmt(Math.pow(acc, cur)))
      setAcc(null)
    } else {
      setAcc(cur)
      setFresh(true)
    }
  }

  const mod = () => {
    /* Mod：直接对 acc 取余当前值 */
    const cur = curVal()
    if (acc !== null) {
      setDisplay(cur === 0 ? '除数不能为零' : fmt(acc % cur))
      setAcc(null)
      setFresh(true)
    } else {
      setAcc(cur)
      setFresh(true)
    }
  }

  /* 进制显示（科学型顶部行；按当前值换算四进制同步显示） */
  const toBase = (b: number) => {
    const cur = curVal()
    if (!isFinite(cur) || !Number.isInteger(cur)) return ''
    let v = Math.trunc(cur)
    const neg = v < 0
    v = Math.abs(v)
    let out = ''
    const digits = '0123456789ABCDEF'
    if (v === 0) out = '0'
    while (v > 0) {
      out = digits[v % b] + out
      v = Math.floor(v / b)
    }
    return (neg ? '-' : '') + out
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setBase(10) /* 回到标准型重置十进制（XP 行为） */
    setWinSize(win.id, m === 'scientific' ? 470 : 272, m === 'scientific' ? 380 : 346)
    clearAll()
  }

  /* 键盘支持 */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (useXP.getState().windows.find((w) => w.id === win.id && w.z === useXP.getState().zTop) === undefined) return
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key)
      else if (base === 16 && /^[a-fA-F]$/.test(e.key)) inputDigit(e.key.toUpperCase())
      else if (e.key === '.') inputDigit('.')
      else if (e.key === '+') applyOp('+')
      else if (e.key === '-') applyOp('-')
      else if (e.key === '*') applyOp('×')
      else if (e.key === '/') applyOp('÷')
      else if (e.key === 'Enter' || e.key === '=') equals()
      else if (e.key === 'Escape') clearAll()
      else if (e.key === 'Backspace') setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : '0'))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [display, acc, op, fresh, win.id, inputDigit, applyOp, equals, clearAll])

  const hex = toBase(16)
  const dec = toBase(10)
  const oct = toBase(8)
  const bin = toBase(2)

  return (
    <div className="flex flex-col h-full select-none bg-[#ece9d8] overflow-hidden">
      <MenuBar
        menus={[
          { label: '查看(V)', items: [
            { label: '标准型(T)', checked: mode === 'standard', onClick: () => switchMode('standard') },
            { label: '科学型(S)', checked: mode === 'scientific', onClick: () => switchMode('scientific') },
            { separator: true },
            { label: '数字分组(I)' },
          ] },
          { label: '编辑(E)', items: [
            { label: '复制', accelerator: 'Ctrl+C', onClick: () => navigator.clipboard?.writeText(display).catch(() => {}) },
            { label: '粘贴', accelerator: 'Ctrl+V', disabled: true },
          ] },
          { label: '帮助(H)', items: [
            { label: '关于计算器(A)', onClick: () => useXP.getState().openApp('about', { title: '关于"计算器"', text: '计算器（Web 复刻版）\n版本 5.1 (Build 2600)\n\n标准型 + 科学型（三角/对数/幂/阶乘/进制转换）。\n除以零会得到和 XP 一模一样的抱怨。' }) },
          ] },
        ]}
      />
      {/* 显示屏 */}
      <div className="px-[6px] pt-[3px]">
        <div className="xp-calc-screen flex items-center justify-end px-2 h-[34px]">
          <span className="text-[#1a2a5a] text-[13px] w-[14px]">{memory !== null ? 'M' : ''}</span>
          <span className="flex-1 text-right text-[20px] text-[#1a2a5a] font-['Tahoma'] overflow-hidden">{display}</span>
        </div>
        {/* 科学型：进制行 */}
        {mode === 'scientific' ? (
          <div className="mt-[4px] mx-[2px] grid grid-cols-2 gap-x-[10px] gap-y-[1px] text-[11px] text-[#1a1a1a] font-['Tahoma'] select-none">
            <span className="text-[#555]">十六进制 <span className="text-[#a03030] font-bold">{hex || '—'}</span></span>
            <span className="text-[#555]">十进制 <span className="text-[#23539a] font-bold">{dec || '—'}</span></span>
            <span className="text-[#555]">八进制 <span className="text-[#555] font-bold">{oct || '—'}</span></span>
            <span className="text-[#555]">二进制 <span className="text-[#555] font-bold">{bin || '—'}</span></span>
          </div>
        ) : null}
      </div>

      {mode === 'scientific' ? (
        /* ── 科学型布局：左侧进制/角度栏 + 函数区 + 数字区 ── */
        <div className="flex-1 p-[6px] flex gap-[6px] min-h-0">
          {/* 左栏：进制单选 + 角度制 */}
          <div className="w-[86px] shrink-0 flex flex-col gap-[2px] pt-[2px]">
            <div className="text-[10px] text-[#555] mb-[1px]">&nbsp;</div>
            <RadioTab label="十六进制" checked={base === 16} onClick={() => switchBase(16)} />
            <RadioTab label="十进制" checked={base === 10} onClick={() => switchBase(10)} />
            <RadioTab label="八进制" checked={base === 8} onClick={() => switchBase(8)} />
            <RadioTab label="二进制" checked={base === 2} onClick={() => switchBase(2)} />
            <div className="text-[10px] text-[#555] mt-[6px]">角度单位</div>
            <RadioTab label="角度" checked={angle === 'deg'} onClick={() => setAngle('deg')} />
            <RadioTab label="弧度" checked={angle === 'rad'} onClick={() => setAngle('rad')} />
          </div>
          {/* 右区 */}
          <div className="flex-1 flex flex-col gap-[5px] min-w-0">
            {/* 记忆行 */}
            <div className="grid grid-cols-4 gap-[4px]">
              <CalcBtn label="MC" color="red" onClick={() => setMemory(null)} />
              <CalcBtn label="MR" color="red" onClick={() => memory !== null && setDisplay(fmt(memory))} />
              <CalcBtn label="MS" color="red" onClick={() => setMemory(curVal())} />
              <CalcBtn label="M+" color="red" onClick={() => setMemory((m) => (m ?? 0) + curVal())} />
            </div>
            {/* A-F 键区（仅十六进制可输入，其余进制置灰——XP 科学型行为） */}
            <div className="grid grid-cols-6 gap-[4px]">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={base !== 16}
                  onClick={() => inputDigit(h)}
                  className={`xp-btn h-[26px] text-[11px] ${base === 16 ? '' : 'opacity-40'}`}
                  style={{ color: '#23539a' }}
                >
                  {h}
                </button>
              ))}
            </div>
            {/* 函数区 3 行 */}
            <div className="grid grid-cols-6 gap-[4px]">
              <CalcBtn label="sin" small onClick={() => trig('sin')} />
              <CalcBtn label="cos" small onClick={() => trig('cos')} />
              <CalcBtn label="tan" small onClick={() => trig('tan')} />
              <CalcBtn label="ln" small onClick={() => sciFn('ln')} />
              <CalcBtn label="log" small onClick={() => sciFn('log')} />
              <CalcBtn label="n!" small onClick={() => sciFn('fact')} />
              <CalcBtn label="x²" small onClick={() => sciFn('sq')} />
              <CalcBtn label="x³" small onClick={() => sciFn('cube')} />
              <CalcBtn label="x^y" small onClick={pow} />
              <CalcBtn label="10^x" small onClick={() => sciFn('exp10')} />
              <CalcBtn label="e^x" small onClick={() => sciFn('expe')} />
              <CalcBtn label="π" small onClick={() => sciFn('pi')} />
            </div>
            {/* 数字区 */}
            <div className="grid grid-cols-5 gap-[4px]">
              <CalcBtn label="Inv-sin" small onClick={() => invTrig('asin')} />
              <CalcBtn label="Inv-cos" small onClick={() => invTrig('acos')} />
              <CalcBtn label="Inv-tan" small onClick={() => invTrig('atan')} />
              <CalcBtn label="±" onClick={() => unary('neg')} />
              <CalcBtn label="√" onClick={() => unary('sqrt')} />

              <CalcBtn label="7" onClick={() => inputDigit('7')} />
              <CalcBtn label="8" onClick={() => inputDigit('8')} />
              <CalcBtn label="9" onClick={() => inputDigit('9')} />
              <CalcBtn label="÷" color="red" onClick={() => applyOp('÷')} />
              <CalcBtn label="Mod" small onClick={mod} />

              <CalcBtn label="4" onClick={() => inputDigit('4')} />
              <CalcBtn label="5" onClick={() => inputDigit('5')} />
              <CalcBtn label="6" onClick={() => inputDigit('6')} />
              <CalcBtn label="×" color="red" onClick={() => applyOp('×')} />
              <CalcBtn label="1/x" onClick={() => unary('inv')} />

              <CalcBtn label="1" onClick={() => inputDigit('1')} />
              <CalcBtn label="2" onClick={() => inputDigit('2')} />
              <CalcBtn label="3" onClick={() => inputDigit('3')} />
              <CalcBtn label="−" color="red" onClick={() => applyOp('-')} />
              <CalcBtn label="=" color="red" onClick={equals} />

              <CalcBtn label="0" wide onClick={() => inputDigit('0')} />
              <CalcBtn label="." onClick={() => inputDigit('.')} />
              <CalcBtn label="+" color="red" onClick={() => applyOp('+')} />

              <CalcBtn label="Backspace" color="red" onClick={() => setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : '0'))} />
              <CalcBtn label="CE" color="red" onClick={() => setDisplay('0')} />
              <CalcBtn label="C" color="red" onClick={clearAll} />
              <CalcBtn label="e" small onClick={() => sciFn('e')} />
            </div>
          </div>
        </div>
      ) : (
        /* ── 标准型布局（原有） ── */
        <div className="flex-1 p-[6px] grid grid-cols-5 gap-[5px] content-start pt-[7px]">
          <div className="col-span-5 grid grid-cols-4 gap-[5px] mb-[1px]">
            <CalcBtn label="MC" color="red" onClick={() => setMemory(null)} />
            <CalcBtn label="MR" color="red" onClick={() => memory !== null && setDisplay(String(memory))} />
            <CalcBtn label="MS" color="red" onClick={() => setMemory(parseFloat(display))} />
            <CalcBtn label="M+" color="red" onClick={() => setMemory((m) => (m ?? 0) + parseFloat(display))} />
          </div>
          <div className="col-span-5 grid grid-cols-5 gap-[5px]">
            <CalcBtn label="Backspace" color="red" onClick={() => setDisplay((p) => (p.length > 1 ? p.slice(0, -1) : '0'))} />
            <CalcBtn label="CE" color="red" onClick={() => setDisplay('0')} />
            <CalcBtn label="C" color="red" onClick={clearAll} />
            <CalcBtn label="±" onClick={() => unary('neg')} />
            <CalcBtn label="√" onClick={() => unary('sqrt')} />

            <CalcBtn label="7" onClick={() => inputDigit('7')} />
            <CalcBtn label="8" onClick={() => inputDigit('8')} />
            <CalcBtn label="9" onClick={() => inputDigit('9')} />
            <CalcBtn label="÷" color="red" onClick={() => applyOp('÷')} />
            <CalcBtn label="%" onClick={() => unary('pct')} />

            <CalcBtn label="4" onClick={() => inputDigit('4')} />
            <CalcBtn label="5" onClick={() => inputDigit('5')} />
            <CalcBtn label="6" onClick={() => inputDigit('6')} />
            <CalcBtn label="×" color="red" onClick={() => applyOp('×')} />
            <CalcBtn label="1/x" onClick={() => unary('inv')} />

            <CalcBtn label="1" onClick={() => inputDigit('1')} />
            <CalcBtn label="2" onClick={() => inputDigit('2')} />
            <CalcBtn label="3" onClick={() => inputDigit('3')} />
            <CalcBtn label="−" color="red" onClick={() => applyOp('-')} />
            <CalcBtn label="=" color="red" onClick={equals} />

            <CalcBtn label="0" wide onClick={() => inputDigit('0')} />
            <CalcBtn label="." onClick={() => inputDigit('.')} />
            <CalcBtn label="+" color="red" onClick={() => applyOp('+')} />
          </div>
        </div>
      )}
    </div>
  )
}
