/* 虚拟文件系统（XP 中文版目录结构）
 * 本模块为纯逻辑（无客户端 API），客户端组件与服务端 API 路由共用 */

export interface FSNode {
  name: string
  kind: 'folder' | 'file' | 'drive'
  appId?: string /* 双击时启动的应用 */
  icon?: 'folder' | 'text' | 'image' | 'exe' | 'hd' | 'cd' | 'floppy' | 'pictures' | 'music' | 'video' | 'shared' | 'audio' | 'bmp' | 'shortcut' | 'font' | 'zip' | 'doc'
  children?: FSNode[]
  content?: string
  size?: string
  type?: string
  error?: string /* 打开失败的错误信息 */
  src?: string /* 图片/媒体的展示地址 */
  created?: string /* 创建日期（属性对话框） */
  modified?: string /* 修改日期 */
  readonly?: boolean
  hidden?: boolean
  system?: boolean /* 受保护的操作系统文件（ntldr 等，默认不显示） */
  shortcutTo?: string[] /* 快捷方式目标路径（双击跳转） */
}

const img = (name: string, src: string, size: string): FSNode => ({
  name,
  kind: 'file',
  icon: 'image',
  src,
  size,
  type: 'JPEG 图像',
})

const txt = (name: string, content: string, size: string): FSNode => ({
  name,
  kind: 'file',
  icon: 'text',
  content,
  size,
  type: '文本文档',
})

/* ── 扩展名动态关联：重命名后按新扩展名重算图标/类型/打开方式（XP 行为） ── */
const EXT_TABLE: Record<string, { icon: NonNullable<FSNode['icon']>; type: string }> = {
  txt: { icon: 'text', type: '文本文档' },
  log: { icon: 'text', type: '文本文档' },
  ini: { icon: 'text', type: '配置设置' },
  inf: { icon: 'text', type: '安装信息' },
  jpg: { icon: 'image', type: 'JPEG 图像' },
  jpeg: { icon: 'image', type: 'JPEG 图像' },
  png: { icon: 'image', type: 'PNG 图像' },
  gif: { icon: 'image', type: 'GIF 图像' },
  bmp: { icon: 'bmp', type: 'BMP 图像' },
  mp3: { icon: 'audio', type: 'MP3 格式声音' },
  wav: { icon: 'audio', type: 'Wave 文件' },
  wma: { icon: 'audio', type: 'Windows 音频文件' },
  mid: { icon: 'audio', type: 'MIDI 序列' },
  cda: { icon: 'audio', type: 'CD 音频曲目' },
  wmv: { icon: 'audio', type: 'Windows Media 音频/视频文件' },
  avi: { icon: 'audio', type: '视频剪辑' },
  mpg: { icon: 'audio', type: '视频剪辑' },
  exe: { icon: 'exe', type: '应用程序' },
  bat: { icon: 'exe', type: 'Windows 批处理文件' },
  cmd: { icon: 'exe', type: 'Windows 命令脚本' },
  ttf: { icon: 'font', type: 'TrueType 字体文件' },
  ttc: { icon: 'font', type: 'TrueType 字体集' },
  fon: { icon: 'font', type: '字体文件' },
  job: { icon: 'shortcut', type: '任务' },
  zip: { icon: 'zip', type: '压缩(zipped)文件夹' },
}

/* 隐藏已知类型扩展名的显示名（XP「文件夹选项 → 查看 → 隐藏已知文件类型的扩展名」）
 * 仅对 EXT_TABLE 已注册类型生效；无扩展名/未知类型原样返回 */
export function stripExt(name: string): string {
  const ext = extOf(name)
  if (!ext || !EXT_TABLE[ext]) return name
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : ''
}

export function assocOf(name: string): { icon: NonNullable<FSNode['icon']>; type: string } | null {
  return EXT_TABLE[extOf(name)] ?? null
}

