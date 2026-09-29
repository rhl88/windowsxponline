'use client'

import React, { useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPRadio, XPCheck } from '../ui'
import { playClick } from '../sounds'
import { Bmp } from '../bmp'

/* ═══════════ 我的文档 属性（目标位置/共享） ═══════════ */

const MYDOCS_TARGET = 'C:\\Documents and Settings\\Administrator\\My Documents'

export function MyDocsProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<'target' | 'sharing'>('target')

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['target', '目标位置'], ['sharing', '共享']] as const).map(([k, t]) => (
          <button key={k} type="button" className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'target' ? (
          <div className="space-y-3">
            <GroupBox title="我的文档文件夹">
              <div className="space-y-2 p-1">
                <div className="text-[#3a3a3a]">「我的文档」文件夹包含您的个人文件。默认情况下位于：</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={MYDOCS_TARGET}
                    className="flex-1 h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] font-mono text-[11px] outline-none"
                  />
                  <XPButton onClick={() => showToast('移动目标文件夹：复刻版将「我的文档」永远留在 C 盘老家')}>移动(M)...</XPButton>
                </div>
                <XPButton onClick={() => showToast('还原默认值：目标本来就是默认位置')}>还原默认值(R)</XPButton>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              提示：将「我的文档」文件夹移动到其他位置后，桌面和开始菜单中的「我的文档」快捷方式会自动指向新位置。复刻版保持默认路径，保证与真实文件系统一致。
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <GroupBox title="共享">
              <div className="space-y-2 p-1">
                <XPRadio checked={false} label="不共享此文件夹(D)" onChange={() => showToast('共享设置：复刻版保持「不共享」')} />
                <XPRadio checked label="共享此文件夹(S)" onChange={() => showToast('已共享为 MY-COMPUTER\\MyDocuments（仅本机复刻）')} />
                <div className="pl-[18px] space-y-1">
                  <div className="flex items-center gap-2">
                    <span>共享名(H):</span>
                    <input readOnly value="MyDocuments" className="h-[20px] w-[180px] px-2 border border-[#7a9ab8] bg-white rounded-[2px]" />
                  </div>
                  <XPCheck checked label="允许其他用户更改我的文件(W)" onChange={() => showToast('共享权限：Everyone 完全控制（2001 年局域网的常态）')} />
                </div>
              </div>
            </GroupBox>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 p-2">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => showToast('应用：「我的文档」属性已保持原样')}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 回收站 属性 ═══════════ */

export function RecycleProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const recycleBin = useXP((s) => s.recycleBin)
  const [mode, setMode] = useState<'indep' | 'global' | 'direct'>('global')

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        <button type="button" className="px-3 h-[21px] rounded-t-[4px] border border-b-0 bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold">全局</button>
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        <div className="font-bold text-[12px] mb-2">回收站的最大值(每个驱动器的百分比 M):</div>
        <div className="flex items-center gap-3 mb-3">
          <input type="range" min={1} max={100} defaultValue={10} className="flex-1" onChange={() => showToast('回收站容量：复刻版实际无上限（特权）')} />
          <div className="w-[60px] text-right">10 %</div>
          <div className="text-[#5a5a4a]">≈ 3.7 GB</div>
        </div>
        <div className="space-y-2">
          <XPRadio checked={mode === 'indep'} label="独立配置驱动器(C)" onChange={() => { setMode('indep'); showToast('独立配置：仅 C: 一个驱动器可用') }} />
          <XPRadio checked={mode === 'global'} label="所有驱动器均使用同一设置(U)" onChange={() => setMode('global')} />
          <XPRadio checked={mode === 'direct'} label="不将文件移入回收站。移除文件后立即将其删除(D)" onChange={() => { setMode('direct'); showToast('注意：该设置会让你按 Delete 时直接永久删除（危险，2001 年的教训）') }} />
        </div>
        <div className="mt-3 text-[10px] text-[#5a5a4a] leading-[15px]">
          当前回收站内有 {recycleBin.length} 个项目。显示删除确认对话框的选项在「删除确认」中配置。
        </div>
      </div>
      <div className="flex justify-end gap-2 p-2">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 映射网络驱动器对话框 ═══════════ */

const FREE_LETTERS = ['Z:', 'Y:', 'X:', 'W:', 'V:', 'U:']

export function MapDriveDialog({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const netDrives = useXP((s) => s.netDrives)
  const addNetDrive = useXP((s) => s.addNetDrive)
  const [letter, setLetter] = useState('Z:')
  const [folder, setFolder] = useState('\\\\FileServer\\public')
  const [reconnect, setReconnect] = useState(true)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-[46px] h-[38px] shrink-0 flex items-center justify-center rounded-[6px] bg-gradient-to-b from-[#5a86d8] to-[#2a56a8] text-white font-bold shadow">
          网络驱动器
        </div>
        <div className="text-[12px] font-bold">映射网络驱动器</div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-[46px] text-right">驱动器(O):</span>
          <select
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            className="h-[20px] px-1 border border-[#7a9ab8] bg-white rounded-[2px] w-[80px]"
          >
            {FREE_LETTERS.filter((l) => !netDrives.some((d) => d.letter === l)).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-[46px] text-right">文件夹(R):</span>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            list="net-folders"
            className="flex-1 h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px] font-mono"
          />
          <datalist id="net-folders">
            <option value="\\FileServer\public" />
            <option value="\\FileServer\share" />
            <option value="\\MediaServer\music" />
            <option value="\\Workstation\backup" />
          </datalist>
          <XPButton onClick={() => showToast('浏览文件夹：网上邻居中未发现可浏览的共享（复刻）')}>浏览(B)...</XPButton>
        </div>
        <div className="pl-[62px]">
          <XPCheck checked={reconnect} label="登录时重新连接(S)" onChange={() => setReconnect(!reconnect)} />
        </div>
        <button type="button" className="pl-[62px] text-[#1145c4] hover:underline text-left" onClick={() => showToast('使用其他用户名连接：当前已用 Administrator 身份（无密码）')}>
          使用其他用户名进行连接(U)...
        </button>
        {netDrives.length > 0 ? (
          <div className="text-[10px] text-[#5a5a4a] pl-[62px]">已映射: {netDrives.map((d) => `${d.letter} → ${d.path}`).join('，')}</div>
        ) : null}
      </div>
      <div className="flex-1" />
      <div className="flex justify-end gap-2 pt-2">
        <XPButton primary onClick={() => {
          if (!/^\\\\.+\\.+/.test(folder)) {
            showToast('文件夹无效：请输入 \\\\服务器\\共享 形式的路径')
            return
          }
          addNetDrive(letter, folder)
          playClick()
          closeWindow(win.id)
          showToast(`已成功映射网络驱动器 ${letter} 到 ${folder}${reconnect ? '（登录时重新连接）' : ''}`)
        }}>完成</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 断开网络驱动器对话框 ═══════════ */

export function UnmapDriveDialog({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const netDrives = useXP((s) => s.netDrives)
  const removeNetDrive = useXP((s) => s.removeNetDrive)
  const [sel, setSel] = useState<string | null>(netDrives[0]?.letter ?? null)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px] p-3">
      <div className="text-[12px] font-bold mb-2">断开网络驱动器</div>
      {netDrives.length === 0 ? (
        <div className="text-[#5a5a5a] py-4">当前没有要断开的网络驱动器连接。</div>
      ) : (
        <div className="border border-[#7a9ab8] bg-white rounded-[2px] divide-y divide-[#e8e5d8] mb-2">
          {netDrives.map((d) => (
            <button
              key={d.letter}
              type="button"
              className={`w-full flex items-center gap-2 px-2 py-[4px] text-left ${sel === d.letter ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
              onClick={() => setSel(d.letter)}
            >
              <span className="font-mono">{d.letter}</span>
              <span className={sel === d.letter ? 'text-white/80' : 'text-[#5a5a5a]'}>{d.path}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1" />
      <div className="flex justify-end gap-2">
        <XPButton primary disabled={!sel} onClick={() => {
          if (sel) {
            removeNetDrive(sel)
            playClick()
            showToast(`已断开网络驱动器 ${sel}`)
          }
          closeWindow(win.id)
        }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 鼠标 属性（main.cpl） ═══════════ */

export function MouseProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<'keys' | 'ptr' | 'wheel' | 'hw'>('keys')
  const [swap, setSwap] = useState(false)
  const [dblSpeed, setDblSpeed] = useState(7)
  const [snapTo, setSnapTo] = useState(false)
  const [trail, setTrail] = useState(false)
  const [wheelLines, setWheelLines] = useState(3)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <div className="flex gap-[2px] pl-1 pt-1">
        {([['keys', '鼠标键'], ['ptr', '指针'], ['wheel', '轮'], ['hw', '硬件']] as const).map(([k, t]) => (
          <button key={k} type="button" className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === k ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === 'keys' ? (
          <div className="space-y-3">
            <GroupBox title="鼠标键配置">
              <div className="space-y-2 p-1">
                <XPCheck checked={swap} label="切换主要和次要的按钮(S)" onChange={() => { setSwap(!swap); showToast(swap ? '已恢复左键为主键' : '主要/次要按钮已切换（左撇子模式）——复刻版仅作设置演示') }} />
                <div className="text-[10px] text-[#5a5a4a] pl-[18px] leading-[14px]">此设置用于将鼠标的左按钮设为主要按钮，适用于右撇子；或将右按钮设为主要按钮，适用于左撇子。</div>
              </div>
            </GroupBox>
            <GroupBox title="双击速度">
              <div className="space-y-2 p-1">
                <div className="flex items-center gap-3">
                  <span>慢</span>
                  <input type="range" min={1} max={10} value={dblSpeed} onChange={(e) => setDblSpeed(Number(e.target.value))} className="flex-1" />
                  <span>快</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>测试区域:</span>
                  <button
                    type="button"
                    className="w-[52px] h-[52px] rounded-[4px] border border-[#a8a498] bg-gradient-to-b from-[#5a86d8] to-[#2a56a8] flex items-center justify-center text-white text-[9px] font-bold shadow"
                    onDoubleClick={() => showToast('双击测试：速度合格（蓝色盒变黄盒……开玩笑的，复刻版它纹丝不动）')}
                    title="双击我试试"
                  >双击我</button>
                </div>
              </div>
            </GroupBox>
            <XPCheck checked={snapTo} label="默认在对话框中将指针移到默认按钮上(S)" onChange={() => { setSnapTo(!snapTo); showToast('自动吸附默认按钮：' + (!snapTo ? '已启用（贴心）' : '已关闭')) }} />
          </div>
        ) : null}
        {tab === 'ptr' ? (
          <div className="space-y-3">
            <GroupBox title="方案(S):">
              <div className="space-y-2 p-1">
                <select className="h-[20px] w-full px-1 border border-[#7a9ab8] bg-white rounded-[2px]" onChange={() => showToast('指针方案：Windows 标准（大）——复刻版保持标准')}>
                  <option>Windows 标准</option>
                  <option>Windows 标准（大）</option>
                  <option>Windows 黑色（大）</option>
                  <option>怀旧</option>
                  <option>3D 指针</option>
                </select>
                <div className="grid grid-cols-8 gap-1 pt-1">
                  {['正常选择', '帮助选择', '后台运行', '忙碌', '精确选择', '文本选择', '手写', '不可用'].map((n, i) => (
                    <div key={n} className="flex flex-col items-center gap-1 p-1 rounded-[3px] hover:bg-[#e8f0fb]" title={n}>
                      <div className={`w-[24px] h-[24px] flex items-center justify-center text-[#3a5a8a] text-[10px] ${i === 6 ? 'italic' : ''}`}>{i === 0 ? '↖' : i === 4 ? '✛' : i === 5 ? 'I' : i === 7 ? '⊘' : i === 3 ? '⌛' : i === 2 ? '↖⧗' : i === 1 ? '↖?' : '↖'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GroupBox>
            <XPCheck checked={trail} label="显示指针踪迹(D)" onChange={() => { setTrail(!trail); showToast('指针踪迹：' + (!trail ? '已启用（老年用户福音）' : '已关闭')) }} />
          </div>
        ) : null}
        {tab === 'wheel' ? (
          <div className="space-y-3">
            <GroupBox title="滚动">
              <div className="space-y-2 p-1">
                <XPRadio checked label="一次滚动下列行数(O):" onChange={() => showToast('按行滚动（当前）')} />
                <div className="flex items-center gap-3 pl-[18px]">
                  <input type="number" min={1} max={99} value={wheelLines} onChange={(e) => setWheelLines(Number(e.target.value))} className="w-[60px] h-[20px] px-2 border border-[#7a9ab8] bg-white rounded-[2px]" />
                  <span>行</span>
                </div>
                <XPRadio checked={false} label="一次滚动一个屏幕(E)" onChange={() => showToast('按屏滚动：一屏 ' + wheelLines + ' 行换算')} />
              </div>
            </GroupBox>
          </div>
        ) : null}
        {tab === 'hw' ? (
          <div className="space-y-2">
            <div className="font-bold text-[12px]">设备:</div>
            <div className="xp-sunken bg-white p-2 flex items-center gap-2">
              <Bmp name="cp-mouse" size={32} />
              <div>
                <div>PS/2 Compatible Mouse</div>
                <div className="text-[10px] text-[#5a5a5a]">类型: 鼠标 · 端口: PS/2 · 制造商: Generic（复刻）</div>
              </div>
            </div>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">设备状态: 这个设备运转正常。</div>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => showToast('应用：鼠标属性已保存到注册表（复刻演示）')}>应用(A)</XPButton>
      </div>
    </div>
  )
}


