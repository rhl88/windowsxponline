# Windows XP 在线版 · 运维文档

> app_id: `cmspro.windowsxponline` · 版本 1.0.0

## 一、安装与卸载

### 1.1 安装

通过 CMSPRO 后台「应用管理」安装本应用。安装流程由 `Install.php` 驱动：

1. 执行数据库迁移：`runMigrations()` 用 `glob(Migrations/*.php)` 扫描全部迁移文件并逐个执行 `up()`，当前创建 4 项结构——`app_cmspro_windowsxponline_user_spaces`（用户空间配额）、`create_time` 索引、`app_cmspro_windowsxponline_files`（blob 元数据）、`app_cmspro_windowsxponline_uploads`（分片上传会话）。已执行的迁移按 `migrations` 表记录自动跳过，**新增迁移文件无需改 `Install.php`**
2. 注册权限：将 manifest.json 声明的 3 个权限写入 `admin_permissions` 表
3. 注册菜单：将后台菜单和用户端菜单写入对应菜单表
4. 初始化默认配置：写入 `config_items` 表（使用 `first()+update()`，已有配置不覆盖）

> ⚠️ 迁移不走 `Artisan::call('migrate')`：Windows 路径分隔符会导致其失败，故直接 `require` 迁移文件后调用 `up()`。

### 1.2 卸载

卸载时清理：
- 用户空间数据表、blob 元数据表、上传会话表（`rollbackMigrations()` 逆序 `glob` 扫描并执行 `down()`）
- 权限记录
- 菜单记录
- 配置项记录
- 运行时数据目录（`windowsxponline_data`）——快照与 blob 对象同在此目录下

### 1.3 升级

`Install.php` 的 `upgrade()` 直接等价于重跑 `install()`：迁移、遗留配置清理、菜单权限码绑定三者均幂等，当前无按版本区间分支的增量迁移。配置项使用 `seedDefaultConfigs()` 补充新增配置项，已有配置值不覆盖。

**升级后必须重放前端补丁**：`Assets/` 下的 Next.js 产物由构建生成，若重新构建或覆盖产物，所有 `apply-rN.ps1` 补丁会丢失，需按 architecture.md 9.3 的重放顺序恢复（日常只需跑最后一步 `apply-r3.ps1`）。

## 二、配置说明

### 2.1 配置层级

配置值优先级：数据库 `config_items` 表 > 代码层 `Config/windowsxponline.php`。

配置项 code 规则：`app_cmspro_windowsxponline_{name}`。

### 2.2 配置项清单

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| access_mode | select | online | 访问模式：online（多用户）/ standalone（仅超管）/ anonymous（免登录，Windows 帐户验证） |
| access_path | text | 空 | XP 桌面前端自定义访问路径，留空则使用默认 /apps/cmspro.windowsxponline/index.html |
| bind_domain | text | 空 | 应用绑定域名（纯域名格式，如 xp.example.com，无需 http/https 前缀），留空则使用相对路径 |
| xp_admin_password | text | 空 | 前台 XP 桌面 Administrator 帐户登录密码（数据库加密存储、后台明文回显），留空则沿用初始默认密码；Guest 帐户为只读模式，其写入均为临时数据不持久化 |
| xp_quicklaunch_defaults | text | showdesktop,ie,wmp | 任务栏快速启动区默认快捷方式（逗号分隔 appId），对新初始化用户与桌面内新建帐户生效；`showdesktop`（显示桌面）为固定必选项，老用户仅自动补齐该项 |
| xp_ie_homepage | text | https://www.cmspro.cn/ | 桌面 IE 的默认主页，可填域名（`www.cmspro.cn`）或完整网址；保存后强制同步到所有用户，留空恢复出厂默认（详见 2.6） |
| xp_guest_enabled | select | 0 | 游客功能开关：0=关闭（登录页不显示 Guest 且拒绝其登录）/ 1=开启（详见 2.7） |
| storage_driver | select | local | 存储驱动：local / oss / cos |
| default_space_quota | number | 100 | 新用户默认空间配额（MB），0=不限 |
| oss_access_key | password | 空 | 阿里云 OSS AccessKey ID |
| oss_access_secret | password | 空 | 阿里云 OSS AccessKey Secret（加密存储） |
| oss_bucket | text | 空 | OSS 存储空间名 |
| oss_endpoint | text | 空 | OSS 端点域名 |
| cos_secret_id | password | 空 | 腾讯云 COS SecretId |
| cos_secret_key | password | 空 | 腾讯云 COS SecretKey（加密存储） |
| cos_bucket | text | 空 | COS 存储桶名 |
| cos_region | text | 空 | COS 地域 |

### 2.3 敏感数据加密

`oss_access_secret`、`cos_secret_key` 和 `xp_admin_password` 在写入数据库时使用 `Crypt::encryptString()` 加密，读取时使用 `Crypt::decryptString()` 解密。读取时若解密失败（如旧明文数据），兼容返回原始值。

后台设置页面中 `oss_access_secret`、`cos_secret_key` 显示为 `******`，保存时值为 `******` 的字段会被跳过（不覆盖已有值）；`xp_admin_password` 为明文回显（便于管理员查看），清空保存即恢复初始默认密码。

### 2.4 快速启动默认项机制

后台「应用设置 → 基础设置」提供快速启动默认项复选组，`显示桌面` 固定勾选（不可取消），其余候选为 Internet Explorer / Windows Media Player / 记事本 / 计算器 / 命令提示符 / 任务管理器，保存为 `xp_quicklaunch_defaults`（逗号分隔 appId，`showdesktop` 恒在首位）。

生效规则：

- **新初始化用户与桌面内新建帐户**：D 盘帐户目录（`本地磁盘 (D:)/{帐户}/Application Data/Microsoft/Internet Explorer/Quick Launch`）按配置完整播种快捷方式；配置中的非法 appId 保存时被设置接口拦截（`40001`），解析时未知项丢弃、去重。
- **老用户（已有状态快照）**：新勾选的默认项在 `GET /state` 加载路径**增量补入**并落盘，覆盖 `本地磁盘 (D:)` 下每个 XP 帐户目录（Administrator/Guest 等，每帐户独立同步；每项仅同步一次，以快照顶层 `qlDefaultsApplied` 按帐户名记录的标记映射记录已同步集合）；用户之后手动删除的已同步项不会复活；后台取消再勾选的项会重新同步补入。用户删除整个 Quick Launch 文件夹则尊重其操作不再补。旧种子快照中任务栏「显示标题」配置（`tbTitles` 恰为 quick=true 三键特征）会一次性归一化为 XP 出厂态（快速启动不显示「快速启动」文字），用户自行开关过标题的快照不受影响。
- **用户拖拽**：前端将 Quick Launch 视为真实文件夹，拖入/移除快捷方式经 `/fs` 接口（move/create/delete）持久化到用户快照，无需后台干预。

### 2.5 桌面驱动器布局与 D 盘配额展示

