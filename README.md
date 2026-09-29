# Windows XP 在线版

在浏览器里 1:1 复刻 Windows XP 桌面，并把每个用户的 XP 桌面托管到 CMSPRO 服务端——同一个网址，各人一套独立的 C 盘与 D 盘，文件真实落盘、可随时取回本机。

> 本项目是 CMSPRO v5 的应用模块（app_id: `cmspro.windowsxponline`），**不能脱离 CMSPRO 框架独立运行**。

| 项 | 值 |
|----|----|
| 应用标识 | `cmspro.windowsxponline` |
| 当前版本 | 1.1.0 |
| 后端 | PHP 8.3 + Laravel 13.x（CMSPRO v5 应用模块） |
| 前端 | Next.js 16 + Tailwind 4 + TypeScript + Zustand（静态导出） |
| 依赖框架 | CMSPRO >= 5.0.0 |
| 运行模式 | 单机版 / 在线版 / 免登录版 |

## 特性

- **1:1 复刻的 XP 桌面**——BIOS 自检与启动跑马灯、欢迎屏登录、Luna 主题、任务栏与快速启动区、开始菜单、图标框选与网格吸附、右键菜单、关机/注销对话框
- **内置 10 余个可用的程序**——资源管理器、记事本（可保存）、画图、计算器、IE、扫雷、纸牌、Windows Media Player、任务管理器、CMD（10+ 命令）、显示属性、运行对话框
- **真实文件系统语义**——`本地磁盘 (C:)` 为只读系统盘，`本地磁盘 (D:)` 为按帐户隔离的用户数据盘；支持任意格式后缀，双击无关联程序时按 XP 行为弹出「打开方式」
- **本地文件任意格式导入**——拖放、`Ctrl/Cmd+V`、`Ctrl/Cmd+Shift+V` 三个入口；2 MB 以内的文本与图片写入快照的内嵌通道，其余任意大小走分片上传通道（4 MB 分片、3 路并发），支持**真断点续传**（会话落库，24 小时 TTL）
- **WinRAR 视觉复刻**——双击 zip 打开明细窗口；支持「压缩(zipped)文件夹」「全部提取(A)...」「解压到当前文件夹」；后端由 PHP `ZipArchive` 驱动，不引入外部二进制；含 zip slip 防护
- **云空间配额**——按「快照字节数 + blob 对象总量」计算，后台可按用户调整；D 盘属性对话框实时展示已用/总量
- **三种访问模式**——单机版（仅超级管理员）、在线版（所有注册用户各自一套桌面）、免登录版（XP 帐户体系，与 CMSPRO 用户完全脱钩）
- **可切换的存储驱动**——本地磁盘 / 阿里云 OSS / 腾讯云 COS，后台改一个选项即可切换，快照与文件对象一起迁移
- **后台可运维**——IE 默认主页（含强制同步到老用户）、游客功能开关（默认关闭，关闭后登录页不显示 Guest）、快速启动区默认项、用户空间配额管理

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| PHP | >= 8.3 | 框架 `composer.json` 要求 `^8.3`（应用 `manifest.json` 声明为 >= 8.1） |
| PHP 扩展 | `zip` | **必需**：压缩与解压依赖 `ZipArchive` |
| CMSPRO | >= 5.0.0 | 应用运行于其应用模块机制之上 |
| 数据库 | MySQL >= 5.7 或 SQLite | 沿用框架默认连接 |
| Node.js | >= 20 | 仅在需要重新构建前端产物时使用 |

可选扩展：使用 OSS / COS 驱动时需 `composer require aliyuncs/oss-php-sdk` 或 `qcloud/cos-sdk-v5`。

## 安装

通过 CMSPRO 后台「应用管理」上传并安装本应用。安装流程由 [Install.php](./Install.php) 驱动：

