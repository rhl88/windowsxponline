'use client'

import React, { useEffect, useState } from 'react'
import type { WinState } from '../store'
import { useXP, type WallpaperKey, type WallpaperPos, type ThemeKey, type SaverKey, type ClassicSchemeKey } from '../store'
import { CLASSIC_SCHEMES, CLASSIC_SCHEME_ORDER } from '../classic-schemes'
import { XPButton, XPRadio, XPCheckbox, AnchoredMenu } from '../ui'
import { Bmp } from '../bmp'
import { resolvePath, myDocsPath, type FSNode } from '../fs'

const TABS = ['主题', '桌面', '屏幕保护程序', '外观', '设置'] as const

/* 内置壁纸地址 */
const WALL_SRC: Record<string, string> = {
  bliss: '/wallpapers/bliss.jpg',
  azul: '/wallpapers/azul.jpg',
  autumn: '/wallpapers/autumn.jpg',
}

/* 浏览对话框可选位置（真实 XP：图片收藏 + 系统壁纸目录；图片收藏为登录帐户相对） */
const browseLocs = (user: string): Array<{ label: string; path: string[] }> => [
  { label: '我的文档\\图片收藏', path: [...myDocsPath(user), '图片收藏'] },
  { label: 'C:\\WINDOWS\\Web\\Wallpaper', path: ['本地磁盘 (C:)', 'WINDOWS', 'Web', 'Wallpaper'] },
]

/* 桌面背景色板（XP 经典颜色下拉） */
const BG_COLORS: Array<[string, string]> = [
  ['#3a6ea5', 'XP 蓝'], ['#00ffff', '青色'], ['#000000', '黑色'], ['#0000ff', '蓝色'],
  ['#8a2be2', '蓝紫色'], ['#a52a2a', '褐色'], ['#ff7f50', '珊瑚色'], ['#ffd700', '金色'],
  ['#008000', '绿色'], ['#808080', '灰色'], ['#c0c0c0', '银色'], ['#ffff00', '黄色'],
  ['#ffa500', '橙色'], ['#800080', '紫色'], ['#ff00ff', '紫红色'], ['#ff0000', '红色'],
  ['#2e8b57', '海绿色'], ['#87ceeb', '天蓝色'], ['#008080', '深青色'], ['#000080', '深蓝色'],
]

function MonitorPreview({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex justify-center py-2">
      <div className="relative w-[190px]">
        <div className="w-[190px] h-[150px] rounded-[8px] bg-gradient-to-b from-[#e8e8e8] to-[#c8c8c8] border border-[#9a9a9a] p-[10px] shadow-md">
          <div className="w-full h-[112px] rounded-[2px] border-2 border-[#8a8a8a] overflow-hidden bg-black relative">
            {children}
            <div className="absolute bottom-1 right-2 w-[6px] h-[6px] rounded-full bg-[#4ddb4d] shadow-[0_0_4px_#4ddb4d]" />
          </div>
        </div>
        <div className="mx-auto w-[46px] h-[16px] bg-gradient-to-b from-[#c8c8c8] to-[#a8a8a8] border-x border-b border-[#9a9a9a]" />
        <div className="mx-auto w-[90px] h-[8px] rounded-b-[6px] bg-gradient-to-b from-[#c0c0c0] to-[#a0a0a0] border border-[#9a9a9a]" />
      </div>
    </div>
  )
}

/* 屏保预览小动画（迷你星空） */
function MiniStarfield() {
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {Array.from({ length: 26 }).map((_, i) => {
        const left = (i * 37) % 100
        const top = (i * 53) % 100
        const size = 1 + (i % 3)
        return <span key={i} className="absolute bg-white rounded-full" style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, opacity: 0.35 + (i % 5) * 0.14 }} />
      })}
    </div>
  )
}

function MiniMystify() {
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <svg className="absolute inset-0 w-full h-full">
        <path d="M10 60 L60 12 L110 55 L60 95 Z" fill="none" stroke="#3ae0e0" strokeWidth="1.6" opacity="0.9" />
        <path d="M40 90 L110 30 L155 80 L80 110 Z" fill="none" stroke="#e03a8a" strokeWidth="1.6" opacity="0.85" />
        <path d="M14 64 L64 16 L114 59 L64 99 Z" fill="none" stroke="#3a7ae0" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  )
}

