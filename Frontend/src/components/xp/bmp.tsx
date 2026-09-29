'use client'

import React from 'react'

/**
 * XP 位图图标渲染器 — PIL 逐像素绘制的 PNG(public/icons/{48,32,16})
 * 尺寸桶策略: >=36 用 48 档 / >=22 用 32 档 / 其余 16 档(托盘专用真像素画)
 * 48/32 档: 超采样平滑风格 → imageRendering auto
 * 16 档: 16×16 硬边像素画(b6_tray_px) → pixelated 保持硬边不移锢
 *   (16px PNG 显示尺寸=16 时 1:1 无缩放零损失; dpr>1 或非整数尺寸时最近邻保锐利)
 */
export function Bmp({
  name,
  size = 32,
  className,
  style,
}: {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const bucket = size >= 36 ? 48 : size >= 22 ? 32 : 16
  return (
    <img
      src={`/icons/${bucket}/${name}.png`}
      width={size}
      height={size}
      className={className}
      style={{
        imageRendering: bucket === 16 ? 'pixelated' : 'auto',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
      alt=""
      draggable={false}
    />
  )
}
