# Windows XP 在线版 · 架构文档

> app_id: `cmspro.windowsxponline` · 版本 1.0.0

## 一、应用概述

Windows XP 在线版是基于 XP WebOS 的 CMSPRO 应用，在浏览器中复刻 Windows XP 桌面体验。支持两种访问模式：

- **单机版**（standalone）：仅超级管理员可访问 XP 桌面，通过后台管理入口直接使用
- **在线版**（online）：所有注册用户均可登录使用自己的 XP 桌面，数据按用户隔离

## 二、目录结构

```
CmsproWindowsxponline/
├── manifest.json          # 应用清单（权限/菜单/配置声明）
├── ServiceProvider.php     # 服务提供者（路由/视图注册）
├── Install.php            # 安装/卸载/升级闭环
├── .exportignore          # 导出排除规则
├── Config/
│   └── windowsxponline.php  # 代码层默认配置
├── Controllers/
│   ├── Admin/              # 后台控制器
│   │   ├── DashboardController.php    # 桌面入口
│   │   ├── SettingController.php      # 设置页面
│   │   ├── SpaceController.php        # 空间管理页面
│   │   ├── DesktopIconController.php  # 桌面图标管理页面
│   │   └── Api/                       # 后台 API
│   │       ├── SettingApiController.php  # 配置 CRUD
│   │       ├── SpaceApiController.php    # 空间 CRUD
│   │       └── DesktopIconApiController.php  # 桌面图标 CRUD + 图标上传
│   ├── Api/V1/             # XP WebOS API 控制器
│   │   ├── BaseController.php         # API 基类
│   │   ├── SystemController.php       # 系统信息/重置
│   │   ├── SessionController.php      # 会话管理
│   │   ├── AccountController.php      # 用户帐户
│   │   ├── FsController.php           # 文件系统 CRUD
│   │   ├── FileController.php         # blob 分片上传与下载
│   │   ├── ArchiveController.php      # 压缩/解压（ZIP 引擎，WinRAR 复刻后端）
│   │   ├── RecycleController.php      # 回收站
│   │   ├── SettingsController.php     # 系统设置
│   │   ├── StateController.php        # 状态/列表资源
│   │   ├── DesktopController.php      # 桌面布局
│   │   ├── IeController.php           # IE 浏览器数据
│   │   ├── PrinterController.php      # 打印机
│   │   ├── PrintJobController.php     # 打印队列
│   │   └── SchedTaskController.php    # 计划任务
│   └── User/              # 用户端控制器
│       └── DesktopController.php      # 用户端桌面入口
├── Routes/
│   ├── admin.php           # 后台页面路由
│   ├── admin_api.php       # 后台 API 路由
│   ├── user.php            # 用户端路由
│   ├── xp_admin_api.php    # 单机版 XP API 路由
│   ├── xp_user_api.php     # 在线版 XP API 路由
│   └── xp_routes.php       # XP API 共享路由定义
├── Services/
│   ├── StorageManager.php          # 存储管理器（驱动选择/配置读取）
│   ├── StorageDriverInterface.php  # 存储驱动接口
│   ├── LocalDriver.php             # 本地存储驱动
│   ├── OssDriver.php               # 阿里云 OSS 驱动
│   ├── CosDriver.php               # 腾讯云 COS 驱动
│   ├── StateService.php             # 状态数据服务
│   ├── FsTreeService.php           # 文件树服务
│   ├── BlobService.php             # blob 对象存储与分片上传会话服务
│   ├── ArchiveService.php          # ZIP 压缩/解压引擎（ZipArchive）
│   ├── InitialStateProvider.php    # 初始状态提供者
│   └── XpResponse.php              # XP API 响应封装
├── Exceptions/
│   ├── StateException.php          # 快照状态异常（自带 render，7 种 reason）
│   └── BlobException.php           # blob/上传异常（自带 render，7 种 reason）
├── Middleware/
│   ├── EnsureXpAdminPermission.php  # 后台 API 权限校验（逐条指定权限码后缀）
│   └── EnsureXpUserAuthenticated.php # 用户端 XP API 登录态校验
├── Models/
│   ├── UserSpace.php       # 用户空间模型
│   ├── XpFile.php          # blob 元数据模型
│   ├── XpUpload.php        # 分片上传会话模型
│   └── DesktopIcon.php     # 桌面图标模型
├── Migrations/
│   ├── 2026_09_26_000001_create_user_spaces_table.php
│   ├── 2026_09_26_000002_add_create_time_index_to_user_spaces_table.php
│   ├── 2026_09_28_000001_create_files_table.php
│   ├── 2026_09_28_000002_create_uploads_table.php
│   └── 2026_09_29_000001_create_desktop_icons_table.php
├── Views/
│   ├── admin/              # 后台视图
│   │   ├── dashboard.blade.php  # 桌面入口页
│   │   ├── settings.blade.php   # 应用设置页
│   │   ├── spaces.blade.php     # 空间管理页
│   │   └── deskicons.blade.php  # 桌面图标管理页
│   └── user/              # 用户端视图
│       └── desktop.blade.php    # 用户端桌面入口
├── Assets/                # XP WebOS 静态资源（前端构建产物，见第九章「前端产物与补丁机制」）
├── Frontend/              # XP WebOS 前端源码（Next.js，仅维护用，导出时排除）
│   ├── src/               # 源码（app/ 页面+API路由、hooks/、lib/）
│   ├── docs/              # 前端文档（API.md、图标版权）
│   ├── eslint.config.mjs  # ESLint 配置
│   └── worklog.md         # 开发日志
├── Tests/                 # 应用级测试（独立执行，不进框架 tests/）
│   ├── Support/           # 测试基建（见 operations.md 第八章）
│   │   ├── WindowsxponlineSetup.php   # 建最小配置表 + 跑应用迁移 + flush 缓存
│   │   ├── XpStateSandbox.php         # 注入内存驱动 + 伪造 admin 登录态 + 种配置
│   │   └── InMemoryStorageDriver.php  # 内存存储驱动（快照可预置/回读）
│   └── Feature/           # 16 个功能测试类，170 用例 / 625 断言
└── doc/                   # 应用文档
```

