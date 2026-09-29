'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP } from '../store'
import { XPButton, GroupBox, XPCheck } from '../ui'

/* Internet 选项：7 个选项卡，常规页可真实修改主页/清除历史 */

type Tab = 'gen' | 'sec' | 'priv' | 'content' | 'conn' | 'prog' | 'adv'

const TABS: Array<[Tab, string]> = [
  ['gen', '常规'],
  ['sec', '安全'],
  ['priv', '隐私'],
  ['content', '内容'],
  ['conn', '连接'],
  ['prog', '程序'],
  ['adv', '高级'],
]

const SEC_ZONES = ['Internet', '本地 Intranet', '受信任的站点', '受限制的站点']

export default function InetOptions({ win }: { win: WinState }) {
  const closeWindow = useXP((s) => s.closeWindow)
  const ieHome = useXP((s) => s.ieHome)
  const setIEHome = useXP((s) => s.setIEHome)
  const clearIEHistory = useXP((s) => s.clearIEHistory)
  const ieHistory = useXP((s) => s.ieHistory)
  const [tab, setTab] = useState<Tab>('gen')
  const [home, setHome] = useState(ieHome)
  const [tempFiles, setTempFiles] = useState(384)
  const [cookies, setCookies] = useState(12)
  const [zone, setZone] = useState(0)
  const [popupBlock, setPopupBlock] = useState(true)

  useEffect(() => {
    setHome(ieHome)
  }, [ieHome])

  const apply = () => {
    setIEHome(home.trim() || 'http://cn.msn.com/')
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      className={`px-[8px] h-[21px] text-[11px] rounded-t-[3px] border border-b-0 ${tab === t ? 'bg-[#ece9d8] border-[#a0a090] relative z-10 -mb-[1px] pb-[1px]' : 'bg-gradient-to-b from-[#f4f2e8] to-[#dcddd0] border-[#b0b0a0] hover:border-[#c8c8b0]'}`}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none">
      <div className="flex items-end px-2 pt-2 gap-[2px] border-b border-[#a0a090] flex-wrap">
        {TABS.map(([t, l]) => tabBtn(t, l))}
      </div>

      <div className="flex-1 p-3 overflow-y-auto xp-thin-scroll text-[11px]">
        {tab === 'gen' ? (
          <div className="space-y-4">
            <GroupBox title="主页">
              <div className="flex items-center gap-2 py-1">
                <span className="w-[46px] text-right">可以更改主页:</span>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <input className="flex-1 text-[11px] outline-none" value={home} onChange={(e) => setHome(e.target.value)} spellCheck={false} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <XPButton onClick={() => setHome(home)}>使用当前页(C)</XPButton>
                <XPButton onClick={() => setHome('http://cn.msn.com/')}>使用默认页(D)</XPButton>
                <XPButton onClick={() => setHome('about:blank')}>使用空白页(B)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="Internet 临时文件">
              <div className="text-[#5a5a4a] py-[2px]">当前缓存: {tempFiles} MB（Cookies {cookies} 个）</div>
              <div className="flex gap-2 pt-1">
                <XPButton onClick={() => { setCookies(0); useXP.getState().showToast('已删除所有 Cookies') }}>删除 Cookies(I)</XPButton>
                <XPButton onClick={() => { setTempFiles(0); useXP.getState().showToast('已删除临时文件夹中的所有文件') }}>删除文件(F)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="历史记录">
              <div className="text-[#5a5a4a] py-[2px]">历史记录保存 {ieHistory.length} 天（页面数）</div>
              <div className="flex justify-end pt-1">
                <XPButton onClick={() => { clearIEHistory(); useXP.getState().showToast('已清除 IE 历史记录') }}>清除历史记录(H)</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === 'sec' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-[210px] h-[30px] flex items-center gap-2">
                <svg width="26" height="26" viewBox="0 0 26 26">
                  <rect x="3" y="12" width="20" height="12" rx="2" fill="#e8a020" stroke="#a06010" />
                  <path d="M9 12 V8 a4 4 0 0 1 8 0 v4" fill="none" stroke="#a06010" strokeWidth="2" />
                </svg>
                <div className="xp-sunken bg-white flex-1 h-[20px] flex items-center px-1">
                  <select className="flex-1 text-[11px] outline-none bg-transparent h-[18px]" value={zone} onChange={(e) => setZone(Number(e.target.value))}>
                    {SEC_ZONES.map((z, i) => (
                      <option key={z} value={i}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="text-[#5a5a4a]">该区域的安全级别：中</div>
            <div className="text-[10px] text-[#8a8a8a] leading-[15px]">· 大多数内容在没有提示的情况下运行 · 不会下载未签名的 ActiveX 控件 · 提示有潜在的不可靠内容</div>
            <div className="flex justify-end">
              <XPButton onClick={() => useXP.getState().showToast('自定义级别：全部保持 XP 默认值')}>自定义级别(C)...</XPButton>
            </div>
          </div>
        ) : null}

        {tab === 'priv' ? (
          <div className="space-y-3">
            <div className="text-[#5a5a4a]">设置：中高 —— 阻止没有压缩策略的第三方 Cookie。</div>
            <div className="w-[200px] h-[12px] xp-sunken bg-white relative">
              <div className="absolute top-[-2px] left-[54%] w-[9px] h-[15px] bg-gradient-to-b from-[#f8f6ee] to-[#c8c6ba] border border-[#8a8878]" />
            </div>
            <div className="text-[10px] text-[#8a8a8a]">Cookie：第一方 中高 · 第三方 阻止</div>
          </div>
        ) : null}

        {tab === 'content' ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <span>分级审查:</span>
              <span className="text-[#5a5a4a] flex-1">{`启用（本复刻版浏览内容健康度：优）`}</span>
              <XPButton onClick={() => useXP.getState().showToast('分级审查：已全部放行（我们信任你）')}>启用(E)...</XPButton>
            </div>
            <div className="flex gap-2 items-center">
              <span>证书:</span>
              <span className="text-[#5a5a4a] flex-1">3 个受信任的根证书颁发机构</span>
              <XPButton onClick={() => useXP.getState().showToast('证书管理器：VeriSign / Thawte / 微软')}>证书(C)...</XPButton>
            </div>
            <div className="flex gap-2 items-center">
              <span>个人信息:</span>
              <span className="text-[#5a5a4a] flex-1">自动完成已启用</span>
              <XPButton onClick={() => useXP.getState().showToast('自动完成：Web 地址 / 表单 / 密码 全部启用')}>自动完成(A)...</XPButton>
            </div>
          </div>
        ) : null}

        {tab === 'conn' ? (
          <div className="space-y-3">
            <GroupBox title="拨号和虚拟专用网络设置">
              <div className="py-1 text-[#3a3a2a]">宽带连接（复刻代理服务器）· 已连接</div>
              <div className="flex gap-2">
                <XPButton onClick={() => useXP.getState().showToast('添加连接：56K 调制解调器已停产')}>添加(D)...</XPButton>
                <XPButton onClick={() => useXP.getState().showToast('设置：从不进行拨号连接')}>设置(S)...</XPButton>
                <XPButton onClick={() => useXP.getState().showToast('已删除「宽带连接」（开玩笑的）')}>删除(R)</XPButton>
              </div>
            </GroupBox>
            <GroupBox title="局域网(LAN)设置">
              <XPCheck checked label="自动检测设置(A)" />
              <XPCheck checked label="为 LAN 使用代理服务器(L)" />
              <div className="flex justify-end pt-1">
                <XPButton onClick={() => useXP.getState().showToast('LAN 设置：代理 127.0.0.1:3000 (api/browse)')}>高级(C)...</XPButton>
              </div>
            </GroupBox>
          </div>
        ) : null}

        {tab === 'prog' ? (
          <div className="space-y-2">
            {[
              ['HTML 编辑器', 'Microsoft Word'],
              ['电子邮件', 'Outlook Express'],
              ['新闻组阅读程序', 'Outlook Express'],
              ['日历', 'Hotmail'],
              ['联系人列表', '通讯簿'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-[130px] text-right text-[#5a5a4a]">{k}:</span>
                <div className="xp-sunken bg-white w-[180px] h-[20px] flex items-center px-1 text-[#3a3a2a]">{v}</div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'adv' ? (
          <div className="space-y-2">
            <div className="text-[#5a5a4a] font-bold">浏览</div>
            <XPCheck checked label="启用第三方浏览器扩展*" />
            <XPCheck checked label="显示友好 URL" />
            <div className="text-[#5a5a4a] font-bold pt-2">多媒体</div>
            <XPCheck checked label="显示图片" />
            <XPCheck checked label="播放网页中的动画" />
            <XPCheck checked label="播放网页中的声音" />
            <div className="text-[#5a5a4a] font-bold pt-2">安全</div>
            <XPCheck checked={popupBlock} label="阻止弹出窗口 (SP2)" onChange={() => setPopupBlock((v) => !v)} />
            <XPCheck label="检查服务器证书吊销" />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 px-3 py-2 border-t border-[#d8d5c8]">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>
          确定
        </XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={apply}>应用(A)</XPButton>
      </div>
    </div>
  )
}
