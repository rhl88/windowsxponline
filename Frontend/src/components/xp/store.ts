'use client'

import { create } from 'zustand'
import { fsSync } from '@/lib/api/fs-sync'
import { FS, resolvePath, uniqueName, pathKey, assocOf, mutateAt, detachNode, insertNode, userDesktopPath, DNS_PATH, freshUserHome, ensureUserHomes, type FSNode } from './fs'
import {
  DEFAULT_SETTINGS, DEFAULT_IE, DEFAULT_RUN_HISTORY, DEFAULT_ACCOUNTS,
  type RecycleItem, type ClipState, type PrinterItem, type PrintJob, type SchedTask,
  type IEHistItem, type IEFavItem, type TaskbarPos, type ClassicStartOpts, type NotifMode,
  type StartPinItem, type WallpaperKey, type WallpaperPos, type SaverKey, type ThemeKey, type VisualFXOpts,
  type DesktopSort, type ClassicSchemeKey, type AccountItem, type RegKey, type OeMail,
} from './model'
import { CLASSIC_SCHEMES } from './classic-schemes'

export type {
  RecycleItem, ClipState, PrinterItem, PrintJob, SchedTask, IEHistItem, IEFavItem,
  TaskbarPos, ClassicStartOpts, NotifMode, StartPinItem, WallpaperKey, WallpaperPos, SaverKey, ThemeKey, VisualFXOpts,
  ClassicSchemeKey, AccountItem, RegKey, RegType, RegValue, OeMail,
} from './model'

/* ─────────── 系统阶段 ─────────── */
export type Phase =
  | 'boot'
  | 'welcome'
  | 'logging-in'
  | 'logging-off'
  | 'desktop'
  | 'locked'
  | 'shutting-down'
  | 'poweroff'
  | 'restarting'
  | 'standby'

/* ─────────── 窗口状态 ─────────── */
export interface WinRect {
  x: number
  y: number
  w: number
  h: number
}

export interface WinState {
  id: number
  app: string
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
  maximized: boolean
  prevRect: WinRect | null
  resizable: boolean
  noTaskbar?: boolean
  props: Record<string, unknown>
}

export interface DesktopItem {
  key: string
  label: string
  icon: string
  open: () => void
}

export interface CtxMenuState {
  x: number
  y: number
  items: CtxItem[]
}

export interface CtxItem {
  label?: string
  icon?: React.ReactNode
  bold?: boolean
  disabled?: boolean
  separator?: boolean
  checked?: boolean
  /* XP 互斥菜单项用圆点（查看/排列图标），与勾选（工具栏/锁定任务栏）区分 */
  radio?: boolean
  accelerator?: string
  submenu?: CtxItem[]
  onClick?: () => void
  /* 行右键（开始菜单「所有程序」叶子项 → XP shell 菜单：打开/附到开始菜单/属性） */
  onContextMenu?: (e: React.MouseEvent) => void
}

/* 领域类型移至 ./model（与服务端 /api/v1 共享）——此处再导出保持既有导入不变 */

/* 打印完成计时器（模块级：作业出队与窗口无关，后台真实推进） */
const printTimers = new Map<number, number>()

/* 工作区：除去任务栏后的可用屏幕区域（窗口最大化/拖动边界用） */
/* 自动隐藏 / 不置于前端时，任务栏不再保留屏幕空间（与真实 XP 一致） */
export function getWorkArea() {
  const { taskbarPos, taskbarH, taskbarAutoHide, taskbarOnTop } = useXP.getState()
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const reserve = taskbarOnTop && !taskbarAutoHide ? taskbarH : 0
  switch (taskbarPos) {
    case 'top':
      return { left: 0, top: reserve, width: vw, height: vh - reserve }
    case 'left':
      return { left: reserve, top: 0, width: vw - reserve, height: vh }
    case 'right':
      return { left: 0, top: 0, width: vw - reserve, height: vh }
    default:
      return { left: 0, top: 0, width: vw, height: vh - reserve }
  }
}

/* XP 系统时钟（支持「日期和时间」属性设置的偏移） */
export function xpNow(): Date {
  const tz = useXP.getState()
  return new Date(Date.now() + tz.clockOffsetMin * 60000)
}

/* XP 通知气球（锚定托盘）：纯字符串兼容旧调用点 */
export interface BalloonSpec {
  title?: string
  text: string
  icon?: 'shield' | 'mail' | 'info' | 'warn'
  onClick?: () => void
}