function MiniPipes() {
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 180 120">
        <g strokeLinecap="round">
          <path d="M20 100 L20 55 L75 55 L75 15" stroke="#7a2020" strokeWidth="11" fill="none" />
          <path d="M20 100 L20 55 L75 55 L75 15" stroke="#d05050" strokeWidth="6" fill="none" transform="translate(-1.5,-1.5)" opacity="0.8" />
          <path d="M160 105 L160 70 L105 70 L105 30" stroke="#1a4a7a" strokeWidth="11" fill="none" />
          <path d="M160 105 L160 70 L105 70 L105 30" stroke="#5090d0" strokeWidth="6" fill="none" transform="translate(-1.5,-1.5)" opacity="0.8" />
          <path d="M55 110 L55 85 L130 85 L130 60" stroke="#20602a" strokeWidth="11" fill="none" />
          <path d="M55 110 L55 85 L130 85 L130 60" stroke="#50b060" strokeWidth="6" fill="none" transform="translate(-1.5,-1.5)" opacity="0.8" />
        </g>
      </svg>
    </div>
  )
}

function MiniText3D() {
  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
      <svg width="120" height="56" viewBox="0 0 120 56">
        <g fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="26" textAnchor="middle">
          <text x="63" y="36" fill="#123a70">XP</text>
          <text x="62" y="35" fill="#1a4a90">XP</text>
          <text x="60" y="33" fill="#3a8ae8">XP</text>
        </g>
      </svg>
    </div>
  )
}

/* 主题预览小窗口（模块级；经典样式随色彩方案变色） */
function ThemePreview({ t, themes, scheme }: { t: ThemeKey; themes: Array<{ key: ThemeKey; name: string; tb: string; cap: string }>; scheme: ClassicSchemeKey }) {
  /* 标题栏/任务栏文字是否浅色：经典方案按实测配色判定，Luna 银色为黑字 */
  let cap = ''
  let tb = ''
  let body = ''
  let capLight = true
  let tbLight = true
  if (t === 'classic') {
    const p = CLASSIC_SCHEMES[scheme]
    cap = `linear-gradient(90deg, ${p.capA}, ${p.capB})`
    tb = p.face
    body = p.face
    capLight = p.capText.toLowerCase() !== '#000000'
    tbLight = p.fg.toLowerCase() !== '#000000'
  } else {
    const th = themes.find((x) => x.key === t)!
    cap = th.cap
    tb = th.tb
    body = '#ece9d8'
    capLight = t !== 'silver'
    tbLight = t === 'blue' || t === 'olive'
  }
  return (
    <>
      <div className="absolute left-2 top-2 right-2 h-[11px] rounded-t-[3px]" style={{ background: cap, borderRadius: t === 'classic' ? 0 : undefined }} />
      <span className="absolute left-3 top-[4px] text-[6px] font-bold" style={{ color: capLight ? '#fff' : '#1a1a1a' }}>窗口标题</span>
      <div className="absolute left-2 top-[15px] right-2 h-[13px]" style={{ background: body }} />
      <span className="absolute left-0 right-0 bottom-0 h-[8px]" style={{ background: tb }} />
      <span className="absolute right-3 bottom-1 text-[5px]" style={{ color: tbLight ? '#fff' : '#1a1a1a' }}>12:34</span>
    </>
  )
}

