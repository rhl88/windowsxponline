import type React from 'react'

/**
 * 输入框回车统一处理（IME 安全）——修复「输入后回车无任何响应」。
 *
 * 背景：中文输入法组态期间按回车（确认候选/原文上屏），各浏览器 keydown 表现不一：
 * - Chrome/Edge: key='Process'、keyCode=229（code='Enter'）
 * - Firefox:     key='Enter' 但 isComposing=true
 * 此刻组件 state 还是上屏前的旧值（常为空串）——直接执行会拿到空值早退，
 * 用户观感即「回车无响应，必须鼠标点击」。
 *
 * 约定：fn 收到的 val 恒为输入框的实时值——干净回车 = 当前 DOM 值；
 * 组态回车 = compositionend 上屏后的最终值（setTimeout 排到上屏之后）。
 * 调用方内部不要再用闭包里的 state 值（过期闭包陷阱）。
 *
 * 带 Ctrl/Meta/Alt 修饰的回车不归本助手管（如 IE 地址栏 Ctrl+Enter 补全），
 * 返回 false 交还调用方自行处理。
 */
export function imeEnter(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  fn: (val: string) => void,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const n = e.nativeEvent as KeyboardEvent
  const composing = n.isComposing || e.keyCode === 229
  const isEnter = e.key === 'Enter' || (composing && e.code === 'Enter')
  if (!isEnter) return false
  const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement
  if (!composing) {
    e.preventDefault()
    fn(el.value)
    return true
  }
  /* 组态回车：不 preventDefault（避免干扰 IME 提交）；等上屏后取最终值执行 */
  window.setTimeout(() => fn(el.value), 0)
  return true
}
