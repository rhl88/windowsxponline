'use client'

import React, { useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, Sunken } from '../ui'
import { Bmp } from '../bmp'
import { playClick, playDing } from '../sounds'

/* ═══════════ 添加或删除程序（appwiz.cpl） ═══════════
   三页签：更改或删除程序 / 添加新程序 / 添加/删除 Windows 组件 */

interface ProgItem {
  name: string
  size: string
  icon: string
  system?: boolean /* 系统组件：删除时走"不可卸载"分支 */
  used?: string
}

const INIT_PROGS: ProgItem[] = [
  { name: 'Internet Explorer 6', size: '17.6 MB', icon: 'ie', system: true, used: '经常' },
  { name: 'Outlook Express 6', size: '12.4 MB', icon: 'oe', system: true, used: '经常' },
  { name: 'Windows Media Player 8', size: '8.9 MB', icon: 'wmp', system: true, used: '偶尔' },
  { name: '三维弹球 - 太空军校生', size: '2.9 MB', icon: 'pinball' },
  { name: '写字板', size: '1.2 MB', icon: 'wordpad' },
  { name: '记事本', size: '0.68 MB', icon: 'notepad' },
  { name: '画图', size: '0.54 MB', icon: 'paint' },
  { name: 'Windows 图片和传真查看器', size: '0.42 MB', icon: 'imagefile' },
  { name: '命令提示符', size: '0.38 MB', icon: 'cmd', system: true },
  { name: '纸牌', size: '0.18 MB', icon: 'solitaire' },
  { name: '红心大战', size: '0.17 MB', icon: 'hearts' },
  { name: '字符映射表', size: '0.16 MB', icon: 'charmap' },
  { name: '空当接龙', size: '0.15 MB', icon: 'freecell' },
  { name: '扫雷', size: '0.12 MB', icon: 'mine' },
  { name: '计算器', size: '0.11 MB', icon: 'calculator' },
  { name: '录音机', size: '0.09 MB', icon: 'sndrec' },
  { name: 'Windows 任务管理器', size: '0.09 MB', icon: 'taskmgr', system: true },
]

/* Windows 组件列表（向导用） */
const WIN_COMPONENTS: Array<{ name: string; desc: string; size: string; checked: boolean; locked?: boolean }> = [
  { name: 'Internet Explorer', desc: 'Internet Explorer 6 网页浏览器与浏览组件。', size: '17.6 MB', checked: true, locked: true },
  { name: 'Outlook Express', desc: '电子邮件与新闻组阅读程序。', size: '12.4 MB', checked: true, locked: true },
  { name: 'Windows Media Player', desc: '多媒体播放器与流媒体组件。', size: '8.9 MB', checked: true },
  { name: '附件和工具', desc: '包括画图、计算器、写字板、记事本与娱乐工具。', size: '3.7 MB', checked: true, locked: true },
  { name: '游戏', desc: '扫雷、纸牌、空当接龙、红心大战与三维弹球。', size: '3.5 MB', checked: true },
  { name: '管理和监视工具', desc: '磁盘清理、磁盘碎片整理程序与系统信息。', size: '1.9 MB', checked: true },
  { name: '网络服务', desc: '简单 TCP/IP 服务与拨号连接支持。', size: '0.6 MB', checked: false },
]