interface XPState {
  phase: Phase
  windows: WinState[]
  zTop: number
  nextId: number
  startOpen: boolean
  ctxMenu: CtxMenuState | null
  /* ── 用户帐户（欢迎屏多账号；accounts 无密码明文，密码仅存服务端） ──
   * sessionUser：当前桌面会话用户（开始菜单头部/会话事件用）
   * switchFrom：快速用户切换保留的前一会话（欢迎屏磁贴「已登录」标记；
   *             点击该磁贴直接返回原会话——窗口全保留，XP FUS 语义） */
  accounts: AccountItem[]
  sessionUser: string
  switchFrom: string | null
  setAccounts: (list: AccountItem[]) => void
  /* 帐户主目录镜像（与 /accounts API 生命周期联动；详见实现处注释） */
  seedAccountHome: (name: string) => void
  removeAccountHome: (name: string) => void
  renameAccountHome: (oldName: string, newName: string) => void
  reconcileAccountHomes: () => void
  setSessionUser: (name: string) => void
  setSwitchFrom: (name: string | null) => void
  wallpaper: WallpaperKey
  wallpaperPos: WallpaperPos
  bgColor: string
  customWallpaper: string | null
  customWallpaperName: string
  deskIcons: Record<string, boolean>
  deskIconOverrides: Record<string, string>
  iconSize: 32 | 48
  fsTree: FSNode
  recycleBin: RecycleItem[]
  clipboard: ClipState | null
  printers: PrinterItem[]
  printJobs: PrintJob[]
  schedTasks: SchedTask[]
  desktopPos: Record<string, { x: number; y: number }>
  ieHistory: IEHistItem[]
  ieFavorites: IEFavItem[]
  ieHome: string
  clockOffsetMin: number
  tzOffsetH: number
  tzName: string
  audioBlobs: Record<string, string>
  toast: string | BalloonSpec | null
  soundsEnabled: boolean
  masterVolume: number
  volumeMuted: boolean
  volumeFlyout: boolean
  stickyKeys: boolean
  /* ── 文件夹选项（与 SettingsDTO 同步；XP「工具→文件夹选项」） ── */
  hideFileExt: boolean
  showHiddenFiles: boolean
  showSystemFiles: boolean
  showCommonTasks: boolean
  clickToOpen: boolean
  folderMisc: Record<string, boolean>
  /* 性能选项 → 视觉效果（winAnim/menuFade/menuShadow 控制窗口与菜单动画） */
  visualFX: VisualFXOpts
  setVisualFX: (patch: Partial<VisualFXOpts>) => void
  screensaver: SaverKey
  saverWait: number /* 分钟 */
  theme: ThemeKey
  classicScheme: ClassicSchemeKey /* 经典样式色彩方案 */
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
  /* ── 通知区域会话态（不持久化）：« 展开与图标活动时间戳 ── */
  trayExpanded: boolean
  trayActivity: Record<string, number>
  setTrayExpanded: (v: boolean) => void
  touchTray: (key: string) => void
  tbDesktop: boolean
  tbLinks: boolean
  tbCustom: Array<{ name: string; path: string[] }>
  tbTitles: Record<string, boolean>
  startClassic: boolean
  classicOpts: ClassicStartOpts
  startOpts: { bigIcons: boolean; progCount: number; itemMode: Record<string, 'none' | 'link' | 'menu'> }
  autoArrange: boolean
  alignGrid: boolean
  setAlignGrid: (v: boolean) => void
  desktopSort: DesktopSort
  setDesktopSort: (v: DesktopSort) => void
  solitaireBack: number
  setSolitaireBack: (v: number) => void
  /* ── 纸牌选项（翻牌/计分/计时） ── */
  solitaireOpts: { draw: 1 | 3; scoring: 'none' | 'std' | 'vegas'; timed: boolean }
  setSolitaireOpts: (v: { draw: 1 | 3; scoring: 'none' | 'std' | 'vegas'; timed: boolean }) => void
  /* ── 注册表编辑器 ── */
  regTree: RegKey
  setRegTree: (t: RegKey) => void
  /* ── 输入法指示器（语言栏） ── */
  inputLang: 'ch' | 'en'
  langBarOn: boolean
  setInputLang: (v: 'ch' | 'en') => void
  setLangBarOn: (v: boolean) => void
  startPinned: StartPinItem[]
  altTab: { open: boolean; index: number }
  security: boolean
  programUse: Record<string, number>
  /* 「从列表中删除」：XP 真实语义——移出最常用列表（使用计数清零；再次使用会重新计入） */
  removeFromMFU: (key: string) => void
  /* 我最近的文档（路径段数组，XP 最多保留 15 条） */
  recentDocs: string[][]
  pushRecentDoc: (p: string[]) => void
  clearRecentDocs: () => void
  /* 运行对话框 MRU 历史（XP 最多保留 26 条） */
  runHistory: string[]
  pushRunHistory: (cmd: string) => void
  clearRunHistory: () => void
  netDrives: Array<{ letter: string; path: string }>
  addNetDrive: (letter: string, path: string) => void
  removeNetDrive: (letter: string) => void
  /* 扩展级默认打开程序（「打开方式→始终使用」写入；XP 真实语义） */
  extAssoc: Record<string, string>
  setExtAssoc: (ext: string, appId: string) => void
  clearExtAssoc: (ext: string) => void
  /* Actions */
  setPhase: (p: Phase) => void
  openApp: (app: string, props?: Record<string, unknown>, titleOverride?: string) => number
  closeWindow: (id: number) => void
  focusWindow: (id: number) => void
  minimizeWindow: (id: number) => void
  restoreWindow: (id: number) => void
  toggleMaximize: (id: number) => void
  setRect: (id: number, rect: Partial<WinRect>) => void
  setWindowTitle: (id: number, title: string) => void
  setWinSize: (id: number, w: number, h: number) => void
  minimizeAll: () => void
  setStartOpen: (open: boolean) => void
  toggleStart: () => void
  openCtx: (x: number, y: number, items: CtxItem[], opts?: { keepStart?: boolean }) => void
  closeCtx: () => void
  setWallpaper: (w: WallpaperKey) => void
  setWallpaperPos: (p: WallpaperPos) => void
  setBgColor: (c: string) => void
  setCustomWallpaper: (src: string | null, name?: string) => void
  setDeskIcon: (key: string, show: boolean) => void
  setDeskIconOverride: (key: string, asset: string | null) => void
  setIconSize: (s: 32 | 48) => void
  /* ── 文件系统操作 ── */
  fsCreateFolder: (parentPath: string[], name?: string) => string
  fsCreateFile: (parentPath: string[], name: string, opts?: { content?: string; icon?: FSNode['icon']; src?: string; type?: string; appId?: string; size?: string; shortcutTo?: string[]; children?: FSNode[] }) => string
  fsCreateShortcut: (parentPath: string[], targetPath: string[], targetName?: string) => string
  fsWriteFile: (parentPath: string[], name: string, content: string, opts?: { icon?: FSNode['icon']; type?: string; src?: string; appId?: string }) => string
  fsDelete: (paths: string[][]) => number
  fsDeletePermanent: (paths: string[][]) => number
  fsRestore: (key?: string) => void
  fsRemoveRecycle: (key: string) => void
  fsEmptyRecycle: () => void
  fsRename: (path: string[], newName: string) => string | null
  fsUpdateNode: (path: string[], patch: Partial<FSNode> & { error?: string }) => void
  fsMove: (paths: string[][], destPath: string[]) => void
  fsDuplicate: (path: string[]) => string | null
  fsPaste: (destPath: string[]) => void
  setClipboard: (op: 'copy' | 'cut', paths: string[][]) => void
  saveAudioBlob: (path: string, url: string) => void
  /* ── IE ── */
  addIEHistory: (url: string, title?: string) => void
  clearIEHistory: () => void
  addIEFavorite: (url: string, title?: string) => void
  removeIEFavorite: (url: string) => void
  setIEHome: (url: string) => void
  /* ── 桌面/时钟 ── */
  setDesktopPos: (key: string, x: number, y: number) => void
  setClockOffset: (min: number) => void
  setTZ: (offsetH: number, name: string) => void
  showToast: (t: string | BalloonSpec | null) => void
  setSoundsEnabled: (v: boolean) => void
  closeAll: () => void
  setMasterVolume: (v: number) => void
  setVolumeMuted: (m: boolean) => void
  setVolumeFlyout: (open: boolean) => void
  setScreensaver: (s: SaverKey) => void
  setSaverWait: (m: number) => void
  setTheme: (t: ThemeKey) => void
  setClassicScheme: (k: ClassicSchemeKey) => void
  setStickyKeys: (v: boolean) => void
  setFolderOpt: (patch: Partial<Pick<XPState, 'hideFileExt' | 'showHiddenFiles' | 'showSystemFiles' | 'showCommonTasks' | 'clickToOpen' | 'folderMisc'>>) => void
  setAltTab: (at: { open: boolean; index: number }) => void
  setSecurity: (v: boolean) => void
  /* ── 打印机 ── */
  addPrinter: (name: string, model?: string) => void
  removePrinter: (name: string) => void
  addPrintJob: (printer: string, doc: string, pages: number) => void
  pausePrintJob: (id: number) => void
  cancelPrintJob: (id: number) => void
  cancelAllPrintJobs: (printer: string) => void
  /* ── 任务计划 ── */
  addSchedTask: (t: SchedTask) => void
  removeSchedTask: (name: string) => void
  /* ── 任务栏 ── */
  setTaskbarLocked: (v: boolean) => void
  setTaskbarPos: (p: TaskbarPos) => void
  setTaskbarH: (h: number) => void
  setQuickLaunch: (v: boolean) => void
  setTaskbarAutoHide: (v: boolean) => void
  setTaskbarOnTop: (v: boolean) => void
  setTaskbarGroup: (v: boolean) => void
  setShowClock: (v: boolean) => void
  setHideInactiveIcons: (v: boolean) => void
  setNotifPref: (key: string, mode: NotifMode) => void
  setTbDesktop: (v: boolean) => void
  setTbLinks: (v: boolean) => void
  addTbCustom: (name: string, path: string[]) => void
  removeTbCustom: (name: string) => void
  setTbTitle: (key: string, v: boolean) => void
  setStartClassic: (v: boolean) => void
  setClassicOpt: (k: keyof ClassicStartOpts, v: boolean) => void
  setStartOpts: (o: Partial<{ bigIcons: boolean; progCount: number; itemMode: Record<string, 'none' | 'link' | 'menu'> }>) => void
  restoreAllWindows: () => void
  setAutoArrange: (v: boolean) => void