## 三、路由架构

### 3.1 路由组概览

| 路由组 | 前缀 | 中间件 | 用途 |
|--------|------|--------|------|
| 后台页面 | `admin/cmspro/windowsxponline` | web, auth:admin, permission | 管理后台页面 |
| 后台 API | `api/admin/cmspro/windowsxponline` | web, auth:admin, permission | 配置/空间管理接口 |
| 用户端页面 | `user/cmspro/windowsxponline` | web, auth:web, front_user_status | 用户桌面入口 |
| 单机版 XP API | `api/admin/cmspro/windowsxponline/v1` | web, auth:admin, permission | 超管 XP 桌面 API |
| 在线版 XP API | `api/user/cmspro/windowsxponline/v1` | web, auth:web, front_user_status | 用户 XP 桌面 API |

> 动态访问入口：配置 `access_path`（自定义路径）或 `bind_domain`（绑定域名）后，ServiceProvider 会在启动时额外注册对应入口路由，中间件随 access_mode 自动选择（standalone → admin 组，online → user 组）。

### 3.2 权限体系

manifest.json 声明 4 个权限：

- `cmspro.windowsxponline.access` — 访问 XP 在线版
- `cmspro.windowsxponline.settings` — 管理 XP 应用设置
- `cmspro.windowsxponline.spaces` — 管理用户空间
- `cmspro.windowsxponline.deskicons` — 管理桌面图标

后台路由组添加 `permission` 中间件，与框架级 `api/admin` 路由组保持一致。`CheckPermission` 中间件从 URL 推导权限码（格式 `admin.{module}.{action}`），权限码不存在于 `admin_permissions` 表则放行，超级管理员直接放行。

由于 URL 推导的权限码与应用声明的 `cmspro.windowsxponline.*` 权限码不同体系、必然放行（权限空转），后台管理 API 在路由组之上再挂应用自有中间件 `EnsureXpAdminPermission`（逐条指定 `:settings` / `:spaces` 权限码后缀）做真实拦截；后台视图工具栏/行内按钮通过 `data-permission` 属性 + `admin.partials.permission-script` 注入实现前端权限隐藏，形成「后端拦截为主、前端隐藏为辅」的双层控制。

### 3.3 XP API 路由共享机制

`xp_routes.php` 被 `xp_admin_api.php`（单机版）和 `xp_user_api.php`（在线版）共同 require。控制器通过 Auth 门面判断当前用户类型（admin/user），自动适配身份，无需为单机版/在线版维护两套控制器。

## 四、数据流

### 4.1 桌面加载流程

```
用户访问 /admin/cmspro/windowsxponline（后台）或 /user/cmspro/windowsxponline（用户端）
  → DashboardController::index()
    → 读取 access_mode、storage_driver 配置
    → 返回 dashboard.blade.php（含 iframe）
      → 前端设置 localStorage('xp.apiBase')
      → iframe 加载 /apps/cmspro.windowsxponline/index.html（XP WebOS 前端）
        → 前端调用 GET /api/.../v1/state 获取全量快照
        → StorageManager 读取对应驱动实例
          → LocalDriver / OssDriver / CosDriver
        → StateService::applyStateMigrations() 加载迁移（驱动器布局自愈 / 帐户目录搬移到 D 盘 /
          Quick Launch 默认项增量补入 / IE 主页强制同步 ieHomeApplied）
        → 响应态注入 D 盘 total·used 配额、ie.defaultHome；stripAccounts() 剥离密码并按
          xp_guest_enabled 过滤 Guest
        → 前端 hydrate：写 store（含 sessionUser）+ 暴露 window.__XP_SESSION_USER__ /
          window.__XP_IE_HOME_DEFAULT__ / window.__XP_HYDRATED__
```

> **加载顺序要点**：任务栏快速启动区与桌面图标的 `useMemo` 依赖数组必须包含 hydrate 写入的状态键（快速启动依赖 `[U,G]`、桌面依赖 `[U,Y]`），否则首屏在 hydrate 完成前算过一次就不再重算，表现为「首次进入无图标、刷新才显示」。hydrate 亦须把 `session.user` 写进 store 的 `sessionUser`（补丁前仅存在于快照），依赖当前帐户名的派生值才能正确计算。

### 4.2 文件系统操作流程

```
XP 前端调用 POST /api/.../v1/fs（创建文件）
  → FsController::create()
    → FsTreeService 处理路径解析与树操作
    → StateService 持久化到存储驱动
      → StorageManager::getDriver()->write(key, data)
```

### 4.3 配置管理流程

