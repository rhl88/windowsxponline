'use client'

/**
 * 桌面项目（显示属性→桌面→自定义桌面）— XP desk.cpl
 *  · 常规页：桌面图标显隐（真实联动桌面渲染）+ 更改图标（Bmp 位图资产网格）+ 还原默认图标
 *  · 桌面清理：每 60 天运行向导复选 + 「现在清理桌面」→ 桌面清理向导（独立窗口）
 *  · Web 页：Active Desktop（XP 结构性还原，简化）
 * 桌面清理向导（DesktopCleanup）：欢迎 → 勾选未使用项 → 移入「未使用的桌面快捷方式」文件夹（XP 真实行为：移动而非删除）
 */

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, XPCheck, GroupBox } from '../ui'
import { Bmp } from '../bmp'
import { resolvePath, userDesktopPath, type FSNode } from '../fs'
import { playClick } from '../sounds'
import { MyComputerIcon, MyDocumentsIcon, NetworkIcon, IEIcon } from '../icons'

/* 桌面系统图标定义（与 Desktop.tsx sys 清单一致） */
const DESK_SYS: Array<{ key: string; label: string; Icon: React.FC<{ size?: number; className?: string }>; bmp: string }> = [
  { key: 'sys:mydocs', label: '我的文档', Icon: MyDocumentsIcon, bmp: 'mydocs' },
  { key: 'sys:mycomputer', label: '我的电脑', Icon: MyComputerIcon, bmp: 'mycomputer' },
  { key: 'sys:network', label: '网上邻居', Icon: NetworkIcon, bmp: 'mynetplaces' },
  { key: 'sys:ie', label: 'Internet Explorer', Icon: IEIcon, bmp: 'ie' },
]

/* 更改图标候选（public/icons 位图资产——真实 XP 图标库） */
const ICON_POOL = [
  'mycomputer', 'mydocs', 'mynetplaces', 'ie', 'recycle-empty', 'folder-plain', 'folder-open',
  'harddrive', 'controlpanel', 'printer', 'search', 'run', 'key', 'clock', 'useravatar', 'winflag',
  'folder-pictures', 'folder-music', 'desktop', 'help',
]

