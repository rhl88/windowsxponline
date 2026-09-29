/* ─────────────────────────────────────────────────────────────
 * XP WebOS 共享领域模型（纯逻辑，无客户端 API）
 * 客户端 zustand store 与服务端 /api/v1 模拟路由共用：
 *   - 领域类型（回收站/打印机/打印作业/任务计划/IE 数据…）
 *   - 系统默认值（单一事实来源，防止客户端/服务端漂移）
 *   - 全量快照 DTO（GET /api/v1/state 返回结构）
 * ───────────────────────────────────────────────────────────── */

import { FS, ensureUserHomes, type FSNode } from './fs'
import type { ClassicSchemeKey } from './classic-schemes'
import { freshRegTree, type RegKey } from './regseed'

export type { FSNode } from './fs'
export type { RegKey, RegType, RegValue } from './regseed'

/* ── 领域类型 ── */

export interface RecycleItem {
  key: string
  name: string
  origKey: string /* 原父目录（pathKey） */
  node: FSNode
  deletedAt: number
}

export interface ClipState {
  op: 'copy' | 'cut'
  paths: string[][]
}

export interface PrinterItem {
  name: string
  model: string
  def: boolean
}

/* 打印队列文档（打印时入队，完成自动出队；暂停的保留） */
export interface PrintJob {
  id: number
  printer: string
  doc: string
  pages: number
  size: string
  owner: string
  submitted: number
  status: 'printing' | 'paused'
}

/* 任务计划（向导创建后持久化） */
export interface SchedTask {
  name: string
  program: string
  app: string
  sched: string
  next: string
}

export interface IEHistItem {
  url: string
  title: string
  ts: number
}

export interface IEFavItem {
  url: string
  title: string
}

export type TaskbarPos = 'bottom' | 'top' | 'left' | 'right'

/* ── 用户帐户（欢迎屏多账号登录；密码仅服务端 mock 层持有，API 响应一律剥离） ── */
export type AccountType = 'admin' | 'user' | 'guest'

/* API 响应/客户端持有的帐户（hasPassword 派生，无密码明文） */
export interface AccountItem {
  name: string /* 登录名（欢迎屏磁贴显示） */
  type: AccountType /* 计算机管理员/受限/来宾 */
  avatar: string /* 头像资产名（public/icons/48/{avatar}.png） */
  hint: string /* 密码提示（空=未设置） */
  hasPassword: boolean
}

/* 服务端 mock 层内部记录（db/xp-state.json 持久化；永不随 API 返回） */
export interface AccountRecord extends Omit<AccountItem, 'hasPassword'> {
  password: string
}

export const ACCOUNT_AVATARS = ['avatar-admin', 'avatar-chess', 'avatar-guest', 'avatar-fish', 'avatar-plane']

/* 种子帐户：Administrator 密码登录（默认密码 = XP 发布年份，带密码提示）；来宾单击即登录。
 * 演示受限帐户「王小明」已于 d22 下线（旧快照由 mock-db 迁移移除） */
export const DEFAULT_ACCOUNTS: AccountRecord[] = [
  { name: 'Administrator', type: 'admin', avatar: 'avatar-admin', hint: 'Windows XP 的发布年份', password: '2001' },
  { name: 'Guest', type: 'guest', avatar: 'avatar-guest', hint: '', password: '' },
]

/* 服务端记录 → API 响应（剥离密码，派生 hasPassword） */
export function stripAccount(rec: AccountRecord): AccountItem {
  return { name: rec.name, type: rec.type, avatar: rec.avatar, hint: rec.hint ?? '', hasPassword: rec.password !== '' }
}

/* 桌面「排列图标」排序模式（none=手动/插入序，其余为 XP 四种排序） */
export type DesktopSort = 'none' | 'name' | 'size' | 'type' | 'modified'

/* 经典「开始」菜单可选项（自定义经典菜单对话框控制） */
export interface ClassicStartOpts {
  myDocs: boolean
  recentDocs: boolean
  search: boolean
  help: boolean
  run: boolean
  allPrograms: boolean
  logoff: boolean
  shutdown: boolean
}