```
管理员在 settings 页面提交配置
  → PUT /api/admin/cmspro/windowsxponline/settings
    → SettingApiController::update()
      → 敏感字段（oss_access_secret, cos_secret_key）Crypt::encryptString() 加密
      → ConfigItem::updateOrCreate() 写入 config_items 表
      → StorageManager::resetDriver() 清除驱动缓存
```

> `update()` 入库前逐项校验：`access_mode`/`storage_driver` 枚举、`default_space_quota` 范围、`xp_quicklaunch_defaults` appId 白名单、`xp_ie_homepage` 主机名格式、`xp_guest_enabled` 仅 0/1，任一不通过返回 `40001` 且不写库。

### 4.4 本地文件导入流程（双通道：内嵌 + blob 分片上传）

```
用户拖放文件到桌面/资源管理器窗口（或 Ctrl/Cmd+V 粘贴截图、Ctrl/Cmd+Shift+V 唤起选择框）
  → window 捕获阶段拦截原生 drag/drop·paste·keydown（自定义 MIME application/x-xp-paths 放行给 React）
  → 解析目标目录：命中 [data-xp-cwd] 的 explorer 窗口取该目录，否则回落当前帐户桌面
  → 只读根（本地磁盘 (C:) / 回收站 / 网上邻居）直接拒绝，不静默改投桌面
  → 弹出 XP 风格「正在复制」进度对话框（文件名、序号、百分比、取消按钮）
  → 逐文件**串行**分流（避免多个大文件同时占用内存）：
      0 字节                                  → 内嵌通道（按扩展名给图标，服务端无内容可推断类型）
      ≤2MB 且扩展名属文本/图片白名单            → 内嵌通道
      其余任意格式、任意大小                    → blob 通道
      前端本地数据源（isRemote()===false）      → 强制内嵌通道，>2MB 或非白名单直接报错
  → 内嵌通道：FileReader 读取
      文本：ArrayBuffer → UTF-8 解码，出现 U+FFFD 回退 GBK
      图片：readAsDataURL
      → store.fsWriteFile(dir, name, content, {icon,type,src}) → 既有 POST /fs 整节点写入
  → blob 通道：uploadOne()
      POST /fs/upload/init      → 拿 uploadId/chunkSize/chunkTotal/received
      补传缺失分片（3 路并发，只传 received 之外的索引 → 天然断点续传）
      POST /fs/upload/complete  → 服务端合并 blob + 写树节点 + 存快照
      （不落本地树，故整批只同步一次）
  → 批次收尾：若本批有过 blob 上传，GET /state 整树覆盖本地 fsTree
  → showToast 汇总成功数与失败原因（最多展示前 2 条错误）
```

> 依赖 `window.__xp`（store chunk 暴露的全局），以 200ms 轮询等待就绪（chunk 加载顺序不确定），不改动 store 本身。

**取消语义**：取消时**不调用 `/fs/upload/abort`**——保留服务端会话，用户重新拖入同一文件即可从断点继续，遗留分片由服务端 24 小时 TTL 的 `cleanExpired()` 回收。取消是用户主动行为，不计入错误上报。

**整树同步的必要性**：`fsWriteFile` 的第四参只认 `icon`/`type`/`src`/`appId`，不支持 `blobId`/`bytes`，本地插节点会把 blob 文件退化成空内容文件；产物内也没有 reload/hydrate 入口。故 blob 上传后统一 `GET /state`，图标、类型、大小口径完全由服务端 `inferFileType`/`formatBytes` 决定。

**右键「下载到本地(L)」**：blob 节点走 `GET /fs/blob/{blobId}` 触发浏览器下载（`upload-r3.js` 导出 `window.__xpUploadBridge = { download: downloadNode }`）；内嵌节点仍走前端 Blob 直存。

### 4.5 桌面图标下发流程

```
后台管理「桌面图标管理」页面配置图标（frame/web/path 三类）
  → DesktopIconApiController CRUD → app_cmspro_windowsxponline_desktop_icons 表
  → 用户访问桌面入口（DashboardController / User/DesktopController）
    → DesktopIcon::getDesktopItems() 取启用图标列表
    → Blade 模板注入 localStorage.setItem('xp.desktopIcons', @json($desktopIcons))
      → 前端 XP WebOS 产物加载
        → deskicons-r1.js（window.__xpDeskIcons）读取 localStorage
        → 桌面 sys 数组展开 ...window.__xpDeskIcons.items(iconRenderer, openApp)
          → iconRenderer 用 JSX 运行时创建 img 元素
          → 双击图标调用 openApp()
            · frame → openApp('xpframe', {src:target, w, h}, label)
            · web   → openApp('ie', {url:target}, label)
            · path  → openApp('explorer', {path:[target]}, label)
```

> **下发时机**：Blade 页面在 `<script>` 标签中同步写入 `localStorage`，早于 iframe 加载 XP WebOS 前端产物，确保 `deskicons-r1.js` 首次执行时数据已就绪。`xpframe` 组件通过锚点替换注入到 APP_REGISTRY，渲染无边框 iframe 窗口（保留标题栏拖动/最大化/最小化/关闭），`src` 来自 `win.props.src`。

### 4.6 压缩/解压流程（两段式写入 + 失败回滚）

