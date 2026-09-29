# Windows XP WebOS — API 接口文档（v1）

> 适用版本：v1（`MOCK_STATE_VERSION = 1`）
> 本文档面向需要将本项目的本地 JSON 模拟数据替换为真实后端服务的开发者，覆盖客户端用到的全部接口、数据模型、同步机制与对接指引。

---

## 1. 架构总览

```
┌────────────────────────┐        ┌─────────────────────────┐
│  浏览器（XP WebOS 前端） │  HTTP  │  数据服务（API BaseURL） │
│  Next.js + React 19    │ ────▶  │  默认：同源 /api/v1      │
│  zustand（内存状态）     │ ◀────  │  （本地 JSON 模拟服务）   │
└────────────────────────┘        └─────────────────────────┘
                                          │ 读写
                                          ▼
                                  db/xp-state.json（本地 JSON 文件）
```

- **前端**不直接读写数据库；所有数据（文件系统、设置、回收站、打印、IE 数据等）均通过 REST API 收发。
- **默认数据源**是本项目自带的本地模拟服务（Next.js API Routes，数据持久化到 `db/xp-state.json`）。
- **替换真实后端**时，只需按本文档实现同样的路由与响应信封，然后在「API 数据源设置」中切换 BaseURL（或设置环境变量），前端零修改。

## 2. 快速开始

### 2.1 BaseURL 配置（三级优先）

| 优先级 | 方式 | 说明 |
|---|---|---|
| 1（最高） | 运行时设置 | 「API 数据源设置」对话框（运行 `apicfg` 或 管理工具 → 数据源设置），写入 `localStorage["xp.apiBase"]` |
| 2 | 环境变量 | `NEXT_PUBLIC_API_BASE`（构建期生效，如 `NEXT_PUBLIC_API_BASE=https://api.example.com/xp`） |
| 3（默认） | 同源 `/api/v1` | 本地模拟服务 |

### 2.2 响应信封（所有接口统一）