  /* ── Outlook Express 邮件（API 整表同步；Outlook 模块仓库镜像于此） ── */
  oeMails: OeMail[]
  setOeMails: (m: OeMail[]) => void
  /* ── 开始菜单固定项 ── */
  pinStartItem: (item: StartPinItem) => void
  unpinStartItem: (key: string) => void
  reorderStartPinned: (from: number, to: number) => void
}

/* 各应用默认窗口尺寸 */
export const APP_DEFAULTS: Record<string, { w: number; h: number; resizable?: boolean; title?: string; noTaskbar?: boolean }> = {
  explorer: { w: 660, h: 480, title: '我的电脑' },
  notepad: { w: 440, h: 330, title: '无标题 - 记事本' },
  minesweeper: { w: 0, h: 0, resizable: false, title: '扫雷' },
  paint: { w: 580, h: 440, title: '无标题 - 画图' },
  calculator: { w: 272, h: 346, resizable: false, title: '计算器' },
  ie: { w: 720, h: 520, title: 'MSN 中国 - Microsoft Internet Explorer' },
  solitaire: { w: 640, h: 480, title: '纸牌' },
  deckopts: { w: 428, h: 344, resizable: false, title: '选定纸牌背面' },
  wmp: { w: 700, h: 540, title: 'Windows Media Player' },
  taskmgr: { w: 430, h: 470, title: 'Windows 任务管理器' },
  display: { w: 406, h: 492, resizable: false, title: '显示 属性' },
  run: { w: 396, h: 178, resizable: false, title: '运行', noTaskbar: true },
  cmd: { w: 590, h: 340, title: 'C:\\WINDOWS\\system32\\cmd.exe' },
  dialog: { w: 0, h: 0, resizable: false, noTaskbar: true },
  about: { w: 400, h: 320, resizable: false, title: '关于 Windows', noTaskbar: true },
  freecell: { w: 590, h: 500, title: '空当接龙' },
  hearts: { w: 660, h: 540, title: '红心大战' },
  wordpad: { w: 560, h: 470, title: '文档 - 写字板' },
  outlook: { w: 720, h: 500, title: '收件箱 - Outlook Express' },
  oecompose: { w: 560, h: 460, title: '新邮件' },
  pinball: { w: 340, h: 640, title: '3D Pinball for Windows - 太空军校生' },
  diskclean: { w: 380, h: 360, title: '磁盘清理' },
  defrag: { w: 500, h: 480, title: '磁盘碎片整理程序' },
  sysinfo: { w: 600, h: 440, title: '系统信息' },
  controlpanel: { w: 640, h: 480, title: '控制面板' },
  sysprops: { w: 420, h: 470, title: '系统属性' },
  useraccounts: { w: 540, h: 420, title: '用户帐户' },
  volume: { w: 640, h: 260, title: '音量控制' },
  search: { w: 660, h: 460, title: '搜索结果' },
  helpcenter: { w: 780, h: 560, title: '帮助和支持中心' },
  imgviewer: { w: 640, h: 500, title: 'Windows 图片和传真查看器' },
  sndrec: { w: 420, h: 210, resizable: false, title: '声音 - 录音机' },
  charmap: { w: 560, h: 440, title: '字符映射表' },
  clipbrd: { w: 480, h: 320, title: '剪贴板' },
  datetime: { w: 430, h: 470, resizable: false, title: '日期和时间 属性' },
  fileprops: { w: 400, h: 480, resizable: false, title: '属性', noTaskbar: true },
  inetopts: { w: 460, h: 500, resizable: false, title: 'Internet 选项', noTaskbar: true },
  addremove: { w: 500, h: 480, resizable: false, title: '添加或删除程序' },
  netconn: { w: 560, h: 400, title: '网络连接' },
  printfax: { w: 560, h: 380, title: '打印机和传真' },
  printqueue: { w: 470, h: 230, title: '打印队列' },
  print: { w: 380, h: 330, resizable: false, title: '打印', noTaskbar: true },
  admintools: { w: 560, h: 420, title: '管理工具' },
  compmgmt: { w: 640, h: 480, title: '计算机管理' },
  services: { w: 620, h: 440, title: '服务' },
  eventvwr: { w: 620, h: 440, title: '事件查看器' },
  perfmon: { w: 620, h: 420, title: '性能' },
  secpol: { w: 600, h: 420, title: '本地安全设置' },
  odbc: { w: 520, h: 400, resizable: false, title: 'ODBC 数据源管理器' },
  mydocsprops: { w: 400, h: 340, resizable: false, title: '我的文档 属性' },
  recycleprops: { w: 400, h: 360, resizable: false, title: '回收站 属性' },
  mapdrive: { w: 400, h: 300, resizable: false, title: '映射网络驱动器', noTaskbar: true },
  unmapdrive: { w: 360, h: 260, resizable: false, title: '断开网络驱动器', noTaskbar: true },
  mouseprops: { w: 420, h: 470, resizable: false, title: '鼠标 属性' },
  taskbarprops: { w: 404, h: 530, resizable: false, title: '任务栏和「开始」菜单属性' },
  customnotif: { w: 386, h: 438, resizable: false, title: '自定义通知' },
  deskitems: { w: 352, h: 462, resizable: false, title: '桌面项目' },
  deskcleanup: { w: 494, h: 372, resizable: false, title: '桌面清理向导' },
  customstart: { w: 398, h: 478, resizable: false, title: '自定义「开始」菜单' },
  customclassic: { w: 348, h: 428, resizable: false, title: '自定义经典「开始」菜单' },
  newtoolbar: { w: 344, h: 396, resizable: false, title: '新建工具栏' },
  osk: { w: 736, h: 248, title: '屏幕键盘' },
  openwith: { w: 390, h: 430, resizable: false, title: '打开方式', noTaskbar: true },
  apicfg: { w: 470, h: 470, resizable: false, title: 'API 数据源设置' },
  magnifier: { w: 420, h: 340, resizable: false, title: '放大镜设置' },
  narrator: { w: 400, h: 280, title: '讲述人' },
  utilman: { w: 440, h: 400, resizable: false, title: '辅助工具管理器' },
  soundprops: { w: 430, h: 480, resizable: false, title: '声音和音频设备 属性' },
  powerprops: { w: 420, h: 460, resizable: false, title: '电源选项 属性' },
  keyboardprops: { w: 430, h: 430, resizable: false, title: '键盘 属性' },
  intlprops: { w: 430, h: 470, resizable: false, title: '区域和语言选项' },
  accessprops: { w: 430, h: 480, resizable: false, title: '辅助功能选项' },
  fonts: { w: 560, h: 420, title: 'Fonts' },
  fontview: { w: 480, h: 500, resizable: false, title: '字体预览', noTaskbar: true },
  taskssched: { w: 560, h: 420, title: 'Tasks' },
  driveprops: { w: 404, h: 528, resizable: false, title: '属性' },
  format: { w: 292, h: 342, resizable: false, title: '格式化', noTaskbar: true },
  chkdsk: { w: 330, h: 250, resizable: false, title: '检查磁盘', noTaskbar: true },
  folderoptions: { w: 400, h: 472, resizable: false, title: '文件夹选项' },
  perfopts: { w: 412, h: 428, resizable: false, title: '性能选项' },
}

