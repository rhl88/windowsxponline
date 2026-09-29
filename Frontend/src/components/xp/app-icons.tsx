'use client'

import React from 'react'
import { type IconProps } from './icons'
import { Bmp } from './bmp'

/* ─────────── 记事本 ─────────── */
export function NotepadIcon({ size, className }: IconProps) {
  return <Bmp name="notepad" size={size} className={className} />
}

/* ─────────── 画图 ─────────── */
export function PaintIcon({ size, className }: IconProps) {
  return <Bmp name="paint" size={size} className={className} />
}

/* ─────────── 计算器 ─────────── */
export function CalculatorIcon({ size, className }: IconProps) {
  return <Bmp name="calculator" size={size} className={className} />
}

/* ─────────── 扫雷 ─────────── */
export function MineIcon({ size, className }: IconProps) {
  return <Bmp name="mine" size={size} className={className} />
}

/* ─────────── 纸牌 ─────────── */
export function SolitaireIcon({ size, className }: IconProps) {
  return <Bmp name="solitaire" size={size} className={className} />
}

/* ─────────── Windows Media Player ─────────── */
export function WMPIcon({ size, className }: IconProps) {
  return <Bmp name="wmp" size={size} className={className} />
}

/* ─────────── 文本文档 ─────────── */
export function TextFileIcon({ size, className }: IconProps) {
  return <Bmp name="txtfile" size={size} className={className} />
}

/* ─────────── 图片文件 ─────────── */
export function ImageFileIcon({ size, className }: IconProps) {
  return <Bmp name="imagefile" size={size} className={className} />
}

/* ─────────── EXE 文件 ─────────── */
export function ExeFileIcon({ size, className }: IconProps) {
  return <Bmp name="exefile" size={size} className={className} />
}

/* ─────────── 命令提示符 ─────────── */
export function CmdIcon({ size, className }: IconProps) {
  return <Bmp name="cmd" size={size} className={className} />
}

/* ─────────── 任务管理器 ─────────── */
export function TaskManagerIcon({ size, className }: IconProps) {
  return <Bmp name="taskmgr" size={size} className={className} />
}

/* ─────────── 帮助和支持中心 ─────────── */
export function HelpIcon({ size, className }: IconProps) {
  return <Bmp name="help" size={size} className={className} />
}

/* ─────────── 搜索 ─────────── */
export function SearchIcon({ size, className }: IconProps) {
  return <Bmp name="search" size={size} className={className} />
}

/* ─────────── 运行 ─────────── */
export function RunIcon({ size, className }: IconProps) {
  return <Bmp name="run" size={size} className={className} />
}

/* ─────────── 控制面板 ─────────── */
export function ControlPanelIcon({ size, className }: IconProps) {
  return <Bmp name="controlpanel" size={size} className={className} />
}

/* ─────────── Outlook Express ─────────── */
export function OutlookIcon({ size, className }: IconProps) {
  return <Bmp name="oe" size={size} className={className} />
}

/* ─────────── 对话框图标(错误/警告/信息/问号) ─────────── */
export function ErrorIcon({ size, className }: IconProps) {
  return <Bmp name="dlg-error" size={size} className={className} />
}

export function WarnIcon({ size, className }: IconProps) {
  return <Bmp name="dlg-warn" size={size} className={className} />
}

export function InfoIcon({ size, className }: IconProps) {
  return <Bmp name="dlg-info" size={size} className={className} />
}

export function QuestionIcon({ size, className }: IconProps) {
  return <Bmp name="dlg-question" size={size} className={className} />
}

/* ─────────── Explorer 工具栏前进箭头(UI部件, 矢量) ─────────── */
export function ArrowRight({ size, className }: IconProps) {
  return (
    <svg width={size ?? 32} height={size ?? 32} viewBox="0 0 16 16" className={className}>
      <path d="M5 3.5 L10.5 8 L5 12.5 Z" fill="currentColor" />
    </svg>
  )
}

/* ─────────── 扫雷笑脸按钮(4态) ─────────── */
export function MineSmiley({ size, className, state }: IconProps & { state: 'normal' | 'press' | 'win' | 'lose' }) {
  return <Bmp name={`minesmiley-${state}`} size={size} className={className} />
}

/* ─────────── 密钥 ─────────── */
export function KeyIcon({ size, className }: IconProps) {
  return <Bmp name="key" size={size} className={className} />
}

/* ─────────── FreeCell ─────────── */
export function FreeCellIcon({ size, className }: IconProps) {
  return <Bmp name="freecell" size={size} className={className} />
}

/* ─────────── 红心大战 ─────────── */
export function HeartsIcon({ size, className }: IconProps) {
  return <Bmp name="hearts" size={size} className={className} />
}

/* ─────────── 写字板 ─────────── */
export function WordPadIcon({ size, className }: IconProps) {
  return <Bmp name="wordpad" size={size} className={className} />
}

/* ─────────── 3D弹球 ─────────── */
export function PinballIcon({ size, className }: IconProps) {
  return <Bmp name="pinball" size={size} className={className} />
}

/* ─────────── 磁盘清理 ─────────── */
export function DiskCleanIcon({ size, className }: IconProps) {
  return <Bmp name="diskclean" size={size} className={className} />
}

/* ─────────── 碎片整理 ─────────── */
export function DefragIcon({ size, className }: IconProps) {
  return <Bmp name="defrag" size={size} className={className} />
}

/* ─────────── 系统信息 ─────────── */
export function SysInfoIcon({ size, className }: IconProps) {
  return <Bmp name="sysinfo" size={size} className={className} />
}

/* ─────────── 用户账户 ─────────── */
export function UserAccountIcon({ size, className }: IconProps) {
  return <Bmp name="useraccount" size={size} className={className} />
}

/* ─────────── 音量控制 ─────────── */
export function SpeakerIcon({ size, className }: IconProps) {
  return <Bmp name="sndvol" size={size} className={className} />
}

/* ─────────── 录音机 ─────────── */
export function SndRecIcon({ size, className }: IconProps) {
  return <Bmp name="sndrec" size={size} className={className} />
}

/* ─────────── 字符映射表 ─────────── */
export function CharMapIcon({ size, className }: IconProps) {
  return <Bmp name="charmap" size={size} className={className} />
}

/* ─────────── 时钟 ─────────── */
export function ClockIcon({ size, className }: IconProps) {
  return <Bmp name="clock" size={size} className={className} />
}

/* ─────────── 快捷方式角标（XP 经典：白底黑箭头小方块，叠加在目标图标右下角） ─────────── */
export function ShortcutBadge({ size = 16, offset = true }: { size?: number; offset?: boolean }) {
  return (
    <Bmp
      name="shortcut"
      size={size}
      className="pointer-events-none"
      style={offset ? { position: 'absolute', right: -size * 0.16, bottom: -size * 0.16 } : undefined}
    />
  )
}

/* ─────────── 字体 / 任务计划 ─────────── */
export function FontsFolderIcon({ size, className }: IconProps) {
  return <Bmp name="cp-fonts" size={size} className={className} />
}

export function FontFileIcon({ size, className }: IconProps) {
  return <Bmp name="fontfile" size={size} className={className} />
}

export function TaskSchedIcon({ size, className }: IconProps) {
  return <Bmp name="cp-tasks" size={size} className={className} />
}
