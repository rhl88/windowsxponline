'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useXP, type AccountItem } from './store'
import { Bmp } from './bmp'
import { KeyIcon } from './app-icons'
import { playStartup, playShutdown, playLogoff, unlockAudio, preloadSounds, playClick } from './sounds'
import { PowerIcon } from './icons'
import { XPButton } from './ui'
import { apiLoginAccount } from '@/lib/api/endpoints'
import { imeEnter } from './ime-keys'

/* ─────────── 帐户头像（Bmp 资产，58px 用 48 桶） ─────────── */
function AccountAvatar({ name, size = 58 }: { name: string; size?: number }) {
  return <Bmp name={name} size={size} style={{ width: size, height: size }} />
}

/* ─────────── 密码提示问号钮（XP 欢迎屏蓝圆问号） ─────────── */
function HintButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title="密码提示"
      aria-label="密码提示"
      onClick={onClick}
      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border transition-colors ${
        active
          ? 'bg-[#f0a828] border-[#c07808] text-white'
          : 'bg-gradient-to-b from-[#5a9ae8] to-[#2a5fc0] border-[#1c4a90] text-white hover:brightness-110'
      }`}
    >
      <span className="text-[13px] font-bold leading-none -mt-[1px]">?</span>
    </button>
  )
}

/* ─────────── 密码提交钮（绿色箭头，XP logonui 同款） ─────────── */
function GoButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="单击箭头登录（→）"
      className="w-[24px] h-[24px] rounded-[3px] bg-gradient-to-b from-[#7bb05a] to-[#3f7d2a] border border-[#2c5f1c] flex items-center justify-center hover:brightness-110 active:brightness-90 disabled:opacity-50 shrink-0"
    >
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path d="M3 2 L8 7 L3 12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/* ─────────── 关机三圆钮面板（欢迎屏/锁定屏「关闭计算机」中间层，XP logonui 同款） ─────────── */
function ShutdownPanel({ onCancel }: { onCancel: () => void }) {
  const setPhase = useXP((s) => s.setPhase)
  const closeAll = useXP((s) => s.closeAll)
  const opt = (label: string, accel: string, icon: React.ReactNode, onClick: () => void) => (
    <button type="button" className="flex flex-col items-center gap-2 group" onClick={onClick}>
      {icon}
      <span className="text-white text-[12px] group-hover:underline">{label} ({accel})</span>
    </button>
  )
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center" data-shutdown-panel="1">
      <div className="w-[420px] xp-shutdown-dlg">
        <div className="h-[42px] flex items-center justify-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30">
            <path d="M15 2 L27 7 V15 c0 8 -5.5 13 -12 15 C8.5 28 3 23 3 15 V7 Z" fill="url(#sdg2)" stroke="#fff" strokeWidth="1.6" />
            <defs>
              <linearGradient id="sdg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f0604a" />
                <stop offset="1" stopColor="#a01808" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-white text-[15px] font-bold drop-shadow">关闭计算机</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-7 py-4 bg-gradient-to-b from-[#4a89e0] via-[#3a6fd0] to-[#2a5fc0]">
          {opt('待机', 'S', <PowerIcon kind="standby" size={54} />, () => { playClick(); closeAll(); setPhase('standby') })}
          {opt('关闭', 'U', <PowerIcon kind="off" size={54} />, () => { playShutdown(); closeAll(); setPhase('shutting-down'); setTimeout(() => setPhase('poweroff'), 2000) })}
          {opt('重新启动', 'R', <PowerIcon kind="restart" size={54} />, () => { playClick(); closeAll(); setPhase('restarting'); setTimeout(() => setPhase('boot'), 1500) })}
        </div>
        <div className="h-[40px] flex items-center justify-end px-3 bg-gradient-to-b from-[#3a6fd0] to-[#2a55b0]">
          <XPButton onClick={onCancel}>取消</XPButton>
        </div>
      </div>
    </div>
  )
}

/* ─────────── BIOS 自检闪屏 ─────────── */
function BiosFlash() {
  return (
    <div className="fixed inset-0 z-[9000] bg-black text-[#d8d8d8] font-mono text-[13px] leading-[1.5] p-4">
      <div>Award Modular BIOS v6.00PG, An Energy Star Ally</div>
      <div>Copyright (C) 1984-2001, Award Software, Inc.</div>
      <div className="mt-3">Main Processor : XP Virtual CPU 3.00GHz</div>
      <div>Memory Testing : 524288K OK</div>
      <div className="mt-3">Detecting IDE Primary Master ... VIRTUAL-DISK</div>
      <div>Press DEL to enter SETUP, ESC to skip memory test</div>
    </div>
  )
}

/* ─────────── XP 启动画面（真实位图 logo） ─────────── */
function XpBootLogo({ show }: { show: boolean }) {
  if (!show) return null
  /* 几何比例源自真实 XP 启动画面截图（1192×670）逐像素分析：
   *   logo 组 y166-375(高31.2vh) 顶部在 24.8vh；
   *   进度条 178×23 中心在 y74.5% 宽26.6vh；
   *   底部版权行 y633(94.6%) 左2% / 右下 Microsoft 97.8% */
  return (
    <div className="fixed inset-0 z-[9000] bg-black flex flex-col items-center cursor-pointer select-none overflow-hidden">
      {/* 真实 logo 位图（旗帜 + Microsoft® Windowsxp + Professional，2x 超采样） */}
      <img
        src="/icons/boot/logo.png"
        alt=""
        draggable={false}
        className="absolute left-1/2 -translate-x-1/2 object-contain"
        style={{
          top: '24.8vh',
          height: '31.2vh',
          width: 'auto',
        }}
      />

      {/* 进度跑马灯（2px 灰斜面边框 + 黑轨道 + 3 蓝渐变块） */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[2px] bg-black overflow-hidden p-[2px]"
        style={{
          top: '72.8vh',
          height: '3.43vh',
          width: '26.57vh',
          boxShadow:
            'inset 0 0 0 2px #6e6e6e, inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <div className="xp-boot-marquee h-full flex items-center gap-[0.45vh]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[70%] w-[1.38vh] rounded-[1px]"
              style={{ background: 'linear-gradient(to bottom, #6a7aec, #2d38c8)' }}
            />
          ))}
        </div>
      </div>

      {/* 底部版权（左）与 Microsoft（右）——真实位图，字体排版 1:1 */}
      <img
        src="/icons/boot/copyright.png"
        alt=""
        draggable={false}
        className="absolute object-contain"
        style={{ left: '1.93%', bottom: '3.73vh', height: '2.84vh', width: 'auto' }}
      />
      <img
        src="/icons/boot/ms-mark.png"
        alt=""
        draggable={false}
        className="absolute object-contain"
        style={{ right: '2.01%', bottom: '4.18vh', height: '2.84vh', width: 'auto' }}
      />
    </div>
  )
}

/* ─────────── 开机流程编排 ─────────── */
export function BootScreen() {
  const setPhase = useXP((s) => s.setPhase)
  const [stage, setStage] = useState<'bios' | 'logo'>('bios')

  useEffect(() => {
    const t1 = setTimeout(() => setStage('logo'), 850)
    const t2 = setTimeout(() => setPhase('welcome'), 850 + 4200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [setPhase])

  return (
    <div onClick={() => setPhase('welcome')}>
      {stage === 'bios' ? <BiosFlash /> : null}
      <XpBootLogo show={stage === 'logo'} />
    </div>
  )
}

/* ─────────── 欢迎屏（多帐户磁贴 + 密码输入 + 密码提示；XP logonui） ─────────── */
export function WelcomeScreen() {
  const setPhase = useXP((s) => s.setPhase)
  const accounts = useXP((s) => s.accounts)
  const switchFrom = useXP((s) => s.switchFrom)
  const winCount = useXP((s) => s.windows.filter((w) => !w.noTaskbar).length)
  const setSessionUser = useXP((s) => s.setSessionUser)
  const setSwitchFrom = useXP((s) => s.setSwitchFrom)
  const [sdOpen, setSdOpen] = useState(false)
  const [logging, setLogging] = useState(false)
  /* 密码态：选中的帐户名 / 输入 / 错误 / 提示展开 */
  const [sel, setSel] = useState<string | null>(null)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  /* 帐户名+密码直接登录（自定义帐户入口：欢迎屏磁贴之外的任意帐户均可键入登录） */
  const [formName, setFormName] = useState('')
  const [formPwd, setFormPwd] = useState('')
  const [formErr, setFormErr] = useState('')
  const [formHint, setFormHint] = useState(false)
  const [formShake, setFormShake] = useState(false)
  const formNameRef = useRef<HTMLInputElement>(null)
  const formPwdRef = useRef<HTMLInputElement>(null)
  /* 键入的帐户名匹配到已有帐户时（用于 ? 密码提示按钮） */
  const formMatched = accounts.find((a) => a.name === formName.trim()) ?? null

  /* 挂载即预取开机音：登录点击后零网络延迟原声播放 */
  useEffect(() => {
    preloadSounds(['xp-startup.mp3'])
  }, [])

  useEffect(() => {
    if (sel) inputRef.current?.focus()
  }, [sel])

  /* 登录完成：FUS 语义——切到其他用户丢弃前一会话窗口，返回原会话直接回桌面 */
  const finishLogin = (name: string) => {
    const st = useXP.getState()
    if (st.switchFrom && st.switchFrom !== name) st.closeAll()
    setSwitchFrom(null)
    setSessionUser(name)
    unlockAudio()
    setLogging(true)
    setTimeout(() => playStartup(), 250)
    setTimeout(() => setPhase('desktop'), 1600)
  }

  /* 统一登录验证（磁贴流与帐户名输入流共用）：
   * 返回 'ok' | 'no-user' | 'bad-password' | 'offline' | 'busy'，调用方各自维护错误文案 */
  const attemptLogin = async (name: string, password: string): Promise<'ok' | 'no-user' | 'bad-password' | 'offline' | 'busy'> => {
    if (busy) return 'busy'
    setBusy(true)
    try {
      const res = await apiLoginAccount(name, password)
      if (res.ok && res.account) {
        finishLogin(res.account.name)
        return 'ok'
      }
      return res.reason === 'no-user' ? 'no-user' : 'bad-password'
    } catch {
      /* 脱机兑底：无密码帐户直接放行（演示系统不离线卡人） */
      const a = useXP.getState().accounts.find((x) => x.name === name)
      if (a && !a.hasPassword) {
        finishLogin(name)
        return 'ok'
      }
      return 'offline'
    } finally {
      setBusy(false)
    }
  }

  const tryLogin = async (name: string, password: string) => {
    const r = await attemptLogin(name, password)
    if (r === 'ok' || r === 'busy') return
    setErr(r === 'no-user' ? '帐户不存在，请重试。' : r === 'offline' ? '无法连接登录服务，请稍后重试。' : '您键入的密码不正确。请再次键入密码。')
    setShake(true)
    window.setTimeout(() => setShake(false), 400)
    setPwd('')
    inputRef.current?.focus()
  }

  /* 表单流：键入帐户名+密码直接登录（未来自定义帐户同样走此通路） */
  const submitForm = async (pwd0?: string) => {
    const name = formName.trim()
    if (!name) {
      setFormErr('请键入帐户名。')
      setFormShake(true)
      window.setTimeout(() => setFormShake(false), 400)
      formNameRef.current?.focus()
      return
    }
    const r = await attemptLogin(name, pwd0 ?? formPwd)
    if (r === 'ok' || r === 'busy') return
    setFormErr(
      r === 'no-user' ? '帐户不存在，请检查帐户名后重试。'
        : r === 'offline' ? '无法连接登录服务，请稍后重试。'
          : '您键入的密码不正确。请再次键入密码。',
    )
    setFormShake(true)
    window.setTimeout(() => setFormShake(false), 400)
    if (r === 'no-user') {
      setFormPwd('')
      formNameRef.current?.focus()
    } else {
      setFormPwd('')
      formPwdRef.current?.focus()
    }
  }

  const clickTile = (a: AccountItem) => {
    if (busy || logging) return
    if (a.name === switchFrom) {
      /* FUS：已登录会话，直接返回原桌面（窗口全保留） */
      finishLogin(a.name)
      return
    }
    if (!a.hasPassword) {
      void tryLogin(a.name, '')
    } else {
      setSel(a.name)
      setPwd('')
      setErr('')
      setShowHint(false)
    }
  }

  if (logging) {
    return (
      <div className="fixed inset-0 z-[9000] xp-welcome-bg flex items-center justify-center">
        <div className="text-white text-[52px] font-bold tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,80,0.5)] xp-welcome-anim">
          欢迎使用
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9000] xp-welcome-bg select-none overflow-hidden">
      {/* 中央分隔光带 */}
      <div className="absolute left-0 right-0 top-[64%] h-[3px] xp-welcome-divider" />
      <div className="absolute left-0 right-0 top-[calc(64%+9px)] h-[1px] bg-[#7ba0e0] opacity-60" />

      {/* 左侧品牌（真实旗帜位图） */}
      <div className="absolute left-[7%] top-[18%] flex items-center gap-4">
        <img src="/icons/boot/flag.png" alt="" draggable={false} className="h-16 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,60,0.45)]" />
        <div className="leading-none">
          <div className="text-[11px] text-[#cfe0f8]">Microsoft</div>
          <div className="text-white text-[26px] font-bold" style={{ fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
            Windows<span className="align-super text-[15px] ml-1" style={{ color: '#f5a623' }}>xp</span>
          </div>
          <div className="text-[#c8dcf8] text-[12px] mt-1">Professional</div>
        </div>
      </div>

      {/* 登录提示（分隔线上方） */}
      <div className="absolute left-[7%] top-[52%] text-white text-[15px] tracking-wider">要开始，请单击您的用户名</div>

      {/* 用户磁贴纵列（多帐户；点击展开密码输入） */}
      <div className="absolute left-[52%] top-[16%] flex flex-col gap-[10px]">
        {accounts.map((a) => {
          const isSel = sel === a.name
          return (
            <div key={a.name} className={`flex flex-col ${shake && isSel ? 'xp-welcome-shake' : ''}`}>
              {isSel ? (
                /* 密码态磁贴：头像 + 用户名 + 密码框/绿箭头/?提示 */
                <div className="flex items-center gap-4 rounded-[4px] px-4 py-[8px] bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
                  <span className="w-[58px] h-[58px] rounded-[4px] border-2 border-white/90 shadow-lg overflow-hidden shrink-0">
                    <AccountAvatar name={a.avatar} />
                  </span>
                  <div className="flex flex-col gap-[5px]">
                    <span className="text-white text-[19px] font-bold tracking-wide">{a.name}</span>
                    <div className="flex items-center gap-[5px]">
                      {a.hint ? <HintButton active={showHint} onClick={() => { setShowHint((v) => !v); inputRef.current?.focus() }} /> : null}
                      <input
                        ref={inputRef}
                        type="password"
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setSel(null); setErr(''); setShowHint(false) }
                          else imeEnter(e, (v) => void tryLogin(a.name, v))
                        }}
                        className="xp-sunken bg-white text-[13px] px-2 h-[24px] w-[150px] outline-none"
                        aria-label="密码"
                      />
                      <GoButton onClick={() => void tryLogin(a.name, pwd)} disabled={busy} />
                    </div>
                  </div>
                </div>
              ) : (
                /* 普通磁贴（hover 高亮；已登录会话显示程序计数） */
                <button
                  type="button"
                  onClick={() => clickTile(a)}
                  className="group flex items-center gap-4 rounded-[4px] px-4 py-[8px] hover:bg-white/15 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] transition-colors text-left"
                >
                  <span className="w-[58px] h-[58px] rounded-[4px] border-2 border-white/90 shadow-lg overflow-hidden shrink-0">
                    <AccountAvatar name={a.avatar} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-white tracking-wide group-hover:font-bold ${a.name === switchFrom ? 'text-[18px]' : 'text-[19px]'}`}>{a.name}</span>
                    {a.name === switchFrom ? (
                      <span className="block text-[#cfe0f8] text-[11px] mt-[2px]">
                        已登录{winCount > 0 ? ` · ${winCount} 个程序正在运行` : ''}
                      </span>
                    ) : null}
                  </span>
                </button>
              )}
              {/* 错误 / 密码提示行（磁贴下方，XP 白字；错误与提示可同时显示） */}
              {isSel && (err || (showHint && a.hint)) ? (
                <div className="text-white text-[12px] pl-[18px] pt-[2px] drop-shadow-[0_1px_2px_rgba(0,0,60,0.6)]">
                  {err ? <div>{err}</div> : null}
                  {showHint && a.hint ? <div>密码提示: {a.hint}</div> : null}
                </div>
              ) : null}
            </div>
          )
        })}

        {/* 帐户名+密码直接登录（自定义帐户入口；未来新增的自定义帐户直接键入即可登录） */}
        <div className="mt-[18px] pt-[14px] border-t border-white/25 w-[312px]">
          <div className="text-[#cfe0f8] text-[12px] tracking-wide mb-[8px]">或键入帐户名和密码登录</div>
          <div className={`flex flex-col gap-[6px] ${formShake ? 'xp-welcome-shake' : ''}`}>
            <div className="flex items-center gap-[8px]">
              <span className="text-white text-[13px] w-[46px] text-right shrink-0">帐户名:</span>
              <input
                ref={formNameRef}
                type="text"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormErr(''); setFormHint(false) }}
                onKeyDown={(e) => {
                  imeEnter(e, () => formPwdRef.current?.focus())
                }}
                className="xp-sunken bg-white text-[13px] px-2 h-[24px] flex-1 min-w-0 outline-none"
                aria-label="帐户名"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="text-white text-[13px] w-[46px] text-right shrink-0">密码:</span>
              <input
                ref={formPwdRef}
                type="password"
                value={formPwd}
                onChange={(e) => { setFormPwd(e.target.value); setFormErr('') }}
                onKeyDown={(e) => {
                  imeEnter(e, (v) => void submitForm(v))
                }}
                className="xp-sunken bg-white text-[13px] px-2 h-[24px] w-[150px] outline-none"
                aria-label="密码"
              />
              {formMatched?.hint ? (
                <HintButton active={formHint} onClick={() => { setFormHint((v) => !v); formPwdRef.current?.focus() }} />
              ) : null}
              <GoButton onClick={() => void submitForm()} disabled={busy} />
            </div>
          </div>
          {/* 错误 / 密码提示行（与磁贴流同款白字文案） */}
          {formErr || (formHint && formMatched?.hint) ? (
            <div className="text-white text-[12px] pt-[6px] pl-[54px] drop-shadow-[0_1px_2px_rgba(0,0,60,0.6)]">
              {formErr ? <div>{formErr}</div> : null}
              {formHint && formMatched?.hint ? <div>密码提示: {formMatched.hint}</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 左下关闭计算机（XP 真实：先弹待机/关/重启三圆钮面板） */}
      <button
        type="button"
        onClick={() => { playClick(); setSdOpen(true) }}
        className="absolute left-[7%] bottom-[5%] flex items-center gap-2 bg-gradient-to-b from-[#e8584a] to-[#a01808] border border-[#701008] rounded-[4px] pl-3 pr-4 py-[6px] text-white text-[13px] hover:brightness-110 active:brightness-90 shadow-md"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <g stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M9 2 v6" />
            <path d="M4 5.2 a6.6 6.6 0 1 0 10 0" />
          </g>
        </svg>
        关闭计算机
      </button>
      {sdOpen ? <ShutdownPanel onCancel={() => setSdOpen(false)} /> : null}

      {/* 右下安全提示 */}
      <div className="absolute right-[6%] bottom-[6%] flex items-center gap-2 text-white text-[11px]">
        <KeyIcon size={20} />
        在您离开时保护您的计算机
      </div>
    </div>
  )
}

