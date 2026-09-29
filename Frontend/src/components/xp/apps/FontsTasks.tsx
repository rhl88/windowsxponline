'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { MenuBar, XPButton, GroupBox, XPCheck } from '../ui'
import { playClick } from '../sounds'
import { Bmp } from '../bmp'

/* ═══════════════════════════════════════════════════════════════
   FontsTasks — 字体文件夹 / 字体预览 / 任务计划（含向导）
   ═══════════════════════════════════════════════════════════════ */

/* ── 真实 XP 中文版系统字体表（名称/文件/CSS family/大小/版本） ── */
export interface FontInfo {
  file: string
  name: string
  en: string
  family: string
  size: string
  version: string
  variants?: string[] /* 同族变体（Bold/Italic 等，真实 XP 折叠显示） */
}

export const FONTS: FontInfo[] = [
  { file: 'SIMSUN.TTC', name: '宋体', en: 'SimSun', family: 'SimSun, serif', size: '10,304 KB', version: '3.02', variants: ['新宋体 (NSimSun)'] },
  { file: 'SIMHEI.TTF', name: '黑体', en: 'SimHei', family: 'SimHei, sans-serif', size: '9,732 KB', version: '1.02' },
  { file: 'SIMKAI.TTF', name: '楷体_GB2312', en: 'KaiTi_GB2312', family: 'KaiTi, cursive', size: '2,288 KB', version: '2.81' },
  { file: 'SIMFANG.TTF', name: '仿宋_GB2312', en: 'FangSong_GB2312', family: 'FangSong, serif', size: '2,120 KB', version: '2.81' },
  { file: 'STZHONGS.TTF', name: '隶书', en: 'LiSu', family: 'LiSu, serif', size: '4,620 KB', version: '1.00' },
  { file: 'SIMYOU.TTF', name: '幼圆', en: 'YouYuan', family: 'YouYuan, sans-serif', size: '3,244 KB', version: '1.00' },
  { file: 'SIMSUN18030.TTC', name: '宋体-18030', en: 'SimSun-ExtB', family: 'SimSun, serif', size: '19,204 KB', version: '1.00' },
  { file: 'ARIAL.TTF', name: 'Arial', en: 'Arial', family: 'Arial, sans-serif', size: '367 KB', version: '2.82', variants: ['Arial Bold', 'Arial Italic', 'Arial Bold Italic'] },
  { file: 'TIMES.TTF', name: 'Times New Roman', en: 'Times New Roman', family: '"Times New Roman", serif', size: '383 KB', version: '2.82', variants: ['Times New Roman Bold', 'Times New Roman Italic', 'Times New Roman Bold Italic'] },
  { file: 'COUR.TTF', name: 'Courier New', en: 'Courier New', family: '"Courier New", monospace', size: '316 KB', version: '2.82', variants: ['Courier New Bold', 'Courier New Italic', 'Courier New Bold Italic'] },
  { file: 'TAHOMA.TTF', name: 'Tahoma', en: 'Tahoma', family: 'Tahoma, sans-serif', size: '260 KB', version: '3.16', variants: ['Tahoma Bold'] },
  { file: 'VERDANA.TTF', name: 'Verdana', en: 'Verdana', family: 'Verdana, sans-serif', size: '272 KB', version: '2.43', variants: ['Verdana Bold', 'Verdana Italic', 'Verdana Bold Italic'] },
  { file: 'TREBUC.TTF', name: 'Trebuchet MS', en: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif', size: '160 KB', version: '1.22', variants: ['Trebuchet MS Bold', 'Trebuchet MS Italic'] },
  { file: 'GEORGIA.TTF', name: 'Georgia', en: 'Georgia', family: 'Georgia, serif', size: '176 KB', version: '2.05', variants: ['Georgia Bold', 'Georgia Italic'] },
  { file: 'COMIC.TTF', name: 'Comic Sans MS', en: 'Comic Sans MS', family: '"Comic Sans MS", cursive', size: '121 KB', version: '2.10', variants: ['Comic Sans MS Bold'] },
  { file: 'IMPACT.TTF', name: 'Impact', en: 'Impact', family: 'Impact, sans-serif', size: '133 KB', version: '2.35' },
  { file: 'PALA.TTF', name: 'Palatino Linotype', en: 'Palatino Linotype', family: '"Palatino Linotype", serif', size: '392 KB', version: '1.40' },
  { file: 'MICROSS.TTF', name: 'Microsoft Sans Serif', en: 'Microsoft Sans Serif', family: '"Microsoft Sans Serif", sans-serif', size: '308 KB', version: '1.06' },
  { file: 'WINGDING.TTF', name: 'Wingdings', en: 'Wingdings', family: 'Wingdings, sans-serif', size: '181 KB', version: '2.55' },
  { file: 'WEBDINGS.TTF', name: 'Webdings', en: 'Webdings', family: 'Webdings, sans-serif', size: '102 KB', version: '1.03' },
  { file: 'MARLETT.TTF', name: 'Marlett (系统图标字体)', en: 'Marlett', family: 'Marlett, sans-serif', size: '48 KB', version: '1.50' },
  { file: 'HOLOMDL2.TTF', name: 'Holstein (EI 服务字体)', en: 'Holstein', family: 'sans-serif', size: '22 KB', version: '1.00' },
]

/* ═══════════ 字体文件夹（C:\WINDOWS\Fonts） ═══════════ */

export function FontsFolder({ win }: { win: WinState }) {
  const openApp = useXP((s) => s.openApp)
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [sel, setSel] = useState<string | null>(null)
  const [groupByVariant, setGroupByVariant] = useState(true)

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      <MenuBar menus={[
        { label: '文件(F)', items: [
          { label: '安装新字体(I)...', onClick: () => showToast('添加字体：选择字体所在的驱动器与文件夹（光盘时代从 D: 装 SimSun 的日子）') },
          { label: '打开(O)', onClick: () => sel && openApp('fontview', { font: sel }) },
          { label: '关闭(C)', onClick: () => closeWindow(win.id) },
        ] },
        { label: '编辑(E)', items: [
          { label: '全选(S)', onClick: () => showToast(`已选中全部 ${FONTS.length} 个字体（按 Ctrl+A 也行）`) },
        ] },
        { label: '查看(V)', items: [
          { label: '平铺(T)', checked: true, onClick: () => showToast('平铺视图（当前）') },
          { label: '详细信息(D)', onClick: () => showToast(`详细信息：${FONTS.length} 个字体，共约 58.7 MB（别问我为什么字体比系统还占地方）`) },
          { label: '按相似性列出字体变体(B)', checked: groupByVariant, onClick: () => { setGroupByVariant(!groupByVariant); showToast(groupByVariant ? '已展开显示各变体（Arial Bold/Italic 独立成行）' : '已折叠变体（Arial 一族合并显示）') } },
        ] },
        { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('字体 —— Windows XP 复刻版') }] },
      ]} />
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
        <button type="button" className="px-2 py-[2px] rounded-[3px] hover:bg-[#e8f0fb] border border-transparent" onClick={() => openApp('controlpanel', {}, '控制面板')}>← 后退</button>
        <span className="font-bold">Fonts</span>
        <span className="text-[#5a5a4a]">C:\WINDOWS\Fonts</span>
      </div>
      <div className="flex-1 flex min-h-0">
        {/* 左栏任务 */}
        <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
            <div className="font-bold text-[#1a3f8f] mb-1">请参阅</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('controlpanel', {}, '控制面板')}>控制面板</button>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => openApp('helpcenter', {})}>帮助和支持中心</button>
          </div>
          <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
            <div className="font-bold text-[#1a3f8f] mb-1">字体任务</div>
            <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => showToast('查看安装的字体变体：Arial/Times/Courier/Tahoma/Verdana 各有 2-4 个变体')}>查看安装的字体变体</button>
            <div className="text-[11px] text-[#3a3a3a] leading-[15px] mt-2">双击字体图标可预览样例（多字号）。「文件 → 安装新字体」从其它驱动器添加字体。</div>
          </div>
        </div>
        {/* 字体网格 */}
        <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 bg-white">
          <div className="flex flex-wrap gap-1 content-start max-w-[470px]">
            {FONTS.map((f) => (
              <button
                key={f.file}
                type="button"
                title={`${f.name} (${f.file})`}
                className={`w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] ${sel === f.file ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'hover:bg-[#e8f0fb] border border-transparent'}`}
                onClick={() => { setSel(f.file); playClick() }}
                onDoubleClick={() => openApp('fontview', { font: f.file })}
              >
                <Bmp name="fontfile" size={32} />
                <span className="text-[11px] text-center leading-[13px] truncate w-full">{f.name}</span>
                {groupByVariant && f.variants ? (
                  <span className="text-[10px] text-[#5a5a4a] text-center leading-[12px]">+{f.variants.length} 变体</span>
                ) : null}
              </button>
            ))}
            {!groupByVariant ? (
              FONTS.flatMap((f) => (f.variants ?? []).map((v) => (
                <button
                  key={v}
                  type="button"
                  title={`${v} (变体)`}
                  className="w-[92px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb] border border-transparent"
                  onDoubleClick={() => openApp('fontview', { font: f.file })}
                >
                  <Bmp name="fontfile" size={32} />
                  <span className="text-[11px] text-center leading-[13px] truncate w-full">{v}</span>
                </button>
              ))
            )) : null}
          </div>
        </div>
      </div>
      <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
        {groupByVariant ? `${FONTS.length} 个对象` : `${FONTS.length + FONTS.reduce((n, f) => n + (f.variants?.length ?? 0), 0)} 个对象`}（双击预览）
      </div>
    </div>
  )
}

