'use client'

import React from 'react'
import { Bmp } from './bmp'

export interface IconProps {
  size?: number
  className?: string
}

/* ─────────── Windows XP 旗帜标志(开始按钮/启动画面) ─────────── */
export function XPFlag({ size, className }: IconProps) {
  return <Bmp name="winflag" size={size} className={className} />
}

/* ─────────── 我的电脑 ─────────── */
export function MyComputerIcon({ size, className }: IconProps) {
  return <Bmp name="mycomputer" size={size} className={className} />
}

/* ─────────── 我的文档 ─────────── */
export function MyDocumentsIcon({ size, className }: IconProps) {
  return <Bmp name="mydocs" size={size} className={className} />
}

/* ─────────── 网上邻居 ─────────── */
export function NetworkIcon({ size, className }: IconProps) {
  return <Bmp name="mynetplaces" size={size} className={className} />
}

/* ─────────── Internet Explorer ─────────── */
export function IEIcon({ size, className }: IconProps) {
  return <Bmp name="ie" size={size} className={className} />
}

/* ─────────── 回收站(空/满) ─────────── */
export function RecycleBinIcon({ size, className, full }: IconProps & { full?: boolean }) {
  return <Bmp name={full ? 'recycle-full' : 'recycle-empty'} size={size} className={className} />
}

/* ─────────── 文件夹(普通/图片/音乐) ─────────── */
export function FolderIcon({ size, className, variant }: IconProps & { variant?: 'plain' | 'pictures' | 'music' }) {
  return <Bmp name={`folder-${variant ?? 'plain'}`} size={size} className={className} />
}

/* ─────────── 驱动器 ─────────── */
export function HardDriveIcon({ size, className }: IconProps) {
  return <Bmp name="harddrive" size={size} className={className} />
}

export function CDDriveIcon({ size, className }: IconProps) {
  return <Bmp name="cddrive" size={size} className={className} />
}

export function FloppyDriveIcon({ size, className }: IconProps) {
  return <Bmp name="floppydrive" size={size} className={className} />
}

/* ─────────── 用户头像(开始菜单) ─────────── */
export function UserAvatar({ size, className }: IconProps) {
  return <Bmp name="useravatar" size={size} className={className} />
}

/* ─────────── 托盘: 音量(16px 专用高对比) ─────────── */
export function VolumeIcon({ size, className }: IconProps) {
  return <Bmp name="tray-volume" size={size ?? 16} className={className} />
}

/* ─────────── 电源按钮组(关机对话框) ─────────── */
export function PowerIcon({ size, className, kind }: IconProps & { kind: 'standby' | 'off' | 'restart' }) {
  return <Bmp name={`power-${kind}`} size={size} className={className} />
}

export function LogOffIcon({ size, className }: IconProps) {
  return <Bmp name="logoff" size={size} className={className} />
}
