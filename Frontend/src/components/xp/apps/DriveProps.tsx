'use client'

/* 驱动器属性 / 格式化 / 检查磁盘 —— XP 磁盘管理三件套
 * DriveProps: 常规(卷标+饼图)/工具(查错/碎片整理/备份)/硬件 三选项卡
 * FormatDialog: XP 经典格式化对话框（容量/文件系统/卷标/快速格式化/MS-DOS 启动盘 → 进度 → 完毕）
 * CheckDiskDialog: 检查磁盘（自动修复/坏扇区 → 三阶段进度 → 报告）
 */

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPCheck } from '../ui'
import { HardDriveIcon, FloppyDriveIcon, CDDriveIcon } from '../icons'
import { playClick, playError, playDing } from '../sounds'
import { resolvePath } from '../fs'

/* ── 驱动器容量数据（2001 年主流配置） ── */
interface DriveSpec {
  label: string
  total: number
  used: number
  fs: string
  type: string
  icon: React.FC<{ size?: number }>
  name: string
}
const DRIVE_SPECS: Record<string, DriveSpec> = {
  'C:': { label: '本地磁盘', total: 41016232448, used: 24802435072, fs: 'NTFS', type: '本地磁盘', icon: HardDriveIcon, name: '本地磁盘 (C:)' },
  'A:': { label: '', total: 1457664, used: 0, fs: 'FAT', type: '3.5 英寸软盘', icon: FloppyDriveIcon, name: '3.5 软盘 (A:)' },
  'D:': { label: '', total: 734003200, used: 734003200, fs: 'CDFS', type: 'CD 驱动器', icon: CDDriveIcon, name: 'CD 驱动器 (D:)' },
}

