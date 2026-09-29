'use client'

import React from 'react'
import { useXP } from './store'
import { TaskManagerIcon } from './app-icons'
import { playClick } from './sounds'

/* Ctrl+Alt+Del —— Windows 安全对话框（经典登录模式） */
export default function SecurityDialog() {
  const setSecurity = useXP((s) => s.setSecurity)
  const openApp = useXP((s) => s.openApp)
  const setPhase = useXP((s) => s.setPhase)
  const closeAll = useXP((s) => s.closeAll)
  const showToast = useXP((s) => s.showToast)

  const btn = (label: string, onClick: () => void, icon: React.ReactNode, primary?: boolean) => (
    <button
      type="button"
      className={`xp-btn ${primary ? 'xp-btn-primary' : ''} w-full h-[34px] flex items-center gap-3 px-3 text-left mb-[6px] ${label === '取消' ? 'mt-1' : ''}`}
      onClick={() => {
        setSecurity(false)
        onClick()
        playClick()
      }}
    >
      <span className="w-[22px] h-[22px] flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-[11px]">{label}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center">
      {/* 背景暗化 + 居中对话框（XP 经典蓝底） */}
      <div className="absolute inset-0 bg-[#3a6ea5]/25" />
      <div className="relative w-[420px] bg-[#ece9d8] rounded-[6px] border border-[#0a3c94] shadow-[6px_6px_18px_rgba(0,0,40,0.5)] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-2 h-[26px] bg-gradient-to-b from-[#2a72c8] to-[#1648a0]">
          <span className="text-white text-[11px] font-bold">Windows 安全</span>
          <button type="button" className="text-white/80 hover:text-white text-[13px] leading-none px-1" onClick={() => setSecurity(false)}>
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            {/* 红盾图标 */}
            <svg width="44" height="48" viewBox="0 0 48 52" className="shrink-0">
              <path d="M24 2 L44 8 V26 q0 14 -20 24 Q4 40 4 26 V8 Z" fill="#c83020" stroke="#8a1810" strokeWidth="2" />
              <path d="M24 7 L39 11 V26 q0 11 -15 19 Q9 37 9 26 V11 Z" fill="#e85040" opacity="0.5" />
              <path d="M16 25 L22 31 L33 18" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
            <div className="text-[11px] leading-[16px]">
              <div className="font-bold text-[12px] mb-1">使用 Windows 安全窗口可以…</div>
              <div>锁定您的计算机以防止未授权使用，或者注销、更改密码或切换用户。</div>
              <div className="mt-2 text-[#5a5a4a]">按 Ctrl+Alt+Del 打开此窗口。</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3">
            {btn('任务管理器(T)', () => openApp('taskmgr', {}), <TaskManagerIcon size={22} />)}
            {btn('锁定计算机(K)', () => {
              closeAll()
              showToast('计算机已锁定（简化处理：欢迎屏见）')
              setPhase('welcome')
            }, (
              <svg width="22" height="22" viewBox="0 0 24 24">
                <rect x="4" y="10" width="16" height="10" rx="2" fill="#c8a020" stroke="#8a6a10" strokeWidth="1.5" />
                <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" fill="none" stroke="#8a6a10" strokeWidth="2" />
              </svg>
            ))}
            {btn('注销(L)...', () => {
              closeAll()
              setPhase('logging-off')
            }, (
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path d="M14 4 h6 v16 h-6" fill="none" stroke="#2a5a90" strokeWidth="2" />
                <path d="M4 12 h12 M10 7 l5 5 -5 5" fill="none" stroke="#2a5a90" strokeWidth="2" />
              </svg>
            ))}
            {btn('关机(U)...', () => openApp('dialog', { kind: 'shutdown' }), (
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="#d84a30" stroke="#8a2010" strokeWidth="1.5" />
                <path d="M12 6 v6 M7.5 9 a6.2 6.2 0 1 0 9 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            ))}
            {btn('更改密码(C)...', () => showToast('更改密码：请先提供旧密码（提示：它是空的）'), (
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle cx="8" cy="12" r="4" fill="none" stroke="#8a6a10" strokeWidth="2" />
                <path d="M12 12 h9 M18 12 v4 M21 12 v3" stroke="#8a6a10" strokeWidth="2" />
              </svg>
            ))}
            {btn('取消', () => setSecurity(false), (
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="#8a8a8a" strokeWidth="2" />
                <path d="M8 8 L16 16 M16 8 L8 16" stroke="#8a8a8a" strokeWidth="2" />
              </svg>
            ), true)}
          </div>
        </div>
        <div className="px-4 py-[5px] bg-[#d8d4c8] border-t border-[#b8b4a8] text-[10px] text-[#5a5a4a]">
          Windows XP Professional（Web 复刻版）
        </div>
      </div>
    </div>
  )
}