export default function DesktopItems({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const deskIcons = useXP((s) => s.deskIcons)
  const deskIconOverrides = useXP((s) => s.deskIconOverrides)
  const setDeskIcon = useXP((s) => s.setDeskIcon)
  const setDeskIconOverride = useXP((s) => s.setDeskIconOverride)
  const openApp = useXP((s) => s.openApp)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<'gen' | 'web'>('gen')

  /* 草稿：确定才生效（XP 语义） */
  const [draftShow, setDraftShow] = useState<Record<string, boolean>>(() => {
    const d: Record<string, boolean> = {}
    for (const it of DESK_SYS) d[it.key] = deskIcons[it.key] !== false
    return d
  })
  const [draftOv, setDraftOv] = useState<Record<string, string>>({ ...deskIconOverrides })
  const [selKey, setSelKey] = useState('sys:mycomputer')
  const [chgIconFor, setChgIconFor] = useState<string | null>(null)

  const selItem = DESK_SYS.find((i) => i.key === selKey) ?? DESK_SYS[0]

  const apply = () => {
    for (const it of DESK_SYS) setDeskIcon(it.key, draftShow[it.key])
    for (const it of DESK_SYS) {
      const ov = draftOv[it.key]
      if (ov !== (deskIconOverrides[it.key] ?? null)) setDeskIconOverride(it.key, ov ?? null)
    }
    playClick()
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] relative">
      {/* 页签 */}
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['gen', '常规'], ['web', 'Web']] as const).map(([k, t]) => (
          <button
            key={k}
            type="button"
            className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
            onClick={() => { setTab(k); playClick() }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'gen' ? (
          <div className="space-y-2">
            <GroupBox title="桌面图标">
              <div className="p-1 space-y-[1px]">
                {DESK_SYS.map((it) => {
                  const ov = draftOv[it.key]
                  return (
                    <button
                      key={it.key}
                      type="button"
                      className={`w-full flex items-center gap-2 px-1 py-[3px] rounded-[2px] text-left ${selKey === it.key ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
                      onClick={() => setSelKey(it.key)}
                    >
                      <span
                        onClick={(e) => { e.stopPropagation(); setDraftShow((d) => ({ ...d, [it.key]: !d[it.key] })) }}
                        className="shrink-0"
                      >
                        <XPCheck checked={draftShow[it.key]} />
                      </span>
                      <span className="shrink-0">{ov ? <Bmp name={ov} size={32} /> : <it.Icon size={32} />}</span>
                      <span className="truncate">{it.label}</span>
                    </button>
                  )
                })}
                <div className="flex justify-end gap-2 pt-1">
                  <XPButton disabled={selKey === 'sys:recycle'} onClick={() => setChgIconFor(selKey)}>更改图标(C)...</XPButton>
                  <XPButton onClick={() => setDraftOv((d) => { const n = { ...d }; delete n[selKey]; return n })}>还原默认图标(E)</XPButton>
                </div>
              </div>
            </GroupBox>

            <GroupBox title="桌面清理">
              <div className="p-1 space-y-2">
                <XPCheck checked label="桌面清理向导每 60 天运行一次(D)" onChange={() => showToast('桌面清理计划：每 60 天提醒一次（复刻版说明）')} />
                <div className="flex justify-end">
                  <XPButton onClick={() => openApp('deskcleanup', {})}>现在清理桌面(N)...</XPButton>
                </div>
                <div className="text-[#6a6a5a] leading-[15px]">清理向导会将从某个日期起未使用过的桌面项目移到一个名为「未使用的桌面快捷方式」的桌面文件夹中。</div>
              </div>
            </GroupBox>
          </div>
        ) : (
          <div className="space-y-2">
            <XPCheck checked label="在桌面上锁定 Web 项目(W)" onChange={() => showToast('Active Desktop：Web 项目已锁定')} />
            <div className="text-[#1a1a1a]">网页(P):</div>
            <div className="h-[110px] xp-sunken bg-white border border-[#8a8a8a]" data-desk-web-list="1">
              <div className="p-2 text-[#666]">（当前没有活动的 Web 内容）</div>
            </div>
            <div className="flex justify-end gap-2">
              <XPButton disabled>新建(N)...</XPButton>
              <XPButton disabled>删除(D)</XPButton>
              <XPButton disabled>属性(R)</XPButton>
            </div>
          </div>
        )}
      </div>

      {/* 更改图标子对话框（XP：从图标库网格选择） */}
      {chgIconFor ? (
        <ChangeIconDialog
          title={DESK_SYS.find((i) => i.key === chgIconFor)?.label ?? ''}
          current={draftOv[chgIconFor] ?? null}
          onOk={(asset) => { setDraftOv((d) => ({ ...d, [chgIconFor]: asset })); setChgIconFor(null) }}
          onCancel={() => setChgIconFor(null)}
        />
      ) : null}

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 p-2">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ── 更改图标（XP shell32 图标网格） ── */
function ChangeIconDialog({ title, current, onOk, onCancel }: { title: string; current: string | null; onOk: (asset: string) => void; onCancel: () => void }) {
  const [sel, setSel] = useState(current ?? ICON_POOL[0])
  return (
    <div className="absolute inset-0 bg-[#ece9d8] flex flex-col p-3 gap-2 z-20" data-changeicon-dlg="1">
      <div className="text-[12px] font-bold">更改图标</div>
      <div className="leading-[15px]">为「{title}」选择一个图标。可以从列表中选择，也可以浏览其它文件查找图标。</div>
      <div className="text-[#1a1a1a]">从这个文件(T): C:\WINDOWS\system32\shell32.dll</div>
      <div className="flex-1 min-h-0 xp-sunken bg-white overflow-y-auto xp-thin-scroll p-1">
        <div className="flex flex-wrap gap-1">
          {ICON_POOL.map((name) => (
            <button
              key={name}
              type="button"
              className={`w-[44px] h-[44px] flex items-center justify-center rounded-[2px] ${sel === name ? 'bg-[#0a5ec8]' : 'hover:bg-[#e8f0fb]'}`}
              onClick={() => setSel(name)}
              onDoubleClick={() => onOk(name)}
            >
              <Bmp name={name} size={32} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <XPButton primary onClick={() => onOk(sel)}>确定</XPButton>
        <XPButton onClick={onCancel}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════ 桌面清理向导（XP 标志性：未使用桌面项 → 专用文件夹） ═══════════════════ */

export function DesktopCleanup({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const fsTree = useXP((s) => s.fsTree)
  const fsCreateFolder = useXP((s) => s.fsCreateFolder)
  const fsMove = useXP((s) => s.fsMove)
  const programUse = useXP((s) => s.programUse)
  /* 桌面为登录帐户 profile 相对路径（每帐户独立） */
  const DESKTOP_PATH = userDesktopPath(useXP((s) => s.sessionUser))
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<string[] | null>(null)

  /* 桌面真实文件（系统图标不参与清理——XP 行为） */
  const deskFiles = (resolvePath(DESKTOP_PATH, fsTree)?.children ?? []).slice()
  /* 「未使用」判定：快捷方式目标从未打开过（programUse 无记录），或文件没有近期修改记录 */
  const isUnused = (n: FSNode) => {
    if (n.shortcutTo) {
      const appId = n.appId
      return !appId || !programUse[appId]
    }
    if (!n.modified) return true
    const t = Date.parse(n.modified)
    return Number.isNaN(t) || Date.now() - t > 60 * 86400_000
  }
  const [keep, setKeep] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    for (const f of deskFiles) m[f.name] = !isUnused(f)
    return m
  })

  const moveOut = deskFiles.filter((f) => !keep[f.name])
  const run = () => {
    if (moveOut.length === 0) { setDone([]); return }
    const folder = fsCreateFolder(DESKTOP_PATH, '未使用的桌面快捷方式')
    fsMove(moveOut.map((f) => [...DESKTOP_PATH, f.name]), [...DESKTOP_PATH, folder])
    setDone(moveOut.map((f) => f.name))
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]" data-deskcleanup="1">
      {/* 向导头部（XP 向导横幅） */}
      <div className="flex items-start gap-3 p-3 pb-2">
        <Bmp name="displayprops" size={32} />
        <div className="font-bold text-[13px] text-[#0a246a] pt-1">桌面清理向导</div>
      </div>
      <div className="flex-1 min-h-0 px-4 overflow-y-auto xp-thin-scroll">
        {step === 0 ? (
          <div className="leading-[17px] space-y-2 pb-3">
            <p>桌面清理向导可以帮助您清理桌面上的快捷方式和其他项目。</p>
            <p>该向导将把从某个日期起未使用过的桌面项目移到一个名为「未使用的桌面快捷方式」的桌面文件夹中。然后，您可以从该文件夹中恢复这些项目，或在需要时将其删除。</p>
            <p>要继续，请单击「下一步」。</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-2 pb-3">
            <p className="leading-[16px]">请选择要清理的快捷方式。清除不想清理的项目旁边的复选框，然后单击「下一步」。</p>
            <div className="h-[130px] xp-sunken bg-white border border-[#8a8a8a] overflow-y-auto xp-thin-scroll p-1" data-cleanup-list="1">
              {deskFiles.length === 0 ? <div className="p-2 text-[#666]">桌面上没有可清理的项目。</div> : deskFiles.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  className="w-full flex items-center gap-2 px-1 py-[2px] rounded-[2px] text-left hover:bg-[#e8f0fb]"
                  onClick={() => setKeep((k) => ({ ...k, [f.name]: !k[f.name] }))}
                >
                  <XPCheck checked={!keep[f.name]} />
                  <Bmp name={f.icon === 'image' || f.icon === 'bmp' ? 'imagefile' : f.icon === 'shortcut' ? 'txtfile' : f.kind === 'folder' ? 'folder-plain' : 'txtfile'} size={16} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-[10px] text-[#888]">{isUnused(f) ? '未使用' : '最近使用'}</span>
                </button>
              ))}
            </div>
            <p className="text-[#6a6a5a] leading-[15px]">将移动 {moveOut.length} 个项目到「未使用的桌面快捷方式」文件夹。</p>
          </div>
        ) : (
          <div className="leading-[17px] space-y-2 pb-3">
            <p>正在完成桌面清理向导</p>
            {done && done.length > 0 ? (
              <>
                <p>已将下列 {done.length} 个项目移动到桌面上的「未使用的桌面快捷方式」文件夹：</p>
                <div className="xp-sunken bg-white border border-[#8a8a8a] p-2 max-h-[100px] overflow-y-auto xp-thin-scroll">
                  {done.map((n) => <div key={n}>· {n}</div>)}
                </div>
              </>
            ) : (
              <p>没有需要清理的项目。您的桌面非常整洁。</p>
            )}
            <p>单击「完成」关闭向导。</p>
          </div>
        )}
      </div>
      {/* 向导按钮 */}
      <div className="flex justify-end gap-2 p-3 pt-2">
        {step === 1 ? <XPButton disabled={false} onClick={() => setStep(0)}>上一步(B)</XPButton> : null}
        {step < 2 ? (
          <XPButton primary onClick={() => { if (step === 1) run(); setStep(step + 1) }}>下一步(N) &gt;</XPButton>
        ) : (
          <XPButton primary onClick={() => closeWindow(win.id)}>完成</XPButton>
        )}
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}
