'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton } from '../ui'
import { RunIcon } from '../app-icons'
import { playClick } from '../sounds'
import { openEditCtx } from '../ctx-menus'
import { imeEnter } from '../ime-keys'

const APP_MAP: Record<string, { app: string; label?: string; props?: Record<string, unknown> }> = {
  notepad: { app: 'notepad' },
  calc: { app: 'calculator' },
  mspaint: { app: 'paint' },
  pbrush: { app: 'paint' },
  write: { app: 'wordpad' },
  wordpad: { app: 'wordpad' },
  iexplore: { app: 'ie' },
  winmine: { app: 'minesweeper' },
  sol: { app: 'solitaire' },
  freecell: { app: 'freecell' },
  mshearts: { app: 'hearts' },
  pinball: { app: 'pinball' },
  wmplayer: { app: 'wmp' },
  msimn: { app: 'outlook' },
  cmd: { app: 'cmd' },
  command: { app: 'cmd' },
  taskmgr: { app: 'taskmgr' },
  explorer: { app: 'explorer' },
  regedit: { app: 'regedit', label: '注册表编辑器' },
  control: { app: 'controlpanel', label: '控制面板' },
  'desk.cpl': { app: 'display' },
  'desk.cpl,,3': { app: 'display' },
  'sysdm.cpl': { app: 'sysprops', label: '系统属性' },
  winver: { app: 'about', label: '关于 Windows' },
  cleanmgr: { app: 'diskclean', label: '磁盘清理' },
  dfrg: { app: 'defrag', label: '磁盘碎片整理程序' },
  chkdsk: { app: 'chkdsk', label: '检查磁盘', props: { drive: 'C:' } },
  apicfg: { app: 'apicfg', label: 'API 数据源设置' },
  format: { app: 'format', label: '格式化', props: { drive: 'A:' } },
  msinfo32: { app: 'sysinfo', label: '系统信息' },
  sndvol32: { app: 'volume', label: '音量控制' },
  find: { app: 'search', label: '搜索结果' },
  'nusrmgr.cpl': { app: 'useraccounts', label: '用户帐户' },
  helpctr: { app: 'helpcenter', label: '帮助和支持中心' },
  sndrec32: { app: 'sndrec', label: '录音机' },
  charmap: { app: 'charmap', label: '字符映射表' },
  clipbrd: { app: 'clipbrd', label: '剪贴板查看器' },
  shimgvw: { app: 'imgviewer', label: 'Windows 图片和传真查看器' },
  'timedate.cpl': { app: 'datetime', label: '日期和时间 属性' },
  'inetcpl.cpl': { app: 'inetopts', label: 'Internet 选项' },
  'main.cpl': { app: 'mouseprops', label: '鼠标 属性' },
  'main.cpl,,1': { app: 'keyboardprops', label: '键盘 属性' },
  'mmsys.cpl': { app: 'soundprops', label: '声音和音频设备 属性' },
  'powercfg.cpl': { app: 'powerprops', label: '电源选项 属性' },
  'intl.cpl': { app: 'intlprops', label: '区域和语言选项' },
  'control folders': { app: 'folderoptions', label: '文件夹选项' },
  'access.cpl': { app: 'accessprops', label: '辅助功能选项' },
  /* MMC 管理单元 */
  'compmgmt.msc': { app: 'compmgmt', label: '计算机管理' },
  compmgmt: { app: 'compmgmt', label: '计算机管理' },
  'services.msc': { app: 'services', label: '服务' },
  'eventvwr.msc': { app: 'eventvwr', label: '事件查看器' },
  eventvwr: { app: 'eventvwr', label: '事件查看器' },
  'perfmon.msc': { app: 'perfmon', label: '性能' },
  perfmon: { app: 'perfmon', label: '性能' },
  'secpol.msc': { app: 'secpol', label: '本地安全设置' },
  secpol: { app: 'secpol', label: '本地安全设置' },
  odbcad32: { app: 'odbc', label: 'ODBC 数据源管理器' },
  /* 辅助工具 */
  osk: { app: 'osk', label: '屏幕键盘' },
  magnify: { app: 'magnifier', label: '放大镜' },
  narrator: { app: 'narrator', label: '讲述人' },
  utilman: { app: 'utilman', label: '辅助工具管理器' },
  /* control 命令 */
  'control admintools': { app: 'admintools', label: '管理工具' },
  'control printers': { app: 'printfax', label: '打印机和传真' },
  'control mouse': { app: 'mouseprops', label: '鼠标 属性' },
  'control userpasswords': { app: 'useraccounts', label: '用户帐户' },
  'control keyboard': { app: 'keyboardprops', label: '键盘 属性' },
  'control desktop': { app: 'display', label: '显示 属性' },
  'control color': { app: 'display', label: '显示 属性' },
  'control date': { app: 'datetime', label: '日期和时间 属性' },
  'control fonts': { app: 'fonts', label: 'Fonts' },
  'control schedtasks': { app: 'taskssched', label: 'Tasks' },
  'control tasks': { app: 'taskssched', label: 'Tasks' },
  'control intl': { app: 'intlprops', label: '区域和语言选项' },
  'control powercfg': { app: 'powerprops', label: '电源选项 属性' },
  'control access': { app: 'accessprops', label: '辅助功能选项' },
  'control taskbar': { app: 'taskbarprops', label: '任务栏和「开始」菜单属性' },
  'taskbar.cpl': { app: 'taskbarprops', label: '任务栏和「开始」菜单属性' },
  fonts: { app: 'fonts', label: 'Fonts' },
}