/* ─────────── 解除锁定欢迎屏（Win+L 锁定计算机后；按当前帐户验证密码） ─────────── */
export function LockScreen() {
  const setPhase = useXP((s) => s.setPhase)
  const sessionUser = useXP((s) => s.sessionUser)
  const acc = useXP((s) => s.accounts.find((a) => a.name === s.sessionUser))
  const setSwitchFrom = useXP((s) => s.setSwitchFrom)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sdOpen, setSdOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const failMsg = '您键入的密码不正确。请再次键入密码。'

  const unlock = async (pwd0?: string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await apiLoginAccount(sessionUser, pwd0 ?? pwd)
      if (res.ok) {
        unlockAudio()
        setPhase('desktop')
        return
      }
      setErr(failMsg)
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      setPwd('')
      inputRef.current?.focus()
    } catch {
      /* 脱机兑底：无密码帐户直接解锁 */
      if (!acc?.hasPassword) {
        unlockAudio()
        setPhase('desktop')
      } else {
        setErr('无法连接登录服务，请稍后重试。')
        setShake(true)
        window.setTimeout(() => setShake(false), 400)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] xp-welcome-bg select-none overflow-hidden">
      {/* 中央分隔光带 */}
      <div className="absolute left-0 right-0 top-[64%] h-[3px] xp-welcome-divider" />
      <div className="absolute left-0 right-0 top-[calc(64%+9px)] h-[1px] bg-[#7ba0e0] opacity-60" />

      {/* 顶部标题（XP 真实：解除计算机锁定） */}
      <div className="absolute left-0 right-0 top-[9%] flex justify-center">
        <div className="text-white text-[26px] tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,80,0.5)]" style={{ fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
          解除计算机锁定
        </div>
      </div>

      {/* 左侧品牌 */}
      <div className="absolute left-[7%] top-[26%] flex items-center gap-4">
        <img src="/icons/boot/flag.png" alt="" draggable={false} className="h-14 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,60,0.45)]" />
        <div className="leading-none">
          <div className="text-[11px] text-[#cfe0f8]">Microsoft</div>
          <div className="text-white text-[23px] font-bold" style={{ fontFamily: "'Trebuchet MS', 'Noto Sans SC', sans-serif" }}>
            Windows<span className="align-super text-[13px] ml-1" style={{ color: '#f5a623' }}>xp</span>
          </div>
          <div className="text-[#c8dcf8] text-[12px] mt-1">Professional</div>
        </div>
      </div>

      {/* 登录提示 */}
      <div className="absolute left-[7%] top-[68%] text-white text-[15px] tracking-wider">
        要解除锁定，请键入您的密码
      </div>
      <div className="absolute left-[7%] top-[73%] text-[#c8dcf8] text-[11px]">
        {acc && !acc.hasPassword
          ? `（${sessionUser} 帐户未设置密码 —— 直接单击箭头即可）`
          : '（请检查 Caps Lock 是否打开，或用「?」密码提示来回忆密码）'}
      </div>

      {/* 错误/提示行 */}
      {(err || (showHint && acc?.hint)) && (
        <div className="absolute left-[52%] top-[62%] text-white text-[12px] drop-shadow-[0_1px_2px_rgba(0,0,60,0.6)]">
          {err || `密码提示: ${acc?.hint}`}
        </div>
      )}

      {/* 用户磁贴 + 密码框 */}
      <div className={`absolute left-[52%] top-[38%] flex items-center gap-4 ${shake ? 'xp-welcome-shake' : ''}`}>
        <span className="w-[64px] h-[64px] rounded-[4px] border-2 border-white/90 shadow-lg overflow-hidden shrink-0">
          <AccountAvatar name={acc?.avatar ?? 'avatar-admin'} size={64} />
        </span>
        <div className="flex flex-col gap-2">
          <span className="text-white text-[20px] tracking-wide">{sessionUser}</span>
          <div className="flex items-center gap-2">
            {acc?.hint ? <HintButton active={showHint} onClick={() => { setShowHint((v) => !v); inputRef.current?.focus() }} /> : null}
            <input
              ref={inputRef}
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShake(true); window.setTimeout(() => setShake(false), 400) }
                else imeEnter(e, (v) => void unlock(v))
              }}
              className="xp-sunken bg-white text-[13px] px-2 h-[24px] w-[168px] outline-none"
              aria-label="密码"
            />
            <GoButton onClick={() => void unlock()} disabled={busy} />
          </div>
        </div>
      </div>

      {/* 左下安全提示 */}
      <div className="absolute left-[7%] bottom-[6%] flex items-center gap-2 text-white text-[11px]">
        <KeyIcon size={20} />
        在您离开时保护您的计算机
      </div>

      {/* 右下：切换用户 + 关闭计算机 */}
      <div className="absolute right-[6%] bottom-[5%] flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            playLogoff()
            /* FUS：锁定状态切用户 → 保留会话回欢迎屏（原会话可从磁贴直接返回） */
            setSwitchFrom(sessionUser)
            setPhase('welcome')
          }}
          className="flex items-center gap-2 bg-gradient-to-b from-[#4a89e0] to-[#2a5fc0] border border-[#1e4a90] rounded-[4px] px-4 py-[6px] text-white text-[13px] hover:brightness-110 active:brightness-90 shadow-md"
        >
          <svg width="17" height="17" viewBox="0 0 17 17">
            <g stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d="M6 3.5 H3 a1.5 1.5 0 0 0 -1.5 1.5 v7 a1.5 1.5 0 0 0 1.5 1.5 h3" />
              <path d="M11 4.5 l4 4 -4 4" />
              <path d="M15 8.5 H6.5" />
            </g>
          </svg>
          切换用户
        </button>
        <button
          type="button"
          onClick={() => { playClick(); setSdOpen(true) }}
          className="flex items-center gap-2 bg-gradient-to-b from-[#e8584a] to-[#a01808] border border-[#701008] rounded-[4px] pl-3 pr-4 py-[6px] text-white text-[13px] hover:brightness-110 active:brightness-90 shadow-md"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <g stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M9 2 v6" />
              <path d="M4 5.2 a6.6 6.6 0 1 0 10 0" />
            </g>
          </svg>
          关闭计算机
        </button>
      </div>
      {sdOpen ? <ShutdownPanel onCancel={() => setSdOpen(false)} /> : null}
    </div>
  )
}