```
右键「发送到 → 压缩(zipped)文件夹」/ WinRAR 窗口「添加到压缩文件」
  → POST /fs/archive { paths, destPath?, name? }
      ① ArchiveService::collect()  递归收集条目（覆盖 blobId / src / content 三种内容形态）
         · 选中项自身名称作包内根级条目，文件夹内部层级原样保留
         · 跨目录同名 → 409 显式拒绝（不静默覆盖）
         · 未压缩总量 > 200MB → 409
      ② ArchiveService::build()    ZipArchive 写出二进制（临时文件，用后即删）
      ③ assertBlobFits(strlen(data))  按**压缩后真实字节**校验配额
      ④ BlobService::store()       先创建 blob 对象 + 元数据
      ⑤ attachNode() + saveState() 再写树节点、存快照
         └ 失败 → BlobService::remove() 回滚 ④ 后重抛
      ⑥ 名称去重后回写 XpFile.name（否则下载到本地得到去重前的文件名）
  → 前端 GET /state 整树同步

双击 .zip / 右键「解压到当前文件夹」「全部提取(A)...」
  → GET /fs/archive/entries?path=   列出条目（不读内容）
  → POST /fs/extract { path, destPath? }
      ① unpack() + normalizeEntryName()  逐条归一化，含 `..` 段直接丢弃（防 zip slip）
      ② ensureFolderPath(destPath, [包名去扩展名])  ← WinRAR「解压到 <名称>\」默认行为
         同名文件挡路 → 409「无法创建目标目录」
      ③ 逐条 storeEntry()：建 blob → 挂树节点
         条目路径上遇同名文件 → **跳过该条目**而非整体失败（与 WinRAR 的「跳过」一致）
         任一异常 → BlobService::removeMany() 回滚本次已建全部 blob
      ④ assertBlobFits(解出内容总字节) + saveState()
  → 响应 { extracted: 实际写入数, path: 实际落地目录 }
```

**为什么内容一律走 blob 而不内嵌**：解压可能一次产出上百个文件，若沿用「内嵌 content」的老口径，快照会迅速撞上 10 MB 硬上限而整次失败。

**为什么顺序是「先建对象、后写快照」**：反向顺序会出现「树里有节点但下载 404」的更坏结果，且无法自动修复；而对象多出来可以被 `purgeUnreferencedBlobs()` 回收。

## 五、存储驱动架构

### 5.1 接口定义

`StorageDriverInterface` 定义 6 个方法：read、write、delete、exists、getSize、getName。

### 5.2 驱动选择

`StorageManager::getDriver()` 根据 `storage_driver` 配置值选择驱动：
- `local` → LocalDriver（本地文件系统）
- `oss` → OssDriver（阿里云 OSS，需 `composer require aliyuncs/oss-php-sdk`）
- `cos` → CosDriver（腾讯云 COS，需 `composer require qcloud/cos-sdk-v5`）

驱动实例使用静态缓存，配置变更后调用 `resetDriver()` 清除缓存。

### 5.3 敏感数据加密

`oss_access_secret` 和 `cos_secret_key` 使用 Laravel `Crypt::encryptString()` 加密存储到 `config_items` 表。`StorageManager::getConfig()` 读取时自动解密；解密失败时兼容旧明文数据，返回原始值。

### 5.4 blob 对象存储层

任意格式文件的**内容不进快照**，而是作为独立对象写入与快照相同的存储驱动（local/oss/cos 三驱动通吃，无需新增驱动）。快照中只保留 `blobId` 与 `bytes` 引用，元数据（名称、MIME、大小、归属）落 `app_cmspro_windowsxponline_files` 表。

**存储键布局**（`BlobService::blobKey()` / `chunkKey()`）：

```
正式对象：{userType}/{userId}/files/{blobId}
上传分片：{userType}/{userId}/tmp/{uploadId}/{index}
```

`blobId` / `uploadId` 均为 `bin2hex(random_bytes(16))`（32 位十六进制，URL 安全）。