/* 托盘通知行为偏好：always=总是显示 hide=总是隐藏 inactive=不活动时隐藏 */
export type NotifMode = 'always' | 'hide' | 'inactive'

export interface StartPinItem {
  key: string /* APP id */
  label: string
}

export type WallpaperKey = 'bliss' | 'azul' | 'autumn' | 'none-blue' | 'none-teal' | 'custom'
export type SaverKey = 'none' | 'pipes' | 'text3d' | 'starfield' | 'mystify' | 'slideshow' | 'marquee' | 'flight3d' | 'flowerbox'
export type ThemeKey = 'blue' | 'olive' | 'silver' | 'classic'

/* 经典样式「色彩方案」（真实 XP 22 方案：Windows 标准/经典 + 16 彩色 + 4 高对比度）
 * 仅 theme==='classic' 时生效；见 classic-schemes.ts 数据表 */
export type { ClassicSchemeKey } from './classic-schemes'

/* 壁纸位置（显示属性→桌面：居中/平铺/拉伸；纯色背景时无意义） */
export type WallpaperPos = 'center' | 'tile' | 'stretch'

/* 性能选项 → 视觉效果（XP sysdm.cpl「高级→性能→设置」；winAnim/menuFade/menuShadow 真实控制动画体系） */
export interface VisualFXOpts {
  dragWindowContents: boolean /* 拖动时显示窗口内容 */
  winAnim: boolean /* 窗口最小化和最大化时显示动画 */
  smoothScroll: boolean /* 平滑滚动列表框 */
  menuFade: boolean /* 淡入淡出或滑动菜单到视图 */
  slideCombo: boolean /* 滑动打开组合框 */
  menuShadow: boolean /* 在菜单下显示阴影 */
  cursorShadow: boolean /* 在鼠标指针下显示阴影 */
  visualStyles: boolean /* 在窗口和按钮上使用视觉样式 */
}
export const DEFAULT_VISUAL_FX: VisualFXOpts = {
  dragWindowContents: true,
  winAnim: true,
  smoothScroll: true,
  menuFade: true,
  slideCombo: true,
  menuShadow: true,
  cursorShadow: true,
  visualStyles: true,
}