/* 节点的有效类型描述（XP：详细信息「类型」列与 排列图标→类型 排序共用同一口径）
 * - 显式 type 优先（含重命名/新建时按扩展名写入的动态关联）
 * - 驱动器无 type 字段 → 按 icon 推导 XP 真实描述（3.5 英寸软盘/本地磁盘/CD 驱动器）
 * - 文件夹 → 「文件夹」；无关联扩展名的文件 → 「文件」 */
export function typeOf(n: FSNode): string {
  if (n.type) return n.type
  if (n.kind === 'drive') {
    if (n.icon === 'floppy') return '3.5 英寸软盘'
    if (n.icon === 'cd') return 'CD 驱动器'
    return '本地磁盘'
  }
  if (n.kind === 'folder') return '文件夹'
  return assocOf(n.name)?.type ?? '文件'
}

export const FS: FSNode = {
  name: '我的电脑',
  kind: 'folder',
  children: [
    {
      name: '3.5 软盘 (A:)',
      kind: 'drive',
      icon: 'floppy',
      error: '无法访问 A:。\n\n设备未就绪。',
    },
    {
      name: '本地磁盘 (C:)',
      kind: 'drive',
      icon: 'hd',
      children: [
        {
          name: 'Documents and Settings',
          kind: 'folder',
          children: [
            {
              name: 'Administrator',
              kind: 'folder',
              children: [
                {
                  name: 'My Documents',
                  kind: 'folder',
                  children: [
                    txt(
                      '欢迎.txt',
                      '欢迎使用 Windows XP Web 复刻版！\r\n\r\n这不是真正的 Windows XP，而是运行在浏览器里的致敬作品。\r\n\r\n你可以：\r\n  1. 双击「我的电脑」浏览虚拟文件系统\r\n  2. 打开扫雷、纸牌、画图、计算器玩个痛快\r\n  3. 用 Internet Explorer 冲浪（内部网页）\r\n  4. 按 Ctrl+Shift+Esc 打开任务管理器\r\n  5. 在「开始 → 运行」里输入 notepad、calc、winmine\r\n     等经典命令\r\n\r\n向 2001 年那个最好的操作系统致敬。\r\n',
                      '1 KB',
                    ),
                    txt('桌面备忘.txt', 'To-do：\r\n  · 听一首 Windows 启动音\r\n  · 玩一局扫雷\r\n  · 永远不要点「关闭计算机」…\r\n', '1 KB'),
                    { name: '图片收藏', kind: 'folder', icon: 'pictures', children: [img('Bliss.jpg', '/wallpapers/bliss.jpg', '207 KB'), img('Azul.jpg', '/wallpapers/azul.jpg', '68 KB'), img('Autumn.jpg', '/wallpapers/autumn.jpg', '220 KB')] },
                    { name: 'My Music', kind: 'folder', icon: 'music', children: [{ name: '启动音.wma', kind: 'file', icon: 'audio', size: '36 KB', type: 'Windows 音频文件' }, { name: '小雨进行曲.mp3', kind: 'file', icon: 'audio', size: '3.2 MB', type: 'MP3 格式声音' }] },
                    { name: 'My Videos', kind: 'folder', icon: 'music', children: [{ name: '示例视频.wmv', kind: 'file', icon: 'audio', size: '8.5 MB', type: 'Windows Media 音频/视频文件' }] },
                    { name: '示例图片.png', kind: 'file', icon: 'image', src: '/wallpapers/autumn.jpg', size: '96 KB', type: 'PNG 图像' },
                    { name: '录音备忘.wav', kind: 'file', icon: 'audio', size: '1.1 MB', type: 'Wave 文件' },
                  ],
                },
                { name: '桌面', kind: 'folder', children: [
                  txt('网上冲浪指南.txt', '上网小贴士：\r\n\r\n  · 双击桌面上的 Internet Explorer 图标即可开始冲浪\r\n  · 地址栏可以直接输入网址（如 zh.wikipedia.org）\r\n  · 输入关键词则会在 MSN Search 上搜索\r\n  · 收藏夹按钮可以保存你喜欢的网站\r\n\r\n祝你在信息高速公路上玩得愉快！\r\n', '1 KB'),
                ] },
                { name: 'Favorites', kind: 'folder', children: [
                  { name: '链接', kind: 'folder', children: [
                    { name: '自定义链接.url', kind: 'file', icon: 'shortcut', appId: 'ie', size: '1 KB', type: 'Internet 快捷方式' },
                  ] },
                ] },
                { name: 'NTUSER.DAT', kind: 'file', icon: 'exe', size: '1,024 KB', type: '系统文件', hidden: true, system: true },
                /* XP 真实路径：快速启动 = Application Data\Microsoft\Internet Explorer\Quick Launch（隐藏目录） */
                { name: 'Application Data', kind: 'folder', hidden: true, children: [
                  { name: 'Microsoft', kind: 'folder', children: [
                    { name: 'Internet Explorer', kind: 'folder', children: [
                      { name: 'Quick Launch', kind: 'folder', children: [
                        { name: 'Internet Explorer.lnk', kind: 'file', icon: 'shortcut', appId: 'ie', size: '1 KB', type: '快捷方式' },
                        { name: '显示桌面.scf', kind: 'file', icon: 'shortcut', appId: 'showdesktop', size: '1 KB', type: 'Explorer 命令' },
                        { name: 'Windows Media Player.lnk', kind: 'file', icon: 'shortcut', appId: 'wmp', size: '1 KB', type: '快捷方式' },
                      ] },
                    ] },
                  ] },
                ] },
              ],
            },
            {
              name: 'All Users',
              kind: 'folder', children: [
                {
                  name: '「开始」菜单',
                  kind: 'folder',
                  children: [
                    { name: '程序', kind: 'folder', children: [] },
                  ],
                },
                { name: '桌面', kind: 'folder', children: [] },
                { name: '共享文档', kind: 'folder', icon: 'shared', children: [] },
              ],
            },
          ],
        },
        {
          name: 'Program Files',
          kind: 'folder',
          children: [
            {
              name: 'Internet Explorer',
              kind: 'folder',
              children: [{ name: 'IEXPLORE.EXE', kind: 'file', icon: 'exe', appId: 'ie', size: '93 KB', type: '应用程序' }],
            },
            {
              name: 'Windows Media Player',
              kind: 'folder',
              children: [{ name: 'wmplayer.exe', kind: 'file', icon: 'exe', appId: 'wmp', size: '212 KB', type: '应用程序' }],
            },
            {
              name: 'Outlook Express',
              kind: 'folder',
              children: [{ name: 'msimn.exe', kind: 'file', icon: 'exe', appId: 'outlook', size: '94 KB', type: '应用程序' }],
            },
            {
              name: 'Windows NT',
              kind: 'folder',
              children: [{ name: 'Pinball', kind: 'folder', children: [{ name: 'PINBALL.EXE', kind: 'file', icon: 'exe', appId: 'pinball', size: '282 KB', type: '应用程序' }] }],
            },
          ],
        },
        {
          name: 'WINDOWS',
          kind: 'folder',
          children: [
            { name: 'system32', kind: 'folder', children: [
              { name: 'calc.exe', kind: 'file', icon: 'exe', appId: 'calc', size: '112 KB', type: '应用程序' },
              { name: 'cmd.exe', kind: 'file', icon: 'exe', appId: 'cmd', size: '388 KB', type: '应用程序' },
              { name: 'taskmgr.exe', kind: 'file', icon: 'exe', appId: 'taskmgr', size: '134 KB', type: '应用程序' },
              { name: 'freecell.exe', kind: 'file', icon: 'exe', appId: 'freecell', size: '112 KB', type: '应用程序' },
              { name: 'mshearts.exe', kind: 'file', icon: 'exe', appId: 'hearts', size: '120 KB', type: '应用程序' },
              { name: 'sndrec32.exe', kind: 'file', icon: 'exe', appId: 'sndrec', size: '126 KB', type: '应用程序' },
              { name: 'charmap.exe', kind: 'file', icon: 'exe', appId: 'charmap', size: '146 KB', type: '应用程序' },
              { name: 'shimgvw.dll', kind: 'file', icon: 'exe', appId: 'imgviewer', size: '416 KB', type: '应用程序扩展' },
              { name: 'timedate.cpl', kind: 'file', icon: 'exe', appId: 'datetime', size: '36 KB', type: '控制面板扩展' },
              { name: 'sndvol32.exe', kind: 'file', icon: 'exe', appId: 'volume', size: '146 KB', type: '应用程序' },
              { name: 'regedit.exe', kind: 'file', icon: 'exe', appId: 'regedit', size: '146 KB', type: '应用程序' },
              txt('drivers.ini', '; 系统驱动配置 - 请勿修改\r\n[drivers]\r\nwave=mmdrv.dll\r\n', '1 KB'),
            ] },
            { name: 'notepad.exe', kind: 'file', icon: 'exe', appId: 'notepad', size: '68 KB', type: '应用程序' },
            { name: 'wordpad.exe', kind: 'file', icon: 'exe', appId: 'wordpad', size: '184 KB', type: '应用程序' },
            { name: 'explorer.exe', kind: 'file', icon: 'exe', appId: 'explorer', size: '1,032 KB', type: '应用程序' },
            { name: 'winhlp32.exe', kind: 'file', icon: 'exe', appId: 'helpcenter', size: '296 KB', type: '应用程序' },
            { name: 'Web', kind: 'folder', children: [
              { name: 'Wallpaper', kind: 'folder', icon: 'pictures', children: [
                img('Bliss.jpg', '/wallpapers/bliss.jpg', '207 KB'),
                img('Azul.jpg', '/wallpapers/azul.jpg', '68 KB'),
                img('Autumn.jpg', '/wallpapers/autumn.jpg', '220 KB'),
                img('Blue hills.jpg', '/media/pictures/blue-hills.jpg', '126 KB'),
                img('Sunset.jpg', '/media/pictures/sunset.jpg', '103 KB'),
                img('Water lilies.jpg', '/media/pictures/water-lilies.jpg', '118 KB'),
                img('Winter.jpg', '/media/pictures/winter.jpg', '113 KB'),
              ] },
            ] },
            { name: 'Fonts', kind: 'folder', appId: 'fonts', children: [
              { name: 'SIMSUN.TTC', kind: 'file', icon: 'font', size: '10,304 KB', type: 'TrueType 字体集' },
              { name: 'SIMHEI.TTF', kind: 'file', icon: 'font', size: '9,732 KB', type: 'TrueType 字体文件' },
              { name: 'SIMKAI.TTF', kind: 'file', icon: 'font', size: '2,288 KB', type: 'TrueType 字体文件' },
              { name: 'SIMFANG.TTF', kind: 'file', icon: 'font', size: '2,120 KB', type: 'TrueType 字体文件' },
              { name: 'STZHONGS.TTF', kind: 'file', icon: 'font', size: '4,620 KB', type: 'TrueType 字体文件' },
              { name: 'SIMYOU.TTF', kind: 'file', icon: 'font', size: '3,244 KB', type: 'TrueType 字体文件' },
              { name: 'ARIAL.TTF', kind: 'file', icon: 'font', size: '367 KB', type: 'TrueType 字体文件' },
              { name: 'TIMES.TTF', kind: 'file', icon: 'font', size: '383 KB', type: 'TrueType 字体文件' },
              { name: 'COUR.TTF', kind: 'file', icon: 'font', size: '316 KB', type: 'TrueType 字体文件' },
              { name: 'TAHOMA.TTF', kind: 'file', icon: 'font', size: '260 KB', type: 'TrueType 字体文件' },
              { name: 'WINGDING.TTF', kind: 'file', icon: 'font', size: '181 KB', type: 'TrueType 字体文件' },
              { name: 'WEBDINGS.TTF', kind: 'file', icon: 'font', size: '102 KB', type: 'TrueType 字体文件' },
            ] },
            { name: 'Tasks', kind: 'folder', appId: 'taskssched', children: [
              { name: '磁盘清理.job', kind: 'file', icon: 'shortcut', size: '1 KB', type: '任务' },
              { name: '磁盘碎片整理程序.job', kind: 'file', icon: 'shortcut', size: '1 KB', type: '任务' },
            ] },
          ],
        },
        txt('boot.ini', '[boot loader]\r\ntimeout=30\r\ndefault=multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS\r\n[operating systems]\r\nmulti(0)disk(0)rdisk(0)partition(1)\\WINDOWS="Microsoft Windows XP Professional" /fastdetect\r\n', '1 KB'),
        /* 受保护的操作系统文件（XP 默认不显示；文件夹选项 → 查看可开启） */
        { name: 'ntldr', kind: 'file', icon: 'exe', size: '215 KB', type: '系统文件', hidden: true, system: true },
        { name: 'bootfont.bin', kind: 'file', icon: 'exe', size: '4 KB', type: '系统文件', hidden: true, system: true },
        { name: 'hiberfil.sys', kind: 'file', icon: 'exe', size: '536 MB', type: '系统文件', hidden: true, system: true },
        { name: 'pagefile.sys', kind: 'file', icon: 'exe', size: '768 MB', type: '系统文件', hidden: true, system: true },
      ],
    },
    {
      name: 'CD 驱动器 (D:)',
      kind: 'drive',
      icon: 'cd',
      error: '请将磁盘插入驱动器 D:。',
    },
    {
      name: '共享文档',
      kind: 'folder',
      icon: 'shared',
      children: [
        { name: '共享图片', kind: 'folder', icon: 'pictures', children: [] },
        { name: '共享音乐', kind: 'folder', icon: 'music', children: [] },
      ],
    },
  ],
}