1. **执行数据库迁移**——`runMigrations()` 扫描 `Migrations/*.php` 并逐个执行 `up()`，当前创建 4 项结构：用户空间配额表 `app_cmspro_windowsxponline_user_spaces`、其 `create_time` 索引、blob 元数据表 `app_cmspro_windowsxponline_files`、上传会话表 `app_cmspro_windowsxponline_uploads`。已执行的迁移按 `migrations` 表记录自动跳过，**新增迁移文件无需改动 `Install.php`**
2. **注册权限**——将 `manifest.json` 声明的 3 个权限写入 `admin_permissions` 表
3. **注册菜单**——写入后台菜单与用户端菜单
4. **初始化默认配置**——写入 `config_items` 表，已有配置值不覆盖

安装完成后，在后台设置页配置 `access_mode` 等选项；升级时 `upgrade()` 会重跑上述幂等流程。

详细步骤、卸载清理项与故障排查见 [运维文档](./doc/operations.md)。

## 目录结构

```
CmsproWindowsxponline/
├── Assets/                    # 前端构建产物（Next.js 静态导出，iframe 加载）
│   ├── index.html
│   ├── _next/static/chunks/   # 打包后的 JS，前端补丁脚本作用于这些 chunk
│   ├── icons/                 # XP 图标（16/32/48 三档，含 GPL-2 素材）
│   ├── media/                 # 内置图片与音效
│   └── wallpapers/            # Bliss / Azul / Autumn 壁纸
├── Config/
│   └── windowsxponline.php    # 代码层默认配置（数据库配置优先生效）
├── Controllers/
│   ├── Admin/                 # 后台页面与设置、空间管理接口
│   └── Api/V1/                # 桌面用接口：State/Fs/File/Archive/Recycle/Account/IE/...
├── Exceptions/                # StateException、BlobException（自带 render，映射 HTTP 语义）
├── Frontend/                  # 前端源码快照（仅 src/ 与 docs/，Next.js 工程配置文件未纳入）
├── Middleware/                # XP 管理员权限、XP 用户鉴权
├── Migrations/                # 4 个迁移文件
├── Models/                    # UserSpace、XpFile、XpUpload
├── Routes/                    # admin / user / xp_admin_api / xp_user_api 等路由
├── Services/                  # StateService、FsTreeService、BlobService、ArchiveService、存储驱动
├── Tests/                     # 应用级测试（15 个测试类 / 150 用例）
├── Views/                     # 后台与桌面入口视图
├── doc/                       # 接口、架构、运维三份文档
├── Install.php                # 安装、卸载、升级
├── ServiceProvider.php        # 应用注册
└── manifest.json              # 应用元信息、权限、配置项、菜单声明
```

## 核心技术实现

### 存储分层

用户数据分为三层，**快照与文件对象存放在同一存储驱动的同一根目录**下：

| 内容 | 键布局 | 约束 |
|------|--------|------|
| 桌面快照 | `{userType}/{userId}/state.json` | 单份 JSON 硬上限 10 MB |
| 文件对象（blob） | `{userType}/{userId}/files/{blobId}` | 计入用户配额 |
| 上传分片（临时） | `{userType}/{userId}/tmp/{uploadId}/{index}` | 24 小时 TTL 惰性回收 |