const gb = (b: number): string => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`)
const num = (b: number): string => b.toLocaleString('en-US')

/* 按盘符查找当前驱动器名（卷标重命名后仍然健壮） */
export function driveNameByLetter(letter: string, fsTree: { children?: Array<{ kind: string; name: string }> }): string {
  const found = (fsTree.children ?? []).find((c) => c.kind === 'drive' && c.name.endsWith(`(${letter})`))
  return found?.name ?? DRIVE_SPECS[letter]?.name ?? letter
}

/* ── XP 磁盘占用饼图（蓝=已用 / 紫红=可用） ── */
function Pie({ used, total, size = 76 }: { used: number; total: number; size?: number }) {
  const frac = total > 0 ? Math.min(1, used / total) : 0
  const r = 46
  const cx = 50
  const cy = 50
  /* 已用扇形（从 12 点顺时针） */
  const ang = frac * Math.PI * 2
  const x = cx + r * Math.sin(ang)
  const y = cy - r * Math.cos(ang)
  const large = frac > 0.5 ? 1 : 0
  const slice = frac >= 1
    ? ''
    : `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 ${large} 1 ${x.toFixed(2)},${y.toFixed(2)} Z`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="#f799d4" stroke="#8a5a78" strokeWidth="1.4" />
      {frac >= 1 ? (
        <circle cx={cx} cy={cy} r={r} fill="#3a5fd9" stroke="#1e3f9a" strokeWidth="1.4" />
      ) : (
        <path d={slice} fill="#3a5fd9" stroke="#1e3f9a" strokeWidth="1.4" />
      )}
      {/* 内高光（XP 饼图的柔和立体感） */}
      <ellipse cx={cx} cy={cy - 8} rx={r * 0.62} ry={r * 0.34} fill="#ffffff" opacity="0.10" />
    </svg>
  )
}

/* ═══════════════════════ 驱动器属性 ═══════════════════════ */
export function DriveProps({ win }: { win: WinState }) {
  const drive = (win.props.drive as string) ?? 'C:'
  const spec = DRIVE_SPECS[drive] ?? DRIVE_SPECS['C:']
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)
  const fsTree = useXP((s) => s.fsTree)
  const fsRename = useXP((s) => s.fsRename)

  const [tab, setTab] = useState<'常规' | '工具' | '硬件'>('常规')
  const isHD = drive === 'C:'

  /* 卷标：从实时 fs 派生（格式化/重命名后自动刷新）；本地编辑态优先 */
  const [labelEdit, setLabelEdit] = useState<string | null>(null)
  const liveNode = resolvePath([driveNameByLetter(drive, fsTree)], fsTree)
  const liveLabel = liveNode?.name?.replace(/\s*\(([A-Z]:)\)$/, '') ?? spec.label
  const label = labelEdit ?? liveLabel

  const apply = () => {
    const cur = liveNode?.name ?? spec.name
    if (label.trim() && label.trim() !== cur.replace(/\s*\(([A-Z]:)\)$/, '')) {
      const driveLetter = ` (${drive})`
      fsRename([cur], `${label.trim()}${driveLetter}`)
    }
  }

  const DriveIcon = spec.icon

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      {/* 选项卡 */}
      <div className="flex items-end px-2 pt-2 gap-[2px] border-b border-[#a0a090]">
        {(['常规', '工具', '硬件'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); playClick() }}
            className={`px-[10px] h-[21px] text-[11px] rounded-t-[3px] border border-b-0 ${
              tab === t
                ? 'bg-[#ece9d8] border-[#a0a090] relative z-10 -mb-[1px] pb-[1px]'
                : 'bg-gradient-to-b from-[#f4f2e8] to-[#dcddd0] border-[#b0b0a0] text-[#8a8a8a]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 p-3 overflow-y-auto xp-thin-scroll">
        {tab === '常规' ? (
          <>
            {/* 图标 + 卷标 + 类型 */}
            <div className="flex items-start gap-3 pb-3">
              <DriveIcon size={44} />
              <div className="flex-1 space-y-[5px]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#5a5a4a]">卷标(C):</span>
                  <input
                    className="xp-sunken bg-white text-[11px] px-1 h-[19px] w-[170px] outline-none"
                    value={label}
                    onChange={(e) => setLabelEdit(e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div className="text-[11px] text-[#2a2a2a]">类型: {spec.type}</div>
                <div className="text-[11px] text-[#2a2a2a]">文件系统: {spec.fs}</div>
              </div>
            </div>

            {/* 饼图 */}
            <GroupBox title="磁盘占用" className="mb-3">
              <div className="flex items-center gap-4 p-2">
                <Pie used={spec.used} total={spec.total} />
                <div className="space-y-[6px] text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-[10px] h-[10px] rounded-[1px] bg-[#3a5fd9] border border-[#1e3f9a]" />
                    已用空间: <span className="ml-1">{gb(spec.used)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[10px] h-[10px] rounded-[1px] bg-[#f799d4] border border-[#8a5a78]" />
                    可用空间: <span className="ml-1">{gb(spec.total - spec.used)}</span>
                  </div>
                  <div className="text-[#5a5a4a]">容量: {gb(spec.total)}</div>
                </div>
              </div>
            </GroupBox>

            {/* 字节统计（XP 真实排版：右对齐数字） */}
            <div className="space-y-[3px] text-[11px] text-[#2a2a2a]">
              <div className="flex">
                <span className="w-[80px] shrink-0" />
                <span className="w-[130px]">容量:</span>
                <span className="flex-1 text-right tabular-nums">{num(spec.total)} 字节</span>
              </div>
              <div className="flex">
                <span className="w-[80px] shrink-0" />
                <span className="w-[130px]">已用空间:</span>
                <span className="flex-1 text-right tabular-nums">{num(spec.used)} 字节</span>
              </div>
              <div className="flex">
                <span className="w-[80px] shrink-0" />
                <span className="w-[130px]">可用空间:</span>
                <span className="flex-1 text-right tabular-nums">{num(spec.total - spec.used)} 字节</span>
              </div>
            </div>

            {isHD ? (
              <div className="flex justify-end mt-3">
                <XPButton onClick={() => openApp('cleanmgr', { drive: 'C:' })}>磁盘清理(D)...</XPButton>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === '工具' ? (
          <div className="space-y-3">
            <GroupBox title="查错">
              <div className="p-2 space-y-2">
                <div className="text-[11px] text-[#2a2a2a] leading-[15px]">
                  该选项将检查卷中的错误。要检查驱动器 {drive} 中的错误，请单击「开始检查」。
                </div>
                <XPButton onClick={() => openApp('chkdsk', { drive })}>开始检查(C)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="碎片整理">
              <div className="p-2 space-y-2">
                <div className="text-[11px] text-[#2a2a2a] leading-[15px]">
                  该选项将重新整理卷中的文件，使程序打开得更慢的文件合并到一起。…要整理碎片，请单击「立即整理」。
                </div>
                <XPButton onClick={() => openApp('dfrg', {})}>立即整理(D)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="备份">
              <div className="p-2 space-y-2">
                <div className="text-[11px] text-[#2a2a2a] leading-[15px]">
                  该选项将通过将硬盘数据复制到其他存储设备来保护数据，以防数据丢失或损坏。
                </div>
                <XPButton
                  onClick={() =>
                    openApp('dialog', {
                      kind: 'info',
                      title: '备份或还原向导',
                      text: '备份实用程序(NTBACKUP.EXE)在 Windows XP Home Edition 中不默认安装。\n\n要从 Windows XP CD 安装，请打开 CD 上的 ValueAdd 文件夹，然后运行 Msft\\Ntbackup 文件夹中的 Ntbackup.msi。',
                    })
                  }
                >
                  立即备份(B)...
                </XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '硬件' ? (
          <div className="space-y-3">
            <GroupBox title="所有磁盘驱动器">
              <table className="w-full text-[11px] border-collapse bg-white">
                <thead>
                  <tr className="bg-gradient-to-b from-[#f4f2e8] to-[#dcddd0]">
                    <th className="text-left font-normal border border-[#b0b0a0] px-2 py-[3px]">名称</th>
                    <th className="text-left font-normal border border-[#b0b0a0] px-2 py-[3px]">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['软盘驱动器', '磁盘驱动器'],
                    ['ST340016A', '磁盘驱动器'],
                    ['TEAC CD-224E', 'CD-ROM 驱动器'],
                  ].map(([nm, tp]) => (
                    <tr key={nm} className={nm === 'ST340016A' && drive === 'C:' ? 'bg-[#316ac5] text-white' : ''}>
                      <td className="border border-[#d8d5c8] px-2 py-[3px]">{nm}</td>
                      <td className="border border-[#d8d5c8] px-2 py-[3px]">{tp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GroupBox>
            <GroupBox title="设备属性">
              <div className="p-2 text-[11px] space-y-1">
                <div>设备: {drive === 'C:' ? 'ST340016A' : drive === 'A:' ? '软盘驱动器' : 'TEAC CD-224E'}</div>
                <div className="flex items-center gap-2">
                  <span className="w-[8px] h-[8px] rounded-full bg-[#2e9c2e] border border-[#1a701a]" />
                  状态: 这个设备运转正常。
                </div>
              </div>
            </GroupBox>
            <div className="flex justify-end">
              <XPButton onClick={() => useXP.getState().showToast('硬件疑难解答：请查阅设备管理器中的驱动器属性')}>疑难解答(T)...</XPButton>
            </div>
          </div>
        ) : null}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 p-3 pt-0">
        <XPButton
          primary
          onClick={() => {
            apply()
            closeWindow(win.id)
          }}
        >
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton
          onClick={() => {
            apply()
            playClick()
          }}
        >
          应用(A)
        </XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════════ 格式化对话框 ═══════════════════════ */
export function FormatDialog({ win }: { win: WinState }) {
  const drive = (win.props.drive as string) ?? 'A:'
  const spec = DRIVE_SPECS[drive] ?? DRIVE_SPECS['A:']
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)

  const [label, setLabel] = useState('')
  const [quick, setQuick] = useState(false)
  const [dos, setDos] = useState(false)
  const [phase, setPhase] = useState<'form' | 'formatting' | 'done'>('form')
  const [prog, setProg] = useState(0)

  /* 格式化进程（快速=2s / 完整=5s） */
  useEffect(() => {
    if (phase !== 'formatting') return
    const dur = quick ? 2100 : 5200
    const t0 = Date.now()
    const iv = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / dur) * 100)
      setProg(Math.floor(p))
      if (p >= 100) {
        window.clearInterval(iv)
        setPhase('done')
        playDing()
        /* A: 盘就绪：清除错误状态 + 空白盘 + 应用卷标 */
        if (drive === 'A:') {
          const st = useXP.getState()
          const curName = driveNameByLetter('A:', st.fsTree)
          st.fsUpdateNode([curName], {
            error: undefined,
            children: [],
            type: '3.5 英寸软盘',
            ...(label.trim() ? { name: `${label.trim()} (A:)` } : {}),
          })
        }
      }
    }, 60)
    return () => window.clearInterval(iv)
  }, [phase, quick, drive, label])

  /* 格式化完毕提示 */
  useEffect(() => {
    if (phase !== 'done') return
    const t = window.setTimeout(() => {
      closeWindow(win.id)
      openApp('dialog', { kind: 'info', title: '格式化完毕', text: `格式化完毕。\n\n总容量 ${num(spec.total)} 字节。\n可用空间 ${num(spec.total)} 字节。` })
    }, 350)
    return () => window.clearTimeout(t)
  }, [phase, closeWindow, openApp, win.id, spec.total])

  const start = () => {
    playClick()
    /* C: 系统盘 / D: CD 驱动器 → XP 真实拒绝 */
    if (drive === 'C:') {
      playError()
      openApp('dialog', {
        kind: 'error',
        title: '格式化 本地磁盘 (C:)',
        text: 'Windows 无法格式化该驱动器。\n退出所有正使用此驱动器的磁盘实用程序或其他程序，并确认没有窗口预览该驱动器的内容，然后重新格式化。',
      })
      return
    }
    if (drive === 'D:') {
      playError()
      openApp('dialog', {
        kind: 'error',
        title: '格式化 CD 驱动器 (D:)',
        text: 'Windows 无法格式化该驱动器。\n该驱动器中的磁盘可能是只读的，或该驱动器不支持格式化。',
      })
      return
    }
    setPhase('formatting')
    setProg(0)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* 容量 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-[84px]">容量(C):</span>
          <select
            className="xp-sunken bg-white text-[11px] h-[20px] px-1 flex-1 outline-none"
            defaultValue={drive === 'A:' ? '3.5", 1.44 MB, 512 字节/扇区' : '41 GB'}
            disabled={phase !== 'form'}
          >
            {drive === 'A:' ? (
              <>
                <option>3.5&quot;, 1.44 MB, 512 字节/扇区</option>
                <option>3.5&quot;, 720 KB, 512 字节/扇区</option>
              </>
            ) : (
              <option>41 GB</option>
            )}
          </select>
        </div>

        {phase === 'form' ? (
          <>
            <GroupBox title="格式化选项">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-[96px]">文件系统(F):</span>
                  <select className="xp-sunken bg-white text-[11px] h-[20px] px-1 flex-1 outline-none">
                    {drive === 'A:' ? <option>FAT</option> : drive === 'C:' ? <option>NTFS</option> : <option>CDFS</option>}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-[96px]">分配单元大小(A):</span>
                  <select className="xp-sunken bg-white text-[11px] h-[20px] px-1 flex-1 outline-none">
                    <option>默认配置大小</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] w-[96px]">卷标(L):</span>
                  <input
                    className="xp-sunken bg-white text-[11px] px-1 h-[19px] flex-1 outline-none"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            </GroupBox>

            <div className="space-y-[5px] pl-1">
              <XPCheck checked={quick} label="快速格式化(Q)" onChange={() => setQuick(!quick)} />
              <XPCheck checked={false} label="启用压缩(E)" onChange={() => undefined} />
              {drive === 'A:' ? <XPCheck checked={dos} label="创建一个 MS-DOS 启动盘(M)" onChange={() => setDos(!dos)} /> : null}
            </div>
          </>
        ) : (
          <div className="pt-4 space-y-3">
            <div className="text-[11px] text-[#2a2a2a]">正在格式化 {spec.name}。</div>
            {dos && phase === 'formatting' ? (
              <div className="text-[11px] text-[#2a2a2a]">正在复制系统文件…</div>
            ) : null}
            {phase === 'done' ? <div className="text-[11px] text-[#2a2a2a]">格式化完毕。</div> : null}
            {/* XP 分段进度条（蓝块填充） */}
            <div className="xp-sunken h-[18px] bg-white p-[2px]">
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  width: `${prog}%`,
                  background: 'repeating-linear-gradient(90deg, #2f6fd4 0 8px, #5b9ce8 8px 9px, transparent 9px 11px)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 p-3 pt-0">
        {phase !== 'done' ? <XPButton primary={phase === 'form'} onClick={start}>开始(S)</XPButton> : null}
        <XPButton
          onClick={() => {
            playClick()
            closeWindow(win.id)
          }}
        >
          关闭(O)
        </XPButton>
      </div>
    </div>
  )
}

/* ═══════════════════════ 检查磁盘 ═══════════════════════ */
const CHK_STAGES = [
  { label: '正在检查文件系统 (阶段 1 of 3)…', pct: 34 },
  { label: '正在检查索引 (阶段 2 of 3)…', pct: 68 },
  { label: '正在检查安全描述符 (阶段 3 of 3)…', pct: 100 },
]

export function CheckDiskDialog({ win }: { win: WinState }) {
  const drive = (win.props.drive as string) ?? 'C:'
  const closeWindow = useXP((s) => s.closeWindow)
  const openApp = useXP((s) => s.openApp)

  const [fix, setFix] = useState(false)
  const [bad, setBad] = useState(false)
  const [running, setRunning] = useState(false)
  const [prog, setProg] = useState(0)

  useEffect(() => {
    if (!running) return
    const t0 = Date.now()
    const dur = fix || bad ? 6800 : 4200
    const iv = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / dur) * 100)
      setProg(Math.floor(p))
      if (p >= 100) {
        window.clearInterval(iv)
        closeWindow(win.id)
        playDing()
        openApp('dialog', {
          kind: 'info',
          title: '正在检查磁盘',
          text: `磁盘检查完成。\n\n已检查文件记录段: 41,832\n未发现文件系统错误。\n未发现坏扇区。`,
        })
      }
    }, 80)
    return () => window.clearInterval(iv)
  }, [running, fix, bad, closeWindow, openApp, win.id])

  const stage = CHK_STAGES.find((s) => prog < s.pct) ?? CHK_STAGES[2]

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="text-[11px] text-[#2a2a2a] leading-[16px]">
          要检查驱动器 {drive} 中的错误，请选择要执行的检查。
        </div>
        <div className="space-y-[5px] pl-1">
          <XPCheck checked={fix} label="自动修复文件系统错误(F)" onChange={() => setFix(!fix)} />
          <XPCheck checked={bad} label="扫描并试图恢复坏扇区(N)" onChange={() => setBad(!bad)} />
        </div>
        {running ? (
          <div className="pt-3 space-y-2">
            <div className="text-[11px] text-[#2a2a2a]">{stage.label}</div>
            <div className="xp-sunken h-[18px] bg-white p-[2px]">
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  width: `${prog}%`,
                  background: 'repeating-linear-gradient(90deg, #2f6fd4 0 8px, #5b9ce8 8px 9px, transparent 9px 11px)',
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-3 pt-0">
        <XPButton
          primary
          disabled={running}
          onClick={() => {
            playClick()
            setRunning(true)
          }}
        >
          开始(S)
        </XPButton>
        <XPButton onClick={() => { playClick(); closeWindow(win.id) }}>取消</XPButton>
      </div>
    </div>
  )
}