/* ── 持久化设置（PUT /api/v1/settings 的字段集） ── */
export interface SettingsDTO {
  wallpaper: WallpaperKey
  wallpaperPos: WallpaperPos /* 壁纸位置：居中/平铺/拉伸 */
  bgColor: string /* 桌面背景色（壁纸为无/未覆盖处露出） */
  customWallpaper: string | null /* 「浏览」选择的自定义壁纸（fs 图片 src 地址） */
  customWallpaperName: string /* 自定义壁纸显示名（列表项） */
  deskIcons: Record<string, boolean> /* 桌面系统图标显隐（自定义桌面；true=显示） */
  deskIconOverrides: Record<string, string> /* 桌面图标替换（sys key → icons 资产名） */
  iconSize: 32 | 48
  soundsEnabled: boolean
  masterVolume: number
  volumeMuted: boolean
  screensaver: SaverKey
  saverWait: number
  theme: ThemeKey
  classicScheme: ClassicSchemeKey /* 经典样式色彩方案（外观页；切方案联动桌面底色） */
  taskbarLocked: boolean
  taskbarPos: TaskbarPos
  taskbarH: number
  showQuickLaunch: boolean
  taskbarAutoHide: boolean
  taskbarOnTop: boolean
  taskbarGroup: boolean
  showClock: boolean
  hideInactiveIcons: boolean
  notifPrefs: Record<string, NotifMode>
  tbDesktop: boolean
  tbLinks: boolean
  tbCustom: Array<{ name: string; path: string[] }>
  tbTitles: Record<string, boolean> /* 任务栏工具栏「显示标题」（键=quick/desktop/links/自定义名；缺省=XP 默认：链接/自定义显示，其余不显示） */
  startClassic: boolean
  classicOpts: ClassicStartOpts
  startOpts: { bigIcons: boolean; progCount: number; itemMode: Record<string, 'none' | 'link' | 'menu'> }
  autoArrange: boolean
  alignGrid: boolean /* 排列图标-对齐到网格（XP 默认开：拖放吸附网格） */
  desktopSort: DesktopSort /* 桌面排列图标：名称/大小/类型/修改时间 */
  solitaireBack: number /* 纸牌牌背样式索引 0-11（游戏→选定纸牌背面；Hearts 共用 cards.dll 牌背） */
  solitaireOpts: { draw: 1 | 3; scoring: 'none' | 'std' | 'vegas'; timed: boolean } /* 纸牌选项（翻牌方式/计分/计时） */
  startPinned: StartPinItem[]
  clockOffsetMin: number
  tzOffsetH: number
  tzName: string
  stickyKeys: boolean
  /* ── 文件夹选项（文件夹选项属性框；同步到 API settings 白名单） ── */
  hideFileExt: boolean /* 隐藏已知文件类型的扩展名 */
  showHiddenFiles: boolean /* 显示所有文件和文件夹 */
  showSystemFiles: boolean /* 显示受保护的操作系统文件（隐藏=true 为默认） */
  showCommonTasks: boolean /* 在文件夹中显示常见任务（XP 侧栏任务窗格） */
  clickToOpen: boolean /* 通过单击打开项目（XP 默认双击） */
  folderMisc: Record<string, boolean> /* 其余查看页项（rememberView/fullPathTitle 等） */
  programUse: Record<string, number>
  extAssoc: Record<string, string>
  /* 性能选项 → 视觉效果（winAnim/menuFade/menuShadow 真实控制窗口与菜单动画） */
  visualFX: VisualFXOpts
  /* ── 注册表编辑器（regedit）：用户编辑后的完整树（种子见 regseed.ts；整树替换落库） ── */
  regTree: RegKey
  /* ── 输入法指示器（任务栏语言栏：CH/EN；Ctrl+Shift 切换） ── */
  inputLang: 'ch' | 'en'
  langBarOn: boolean /* 语言栏托盘指示器显隐（任务栏右键→工具栏→语言栏） */
}

export const DEFAULT_SETTINGS: SettingsDTO = {
  wallpaper: 'bliss',
  wallpaperPos: 'stretch',
  bgColor: '#3a6ea5',
  customWallpaper: null,
  customWallpaperName: '',
  deskIcons: {},
  deskIconOverrides: {},
  iconSize: 32, /* XP 默认小图标；「使用大图标」= 48 */
  soundsEnabled: true,
  masterVolume: 72,
  volumeMuted: false,
  screensaver: 'none',
  saverWait: 10,
  theme: 'blue',
  classicScheme: 'standard',
  taskbarLocked: true,
  taskbarPos: 'bottom',
  taskbarH: 30,
  showQuickLaunch: true,
  taskbarAutoHide: false,
  taskbarOnTop: true,
  taskbarGroup: true,
  showClock: true,
  hideInactiveIcons: true,
  notifPrefs: {},
  tbDesktop: false,
  tbLinks: false,
  tbCustom: [],
  tbTitles: {},
  startClassic: false,
  classicOpts: { myDocs: true, recentDocs: true, search: true, help: true, run: true, allPrograms: true, logoff: true, shutdown: true },
  startOpts: { bigIcons: false, progCount: 6, itemMode: {} },
  autoArrange: false,
  alignGrid: true,
  desktopSort: 'none',
  solitaireBack: 1, /* 默认「经典蓝」——与出厂牌背观感一致 */
  solitaireOpts: { draw: 1, scoring: 'std', timed: false }, /* 纸牌选项：默认翻一张（保持玩法连续性），标准计分，不计时 */
  startPinned: [
    { key: 'ie', label: 'Internet' },
    { key: 'outlook', label: '电子邮件\nOutlook Express' },
  ],
  clockOffsetMin: 0,
  tzOffsetH: 8,
  tzName: '(GMT+08:00) 北京，重庆，香港特别行政区，乌鲁木齐',
  stickyKeys: false,
  /* 文件夹选项默认值（XP 出厂：隐藏扩展名、不显示隐藏/系统文件、显示常见任务、双击打开） */
  hideFileExt: true,
  showHiddenFiles: false,
  showSystemFiles: false,
  showCommonTasks: true,
  clickToOpen: false,
  folderMisc: { rememberView: true, showSysFolderContent: false, fullPathTitle: false, sepProcess: false },
  programUse: {},
  extAssoc: {},
  visualFX: { ...DEFAULT_VISUAL_FX },
  regTree: freshRegTree(),
  inputLang: 'ch',
  langBarOn: true,
}