/* ── 静态树时间戳补齐（XP 时代氛围 + 排列图标→修改时间 可用性）──
 * 确定性派生（djb2 哈希 → 分钟偏移）：系统目录落 2001-08 中下旬（XP RTM 前），
 * 用户目录落 2001-10 下旬（装机后首次使用）；已有 modified 的节点不动（幂等，
 * 服务端旧快照迁移复用同一函数保证两端一致） */
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

const SYS_BASE = Date.UTC(2001, 7, 17, 9, 30) /* 2001-08-17 09:30 */
const SYS_SPAN_MIN = 7 * 24 * 60
const USER_BASE = Date.UTC(2001, 9, 25, 20, 15) /* 2001-10-25 20:15 */
const USER_SPAN_MIN = 9 * 24 * 60

export function ensureDatesInPlace(root: FSNode): void {
  const walk = (n: FSNode, sys: boolean) => {
    const isSys = sys || n.name === 'WINDOWS' || n.name === 'Program Files'
    if (!n.modified) {
      const h = djb2(n.name)
      const t = (isSys ? SYS_BASE : USER_BASE) + (h % (isSys ? SYS_SPAN_MIN : USER_SPAN_MIN)) * 60_000
      n.modified = new Date(t).toISOString()
      if (!n.created) n.created = new Date(t - (h % 9) * 3600_000).toISOString()
    }
    for (const c of n.children ?? []) walk(c, isSys)
  }
  walk(root, false)
}