桌面「我的电脑」固定两个驱动器节点：`本地磁盘 (C:)` 为**只读系统盘**（`Program Files`、`WINDOWS` 等系统目录；容量为前端静态值）；`本地磁盘 (D:)` 为**用户数据盘**，承载全部用户可写数据与后台「空间管理」分配的用户配额：`GET /state` 响应时向 D 盘节点动态注入 `total`（= `quota_mb`×1MiB，`quota_mb=0` 不限制时显示标称 40 GiB）与 `used`（= `used_mb`×1MiB），前端磁盘属性对话框按节点字段覆盖静态容量展示。注入字段**仅存在于响应态**，`saveState` 落盘前剥离，防止前端整表回传把配额固化进快照。

#### 2.5.1 C 盘只读（前端拦截）

前端 zustand store 的全部 11 个文件系统写动作（`fsCreateFolder`/`fsCreateFile`/`fsCreateShortcut`/`fsWriteFile`/`fsRename`/`fsDuplicate`/`fsDelete`/`fsDeletePermanent`/`fsMove`/`fsPaste`/`fsRestore`）在入口处判定路径首段是否为 `本地磁盘 (C:)`（删除/移动类为源或目标任一侧命中；回收站还原按 `origKey` 前缀命中），命中即拒绝并弹出「本地磁盘 (C:) — 拒绝访问。」错误提示。该拦截**仅在前端**实现，后端 `/fs` 接口不做 C 盘写校验（历史快照与外部调用口径不变）。

#### 2.5.2 用户配置文件映射到 D 盘

- **D 盘帐户目录**：每个 XP 帐户在 `本地磁盘 (D:)/{帐户名}` 下拥有标准结构——`桌面`、`My Documents`（欢迎.txt/图片收藏/My Music）、`Favorites`（链接）、`Application Data`（隐藏；Microsoft/Internet Explorer/Quick Launch）。桌面图标、我的文档、收藏夹、快速启动全部落在此处。
- **C 盘 DNS 空壳**：`本地磁盘 (C:)/Documents and Settings` 下**仅保留当前登录帐户**一个同名文件夹，且只含系统文件 `NTUSER.DAT`（隐藏+系统），不再存放任何用户内容——资源管理器中看不到其他帐户，实现帐户隐私隔离。
- **存量迁移**：`GET /state` 加载迁移（`StateService::applyStateMigrations`）自动将老快照中 C 盘帐户目录下的 `桌面`/`My Documents`/`Favorites`/`Application Data` 四项搬移到 D 盘同名帐户目录（同名文件夹递归合并、冲突时 D 盘侧优先），搬移后 C 盘帐户目录仅剩 `NTUSER.DAT`；其他帐户的 C 盘目录整体移除。前端 hydration（`ensureUserHomes`）对未刷新到后端迁移的旧产物做同样的补建+搬移兜底。
- **帐户联动**：桌面内新建帐户同时在 C 盘 DNS 建空壳、D 盘建标准帐户目录；改名/删除对双路径（`C:/Documents and Settings/{名}` 与 `D:/{名}`）联动处理；回收站还原遇原路径失效时回退到 D 盘桌面。

老快照布局自愈：`GET /state` 加载迁移自动移除「3.5 软盘 (A:)」节点、将「光盘驱动器 (D:)」替换为「本地磁盘 (D:)」（无 D 盘节点时自动补建）；用户自行改名的驱动器节点不触碰。免登录版（anonymous）无 UserSpace 配额，D 盘恒显示标称容量。

### 2.6 IE 默认主页与强制同步

出厂默认主页 `https://www.cmspro.cn/`（`InitialStateProvider::IE_HOMEPAGE_DEFAULT`）。后台「应用设置 → 基础设置 → IE 默认主页」可改为任意域名或完整网址，留空即恢复出厂默认。

**为什么必须带 `https://`**：桌面 IE 以 iframe 承载真实网页，站点部署在 HTTPS 下时 `http://` 主页会被浏览器混合内容策略拦截而白屏。后台只填域名时，读取侧 `normalizeIeHomepage()` 自动补 `https://`（**入库保存原始输入**，协议补全不落库，便于管理员看清自己填了什么）。

生效规则：

| 场景 | 行为 |
|------|------|
| 新用户初始化 | `ie.home` 与收藏夹首项均取配置值；收藏夹标题取 `parse_url` 的 HOST（失败回退完整地址） |
| 老用户加载桌面 | 快照顶层 `ieHomeApplied`（已生效的配置值）与当前配置不一致 → 覆盖 `ie.home` 并更新标记后落盘；一致 → 不动 |
| 用户桌面内自定义 | 「Internet 选项」改主页写入 `ie.home`，`ieHomeApplied` 不变，只要后台配置不再变动就**永久保留** |
| 「使用默认页(D)」按钮 | 恒取快照下发的 `ie.defaultHome`（= 后台配置值），与用户当前 `home` 无关 |

即「后台改一次 → 所有用户下次加载即生效；之后用户仍可自定义 → 直到后台再次改动」。该口径经用户确认为**强制覆盖所有用户**。

### 2.7 游客功能开关

`xp_guest_enabled` 出厂默认 `0`（关闭）。关闭时登录页不显示 Guest 磁贴，且服务端三处同时拦截（帐户列表、状态快照、登录入口），绕过前端直接调接口登录 Guest 亦返回 `reason=no-user`。

- 关闭期间 Guest 的**种子数据完整保留**（快照 `accounts`、免登录版 `anon/accounts.json`），后台改回 `1` 即刻恢复可见与可登录，无需重置桌面
- 开启后 Guest 仍为只读帐户：在线版/单机版下其写接口一律不持久化；免登录版（anonymous）下 Guest 是独立帐户、状态正常持久化（见 3.3）
- 开关对三种访问模式（standalone / online / anonymous）一致生效

### 2.8 本地文件导入（拖放 / 粘贴 / 快捷键）

把本机文件送进在线 XP 桌面的三种方式，均由前端补丁脚本 `upload-r3.js`（`window.__xpUploadBridge`）在 window 捕获阶段实现：

| 方式 | 触发 | 目标目录 |
|------|------|----------|
| 拖放 | 从操作系统拖文件到桌面或资源管理器窗口 | 命中 explorer 窗口（`[data-xp-cwd]`）取该窗口目录，否则回落当前帐户桌面 |
| 粘贴 | `Ctrl/Cmd+V`（剪贴板确有文件时才接管，纯文本粘贴照常交给应用；截图工具写入的 `image/png` 亦支持） | 同上，按 `document.activeElement` 定位 |
| 快捷键选择框 | `Ctrl/Cmd+Shift+V`（macOS / Windows / Linux 三平台通用） | 同上 |

#### 2.8.1 双通道落地

`handleOne()` 按「大小 + 数据源」把每个文件分流到两条通道之一：