**键片段过滤**（`sanitizeSegment()`）：任一片段为空、超长（userType 20 / userId 100 / blobId·uploadId 64）、或含 `/`、`\`、`..` 即抛 `BlobException('... 非法', 'invalid_param')`——键片段中混入这些字符即可越出本人目录读取他人快照与文件。

**生命周期**：

| 动作 | 实现 |
|------|------|
| 分片超时回收 | `BlobService::cleanExpired()`，按 `UPLOAD_TTL_HOURS = 24` 清理进行中会话与 tmp 分片 |
| 删除文件（进回收站） | **保留 blob**——回收站还原需要内容 |
| 彻底删除 / 清空回收站 | `FsTreeService::collectBlobIds()` 收集 → `purgeUnreferencedBlobs()` 回收 |
| 复制文件/文件夹 | `BlobService::duplicate()` 复制对象并新建元数据行（两节点各自独立，删一个不影响另一个） |
| 写入失败回滚 | `BlobService::remove()` / `removeMany()` |

> ⚠️ `purgeUnreferencedBlobs()` 必须在 `saveState()` **之后**调用：它会重扫全树判断 blob 是否仍被引用，若快照尚未落盘，刚删掉的节点仍在旧树里，对象永远不会被回收。

> ⚠️ `BaseController::purgeUnreferencedBlobs()` 采用「引用计数式」判定：只有当某 blobId 在**整棵树（含回收站）**中都不再出现时才删除对象。

## 六、数据表

### app_cmspro_windowsxponline_user_spaces

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_type | varchar(20) | 用户类型（admin/user） |
| user_id | bigint | 用户 ID |
| username | varchar(100) | 用户名 |
| quota_mb | int | 空间配额（MB），0=不限 |
| used_mb | int | 已用空间（MB） |
| status | tinyint | 状态（1=启用, 0=禁用） |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

模型 `UserSpace` 使用 `CREATED_AT='create_time'`、`UPDATED_AT='update_time'`，`$casts` 统一 datetime 为 `Y-m-d H:i:s` 格式。

### app_cmspro_windowsxponline_files（blob 元数据）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_type | varchar(20) | 归属身份类型，默认 `user` |
| user_id | varchar(100) | 归属身份 ID |
| blob_id | varchar(64) | 对象标识，**唯一索引** `uk_files_blob_id` |
| name | varchar(255) | 文件名（下载时写入 `Content-Disposition`） |
| mime | varchar(128) | 上传时的 MIME（仅记录，下载一律 octet-stream） |
| size_bytes | bigint unsigned | 字节数，参与配额汇总 |
| status | tinyint | 0=已删除, 1=正常 |
| create_time / update_time | datetime | 时间戳，可空 |

索引 `idx_files_owner_status (user_type, user_id, status)` 支撑配额汇总与归属查询。

本表只存元数据，blob 本体在存储驱动中。存在意义有三：① 按 blobId 反查文件名与 MIME（下载响应头需要）② 汇总 `Σ size_bytes` 参与配额口径 ③ 彻底删除/清空回收站时定位待清理对象。

> ⚠️ `user_id` 用 **varchar** 而非 bigint：免登录版（anon）的身份是 XP 帐户名字符串而非自增整数，与 `user_spaces` 的 `unsignedBigInteger` 口径不同，不可照搬。

### app_cmspro_windowsxponline_uploads（分片上传会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| upload_id | varchar(64) | 会话标识，**唯一索引** `uk_uploads_upload_id` |
| user_type / user_id | varchar(20) / varchar(100) | 归属身份 |
| name | varchar(255) | 目标文件名 |
| parent_path | varchar(1024) | 目标目录，路径段数组的 JSON 字符串 |
| size_bytes | bigint unsigned | 声明的总字节数 |
| chunk_size | int unsigned | 分片大小 |
| chunk_total | int unsigned | 分片总数 |
| received_mask | text | 已接收分片索引的 JSON 数组，可空 |
| blob_id | varchar(64) | 合并后的对象标识 |
| status | tinyint | 0=进行中, 1=已完成, 2=已取消 |
| create_time / update_time | datetime | 时间戳，可空 |

索引 `idx_uploads_owner_status (user_type, user_id, status)` 支撑会话复用与超时清理；`idx_uploads_create_time` 支撑按时间扫描过期会话。

会话落库是**真断点续传**的前提：关浏览器、断网、隔天回来都能继续传，同时为 tmp 分片的超时清理提供精准归属依据。

> ⚠️ **索引名必须带表义前缀**：MySQL 索引名表内唯一，但 SQLite（测试用内存库）**全库唯一**，重名直接建表失败。

**迁移执行机制**：`Install.php::runMigrations()` 用 `glob($migrationsPath . '/*.php')` 自动扫描 `Migrations/` 目录，按 `migrations` 表记录跳过已执行项，逐个 `require` 后调 `up()` 并插入记录；`rollbackMigrations()` 用 `array_reverse(glob(...))` 逆序调 `down()`。**新增迁移文件无需修改 `Install.php`**，应用升级时自动兜底建表。各迁移均带幂等保护（`if (Schema::hasTable(self::TABLE)) return;`），MySQL 下额外执行 `ALTER TABLE ... COMMENT` 补表注释。

### app_cmspro_windowsxponline_desktop_icons（桌面图标）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| name | varchar(100) | 图标显示名称 |
| type | varchar(20) | 图标类型：`frame`（框架页面）/ `web`（网页快捷方式）/ `path`（路径快捷方式） |
| target | varchar(500) | 目标地址：frame/web 为 URL，path 为本地路径 |
| icon_url | varchar(255) | 图标文件 URL（相对路径，存 `public/uploads/` 下） |
| window_width | int | 窗口宽度（像素），0 表示使用默认值 |
| window_height | int | 窗口高度（像素），0 表示使用默认值 |
| sort | int | 排序值（升序） |
| status | tinyint | 状态（1=启用, 0=禁用） |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

模型 `DesktopIcon` 使用 `CREATED_AT='create_time'`、`UPDATED_AT='update_time'`，提供 `getDesktopItems()`（返回启用图标数组）和 `toDesktopItem()`（转为前端下发格式）。

图标文件上传到 `public/uploads/cmspro.windowsxponline/desktop_icons/{Y/m/d}/` 目录，支持 ico/png/jpg/jpeg/gif/svg/bmp/webp 格式，单文件上限 2MB。因系统 `AttachmentService` 的图片扩展名白名单不含 `.ico`，故 API 控制器自行落盘、不入系统附件表。

**安全防护**：`target` 字段按 `type` 区分校验——frame/web 类型须 `http(s)://` 或 `/` 开头，path 类型须 `/` 开头；拒绝 `javascript:`、`data:` 等伪协议注入。

## 七、视图规范

所有后台/用户端视图均为独立完整 HTML 文档，不使用 `@extends('layouts.admin')`。统一引用 CmsProUi 资源（pear.css、layui.js、pear.js）和 Admin 样式（admin.css、variables.css、reset.css）。