/* 仅管理员可用应用（XP 真实：计算机管理/服务/事件查看器/性能/本地安全策略/ODBC/磁盘碎片整理） */
const ADMIN_ONLY_APPS = new Set(['compmgmt', 'services', 'eventvwr', 'perfmon', 'secpol', 'odbc', 'defrag'])

let cascading = 0

export const useXP = create<XPState>((set, get) => ({
  phase: 'boot',
  windows: [],
  zTop: 10,
  nextId: 1,
  startOpen: false,
  ctxMenu: null,
  /* 帐户默认来自种子（hydrate 时被服务端快照替换；密码永不进客户端） */
  accounts: DEFAULT_ACCOUNTS.map((a) => ({ name: a.name, type: a.type, avatar: a.avatar, hint: a.hint, hasPassword: a.password !== '' })),
  sessionUser: 'Administrator',
  switchFrom: null,
  /* 持久化设置默认值来自 ./model（与服务端 mock 共享单一事实来源） */
  ...structuredClone(DEFAULT_SETTINGS),
  fsTree: structuredClone(FS),
  recycleBin: [],
  clipboard: null,
  printers: [],
  printJobs: [],
  schedTasks: [],
  desktopPos: {},
  ieHistory: structuredClone(DEFAULT_IE.history),
  ieFavorites: structuredClone(DEFAULT_IE.favorites),
  ieHome: DEFAULT_IE.home,
  oeMails: [],
  audioBlobs: {},
  toast: null,
  volumeFlyout: false,
  altTab: { open: false, index: 0 },
  security: false,
  /* 通知区域会话态：开机全展开、图标初始均活动（XP 语义：用后闲置一段时间才折叠） */
  trayExpanded: false,
  trayActivity: {},
  setTrayExpanded: (v) => set({ trayExpanded: v }),
  touchTray: (key) => set((st) => ({ trayActivity: { ...st.trayActivity, [key]: Date.now() } })),
  recentDocs: [],
  runHistory: [...DEFAULT_RUN_HISTORY],
  netDrives: [],

  pushRecentDoc: (p) => set((st) => ({
    recentDocs: [p, ...st.recentDocs.filter((x) => x.join('/') !== p.join('/'))].slice(0, 15),
  })),
  clearRecentDocs: () => set({ recentDocs: [] }),

  pushRunHistory: (cmd) => set((st) => {
    const c = cmd.trim()
    if (!c) return {}
    return { runHistory: [c, ...st.runHistory.filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 26) }
  }),
  clearRunHistory: () => set({ runHistory: [] }),

  setExtAssoc: (ext, appId) =>
    set((s) => (s.extAssoc[ext.toLowerCase()] === appId ? {} : { extAssoc: { ...s.extAssoc, [ext.toLowerCase()]: appId } })),
  clearExtAssoc: (ext) =>
    set((s) => {
      const next = { ...s.extAssoc }
      delete next[ext.toLowerCase()]
      return { extAssoc: next }
    }),

  setAccounts: (list) => set({ accounts: list }),
  setSessionUser: (name) => set({ sessionUser: name }),
  setSwitchFrom: (name) => set({ switchFrom: name }),

  /* ── 帐户主目录镜像（「我的文档」完全受接口帐户控制）──
   * 服务端在 /accounts POST/PATCH/DELETE 已同步维护主目录；客户端在
   * ControlPanel 帐户管理后调用这三个动作镜像本地树，保持双端一致 */
  seedAccountHome: (name) => {
    set((st) => ({
      fsTree: mutateAt(st.fsTree, DNS_PATH, (children) =>
        children.some((c) => c.name === name) ? children : [...children, freshUserHome(name)],
      ),
    }))
  },
  removeAccountHome: (name) => {
    set((st) => ({ fsTree: mutateAt(st.fsTree, DNS_PATH, (children) => children.filter((c) => c.name !== name)) }))
  },
  renameAccountHome: (oldName, newName) => {
    set((st) => ({
      fsTree: mutateAt(st.fsTree, DNS_PATH, (children) =>
        children.map((c) => (c.name === oldName ? { ...c, name: newName, modified: new Date().toISOString() } : c)),
      ),
    }))
  },
  /* hydrate 后对帐：服务端快照缺主目录时客户端补齐（脱机/旧后端兑底） */
  reconcileAccountHomes: () => {
    set((st) => {
      const next = structuredClone(st.fsTree)
      ensureUserHomes(next, st.accounts.map((a) => a.name))
      return { fsTree: next }
    })
  },

  setPhase: (p) => {
    const prev = get().phase
    if (p !== prev) {
      /* 会话事件流水（登录/解锁/锁定/注销/关机/重启）同步到 API，携带当前会话用户 */
      if (p === 'desktop') fsSync.session(prev === 'locked' ? 'unlock' : 'login', get().sessionUser)
      else if (p === 'locked') fsSync.session('lock', get().sessionUser)
      else if (p === 'logging-off') fsSync.session('logoff', get().sessionUser)
      else if (p === 'shutting-down') fsSync.session('shutdown', get().sessionUser)
      else if (p === 'restarting') fsSync.session('restart', get().sessionUser)
    }
    set({ phase: p, startOpen: false, ctxMenu: null })
  },

  openApp: (app, props = {}, titleOverride) => {
    const st = get()
    /* ── 帐户权限门禁（XP 真实：受限/来宾帐户打开管理类工具被拒） ── */
    if (ADMIN_ONLY_APPS.has(app)) {
      const acc = st.accounts.find((a) => a.name === st.sessionUser)
      if (acc && acc.type !== 'admin') {
        set({
          windows: [...st.windows, {
            id: st.nextId,
            app: 'dialog',
            title: 'Windows',
            x: Math.max(4, Math.round((st.windows.length > 0 ? 360 : (typeof window !== 'undefined' ? window.innerWidth : 1280) - 420) / 2)),
            y: 120,
            w: 420,
            h: 200,
            z: st.zTop + 1,
            minimized: false,
            maximized: false,
            prevRect: null,
            resizable: false,
            noTaskbar: false,
            props: {
              kind: 'error',
              title: st.sessionUser,
              text: '您没有执行此操作的适当权限。\n\n请与系统管理员联系，或使用拥有管理员权限的帐户重新登录后再试。',
            },
          } as WinState],
          nextId: st.nextId + 1,
          zTop: st.zTop + 1,
          startOpen: false,
        })
        return -1
      }
    }
    const def = APP_DEFAULTS[app] ?? { w: 500, h: 400 }
    const id = st.nextId
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const w = props.w ? (props.w as number) : def.w
    const h = props.h ? (props.h as number) : def.h
    /* 级联偏移 */
    const cascade = cascading
    cascading = (cascading + 1) % 8
    const cx = Math.max(4, Math.min(vw - w - 8, Math.round((vw - w) / 2) + cascade * 26 - 90))
    const cy = Math.max(4, Math.min(vh - 30 - h - 8, Math.round((vh - 30 - h) / 2) + cascade * 22 - 70))
    const win: WinState = {
      id,
      app,
      title: titleOverride
        ?? (typeof props.title === 'string' && props.title ? props.title : undefined)
        ?? def.title
        ?? '窗口',
      x: cx,
      y: cy,
      w: w || 400,
      h: h || 300,
      z: st.zTop + 1,
      minimized: false,
      maximized: false,
      prevRect: null,
      resizable: def.resizable !== false,
      noTaskbar: def.noTaskbar,
      props,
    }
    /* 记录常用程序使用次数（供开始菜单最常用列表） */
    const use = { ...st.programUse }
    use[app] = (use[app] ?? 0) + 1
    set({ windows: [...st.windows, win], nextId: id + 1, zTop: st.zTop + 1, startOpen: false, programUse: use })
    return id
  },

  closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) =>
    set((s) => {
      const win = s.windows.find((w) => w.id === id)
      if (!win) return s
      if (win.z === s.zTop && !win.minimized) return s
      return { windows: s.windows.map((w) => (w.id === id ? { ...w, z: s.zTop + 1, minimized: false } : w)), zTop: s.zTop + 1 }
    }),

  minimizeWindow: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) })),

  restoreWindow: (id) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, z: s.zTop + 1 } : w)), zTop: s.zTop + 1 })),

  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          const r = w.prevRect ?? { x: 40, y: 40, w: 500, h: 400 }
          return { ...w, maximized: false, x: r.x, y: r.y, w: r.w, h: r.h }
        }
        return { ...w, maximized: true, prevRect: { x: w.x, y: w.y, w: w.w, h: w.h } }
      }),
    })),

  setRect: (id, rect) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)) })),

  setWindowTitle: (id, title) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)) })),
  setWinSize: (id, w, h) => set((s) => ({ windows: s.windows.map((wd) => (wd.id === id && !wd.maximized ? { ...wd, w, h } : wd)) })),

  minimizeAll: () => set((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })), startOpen: false })),

  setStartOpen: (open) => set({ startOpen: open }),

  toggleStart: () => set((s) => ({ startOpen: !s.startOpen, ctxMenu: null })),

  addNetDrive: (letter, path) => set((st) => ({ netDrives: [...st.netDrives, { letter, path }] })),
  removeNetDrive: (letter) => set((st) => ({ netDrives: st.netDrives.filter((d) => d.letter !== letter) })),

  openCtx: (x, y, items, opts) => set({ ctxMenu: { x, y, items }, ...(opts?.keepStart ? {} : { startOpen: false }) }),

  closeCtx: () => set({ ctxMenu: null }),

  setWallpaper: (w) => set({ wallpaper: w }),
  setWallpaperPos: (p) => set({ wallpaperPos: p }),
  setBgColor: (c) => set({ bgColor: c }),
  setCustomWallpaper: (src, name = '') => set({ customWallpaper: src, customWallpaperName: name }),
  setDeskIcon: (key, show) => set((st) => ({ deskIcons: { ...st.deskIcons, [key]: show } })),
  setDeskIconOverride: (key, asset) => set((st) => {
    const next = { ...st.deskIconOverrides }
    if (asset) next[key] = asset
    else delete next[key]
    return { deskIconOverrides: next }
  }),

  setIconSize: (s) => set({ iconSize: s }),

  /* ── 打印机 ── */
  addPrinter: (name, model = '') => set((s) => ({
    printers: [...s.printers.map((p) => ({ ...p, def: false })), { name, model, def: true }],
  })),
  removePrinter: (name) => set((s) => {
    const rest = s.printers.filter((p) => p.name !== name)
    return { printers: rest.length > 0 && !rest.some((p) => p.def) ? rest.map((p, i) => ({ ...p, def: i === 0 })) : rest }
  }),
  addPrintJob: (printer, doc, pages) => {
    const id = get().nextId * 1000 + Math.floor(Math.random() * 900) + 7
    const kb = Math.round(pages * (24 + Math.random() * 30))
    set((s) => ({
      printJobs: [
        ...s.printJobs,
        { id, printer, doc, pages, size: `${(kb / 1024).toFixed(1)} MB / ${kb} KB`, owner: get().sessionUser, submitted: Date.now(), status: 'printing' as const },
      ],
    }))
    /* 6.5 秒后打印完成自动出队（暂停的作业保留，恢复时重新计时） */
    const finish = () => {
      const job = get().printJobs.find((j) => j.id === id)
      if (job && job.status === 'printing') {
        set((s) => ({ printJobs: s.printJobs.filter((j) => j.id !== id) }))
      }
    }
    if (typeof window !== 'undefined') printTimers.set(id, window.setTimeout(finish, 6500))
  },
  pausePrintJob: (id) => {
    const job = get().printJobs.find((j) => j.id === id)
    if (!job) return
    if (job.status === 'printing') {
      /* 暂停：状态翻转，计时器触发时会被状态检查跳过 */
      set((s) => ({ printJobs: s.printJobs.map((j) => (j.id === id ? { ...j, status: 'paused' } : j)) }))
    } else {
      /* 恢复：翻转状态 + 重新计时打印完成 */
      set((s) => ({ printJobs: s.printJobs.map((j) => (j.id === id ? { ...j, status: 'printing' } : j)) }))
      if (typeof window !== 'undefined') {
        printTimers.set(
          id,
          window.setTimeout(() => {
            const j2 = get().printJobs.find((j) => j.id === id)
            if (j2 && j2.status === 'printing') set((s) => ({ printJobs: s.printJobs.filter((j) => j.id !== id) }))
          }, 6500),
        )
      }
    }
  },
  cancelPrintJob: (id) => {
    const t = printTimers.get(id)
    if (t !== undefined && typeof window !== 'undefined') window.clearTimeout(t)
    printTimers.delete(id)
    set((s) => ({ printJobs: s.printJobs.filter((j) => j.id !== id) }))
  },
  cancelAllPrintJobs: (printer) => {
    get().printJobs.filter((j) => j.printer === printer).forEach((j) => {
      const t = printTimers.get(j.id)
      if (t !== undefined && typeof window !== 'undefined') window.clearTimeout(t)
      printTimers.delete(j.id)
    })
    set((s) => ({ printJobs: s.printJobs.filter((j) => j.printer !== printer) }))
  },

  /* ── 任务计划 ── */
  addSchedTask: (t) => set((s) => ({ schedTasks: [...s.schedTasks.filter((x) => x.name !== t.name), t] })),
  removeSchedTask: (name) => set((s) => ({ schedTasks: s.schedTasks.filter((x) => x.name !== name) })),

  /* ── 文件系统：新建 ── */
  fsCreateFolder: (parentPath, name = '新建文件夹') => {
    const st = get()
    const node: FSNode = { name, kind: 'folder', children: [], modified: new Date().toISOString() }
    const r = insertNode(st.fsTree, parentPath, node)
    set({ fsTree: r.tree })
    fsSync.create(parentPath, { ...node, name: r.name })
    return r.name
  },

  fsCreateFile: (parentPath, name, opts = {}) => {
    const st = get()
    const node: FSNode = {
      name,
      kind: 'file',
      icon: opts.icon ?? 'text',
      content: opts.content ?? '',
      src: opts.src,
      appId: opts.appId,
      type: opts.type ?? (opts.icon === 'image' ? '位图图像' : '文本文档'),
      size: opts.size ?? '1 KB',
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
      shortcutTo: opts.shortcutTo,
      children: opts.children,
    }
    const r = insertNode(st.fsTree, parentPath, node)
    set({ fsTree: r.tree })
    fsSync.create(parentPath, { ...node, name: r.name })
    return r.name
  },

  /* 创建快捷方式（XP：在 parentPath 下生成「xxx - 快捷方式」，双击跳转 targetPath） */
  fsCreateShortcut: (parentPath, targetPath, targetName) => {
    const st = get()
    const target = resolvePath(targetPath, st.fsTree)
    const base = targetName ?? target?.name ?? targetPath[targetPath.length - 1] ?? '目标'
    const node: FSNode = {
      name: `${base} - 快捷方式`,
      kind: 'file',
      icon: 'shortcut',
      shortcutTo: [...targetPath],
      type: '快捷方式',
      size: '1 KB',
      appId: target?.appId,
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
    }
    const r = insertNode(st.fsTree, parentPath, node)
    set({ fsTree: r.tree })
    fsSync.create(parentPath, { ...node, name: r.name })
    return r.name
  },

  fsWriteFile: (parentPath, name, content, opts) => {
    const st = get()
    const parent = resolvePath(parentPath, st.fsTree)
    const existing = (parent?.children ?? []).find((c) => c.name === name)
    const icon = opts?.icon ?? 'text'
    const type = opts?.type ?? (icon === 'text' ? '文本文档' : '文件')
    const size = opts?.src ? `${Math.max(1, Math.round(opts.src.length / 1365))} KB` : `${Math.max(1, Math.ceil(content.length / 1024))} KB`
    const now = new Date().toISOString()
    if (existing) {
      const tree = mutateAt(st.fsTree, parentPath, (children) =>
        children.map((c) => (c.name === name ? { ...c, content: opts?.src ? '' : content, src: opts?.src ?? c.src, size, modified: now } : c)),
      )
      set({ fsTree: tree })
      if (opts?.src) fsSync.update([...parentPath, name], { content: '', src: opts.src, size, modified: now })
      else fsSync.write(parentPath, name, content)
      return name
    }
    const node: FSNode = { name, kind: 'file', icon, content: opts?.src ? '' : content, src: opts?.src, size, type, modified: now, created: now, appId: opts?.appId }
    const r = insertNode(st.fsTree, parentPath, node)
    set({ fsTree: r.tree })
    fsSync.create(parentPath, { ...node, name: r.name })
    return r.name
  },

  /* ── 删除 → 回收站 ── */
  fsDelete: (paths) => {
    let tree = get().fsTree
    const items: RecycleItem[] = []
    for (const p of paths) {
      if (p.length === 0) continue /* 不允许删除驱动器根 */
      const { tree: t, node } = detachNode(tree, p)
      tree = t
      if (node) {
        items.push({
          key: `${pathKey(p)}#${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          name: node.name,
          origKey: pathKey(p.slice(0, -1)),
          node,
          deletedAt: Date.now(),
        })
      }
    }
    /* 配额裁剪（XP 磁盘配额语义）：回收站上限 20 条，超出挤掉最旧条目（真实 XP 是按容量覆盖最旧） */
    const RECYCLE_MAX = 20
    set({ fsTree: tree, recycleBin: [...get().recycleBin, ...items].slice(-RECYCLE_MAX), clipboard: null })
    fsSync.del(paths, { items })
    return items.length
  },

  fsDeletePermanent: (paths) => {
    let tree = get().fsTree
    for (const p of paths) {
      if (p.length === 0) continue
      const { tree: t } = detachNode(tree, p)
      tree = t
    }
    set({ fsTree: tree, clipboard: null })
    fsSync.del(paths, { permanent: true })
    return paths.length
  },

  fsRestore: (key) => {
    const st = get()
    const restoreOne = (tree: FSNode, it: RecycleItem): FSNode => {
      const parentPath = it.origKey ? it.origKey.split('/') : []
      const parent = parentPath.length ? resolvePath(parentPath, tree) : tree
      const target = parent && parent.kind !== 'file' ? parentPath : userDesktopPath(get().sessionUser)
      const r = insertNode(tree, target, it.node)
      return r.tree
    }
    let tree = st.fsTree
    const items = key ? st.recycleBin.filter((i) => i.key === key) : st.recycleBin
    for (const it of items) tree = restoreOne(tree, it)
    set({ fsTree: tree, recycleBin: st.recycleBin.filter((i) => (key ? i.key !== key : false)) })
    fsSync.restore(key)
  },

  fsRemoveRecycle: (key) => {
    set((s) => ({ recycleBin: s.recycleBin.filter((i) => i.key !== key) }))
    fsSync.recycleRemove(key)
  },

  fsEmptyRecycle: () => {
    set({ recycleBin: [] })
    fsSync.recycleRemove()
  },

  fsRename: (path, newName) => {
    const nm = newName.trim()
    if (!nm) return null
    const st = get()
    const parentPath = path.slice(0, -1)
    const name = path[path.length - 1]
    const parent = resolvePath(parentPath, st.fsTree)
    if (!parent?.children) return null
    const clash = parent.children.find((c) => c.name === nm && c.name !== name)
    if (clash) return null
    const tree = mutateAt(st.fsTree, parentPath, (children) =>
      children.map((c) => {
        if (c.name !== name) return c
        const next: FSNode = { ...c, name: nm, modified: new Date().toISOString() }
        /* 扩展名动态关联（XP 行为）：改名后按新扩展名重算图标/类型，双击按新关联打开 */
        if (c.kind === 'file' && !c.appId) {
          const a = assocOf(nm)
          if (a) {
            next.icon = a.icon
            next.type = a.type
          }
        }
        return next
      }),
    )
    set({ fsTree: tree })
    fsSync.rename(path, nm)
    return nm
  },

  /* 节点属性补丁（格式化 A: 后清除 error 等） */
  fsUpdateNode: (path, patch) => {
    const st = get()
    const parentPath = path.slice(0, -1)
    const name = path[path.length - 1]
    if (parentPath.length === 0 && name === st.fsTree.name) {
      set({ fsTree: { ...st.fsTree, ...patch } })
    } else {
      const parent = resolvePath(parentPath, st.fsTree)
      if (!parent?.children) return
      const tree = mutateAt(st.fsTree, parentPath, (children) =>
        children.map((c) => (c.name === name ? { ...c, ...patch } : c)),
      )
      set({ fsTree: tree })
    }
    /* undefined 值转 null：清除 error 等字段时 JSON 序列化不丢键（服务端以 null 覆盖） */
    fsSync.update(
      path,
      Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? null : v])) as Partial<FSNode>,
    )
  },

  fsMove: (paths, destPath) => {
    let tree = get().fsTree
    let moved = 0
    const destKey = pathKey(destPath)
    for (const p of paths) {
      if (p.length === 0) continue
      const srcKey = pathKey(p)
      if (destKey === srcKey) continue /* 移到自身 */
      if (destKey === pathKey(p.slice(0, -1))) continue /* 目标就是原目录 */
      if (destKey.startsWith(srcKey + '/')) continue /* 移到自己的子目录 */
      const { tree: t, node } = detachNode(tree, p)
      if (!node) continue
      tree = insertNode(t, destPath, node).tree
      moved++
    }
    if (moved) {
      set({ fsTree: tree, clipboard: null })
      fsSync.move(paths, destPath)
    }
  },

  fsDuplicate: (path) => {
    const st = get()
    const node = resolvePath(path, st.fsTree)
    if (!node) return null
    const r = insertNode(st.fsTree, path.slice(0, -1), node)
    set({ fsTree: r.tree })
    fsSync.copy([path], path.slice(0, -1))
    return r.name
  },

  fsPaste: (destPath) => {
    const st = get()
    const clip = st.clipboard
    if (!clip) return
    if (clip.op === 'cut') {
      get().fsMove(clip.paths, destPath)
      return
    }
    let tree = st.fsTree
    for (const p of clip.paths) {
      const node = resolvePath(p, tree)
      if (!node) continue
      tree = insertNode(tree, destPath, node).tree
    }
    set({ fsTree: tree })
    fsSync.copy(clip.paths, destPath)
  },

  setClipboard: (op, paths) => set({ clipboard: paths.length ? { op, paths } : null }),

  saveAudioBlob: (path, url) => set((s) => ({ audioBlobs: { ...s.audioBlobs, [path]: url } })),

  /* ── IE 历史/收藏 ── */
  addIEHistory: (url, title) =>
    set((s) => {
      const rest = s.ieHistory.filter((h) => h.url !== url)
      return { ieHistory: [{ url, title: title ?? url, ts: Date.now() }, ...rest].slice(0, 60) }
    }),

  clearIEHistory: () => set({ ieHistory: [] }),

  addIEFavorite: (url, title) =>
    set((s) => (s.ieFavorites.some((f) => f.url === url) ? s : { ieFavorites: [...s.ieFavorites, { url, title: title ?? url }] })),

  removeIEFavorite: (url) => set((s) => ({ ieFavorites: s.ieFavorites.filter((f) => f.url !== url) })),

  setIEHome: (url) => set({ ieHome: url }),

  /* ── 桌面/时钟 ── */
  setDesktopPos: (key, x, y) => set((s) => ({ desktopPos: { ...s.desktopPos, [key]: { x, y } } })),

  setClockOffset: (min) => set({ clockOffsetMin: min }),

  setTZ: (offsetH, name) => set({ tzOffsetH: offsetH, tzName: name, clockOffsetMin: (get().clockOffsetMin + (offsetH - get().tzOffsetH) * 60) }),

  showToast: (t) => set({ toast: t }),

  setSoundsEnabled: (v) => set({ soundsEnabled: v }),

  closeAll: () => set({ windows: [] }),

  setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(100, v)), volumeMuted: false }),

  setVolumeMuted: (m) => set({ volumeMuted: m }),

  setVolumeFlyout: (open) => set({ volumeFlyout: open }),

  setScreensaver: (s) => set({ screensaver: s }),

  setSaverWait: (m) => set({ saverWait: m }),

  setTheme: (t) => set({ theme: t }),
  /* XP 语义：切色彩方案 → 桌面背景色同步为方案的 Desktop 色（壁纸不受影响） */
  setClassicScheme: (k) => set({
    classicScheme: k,
    bgColor: CLASSIC_SCHEMES[k].desktop,
    /* XP 真实行为：高对比度方案自动去除壁纸（纯色桌面，白字才可读） */
    ...(k.startsWith('hc') ? { wallpaper: 'none-blue' as const } : {}),
  }),
  setStickyKeys: (v) => set({ stickyKeys: v }),
  setFolderOpt: (patch) => set({ ...patch }),

  setVisualFX: (patch) =>
    set((s) => ({ visualFX: { ...s.visualFX, ...patch } })),

  setAltTab: (at) => set({ altTab: at }),

  setSecurity: (v) => set({ security: v }),

  /* ── 任务栏 ── */
  setTaskbarLocked: (v) => set({ taskbarLocked: v }),
  setTaskbarPos: (p) => set({ taskbarPos: p }),
  setTaskbarH: (h) => set({ taskbarH: Math.max(26, Math.min(120, h)) }),
  setQuickLaunch: (v) => set({ showQuickLaunch: v }),
  setTaskbarAutoHide: (v) => set({ taskbarAutoHide: v }),
  setTaskbarOnTop: (v) => set({ taskbarOnTop: v }),
  setTaskbarGroup: (v) => set({ taskbarGroup: v }),
  setShowClock: (v) => set({ showClock: v }),
  setHideInactiveIcons: (v) => set({ hideInactiveIcons: v }),
  setNotifPref: (key, mode) => set((s) => ({ notifPrefs: { ...s.notifPrefs, [key]: mode } })),
  setTbDesktop: (v) => set({ tbDesktop: v }),
  setTbLinks: (v) => set({ tbLinks: v }),
  addTbCustom: (name, path) => set((s) => ({ tbCustom: [...s.tbCustom.filter((t) => t.name !== name), { name, path }] })),
  removeTbCustom: (name) => set((s) => ({ tbCustom: s.tbCustom.filter((t) => t.name !== name) })),
  setTbTitle: (key, v) => set((s) => ({ tbTitles: { ...s.tbTitles, [key]: v } })),
  setStartClassic: (v) => set({ startClassic: v }),
  setClassicOpt: (k, v) => set((s) => ({ classicOpts: { ...s.classicOpts, [k]: v } })),
  setStartOpts: (o) => set((s) => ({ startOpts: { ...s.startOpts, ...o } })),
  restoreAllWindows: () =>
    set((s) => {
      if (s.windows.length === 0) return { startOpen: false }
      const wins = s.windows.map((w) => ({ ...w, minimized: false }))
      /* XP：还原后此前的最顶层窗口恢复激活态（提升到 zTop 之上，任务按钮重新按下） */
      const top = wins.reduce((m, w) => (w.z > m.z ? w : m), wins[0])
      if (top && top.z !== s.zTop) {
        top.z = s.zTop + 1
        return { windows: wins, zTop: s.zTop + 1, startOpen: false }
      }
      return { windows: wins, startOpen: false }
    }),
  setAutoArrange: (v) => set({ autoArrange: v, ...(v ? { desktopPos: {} } : {}) }),
  setAlignGrid: (v) => set({ alignGrid: v }),
  /* 桌面排列图标：切换排序模式并一次性重排（清手动位置 → 按新模式流入默认网格） */
  setDesktopSort: (v) => set({ desktopSort: v, ...(v !== 'none' ? { desktopPos: {} } : {}) }),
  /* 纸牌牌背（选定纸牌背面对话框；Solitaire/Hearts 共用） */
  setSolitaireBack: (v) => set({ solitaireBack: v }),
  setSolitaireOpts: (v) => set({ solitaireOpts: v }),
  setRegTree: (t) => set({ regTree: t }),
  setInputLang: (v) => set({ inputLang: v }),
  setLangBarOn: (v) => set({ langBarOn: v }),
  setOeMails: (m) => set({ oeMails: m }),

  /* ── 开始菜单固定项 ── */
  pinStartItem: (item) =>
    set((s) => (s.startPinned.some((p) => p.key === item.key) ? s : { startPinned: [...s.startPinned, item].slice(0, 6) })),
  unpinStartItem: (key) => set((s) => ({ startPinned: s.startPinned.filter((p) => p.key !== key) })),
  reorderStartPinned: (from, to) =>
    set((s) => {
      const arr = [...s.startPinned]
      const [it] = arr.splice(from, 1)
      if (!it) return s
      arr.splice(to, 0, it)
      return { startPinned: arr }
    }),
  /* 「从列表中删除」：XP 真实语义——移出最常用列表（计数置墓碑 -1；再次使用会重新计入并回来） */
  removeFromMFU: (key) =>
    set((s) => ({ programUse: { ...s.programUse, [key]: -1 } })),
}))

/* 调试/自动化测试钩子（e2e 用；不参与渲染） */
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__xp = useXP
}

/* 当前聚焦窗口 id */
export function focusedWindowId(s: XPState): number | null {
  let max = -1
  let id: number | null = null
  for (const w of s.windows) {
    if (w.minimized) continue
    if (w.z > max) {
      max = w.z
      id = w.id
    }
  }
  return id
}

/* e2e/调试探针：浏览器控制台可直接读改 store（构建产物内同样可用，不影响运行） */
if (typeof window !== 'undefined') {
  ;(window as unknown as { __XP_STORE__: typeof useXP }).__XP_STORE__ = useXP
}