export default function AddRemove({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<'chg' | 'add' | 'comps'>((win.props.tab as 'chg' | 'add' | 'comps') ?? 'chg')
  const [progs, setProgs] = useState<ProgItem[]>(INIT_PROGS)
  const [sel, setSel] = useState<number>(-1)
  const [deleting, setDeleting] = useState<string | null>(null)
  /* 组件向导状态 */
  const [wizStep, setWizStep] = useState(0) /* 0 列表 / 1 配置进度 / 2 完成 */
  const [comps, setComps] = useState(WIN_COMPONENTS)
  const [progPct, setProgPct] = useState(0)

  const selItem = sel >= 0 && sel < progs.length ? progs[sel] : null
  const totalSize = useMemo(() => progs.length * 3 + 12, [progs.length])

  /* 删除流程：普通程序 → 确认 → 模拟卸载进度 → 移出列表；系统组件 → XP 经典拒卸 */
  const doDelete = (item: ProgItem) => {
    if (item.system) {
      openApp('dialog', {
        kind: 'error',
        title: item.name,
        text: `无法卸载 ${item.name}。\n\n它是 Windows XP 的一部分，\n不能被单独删除。`,
      })
      return
    }
    openApp('dialog', {
      kind: 'confirm',
      title: '确认卸载',
      text: `确实要卸载 ${item.name} 吗？`,
      yesLabel: '是(Y)',
      noLabel: '否(N)',
      onYes: () => {
        setDeleting(item.name)
        setProgPct(0)
      },
    })
  }

  /* 卸载进度动画 */
  React.useEffect(() => {
    if (!deleting) return
    if (progPct >= 100) {
      const t = setTimeout(() => {
        setProgs((p) => p.filter((x) => x.name !== deleting))
        setSel(-1)
        setDeleting(null)
        playDing()
        showToast(`已成功卸载 ${deleting}（开始菜单里可能还有它的幽灵，复刻版特色）`)
      }, 350)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setProgPct((p) => Math.min(100, p + 4 + Math.random() * 9)), 90)
    return () => clearTimeout(t)
  }, [deleting, progPct, showToast])

  /* 组件向导"配置"进度 */
  React.useEffect(() => {
    if (wizStep !== 1) return
    if (progPct >= 100) {
      const t = setTimeout(() => { setWizStep(2); playDing() }, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setProgPct((p) => Math.min(100, p + 3 + Math.random() * 7)), 80)
    return () => clearTimeout(t)
  }, [wizStep, progPct])

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      {/* 顶部当前程序排序选择 */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span className="text-[#3a3a2a]">排序方式(S):</span>
        <Sunken className="flex-1 max-w-[190px] h-[19px] flex items-center px-1 bg-white">
          名称
        </Sunken>
        <div className="flex-1" />
        <span className="text-[#5a5a4a]">{progs.length} 个程序，共 {totalSize.toFixed(1)} MB</span>
      </div>

      <div className="flex-1 flex min-h-0 px-3 pb-2 gap-0">
        {/* 左侧竖排页签（XP 经典三栏导航） */}
        <div className="w-[118px] shrink-0 flex flex-col gap-[2px] pt-1 pr-2">
          {([['chg', '更改或删除程序'], ['add', '添加新程序'], ['comps', '添加/删除 Windows 组件']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`text-left px-2 py-[5px] rounded-[3px] leading-[14px] ${tab === k ? 'bg-[#d8e5f8] border border-[#7ba2e8] font-bold text-[#16398f]' : 'hover:bg-[#e8f0fb] border border-transparent text-[#2a2a1a]'}`}
              onClick={() => { setTab(k); setSel(-1); setWizStep(0); playClick() }}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="text-[9px] text-[#8a8a7a] pb-1">appwiz.cpl</div>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 min-w-0 flex flex-col bg-white border border-[#a8a898] rounded-[2px] overflow-hidden">
          {/* ── 更改或删除程序 ── */}
          {tab === 'chg' ? (
            <>
              <div className="px-3 pt-2 pb-1 font-bold text-[#2a4fb8]">当前安装的程序：</div>
              <div className="flex-1 overflow-y-auto xp-thin-scroll border-t border-[#d8d5c8]">
                {deleting ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="font-bold">{deleting}</div>
                    <div className="w-[240px] h-[18px] bg-[#ece9d8] border border-[#8a867e] rounded-[2px] overflow-hidden">
                      <div className="h-full bg-gradient-to-b from-[#5a8ae8] to-[#2a5ac0] blocks-anim" style={{ width: `${progPct}%` }} />
                    </div>
                    <div className="text-[#5a5a4a]">正在删除 {deleting} 的文件…… {Math.round(progPct)}%</div>
                  </div>
                ) : (
                  progs.map((p, i) => (
                    <button
                      key={p.name}
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-[5px] text-left ${sel === i ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                      onClick={() => { setSel(i); playClick() }}
                      onDoubleClick={() => doDelete(p)}
                    >
                      <Bmp name={p.icon} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className={`truncate ${sel === i ? 'font-bold' : ''}`}>{p.name}</div>
                      </div>
                      <div className={`w-[64px] text-right shrink-0 ${sel === i ? 'text-white/90' : 'text-[#5a5a4a]'}`}>{p.size}</div>
                      <div className={`w-[38px] text-right shrink-0 hidden xl:block ${sel === i ? 'text-white/90' : 'text-[#5a5a4a]'}`}>{p.used ?? '很少'}</div>
                    </button>
                  ))
                )}
              </div>
              {/* 底部选中项操作条 */}
              <div className="border-t border-[#d8d5c8] bg-[#f4f2e8] px-3 py-[6px] flex items-center gap-3">
                {selItem ? (
                  <>
                    <Bmp name={selItem.icon} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{selItem.name}</div>
                      <div className="text-[#5a5a4a]">大小: {selItem.size}　使用频率: {selItem.used ?? '很少'}</div>
                    </div>
                    <XPButton onClick={() => doDelete(selItem)}>删除(D)</XPButton>
                  </>
                ) : (
                  <div className="text-[#8a8a7a] py-1">请选择要更改或删除的程序。</div>
                )}
              </div>
            </>
          ) : null}

          {/* ── 添加新程序 ── */}
          {tab === 'add' ? (
            <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 space-y-4">
              <GroupBox title="从 CD-ROM 或软盘安装程序" className="!mb-0">
                <div className="flex items-center gap-3 p-2">
                  <Bmp name="cddrive" size={32} />
                  <div className="flex-1 leading-[15px] text-[#3a3a2a]">从 CD 或软盘安装新程序：</div>
                  <XPButton onClick={() => { playDing(); showToast('请插入安装光盘……光驱里躺着的是一盘《传奇》盗版碟') }}>光盘或软盘(F)...</XPButton>
                </div>
              </GroupBox>
              <GroupBox title="从 Microsoft 添加程序" className="!mb-0">
                <div className="flex items-center gap-3 p-2">
                  <Bmp name="ie" size={32} />
                  <div className="flex-1 leading-[15px] text-[#3a3a2a]">
                    Windows Update：<br />
                    <span className="text-[#5a5a4a]">添加 Windows 新功能、设备驱动程序和系统更新。</span>
                  </div>
                  <XPButton onClick={() => openApp('ie', { url: 'http://windowsupdate.microsoft.com/' })}>Windows Update(W)</XPButton>
                </div>
              </GroupBox>
              <div className="text-[10px] text-[#8a8a7a] px-1">提示：本复刻版的所有程序都是"预装正版"，无需要安装。</div>
            </div>
          ) : null}

          {/* ── Windows 组件向导 ── */}
          {tab === 'comps' ? (
            <div className="flex-1 flex flex-col min-h-0 p-3">
              {wizStep === 0 ? (
                <>
                  <div className="mb-2 leading-[15px] text-[#3a3a2a]">
                    <span className="font-bold">Windows 组件</span><br />
                    可以添加或删除 Windows XP 的组件。
                  </div>
                  <div className="flex-1 min-h-0 bg-white border border-[#8a867e] rounded-[2px] overflow-y-auto xp-thin-scroll">
                    {comps.map((c, i) => (
                      <button key={c.name} type="button" className="w-full flex items-center gap-2 px-2 py-[4px] text-left hover:bg-[#e8f0fb]" onClick={() => {
                        if (c.locked) { showToast(`${c.name} 是 Windows XP 必需组件，无法取消`); return }
                        setComps((cs) => cs.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))
                        playClick()
                      }}>
                        <span className={`w-[13px] h-[13px] shrink-0 border border-[#6a6a5a] bg-white flex items-center justify-center ${comps[i].checked ? 'bg-[#316ac5] border-[#316ac5]' : ''}`}>
                          {comps[i].checked ? <span className="text-white text-[9px] leading-none">✓</span> : null}
                        </span>
                        <span className="flex-1">{c.name}{c.locked ? '（必需）' : ''}</span>
                        <span className="text-[#5a5a4a] text-right w-[56px]">{c.size}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[#5a5a4a] leading-[15px] min-h-[32px]">
                    {selItem ? '' : ''}
                    {comps.find((c) => c.locked && false)?.desc ?? '描述: 选择组件并单击"下一步"开始配置。'}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <span className="text-[#5a5a4a] mr-auto">所需磁盘空间: {comps.filter((c) => c.checked).reduce((a, c) => a + parseFloat(c.size), 0).toFixed(1)} MB</span>
                    <XPButton primary onClick={() => { setProgPct(0); setWizStep(1); playClick() }}>下一步(N) &gt;</XPButton>
                  </div>
                </>
              ) : null}
              {wizStep === 1 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="text-[12px] font-bold">正在配置组件</div>
                  <div className="w-[260px] h-[18px] bg-[#ece9d8] border border-[#8a867e] rounded-[2px] overflow-hidden">
                    <div className="h-full bg-gradient-to-b from-[#5a8ae8] to-[#2a5ac0]" style={{ width: `${progPct}%` }} />
                  </div>
                  <div className="text-[#5a5a4a]">正在复制文件…… {Math.round(progPct)}%</div>
                </div>
              ) : null}
              {wizStep === 2 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Bmp name="controlpanel" size={40} />
                  <div className="text-[12px] font-bold">已成功完成 Windows 组件向导</div>
                  <div className="text-[#5a5a4a] text-center leading-[15px]">您已成功完成了 Windows 组件向导。<br />所选组件已全部配置。</div>
                  <XPButton primary onClick={() => { setWizStep(0); playClick() }}>完成</XPButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部状态条 */}
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-3 text-[#5a5a4a]">
        添加或删除程序
        <div className="flex-1" />
        <button type="button" className="text-[#1145c4] hover:underline" onClick={() => closeWindow(win.id)}>关闭(C)</button>
      </div>
    </div>
  )
}