/* ═══════════ 字体预览（fontview — 双击字体弹出） ═══════════ */

const SAMPLE_TEXT = 'AaBbYyZz 敏捷的棕色狐狸跳过了懒惰的狗。0123456789 .,:;!?'

export function FontViewer({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const fontFile = (win.props?.font as string) ?? 'SIMSUN.TTC'
  const f = FONTS.find((x) => x.file === fontFile) ?? FONTS[0]
  const sizes = [8, 12, 18, 24, 36, 48, 60, 72]

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex-1 bg-white border border-[#a8a498] m-1 overflow-y-auto xp-thin-scroll p-3" style={{ fontFamily: f.family }}>
        {/* 头部信息 */}
        <div className="flex items-center gap-3 pb-2 border-b border-[#d8d5c8]">
          <Bmp name="fontfile" size={32} />
          <div className="leading-[16px]">
            <div className="font-bold text-[13px]">{f.name} (TrueType)</div>
            <div className="text-[#5a5a4a]">Typeface name: {f.en}</div>
          </div>
          <div className="ml-auto text-right text-[#5a5a4a] leading-[16px]">
            <div>文件大小: {f.size}</div>
            <div>版本: {f.version}</div>
          </div>
        </div>
        <div className="py-2 space-y-[2px] text-[11px]" style={{ fontFamily: f.family }}>
          <div>文件名: C:\WINDOWS\Fonts\{f.file}</div>
          <div>最后修改: 2001-08-23 13:00</div>
          {f.variants ? <div>字体变体: {f.variants.join(' / ')}</div> : null}
          <div>字体技术: TrueType 轮廓字体，双字节字符集 (DBCS) 支持</div>
        </div>
        <div className="pt-2 border-t border-[#d8d5c8] space-y-1">
          {sizes.map((s) => (
            <div key={s} className="flex items-baseline gap-2">
              <span className="w-[22px] shrink-0 text-right text-[10px] text-[#5a5a4a] leading-none" style={{ fontFamily: 'Tahoma, sans-serif' }}>{s}</span>
              <span style={{ fontSize: s, lineHeight: 1.25 }} className="break-all">{SAMPLE_TEXT}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton onClick={() => showToast('打印字体样张：已发送到 HP LaserJet 6L（一页 A4 的字号全家福）')}>打印(P)...</XPButton>
        <XPButton primary onClick={() => closeWindow(win.id)}>完成</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 任务计划（C:\WINDOWS\Tasks） ═══════════ */

export interface SchedTask {
  name: string
  program: string
  app: string
  sched: string
  next: string
  wizard?: boolean
}

export function TaskSched({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const schedTasks = useXP((s) => s.schedTasks)
  const addSchedTask = useXP((s) => s.addSchedTask)
  const [wiz, setWiz] = useState(false)
  const [sel, setSel] = useState<string | null>(null)

  const now = new Date()
  const tomorrow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate() + 1).padStart(2, '0')}`

  const items: SchedTask[] = [
    ...schedTasks,
    { name: '磁盘清理', program: 'cleanmgr.exe', app: 'diskclean', sched: '每周日 02:00', next: '本周日 02:00', wizard: false },
    { name: '磁盘碎片整理程序', program: 'dfrg.msc', app: 'defrag', sched: '每月 1 日 03:00', next: '下月 1 日 03:00', wizard: false },
  ]

  return (
    <div className="flex flex-col h-full bg-white select-none text-[11px]">
      {wiz ? <TaskWizard win={win} onCancel={() => setWiz(false)} onDone={(t) => { addSchedTask(t); setWiz(false); showToast(`任务计划「${t.name}」已创建：${t.sched} 自动运行`) }} /> : (
        <>
          <MenuBar menus={[
            { label: '文件(F)', items: [
              { label: '新建(N)', onClick: () => setWiz(true) },
              { label: '关闭(C)', onClick: () => closeWindow(win.id) },
            ] },
            { label: '编辑(E)', items: [{ label: '全选(S)', onClick: () => showToast(`已选中 ${items.length + 1} 个对象`) }] },
            { label: '查看(V)', items: [{ label: '平铺(T)', checked: true, onClick: () => showToast('平铺视图（当前）') }] },
            { label: '高级(A)', items: [
              { label: '查看日志(V)', onClick: () => showToast('任务计划日志 SchedLgU.Txt：\n「磁盘清理」已于上周日 02:00 完成，退出代码 0。\n（经典的老派日志，用记事本都能打开）') },
              { label: '停止使用任务计划(S)', onClick: () => showToast('已停止任务计划服务（下次重启恢复——别让你的磁盘清理罢工太久）') },
              { label: '暂停/继续任务计划运行(P)', onClick: () => showToast('任务计划已暂停（图标会变成沙漏状态）') },
            ] },
            { label: '帮助(H)', items: [{ label: '关于(A)...', onClick: () => showToast('任务计划 —— Windows XP 复刻版') }] },
          ]} />
          <div className="flex items-center gap-2 px-2 py-[3px] bg-gradient-to-b from-[#f6f4ea] to-[#ece9d8] border-b border-[#d8d5c8]">
            <button type="button" className="px-2 py-[2px] rounded-[3px] hover:bg-[#e8f0fb] border border-transparent" onClick={() => showToast('后退：控制面板（请用左侧链接）')}>← 后退</button>
            <span className="font-bold">Tasks</span>
            <span className="text-[#5a5a4a]">C:\WINDOWS\Tasks</span>
          </div>
          <div className="flex-1 flex min-h-0">
            <div className="w-[180px] shrink-0 xp-sidebar p-2 overflow-y-auto xp-thin-scroll">
              <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2 mb-2">
                <div className="font-bold text-[#1a3f8f] mb-1">请参阅</div>
                <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => useXP.getState().openApp('controlpanel', {}, '控制面板')}>控制面板</button>
                <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => useXP.getState().openApp('helpcenter', {})}>帮助和支持中心</button>
              </div>
              <div className="rounded-[4px] bg-[#d2e5fb] border border-[#5a86cf] p-2">
                <div className="font-bold text-[#1a3f8f] mb-1">任务计划</div>
                <button type="button" className="text-[#1145c4] hover:underline block text-left leading-[16px]" onClick={() => setWiz(true)}>添加任务计划</button>
                <div className="text-[11px] text-[#3a3a3a] leading-[15px] mt-2">双击「添加任务计划」启动向导，让程序在指定时间自动运行（2001 年的自动化黑科技）。</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto xp-thin-scroll p-4 bg-white">
              <div className="flex flex-wrap gap-2 content-start max-w-[460px]">
                <button
                  type="button"
                  className="w-[104px] flex flex-col items-center gap-1 p-2 rounded-[4px] hover:bg-[#e8f0fb] border border-transparent"
                  onDoubleClick={() => { setWiz(true); playClick() }}
                >
                  <Bmp name="cp-tasks" size={32} />
                  <span className="text-[11px] text-center leading-[13px]">添加任务计划</span>
                  <span className="text-[10px] text-[#5a5a4a]">双击启动向导</span>
                </button>
                {items.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    title={`${t.name} — 下次运行: ${t.next}`}
                    className={`w-[104px] flex flex-col items-center gap-1 p-2 rounded-[4px] ${sel === t.name ? 'bg-[#cfe0f5] border border-[#99b8e8]' : 'hover:bg-[#e8f0fb] border border-transparent'}`}
                    onClick={() => { setSel(t.name); playClick() }}
                    onDoubleClick={() => showToast(`${t.name} 属性（计划）:\n\n任务: ${t.program}\n计划: ${t.sched}\n下次运行: ${t.next}\n上次结果: 0x0 (成功)\n运行身份: MY-COMPUTER\\Administrator\n\n“只在空闲 10 分钟后启动”已勾选（XP 的温柔）`)}
                  >
                    <Bmp name="cp-tasks" size={32} />
                    <span className="text-[11px] text-center leading-[13px]">{t.name}</span>
                    <span className="text-[10px] text-[#5a5a4a] text-center leading-[12px]">{t.sched}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-[20px] flex items-center bg-[#ece9d8] border-t border-[#d8d5c8] px-2 text-[#5a5a4a]">
            {items.length + 1} 个对象 — 下一个任务 {items.length ? `将于 ${items[0].next} 运行` : `明日（${tomorrow}）` }
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════ 添加任务计划向导 ═══════════ */

const WIZ_PROGRAMS: Array<{ label: string; app: string; exe: string }> = [
  { label: '磁盘清理', app: 'diskclean', exe: 'cleanmgr.exe' },
  { label: '磁盘碎片整理程序', app: 'defrag', exe: 'dfrg.msc' },
  { label: '系统信息', app: 'sysinfo', exe: 'msinfo32.exe' },
  { label: '记事本', app: 'notepad', exe: 'notepad.exe' },
  { label: '画图', app: 'paint', exe: 'mspaint.exe' },
  { label: '计算器', app: 'calculator', exe: 'calc.exe' },
  { label: '命令提示符', app: 'cmd', exe: 'cmd.exe' },
  { label: 'Internet Explorer', app: 'ie', exe: 'iexplore.exe' },
  { label: 'Outlook Express', app: 'outlook', exe: 'msimn.exe' },
  { label: 'Windows Media Player', app: 'wmp', exe: 'wmplayer.exe' },
  { label: '扫雷', app: 'minesweeper', exe: 'winmine.exe' },
  { label: '空当接龙', app: 'freecell', exe: 'freecell.exe' },
]

const WIZ_PERIODS = ['每天', '每周', '每月', '一次性', '计算机启动时', '当我登录时'] as const

function TaskWizard({ win, onCancel, onDone }: { win: WinState; onCancel: () => void; onDone: (t: SchedTask) => void }) {
  const showToast = useXP((s) => s.showToast)
  const openApp = useXP((s) => s.openApp)
  const [step, setStep] = useState(1)
  const [prog, setProg] = useState(0)
  const [name, setName] = useState('')
  const [period, setPeriod] = useState<string>('每周')
  const [time, setTime] = useState('09:00')
  const [every, setEvery] = useState('1')
  const [advanced, setAdvanced] = useState(false)

  const p = WIZ_PROGRAMS[prog]
  const taskName = name || p.label
  const schedText =
    period === '每天' ? `每天 ${time}` :
    period === '每周' ? `每周 ${['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]} ${time}` :
    period === '每月' ? `每月 ${new Date().getDate()} 日 ${time}` :
    period === '一次性' ? `一次性 ${time}` :
    period === '计算机启动时' ? '计算机启动时' : '当我登录时'

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      {/* 向导头部 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#d8d5c8] bg-gradient-to-r from-[#f4f2e8] to-[#ece9d8]">
        <Bmp name="cp-tasks" size={24} />
        <span className="font-bold text-[12px]">添加任务计划向导</span>
        <span className="ml-auto text-[#5a5a4a]">第 {step} 步，共 6 步</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto xp-thin-scroll">
        {step === 1 ? (
          <div className="space-y-3">
            <div className="text-[13px] font-bold">欢迎使用任务计划向导</div>
            <div>此向导帮助您安排程序自动运行的计划。例如，可以设定电脑每周日深夜自动运行「磁盘清理」，从此告别手动维护。</div>
            <div className="text-[#5a5a4a]">要继续，请单击“下一步”。</div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-2">
            <div>单击您想在计划中使用的程序。如果列表中没有，请单击“浏览”查找。</div>
            <div className="grid grid-cols-2 gap-1">
              {WIZ_PROGRAMS.map((w, i) => (
                <button
                  key={w.label}
                  type="button"
                  className={`flex items-center gap-2 p-1 rounded-[3px] text-left ${prog === i ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                  onClick={() => { setProg(i); setName(''); playClick() }}
                >
                  <span className="w-[13px] text-center">{prog === i ? '●' : '○'}</span>
                  <span className="flex-1">{w.label}</span>
                  <span className={`text-[10px] font-mono ${prog === i ? 'text-white' : 'text-[#5a5a4a]'}`}>{w.exe}</span>
                </button>
              ))}
            </div>
            <XPButton onClick={() => showToast('浏览：C:\\WINDOWS\\system32\\（真实 XP 会打开文件选择框）')}>浏览(B)...</XPButton>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-3">
            <div>键入该任务的名称并选择执行的时间:</div>
            <GroupBox title="任务名称">
              <div className="p-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={p.label}
                  className="w-[260px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] outline-none"
                />
                <div className="mt-1 text-[#5a5a4a]">默认与程序同名（不填即为「{p.label}」）。</div>
              </div>
            </GroupBox>
            <GroupBox title="执行这个任务">
              <div className="p-2 space-y-[3px]">
                {WIZ_PERIODS.map((per) => (
                  <label key={per} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="wizperiod" checked={period === per} onChange={() => setPeriod(per)} />
                    <span>{per}</span>
                    {per === period ? <span className="text-[#5a5a4a]">— {schedText}</span> : null}
                  </label>
                ))}
              </div>
            </GroupBox>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="space-y-3">
            <div>选择想要用于该任务的时间:</div>
            <GroupBox title="每天 / 每周 / 每月">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>开始时间(T):</span>
                  <input value={time} onChange={(e) => setTime(e.target.value)} className="w-[70px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] outline-none font-mono" />
                  <span className="text-[#5a5a4a]">格式 HH:MM（深夜 02:00 最不打扰人）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>每隔</span>
                  <input value={every} onChange={(e) => setEvery(e.target.value)} className="w-[40px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] outline-none font-mono" />
                  <span>{period === '每天' ? '天运行一次' : period === '每周' ? '周运行一次' : '月运行一次'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>开始日期(D):</span>
                  <input readOnly value="今日" className="w-[70px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] font-mono" />
                  <span className="text-[#5a5a4a]">（从今天开始生效）</span>
                </div>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              真实 XP 此页还提供「显示多项计划时间」复选框，可为一个任务配置多套时刻表（例如工作日 8:00 + 周六 20:00）。
            </div>
          </div>
        ) : null}
        {step === 5 ? (
          <div className="space-y-3">
            <div>输入将要运行此任务的用户名和密码。请确保密码正确，否则任务将无法运行。</div>
            <GroupBox title="运行身份">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>用户名(U):</span>
                  <input readOnly value="MY-COMPUTER\Administrator" className="w-[190px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] font-mono" />
                </div>
                <div className="flex items-center gap-2">
                  <span>密码(P):</span>
                  <input type="password" defaultValue="xp2001" className="w-[190px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px]" />
                </div>
                <div className="flex items-center gap-2">
                  <span>确认密码(C):</span>
                  <input type="password" defaultValue="xp2001" className="w-[190px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px]" />
                </div>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              提示：任务将以该用户身份静默运行——这也是 XP 时代「半夜弹出的扫雷窗口」都市传说的出处。
            </div>
          </div>
        ) : null}
        {step === 6 ? (
          <div className="space-y-3">
            <div className="text-[13px] font-bold">您已成功安排该任务</div>
            <div>向导已收集以下信息:</div>
            <div className="ml-3 space-y-1">
              <div>任务名称: <b>{taskName}</b></div>
              <div>程序: {p.exe}</div>
              <div>计划: {schedText}，从今日开始</div>
              <div>运行身份: MY-COMPUTER\Administrator</div>
            </div>
            <XPCheck checked={advanced} label="在单击“完成”时，打开此任务的高级属性(D)" onChange={() => setAdvanced(!advanced)} />
            {advanced ? <div className="text-[#5a5a4a]">完成后将显示 {taskName} 属性（任务/计划/设置/安全 4 个页签）。</div> : null}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-[#d8d5c8] shrink-0">
        <XPButton disabled={step === 1} onClick={() => setStep(step - 1)}>&lt; 上一步(B)</XPButton>
        {step < 6 ? (
          <XPButton primary onClick={() => setStep(step + 1)}>下一步(N) &gt;</XPButton>
        ) : (
          <XPButton primary onClick={() => {
            onDone({ name: taskName, program: p.exe, app: p.app, sched: schedText, next: schedText.replace(/每天|每周日?|每月|一次性/, '') || '今日稍后' })
            if (advanced) showToast(`${taskName} 高级属性：\n任务/计划/设置/安全 4 页签已就绪（含“仅在空闲时启动”与“错过任务后尽快补跑”）`)
          }}>完成</XPButton>
        )}
        <XPButton onClick={onCancel}>取消</XPButton>
      </div>
    </div>
  )
}