```jsonc
// 成功
{ "ok": true, "data": { ... } }

// 失败
{ "ok": false, "error": { "code": 404, "message": "路径不存在: xxx" } }
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `ok` | boolean | 成功标志 |
| `data` | any | 成功时的业务数据 |
| `error.code` | number | HTTP 状态码同值（0 = 网络不可达） |
| `error.message` | string | 人类可读错误信息（中文） |

### 2.3 路径表示法

文件/文件夹用**路径段数组**寻址（避免中文/空格/分隔符歧义）：

```json
["本地磁盘 (C:)", "Documents and Settings", "Administrator", "桌面", "readme.txt"]
```

`GET /api/v1/fs?path=` 查询参数中，路径段以 `/` 连接并做 URL 编码。

## 3. 数据模型

### 3.1 FSNode（文件系统节点）

```ts
interface FSNode {
  name: string                          // 名称（同级唯一，重名自动「xx (2)」）
  kind: 'folder' | 'file' | 'drive'     // 类型
  appId?: string                        // 双击启动的应用 id（exe/外壳文件夹）
  icon?: 'folder' | 'text' | 'image' | 'exe' | 'hd' | 'cd' | 'floppy'
       | 'pictures' | 'music' | 'audio' | 'bmp' | 'shortcut' | 'font' | 'zip'
  children?: FSNode[]                   // folder/drive 的子节点
  content?: string                      // 文本文件内容
  src?: string                          // 图片/媒体的展示地址（URL 或 data URL）
  size?: string                         // XP 风格大小文本（"1 KB"）
  type?: string                         // 类型文案（"文本文档"）
  created?: string                      // ISO 时间
  modified?: string
  readonly?: boolean
  error?: string | null                 // 打开失败的错误信息（软盘未就绪等）
  shortcutTo?: string[]                 // 快捷方式目标路径
}
```

### 3.2 SettingsDTO（系统设置，字段即 XP 功能开关）

```ts
interface SettingsDTO {
  wallpaper: 'bliss' | 'azul' | 'autumn' | 'none-blue' | 'none-teal' | 'custom'  // 壁纸
  wallpaperPos: 'center' | 'tile' | 'stretch'                    // 壁纸位置（居中/平铺/拉伸）
  bgColor: string                                               // 桌面背景色
  customWallpaper: string | null                                // 自定义壁纸（fs 图片 src）
  customWallpaperName: string                                   // 自定义壁纸显示名
  deskIcons: Record<string, boolean>                            // 桌面系统图标显隐
  deskIconOverrides: Record<string, string>                     // 桌面图标替换（sys key → bmp 资产名）
  iconSize: 32 | 48                                             // 桌面图标大小（XP 默认 32 小图标；外观页「使用大图标」= 48）
  soundsEnabled: boolean                                        // 声音方案
  masterVolume: number                                          // 主音量 0-100
  volumeMuted: boolean                                          // 静音
  screensaver: 'none' | 'pipes' | 'text3d' | 'starfield' | 'mystify'  // 屏幕保护（三维管道/三维文字/星空/变幻线）
  saverWait: number                                             // 等待分钟
  theme: 'blue' | 'olive' | 'silver' | 'classic'                  // Luna 主题 / Windows 经典样式
  classicScheme: ClassicSchemeKey                                 // 经典样式色彩方案（22 种：Windows 标准/经典+16 彩色+4 高对比度；仅 theme='classic' 生效；切换联动 bgColor）
  taskbarLocked: boolean                                        // 锁定任务栏
  taskbarPos: 'bottom' | 'top' | 'left' | 'right'               // 任务栏位置
  taskbarH: number                                              // 任务栏高度
  showQuickLaunch: boolean                                      // 快速启动
  taskbarAutoHide: boolean                                      // 自动隐藏
  taskbarOnTop: boolean                                         // 置于前端
  taskbarGroup: boolean                                         // 分组相似按钮
  showClock: boolean                                            // 显示时钟
  hideInactiveIcons: boolean                                    // 隐藏不活动的图标
  notifPrefs: Record<string, 'always' | 'hide' | 'inactive'>    // 托盘通知行为
  tbDesktop: boolean                                            // 桌面工具栏
  tbLinks: boolean                                              // 链接工具栏
  tbCustom: Array<{ name: string; path: string[] }>             // 自定义工具栏
  tbTitles: Record<string, boolean>                            // 任务栏工具栏「显示标题」（键=quick/desktop/links/自定义名；缺省=XP 默认）
  startClassic: boolean                                         // 经典「开始」菜单
  classicOpts: { myDocs, recentDocs, search, help, run, allPrograms, logoff, shutdown: boolean }
  startOpts: { bigIcons: boolean; progCount: number; itemMode: Record<string, 'none' | 'link' | 'menu'> }
  autoArrange: boolean                                          // 排列图标-自动排列
  alignGrid: boolean                                            // 排列图标-对齐到网格（XP 默认 true；关闭后拖放自由落点）
  desktopSort: 'none' | 'name' | 'size' | 'type' | 'modified'   // 排列图标-排序模式
  solitaireBack: number                                          // 纸牌牌背样式索引 0-11（选定纸牌背面；Hearts 共用）
  solitaireOpts: { draw: 1|3; scoring: 'none'|'std'|'vegas'; timed: boolean }  // 纸牌选项：翻牌方式/计分模式/计时游戏（游戏→选项）
  startPinned: Array<{ key: string; label: string }>            // 开始菜单固定项
  clockOffsetMin: number                                        // 时钟偏移（日期时间属性）
  tzOffsetH: number                                             // 时区
  tzName: string
  stickyKeys: boolean                                           // 粘滞键
  hideFileExt: boolean                                          // 隐藏已知文件类型扩展名
  showHiddenFiles: boolean                                      // 显示所有文件和文件夹
  showSystemFiles: boolean                                      // 显示受保护的操作系统文件
  showCommonTasks: boolean                                      // 文件夹常见任务侧栏
  clickToOpen: boolean                                          // 通过单击打开项目
  folderMisc: Record<string, boolean>                           // 其余查看页项
  programUse: Record<string, number>                            // 程序使用计数（常用程序排序）
  extAssoc: Record<string, string>                              // 扩展级打开方式（"txt" → "wordpad"）
  visualFX: { dragWindowContents, winAnim, smoothScroll, menuFade, slideCombo, menuShadow, cursorShadow, visualStyles: boolean }
  regTree: RegKey                                                // 注册表编辑器树（regedit；整树替换——RegKey { name, children: RegKey[], values: RegValue[] }，RegValue { name, type: 'REG_SZ'|'REG_BINARY'|'REG_DWORD', data }）
  inputLang: 'ch' | 'en'                                         // 输入语言（托盘 CH/EN 指示器；Ctrl+Shift 切换）
  langBarOn: boolean                                             // 语言栏指示器显隐（任务栏右键→工具栏→语言栏）
}
```

### 3.3 其余领域类型

```ts
interface RecycleItem {           // 回收站条目
  key: string                     // 唯一键（客户端生成：路径#时间戳+随机）
  name: string
  origKey: string                 // 删除前所在父目录（pathKey）
  node: FSNode                    // 被删除节点的完整快照
  deletedAt: number
}