export default function RunDialog({ win }: { win: WinState }) {
  const [value, setValue] = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [hi, setHi] = useState(0)
  /* 用户是否用箭头键导航过下拉（决定 Enter 跑选中项还是输入框内容——XP 组合框语义） */
  const [dropNav, setDropNav] = useState(false)
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const setRect = useXP((s) => s.setRect)
  const runHistory = useXP((s) => s.runHistory)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRect(win.id, { w: 400, h: 190 })
    const vw = window.innerWidth
    setRect(win.id, { x: Math.round((vw - 400) / 2), y: 160, w: 400, h: 190 })
    inputRef.current?.focus()
  }, [setRect, win.id])

  /* 点击下拉外部关闭 */
  useEffect(() => {
    if (!dropOpen) return
    const onDown = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setDropOpen(false)
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [dropOpen])

  const run = (raw?: string) => {
    const v = (raw ?? value).trim()
    if (!v) return
    const cmd = v.toLowerCase()
    const hit = APP_MAP[cmd]
    playClick()
    /* XP 真实行为：运行命令进入 MRU 历史 */
    useXP.getState().pushRunHistory(v)
    if (hit) {
      openApp(hit.app, hit.props ?? {}, hit.label)
      closeWindow(win.id)
    } else {
      /* URL → 用 IE 打开 */
      if (/^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v)) {
        openApp('ie', { url: v })
        closeWindow(win.id)
        return
      }
      useXP.getState().openApp('dialog', {
        kind: 'error',
        title: '运行错误',
        text: `Windows 找不到文件 "${v}"。请确定文件名是否正确后重试。\n\n提示：试试 notepad、calc、mspaint、winmine、sol、cmd、sndrec32、charmap、iexplore，或直接输入网址。`,
      })
    }
  }

  /* 下拉列表键盘导航（↑↓ 选择；Enter/Esc 在 onKeyDown 统一分发，避免双重执行） */
  const onDropKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(runHistory.length - 1, i + 1))
      setDropNav(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(0, i - 1))
      setDropNav(true)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-4">
      <div className="flex items-start gap-4">
        <RunIcon size={34} />
        <div className="text-[11px] leading-[16px]">
          请键入程序、文件夹、文档或 Internet 资源的名称，Windows 将为您打开它。
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 px-1 relative">
        <span className="text-[11px]">打开(O):</span>
        {/* XP 真实组合框：输入框 + 右侧下拉按钮 */}
        <div className="relative flex-1" ref={dropRef}>
          <div className="xp-sunken flex items-stretch bg-white h-[20px]">
            <input
              ref={inputRef}
              className="flex-1 px-2 text-[12px] outline-none bg-transparent min-w-0"
              value={value}
              spellCheck={false}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (dropOpen) setDropOpen(false)
                  else closeWindow(win.id)
                  return
                }
                if (dropOpen) {
                  onDropKey(e)
                  /* 干净回车：箭头选中过→跑选中项，否则跑输入框内容；组态回车→跑上屏后输入值 */
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    setDropOpen(false)
                    if (dropNav && runHistory[hi]) run(runHistory[hi])
                    else run(inputRef.current?.value ?? value)
                  } else {
                    imeEnter(e, (v) => {
                      setDropOpen(false)
                      run(v)
                    })
                  }
                  return
                }
                /* IME 安全回车：中文输入法组态回车不再「无响应」 */
                imeEnter(e, (v) => run(v))
              }}
              onContextMenu={openEditCtx}
            />
            <button
              type="button"
              aria-label="历史记录"
              className="w-[17px] shrink-0 flex items-center justify-center hover:bg-[#e3e0d0] active:bg-[#cfcbb8]"
              onClick={() => {
                setHi(0)
                setDropNav(false)
                setDropOpen((v) => !v)
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11">
                <path d="M1.5 3 L5.5 7.5 L9.5 3" stroke="#333" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {dropOpen && runHistory.length > 0 ? (
            <div className="absolute left-0 right-0 top-[21px] z-50 bg-white border border-[#7f9db9] shadow-md max-h-[132px] overflow-auto">
              {runHistory.map((h, i) => (
                <div
                  key={h}
                  className={`px-2 py-[2px] text-[12px] cursor-default ${i === hi ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8eef8]'}`}
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setDropOpen(false)
                    run(h)
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex justify-end gap-2">
        <XPButton primary onClick={() => run(inputRef.current?.value ?? value)}>
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => useXP.getState().openApp('explorer', {})}>浏览...</XPButton>
      </div>
    </div>
  )
}
