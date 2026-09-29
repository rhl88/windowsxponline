'use client'

import React, { useMemo, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPRadio, XPCheck } from '../ui'
import { playClick } from '../sounds'
import { assocOf } from '../fs'
import { PROGRAMS } from './OpenWith'
import { Bmp } from '../bmp'

/* ═══════════════════════════════════════════════════════════════
 * 文件夹选项 属性框（XP「工具 → 文件夹选项」/ 控制面板「文件夹选项」）
 * 四页签：常规 / 查看 / 文件类型 / 脱机文件
 * XP 真实语义：查看页设置即时生效（不经过「确定」），取消仅关闭对话框
 * 真实联动：隐藏已知扩展名 / 显示所有文件 / 显示系统文件 / 显示常见任务 / 单击打开
 * ═══════════════════════════════════════════════════════════════ */

/* 查看页「高级设置」行模型：复选 / 单选 / 缩进层级 */
interface ViewRow {
  kind: 'check' | 'radio'
  key: string
  label: string
  indent?: number
}

const VIEW_ROWS: ViewRow[] = [
  { kind: 'check', key: 'rememberView', label: '记住每个文件夹的视图设置' },
  { kind: 'check', key: 'showSysFolderContent', label: '显示系统文件夹的内容' },
  { kind: 'check', key: '_hideSys', label: '隐藏受保护的操作系统文件(推荐)' },
  { kind: 'radio', key: 'hidden:no', label: '不显示隐藏的文件和文件夹' },
  { kind: 'radio', key: 'hidden:yes', label: '显示所有文件和文件夹', indent: 1 },
  { kind: 'check', key: '_hideExt', label: '隐藏已知文件类型的扩展名' },
  { kind: 'check', key: 'fullPathTitle', label: '在标题栏显示完整路径(仅当前文件夹)' },
  { kind: 'check', key: 'sepProcess', label: '在单独的进程中打开文件夹窗口' },
]

/* 文件类型页：默认打开方式表（XP 注册表 Associations 的复刻映射） */
const DEFAULT_OPENERS: Record<string, string> = {
  txt: '记事本', log: '记事本', ini: '记事本', inf: '记事本',
  jpg: 'Windows 图片和传真查看器', jpeg: 'Windows 图片和传真查看器', png: 'Windows 图片和传真查看器',
  gif: 'Windows 图片和传真查看器', bmp: 'Windows 图片和传真查看器',
  mp3: 'Windows Media Player', wav: 'Windows Media Player', wma: 'Windows Media Player',
  mid: 'Windows Media Player', cda: 'Windows Media Player', wmv: 'Windows Media Player',
  avi: 'Windows Media Player', mpg: 'Windows Media Player',
  exe: 'N/A', bat: 'N/A', cmd: 'N/A',
  ttf: 'Windows 字体查看器', ttc: 'Windows 字体查看器', fon: 'Windows 字体查看器',
  zip: '压缩(zipped)文件夹', job: '计划任务',
}