Blade 模板中 `<script type="text/html">` 块使用 `@verbatim ... @endverbatim` 包裹，避免 Layui 模板语法 `{{ }}` 与 Blade 冲突。

## 八、安全机制

1. **权限控制**：后台路由组添加 `permission` 中间件，用户端路由使用 `auth:web` + `front_user_status` 认证（框架前台用户标准 guard 为 `web`）
2. **CSRF 防护**：`api/user/*`、`admin/*/api/*` 路径在 `bootstrap/app.php` 配置 CSRF 豁免（XP API 为纯 API 调用）；后台页面表单使用 CSRF Token
3. **敏感数据加密**：云存储密钥使用 `Crypt::encryptString()` 加密存储，展示时脱敏为 `******`
4. **数据隔离**：XP 桌面状态数据按用户 ID 隔离存储，单机版使用超管 ID
5. **配置白名单**：`SettingApiController` 使用 `ALLOWED_KEYS` 常量限制可写入的配置项
6. **帐户隐私隔离**：虚拟文件系统中 `C:/Documents and Settings` 仅保留当前登录帐户空壳（只含 `NTUSER.DAT`），其他帐户目录经 `GET /state` 加载迁移移除；用户配置文件（桌面/My Documents/Favorites/Application Data）统一映射到 `本地磁盘 (D:)/{帐户名}`；C 盘写操作由前端 store fs 动作守卫拦截（拒绝访问），详见 operations.md 2.5
7. **游客功能服务端裁决**：`xp_guest_enabled` 关闭时（出厂默认），Guest 在 `AccountController::list()`、`StateService::stripAccounts()`、`AccountController::login()` 三处同时被拦截，前端隐藏之外另有服务端兜底，防止绕过界面手工调用接口登录游客（详见 API 文档 4.3）
8. **导入路径写保护**：本地文件导入桥与 store 的 C 盘守卫口径一致，`本地磁盘 (C:)`、`回收站`、`网上邻居` 为只读根，导入目标命中即拒绝并提示，不发起写请求
9. **blob 归属校验**：`BlobService::findMeta()` / `findUpload()` 一律带 `user_type + user_id` 条件查询，越权与不存在同样返回 null（不泄露「该对象是否存在」），从根上阻断遍历 blobId 下载他人文件
10. **存储键片段过滤**：`sanitizeSegment()` 拒绝空值、超长、含 `/`、`\`、`..` 的键片段，阻断经由 userType/userId/blobId/uploadId 的路径穿越
11. **下载强制二进制**：`GET /fs/blob/{blobId}` 一律返回 `application/octet-stream` + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` + `Cache-Control: no-store`。若按上传时真实 MIME 回显，用户存入的 HTML/SVG 会在本应用源下执行脚本，形成存储型 XSS
12. **响应头注入防护**：`contentDisposition()` 将文件名中的 `\`、`"` 与控制字符（`\x00-\x1F\x7F`）替换为 `_`，全空白时回退 `download.bin`——混入 CRLF 可注入任意响应头（响应拆分），混入引号会截断 filename 值；非 ASCII 名经 RFC 5987 的 `filename*` 传递
13. **zip slip 防护**：`ArchiveService::normalizeEntryName()` 把 `\` 统一为 `/`，跳过 `.` 段与空段，**出现 `..` 段直接返回 null 丢弃该条目**；名称再经 `sanitizeFileName()` 清洗（分隔符转 `_`、剔除控制字符、`rtrim('. ')`）。解压产物只能落在目标目录内
14. **访客只读服务端兜底**：上传、压缩、解压三个写入口均在控制器层显式判 `StateService::isGuestReadonly()` 并返回 409，不依赖前端隐藏菜单

## 九、前端产物与补丁机制

### 9.1 为什么需要打补丁

`Assets/` 下的 XP WebOS 前端为 Next.js（Turbopack）**静态导出产物**，`Frontend/src` 源码不完整（缺少部分页面与组件实现），无法通过「改源码 → 重新构建」的常规路径迭代。因此桌面交互层的功能调整采用**对压缩产物打补丁**的方式：

- **锚点替换**：在压缩 chunk 中定位唯一的原文本片段（ordinal 精确匹配），替换为改写后的片段
- **尾部追加**：把新增的 vanilla JS 模块整体追加到 chunk 文件末尾，通过 `window.__xpXxx` 全局与产物内代码对接

两种手段都要求补丁后 `node --check <chunk>` 通过（语法自检）。

### 9.2 关键 chunk 与补丁分布

`Assets/_next/static/chunks/` 下 10 个 chunk，补丁集中在 3 个：

| 文件 | 字节数 | 角色 | 补丁内容 |
|------|--------|------|----------|
| `7f0bf4f0a6726f51.js` | 975336 | 主 chunk | 加载顺序修复 3 处行内替换；锚点补丁 pairs6（IE 主页 4 处）+ pairs7（快捷方式向导 2 处）+ pairs8（导入桥入口 1 处）+ pairs9（WinRAR 分发与右键菜单 6 处）+ pairs11（xpframe 组件注册 + 桌面图标注入 2 处）；尾部追加 `wizard-r1.js`（`__xpShortcutWizard`）、`upload-r3.js`（`__xpUploadBridge`）、`winrar-r1.js`（`__xpWinrar`）、`deskicons-r1.js`（`__xpDeskIcons`） |
| `e01873ec359d331e.js` | 74245 | store chunk | 11 处 C 盘只读守卫（全部 fs 写动作入口） |
| `f39f1fc36e603918.js` | 30873 | 路径 helper | D 盘帐户目录映射 + pairs10（压缩包类型识别与 blob 节点大小显示 2 处） |

**pairs9 的 6 处锚点**（WinRAR 接入产物）：zip 双击分发拦截、右键「发送到 → 压缩(zipped)文件夹」、右键「解压到当前文件夹」、右键「全部提取(A)...」、`openFile` 未知类型兜底、扩展名映射补 `rar`/`7z`。

> ⚠️ JS 对象字面量中 `7z:` 是**非法键名**（数字开头会被解析为数字字面量），必须写成 `"7z":`，否则 `node --check` 直接 `SyntaxError`。

### 9.3 补丁脚本工艺

补丁脚本与中间产物统一存放于 `storage/tmp/`（应用导出时排除，不进版本产物）：

- `p6.ps1 <Target> <BackupTag> <PairDir>`：读取 `PairDir/*.old.txt` 与同名 `*.new.txt`，逐个校验 ordinal 命中数**必须 == 1**（0 或 >1 均判 FAIL 并中止），命中后整串替换
- `p5.ps1`：加载顺序修复的三处行内替换（同款命中数校验）
- `append.ps1 <Target> <Source> <BackupTag> <Guard>`：以 `Guard` 字符串（如 `xpup-style`）做幂等判断，未追加过才把 `Source` 拼到文件末尾
- `mkcount.ps1 <Target> <Needle>`：实测某字符串在产物中的 ordinal 出现次数，用于**证明 marker 期望值**（不靠预估）
- `apply-r1.ps1` / `apply-r2.ps1` / `apply-r3.ps1` / `apply-r4.ps1`：完整流水线——追加脚本先 `node --check` 自检 → 从 `storage/tmp/bak/` 的基线副本恢复目标 chunk（保证可重复执行）→ 打锚点补丁 → 追加模块 → 最终 `node --check` → 校验标记字符串出现次数 → 把 `p6.ps1`/`append.ps1` 产生的 `.bak` 移出公开 chunks 目录（末步输出 `BAK_LEFT=0` 为合格）

`apply-r4.ps1` 的七步流水线（当前最新，在 r3 基础上新增 pairs11 + `deskicons-r1.js`，同样同时改主 chunk 和 helper）：

```
① node --check upload-r3.js / winrar-r1.js / deskicons-r1.js  → UP_EXIT / WR_EXIT / DI_EXIT
② 还原基线：主 chunk ← .r2.bak；helper ← .orig.bak   → RESTORED_MAIN / RESTORED_HELP
③ 锚点补丁：p6 主chunk pairs8 / pairs9 / pairs11；p6 helper pairs10 → P8_EXIT / P9_EXIT / P11_EXIT / P10_EXIT
④ 追加模块：append 主chunk upload-r3.js(xpup-style) / winrar-r1.js(xpwr-style) / deskicons-r1.js(xpdesk-style) → AP_UP_EXIT / AP_WR_EXIT / AP_DI_EXIT
⑤ 终检：node --check 主chunk / helper               → NODE_MAIN / NODE_HELP + CHARS_*
⑥ 14 项 marker 校验（CountOrdinal 精确计数，Expect 等值 / ExpectMin 下限）
⑦ 清理公开目录残留 .bak                              → BAK_LEFT=0；全绿输出 RESULT: ALL OK
```

第 ⑥ 步的 14 项 marker（升级产物后重放必须逐项对齐）：

| marker | 目标 | 期望 |
|--------|------|------|
| `data-xp-cwd` | 主 | ≥ 2 |
| `xpsw-style` / `xpup-style` / `xpwr-style` / `xpdesk-style` | 主 | 各 ≥ 1 |
| `__xpUploadBridge` | 主 | == 4 |
| `__xpWinrar` | 主 | == 11 |
| `__xpDeskIcons` | 主 | == 6 |
| `xpframe` | 主 | == 2 |
| `下载到本地(L)` | 主 | == 2 |
| `解压到当前文件夹` | 主 | == 3 |
| `WinRAR 压缩文件` / `7-Zip 压缩文件` | helper | 各 == 1 |
| `t.bytes?t.bytes` | helper | == 1 |

**基线副本（`storage/tmp/bak/`，按补丁先后顺序，字节数为实测值）**：

| 文件 | 字节数 | 含义 |
|------|--------|------|
| `7f0bf4f0a6726f51.js.r5.bak` | 879670 | **原始未打补丁**产物 |
| `7f0bf4f0a6726f51.js.ie.bak` | 879717 | 已含加载顺序修复 |
| `7f0bf4f0a6726f51.js.r1.bak` | 879899 | 再含 IE 主页补丁（`apply-r1.ps1` 的恢复基线） |
| `7f0bf4f0a6726f51.js.r1w.bak` | 879899 | 同上（wizard 阶段留存） |
| `7f0bf4f0a6726f51.js.r2.bak` | 898614 | 再含快捷方式向导（`apply-r2.ps1` → `apply-r4.ps1` **共同的恢复基线**） |
| `7f0bf4f0a6726f51.js.r3.bak` | 898614 | 同上（r3 阶段留存） |
| `f39f1fc36e603918.js.orig.bak` | 30750 | **helper 原始副本**（`apply-r3.ps1` 的恢复基线） |
| `f39f1fc36e603918.js.r3.bak` | 30750 | 同上（r3 阶段留存） |

锚点对目录（`storage/tmp/pairs*/`）：`pairs6`=4 对（IE 主页）、`pairs7`=2 对（快捷方式向导）、`pairs8`=1 对（导入桥入口，**r3 版已覆盖 r2 版**）、`pairs9`=6 对（WinRAR）、`pairs10`=2 对（helper）、`pairs11`=2 对（xpframe 注册 + 桌面图标注入）。

**完整重放顺序**（升级前端产物后，从原始 chunk 起依次执行；前两步无包装脚本，需手工调用）：

```
1. p5.ps1  <主chunk> r5                                  → 加载顺序修复（3 处行内替换）
2. p6.ps1  <主chunk> ie   storage/tmp/pairs6             → IE 默认主页（4 处锚点）
3. apply-r1.ps1                                          → 快捷方式向导（pairs7 + wizard-r1.js）
4. apply-r2.ps1                                          → 本地文件导入 r2（pairs8 旧版 + upload-r2.js）
5. apply-r3.ps1                                          → blob 上传 r3 + WinRAR（pairs8/9/10 + upload-r3.js + winrar-r1.js）
6. apply-r4.ps1                                          → 桌面图标注入（pairs11 + deskicons-r1.js）
```

> 第 4–6 步实际可合并：`apply-r4.ps1` 第 ② 步就是从 `.r2.bak` 恢复主 chunk，即它已内含第 3–5 步的成果；`pairs8` 也已被 r3 版覆盖。因此**日常只需跑最后一步 `apply-r4.ps1`**，第 1–5 步仅在需要从原始产物完整重建时执行。

> ⚠️ **`e01873ec359d331e.js`（store chunk）的补丁仍未保留重放资产**：11 处 C 盘只读守卫当时以临时命令直接写入，既无 `pairs` 锚点对目录，也无打补丁前的原始副本，因此**无法机械重放**，升级前端产物后须重新定位锚点手工改写。存活校验信号：store chunk 中 `本地磁盘 (C:)` 出现 23 次（含 11 处守卫）。
>
> helper chunk（`f39f1fc36e603918.js`）的 D 盘帐户目录映射同样无独立锚点对，但**已有 `.orig.bak` 原始副本**，可先 diff 出改动再重建 pairs；主 chunk 的全部补丁资产完整（`bak/` 基线 + `pairs6/7/8/9` + 三个追加模块），可原样重放。

**干跑（dry run）工艺**：新补丁一律先在 `storage/tmp/dry/{main.js,helper.js}` 副本上跑完整链路（`p6` + `append` + `node --check`），全绿后才写正式 `apply-rN.ps1`。直接在公开 chunks 上试错会污染 Web 可访问目录，且失败态难以回滚。

> **PowerShell 变量名陷阱**：`$C`（chunks 目录）与循环计数器 `$c` 在 PowerShell 中是**同一个变量**（大小写不敏感），末步再用 `$C` 会拿到数字而报 `Cannot find path '...\2'`。`apply-r3.ps1` 全面改用互不冲突的名字（`$WK/$CK/$MAIN/$HELP/$BAK/$UP/$WR/$sm/$sh/$mkCount`）。

> **probe 调用陷阱**：用 PowerShell 探测产物中的字符串时，needle 若含 `"`、`{`、`(`、`if(` 会被解析为脚本块，**一律用单引号包裹**。