interface PrintJob {
  id: number                      // 服务端自增
  printer: string                 // 打印机名
  doc: string                     // 文档名
  pages: number
  size: string
  owner: string                   // "Administrator"
  submitted: number               // 时间戳
  status: 'printing' | 'paused'
}

interface PrinterItem { name: string; model: string; def: boolean }

interface SchedTask { name: string; program: string; app: string; sched: string; next: string }

interface SessionEvent { action: 'login'|'logoff'|'lock'|'unlock'|'shutdown'|'restart'; at: number; user: string }
```

### 3.4 全量快照 MockStateDTO（`GET /state` 响应）

```ts
interface MockStateDTO {
  version: number                 // 1
  fsTree: FSNode                  // 整棵文件系统树（根 = 我的电脑）
  recycleBin: RecycleItem[]
  settings: SettingsDTO
  recentDocs: string[][]          // 我最近的文档（路径段数组，最近在前，上限 15）
  runHistory: string[]            // 运行 MRU（上限 26）
  printers: PrinterItem[]
  printJobs: PrintJob[]
  schedTasks: SchedTask[]
  desktopPos: Record<string, { x: number; y: number }>   // 桌面图标自由位置
  ie: { home: string; favorites: Array<{url,title}>; history: Array<{url,title,ts}> }
  netDrives: Array<{ letter: string; path: string }>     // 映射网络驱动器
  audioBlobs: Record<string, string>                     // 录音机作品（path → data URL）
  session: { user: string; computer: string; events: SessionEvent[] }
}
```

---

## 4. 端点参考

所有端点前缀 = BaseURL（默认 `/api/v1`）。`●` = 客户端实际调用；`○` = 供真实后端/第三方使用（模拟服务同样实现）。

### 4.1 系统

#### `GET /system` ●（连接测试/关于）
```json
{ "ok": true, "data": { "product": "Windows XP WebOS", "edition": "Professional",
  "version": "2002", "servicePack": "SP3", "apiVersion": "v1", "mockServer": true,
  "computer": "XP-STATION", "user": "Administrator", "time": "2026-09-18T01:19:10.568Z" } }