| 通道 | 命中条件 | 落地方式 | 上限约束 |
|------|----------|----------|----------|
| 内嵌通道 | 0 字节文件、≤ 2 MB 的文本/图片、或数据源为本地演示（`localStorage.xp.apiBase === 'local'`） | 走既有 `POST /fs` 整节点写入：文本写 `content`，图片写 `src`（base64 dataURL） | 单文件 2 MB（`INLINE_MAX`），且吃 10 MB 快照硬上限（`StateService::MAX_STATE_BYTES`） |
| blob 通道 | 其余**任意格式、任意大小** | 分片上传 `POST /fs/upload/init\|chunk\|complete`，树节点只留 `blobId` / `bytes` 引用 | 仅受后台配额 `default_space_quota`（默认 100 MB）与服务端合并上限 200 MB（`BlobService::MAX_MERGE_BYTES`）约束 |

> 保留内嵌通道的原因：**记事本与图片查看器直接读 `content` / `src` 两个字段**，若一律改走 blob 会让既有能力退化打不开。0 字节文件也走内嵌，并按扩展名给图标，避免 0 字节 `.png` 显示成文本文档。

本地演示数据源没有后端可分片上传，故超限与非白名单类型分别提示「"xxx" 超过 2 MB，本地数据源无法上传到服务端」与「"xxx" 无法导入：本地数据源仅支持 2 MB 内的文本与图片」。

#### 2.8.2 blob 通道行为

- **分片与并发**：分片 4 MB（`BlobService::CHUNK_SIZE`），3 路并发（`CHUNK_PARALLEL`）；多文件之间**串行**导入，避免同时占用过多内存
- **真断点续传**：上传会话落 `uploads` 表，`init` 时若存在「同名 + 同目录 + 同大小」的进行中会话则复用并返回已收分片列表，客户端只补缺失片
- **取消不调 `abort`**：点进度框「取消」后保留服务端会话与已传分片，用户重新拖入同一文件即从断点继续；遗留会话由 `UPLOAD_TTL_HOURS = 24` 的 `cleanExpired()` 定期回收
- **XP 风格「正在复制」进度对话框**（`#xpup-copy`）：标题「正在复制 第 N 个，共 M 个」+ 当前文件名 + 百分比进度条 + 取消按钮；取消后标题变「正在取消...」，正文提示「已传输的分片会保留，重新拖入同一文件可续传」
- **整树同步**：产物内没有 reload/hydrate，且 `fsWriteFile` 的第四参只认 `icon/type/src/appId`、不支持 `blobId/bytes`，本地插节点会把 blob 文件退化成空内容文件 → **批次全部结束后统一 `GET /state` 覆盖本地 `fsTree`**（每个文件都同步会重复渲染），图标、类型、大小口径完全由服务端 `inferFileType` / `formatBytes` 决定
- **重名去重交给服务端**：由 `FsTreeService::dedupeName()` 统一改名（序号从 ` (2)` 起），客户端不再自算，避免两侧口径不一致；`complete` 返回的 `name` 会回写 `XpFile.name`，保证下载文件名与桌面所见一致
- **游客只读兜底**：Guest 快照不落盘，若允许上传会产生无人引用的孤儿 blob，故 `init` 入口直接返回 409

#### 2.8.3 其余约束

- **支持任意后缀**（含 exe/zip/doc/7z 等），当成在线电脑的真实文件系统对待；双击无对应程序时按 XP 行为弹提示，**不新增预览查看器**；右键「下载到本地(L)」可原样取回（`GET /fs/blob/{blobId}`，强制 `application/octet-stream + attachment + nosniff`，防存储型 XSS）。文件夹不可下载，提示「文件夹不能直接下载，请先压缩为 zip 文件。」
- **不支持文件夹**：`inspectDrop()` 用 `webkitGetAsEntry` 剔除目录（浏览器会把文件夹塞进 `dataTransfer.files` 表现为 0 字节 File，不过滤会生成同名空文件），提示「不支持直接拖入文件夹 / 请先在本地压缩为 zip 再拖入，然后在本机 XP 内右键解压。」
- **文本编码**：UTF-8 优先，解码结果含替换字符（U+FFFD）时回退 GBK（XP 时代文本多为 GBK）
- **只读目录拒绝**：`本地磁盘 (C:)`、`回收站`、`网上邻居`（`DENY_ROOTS`）不可导入，拖入时遮罩变红提示「无法放置到此处」，不静默改投桌面
- **内部拖放不受影响**：产物自有的 `application/x-xp-paths` 自定义 MIME 拖放（窗口间移动文件）被识别后放行给 React
- **首次引导**：进入桌面时 toast 提示「可把本地文件拖入窗口导入，或按 Ctrl+Shift+V（macOS 为 Command+Shift+V）选择文件；支持任意格式，文件夹请先压缩为 zip 再拖入，可在本机 XP 内解压」，`localStorage.xpup-hint` 记录，仅提示一次
- **失败兜底**：写入异常复用既有 `xp-fs-sync-error` toast；批次结束由 `report()` 统一汇总——全部成功「已导入 N 个文件到 X」，部分失败「已导入 N 个到 X」+ **最多展示前 2 条**失败原因，全部失败「导入失败」+ 原因，树同步失败「已上传 N 个文件 / 文件树刷新失败，请刷新页面后查看。」；用户主动取消不计入错误

### 2.9 新建快捷方式（XP 三步向导）

桌面与资源管理器右键「新建(W) → 快捷方式(S)」打开仿 XP 向导（补丁脚本 `wizard-r1.js`，`window.__xpShortcutWizard`）：

1. **欢迎页**：说明快捷方式只是链接、不会移动原始项目，并显示「快捷方式将创建于：{当前目录}」
2. **选择项目位置**：可键入路径，或点「浏览(B)...」打开树形选择器（支持展开/折叠、单击选中、双击文件直接确认、Enter/Esc 快捷键）。接受 `D:\a\b.txt`、`D:/a/b.txt`、`本地磁盘 (D:)\a\b.txt` 三种写法，逐段忽略大小写匹配真实树节点；找不到时提示「Windows 找不到 'xxx'。请确定拼写是否正确，包括路径和文件位置。」
3. **键入标题**：默认取目标名去扩展名（目录名原样），可自定义；留空提示「请键入快捷方式的标题。」

创建仍走 store 的 `fsCreateShortcut` → `POST /fs`，落在右键时的当前目录。用户自定义标题会先剥离尾部 `- 快捷方式`（store 内部会自动追加该后缀，避免变成「xxx - 快捷方式 - 快捷方式」）。此前硬编码探测「网上冲浪指南.txt」的行为已移除。

### 2.10 WinRAR 压缩与解压

**视觉 1:1 仿 WinRAR，实际格式为 ZIP**：前端由补丁脚本 `winrar-r1.js`（`window.__xpWinrar`）用 vanilla DOM 自建窗口（复用 XP Luna 视觉：蓝色渐变标题栏、`#ece9d8` 面板、Tahoma 字体，不依赖产物内组件）；后端由 `ArchiveService` + PHP 内置 `ZipArchive` 驱动，**不引入外部二进制**（PHP 无法生成 RAR）。