/* 模块加载即为静态树补齐（store 初始树 / 服务端种子 / resolvePath 默认树 全部一致） */
ensureDatesInPlace(FS)

/* ── 新帐户主目录工厂（XP 全新 profile 骨架；Administrator 的丰富内容在静态树里）──
 * My Documents（图片收藏/My Music/个人欢迎 txt）+ 桌面 + Favorites\链接 +
 * Application Data\...\Quick Launch（3 默认快捷方式）+ 隐藏 NTUSER.DAT */
export function freshUserHome(name: string): FSNode {
  return {
    name,
    kind: 'folder',
    children: [
      {
        name: 'My Documents',
        kind: 'folder',
        children: [
          txt(`欢迎.txt`, `${name}，欢迎来到 Windows XP！\r\n\r\n这是属于你的「我的文档」——每个帐户都有独立的一份。\r\n在这里存放文档、图片和音乐，其他帐户看不到它们。\r\n\r\n小提示：\r\n  · 把文件拖到桌面即可创建快捷方式\r\n  · 「图片收藏」适合存放你的照片\r\n  · 删除的文件可以先在回收站里找回\r\n`, '1 KB'),
          { name: '图片收藏', kind: 'folder', icon: 'pictures', children: [] },
          { name: 'My Music', kind: 'folder', icon: 'music', children: [] },
        ],
      },
      { name: '桌面', kind: 'folder', children: [] },
      { name: 'Favorites', kind: 'folder', children: [
        { name: '链接', kind: 'folder', children: [
          { name: '自定义链接.url', kind: 'file', icon: 'shortcut', appId: 'ie', size: '1 KB', type: 'Internet 快捷方式' },
        ] },
      ] },
      { name: 'NTUSER.DAT', kind: 'file', icon: 'exe', size: '1,024 KB', type: '系统文件', hidden: true, system: true },
      /* XP 真实路径：快速启动 = Application Data\Microsoft\Internet Explorer\Quick Launch（隐藏目录） */
      { name: 'Application Data', kind: 'folder', hidden: true, children: [
        { name: 'Microsoft', kind: 'folder', children: [
          { name: 'Internet Explorer', kind: 'folder', children: [
            { name: 'Quick Launch', kind: 'folder', children: [
              { name: 'Internet Explorer.lnk', kind: 'file', icon: 'shortcut', appId: 'ie', size: '1 KB', type: '快捷方式' },
              { name: '显示桌面.scf', kind: 'file', icon: 'shortcut', appId: 'showdesktop', size: '1 KB', type: 'Explorer 命令' },
              { name: 'Windows Media Player.lnk', kind: 'file', icon: 'shortcut', appId: 'wmp', size: '1 KB', type: '快捷方式' },
            ] },
          ] },
        ] },
      ] },
    ],
  }
}