```

#### `POST /system` ○（重置出厂）
```json
// 请求
{ "action": "reset" }
// 响应
{ "ok": true, "data": { "reset": true, "version": 1 } }
```

### 4.2 会话

#### `GET /session` ○ — 会话信息与事件流水
#### `POST /session` ●（登录/解锁/锁定/注销/关机/重启事件上报）
```json
// 请求
{ "action": "login", "user": "Administrator" }
// 响应
{ "ok": true, "data": { "action": "login", "at": 1760000000000, "user": "Administrator" } }
```

### 4.2a 用户帐户（欢迎屏多账号登录体系）

> 密码仅存于服务端 mock 层（db/xp-state.json `accounts[].password`），**所有 API 响应一律剥离密码**，只返回派生字段 `hasPassword`。`GET /state` 的 `accounts` 同样已剥离。
> 存储格式为 **SHA-256 加盐哈希**（`sha256$<salt>$<hash>`，b3 批起）：登录/创建/改密请求中传**明文**（仅存在于请求体），落库即哈希；旧明文快照在读取时自动迁移（或首次登录成功时透明升级），登录验证兼容两种格式。
>
> **主目录联动**（每帐户独立「我的文档」，完全受帐户资源控制）：帐户在 `C:\Documents and Settings\{name}` 下拥有独立主目录（My Documents/桌面/Favorites\链接/Application Data\...\Quick Launch）。`POST /accounts` 同步种子主目录；`PATCH` 改名同步重命名主目录；`DELETE` 同步移除主目录。服务端每次读取状态会对帐补齐缺失主目录（旧快照自动迁移）。客户端「我的文档」/桌面/快速启动等 shell 路径均按当前会话用户（`session.user`）解析。

#### `GET /accounts` ○ — 帐户列表
```json
{ "ok": true, "data": [ { "name": "Administrator", "type": "admin", "avatar": "avatar-admin", "hint": "Windows XP 的发布年份", "hasPassword": true }, { "name": "Guest", "type": "guest", "avatar": "avatar-guest", "hint": "", "hasPassword": false } ] }
```

#### `POST /accounts/login` ● — 欢迎屏/锁定屏登录验证
```json
// 请求
{ "name": "Administrator", "password": "2001" }
// 响应（成功；同时服务端更新 session.user）
{ "ok": true, "data": { "ok": true, "account": { "name": "Administrator", "type": "admin", "avatar": "avatar-admin", "hint": "Windows XP 的发布年份", "hasPassword": true } } }
// 响应（密码错）
{ "ok": true, "data": { "ok": false, "reason": "bad-password" } }
```

> 种子帐户：`Administrator / 2001`（密码提示「Windows XP 的发布年份」）、`Guest`（无密码，单击即登录）。旧快照（v1）读取时自动迁移：移除演示帐户王小明，空密码的 Administrator 补默认密码。

#### `POST /accounts` ● — 创建帐户（重名 409）
```json
{ "name": "测试员", "password": "abc", "hint": "字母表", "type": "user", "avatar": "avatar-fish" }
```

#### `PATCH /accounts` ● — 更改密码/提示/头像/名称
```json
{ "name": "测试员", "newName": "测试员2号", "password": "2001", "hint": "提示语", "avatar": "avatar-plane" }
// 内置 Administrator/Guest 不可重命名；name 为定位键
```

#### `DELETE /accounts` ● — 删除帐户（内置 Administrator/Guest 403）
```json
{ "name": "测试员" } → { "ok": true, "data": { "removed": "测试员" } }
```

### 4.3 文件系统（核心 CRUD）

#### `GET /fs` ○ — 全树根节点 或 `?path=a/b` 按路径取节点
```json
// GET /api/v1/fs?path=本地磁盘 (C:)/Documents and Settings/Administrator/桌面
{ "ok": true, "data": { "name": "桌面", "kind": "folder", "children": [ ...FSNode ] } }
```
路径不存在返回 404 信封。

#### `POST /fs` ● — 新建文件/文件夹
```json
// 请求：node 为完整 FSNode（kind/children/content 等），服务端按同级重名自动「xx (2)」
{ "parentPath": ["本地磁盘 (C:)", "...", "桌面"],
  "node": { "name": "新建文件夹", "kind": "folder", "children": [] } }
// 响应：返回去重后的最终名称
{ "ok": true, "data": { "name": "新建文件夹 (2)" } }
```

#### `POST /fs/write` ● — 写文件内容（存在则更新，不存在则创建）
```json
// 请求
{ "parentPath": ["本地磁盘 (C:)", "...", "桌面"], "name": "日记.txt", "content": "今天…" }
// 响应
{ "ok": true, "data": { "created": true, "name": "日记.txt" } }
```
服务端按内容长度重算 `size` 并更新 `modified`。

#### `PATCH /fs` ● — 重命名（二选一字段）
```json
// 方式一：重命名（服务端重算扩展名关联 icon/type，冲突 409）
{ "path": ["本地磁盘 (C:)", "...", "日记.txt"], "newName": "日记.log" }
// 方式二：属性补丁（格式化后清除 error、设置 readonly 等；值 null = 清除该字段）
{ "path": ["3.5 软盘 (A:)"], "patch": { "error": null, "label": "数据盘" } }
```

#### `DELETE /fs` ● — 删除（默认进回收站）
```json
// 请求
{ "paths": [ ["本地磁盘 (C:)", "...", "日记.txt"] ],
  "permanent": false,                       // true = 不进回收站直接彻底删除
  "items": [ { "key": "…#1760000000000ab12", "name": "日记.txt", "origKey": "本地磁盘 (C:)/…",
               "node": { … }, "deletedAt": 1760000000000 } ] }