`StorageManager` 统一封装本地/OSS/COS 三种驱动；键的每个片段都经 `sanitizeSegment()` 过滤，拒绝空值、超长、含 `/`、`\`、`..` 的片段，避免越出本人目录读写他人数据。

### 本地文件导入的双通道

`handleOne()` 按「大小 + 数据源」分流：

- **内嵌通道**：0 字节文件、2 MB 以内的文本/图片，或本地演示数据源——走既有 `POST /fs`，文本写入节点 `content`，图片写入 `src`（base64 dataURL）。保留该通道的原因是**记事本与图片查看器直接读这两个字段**
- **blob 通道**：其余任意格式与大小——走 `POST /fs/upload/init|chunk|complete`，树节点只保留 `blobId` 与 `bytes` 引用

批次导入结束后统一 `GET /state` 覆盖本地文件树（而非每个文件各同步一次），图标、类型与大小口径完全由服务端决定。

### 压缩与解压

前端 `window.__xpWinrar` 提供 `open` / `addTo` / `extractTo` 三个入口，窗口用原生 DOM 与 XP Luna 样式自建。设计上只做有后端支撑的动作：RAR 格式、压缩方式、压缩选项等无对应能力的一律灰置，工具栏不提供「测试/删除/修复/追加」；进度对话框使用不确定态滚动条且不提供取消——压缩解压是同步请求，服务端不回传中间进度，而中断 `fetch` 后服务端仍会写完并落盘。

解压时逐条落地：目标位置已有同名文件挡路或单条写入异常则跳过该条继续，整体异常时回滚已落地的对象；含 `..` 的条目路径被丢弃（zip slip 防护）。

## 访问模式

| 模式 | 配置值 | 可见范围 | 数据归属 |
|------|--------|----------|----------|
| 单机版 | `standalone` | 仅超级管理员 | `admin/{id}` |
| 在线版 | `online` | 所有注册用户 | `{userType}/{userId}`，按用户隔离 |
| 免登录版 | `anonymous` | 任何访客（XP 帐户名+密码登录） | `anon/{帐户名}`，与 CMSPRO 用户体系脱钩 |

三种模式互斥，切换不影响已存储的数据。

## 源码仓库

| 平台 | 地址 |
|------|------|
| Gitee | <https://gitee.com/holley/windowsxponline> |
| GitHub | <https://github.com/rhl88/windowsxponline> |

## 文档

| 文档 | 内容 |
|------|------|
| [doc/api.md](./doc/api.md) | 全部接口契约：响应信封、异常到状态码映射、文件树操作、分片上传与下载、压缩解压 |
| [doc/architecture.md](./doc/architecture.md) | 目录结构、核心流程、存储层、数据库表、安全机制、前端补丁流水线 |
| [doc/operations.md](./doc/operations.md) | 安装卸载升级、配置项清单、存储驱动、常见问题排查（Q1–Q18）、测试说明 |
| [Frontend/docs/ICON-CREDITS.md](./Frontend/docs/ICON-CREDITS.md) | 图标素材来源与许可 |

## 测试

应用测试位于 `Tests/`，**不使用框架的 `tests/` 目录**。框架 `phpunit.xml` 的 `testsuites` 不包含应用目录，因此必须以路径方式执行：

```bash
# 全量（当前基线：150 用例 / 579 断言，约 15s）
php artisan test app/Apps/CmsproWindowsxponline/Tests/Feature --compact

# 单个测试类
php artisan test app/Apps/CmsproWindowsxponline/Tests/Feature/ArchiveApiTest.php

# 单个用例（中文方法名需加引号）
php artisan test --filter "test_后台改主页强制覆盖老用户快照" \
  app/Apps/CmsproWindowsxponline/Tests/Feature/IeHomepageTest.php
```

覆盖范围包括接口契约、快照读写与 10 MB 上限、配额口径、删除与回收站、blob 分片上传与断点续传、压缩解压与 zip slip 防护、三种访问模式、配置加密与缓存失效等 15 个测试类。

## 第三方资源与致谢

- **XP 图标素材**——部分图标取自 [B00merang Artwork - Windows XP](https://github.com/B00merang-Artwork/Windows-XP) 图标主题，采用 **GPL-2.0** 许可（全文见 [Frontend/docs/ICON-LICENSE-GPL2.txt](./Frontend/docs/ICON-LICENSE-GPL2.txt)），清单与替换范围见 [ICON-CREDITS.md](./Frontend/docs/ICON-CREDITS.md)
- **壁纸**——Bliss / Azul / Autumn 三张壁纸为项目内生成与优化后的资源
- **音效**——启动、关机、错误提示等音效内置为本地文件，不引用外部 CDN

## 许可证

本项目**暂未添加开源许可证**，默认保留所有权利。在添加许可证之前，请勿将本项目代码用于商业分发。

需要特别说明的是：`icon` 相关目录内含 **GPL-2.0** 许可的第三方图标素材，其授权条款独立于本项目代码，使用前请自行阅读 [ICON-LICENSE-GPL2.txt](./Frontend/docs/ICON-LICENSE-GPL2.txt)。