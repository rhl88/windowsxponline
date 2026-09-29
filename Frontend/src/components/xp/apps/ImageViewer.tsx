'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { resolvePath } from '../fs'
import { playClick } from '../sounds'

/* Windows 图片和传真查看器：真实查看 FS 中的图片，支持缩放/旋转/上一张/下一张 */

function TBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`w-[30px] h-[30px] rounded-[4px] flex items-center justify-center ${disabled ? 'opacity-40' : 'hover:bg-white/25 active:bg-black/30'}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function ImageViewer({ win }: { win: WinState }) {
  const fsTree = useXP((s) => s.fsTree)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const parentPath = (win.props.parentPath as string[]) ?? []
  const parentKey = parentPath.join('/')
  const initialIndex = (win.props.index as number) ?? 0

  const images = useMemo(() => {
    const node = resolvePath(parentPath, fsTree)
    return (node?.children ?? []).filter((c) => c.icon === 'image' || c.icon === 'bmp')
  }, [fsTree, parentPath, parentKey])

  const [idx, setIdx] = useState(Math.max(0, Math.min(initialIndex, images.length - 1)))
  const [zoom, setZoom] = useState(1)
  const [fit, setFit] = useState(true)
  const [rot, setRot] = useState(0)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [err, setErr] = useState(false)

  const cur = images[idx]

  useEffect(() => {
    setWindowTitle(win.id, `${cur?.name ?? '无图像'} - Windows 图片和传真查看器`)
  }, [cur, setWindowTitle, win.id])

  /* 切换图片时重置视图（渲染期状态重置模式） */
  const [prevIdx, setPrevIdx] = useState(idx)
  if (prevIdx !== idx) {
    setPrevIdx(idx)
    setZoom(1)
    setFit(true)
    setRot(0)
    setErr(false)
  }

  const step = (d: number) => {
    if (images.length === 0) return
    playClick()
    setIdx((i) => (i + d + images.length) % images.length)
  }

  /* 自适应缩放 */
  const containerRef = React.useRef<HTMLDivElement>(null)
  const applyFit = () => {
    const img = document.querySelector<HTMLImageElement>('.xp-imgv-img')
    if (img && containerRef.current) {
      setDims({ w: img.naturalWidth, h: img.naturalHeight })
      const cw = containerRef.current.clientWidth - 24
      const ch = containerRef.current.clientHeight - 24
      const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1)
      setZoom(Math.max(0.05, s))
      setFit(true)
    }
  }

  const actualSize = () => {
    setZoom(1)
    setFit(false)
    playClick()
  }

  return (
    <div className="flex flex-col h-full select-none bg-[#3a4a5a]">
      {/* 工具栏（经典 shimgvw 底栏） */}
      <div className="order-2 h-[46px] shrink-0 bg-gradient-to-b from-[#7288ac] to-[#4a5e80] border-t border-[#2a3a52] flex items-center justify-center gap-[2px] px-4">
        <TBtn title="上一个图像（左箭头）" onClick={() => step(-1)} disabled={images.length < 2}>
          <svg width="22" height="18" viewBox="0 0 22 18">
            <path d="M14 2 L5 9 L14 16" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </TBtn>
        <TBtn title="下一个图像（右箭头）" onClick={() => step(1)} disabled={images.length < 2}>
          <svg width="22" height="18" viewBox="0 0 22 18">
            <path d="M8 2 L17 9 L8 16" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </TBtn>
        <div className="w-[10px]" />
        <TBtn title="最佳适应" onClick={applyFit}>
          <svg width="20" height="18" viewBox="0 0 20 18">
            <rect x="1.5" y="1.5" width="17" height="15" fill="none" stroke="#fff" strokeWidth="1.6" />
            <path d="M4.5 9 L7 6 M15.5 9 L13 6 M4.5 9 L7 12 M15.5 9 L13 12" stroke="#cfe0f5" strokeWidth="1.4" />
            <rect x="7" y="6" width="6" height="6" fill="#cfe0f5" opacity="0.6" />
          </svg>
        </TBtn>
        <TBtn title="实际大小" onClick={actualSize}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <rect x="2" y="2" width="6" height="6" fill="none" stroke="#fff" strokeWidth="1.4" />
            <rect x="10" y="10" width="6" height="6" fill="none" stroke="#fff" strokeWidth="1.4" />
          </svg>
        </TBtn>
        <TBtn title="放大" onClick={() => { setZoom((z) => Math.min(8, z * 1.4)); setFit(false) }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="7" cy="7" r="5" fill="none" stroke="#fff" strokeWidth="1.8" />
            <path d="M7 4.5 v5 M4.5 7 h5 M11 11 L16 16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </TBtn>
        <TBtn title="缩小" onClick={() => { setZoom((z) => Math.max(0.05, z / 1.4)); setFit(false) }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="7" cy="7" r="5" fill="none" stroke="#fff" strokeWidth="1.8" />
            <path d="M4.5 7 h5 M11 11 L16 16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </TBtn>
        <div className="w-[10px]" />
        <TBtn title="向左旋转" onClick={() => { setRot((r) => r - 90); playClick() }}>
          <svg width="19" height="18" viewBox="0 0 19 18">
            <path d="M13 9 a5 5 0 1 1 -5 -5" fill="none" stroke="#fff" strokeWidth="1.8" />
            <path d="M8.6 1.2 L8.2 5.2 L12 5.8" fill="#cfe0f5" />
          </svg>
        </TBtn>
        <TBtn title="向右旋转" onClick={() => { setRot((r) => r + 90); playClick() }}>
          <svg width="19" height="18" viewBox="0 0 19 18">
            <path d="M6 9 a5 5 0 1 0 5 -5" fill="none" stroke="#fff" strokeWidth="1.8" />
            <path d="M10.4 1.2 L10.8 5.2 L7 5.8" fill="#cfe0f5" />
          </svg>
        </TBtn>
      </div>

      {/* 画布 */}
      <div ref={containerRef} className="order-1 flex-1 overflow-auto xp-thin-scroll-dark flex items-center justify-center bg-[#3a4a5a] relative" tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') step(-1)
          else if (e.key === 'ArrowRight') step(1)
        }}
      >
        {cur ? (
          err ? (
            <div className="text-[#c8d0da] text-[13px]">无法加载图像 {cur.name}</div>
          ) : (
            <img
              key={cur.name}
              className="xp-imgv-img"
              src={cur.src ?? `/wallpapers/${cur.name.toLowerCase().replace('.jpg', '.jpg')}`}
              alt={cur.name}
              style={{
                transform: `rotate(${rot}deg) scale(${fit ? zoom : zoom})`,
                maxWidth: fit ? 'none' : 'none',
                imageRendering: zoom > 2.5 ? 'pixelated' : 'auto',
              }}
              onLoad={applyFit}
              onError={() => setErr(true)}
            />
          )
        ) : (
          <div className="text-[#c8d0da] text-[13px]">没有可显示的图像</div>
        )}
        {dims ? (
          <div className="absolute bottom-[6px] left-[8px] text-[10px] text-[#a0b0c0]">
            {dims.w}×{dims.h} 像素 · {Math.round(zoom * 100)}% {idx + 1}/{images.length}
          </div>
        ) : null}
        {images.length > 1 ? (
          <div className="absolute top-[6px] right-[10px] text-[10px] text-[#a0b0c0]">{idx + 1} / {images.length}</div>
        ) : null}
      </div>
    </div>
  )
}