/* 主目录对帐（「我的文档」文件树完全受接口帐户控制）：
 * 为每个帐户种子缺失的主目录（原地修改；幂等——已有主目录不动）。
 * 服务端 readState/freshMockState 与客户端 hydrate 共用；删除/改名由
 * accounts API 路由显式维护（不在此处 GC，避免误删用户自建目录） */
export function ensureUserHomes(root: FSNode, users: string[]): void {
  const dns = resolvePath(DNS_PATH, root)
  if (!dns || !dns.children) return
  const existing = new Set(dns.children.map((c) => c.name))
  let added = false
  for (const u of users) {
    if (!u || existing.has(u)) continue
    dns.children.push(freshUserHome(u))
    added = true
  }
  if (added) ensureDatesInPlace(dns)
}

/* 沿路径查找节点（可传入实时树） */
export function resolvePath(path: string[], root: FSNode = FS): FSNode | null {
  let node: FSNode = root
  for (const seg of path) {
    if (!node.children) return null
    const next = node.children.find((c) => c.name === seg)
    if (!next) return null
    node = next
  }
  return node
}

/* 路径键（join('/')） */
export function pathKey(path: string[]): string {
  return path.join('/')
}

/* 同名去重：新建/粘贴时生成「xx (2)」 */
export function uniqueName(existing: string[], name: string): string {
  if (!existing.includes(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!existing.includes(candidate)) return candidate
  }
}