/* IE 默认数据（收藏夹/主页） */
export const DEFAULT_IE = {
  home: 'http://cn.msn.com/',
  favorites: [
    { url: 'http://cn.msn.com/', title: 'MSN 中国' },
    { url: 'https://zh.wikipedia.org/wiki/Windows_XP', title: 'Windows XP - 维基百科' },
    { url: 'https://www.hao123.com/', title: 'hao123 - 我的上网主页' },
  ] as IEFavItem[],
  history: [] as IEHistItem[],
}

/* ── Outlook Express 邮件（持久化到 /api/v1/oe-mails；跨窗口共享） ── */
export type OeFolder = 'inbox' | 'outbox' | 'sent' | 'deleted' | 'drafts'
export interface OeMail {
  id: number
  from: string
  fromAddr: string
  to: string
  subject: string
  body: string
  date: string
  read: boolean
  folder: OeFolder
  attach?: string
  prio?: 'high' | 'low'
  flagged?: boolean
}

export const DEFAULT_OE_MAILS: OeMail[] = [
  { id: 1, from: 'MSN Hotmail', fromAddr: 'staff@hotmail.com', to: 'Administrator', subject: '欢迎使用 MSN Hotmail', body: '亲爱的用户：\n\n感谢您注册 MSN Hotmail 账户！您的 2MB 免费邮箱已经开通。\n\n现在您可以：\n  · 向世界任何角落发送电子邮件\n  · 订阅 MSN 新闻和天气预报\n  · 把喜欢的网站收藏进收藏夹\n\n2001 年是互联网的美好年代，尽情冲浪吧！\n\n—— MSN Hotmail 团队', date: '2001-10-25 09:12', read: false, folder: 'inbox' },
  { id: 2, from: 'Bill G.', fromAddr: 'billg@microsoft.com', to: 'Administrator', subject: '恭喜升级到 Windows XP', body: '你好：\n\n听说你装上了 Windows XP？绝佳的选择。\nLuna 主题很漂亮，不是吗？\n\n顺便一提，互联网浏览器大战已经结束了。\n我们赢得很彻底。;)\n\n—— Bill', date: '2001-10-25 10:45', read: false, folder: 'inbox', attach: 'luna_theme.jpg (216 KB)' },
  { id: 3, from: 'Norton 反病毒', fromAddr: 'noreply@symantec.com', to: 'Administrator', subject: '您的病毒库需要更新（2001-10-25）', body: '警告：\n\n您的病毒定义文件已超过 14 天未更新。\n近期流行的威胁：\n  · Code Red 蠕虫\n  · Nimda 蠕虫（电子邮件 + 网络共享双通道）\n  · Sircam\n\n请尽快连接 LiveUpdate 更新。\n\n—— Symantec', date: '2001-10-26 16:02', read: false, folder: 'inbox', prio: 'high' },
  { id: 4, from: 'Geocities 网站管家', fromAddr: 'notify@geocities.com', to: 'Administrator', subject: '您的个人主页本月流量即将用尽', body: '您好：\n\n您的 Geocities 免费主页（/~xiaowang2000/）\n本月流量已使用 82%。\n\n升级到 Geocities Plus 即可获得：\n  · 25MB 空间\n  · 无流量限制\n  · 告别弹出广告\n\n仅 $4.95/月！\n\n—— Geocities', date: '2001-10-27 21:33', read: false, folder: 'inbox' },
  { id: 5, from: '联众游戏世界', fromAddr: 'service@ourgame.com', to: 'Administrator', subject: '老王邀请您进入「四国军棋」房间', body: '您的棋友 老王(隔壁) 正在联众世界等您！\n\n房间：四国军棋 · 江湖大战区 · 3 号桌\n\n点击「加入游戏」立即上线。\n\n—— 联众世界，有你更精彩', date: '2001-10-28 20:15', read: false, folder: 'inbox' },
  { id: 6, from: 'Winamp 皮肤站', fromAddr: 'admin@skinz.org', to: 'Administrator', subject: '您订阅的「金属拉丝」皮肤包已更新', body: '嘿，音乐发烧友：\n\n「Winamp 3 银色拉丝」皮肤刚刚更新到 v2.1，\n修复了播放列表滚动条错位的老毛病。\n\n它真的把草鞋煮熟了！（Llama approved!）\n\n—— skinz.org 管理员', date: '2001-10-29 11:08', read: false, folder: 'inbox' },
]