// 响应
{ "ok": true, "data": { "deleted": 1 } }
```
> `items` 为客户端已生成的回收站条目（key 客户端权威，保证还原时双向一致）；真实后端可改为自行生成 key，但需在 `POST /recycle` 还原时使用同一 key 空间。

#### `POST /fs/move` ● — 移动
```json
{ "paths": [["C:", "a.txt"]], "destPath": ["C:", "My Documents"] }
→ { "ok": true, "data": { "moved": 1 } }
```
语义：不可移到自身/自己的子目录（自动跳过）；目标重名自动去重。

#### `POST /fs/copy` ● — 复制（粘贴、副本、拖放复制共用）
```json
{ "paths": [["C:", "a.txt"]], "destPath": ["C:", "My Documents"] }
→ { "ok": true, "data": { "copied": 1 } }
```

### 4.4 回收站

| 方法 | 端点 | 请求 | 说明 |
|---|---|---|---|
| GET ○ | `/recycle` | — | 列表 |
| POST ● | `/recycle` | `{ "key": "…" }`（缺省=全部） | 还原（原位置失效回退桌面） |
| DELETE ● | `/recycle` | `{ "key": "…" }`（缺省=清空） | 彻底删除 |

### 4.5 系统设置

#### `GET /settings` ○ / `PATCH /settings` ●
```json
// PATCH 请求：部分合并，仅接受 SettingsDTO 已知字段（未知字段忽略）
{ "theme": "olive", "showClock": false, "extAssoc": { "log": "wordpad" } }
// 响应
{ "ok": true, "data": { "applied": ["theme", "showClock", "extAssoc"] } }
```

### 4.6 列表类资源

以下资源结构一致：`GET` 查询、`PUT` ● 整表替换（客户端同步方式）、`POST` ○ 追加、`DELETE` ○ 清空/删除。

| 端点 | 数据 | POST 追加语义 | DELETE 语义 |
|---|---|---|---|
| `/recent-docs` | 我最近的文档（≤15） | `{ "item": ["路径","段"] }` 去重置顶 | 清空 |
| `/run-history` | 运行 MRU（≤26） | `{ "item": "notepad" }` 去重置顶 | 清空 |
| `/printers` | 打印机列表 | `{ "name", "model", "def" }` | `{ "name" }`（连带清其作业） |
| `/sched-tasks` | 任务计划 | `{ "task": SchedTask }` 同名覆盖 | `{ "name" }` |
| `/net-drives` | 映射网络驱动器 | `{ "letter": "Z:", "path": "\\\\srv\\pub" }` | `{ "letter" }` |
| `/audio` | 录音机作品 | —（仅 PUT 整表） | `{ "path" }` |

#### `/print-jobs`（打印队列，语义略不同）
| 方法 | 请求 | 说明 |
|---|---|---|
| GET ○ | — | 队列列表 |
| PUT ● | `{ "jobs": PrintJob[] }` | 整表替换（客户端同步） |
| POST ○ | `{ "printer", "doc", "pages", "size?" }` | 入队（id 服务端分配） |
| PATCH ○ | `{ "id": 1, "status": "paused" }` | 暂停/恢复 |
| DELETE ○ | `{ "id": 1 }` 或 `{ "printer": "…" }` | 取消单个或整台打印机的全部 |

> 打印作业的完成出队由前端计时器驱动（约 6.5s），真实后端可改为服务端推进后通过 `GET /state` 或轮询体现。

### 4.7 桌面布局

#### `GET /desktop` ○ / `PUT /desktop` ●
```json
{ "positions": { "sys:ie": { "x": 20, "y": 400 }, "文件名.txt": { "x": 20, "y": 130 } } }
```

### 4.8 Internet Explorer 数据

#### `GET /ie` ○ / `PUT /ie` ● / `DELETE /ie` ○
```json
// PUT：提交哪些字段就更新哪些
{ "home": "http://cn.msn.com/",
  "favorites": [ { "url": "http://x/", "title": "X" } ],
  "history": [ { "url": "http://h/", "title": "H", "ts": 1760000000000 } ] }