### 9.4 补丁约束（务必遵守）

1. **锚点唯一性**：替换前必须统计命中数，非 1 即中止，禁止「替换全部匹配」
2. **含中文的 `.ps1` 必须存为 UTF-8 带 BOM**：PowerShell 5.1 读取无 BOM 的 `.ps1` 时按 ANSI/GBK 解码，UTF-8 中文字节序列的末尾前导字节会与紧随的 `\n`(0x0A) 配成 GBK 双字节，**吃掉换行**，把下一行代码并入注释 → 命令静默不执行且无任何报错。
   - 诊断利器：`[System.Management.Automation.Language.Parser]::ParseFile()` + `FindAll({$n -is [...CommandAst]}, $true)` 打印 `Extent.StartLineNumber`，**行号整体前移即证明有行被吞**
   - `apply-r3.ps1` 含中文 marker（`下载到本地(L)`、`解压到当前文件夹`、`WinRAR 压缩文件`），以 UTF-8 带 BOM 保存（4237 字节）后执行结果 `RESULT: ALL OK`
   - **PHP / JS 文件仍按项目规范用 UTF-8 无 BOM**，本条只适用于 `.ps1`
   - `pairs*/**.txt` 数据文件由脚本显式以 UTF-8 无 BOM 读写，不受此约束
3. **公开 chunks 目录禁止残留 `.bak`**：备份一律迁至 `storage/tmp/bak/`，`Assets/` 会被 Web 直接访问
4. **每次补丁后必跑 `node --check`**，并记录文件字节数，便于回归比对
5. **marker 期望值必须实测、不得预估**：写 `apply-rN.ps1` 前先用 `mkcount.ps1` 数出真实出现次数（历史上 `__xpWinrar` 预估 10 实为 11、`解压到当前文件夹` 预估 1 实为 3）
6. **升级前端产物即丢失全部补丁**：若日后重新构建 `Assets/`，须按 9.3 的脚本重放补丁，并逐项回归本文档与 operations.md 记录的行为