/* 全部已注册扩展名（EXT_TABLE ∪ extAssoc 用户关联） */
function allExtensions(userAssoc: Record<string, string>): string[] {
  const builtIn = ['txt', 'log', 'ini', 'inf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'mp3', 'wav', 'wma', 'mid', 'cda', 'wmv', 'avi', 'mpg', 'exe', 'bat', 'cmd', 'ttf', 'ttc', 'fon', 'zip', 'job']
  return Array.from(new Set([...builtIn, ...Object.keys(userAssoc)])).sort()
}

function extRowIcon(ext: string): React.FC<{ size?: number }> {
  const icon = assocOf(`x.${ext}`)?.icon ?? 'text'
  const map: Record<string, React.FC<{ size?: number }>> = {
    text: () => <Bmp name="txtfile" size={16} />,
    image: () => <Bmp name="imagefile" size={16} />,
    bmp: () => <Bmp name="bmpfile" size={16} />,
    audio: () => <Bmp name="wmp" size={16} />,
    exe: () => <Bmp name="exefile" size={16} />,
    font: () => <Bmp name="fontfile" size={16} />,
    zip: () => <Bmp name="zipfile" size={16} />,
    shortcut: () => <Bmp name="docfile" size={16} />,
  }
  return map[icon] ?? map.text
}

export function FolderOptions({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const showToast = useXP((s) => s.showToast)
  const hideFileExt = useXP((s) => s.hideFileExt)
  const showHiddenFiles = useXP((s) => s.showHiddenFiles)
  const showSystemFiles = useXP((s) => s.showSystemFiles)
  const showCommonTasks = useXP((s) => s.showCommonTasks)
  const clickToOpen = useXP((s) => s.clickToOpen)
  const folderMisc = useXP((s) => s.folderMisc)
  const extAssoc = useXP((s) => s.extAssoc)
  const setFolderOpt = useXP((s) => s.setFolderOpt)

  const [tab, setTab] = useState<'general' | 'view' | 'filetype' | 'offline'>(
    (win.props?.tab as 'view' | 'filetype' | undefined) ?? 'general',
  )
  const [selExt, setSelExt] = useState<string>('txt')

  const misc = folderMisc
  const exts = useMemo(() => allExtensions(extAssoc), [extAssoc])
  const selAssoc = extAssoc[selExt]
  const selProg = PROGRAMS.find((p) => p.id === selAssoc)
  const openerName = selProg ? selProg.name : DEFAULT_OPENERS[selExt] ?? '未知应用程序'

  /* 查看页复选 → 即时生效（XP 真实语义） */
  const applyView = (patch: Parameters<typeof setFolderOpt>[0]) => {
    setFolderOpt(patch)
    playClick()
  }

  /* 取消勾选「隐藏受保护的操作系统文件」→ XP 经典警告 */
  const warnShowSys = () => {
    openApp('dialog', {
      kind: 'confirm',
      title: '警告',
      text: '您已选择显示受保护的操作系统文件(即系统文件)，这些文件是使 Windows 正常运行所必需的。\n\n显示这些文件可能带来危险。\n\n是否显示这些文件？',
      onYes: () => setFolderOpt({ showSystemFiles: true }),
    })
  }

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: 'general', label: '常规' },
    { key: 'view', label: '查看' },
    { key: 'filetype', label: '文件类型' },
    { key: 'offline', label: '脱机文件' },
  ]

  const TabHead = (
    <div className="flex px-[6px] pt-[6px] gap-[2px] border-b border-[#a8a498]">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 text-[11px] ${tab === t.key ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
          onClick={() => { setTab(t.key); playClick() }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      {TabHead}
      <div className="flex-1 min-h-0 overflow-y-auto xp-thin-scroll p-3">
        {/* ═══ 常规页签 ═══ */}
        {tab === 'general' ? (
          <div className="space-y-[10px]">
            <GroupBox title="任务">
              <div className="pt-[2px] space-y-[6px]">
                <XPRadio checked={showCommonTasks} label="在文件夹中显示常见任务" onChange={() => applyView({ showCommonTasks: true })} />
                <XPRadio checked={!showCommonTasks} label="使用 Windows 传统风格的文件夹" onChange={() => applyView({ showCommonTasks: false })} />
                <div className="text-[10px] text-[#5a5a4a] pt-[2px] pl-[22px]">（选择后资源管理器窗口立即切换侧边任务窗格的显示方式）</div>
              </div>
            </GroupBox>
            <GroupBox title="浏览文件夹">
              <div className="pt-[2px] space-y-[6px]">
                <XPRadio checked label="在同一窗口中打开文件夹" onChange={() => showToast('当前已在同一窗口中打开文件夹')} />
                <XPRadio checked={false} label="在不同窗口中打开不同的文件夹" onChange={() => showToast('复刻版说明：多进程浏览暂不支持，保持同一窗口')} />
              </div>
            </GroupBox>
            <GroupBox title="打开项目的方式">
              <div className="pt-[2px] space-y-[6px]">
                <XPRadio checked={!clickToOpen} label="通过双击打开项目(单击一个项目)" onChange={() => applyView({ clickToOpen: false })} />
                <XPRadio checked={clickToOpen} label="通过单击打开项目(指向一个项目)" onChange={() => applyView({ clickToOpen: true })} />
              </div>
            </GroupBox>
            <div className="flex justify-start pt-[2px]">
              <XPButton onClick={() => { playClick(); setFolderOpt({ showCommonTasks: true, clickToOpen: false }); showToast('已恢复常规页默认设置') }}>恢复默认值(D)</XPButton>
            </div>
          </div>
        ) : null}

        {/* ═══ 查看页签（XP 语义：即时生效） ═══ */}
        {tab === 'view' ? (
          <div className="flex flex-col h-full">
            <GroupBox title="高级设置" className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-[180px] xp-sunken bg-white overflow-y-auto xp-thin-scroll py-[3px]">
                {VIEW_ROWS.map((row) => {
                  const pad = { paddingLeft: 6 + (row.indent ?? 0) * 20 }
                  if (row.kind === 'check') {
                    const checked =
                      row.key === '_hideSys' ? !showSystemFiles :
                      row.key === '_hideExt' ? hideFileExt :
                      Boolean(misc[row.key])
                    return (
                      <div key={row.key} style={pad} className="py-[2px]">
                        <XPCheck
                          checked={checked}
                          label={row.label}
                          onChange={() => {
                            if (row.key === '_hideSys') {
                              if (!checked) applyView({ showSystemFiles: false })
                              else warnShowSys()
                            } else if (row.key === '_hideExt') {
                              applyView({ hideFileExt: !hideFileExt })
                            } else {
                              applyView({ folderMisc: { ...misc, [row.key]: !checked } })
                            }
                          }}
                        />
                      </div>
                    )
                  }
                  const yes = row.key === 'hidden:yes'
                  return (
                    <div key={row.key} style={pad} className="py-[2px]">
                      <XPRadio
                        checked={yes ? showHiddenFiles : !showHiddenFiles}
                        label={row.label}
                        onChange={() => applyView({ showHiddenFiles: yes })}
                      />
                    </div>
                  )
                })}
              </div>
            </GroupBox>
            <div className="flex justify-start pt-[8px]">
              <XPButton onClick={() => { playClick(); setFolderOpt({ showSystemFiles: false, showHiddenFiles: false, hideFileExt: true, folderMisc: { rememberView: true, showSysFolderContent: false, fullPathTitle: false, sepProcess: false } }); showToast('已还原文件夹默认查看设置') }}>还原文件夹默认值(R)</XPButton>
            </div>
          </div>
        ) : null}

        {/* ═══ 文件类型页签 ═══ */}
        {tab === 'filetype' ? (
          <div className="flex flex-col h-full gap-[6px]">
            <div>已注册的文件类型(T):</div>
            <div className="flex-1 min-h-[150px] xp-sunken bg-white overflow-y-auto xp-thin-scroll">
              {exts.map((e) => {
                const Icon = extRowIcon(e)
                const assoc = assocOf(`x.${e}`)
                return (
                  <button
                    key={e}
                    type="button"
                    className={`w-full flex items-center gap-[6px] px-2 h-[20px] text-left ${selExt === e ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                    onClick={() => { setSelExt(e); playClick() }}
                  >
                    <Icon size={16} />
                    <span className="w-[52px] shrink-0 uppercase">{e}</span>
                    <span className="flex-1 truncate">{extAssoc[e] ? (PROGRAMS.find((p) => p.id === extAssoc[e])?.name ?? '') + ' 文档' : assoc?.type ?? ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="border border-[#c8c4b8] rounded-[3px] bg-white/60 p-2 space-y-[6px]">
              <div className="font-bold">扩展名详细信息</div>
              <div>扩展名: <span className="uppercase font-bold">.{selExt}</span></div>
              <div className="flex items-center gap-2">
                <span>打开方式:</span>
                {selProg ? <selProg.Icon size={16} /> : <Bmp name="exefile" size={16} />}
                <span className="flex-1">{openerName}</span>
                <XPButton onClick={() => { playClick(); openApp('openwith', { ext: selExt, mode: 'choose' }, '打开方式') }}>更改(K)...</XPButton>
              </div>
            </div>
            <div className="flex justify-start gap-2">
              <XPButton onClick={() => { playClick(); showToast('新建文件类型：请通过「打开方式 → 始终使用」建立关联') }}>新建(N)...</XPButton>
              <XPButton disabled={!extAssoc[selExt]} onClick={() => { playClick(); useXP.getState().clearExtAssoc(selExt); showToast(`已删除 .${selExt} 的自定义关联（恢复系统默认）`) }}>删除(D)</XPButton>
            </div>
          </div>
        ) : null}

        {/* ═══ 脱机文件页签（XP Home 样式） ═══ */}
        {tab === 'offline' ? (
          <div className="space-y-[10px]">
            <div className="flex items-start gap-2">
              <XPCheck checked={false} label="启用脱机文件(E)" onChange={() => showToast('脱机文件在 Web 复刻版中不可用')} />
            </div>
            <div className="text-[11px] text-[#4a4a3a] leading-[17px] pl-[22px]">
              脱机文件让您在网络断开时仍然可以使用网络文件和程序。启用后，Windows 会在您登录时同步这些文件。
            </div>
            <div className="pt-1 space-y-[6px] pl-[22px] opacity-60">
              <XPCheck checked={false} label="登录时同步所有脱机文件(S)" onChange={() => {}} />
              <XPCheck checked={false} label="显示脱机文件的快捷方式图标(D)" onChange={() => {}} />
              <XPCheck checked={false} label="在桌面上放置脱机文件夹快捷方式(P)" onChange={() => {}} />
            </div>
          </div>
        ) : null}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 p-3 pt-[6px] border-t border-[#d8d5c8]">
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>取消</XPButton>
        <XPButton onClick={() => { playClick(); showToast('文件夹选项已应用') }}>应用(A)</XPButton>
      </div>
    </div>
  )
}