export default function DisplayProperties({ win }: { win: WinState }) {
  const wallpaper = useXP((s) => s.wallpaper)
  const iconSize = useXP((s) => s.iconSize)
  const setIconSize = useXP((s) => s.setIconSize)
  const setWallpaper = useXP((s) => s.setWallpaper)
  const wallpaperPos = useXP((s) => s.wallpaperPos)
  const bgColor = useXP((s) => s.bgColor)
  const customWallpaper = useXP((s) => s.customWallpaper)
  const customWallpaperName = useXP((s) => s.customWallpaperName)
  const setWallpaperPos = useXP((s) => s.setWallpaperPos)
  const setBgColor = useXP((s) => s.setBgColor)
  const setCustomWallpaper = useXP((s) => s.setCustomWallpaper)
  const fsTree = useXP((s) => s.fsTree)
  const openApp = useXP((s) => s.openApp)
  const theme = useXP((s) => s.theme)
  const setTheme = useXP((s) => s.setTheme)
  const classicScheme = useXP((s) => s.classicScheme)
  const setClassicScheme = useXP((s) => s.setClassicScheme)
  const screensaver = useXP((s) => s.screensaver)
  const setScreensaver = useXP((s) => s.setScreensaver)
  const saverWait = useXP((s) => s.saverWait)
  const setSaverWait = useXP((s) => s.setSaverWait)
  const showToast = useXP((s) => s.showToast)
  /* 选项卡参数校验：传入值必须在 TABS 内，否则回退到默认「桌面」（防止空白页） */
  const rawTab = win.props.tab as string | undefined
  const initialTab = ((TABS as readonly string[]).includes(rawTab ?? '') ? rawTab : '桌面') as (typeof TABS)[number]
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab)
  const [sel, setSel] = useState<WallpaperKey>(wallpaper)
  const [selPos, setSelPos] = useState<WallpaperPos>(wallpaperPos)
  const [selBg, setSelBg] = useState(bgColor)
  const [colorAnchor, setColorAnchor] = useState<DOMRect | null>(null)
  const [showBrowse, setShowBrowse] = useState(false)
  const [selTheme, setSelTheme] = useState<ThemeKey>(theme)
  const [selScheme, setSelScheme] = useState<ClassicSchemeKey>(classicScheme)
  const [selSaver, setSelSaver] = useState<SaverKey>(screensaver)
  const [selWait, setSelWait] = useState(saverWait)
  const closeWindow = useXP((s) => s.closeWindow)
  const setRect = useXP((s) => s.setRect)

  useEffect(() => {
    setRect(win.id, { w: 410, h: 500 })
  }, [setRect, win.id])

  const wallpapers: Array<{ key: WallpaperKey; name: string }> = [
    { key: 'none-blue', name: '(无)' },
    { key: 'bliss', name: 'Bliss' },
    { key: 'azul', name: 'Azul (复刻)' },
    { key: 'autumn', name: 'Autumn (复刻)' },
    ...(customWallpaper ? [{ key: 'custom' as WallpaperKey, name: customWallpaperName || '自定义壁纸' }] : []),
  ]

  /* 预览/列表缩略图样式：真实位置语义（拉伸=100% 100% / 居中 / 平铺）+ 背景色 */
  const wallpaperCss = (key: WallpaperKey, forThumb = false): React.CSSProperties => {
    if (key === 'none-blue' || key === 'none-teal') return { backgroundColor: selBg }
    const src = key === 'custom' ? customWallpaper : WALL_SRC[key]
    if (!src) return { backgroundColor: selBg }
    if (forThumb) return { backgroundColor: selBg, backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    if (selPos === 'center') return { backgroundColor: selBg, backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }
    if (selPos === 'tile') return { backgroundColor: selBg, backgroundImage: `url(${src})`, backgroundRepeat: 'repeat' }
    return { backgroundColor: selBg, backgroundImage: `url(${src})`, backgroundSize: '100% 100%' }
  }

  const themes: Array<{ key: ThemeKey; name: string; tb: string; cap: string }> = [
    { key: 'blue', name: '默认（蓝）', tb: 'linear-gradient(180deg,#3f8cf3,#245edb 40%,#1941a5)', cap: 'linear-gradient(180deg,#0997ff,#0053ee 40%,#01328a)' },
    { key: 'olive', name: '橄榄绿', tb: 'linear-gradient(180deg,#b6c46a,#7d8f3a 40%,#55631f)', cap: 'linear-gradient(180deg,#c8d87a,#a4b654 40%,#6c8030)' },
    { key: 'silver', name: '银色', tb: 'linear-gradient(180deg,#f0f0f0,#c6c6c6 40%,#a0a0a0)', cap: 'linear-gradient(180deg,#fafcfe,#d8dce2 40%,#b8bec4)' },
    { key: 'classic', name: 'Windows 经典', tb: '#d4d0c8', cap: 'linear-gradient(90deg,#0a246a,#a6caf0)' },
  ]

  const savers: Array<{ key: SaverKey; name: string }> = [
    { key: 'none', name: '(无)' },
    { key: 'pipes', name: '三维管道' },
    { key: 'text3d', name: '三维文字' },
    { key: 'mystify', name: '变幻线' },
    { key: 'starfield', name: '星空' },
    { key: 'slideshow', name: '图片收藏幻灯片' },
    { key: 'marquee', name: '滚动字幕' },
    { key: 'flight3d', name: '三维飞行对象' },
    { key: 'flowerbox', name: '三维花盒' },
  ]

  const apply = () => {
    setWallpaper(sel)
    setWallpaperPos(selPos)
    setBgColor(selBg)
    setTheme(selTheme)
    setClassicScheme(selScheme)
    setScreensaver(selSaver)
    setSaverWait(selWait)
    showToast('显示属性已应用')
  }

  return (
    <div className="flex flex-col h-full bg-[#ece9d8] select-none p-2 text-[11px]">
      {/* 选项卡条 */}
      <div className="flex gap-[2px] pl-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`px-3 h-[21px] rounded-t-[4px] border border-b-0 ${tab === t ? 'bg-[#ece9d8] border-[#a8a498] relative z-10 font-bold' : 'bg-gradient-to-b from-[#f4f2e8] to-[#e4e1d4] border-[#c8c4b8] hover:bg-[#f8f5ec]'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 border border-[#a8a498] bg-[#ece9d8] p-3 overflow-hidden">
        {tab === '桌面' ? (
          <div className="flex flex-col h-full relative">
            <MonitorPreview>
              <div className="absolute inset-0" style={wallpaperCss(sel)} />
              {/* 预览桌面图标 + 任务栏 */}
              <span className="absolute left-2 top-2 w-[9px] h-[8px] bg-[#f0e8c0] rounded-[1px]" />
              <span className="absolute left-[26px] top-2 w-[9px] h-[8px] bg-[#7ba3e8] rounded-[1px]" />
              <span className="absolute left-0 right-0 bottom-0 h-[7px] bg-gradient-to-b from-[#2a5fc0] to-[#1a3a8f]" />
            </MonitorPreview>
            <div className="mt-1 flex-1 flex flex-col min-h-0">
              <div className="mb-1">背景(K):</div>
              <div className="flex-1 min-h-[110px] xp-sunken bg-white overflow-y-auto xp-thin-scroll">
                {wallpapers.map((w) => (
                  <button
                    key={w.key}
                    type="button"
                    className={`w-full flex items-center gap-2 px-2 py-[3px] text-left ${sel === w.key ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
                    onClick={() => setSel(w.key)}
                    onDoubleClick={apply}
                  >
                    <span className="w-[22px] h-[16px] border border-[#8a8a8a] shrink-0" style={wallpaperCss(w.key, true)} />
                    {w.name}
                  </button>
                ))}
              </div>
              {/* 位置 / 颜色（XP 真实双下拉；纯色背景时位置不可用） */}
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>位置(P):</span>
                  <select
                    data-wallpaper-pos="1"
                    className="h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none"
                    value={selPos}
                    disabled={sel === 'none-blue' || sel === 'none-teal'}
                    onChange={(e) => setSelPos(e.target.value as WallpaperPos)}
                  >
                    <option value="center">居中</option>
                    <option value="tile">平铺</option>
                    <option value="stretch">拉伸</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span>颜色(Q):</span>
                  <button
                    type="button"
                    data-bg-color="1"
                    className="h-[20px] min-w-[88px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 flex items-center gap-1 text-[11px] outline-none"
                    onClick={(e) => setColorAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())}
                  >
                    <span className="w-[12px] h-[12px] border border-[#8a8a8a] shrink-0" style={{ backgroundColor: selBg }} />
                    <span className="flex-1 text-left truncate">{BG_COLORS.find((c) => c[0] === selBg)?.[1] ?? selBg}</span>
                    <span className="text-[8px] text-[#555]">▼</span>
                  </button>
                </div>
              </div>
              {/* 浏览 / 自定义桌面（XP 底部双按钮） */}
              <div className="mt-2 flex justify-end gap-2">
                <XPButton onClick={() => setShowBrowse(true)}>浏览(B)...</XPButton>
                <XPButton onClick={() => openApp('deskitems', {})}>自定义桌面(C)...</XPButton>
              </div>
            </div>

            {/* 浏览对话框（XP：在图片收藏/系统壁纸目录中选图） */}
            {showBrowse ? <WallpaperBrowse onClose={() => setShowBrowse(false)} onPick={(src, name) => { setCustomWallpaper(src, name); setSel('custom'); setShowBrowse(false) }} /> : null}
          </div>
        ) : null}

        {tab === '主题' ? (
          <div className="flex flex-col h-full">
            <MonitorPreview>
              <div className="absolute inset-0" style={wallpaperCss(sel)} />
              <ThemePreview t={selTheme} themes={themes} scheme={selScheme} />
            </MonitorPreview>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0">主题(H):</span>
              <select
                data-theme-select="1"
                className="flex-1 h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none"
                value={selTheme === 'classic' ? 'Windows 经典' : 'Windows XP'}
                onChange={(e) => {
                  const t: ThemeKey = e.target.value === 'Windows 经典' ? 'classic' : 'blue'
                  setSelTheme(t)
                  setTheme(t) /* 实时预览 */
                  if (t === 'classic') {
                    /* XP 语义：应用「Windows 经典」主题 → 色彩方案重置为 Windows 标准（含桌面底色） */
                    setSelScheme('standard')
                    setClassicScheme('standard')
                  }
                }}
              >
                <option value="Windows XP">Windows XP</option>
                <option value="Windows 经典">Windows 经典</option>
              </select>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <button type="button" className="text-[#0a3c94] underline" onClick={() => { /* XP：主题下拉保存入口 */ openApp('dialog', { kind: 'info', title: '主题', text: '当前主题将保存到「我的当前主题」列表。' }, '主题') }}>另存为(A)...</button>
            </div>
            <div className="mt-3 text-[#6a6a5a] leading-[16px]">主题是一组背景、声音、图标以及只需单击即可帮助您个性化计算机的元素。选择「Windows 经典」可切换到经典灰 3D 界面。</div>
          </div>
        ) : null}

        {tab === '屏幕保护程序' ? (
          <div className="flex flex-col h-full">
            <MonitorPreview>
              {selSaver === 'none' ? (
                <>
                  <div className="absolute inset-0" style={wallpaperCss(sel)} />
                  <span className="absolute left-0 right-0 bottom-0 h-[7px] bg-gradient-to-b from-[#2a5fc0] to-[#1a3a8f]" />
                </>
              ) : selSaver === 'starfield' ? (
                <MiniStarfield />
              ) : selSaver === 'pipes' ? (
                <MiniPipes />
              ) : selSaver === 'text3d' ? (
                <MiniText3D />
              ) : (
                <MiniMystify />
              )}
            </MonitorPreview>
            <div className="mt-2 flex items-center gap-2">
              <span>屏幕保护程序(S):</span>
              <select
                className="xp-sunken bg-white h-[20px] px-1 flex-1"
                value={selSaver}
                onChange={(e) => setSelSaver(e.target.value as SaverKey)}
              >
                {savers.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span>等待(W):</span>
              <select
                className="xp-sunken bg-white h-[20px] px-1 w-[70px]"
                value={selWait}
                onChange={(e) => setSelWait(Number(e.target.value))}
              >
                {[1, 3, 5, 10, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} 分钟
                  </option>
                ))}
              </select>
              <span className="text-[#6a6a5a]">{selSaver === 'none' ? '（未启用）' : `空闲 ${selWait} 分钟后启动`}</span>
              <div className="flex-1" />
              <XPButton disabled={selSaver === 'none'} onClick={() => {
                /* XP 真实语义：多数屏保有专属设置对话框（此处简化为 marquee/slideshow 可配） */
                if (selSaver === 'marquee') showToast('滚动字幕设置：文字「Windows XP」· 速度中 · 背景黑色（复刻版预置）')
                else if (selSaver === 'slideshow') showToast('幻灯片设置：来自图片收藏 · 每 6 秒切换（复刻版预置）')
                else showToast('该屏幕保护程序没有可配置的选项')
              }}>设置(T)</XPButton>
              <XPButton disabled={selSaver === 'none'} onClick={() => {
                setScreensaver(selSaver)
                setSaverWait(selWait)
                window.dispatchEvent(new CustomEvent('xp-saver-preview'))
              }}>预览(V)</XPButton>
            </div>
            <div className="mt-2">
              <XPRadio checked label="在恢复时使用密码保护(P)" onChange={() => showToast('密码保护：您的帐户没有密码（就像大多数 2001 年的家庭电脑）')} />
            </div>
            <div className="mt-2">
              <XPButton onClick={() => { setScreensaver(selSaver); setSaverWait(selWait); apply(); showToast(selSaver === 'none' ? '已关闭屏幕保护程序' : `屏保「${savers.find((s) => s.key === selSaver)?.name}」已启用，等待 ${selWait} 分钟`) }}>
                立即应用屏保设置
              </XPButton>
            </div>
            <div className="mt-3 text-[#6a6a5a] leading-[16px]">
              选中的屏保将在键盘鼠标无操作一段时间后自动启动（移动鼠标或按任意键退出）。「三维管道」在黑色宇宙里铺设彩色管路，「三维文字」让 Windows XP 巨字翻转——都是 XP 时代办公室午睡的挚爱。
            </div>
          </div>
        ) : null}

        {tab === '外观' ? (
          <div className="flex flex-col h-full">
            <MonitorPreview>
              <div className="absolute inset-0" style={{ backgroundColor: selTheme === 'classic' ? CLASSIC_SCHEMES[selScheme].desktop : '#3a6ea5' }} />
              <ThemePreview t={selTheme} themes={themes} scheme={selScheme} />
            </MonitorPreview>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0">窗口和按钮(W):</span>
              <select
                data-winstyle-select="1"
                className="flex-1 h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none"
                value={selTheme === 'classic' ? 'Windows 经典样式' : 'Windows XP 样式'}
                onChange={(e) => {
                  const t: ThemeKey = e.target.value === 'Windows 经典样式' ? 'classic' : 'blue'
                  setSelTheme(t)
                  setTheme(t) /* 实时预览 */
                }}
              >
                <option value="Windows XP 样式">Windows XP 样式</option>
                <option value="Windows 经典样式">Windows 经典样式</option>
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0">色彩方案(C):</span>
              <select
                data-colorscheme-select="1"
                className="flex-1 h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none"
                value={selTheme === 'classic' ? selScheme : (themes.find((t) => t.key === selTheme)?.name ?? '默认（蓝）')}
                onChange={(e) => {
                  if (selTheme === 'classic') {
                    /* 经典样式：真实 XP 22 方案（切方案联动桌面底色，确定时不回滚） */
                    const k = e.target.value as ClassicSchemeKey
                    setSelScheme(k)
                    setClassicScheme(k) /* 实时预览（含 bgColor 联动） */
                    setSelBg(CLASSIC_SCHEMES[k].desktop)
                  } else {
                    const hit = themes.find((t) => t.name === e.target.value)
                    if (hit) {
                      setSelTheme(hit.key)
                      setTheme(hit.key) /* 实时预览 */
                    }
                  }
                }}
              >
                {selTheme === 'classic' ? (
                  CLASSIC_SCHEME_ORDER.map((k) => (
                    <option key={k} value={k}>{CLASSIC_SCHEMES[k].name}</option>
                  ))
                ) : (
                  themes.filter((t) => t.key !== 'classic').map((t) => (
                    <option key={t.key} value={t.name}>{t.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0">字体大小(F):</span>
              <select className="h-[20px] w-[120px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 text-[11px] outline-none" defaultValue="正常">
                <option value="正常">正常</option>
              </select>
            </div>
            <div className="mt-3">
              <XPCheckbox checked={iconSize === 48} label="使用大图标(U)" onChange={(v) => setIconSize(v ? 48 : 32)} />
            </div>
            <div className="mt-2 text-[#6a6a5a]">切换窗口样式或色彩方案会实时应用到整个系统（任务栏、窗口、开始菜单都会变）；经典样式共 22 种方案，含 4 种高对比度。</div>
          </div>
        ) : null}

        {tab === '设置' ? (
          <div className="flex flex-col h-full">
            <MonitorPreview>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-[#888]">1280 × 800</span>
              <span className="absolute left-0 right-0 bottom-0 h-[7px] bg-gradient-to-b from-[#2a5fc0] to-[#1a3a8f]" />
            </MonitorPreview>
            <div className="mt-2">
              <div className="mb-1">显示(S):</div>
              <div className="xp-sunken bg-white px-2 h-[20px] flex items-center">(多个监视器) · 即插即用监视器</div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span>屏幕分辨率(R):</span>
              <span className="text-[#0a3c94]">1280 by 800 像素（跟随浏览器窗口）</span>
            </div>
            <div className="mt-2">
              <div className="mb-1">颜色质量(D):</div>
              <div className="xp-sunken bg-white px-2 h-[20px] flex items-center">最高(32 位)</div>
            </div>
            <div className="mt-3 text-[#6a6a5a]">故障排除(T): 复刻版永不黑屏。</div>
          </div>
        ) : null}
      </div>
      {/* 颜色下拉（XP 色板菜单：色块 + 名称） */}
      {colorAnchor ? (
        <AnchoredMenu
          anchor={colorAnchor}
          align="left"
          width={150}
          items={BG_COLORS.map(([hex, name]) => ({
            label: name,
            icon: <span className="inline-block w-[14px] h-[14px] border border-[#8a8a8a]" style={{ backgroundColor: hex }} />,
            checked: hex === selBg,
            onClick: () => setSelBg(hex),
          }))}
          onClose={() => setColorAnchor(null)}
        />
      ) : null}
      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 pt-2">
        <XPButton primary onClick={() => { apply(); closeWindow(win.id) }}>确定</XPButton>
        <XPButton onClick={() => closeWindow(win.id)}>取消</XPButton>
        <XPButton onClick={apply}>应用(A)</XPButton>
      </div>
    </div>
  )
}

/* ═══════════ 浏览壁纸（XP 子对话框：位置下拉 + 图片列表 + 文件名 + 打开） ═══════════ */

function WallpaperBrowse({ onClose, onPick }: { onClose: () => void; onPick: (src: string, name: string) => void }) {
  const fsTree = useXP((s) => s.fsTree)
  /* 图片收藏为登录帐户相对路径（每帐户独立） */
  const locs = browseLocs(useXP((s) => s.sessionUser))
  const [locIdx, setLocIdx] = useState(0)
  const [pick, setPick] = useState<FSNode | null>(null)
  const images = (resolvePath(locs[locIdx].path, fsTree)?.children ?? []).filter((n) => n.src)

  return (
    <div className="absolute inset-0 bg-[#ece9d8] flex flex-col p-2 gap-2 z-20 text-[11px]" data-wallpaper-browse="1">
      <div className="flex items-center gap-2 pt-1">
        <span>搜寻(I):</span>
        <select
          className="flex-1 h-[20px] border border-[#7a9ab8] bg-white rounded-[2px] px-1 outline-none"
          value={locIdx}
          onChange={(e) => { setLocIdx(Number(e.target.value)); setPick(null) }}
        >
          {locs.map((l, i) => (
            <option key={l.label} value={i}>{l.label}</option>
          ))}
        </select>
      </div>
      {/* 图片列表（XP 平铺视图：缩略图 + 名称） */}
      <div className="flex-1 min-h-0 xp-sunken bg-white overflow-y-auto xp-thin-scroll p-1">
        {images.length === 0 ? <div className="p-2 text-[#666]">此位置没有图片。</div> : (
          <div className="flex flex-wrap gap-1">
            {images.map((n) => (
              <button
                key={n.name}
                type="button"
                className={`w-[64px] py-1 flex flex-col items-center gap-1 rounded-[2px] ${pick?.name === n.name ? 'bg-[#0a5ec8] text-white' : 'hover:bg-[#e8f0fb]'}`}
                onClick={() => setPick(n)}
                onDoubleClick={() => n.src && onPick(n.src, n.name)}
              >
                <span className="w-[52px] h-[38px] border border-[#8a8a8a] bg-[#d8d8cc] bg-center bg-no-repeat" style={{ backgroundImage: `url(${n.src})`, backgroundSize: 'contain' }} />
                <span className="px-1 truncate w-full text-center leading-[12px]" title={n.name}>{n.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>文件名(N):</span>
        <div className="flex-1 xp-sunken bg-white px-2 h-[20px] flex items-center truncate">{pick?.name ?? ''}</div>
      </div>
      <div className="flex justify-end gap-2">
        <XPButton primary disabled={!pick} onClick={() => pick?.src && onPick(pick.src, pick.name)}>打开(O)</XPButton>
        <XPButton onClick={onClose}>取消</XPButton>
      </div>
    </div>
  )
}