// DELETE：清空历史记录（上限 60 条）
```

### 4.9 全量快照

#### `GET /state` ● — 启动 hydrate（见 §5）

---

## 5. 客户端同步机制（真实后端需要了解的行为）

| 阶段 | 行为 | 涉及端点 |
|---|---|---|
| 启动 | 拉取全量快照，整体替换本地状态（**服务端是数据权威**） | `GET /state` |
| 文件操作 | 每个文件/回收站操作即时推送（乐观本地应用 + 串行队列保序） | `POST/PATCH/DELETE /fs`、`/fs/write`、`/fs/move`、`/fs/copy`、`POST/DELETE /recycle` |
| 设置变更 | 防抖 400ms 后 diff 推送（仅变化字段） | `PATCH /settings` |
| 列表变更 | 防抖 400ms 后整表替换 | 各 `PUT` 端点 |
| 会话事件 | 登录/锁定/注销等即时上报 | `POST /session` |
| 脱机 | 数据源不可达时自动降级：保留本地状态正常使用，**不建立推送基线**（恢复在线后以下次 `GET /state` 为准） | — |

**脱机语义说明**：脱机期间的本地修改不会回推服务端（避免用本地默认值覆盖服务端数据）。真实后端若需支持脱机编辑，可在此基础上加操作日志/版本号。

**并发模型**：模拟服务为单用户单写者（promise 链串行化）。真实后端建议为 `fsTree` 引入版本号或 ETag 防并发冲突。

## 6. 真实后端对接清单

1. 实现 §4 全部路由（可先只实现 `●` 标记的客户端实际调用集：`/state`、`/system`、`/session`、`/fs` 四方法、`/fs/write|move|copy`、`/recycle`、`/settings`、各 `PUT`）。
2. 响应体保持 `{"ok":true,"data":…}` / `{"ok":false,"error":{code,message}}` 信封。
3. 路径寻址统一使用路径段数组（`string[]`），不要拼接字符串。
4. 保留 XP 语义细节：重名自动 `xx (2)`、改名重算扩展关联、移动防环、回收站还原回退桌面、`error: null` 清除字段。
5. 鉴权扩展点：信封外的 `Set-Cookie`/`Authorization` 头会被 `fetch` 原样传递，可在 `src/lib/api/client.ts` 的 `apiFetch` 中统一附加。
6. 切换方式：`apicfg` 对话框填入新 BaseURL，或设置 `NEXT_PUBLIC_API_BASE` 重新构建。

## 7. 错误码

| code | 含义 | 示例 |
|---|---|---|
| 0 | 网络不可达 | 无法连接数据源 http://… |
| 400 | 请求体/参数错误 | 缺少必填字段: parentPath |
| 404 | 路径不存在 | 路径不存在: 本地磁盘 (C:)/xxx |
| 409 | 冲突 | 目标已存在同名的 "readme.txt" |
| 500 | 服务端异常 | （message 为异常信息） |

## 8. 既有辅助端点（非 /v1 体系）

| 端点 | 用途 |
|---|---|
| `GET /api/browse?url=` | IE 浏览器真实联网代理（服务端抓取网页重写后回传 iframe） |
| `GET /api/netinfo` | 网络连接状态信息 |
| `GET /api/search?q=` | 搜索建议 |

## 9. 测试与运维

```bash
# 手动重置出厂数据（等价于 apicfg 对话框「重置为出厂状态」）
curl -X POST http://localhost:3000/api/v1/system -H 'content-type: application/json' -d '{"action":"reset"}'

# 查看持久化文件
cat db/xp-state.json | python3 -m json.tool | less
```

数据文件位置：`db/xp-state.json`（进程内串行写入，原子替换）。删除该文件等同于重置（下次访问自动播种初始状态）。