四个入口（均由 `apply-r3.ps1` 的 pairs9 补丁接到产物上）：

| 触发位置 | 调用 | 行为 |
|----------|------|------|
| 资源管理器 / 桌面**双击** zip 图标节点 | `open(pathArr)` | 打开压缩包浏览窗口（条目列表含名称/大小/类型，目录条目灰显） |
| 右键「发送到(N) → 压缩(zipped)文件夹」 | `addTo([path], 当前目录)` | 弹「压缩包名称和参数」对话框，确定后生成同名 `.zip` |
| zip 右键「全部提取(A)...」 | `extractTo(pathArr, null)` | 弹「解压路径和选项」对话框，目标可键入或「浏览(B)...」树选择 |
| zip 右键「解压到当前文件夹」 | `extractTo(pathArr, 所在目录)` | 免对话框直接解压 |

浏览窗口内的工具栏与右键另提供「解压到当前文件夹」「解压到...」两项。解压默认落到 `压缩包所在目录 \ 压缩包名(去扩展名) \`。

关键设计取舍：

- **灰置而非隐藏**：压缩对话框里的 RAR 格式、压缩方式(M)、压缩选项(O)（自解压 / 压缩后删除源文件 / 锁定）均渲染但 `disabled`；工具栏与菜单**不提供**「测试」「删除」「修复」「追加到压缩包」——只做有后端支撑的动作，灰置是 Windows 软件表达「此选项不可用」的标准方式，比放一个假控件诚实。「关于」对话框亦如实说明「压缩与解压由服务端 ZIP 引擎驱动，不含 WinRAR 授权组件。」
- **进度用不确定态滚动条**：压缩解压是一次性同步请求，服务端不回传中间进度，画假百分比等于欺骗用户；对话框内提示「压缩与解压在服务端同步完成，完成前请勿关闭或刷新页面。」
- **不提供取消按钮**：`fetch` 中断后服务端仍会写完并落盘，「已取消但文件出现了」比没有取消更糟
- **不复用产物内的 `apiFetch`**：它把所有请求塞进一条串行队列，且压缩解压需要与上传桥一致的统一信封解析口径
- **本地演示数据源拦截**：`guardRemote(action)` 在三个入口前置判断，`apiBase === 'local'` 时提示需在线模式

服务端约束与安全：

| 项 | 值 / 行为 |
|----|-----------|
| 解压后总量上限 | `ArchiveService::MAX_TOTAL_BYTES` = 200 MB |
| 条目数上限 | `ArchiveService::MAX_ENTRIES` = 2000（同时用于避免解压撑爆 10 MB 快照上限） |
| 配额校验口径 | 压缩按**压缩后字节**、解压按解出总量，均计入 `快照 + blob 总量` |
| zip slip 防护 | `normalizeEntryName()` 拒绝含 `..` 的条目路径；列表接口同样跳过这类条目（否则用户以为能解出而实际解不出） |
| 条目落地容错 | 目标位置已有同名文件挡路或单条写入异常时**跳过该条**继续，不整体失败；整体异常时 `removeMany()` 回滚已落地的 blob |
| 中文名兼容 | `statIndex()` 加 `ZipArchive::FL_ENC_RAW` 取原始字节，避免 libzip 按 CP437 猜名把 GBK 中文变成「╓╨╬─」 |

## 三、访问模式

### 3.1 单机版模式（standalone）

- 仅超级管理员可访问 XP 桌面
- 入口：后台菜单「XP 在线版 → 桌面入口」
- API 前缀：`/api/admin/cmspro/windowsxponline/v1`
- 中间件：`web, auth:admin, permission`

### 3.2 在线版模式（online）

- 所有注册用户均可登录使用自己的 XP 桌面
- 用户端入口：用户中心菜单「我的 XP 桌面 → 进入桌面」
- API 前缀：`/api/user/cmspro/windowsxponline/v1`
- 中间件：`web, auth:web, front_user_status`
- CMSPRO 帐户登录：桌面快照 `accounts` 不含 CMSPRO 前台注册帐户；欢迎屏键入的帐户名命中框架 `users` 表（username、状态启用）时按 bcrypt 校验密码放行进入桌面，不要求与当前会话用户一致（见 API 文档 4.3 特判说明）；该帐户在快照 `本地磁盘 (D:)` 下无帐户目录时，`GET /state` 加载迁移自动补建 C 盘 DNS 空壳（仅 NTUSER.DAT）与 D 盘标准帐户目录（桌面/My Documents/Favorites/Application Data，Quick Launch 按后台配置种子），老数据刷新即自愈
- 自动登录：CMSPRO 已处于登录会话时，前端 hydrate 拉取 `/state` 成功后 boot 结束自动进入桌面，无需再次键入帐户名密码；未登录（本地引擎/免登录版/接口异常）仍停留在欢迎屏
- 欢迎屏直接登录：会话过期后无需先去 CMSPRO 前台登录页——桌面欢迎屏直接键入 CMSPRO 帐户名+密码，`POST /accounts/login` 校验通过即由服务端建立 CMSPRO 会话并整页重载进入桌面（响应 `relogin=true`，见 API 文档 4.3 relogin 契约）；XP 内置帐户（Administrator/Guest）仍需先登录 CMSPRO；密码错误计入框架登录安全失败计数，触发锁定后拒绝登录
- 静态入口直访：`/apps/cmspro.windowsxponline/index.html` 为纯静态产物，正常入口是用户中心页面路由（Blade 注入 `localStorage.xp.apiBase` 后 iframe 加载）。直接顶层访问该文件时，index.html 头部内联脚本会按路径自动写入在线版用户 API 前缀（`/api/user/cmspro/windowsxponline/v1`），避免 apiBase 缺省（`/api/v1` 命中框架兜底页）或残留后台前缀（`auth:admin` 302）导致登录接口异常；iframe 入口（`window.top !== window`）不受该脚本影响
- 后台入口 CSRF 豁免：桌面前端为静态 Next.js 产物，fetch 不携带 CSRF token；XP WebOS API 前缀（`api/user/...` 与 `api/admin/cmspro/windowsxponline/v1/...`）均已列入框架 `bootstrap/app.php` 的 CSRF 豁免清单。后台入口（`/admin/cmspro/windowsxponline`，apiBase=admin 前缀）的写接口鉴权依赖 `auth:admin + permission + EnsureXpAdminPermission`，管理员会话过期时接口返回 302（跳转后台登录页），重新登录后台即可恢复

### 3.3 免登录版模式（anonymous）

- 前端访问**不需要 CMSPRO 账号登录**，任何访客打开桌面入口即进入 XP 欢迎屏；登录 Windows 时以 **XP 帐户名+密码** 验证
- 入口与在线版相同（用户端页面 / 自定义路径 / 绑定域名），中间件仅 `web`（保留会话能力）
- 帐户体系：全局注册表 `anon/accounts.json`（首次访问自动种子 Administrator/Guest），与 CMSPRO 用户、UserSpace 配额体系完全脱钩；桌面内创建/改名/删除帐户均写注册表，Administrator 密码仍由后台 `xp_admin_password` 统一管理（桌面内改密拒绝）
- 桌面数据按 XP 帐户隔离：`anon/{帐户名}/state.json`，各帐户互不可见；此模式下 Guest 是独立帐户、状态正常持久化（不适用在线版 Guest 只读语义）
- 登录态：`POST /accounts/login` 验证通过后写入 Web 会话 `xp_account`；会话内所有状态接口按该帐户读写，未登录访问返回 `401`；桌面内「注销/关机」清除会话身份，「重启」保留
- 无配额约束：仅保留单份快照 10MB 硬上限兜底（`StateService::MAX_STATE_BYTES`）

## 四、存储驱动

### 4.1 本地存储（local）

- 数据存储在服务器本地文件系统
- 无需额外依赖
- 数据目录：`runtime_files` 中 `windowsxponline_data` 声明的目录

### 4.2 阿里云 OSS（oss）

- 需安装 SDK：`composer require aliyuncs/oss-php-sdk`
- 配置项：`oss_access_key`、`oss_access_secret`、`oss_bucket`、`oss_endpoint`
- 同地域 ECS 可使用 internal 内网域名免流量费
- 驱动延迟初始化，仅在首次读写时创建 OSS 客户端
- 异常处理：try-catch 捕获并 `Log::error()` 记录

### 4.3 腾讯云 COS（cos）

- 需安装 SDK：`composer require qcloud/cos-sdk-v5`
- 配置项：`cos_secret_id`、`cos_secret_key`、`cos_bucket`、`cos_region`
- 驱动延迟初始化，异常处理同 OSS

### 4.4 驱动切换

在后台设置页面修改 `storage_driver` 并保存即可切换。切换后：
- `StorageManager::resetDriver()` 清除驱动缓存
- 新数据将使用新驱动存储
- 已有数据不受影响（不会自动迁移）——**快照与 blob 对象都在同一驱动下**，切换后两者会一起「消失」在旧驱动里，需人工搬迁

### 4.5 blob 对象布局与清理

大文件内容不写进快照 JSON，而是作为独立对象存放在与快照**同一存储驱动、同一根目录**下，元数据落 `files` 表：

| 用途 | 键布局 | 示例 |
|------|--------|------|
| 正式文件 | `{userType}/{userId}/files/{blobId}` | `admin/7/files/3f9c…a1` |
| 上传分片（临时） | `{userType}/{userId}/tmp/{uploadId}/{index}` | `admin/7/tmp/8b21…e4/0` |

- `blobId` / `uploadId` 均为 `bin2hex(random_bytes(16))`（32 位十六进制）
- 键的每一段都过 `sanitizeSegment()`：空值、超长、含 `/` `\` `..` 一律抛 `invalid_param`。否则片段里混入分隔符即可越出本人目录读写他人快照与文件
- `local` 驱动下实际落盘于 `storage/app/windowsxponline_data/{键}`

清理机制（两条独立路径）：

| 机制 | 触发时机 | 行为 |
|------|----------|------|
| `purgeUnreferencedBlobs()` | 彻底删除文件、清空回收站、还原覆盖等**快照落盘成功之后** | 重扫 `fsTree` 与 `recycleBin` 全量收集在用 `blobId`，只删「两处都无引用」的对象 |
| `cleanExpired()` | **惰性**——每次 `initUpload()` 入口调用 | 清理 `create_time` 早于 `UPLOAD_TTL_HOURS = 24` 且仍为进行中的会话，连带删除其 tmp 分片 |

> ⚠️ `purgeUnreferencedBlobs()` **必须在 `saveState()` 之后调用**：反向顺序下一旦快照写入失败（如触发 10 MB 硬上限），树里的节点仍在而内容已被物理删除，形成无法自愈的数据丢失。
>
> ⚠️ 引用计数式判断是必要的：复制节点会让多个节点共享同一 `blobId`，无条件删除会连带摧毁仍在使用的文件内容。文件**移入回收站不删 blob**（还原需要），仅在彻底删除/清空回收站时回收。

配额口径：`used = 快照字节数 + BlobService::totalBytes(identity)`（后者为 `files` 表中该用户 `status = normal` 的 `size_bytes` 之和），与 `quota_mb × 1048576` 比较；`quota_mb <= 0` 表示不限；免登录版（`ANON_USER_TYPE`）不做配额约束。校验只在**上传/压缩入口**执行——若把它塞进 `saveState()`，blob 占满配额后桌面将无法保存任何改动，连删除大文件自救都做不到。

## 五、权限说明

| 权限码 | 名称 | 说明 |
|--------|------|------|
| cmspro.windowsxponline.access | 访问 XP 在线版 | 访问应用后台页面 |
| cmspro.windowsxponline.settings | 管理 XP 应用设置 | 管理应用配置 |
| cmspro.windowsxponline.spaces | 管理用户空间 | 管理用户空间配额 |

后台路由组使用 `permission` 中间件，与框架级 `api/admin` 路由组配置一致。

## 六、常见问题

### Q1: 切换存储驱动后旧数据去哪了？

旧数据仍在原驱动的存储中，不会自动迁移。如需迁移，需手动从旧存储导出数据再导入新存储。

### Q2: OSS/COS 报错"SDK 未安装"

需安装对应 SDK：
- OSS：`composer require aliyuncs/oss-php-sdk`
- COS：`composer require qcloud/cos-sdk-v5`

### Q3: 单机版和在线版可以同时使用吗？

`access_mode` 配置决定访问模式，两者互斥。单机版仅超管可访问桌面；在线版所有注册用户均可使用。切换模式不影响已存储的数据。

### Q4: 用户空间配额超出会怎样？

配额口径为 `used = 快照字节数 + BlobService::totalBytes(identity)`（blob 总量即 `files` 表中该用户 `status = normal` 的 `size_bytes` 之和），与 `quota_mb × 1048576` 比较。超出时上传、压缩、解压等入口返回错误 `云空间不足（上限 %d MB，已用 %d MB），无法上传该文件`（`code: 500`）。`quota_mb=0` 表示不限制；免登录版（`ANON_USER_TYPE`）不做配额约束。管理员可在后台「空间管理」页面调整用户配额。

> ⚠️ 配额校验**只在上传/压缩入口执行**，不并入 `saveState()`：否则 blob 占满配额后桌面将无法保存任何改动，连删除大文件自救都做不到。因此配额超额时仍能正常删除文件。
>
> ⚠️ 快照另有独立硬上限 `StateService::MAX_STATE_BYTES` = 10 MB（测试 M-10 锁定），与配额是两套约束——配额管「总占用」，快照上限管「单份 JSON 体积」。

### Q5: 如何重置用户的 XP 桌面？

1. 管理员可通过后台管理或直接清空对应用户的存储数据
2. 用户可在 XP 桌面内通过 `POST /api/.../v1/system`（重置出厂）操作

### Q6: 敏感字段如何验证已加密？

查询数据库：
```sql
SELECT code, value FROM config_items WHERE code LIKE 'app_cmspro_windowsxponline_%secret%' OR code LIKE 'app_cmspro_windowsxponline_%key%';
```

加密后的 `value` 应为 `eyJp...` 格式的 Base64 字符串（Laravel Crypt 加密特征），而非明文密钥。

### Q7: 桌面图标无法拖动怎么办？

前端图标的 `draggable` 直接取反 `settings.autoArrange`；`desktopSort` 非 `none` 时会强制排序并清空 `desktopPos`。任一项被开启，图标就会锁定在自动排列网格中，表现为完全拖不动。

`InitialStateProvider::createSettings()` 必须与前端 `DEFAULT_SETTINGS` 保持一致：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| autoArrange | false | 为 true 时前端图标 `draggable=false` |
| alignGrid | true | 对齐到网格，仅影响落点吸附，不影响可拖动性 |
| desktopSort | none | 非 none 时清空 desktopPos |

存量用户快照（`{userType}/{userId}/state.json`）若已写入错误值，需订正上述字段。`desktopPos` 应保持**为空**（`[]`），由前端按图标枚举序号单列等距自动排布；**切勿只预置部分图标的位置**——未预置图标的回退位是其枚举序号对应的网格位（并非寻找空位），会与预置位碰撞，导致图标堆叠、顺序错乱。用户也可在桌面右键「排列图标」中取消勾选「自动排列」自行恢复。

### Q8: cmd 的 ping/ipconfig 报错「代理不可达」、直访 /api/netinfo 返回 404 页？

`/api/netinfo`、`/api/search`、`/api/browse` 是 Next.js 静态版**独有**的辅助 API 路由，后端 Laravel 从未实现（`Routes/xp_routes.php` 无对应路由），直接访问命中框架 404 页（`resources/views/errors/404.blade.php`）。

前端产物 `eI()` 包装原逻辑仅在 local 模式（`localStorage.xp.apiBase = "local"`）本地拦截这三个端点并返回 XP 风格演示数据；在线版（Blade 注入 apiBase）直接 `fetch(原始路径)` 导致 404。

已打补丁（主 chunk `7f0bf4f0a6726f51.js`）：`eI()` 早退条件加白名单——任何模式下 `/api/(netinfo|search|browse)` 一律本地拦截（auxPing/auxIpconfig/auxTime/auxSearch/auxBrowseRaw），其余路径在线版仍走真实请求。刷新后 cmd 的 `ping`/`ipconfig`/`tracert`/`nslookup`/`netstat` 与「Internet 时间」同步恢复可用。

注意：ping 契约固定 4 次探测，`host` 参数须为纯域名（不支持 `-t` 持续 ping 等命令行开关）。

### Q9: 在 C 盘创建/删除/重命名文件或文件夹提示「拒绝访问」？

这是设计行为。`本地磁盘 (C:)` 为只读系统盘：前端 store 的全部 fs 写动作（新建、重命名、删除、移动、粘贴、回收站还原等）在路径首段命中 `本地磁盘 (C:)` 时直接拦截并弹错，不发起接口请求（见 2.5.1）。用户可写数据一律放 `本地磁盘 (D:)`——桌面、我的文档、收藏夹、快速启动均已映射到 `D:/{帐户名}/`（见 2.5.2）。若需放开某目录写入，须改前端产物守卫，不建议。

### Q10: 资源管理器 `Documents and Settings` 里为什么看不到其他帐户？

帐户隐私隔离的设计结果（见 2.5.2）：`C:/Documents and Settings` 下仅保留当前登录帐户的空壳目录（只含系统文件 `NTUSER.DAT`），其他帐户的目录在 `GET /state` 加载迁移时被移除；各帐户的真实数据在 `本地磁盘 (D:)/{帐户名}` 下，且桌面状态本就按帐户隔离存储（每帐户一份 `state.json`），互相不可见。老快照中 C 盘帐户目录的用户内容（桌面/My Documents/Favorites/Application Data）会在首次加载时自动搬移到 D 盘，无需手工处理。

### Q11: 首次进入桌面时任务栏快速启动区没有图标，刷新浏览器才显示？

加载顺序问题（已修复）。产物内快速启动区与桌面图标都用 `useMemo` 缓存派生结果，但依赖数组**只含部分状态键**——首屏在 `GET /state` hydrate 完成前算过一次（此时 fsTree 仍是出厂空态），hydrate 写入真实数据后 `useMemo` 认为依赖未变、不再重算，于是图标空白；刷新时 store 初值即来自快照，所以正常。

补丁（主 chunk `7f0bf4f0a6726f51.js`，`p5.ps1`）三处：

| 锚点 | 修复 |
|------|------|
| `.map(e=>eR(e,G)),[U])` | 依赖数组补 `G`（Quick Launch 文件夹节点）→ `[U,G]` |
| `return{label:t.label,icon:t.icon,open:t.open}})],[U])` | 桌面图标依赖补 `Y` → `[U,Y]` |
| `l.useXP.setState(e=>({fsTree:t.fsTree,...` | hydrate 时一并写入 `sessionUser:t.session?.user||e.sessionUser`（此前 `sessionUser` 只存在于快照、未进 store，依赖当前帐户名的派生值算不出来） |

同类症状（首屏某区域空白、刷新即好）优先排查 `useMemo`/`useEffect` 依赖数组是否漏了 hydrate 写入的键。

### Q12: 右键「新建 → 快捷方式」还是生成「网上冲浪指南.txt - 快捷方式」？

产物硬编码的旧行为，已由 XP 三步向导替换（见 2.9）。若仍出现旧行为，说明前端产物被覆盖/重新构建导致补丁丢失——检查主 chunk 尾部是否含 `xpsw-style` 标记字符串，缺失则按 architecture.md 9.3 重放 `apply-r1.ps1`。

### Q13: 本地文件拖不进桌面、粘贴没反应、或上传失败？

按顺序排查：

1. **拖放目标是否只读**：`本地磁盘 (C:)`、`回收站`、`网上邻居` 不可写，遮罩会变红（见 2.8）；请拖到桌面或 D 盘窗口内
2. **文件类型**：**任意后缀均可导入**（含 exe/zip/doc/7z）；唯一例外是**文件夹**——浏览器原生拖放拿不到目录内文件，`inspectDrop()` 会把目录剔除并提示「请先在本地压缩为 zip 再拖入，然后在本机 XP 内右键解压」
3. **文件大小**：≤ 2 MB 的文本/图片走内嵌通道，其余任意大小走 blob 分片通道，单文件不设上限（仅受后台配额与服务端合并上限 200 MB 约束）。若提示「超过 2 MB，本地数据源无法上传到服务端」，说明 `localStorage.xp.apiBase` 为 `local`（本地演示数据源，没有后端可分片上传）
4. **粘贴无反应**：`Ctrl/Cmd+V` 仅在剪贴板**确有文件**时接管；从资源管理器「复制文件」在部分浏览器不暴露 `clipboardData.files`，此时请用拖放或 `Ctrl/Cmd+Shift+V` 唤起选择框
5. **补丁是否存活**：主 chunk 尾部应含 `xpup-style` 与 `__xpUploadBridge`，explorer 根节点应有 `data-xp-cwd` 属性（缺失见 Q18）
6. **快捷键被占用**：`Ctrl/Cmd+Shift+V` 在部分浏览器/输入法中另有绑定，桥接脚本在捕获阶段 `preventDefault + stopPropagation`，仍失效时改用拖放

### Q14: 后台保存「IE 默认主页」报 500 或提示格式不正确？

- **报 500（`preg_replace(): Unknown modifier ']'`）**：`SettingApiController::validateIeHomepage()` 曾用 `#` 作正则分隔符，而字符类 `[/?#]` 内含 `#`，PHP 提前终止正则。**已修复**为 `~` 分隔符，并有回归测试 `IeHomepageTest::test_设置接口接受含路径与锚点的主页` 锁定；再次出现说明代码被回退
- **提示「IE 默认主页格式不正确」**：主机名部分不合法（含空格、`_`、非法字符等）。可填 `www.cmspro.cn`、`https://www.cmspro.cn/`、`https://www.example.cn/ie#top`，路径与锚点不参与校验
- **改了主页但老用户没变**：`ieHomeApplied` 标记机制——只有配置值**发生变化**时才覆盖 `ie.home`（见 2.6）。请确认配置已真正入库（后台重新打开设置页查看回显），用户重新加载桌面即生效

### Q15: 上传失败 / 提示「云空间不足」怎么排查？

先看响应体 `error.code` 与 `error.message`，按文案定位：

| 提示文案 | code | 原因与处理 |
|----------|------|-----------|
| `缺少必填字段: name` / `parentPath（路径段数组）` / `sizeBytes（正整数）` | 400 | 前端传参异常，非运维问题；检查补丁是否被替换成旧版 |
| `父路径不存在: xxx` | 404 | 目标目录在会话期间被删除/改名，重新拖入即可 |
| `访客模式为只读，不支持上传文件` | 409 | 当前为 Guest 只读帐户（见 2.7）；Guest 快照不落盘，上传会产生无人引用的孤儿 blob，故入口直接拒绝 |
| `云空间尚未开通，请联系管理员` | 500 | `user_spaces` 无该用户记录，后台「空间管理」为其开通 |
| `云空间已被停用，无法上传文件` | 500 | `user_spaces.status` 非启用，后台恢复 |
| `云空间不足（上限 %d MB，已用 %d MB），无法上传该文件` | 500 | 触发配额（口径见 Q4 / 4.5）；后台调大 `quota_mb` 或让用户清理文件 |
| `文件过大，超出服务端可合并上限` | 500 | 超过 `BlobService::MAX_MERGE_BYTES` = 200 MB 的合并内存硬顶 |
| `分片写入云空间失败，请重试该分片` | 500 | 存储驱动写入失败，检查磁盘空间与驱动配置 |
| `分片 %d 已丢失，请重新上传该文件` | 404 | tmp 分片被超时清理（见 Q16），重新拖入将从头开始 |
| `文件合并后大小与声明不一致，请重新上传` | 500 | 传输过程损坏，重传 |
| `该上传会话已结束，请重新发起上传` / `上传会话不存在或已过期，请重新发起上传` | 404 | 会话已 complete 或 abort，或超过 24h TTL |

> 排查建议：`error.code` 是**数值型 HTTP 状态码**，信封中没有独立的 `status` 字段（详见 API 文档 2.2）。多数业务失败 HTTP 状态仍为 200，**不要以 HTTP 状态码判断成败**。

### Q16: 断点续传的分片会话会保留多久？

`BlobService::UPLOAD_TTL_HOURS` = **24 小时**。`cleanExpired()` 清理 `create_time` 早于该窗口且仍为进行中的会话，连带删除其 tmp 分片。

- 触发时机是**惰性**的：在每次 `initUpload()` 入口调用，没有独立定时任务
- 用户在进度框点「取消」时**不调用 `abort`**，会话与已传分片保留；只要在同一目录重新拖入同名同大小的文件，`init` 即返回已收分片列表，从断点继续
- 超过 24h 后再续传会拿到全新会话（已收分片为 0），提示见 Q15 表中「分片 %d 已丢失」

### Q17: 解压失败，或解出来的文件比压缩包里少？

**整体失败**（有明确错误提示）：

| 提示文案 | code | 原因 |
|----------|------|------|
| `该文件不是有效的 ZIP 压缩包` | 400 | 包损坏，或误把 rar/7z 当 zip 解（本应用只支持 ZIP 引擎） |
| `压缩包内文件过多（%d 个），单次最多解压 %d 个` | 409 | 超过 `MAX_ENTRIES` = 2000 |
| `压缩包解压后约 %d MB，超过单次 %d MB 上限` | 409 | 超过 `MAX_TOTAL_BYTES` = 200 MB |
| `压缩包内没有可解压的文件` | 400 | 空包，或所有条目路径非法已被跳过 |
| `无法创建目标目录，请确认同名的不是文件` | 409 | 目标位置存在同名**文件**，挡住目录创建；先重命名该文件 |
| `解压失败：目标目录不存在` | 500 | 目标目录在操作中被删除，重试即可 |

**部分条目被跳过**（操作整体成功，但结果少了文件）——这是**设计行为，不报错**：

- 目标位置已有同名文件挡路 → 跳过该条继续
- 单条写入异常 → 跳过该条继续
- 条目名含 `..`（zip slip）→ 直接丢弃，列表接口同样不展示（否则用户以为能解出而实际解不出）

若一次要解出的条目数过多，还可能撞上 10 MB 快照上限 `state_too_large`（500）——解压会为每个条目挂一个树节点，节点过多会撑爆快照。此时请分批解压。

### Q18: 桌面能看到 zip，但双击不开 WinRAR / 右键没有「下载到本地(L)」？

说明前端产物被覆盖或重新构建，补丁丢失。按下表核对 marker 字符串（`apply-r3.ps1` 的期望值已实测锁定）：

| 位置 | marker | 期望数量 |
|------|--------|----------|
| 主 chunk | `data-xp-cwd` | ≥ 2（`ExpectMin`） |
| 主 chunk | `xpsw-style` / `xpup-style` / `xpwr-style` | 各 ≥ 1（`ExpectMin`） |
| 主 chunk | `__xpUploadBridge` | 恰 4 |
| 主 chunk | `__xpWinrar` | 恰 11 |
| 主 chunk | `下载到本地(L)` | 恰 2（资源管理器 + 桌面右键） |
| 主 chunk | `解压到当前文件夹` | 恰 3（右键菜单 + 工具栏 + 菜单项） |
| 路径 helper chunk | `WinRAR 压缩文件` / `7-Zip 压缩文件` / `t.bytes?t.bytes` | 各恰 1 |

缺失时按 architecture.md 9.3 的重放顺序恢复（日常只需跑最后一步 `apply-r3.ps1`）。可用 `storage\tmp\mkcount.ps1` 统计各 marker 实际出现次数再与上表比对。

## 七、运行时文件

| key | 名称 | 目录 | 类型 | 说明 |
|-----|------|------|------|------|
| windowsxponline_data | XP 用户数据 | windowsxponline | data | 用户桌面状态数据，按用户 ID 隔离存储 |

- `cleanable: true` — 卸载时可清理
- `strategy: manual` — 手动管理策略
- `protected: false` — 非保护文件

运行时数据分三类，**快照与 blob 对象同在 `windowsxponline_data` 指向的目录（同一存储驱动）下**：

| 内容 | 键 / 路径 | 说明 |
|------|-----------|------|
| 桌面快照 | `{userType}/{userId}/state.json`（免登录版为 `anon/{帐户名}/state.json`） | 文件树 JSON，受 10 MB 硬上限 |
| blob 对象 | `{userType}/{userId}/files/{blobId}` | 大文件内容，受配额约束 |
| 上传分片 | `{userType}/{userId}/tmp/{uploadId}/{index}` | 临时分片，24h TTL 回收 |

- `local` 驱动下落在 `storage/app/windowsxponline_data/`；切换 OSS/COS 后这些键会一起搬到新驱动（见 4.4）
- 压缩解压另需一个**本地临时目录** `storage/app/windowsxponline/tmp`（`ZipArchive` 只接受文件路径，读写都需在本地落盘），该目录不受存储驱动影响，也不会被配额统计

## 八、测试

### 8.1 执行方式

框架 `phpunit.xml` 的 `testsuites` 仅含 `tests/Unit`、`tests/Feature`，**不包含应用目录**，因此应用测试必须用路径方式单独执行：

```bash
# 全量（当前基线：150 用例 / 579 断言，约 15s）
php artisan test app/Apps/CmsproWindowsxponline/Tests/Feature --compact

# 单个测试类
php artisan test app/Apps/CmsproWindowsxponline/Tests/Feature/IeHomepageTest.php

# 单个用例（中文方法名用引号包裹）
php artisan test --filter "test_后台改主页强制覆盖老用户快照" app/Apps/CmsproWindowsxponline/Tests/Feature/IeHomepageTest.php
```

### 8.2 测试基建（`Tests/Support/`）

| 类 | 职责 |
|----|------|
| `WindowsxponlineSetup` | `setUpWindowsxponline()`：建 `config_items`/`config_groups` 最小表 → 跑应用迁移 → flush 缓存 |
| `XpStateSandbox` | `bootXpStateSandbox()`：注入 `InMemoryStorageDriver` + 伪造 admin 登录态（id=7, username=tester）+ 建 100MB 配额；`seedXpConfig(key,value)` 写配置并失效缓存；`readXpState()` 回读落盘快照；`stateStorageKey()` = `admin/7/state.json` |
| `InMemoryStorageDriver` | `seedState(key,array)` 预置快照 / `readState(key)` 断言落盘结果，避免测试污染真实存储 |

`seedXpConfig()` 内部**必须重新注入内存驱动**——`StorageManager::resetConfigCache()` 会连带 `resetDriver()`，否则后续状态读写落到真实驱动。

blob 对象与上传分片同样经 `StorageManager` 读写，故也由注入的 `InMemoryStorageDriver` 接管，不会污染真实存储；`files` / `uploads` 两张表则由 `setUpWindowsxponline()` 的 `runMigrations()` 自动建好（见 1.1）。

### 8.3 覆盖范围

| 测试类 | 覆盖内容 |
|--------|----------|
| `IeHomepageTest` | IE 出厂默认主页、`normalizeIeHomepage` 协议补全、后台配置对新用户生效、`ieHomeApplied` 强制覆盖与「配置未变保留用户自定义」、`/ie` 与 `/state` 的 `defaultHome` 下发、设置接口主页格式校验（含路径/锚点回归） |
| `QuickLaunchDefaultsTest` | 快速启动默认项播种、老用户增量补入、`qlDefaultsApplied` 每帐户去重、非法 appId 拦截 |
| `XpAccountAuthTest` | 在线版帐户体系：Administrator 密码托管、Guest 只读不持久化、CMSPRO 帐户特判登录、relogin 契约、游客开关关闭/重开 |
| `AnonymousAccessTest` | 免登录版：注册表种子、`anon/{帐户}/state.json` 隔离、未登录 401、游客开关 |
| `SettingApiTest` | 后台设置接口白名单、枚举/范围校验、快速启动与游客开关非法值拒绝且不写库 |
| `SettingEncryptionTest` | 敏感字段加密存储、`******` 跳过、解密失败兼容明文 |
| `SpaceApiTest` | 空间 CRUD、分页、配额范围校验 |
| `XpDriveQuotaTest` | D 盘 `total`/`used` 响应态注入、落盘前剥离、`quota_mb=0` 标称容量 |
| `StatePersistenceTest` | 快照读写、10MB 上限、Guest 只读跳过落盘 |
| `HomeDMappingTest` | 帐户目录 C→D 搬移、DNS 空壳、驱动器节点自愈 |
| `FsDeleteTest` | 删除进回收站、key 白名单校验、还原与彻底删除 |
| `FileUploadApiTest` | blob 分片上传协议四端点（init/chunk/complete/abort）正常链路、断点续传、分片序号与大小校验、`files` 表 `totalBytes` 配额口径、名称去重，以及三处安全防护（存储键穿越过滤、越权下载拦截、响应头注入过滤）——18 用例 / 166 断言 |
| `ArchiveApiTest` | 三种内容来源归一打包（blobId / `src` dataURL / 内嵌 `content`）、解压落盘、GBK 条目名转码、zip slip 拦截、同名冲突显式拒绝、`MAX_ENTRIES`/`MAX_TOTAL_BYTES` 与配额校验——10 用例 |
| `SessionEventTest` | 会话事件流水追加与 200 条上限淘汰 |
| `StorageConfigCacheTest` | 配置两级缓存、驱动切换后缓存失效 |

### 8.4 约定

- 应用测试一律放 `app/Apps/CmsproWindowsxponline/Tests/`，**禁止**放入框架 `tests/`
- 测试方法名用中文（`test_业务语义`），文件顶部 docblock 说明覆盖的需求点
- 「一功能一文件」：新增独立功能建独立测试类；对既有功能的补充用例并入对应既有文件，避免文件膨胀
- 断言落盘结果时读 `readXpState()`（真实写入路径），断言响应契约时直接调控制器方法解析 `getContent()`