/* 运行对话框 MRU 初始值 */
export const DEFAULT_RUN_HISTORY = ['notepad', 'cmd', 'mspaint']

/* ── 会话（审计用：登录/注销/锁定事件流水） ── */
export interface SessionEvent {
  action: 'login' | 'logoff' | 'lock' | 'unlock' | 'shutdown' | 'restart'
  at: number
  user: string
}

export interface SessionDTO {
  user: string
  computer: string
  events: SessionEvent[]
}

/* ── 全量快照（GET /api/v1/state 响应体；启动 hydrate 用） ── */
export interface MockStateDTO {
  version: number
  fsTree: FSNode
  recycleBin: RecycleItem[]
  settings: SettingsDTO
  recentDocs: string[][]
  runHistory: string[]
  printers: PrinterItem[]
  printJobs: PrintJob[]
  schedTasks: SchedTask[]
  desktopPos: Record<string, { x: number; y: number }>
  ie: { home: string; favorites: IEFavItem[]; history: IEHistItem[] }
  oeMails: OeMail[]
  netDrives: Array<{ letter: string; path: string }>
  audioBlobs: Record<string, string>
  session: SessionDTO
  accounts: AccountRecord[]
}

/* v1→v2（d22）：移除演示帐户王小明；Administrator 改为密码登录（旧空密码快照补默认密码） */
export const MOCK_STATE_VERSION = 2

/* 初始快照（与服务端 seed 共用；fsTree 每次深拷贝防止共享引用）
 * 文件树对帐：为每个种子帐户生成独立主目录（Administrator 丰富内容在静态树，
 * 其余帐户由 freshUserHome 工厂补齐）——「我的文档」完全受接口帐户控制 */
export function freshMockState(now = Date.now()): MockStateDTO {
  const fsTree = structuredClone(FS)
  ensureUserHomes(fsTree, DEFAULT_ACCOUNTS.map((a) => a.name))
  return {
    version: MOCK_STATE_VERSION,
    fsTree,
    recycleBin: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    recentDocs: [],
    runHistory: [...DEFAULT_RUN_HISTORY],
    printers: [],
    printJobs: [],
    schedTasks: [],
    desktopPos: {},
    ie: { home: DEFAULT_IE.home, favorites: structuredClone(DEFAULT_IE.favorites), history: [] },
    oeMails: structuredClone(DEFAULT_OE_MAILS),
    netDrives: [],
    audioBlobs: {},
    session: { user: 'Administrator', computer: 'XP-STATION', events: [{ action: 'login', at: now, user: 'Administrator' }] },
    accounts: structuredClone(DEFAULT_ACCOUNTS),
  }
}