/* 统计文件数/文件夹数/字节数（属性对话框用） */
export function countStats(node: FSNode): { files: number; folders: number; bytes: number } {
  let files = 0
  let folders = 0
  let bytes = 0
  const walk = (n: FSNode) => {
    for (const c of n.children ?? []) {
      if (c.kind === 'file') {
        files++
        bytes += c.content ? c.content.length : 1024
      } else {
        folders++
        walk(c)
      }
    }
  }
  walk(node)
  return { files, folders, bytes }
}

/* 字节数 → XP 风格大小文本 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} 字节`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* 显示路径（去掉「我的电脑」前缀） */
export function displayPath(path: string[]): string {
  if (path.length === 0) return '我的电脑'
  return path.join(' \\ ')
}

/* 展平全树（供搜索） */
export function flattenFS(root: FSNode, base = ''): Array<{ name: string; path: string; node: FSNode }> {
  const out: Array<{ name: string; path: string; node: FSNode }> = []
  const walk = (n: FSNode, cur: string) => {
    for (const c of n.children ?? []) {
      const p = cur ? `${cur}/${c.name}` : c.name
      out.push({ name: c.name, path: p, node: c })
      if (c.kind === 'folder' || c.kind === 'drive') walk(c, p)
    }
  }
  walk(root, base)
  return out
}

