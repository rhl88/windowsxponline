'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPRadio } from '../ui'
import { Bmp } from '../bmp'
import { playClick, playDing } from '../sounds'

/* ═══════════ 通用"打印"对话框（记事本 / 写字板 / IE 共用） ═══════════
   props: { appName: 打印来源应用名, pages?: 总页数 }
   有打印机 → 完整打印对话框（选打印机/范围/份数 → 模拟打印）
   无打印机 → XP 真实行为：显示"无法打印"错误提示 */

export default function PrintDialog({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const setWindowTitle = useXP((s) => s.setWindowTitle)
  const showToast = useXP((s) => s.showToast)
  const printers = useXP((s) => s.printers)
  const appName = (win.props.appName as string) ?? '文档'
  const pages = (win.props.pages as number) ?? 1

  const [selName, setSelName] = useState(printers.find((p) => p.def)?.name ?? printers[0]?.name ?? '')
  const [copies, setCopies] = useState(1)
  const [allPages, setAllPages] = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    setWindowTitle(win.id, '打印')
  }, [setWindowTitle, win.id])

  const sel = printers.find((p) => p.name === selName)

  /* ── 无打印机：XP 经典"无法打印"提示（保留关闭/取消） ── */
  if (printers.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#ece9d8] select-none" onContextMenu={(e) => e.preventDefault()}>
        <div className="flex-1 flex items-start gap-4 p-4">
          <Bmp name="dlg-error" size={32} />
          <div className="text-[11px] leading-[16px] whitespace-pre-wrap flex-1">
            {`无法打印 ${appName}。\n\n没有安装打印机。要安装打印机，\n请打开"打印机和传真"，双击"添加打印机"，\n然后按照向导中的提示操作。`}
          </div>
        </div>
        <div className="flex justify-center pb-4">
          <XPButton primary autoFocus onClick={() => closeWindow(win.id)}>确定</XPButton>
        </div>
      </div>
    )
  }

  /* ── 正在打印动画 ── */
  if (printing) {
    return (
      <div className="flex flex-col h-full bg-[#ece9d8] select-none items-center justify-center gap-3" onContextMenu={(e) => e.preventDefault()}>
        <Bmp name="printer" size={40} />
        <div className="text-[12px] font-bold">正在打印到 {selName}</div>
        <div className="text-[11px] text-[#5a5a4a]">{appName}，共 {pages} 页，{copies} 份</div>
        <div className="w-[240px] h-[16px] bg-[#ece9d8] border border-[#8a867e] rounded-[2px] overflow-hidden">
          <div className="h-full bg-gradient-to-b from-[#5a8ae8] to-[#2a5ac0] printing-anim" />
        </div>
        <XPButton onClick={() => { closeWindow(win.id); showToast('已取消打印（纸还没吃进去）') }}>取消打印</XPButton>
      </div>
    )
  }

  /* ── 标准打印对话框 ── */
  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto xp-thin-scroll">
        {/* 打印机选择 */}
        <GroupBox title="选择打印机" className="!mb-0">
          <div className="p-1">
            {printers.map((p) => (
              <label key={p.name} className="flex items-center gap-2 py-[3px] cursor-pointer">
                <input
                  type="radio"
                  name={`pr-${win.id}`}
                  checked={selName === p.name}
                  onChange={() => { setSelName(p.name); playClick() }}
                  className="accent-[#316ac5]"
                />
                <Bmp name="printer" size={18} />
                <span>{p.name}{p.def ? '（默认）' : ''}</span>
              </label>
            ))}
            <div className="pl-6 pt-1 text-[10px] text-[#5a5a4a]">
              状态: 就绪　类型: {sel?.model ?? '激光打印机'}<br />
              位置: LPT1:
            </div>
          </div>
        </GroupBox>

        {/* 打印范围 */}
        <GroupBox title="打印范围" className="!mb-0">
          <div className="p-1 space-y-[5px]">
            <XPRadio checked={allPages} label={`全部(A)  共 ${pages} 页`} onChange={() => { setAllPages(true); playClick() }} />
            <div className="flex items-center gap-2">
              <XPRadio checked={!allPages} label="页码范围(G):" onChange={() => { setAllPages(false); playClick() }} />
              <input
                className="w-[90px] h-[19px] border border-[#8a867e] bg-white rounded-[2px] px-1 focus:outline-none disabled:opacity-50"
                value={allPages ? '' : '1-1'}
                disabled={allPages}
                onChange={() => undefined}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </GroupBox>

        {/* 份数 */}
        <GroupBox title="副本" className="!mb-0">
          <div className="p-1 flex items-center gap-2">
            <span>份数(C):</span>
            <input
              type="number"
              min={1}
              max={99}
              className="w-[52px] h-[19px] border border-[#8a867e] bg-white rounded-[2px] px-1 focus:outline-none"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <span className="text-[10px] text-[#5a5a4a]">（逐份打印）</span>
          </div>
        </GroupBox>
      </div>

      <div className="flex justify-end gap-2 px-3 pb-3">
        <XPButton primary onClick={() => {
          setPrinting(true)
          playDing()
          /* 文档真实入队（打印队列窗口实时可见，完成自动出队） */
          for (let i = 0; i < copies; i++) {
            useXP.getState().addPrintJob(selName, copies > 1 ? `${appName} (${i + 1}/${copies})` : appName, pages)
          }
          window.setTimeout(() => showToast(`已将 ${pages} 页 × ${copies} 份发送到 ${selName}（双击“打印机和传真”里的打印机可查看队列）`), 1600)
        }}>
          打印(P)
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}
