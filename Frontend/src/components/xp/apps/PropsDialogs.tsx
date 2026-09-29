'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPCheck, Sunken } from '../ui'
import { playClick, playMenu, playStartup, playShutdown, playLogon, playLogoff, playError, playCritical, playExclamation, playDing, playBalloon, playRecycle, playHwInsert, playHwRemove, playPopupBlocked, playPrintDone, playTada, playChord } from '../sounds'
import { Bmp } from '../bmp'

/* ═══════════════════════════════════════════════════════════════
   PropsDialogs — 控制面板经典属性框（cpl 系列）
   声音(mmsys.cpl) / 电源(powercfg.cpl) / 键盘 / 区域(intl.cpl) / 辅助功能(access.cpl)
   ═══════════════════════════════════════════════════════════════ */

/* 通用页签条（cpl 属性框九件套同款） */
function CplTabs({ tabs, tab, setTab }: { tabs: readonly string[]; tab: string; setTab: (t: string) => void }) {
  return (
    <div className="flex gap-[2px] pl-1 pt-1">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === t ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
          onClick={() => { playMenu(); setTab(t) }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ─────────────── 下拉框（XP 原生观感） ─────────────── */
function XPSel({ value, onChange, options, w = 180 }: { value: string; onChange: (v: string) => void; options: readonly string[]; w?: number }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-[20px] px-1 border border-[#7a9ab8] bg-white rounded-[2px] text-[11px] outline-none cursor-pointer`}
      style={{ width: w }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

/* ═══════════ 声音和音频设备 属性（mmsys.cpl） ═══════════ */

const SND_TABS = ['音量', '声音', '音频', '语音', '硬件'] as const

/* 程序事件表：名称 → 关联音效（真实 XP 中文版事件全集，16 种真实采样内嵌） */
const SND_EVENTS: Array<{ name: string; sound?: string; play?: () => void; indent?: boolean }> = [
  { name: 'Windows', indent: true },
  { name: '启动 Windows', sound: 'Windows XP 启动.wav', play: playStartup, indent: true },
  { name: '登录 Windows', sound: 'Windows XP 登录.wav', play: playLogon, indent: true },
  { name: '注销 Windows', sound: 'Windows XP 注销.wav', play: playLogoff, indent: true },
  { name: '退出 Windows', sound: 'Windows XP 关机.wav', play: playShutdown, indent: true },
  { name: '异常停止', sound: 'Windows XP 严重停止.wav', play: playCritical, indent: true },
  { name: '程序错误', sound: 'Windows XP 错误.wav', play: playError, indent: true },
  { name: '默认提示音', sound: 'Windows XP 叮声.wav', play: playDing, indent: true },
  { name: '感叹声', sound: 'Windows XP 感叹.wav', play: playExclamation, indent: true },
  { name: '新邮件通知', sound: 'Windows XP 通知.wav', play: playBalloon, indent: true },
  { name: '设备连接', sound: 'Windows XP 硬件插入.wav', play: playHwInsert, indent: true },
  { name: '设备连接失败', indent: true },
  { name: '设备断开连接', sound: 'Windows XP 硬件删除.wav', play: playHwRemove, indent: true },
  { name: '完成导航', indent: true },
  { name: '开始导航', indent: true },
  { name: '弹出菜单', indent: true },
  { name: '清空回收站', sound: 'Windows XP 回收站.wav', play: playRecycle, indent: true },
  { name: '打印完成', sound: 'Windows XP 打印完成.wav', play: playPrintDone, indent: true },
  { name: '弹出窗口已阻止', sound: 'Windows XP 弹出窗口已阻止.wav', play: playPopupBlocked, indent: true },
  { name: '任务已完成', sound: 'Windows XP 欢呼.wav', play: playTada, indent: true },
  { name: '电池电力不足警报', indent: true },
  { name: 'Windows 资源管理器', indent: true },
  { name: '最大化', indent: true },
  { name: '最小化', indent: true },
  { name: '菜单命令', indent: true },
]

export function SoundProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const masterVolume = useXP((s) => s.masterVolume)
  const volumeMuted = useXP((s) => s.volumeMuted)
  const setMasterVolume = useXP((s) => s.setMasterVolume)
  const setVolumeMuted = useXP((s) => s.setVolumeMuted)
  const [tab, setTab] = useState<string>((win.props?.tab as string) || '音量')
  const [evSel, setEvSel] = useState(1) /* 默认选中「启动 Windows」 */
  const [trayIcon, setTrayIcon] = useState(true)

  const ev = SND_EVENTS[evSel]

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <CplTabs tabs={SND_TABS} tab={tab} setTab={setTab} />
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '音量' ? (
          <div className="space-y-3">
            <GroupBox title="设备音量">
              <div className="p-2 space-y-2">
                <div className="text-[#3a3a3a]">设备音量控制(D):</div>
                <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] text-[#5a5a4a]">低</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volumeMuted ? 0 : masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="flex-1"
                    title="音量"
                  />
                  <span className="text-[10px] text-[#5a5a4a]">高</span>
                </div>
                <div className="flex items-center justify-between">
                  <XPCheck checked={volumeMuted} label="静音(M)" onChange={() => setVolumeMuted(!volumeMuted)} />
                  <div className="text-[#5a5a4a]">当前: {volumeMuted ? 0 : masterVolume} / 100</div>
                </div>
                <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
                  拖动滑块立即生效——托盘小喇叭与「音量控制」窗口会同步显示。静音时任务栏喇叭图标显示为禁用状态，与真实 XP 行为一致。
                </div>
              </div>
            </GroupBox>
            <GroupBox title="扬声器设置">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>扬声器音量(O):</span>
                  <XPButton onClick={() => showToast('扬声器音量：左 70 / 右 70（桌面立体声扬声器默认值）')}>扬声器音量(S)...</XPButton>
                </div>
                <div className="flex items-center gap-2">
                  <span>扬声器设置(E):</span>
                  <XPSel value="桌面立体声扬声器" onChange={() => showToast('扬声器设置：复刻版推荐「桌面立体声扬声器」')} options={['桌面立体声扬声器', '笔记本电脑单声道扬声器', '立体声耳机', '四声道扬声器', '5.1 环绕声扬声器', '7.1 环绕声扬声器']} />
                  <XPButton onClick={() => showToast('高级音频性能：启用硬件加速 + 24 位采样率音质（AC97 默认配置）')}>高级(A)...</XPButton>
                </div>
              </div>
            </GroupBox>
            <XPCheck checked={trayIcon} label="将音量图标放入任务栏(I)" onChange={() => { setTrayIcon(!trayIcon); showToast(trayIcon ? '已隐藏托盘音量图标（重启后恢复——复刻版的小固执）' : '已在任务栏显示音量图标') }} />
          </div>
        ) : null}

        {tab === '声音' ? (
          <div className="space-y-2">
            <GroupBox title="程序事件(P)">
              <div className="p-1">
                <Sunken className="h-[170px] overflow-y-auto xp-thin-scroll bg-white">
                  {SND_EVENTS.map((e, i) => (
                    <button
                      key={e.name + i}
                      type="button"
                      className={`w-full flex items-center gap-1 px-1 py-[2px] text-left ${evSel === i ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}
                      onClick={() => setEvSel(i)}
                    >
                      {e.indent ? <span className="pl-3" /> : null}
                      {i === 0 || e.name === 'Windows 资源管理器' ? <span className="font-bold">{e.name}</span> : <span className="pl-1">{e.name}</span>}
                      {evSel === i && e.sound ? <span className={`ml-auto mr-1 truncate ${evSel === i ? 'text-white' : 'text-[#5a5a4a]'}`}>{e.sound}</span> : null}
                    </button>
                  ))}
                </Sunken>
              </div>
            </GroupBox>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!ev?.play}
                className={`w-[42px] h-[30px] rounded-[3px] border border-[#a8a498] bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] flex flex-col items-center justify-center gap-[1px] ${ev?.play ? 'hover:from-[#f8f5ec]' : 'opacity-50 cursor-default'}`}
                onClick={() => { if (ev?.play) { ev.play(); showToast(`正在播放: ${ev.sound}`) } }}
                title="播放"
              >
                <svg width="10" height="12" viewBox="0 0 10 12"><path d="M1 1 L9 6 L1 11 Z" fill="#2a5a1a" /></svg>
              </button>
              <XPSel value={ev?.sound ?? '（无）'} onChange={() => showToast('浏览声音：真实 XP 会打开 C:\\WINDOWS\\Media 文件选择框')} options={ev?.sound ? [ev.sound, '（无）'] : ['（无）']} w={200} />
              <XPButton onClick={() => showToast('浏览…：C:\\WINDOWS\\Media\\（Windows XP 关机.wav 等 21 个文件）')}>浏览(B)...</XPButton>
            </div>
            <div className="flex items-center gap-2">
              <span>声音方案(S):</span>
              <XPSel value="Windows 默认" onChange={(v) => showToast(`声音方案已切换为「${v}」（复刻版实际播放仍为 XP 原版音效）`)} options={['Windows 默认', '无声', '动物叫声', '古典乐器', '丛林之音']} w={160} />
            </div>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              选中带 .wav 的事件后按 ▶ 播放真实发声——16 种 XP 原版采样已内嵌（开机 4.9 秒管弦乐、关机、登录/注销、严重停止、错误、叮声、感叹、气球、硬件插拔、回收站、打印完成、弹窗阻止、欢呼、和弦）。「无声」方案在真实 XP 中仅保留关键系统提示。
            </div>
          </div>
        ) : null}

        {tab === '音频' ? (
          <div className="space-y-3">
            <GroupBox title="声音播放">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>默认设备(D):</span>
                  <XPSel value="Realtek AC97 Audio" onChange={() => showToast('音频设备：本机仅一枚板载 AC97（2001 年主流配置）')} options={['Realtek AC97 Audio', '调制解调器 #0 线路播放 (emulated)']} w={220} />
                </div>
                <div className="flex gap-2">
                  <XPButton onClick={() => useXP.getState().openApp('volume', {}, '音量控制')}>音量(V)...</XPButton>
                  <XPButton onClick={() => showToast('高级属性：2 声道、16 位、48000 Hz（DVD 品质）——AC97 的骄傲')}>高级性能(X)...</XPButton>
                </div>
              </div>
            </GroupBox>
            <GroupBox title="录音">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>默认设备(E):</span>
                  <XPSel value="Realtek AC97 Audio" onChange={() => showToast('录音设备：AC97 线路输入（可配合「录音机」使用）')} options={['Realtek AC97 Audio', '调制解调器 #0 线路录音 (emulated)']} w={220} />
                </div>
                <div className="flex items-center gap-2">
                  <span>默认质量(Y):</span>
                  <XPSel value="CD 音质" onChange={() => showToast('录音质量：CD 音质 = 44.1 kHz 16 位立体声')} options={['CD 音质', '收音质量', '电话质量']} w={120} />
                </div>
              </div>
            </GroupBox>
            <GroupBox title="MIDI 音乐播放">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>默认设备(M):</span>
                  <XPSel value="Microsoft GS 波表软件合成器" onChange={() => showToast('MIDI 合成器：微软 GS 波表——用 CPU 模拟出 Roland SC-55 的味道')} options={['Microsoft GS 波表软件合成器', 'Realtek AC97 Audio']} w={230} />
                </div>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '语音' ? (
          <div className="space-y-3">
            <GroupBox title="语音播放">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>语音播放的默认设备(C):</span>
                  <XPSel value="Realtek AC97 Audio" onChange={() => showToast('语音播放设备：AC97（已由 Microsoft Sam 验证可用）')} options={['Realtek AC97 Audio']} w={200} />
                </div>
                <XPButton onClick={() => showToast('已用 Microsoft Sam 朗读：“感谢您使用 Windows XP 复刻版。”（想象一下 2001 年的机器嗓音）')}>预听语音(W)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="语音识别">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>语音识别的默认设备(N):</span>
                  <XPSel value="Realtek AC97 Audio" onChange={() => showToast('语音识别：未训练。让电脑听懂你，得先念 15 分钟「从前有座山」')} options={['Realtek AC97 Audio']} w={200} />
                </div>
                <XPButton onClick={() => showToast('语音配置文件训练：需要麦克风 + 15 分钟朗读，2001 年的赛博坐禅')}>训练配置(T)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '硬件' ? (
          <div className="space-y-2">
            <div>以下列表显示已安装的音频设备及其属性:</div>
            <Sunken className="bg-white">
              <div className="text-[10px] px-2 py-[3px] border-b border-[#d8d5c8] grid grid-cols-[40px_1fr_90px] bg-[#f4f2e8]">
                <span>名称</span><span /><span className="col-start-2 row-start-1">类型</span>
              </div>
              {[
                { name: 'Realtek AC97 Audio', type: '音频设备' },
                { name: '音频编解码器', type: '媒体控制设备' },
                { name: '传统音频驱动程序', type: '媒体控制设备' },
                { name: 'MIDI 设备和乐器', type: 'MIDI 设备' },
              ].map((d, i) => (
                <button key={d.name} type="button" className={`w-full flex items-center gap-2 px-2 py-[3px] text-left ${i === 0 ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}>
                  <Bmp name="cp-sound" size={16} />
                  <span className="flex-1">{d.name}</span>
                  <span className={`text-[10px] ${i === 0 ? 'text-white' : 'text-[#5a5a4a]'}`}>{d.type}</span>
                </button>
              ))}
            </Sunken>
            <div className="text-right">
              <XPButton onClick={() => showToast('Realtek AC97 Audio 属性：设备运转正常（AC97，2001 万岁）')}>属性(R)</XPButton>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => { setMasterVolume(masterVolume); playClick() }}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 电源选项 属性（powercfg.cpl） ═══════════ */

const PW_TABS = ['电源使用方案', '警报', '电源计量表', '高级'] as const

const PW_SCHEMES: Record<string, { monitor: string; disk: string; standby: string; hibernate: string }> = {
  '家用/办公桌': { monitor: '20 分钟之后', disk: '30 分钟之后', standby: '从不', hibernate: '从不' },
  '便携/袖珍式': { monitor: '5 分钟之后', disk: '10 分钟之后', standby: '15 分钟之后', hibernate: '45 分钟之后' },
  '演示': { monitor: '从不', disk: '从不', standby: '从不', hibernate: '从不' },
  '一直开着': { monitor: '从不', disk: '从不', standby: '从不', hibernate: '从不' },
  '最小电源管理': { monitor: '1 小时之后', disk: '从不', standby: '2 小时之后', hibernate: '从不' },
  '最大电池模式': { monitor: '15 分钟之后', disk: '15 分钟之后', standby: '20 分钟之后', hibernate: '45 分钟之后' },
}

const PW_TIMES = ['1 分钟之后', '5 分钟之后', '10 分钟之后', '15 分钟之后', '20 分钟之后', '30 分钟之后', '45 分钟之后', '1 小时之后', '2 小时之后', '从不']

export function PowerProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<string>((win.props?.tab as string) || '电源使用方案')
  const [scheme, setScheme] = useState('家用/办公桌')
  const [monitor, setMonitor] = useState(PW_SCHEMES['家用/办公桌'].monitor)
  const [disk, setDisk] = useState(PW_SCHEMES['家用/办公桌'].disk)
  const [standby, setStandby] = useState(PW_SCHEMES['家用/办公桌'].standby)
  const [hibernate, setHibernate] = useState(PW_SCHEMES['家用/办公桌'].hibernate)
  const [trayIcon, setTrayIcon] = useState(false)
  const [pwPrompt, setPwPrompt] = useState(true)

  const pickScheme = (s: string) => {
    setScheme(s)
    const p = PW_SCHEMES[s]
    if (p) { setMonitor(p.monitor); setDisk(p.disk); setStandby(p.standby); setHibernate(p.hibernate) }
    showToast(`电源方案「${s}」已应用（${p?.monitor ?? '从不'}关闭监视器）`)
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <CplTabs tabs={PW_TABS} tab={tab} setTab={setTab} />
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '电源使用方案' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span>电源使用方案(S):</span>
              <XPSel value={scheme} onChange={pickScheme} options={Object.keys(PW_SCHEMES)} w={170} />
            </div>
            <GroupBox title={`设置 — ${scheme}`}>
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-[110px] text-right">关闭监视器(M):</span>
                  <XPSel value={monitor} onChange={(v) => { setMonitor(v); showToast(`关闭监视器: ${v}（CRT 显示器的节能修养）`) }} options={[monitor, ...PW_TIMES.filter((t) => t !== monitor)]} w={130} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-[110px] text-right">关闭硬盘(H):</span>
                  <XPSel value={disk} onChange={(v) => { setDisk(v); showToast(`关闭硬盘: ${v}（机械硬盘的午睡时间）`) }} options={[disk, ...PW_TIMES.filter((t) => t !== disk)]} w={130} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-[110px] text-right">系统待机(Y):</span>
                  <XPSel value={standby} onChange={(v) => { setStandby(v); showToast(`系统待机: ${v}——真实 XP 待机后风扇停转，复刻版保持清醒`) }} options={[standby, ...PW_TIMES.filter((t) => t !== standby)]} w={130} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-[110px] text-right">系统休眠(E):</span>
                  <XPSel value={hibernate} onChange={(v) => { setHibernate(v); showToast(`系统休眠: ${v}（把 512 MB 内存倒进硬盘再睡）`) }} options={[hibernate, ...PW_TIMES.filter((t) => t !== hibernate)]} w={130} />
                </div>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              监视器与硬盘空闲关闭时间由电源方案预设。台式机默认「家用/办公桌」：20 分钟关监视器、30 分钟关硬盘。此系统为台式机，未安装电池，所以「系统待机」之上的选项仅作展示。
            </div>
          </div>
        ) : null}

        {tab === '警报' ? (
          <div className="space-y-3">
            <GroupBox title="电池警报">
              <div className="p-2 space-y-2">
                <XPCheck checked onChange={() => showToast('电池电量不足警报：台式机无电池，此项仅作展示')} label="激活电池不足警报(A)" />
                <div className="flex items-center gap-3">
                  <span className="w-[90px] text-right">电池电量不足(A):</span>
                  <input type="range" min={1} max={50} defaultValue={13} className="w-[130px]" onChange={() => showToast('警报阈值调整：13%（建议保持默认）')} />
                  <span>13 %</span>
                  <XPButton onClick={() => showToast('警报操作：通知我（气泡提示「电池电量低」后 5% 进入严重短缺）')}>警报操作(L)...</XPButton>
                </div>
                <XPCheck checked onChange={() => showToast('电池严重短缺警报：无电池，仅作展示')} label="激活电池严重短缺警报(C)" />
                <div className="flex items-center gap-3">
                  <span className="w-[90px] text-right">电池严重短缺(C):</span>
                  <input type="range" min={1} max={20} defaultValue={5} className="w-[130px]" onChange={() => showToast('严重短缺阈值调整：5%')} />
                  <span>5 %</span>
                  <XPButton onClick={() => showToast('警报操作：待机（真实笔记本此时会拼命闪灯）')}>警报操作(R)...</XPButton>
                </div>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              此计算机没有电池（台式机 + 220V 市电）。真实笔记本在电量警报时会弹出气泡并按设定进入待机或休眠。
            </div>
          </div>
        ) : null}

        {tab === '电源计量表' ? (
          <div className="space-y-3">
            <GroupBox title="电源计量表">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-3">
                  <Bmp name="cp-power" size={32} />
                  <div>
                    <div>当前电源: 交流电(AC)</div>
                    <div className="text-[#5a5a4a]">电池: 不存在</div>
                  </div>
                </div>
                <div className="h-[26px] xp-sunken bg-white relative overflow-hidden">
                  <div className="absolute inset-y-[3px] left-[3px] right-[70px] border border-[#7a9ab8]" />
                  <div className="absolute right-[3px] top-[7px] w-[10px] h-[12px] border border-[#7a9ab8]" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#5a5a4a]">交流电供电</div>
                </div>
              </div>
            </GroupBox>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              此系统没有 uninterruptible power supply (UPS)。若安装了 UPS，此处将显示制造商（如 APC）、估计剩余时间与电池容量，并可配置断电警报。
            </div>
          </div>
        ) : null}

        {tab === '高级' ? (
          <div className="space-y-3">
            <GroupBox title="选项">
              <div className="p-2 space-y-2">
                <XPCheck checked={trayIcon} label="总是在任务栏上显示图标(A)" onChange={() => { setTrayIcon(!trayIcon); showToast(trayIcon ? '已隐藏电源图标（台式机本来也看不见它）' : '已在任务栏显示电源图标') }} />
                <XPCheck checked={pwPrompt} label="在计算机从待机状态恢复时提示输入密码(R)" onChange={() => { setPwPrompt(!pwPrompt); showToast(pwPrompt ? '待机恢复不再要密码（2001 年的办公室安全话题）' : '待机恢复需要输入密码（Administrator）') }} />
              </div>
            </GroupBox>
            <div className="flex items-center gap-2">
              <span>在按下计算机电源按钮时(O):</span>
              <XPSel value="问我要做什么" onChange={(v) => showToast(`电源按钮行为: ${v}`)} options={['问我要做什么', '关机', '待机', '休眠', '不采取任何措施']} w={130} />
            </div>
            <XPCheck checked label="在按下计算机睡眠按钮时(S): 待机" onChange={() => showToast('睡眠按钮：本机机箱没有这个按钮（DIY 装机时代没几个人知道它）')} />
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              若要暂时停止使用休眠并删除 hiberfil.sys，可取消「启用休眠」——真实 XP 由此立刻释放约 384 MB 磁盘空间。
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => { playClick(); showToast(`电源方案「${scheme}」已保存`) }}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 键盘 属性 ═══════════ */

const KB_TABS = ['速度', '硬件'] as const

export function KeyboardProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<string>((win.props?.tab as string) || '速度')
  const [delay, setDelay] = useState(2) /* 重复延迟 0-3 */
  const [rate, setRate] = useState(2) /* 重复率 0-3 */
  const [blink, setBlink] = useState(4) /* 闪烁频率 0-8 */
  const [testText, setTestText] = useState('')
  const holdRef = useRef<number | null>(null)

  /* 真实重复率测试：按住按键时按设定速率持续追加（XP 名场面） */
  const startRepeat = () => {
    if (holdRef.current) return
    const delayMs = [1000, 750, 500, 250][delay]
    const rateMs = [500, 300, 150, 60][rate]
    window.setTimeout(() => {
      holdRef.current = window.setInterval(() => {
        setTestText((t) => (t.length > 40 ? t : t + 'x'))
      }, rateMs)
    }, delayMs)
  }
  const stopRepeat = () => {
    if (holdRef.current) { window.clearInterval(holdRef.current); holdRef.current = null }
  }
  useEffect(() => () => stopRepeat(), [])

  /* 闪烁频率真实联动（慢 333ms → 快 100ms） */
  const blinkMs = 400 - blink * 37

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <CplTabs tabs={KB_TABS} tab={tab} setTab={setTab} />
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '速度' ? (
          <div className="space-y-3">
            <GroupBox title="字符重复">
              <div className="p-2 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-[120px] text-right">重复延迟(D):</span>
                  <input type="range" min={0} max={3} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-[130px]" />
                  <div className="flex gap-1 text-[10px] text-[#5a5a4a]"><span>长</span><span>────</span><span>短</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-[120px] text-right">重复率(R):</span>
                  <input type="range" min={0} max={3} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-[130px]" />
                  <div className="flex gap-1 text-[10px] text-[#5a5a4a]"><span>慢</span><span>────</span><span>快</span></div>
                </div>
                <div className="text-[#3a3a3a]">单击此处并按住一个键以便测试重复率(K):</div>
                <Sunken className="bg-white h-[22px] px-2 leading-[22px] font-mono cursor-text" >
                  <span
                    onPointerDown={startRepeat}
                    onPointerUp={stopRepeat}
                    onPointerLeave={stopRepeat}
                    onKeyDown={(e) => { if (e.key.length === 1) { setTestText((t) => (t.length > 40 ? '' : t + e.key)); e.preventDefault() } }}
                    tabIndex={0}
                    className="outline-none block"
                  >
                    {testText}
                    <span className="inline-block w-[2px] h-[13px] align-middle bg-black animate-none" style={{ animation: `kbblink ${blinkMs}ms step-end infinite` }} />
                  </span>
                </Sunken>
              </div>
            </GroupBox>
            <div className="flex items-center gap-3">
              <span className="w-[120px] text-right">光标闪烁频率(F):</span>
              <input type="range" min={0} max={8} value={blink} onChange={(e) => setBlink(Number(e.target.value))} className="w-[130px]" />
              <div className="flex gap-1 text-[10px] text-[#5a5a4a]"><span>慢</span><span>────</span><span>快</span></div>
              <span className="inline-block w-[2px] h-[13px] bg-black" style={{ animation: `kbblink ${blinkMs}ms step-end infinite` }} />
            </div>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px]">
              重复延迟 = 按住到开始重复的等待时间；重复率 = 之后每秒吐出多少个字符。光标闪烁频率旁边的竖线会按滑块速率真实闪动——把它拉到最快，就是 XP 时代最劝退的光标。
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>以下列表显示已安装的键盘设备及其属性:</div>
            <Sunken className="bg-white">
              <div className="text-[10px] px-2 py-[3px] border-b border-[#d8d5c8] bg-[#f4f2e8]">名称 / 类型</div>
              {[
                { name: '标准 101/102 键或 Microsoft 自然 PS/2 键盘', type: '标准键盘设备' },
                { name: 'HID 键盘设备', type: '标准键盘设备' },
              ].map((d, i) => (
                <button key={d.name} type="button" className={`w-full flex items-center gap-2 px-2 py-[3px] text-left ${i === 0 ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e8f0fb]'}`}>
                  <Bmp name="cp-keyboard" size={16} />
                  <span className="flex-1">{d.name}</span>
                  <span className={`text-[10px] ${i === 0 ? 'text-white' : 'text-[#5a5a4a]'}`}>{d.type}</span>
                </button>
              ))}
            </Sunken>
            <div className="text-right">
              <XPButton onClick={() => showToast('键盘属性：设备运转正常。PS/2 圆口，插拔前请关机（2001 年的忠告）')}>属性(R)</XPButton>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => { stopRepeat(); playClick(); showToast('键盘速度设置已保存（在下面的测试框里长按试试）') }}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 区域和语言选项（intl.cpl） ═══════════ */

const INTL_TABS = ['区域选项', '语言', '高级'] as const

export function IntlProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const openApp = useXP((s) => s.openApp)
  const tzName = useXP((s) => s.tzName)
  const [tab, setTab] = useState<string>((win.props?.tab as string) || '区域选项')
  const [locale, setLocale] = useState('中文(中国)')
  const [position, setPosition] = useState('中国')

  /* 数字/货币/时间/日期的示例预览（XP 原版布局） */
  const sample = locale === '中文(中国)'
    ? { num: '123,456,789.00', cur: '¥123,456,789.00', time: '13:25:30', shortD: '2001-10-25', longD: '2001年10月25日' }
    : locale === '英语(美国)'
      ? { num: '123,456,789.00', cur: '$123,456,789.00', time: '1:25:30 PM', shortD: '10/25/2001', longD: 'Thursday, October 25, 2001' }
      : { num: '123.456.789,00', cur: '€123.456.789,00', time: '13:25:30', shortD: '25.10.2001', longD: 'Donnerstag, 25. Oktober 2001' }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <CplTabs tabs={INTL_TABS} tab={tab} setTab={setTab} />
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '区域选项' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">要查看更改，请从下拉列表中选择不同的区域。</div>
            <GroupBox title="标准和格式">
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span>用于显示数字、时间、日期和货币的格式(T):</span>
                  <XPSel value={locale} onChange={(v) => { setLocale(v); showToast(`标准和格式: ${v}（下方示例立即刷新）`) }} options={['中文(中国)', '英语(美国)', '德语(德国)', '日语(日本)']} w={130} />
                </div>
                <div className="text-[#3a3a3a]">示例:</div>
                <Sunken className="bg-white p-2 space-y-[2px] font-mono text-[11px]">
                  <div className="grid grid-cols-[64px_1fr]"><span>正数(P):</span><span>{sample.num}</span></div>
                  <div className="grid grid-cols-[64px_1fr]"><span>负数:</span><span>-123,456,789.00</span></div>
                  <div className="grid grid-cols-[64px_1fr]"><span>货币(C):</span><span>{sample.cur}</span></div>
                  <div className="grid grid-cols-[64px_1fr]"><span>时间:</span><span>{sample.time}</span></div>
                  <div className="grid grid-cols-[64px_1fr]"><span>短日期:</span><span>{sample.shortD}</span></div>
                  <div className="grid grid-cols-[64px_1fr]"><span>长日期:</span><span>{sample.longD}</span></div>
                </Sunken>
                <XPButton onClick={() => showToast('自定义：中文(中国)默认负数带 -、短日期 yyyy-MM-dd、货币符号 ¥（人民币玩家的主场）')}>自定义(Z)...</XPButton>
              </div>
            </GroupBox>
            <div className="flex items-center gap-2">
              <span>位置 — 为您所在的地区提供本地信息，如新闻和天气(U):</span>
              <XPSel value={position} onChange={(v) => { setPosition(v); showToast(`位置: ${v}——MSN 中国首页的天气从此看这里`) }} options={['中国', '美国', '德国', '日本', '香港特别行政区']} w={130} />
            </div>
          </div>
        ) : null}

        {tab === '语言' ? (
          <div className="space-y-3">
            <GroupBox title="文字服务和输入语言">
              <div className="p-2 space-y-2">
                <div>要查看或更改文字服务和输入语言，请单击“详细信息”。(D)</div>
                <div className="flex items-center gap-2">
                  <span>默认输入语言(L):</span>
                  <XPSel value="中文(中国) - 简体中文 - 美式键盘" onChange={() => showToast('默认输入语言：简体中文 - 美式键盘（Ctrl+Shift 切换，Shift 切中英）')} options={['中文(中国) - 简体中文 - 美式键盘', '中文(中国) - 中文(简体) - 智能ABC', '中文(中国) - 中文(简体) - 微软拼音', '英语(美国) - US']} w={250} />
                </div>
                <Sunken className="bg-white h-[90px] overflow-y-auto xp-thin-scroll">
                  {[
                    { ime: '简体中文 - 美式键盘', kind: '键盘' },
                    { ime: '中文(简体) - 智能ABC', kind: '输入法编辑器(IME)' },
                    { ime: '中文(简体) - 微软拼音', kind: '输入法编辑器(IME)' },
                    { ime: '中文(简体) - 全拼', kind: '输入法编辑器(IME)' },
                    { ime: '英语(美国) - US', kind: '键盘' },
                  ].map((r, i) => (
                    <div key={r.ime} className={`flex items-center gap-2 px-2 py-[2px] ${i === 0 ? 'bg-[#316ac5] text-white' : ''}`}>
                      <Bmp name="cp-intl" size={16} />
                      <span className="flex-1 pl-1">{r.ime}</span>
                      <span className={`text-[10px] ${i === 0 ? 'text-white' : 'text-[#5a5a4a]'}`}>{r.kind}</span>
                    </div>
                  ))}
                </Sunken>
                <div className="flex gap-2">
                  <XPButton onClick={() => showToast('文字服务详细：已安装 3 个 IME（智能ABC / 微软拼音 / 全拼）+ 2 个键盘布局')}>详细信息(E)...</XPButton>
                  <XPButton onClick={() => showToast('首选项：语言栏已停靠在任务栏（右下角的 CH 图标）')}>首选项</XPButton>
                </div>
              </div>
            </GroupBox>
            <GroupBox title="补充语言支持">
              <div className="p-2 space-y-2">
                <XPCheck checked label="为东亚语言安装文件(I) — 日文、朝鲜文和简/繁体中文（已安装）" onChange={() => showToast('东亚语言文件：已安装（C:\\WINDOWS\\ime 目录已就位）')} />
                <XPCheck checked label="为复杂文字和从右向左的语言安装文件(包括泰文)(N)" onChange={() => showToast('复杂文字支持：已安装（阿拉伯语/希伯来语/泰文）')} />
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '高级' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">这台计算机上运行的非 Unicode 程序的语言版本应该匹配目标语言。</div>
            <div className="flex items-center gap-2">
              <span>非 Unicode 程序的语言(N):</span>
              <XPSel value="中文(中国)" onChange={(v) => showToast(`非 Unicode 程序语言: ${v}（更改后需重启——XP 乱码修复三件套之一）`)} options={['中文(中国)', '英语(美国)', '日语(日本)', '俄语(俄罗斯)']} w={160} />
            </div>
            <div className="text-[10px] text-[#5a5a4a] leading-[15px] space-y-1">
              <div>时区（由「日期和时间 属性」管理）: {tzName}</div>
              <div>代码页转换表: 936 (GB2312)、950 (Big5)、437 (OEM 美国)、1252 (ANSI 拉丁语 I) 等 12 个已注册。</div>
            </div>
            <XPButton onClick={() => { closeWindow(win.id); openApp('datetime', {}, '日期和时间 属性') }}>日期和时间设置(D)...</XPButton>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => { playClick(); showToast(`区域设置已应用: ${locale} / ${position}`) }}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 辅助功能选项（access.cpl） ═══════════ */

const ACC_TABS = ['键盘', '声音', '显示', '鼠标', '常规'] as const

export function AccessProps({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const showToast = useXP((s) => s.showToast)
  const [tab, setTab] = useState<string>((win.props?.tab as string) || '键盘')
  const sticky = useXP((s) => s.stickyKeys)
  const setSticky = useXP((s) => s.setStickyKeys)
  const [filter, setFilter] = useState(false)
  const [toggle, setToggle] = useState(false)
  const [soundSentry, setSoundSentry] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [mouseKeys, setMouseKeys] = useState(false)
  const [autoReset, setAutoReset] = useState(false)

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none text-[11px]">
      <CplTabs tabs={ACC_TABS} tab={tab} setTab={setTab} />
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-y-auto xp-thin-scroll">
        {tab === '键盘' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">「粘滞键」是为一次按一个键有困难的用户设计的；「筛选键」忽略短暂或重复的击键；「切换键」在按下锁定键时发出声音。</div>
            <GroupBox title="粘滞键">
              <div className="p-2 space-y-2">
                <XPCheck checked={sticky} label="使用粘滞键(K) — 连按 5 次 Shift 键即启用" onChange={() => { setSticky(!sticky); showToast(sticky ? '粘滞键已关闭' : '粘滞键已启用：现在 Ctrl/Shift/Alt 可以分开按了（连按 5 次 Shift 的结果）') }} />
                <XPButton onClick={() => showToast('粘滞键设置：按修改键锁定（连按两次锁定）、任务栏显示警告（经典蓝框）')}>设置(S)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="筛选键">
              <div className="p-2 space-y-2">
                <XPCheck checked={filter} label="使用筛选键(F) — 按住右 Shift 键 8 秒钟即启用" onChange={() => { setFilter(!filter); showToast(filter ? '筛选键已关闭' : '筛选键已启用：短暂或重复击键将被忽略（打字再快也只算一次）') }} />
                <XPButton onClick={() => showToast('筛选键设置：忽略少于 0.5 秒的击键、重复率放慢（还可听击键声）')}>设置(E)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="切换键">
              <div className="p-2 space-y-2">
                <XPCheck checked={toggle} label="使用切换键(T) — 在按下 Caps Lock、Num Lock 或 Scroll Lock 时发出声音" onChange={() => { setToggle(!toggle); showToast(toggle ? '切换键已关闭' : '切换键已启用：按 Caps Lock 会“哔”一声（高音开/低音关）') }} />
                <XPButton onClick={() => showToast('切换键设置：按锁定键时发声（开=高音、关=低音）')}>设置(G)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '声音' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">「声音卫士」为系统发出的声音提供视觉警告；「声音显示」为语音声音提供字幕。</div>
            <GroupBox title="声音卫士">
              <div className="p-2 space-y-2">
                <XPCheck checked={soundSentry} label="使用声音卫士(S)" onChange={() => { setSoundSentry(!soundSentry); showToast(soundSentry ? '声音卫士已关闭' : '声音卫士已启用：系统发声时闪烁活动窗口') }} />
                <XPButton onClick={() => showToast('声音卫士设置：无声音时闪烁活动标题栏 / 活动窗口 / 桌面')}>设置(V)...</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="声音显示">
              <div className="p-2 space-y-2">
                <XPCheck onChange={() => showToast('声音显示：为语音和系统声音生成字幕（需要程序自身支持）')} label="使用声音显示(D)" />
                <XPButton onClick={() => showToast('声音显示设置：对话朗读（复刻版暂无朗读引擎，请脑补 Microsoft Sam）')}>设置(M)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '显示' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">「高对比度」用更可读的前景/背景颜色方案改善屏幕可读性。</div>
            <GroupBox title="高对比度">
              <div className="p-2 space-y-2">
                <XPCheck checked={highContrast} label="使用高对比度(H) — 按左 Alt+左 Shift+PRINT SCREEN 键切换" onChange={() => { setHighContrast(!highContrast); showToast(highContrast ? '高对比度已关闭：回到 Luna 蓝色主题' : '高对比度已启用：黑底黄字 #0f0 on #000（默认方案）') }} />
                <XPButton onClick={() => showToast('高对比度设置：可选 黑底白字 / 白底黑字 / 黑底黄字 共 11 种配色方案')}>设置(C)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '鼠标' ? (
          <div className="space-y-3">
            <div className="text-[#3a3a3a]">「鼠标键」让您用数字小键盘控制指针——坏了鼠标的年代的救命稻草。</div>
            <GroupBox title="鼠标键">
              <div className="p-2 space-y-2">
                <XPCheck checked={mouseKeys} label="使用鼠标键(M) — 左 Alt+左 Shift+NUM LOCK 键切换" onChange={() => { setMouseKeys(!mouseKeys); showToast(mouseKeys ? '鼠标键已关闭' : '鼠标键已启用：小键盘 5=单击、+ = 双击、0/\.=按住/释放') }} />
                <XPButton onClick={() => showToast('鼠标键设置：指针速度（小键盘 8/2/4/6 移动，7/9/1/3 斜向），Ctrl 加速')}>设置(Y)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === '常规' ? (
          <div className="space-y-3">
            <GroupBox title="自动复位">
              <div className="p-2 space-y-2">
                <XPCheck checked={autoReset} label="在此时间内不活动后关闭辅助功能(I): 5 分钟" onChange={() => { setAutoReset(!autoReset); showToast(autoReset ? '自动复位关闭：辅助功能将一直保留' : '自动复位开启：空闲 5 分钟后自动关闭所有辅助功能') }} />
              </div>
            </GroupBox>
            <GroupBox title="通知">
              <div className="p-2 space-y-2">
                <XPCheck checked label="打开或关闭功能时给出警告(W) — 就是那个经典的蓝色确认框" onChange={() => showToast('功能切换警告：确认后将播放一段短促的音调')} />
                <XPCheck checked label="打开或关闭功能时发出声音(M)" onChange={() => showToast('功能切换音：上扬音=开、下降音=关')} />
              </div>
            </GroupBox>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 p-2 shrink-0">
        <XPButton primary onClick={() => closeWindow(win.id)}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={() => { playClick(); showToast('辅助功能设置已保存') }}>应用(A)</XPButton>
      </div>
    </div>
  )
}