export const C_DRIVE_PATH = ['本地磁盘 (C:)']

/* ── 按会话用户解析的 shell 路径（XP 真实语义：每帐户独立主目录）──
 * 「我的文档」/桌面/快速启动/链接均为登录帐户的 profile 相对路径；
 * 组件层用 useXP sessionUser 计算，服务端用 st.session.user */
export const DNS_PATH = ['本地磁盘 (C:)', 'Documents and Settings']
export const userHomePath = (user: string): string[] => [...DNS_PATH, user]
export const myDocsPath = (user: string): string[] => [...DNS_PATH, user, 'My Documents']
export const userDesktopPath = (user: string): string[] => [...DNS_PATH, user, '桌面']
/* 「开始」菜单（pinned 属性对话框显示的真实路径；静态树不建实体） */
export const userStartPath = (user: string): string[] => [...DNS_PATH, user, '「开始」菜单']
/* 快速启动（XP 真实路径，任务栏快速启动区由此文件夹驱动 → 可自定义） */
export const quickLaunchPath = (user: string): string[] => [...DNS_PATH, user, 'Application Data', 'Microsoft', 'Internet Explorer', 'Quick Launch']
/* 链接工具栏对应文件夹（XP：收藏夹\链接） */
export const linksPath = (user: string): string[] => [...DNS_PATH, user, 'Favorites', '链接']

/* ── 树操作（客户端 store 与服务端 mock 共用） ── */

/* 在指定路径下修改 children（返回新树，不可变更新） */
export function mutateAt(root: FSNode, path: string[], fn: (children: FSNode[]) => FSNode[]): FSNode {
  if (path.length === 0) return { ...root, children: fn(root.children ?? []) }
  const [head, ...rest] = path
  return {
    ...root,
    children: (root.children ?? []).map((c) => (c.name === head ? mutateAt(c, rest, fn) : c)),
  }
}

/* 摘出节点（返回新树 + 被摘出的节点快照） */
export function detachNode(root: FSNode, path: string[]): { tree: FSNode; node: FSNode | null } {
  const parentPath = path.slice(0, -1)
  const name = path[path.length - 1]
  let node: FSNode | null = null
  const tree = mutateAt(root, parentPath, (children) => {
    node = children.find((c) => c.name === name) ?? null
    return children.filter((c) => c.name !== name)
  })
  return { tree, node: node ? structuredClone(node) : null }
}

/* 插入节点（自动重名去重） */
export function insertNode(root: FSNode, parentPath: string[], node: FSNode): { tree: FSNode; name: string } {
  const dest = resolvePath(parentPath, root)
  const finalName = uniqueName((dest?.children ?? []).map((c) => c.name), node.name)
  const withName = { ...structuredClone(node), name: finalName }
  const tree = mutateAt(root, parentPath, (children) => [...children, withName])
  return { tree, name: finalName }
}