/* ─────────── 注销/关机 转场 ─────────── */
export function ShutdownScreen({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[9000] xp-welcome-bg flex items-center justify-center flex-col gap-6">
      <div className="text-white text-[30px] tracking-widest drop-shadow-[0_2px_6px_rgba(0,0,80,0.5)]">{label}</div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="w-[7px] h-[7px] rounded-full bg-white/90 xp-dot-anim" style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
      </div>
    </div>
  )
}

/* ─────────── 断电黑屏 ─────────── */
export function PowerOffScreen() {
  const setPhase = useXP((s) => s.setPhase)
  return (
    <div className="fixed inset-0 z-[9000] bg-black flex flex-col items-center justify-center gap-8">
      <div className="text-[#5a5a5a] text-[15px] tracking-wider">您可以安全地关闭计算机了</div>
      <button
        type="button"
        onClick={() => setPhase('boot')}
        className="text-[#3a6fd0] border border-[#3a5a90] rounded px-6 py-2 text-[13px] hover:text-[#7aaaf0] hover:border-[#5a8ac0]"
      >
        重新启动
      </button>
    </div>
  )
}

/* ─────────── 待机 ─────────── */
export function StandbyScreen() {
  const setPhase = useXP((s) => s.setPhase)
  useEffect(() => {
    const wake = () => setPhase('welcome')
    window.addEventListener('keydown', wake)
    window.addEventListener('pointerdown', wake)
    return () => {
      window.removeEventListener('keydown', wake)
      window.removeEventListener('pointerdown', wake)
    }
  }, [setPhase])
  return (
    <div className="fixed inset-0 z-[9000] bg-black flex items-center justify-center">
      <div className="text-[#3a3a3a] text-[13px] animate-pulse">（待机中 — 按任意键或单击唤醒）</div>
    </div>
  )
}

/* ─────────── 注销编排 ─────────── */
export function LogoffFlow() {
  const setPhase = useXP((s) => s.setPhase)
  useEffect(() => {
    playLogoff()
    const t = setTimeout(() => setPhase('welcome'), 1500)
    return () => clearTimeout(t)
  }, [setPhase])
  return <ShutdownScreen label="正在注销..." />
}
