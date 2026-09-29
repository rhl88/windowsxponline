# Windows XP 在线版 · 接口文档

> app_id: `cmspro.windowsxponline` · 版本 1.0.0

## 一、接口总览

本应用提供两组接口：

| 接口组 | 前缀 | 认证 | 响应格式 |
|--------|------|------|----------|
| 后台管理 API | `/api/admin/cmspro/windowsxponline` | auth:admin + permission | CMSPRO 标准格式 |
| XP WebOS API | `/api/admin/cmspro/windowsxponline/v1`（单机版）<br>`/api/user/cmspro/windowsxponline/v1`（在线版 / 免登录版） | auth:admin / auth:web + front_user_status / 免登录版仅 web 会话（XP 帐户 `xp_account`，未登录 401） | XpResponse 信封格式 |

## 二、响应格式说明

### 2.1 后台管理 API — CMSPRO 标准格式

```
{ "code": 0, "message": "操作成功", "data": {...} }
```

`code=0` 表示成功，非零表示失败。

### 2.2 XP WebOS API — XpResponse 信封格式

```
// 成功
{ "ok": true, "data": {...} }

// 失败
{ "ok": false, "error": { "code": 400, "message": "错误描述" } }
```

> ⚠️ `error.code` 是**数值型 HTTP 状态码**（`XpResponse::error(int $code, string $message, int $status = 200)`），不是字符串错误码；信封内**没有**独立的 `status` 字段。多数失败响应的 HTTP 状态码仍为 200（前端只读信封），仅 `StateException` 的 `not_logged_in` 会把 HTTP 状态一并置为 401。断言时请取 `payload['error']['code']`。

**失败构造器与状态码映射**：

| 构造器 | code | 使用场景 |
|--------|------|----------|
| `XpResponse::badRequest()` | 400 | 缺少必填参数、参数类型非法、目标不是文件 |
| `XpResponse::notFound()` | 404 | 文件/目录不存在、内容已丢失、上传会话过期 |
| `XpResponse::conflict()` | 409 | 访客模式只读、目标目录无法创建、同名冲突 |
| `XpResponse::serverError()` | 500 | 存储读写失败、配额不足、序列化失败 |

两个异常类自带 `render()`，由 Laravel 默认异常处理器直接渲染为信封（不注册异常处理器、不改框架代码）：

| 异常 | reason | code |
|------|--------|------|
| `BlobException` | `invalid_param` / `chunk_mismatch` | 400 |
| `BlobException` | `not_found` | 404 |
| `BlobException` | `conflict` / `too_large` | 409 |
| `BlobException` | `read_failed` / `write_failed`（默认）及其余 | 500 |
| `StateException` | `not_logged_in` | 401（HTTP 状态同步 401） |
| `StateException` | `serialize_failed` / `state_too_large` / `space_missing` / `space_disabled` / `quota_exceeded` / `write_failed` | 500 |

> `quota_exceeded` 落在 500 分支是有意为之：配额校验属于服务端资源约束而非客户端参数错误，前端只从 `error.message` 取文案提示用户，不依赖 code 分流。

**豁免说明**：XP WebOS API 使用 `{ ok, data }` / `{ ok, error }` 信封格式，而非 CMSPRO 标准的 `{ code, message, data }` 格式。原因：

1. XP WebOS 前端为独立构建的 Next.js 应用，已深度适配 `{ ok, data }` 信封格式
2. `XpResponse` 服务类统一封装所有 XP API 响应，接口行为一致
3. 改为标准格式需同步修改前端代码，成本高且收益有限
4. 经确认，保持 XpResponse 格式不变，在此记录豁免

## 三、后台管理 API

### 3.1 应用设置

#### GET /api/admin/cmspro/windowsxponline/settings

获取所有应用配置。

**响应**：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "access_mode": "online",
    "storage_driver": "local",
    "default_space_quota": "100",
    "oss_access_key": "",
    "oss_access_secret": "",  // 非空时显示 "******"
    "oss_bucket": "",
    "oss_endpoint": "",
    "cos_secret_id": "",
    "cos_secret_key": "",    // 非空时显示 "******"
    "cos_bucket": "",
    "cos_region": "",
    "xp_ie_homepage": "https://www.cmspro.cn/",
    "xp_guest_enabled": "0"
  }
}
```

#### PUT /api/admin/cmspro/windowsxponline/settings

更新应用配置。

**请求体**（JSON）：

```json
{
  "access_mode": "standalone",
  "storage_driver": "oss",
  "oss_access_key": "LTAI5t...",
  "oss_access_secret": "abc123...",
  "oss_bucket": "my-bucket",
  "oss_endpoint": "oss-cn-hangzhou.aliyuncs.com"
}
```

- 仅提交需修改的字段即可
- 敏感字段值为 `******` 时跳过（不覆盖）
- 敏感字段（`oss_access_secret`、`cos_secret_key`）使用 `Crypt::encryptString()` 加密存储；`xp_admin_password` 同属加密存储但后台明文回显
- `xp_quicklaunch_defaults`（快速启动默认项）为逗号分隔 appId 列表，入库前逐项校验必须属于前端应用注册表（`showdesktop/ie/wmp/notepad/calc/cmd/taskmgr`），非法值返回 `40001`「快速启动默认项包含不支持的程序: {id}」
- `xp_ie_homepage`（IE 默认主页）入库**原样保存**（协议补全在读取侧完成），留空表示恢复出厂默认；入库前校验主机名格式（可带路径/查询/锚点），非法值返回 `40001`「IE 默认主页格式不正确，请填写域名或完整网址（如 www.cmspro.cn）」
- `xp_guest_enabled`（游客功能开关）仅接受 `0`（关闭）/`1`（开启），其余值返回 `40001`「游客功能开关仅支持 0（关闭）或 1（开启）」

> 校验实现注意：`SettingApiController::validateIeHomepage()` 剥离路径的正则为 `preg_replace('~[/?#].*$~', ...)`。分隔符**必须**用 `~`——字符类 `[/?#]` 内含 `#`，若以 `#` 作分隔符，PHP 会把字符类里的 `#` 当作正则结束符，抛出 `Unknown modifier ']'` 导致接口 500。

**响应**：

```json
{
  "code": 0,
  "message": "设置已更新",
  "data": { "updated": ["access_mode", "storage_driver"] }
}
```

### 3.2 用户空间管理

#### GET /api/admin/cmspro/windowsxponline/spaces

获取用户空间列表（分页）。

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| keyword | string | 用户名关键词 |
| user_type | string | 用户类型（admin/user） |
| page | int | 页码 |
| per_page | int | 每页条数 |

**响应**：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {
    "items": [
      {
        "id": 1,
        "user_type": "admin",
        "user_id": 1,
        "username": "admin",
        "quota_mb": 0,
        "used_mb": 15,
        "status": 1,
        "create_time": "2026-09-26 10:00:00",
        "update_time": "2026-09-26 10:00:00"
      }
    ],
    "pagination": {
      "total": 1,
      "current_page": 1,
      "per_page": 15,
      "last_page": 1
    }
  }
}
```

#### GET /api/admin/cmspro/windowsxponline/spaces/{id}

获取单个用户空间详情。

#### POST /api/admin/cmspro/windowsxponline/spaces

创建用户空间记录。

**请求体**：

```json
{
  "user_type": "user",
  "user_id": 5,
  "username": "zhangsan",
  "quota_mb": 200,
  "status": 1
}
```

#### PUT /api/admin/cmspro/windowsxponline/spaces/{id}

更新用户空间配置。

**请求体**：

```json
{
  "quota_mb": 500,
  "status": 1
}
```

配额展示联动：`quota_mb`/`used_mb` 会动态注入桌面快照 `本地磁盘 (D:)` 节点的 `total`/`used` 字段（见 4.12），管理员调整配额后用户重新加载桌面即可在「我的电脑 → 本地磁盘 (D:) → 属性」看到新容量。

## 四、XP WebOS API

以下端点在单机版和在线版中行为一致，控制器通过 Auth 门面自动适配用户身份；免登录版（anonymous）复用在线版前缀，身份改为 Web 会话中的 XP 帐户（见 4.3）。

### 4.1 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /system | 连接测试/系统信息 |
| POST | /system | 重置出厂设置 |

### 4.2 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /session | 获取会话信息 |
| POST | /session | 登录/解锁/锁定/注销/关机/重启 |

请求体 `action` 字段指定操作类型：`login` / `logoff` / `lock` / `unlock` / `shutdown` / `restart`（非法值返回 400）。

每次上报会向 `session.events` 追加一条事件记录（`{action, at, user}`）；事件流水仅保留最近 200 条，超出后最旧记录自动淘汰，防止状态快照无限膨胀。

### 4.3 用户帐户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /accounts | 帐户列表 |
| POST | /accounts/login | 登录验证 |
| POST | /accounts | 创建帐户 |
| PATCH | /accounts | 更改密码/提示/头像/名称 |
| DELETE | /accounts | 删除帐户 |

内置帐户策略：

- **Administrator**：登录密码由后台应用设置 `xp_admin_password` 统一管理（配置后优先校验，未配置回退初始种子密码）；桌面内 `PATCH /accounts` 修改其密码返回 403。
- **Guest**：只读模式，无密码直接登录；其会话下所有写接口（状态保存、文件操作等）服务端一律不持久化（不占配额），接口照常返回成功，数据仅存在于前端本地、刷新即失。是否对外开放由后台配置 `xp_guest_enabled` 控制（**出厂默认关闭**），详见下文「游客功能开关契约」。

**游客功能开关契约**：`InitialStateProvider::guestEnabled()` 读取 `xp_guest_enabled`（缺省 `'0'`）。关闭时在**服务端三处**同时裁决，防止绕过前端手工调用接口：

| 位置 | 行为 |
|------|------|
| `AccountController::list()` | `filterVisibleAccounts()` 过滤掉 `type==='guest'` 或 `name==='Guest'` 的帐户，登录页不显示 Guest 磁贴 |
| `StateService::stripAccounts()` | `GET /state` 快照的 `accounts` 同样过滤，前端 hydrate 后亦无 Guest |
| `AccountController::login()` | 入口处 `isGuestBlocked()` 命中即返回 `{ok:true,data:{ok:false,reason:'no-user'}}`（复用「用户不存在」语义，前端提示「找不到用户」） |

关闭期间 Guest 的**种子数据仍完整保留**（快照 `accounts` 落盘内容、免登录版 `anon/accounts.json` 注册表均不删改），后台重新开启开关后立即恢复可见与可登录，无需重建状态。免登录版（anonymous）同样适用该开关。

`hasPassword` 派生契约：`GET /accounts`、`GET /state` 快照及登录/改密响应中的帐户对象一律剥离 `password` 字段，并按实际密码是否为空派生布尔 `hasPassword`。前端欢迎屏数据驱动：`hasPassword=true`（Administrator）点击磁贴展开密码框，`false`（Guest）单击直接登录。该字段缺失会导致前端把有密码帐户误判为免密帐户、以空密码直发登录请求（返回 `bad-password`）。

**免登录版（anonymous）契约差异**：帐户数据源为全局注册表 `anon/accounts.json`（非用户快照内 `accounts`）；`POST /accounts/login` 验证通过后写入 Web 会话 `xp_account`，此后所有状态接口按该帐户读写 `anon/{帐户名}/state.json`，未登录访问返回 `401`；桌面内「注销/关机」清除会话身份，「重启」保留；此模式下 Guest 为独立帐户、状态正常持久化（不适用上文只读语义），创建/改名/删除帐户均联动注册表与状态文件。详见运维文档 3.3 节。

**在线版/单机版 CMSPRO 帐户特判**：桌面快照 `accounts` 仅含 XP 帐户（Administrator/Guest 等），不含 CMSPRO 前台注册帐户。`POST /accounts/login` 键入名未命中快照 accounts 时，按 `username` 查框架 `users` 表：命中且状态启用则按 bcrypt 校验密码——通过写入 `session.user` 并返回 `ok=true`（不将 CMSPRO 帐户种入 accounts 列表），不符返回 `reason=bad-password`；用户不存在或已禁用返回 `reason=no-user`（前端欢迎屏据此提示「找不到用户」；勿用 `not-found`，会被前端误判为密码错误）。注意特判不要求键入名与当前会话用户一致（前台注册后可能以新帐户登录，会话用户名不可靠）。另外在线版前端 hydrate 成功后若检测到 CMSPRO 已登录会话，boot 结束将自动进入桌面，无需再次键入帐户名密码。**主目录自动补建**：特判登录仅回写 `session.user`，若快照 `Documents and Settings` 下无该帐户主目录（快速启动区会空白），`GET /state` 加载迁移时自动补建标准主目录（Quick Launch 按后台 `xp_quicklaunch_defaults` 配置种子）并落盘，新登录与老数据自愈，重新登录或刷新即可生效。**未登录直登（relogin 契约）**：在线版会话过期（或未登录）直接访问 `index.html` 时，`POST /accounts/login` 对未认证访问开放（仅 `web` 中间件，路由注册见 ServiceProvider；其余接口仍要求已登录），仅受理框架 `users` 表帐户——校验通过后服务端建立 CMSPRO web 会话（含登录统计、`user.after_login` 钩子、session 再生）并回写快照 `session.user`，响应携带 `relogin=true`，前端据此整页重载以重建认证态；XP 内置帐户（Administrator/Guest）未登录时访问返回 `reason=no-user`，仍需先经 CMSPRO 前台登录。密码错误计入框架 `LoginSecurityService` 失败计数（scene=`user`），触发锁定后返回 `reason=locked`。

### 4.4 文件系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /fs | 读取文件树根节点或按路径取节点 |
| POST | /fs | 新建文件/文件夹 |
| POST | /fs/write | 写文件内容 |
| PATCH | /fs | 重命名/属性补丁 |
| DELETE | /fs | 删除（默认进回收站） |
| POST | /fs/move | 移动 |
| POST | /fs/copy | 复制 |

文件/文件夹使用路径段数组 `string[]` 寻址。

大文件与压缩包的端点独立成节，见 [4.13 文件上传与下载](#413-文件上传与下载blob) 与 [4.14 压缩与解压](#414-压缩与解压winrar-复刻)。

**新建快捷方式（前端向导）契约**：桌面与资源管理器右键「新建(W) → 快捷方式(S)」不再硬编码目标，而是打开仿 XP 的三步向导（欢迎 → 选择项目位置[可键入路径或「浏览(B)...」树形选择] → 键入快捷方式标题）。向导以 vanilla JS 实现（`window.__xpShortcutWizard`），由产物菜单项 `onClick` 注入 `{cwd, getTree, onCreate}` 调用；位置串支持 `D:\a\b.txt`、`D:/a/b.txt`、`本地磁盘 (D:)\a\b.txt` 三种写法，逐段忽略大小写解析到真实树节点，解析失败提示「Windows 找不到 '...』」；默认标题取目标名去扩展名，用户自定义标题会剥离尾部 `- 快捷方式`（store 内部会自动追加该后缀，避免重复）。**接口契约不变**：最终仍走 store 的 `fsCreateShortcut` → `POST /fs`，快捷方式节点 `{name, kind:'file', icon:'shortcut', target}`。

**本地文件导入契约**：拖放/粘贴/快捷键导入的本地文件走**双通道**，由前端补丁脚本 `upload-r3.js` 按内容形态分流：

| 通道 | 适用条件 | 落地方式 | 节点形态 |
|------|----------|----------|----------|
| 内嵌通道 | ≤ 2 MB 的文本或图片 | 既有 `POST /fs`（整节点写入） | 文本写 `content`（UTF-8 优先，出现替换字符回退 GBK 解码），图片写 `src`（base64 dataURL） |
| blob 通道 | 其余任意格式、任意大小 | 分片上传 `POST /fs/upload/init\|chunk\|complete`（见 4.13） | 节点只留 `blobId` / `bytes` 引用，内容存独立对象 |

保留内嵌通道的原因：记事本与图片查看器直接读 `content`/`src` 两个字段，若改走 blob 会让既有能力退化打不开。

**任意后缀均可导入**（已取消 r2 的「仅文本与图片」白名单），按「在线电脑」的真实文件系统语义对待；无对应程序可打开时按 XP 行为弹提示，不新增预览查看器。

**树同步口径**：上传/压缩/解压产物结束后，前端**统一 `GET /state` 覆盖本地 `fsTree`**，图标、类型、大小完全由服务端 `inferFileType`/`formatBytes` 决定。原因是 `fsWriteFile`/`fsCreateFile` 的第四参只认 `icon`/`type`/`src`/`appId`、不支持 `blobId`/`bytes`，本地插节点会把 blob 文件退化成空内容文件。

**去重命名由服务端统一执行**（`FsTreeService::dedupeName()`，序号从 2 开始：`报告.txt` → `报告 (2).txt`），`complete`/`archive`/`extract` 的响应体回传最终名称与路径，前端不再自行预演去重。约束详见运维文档 2.8。

**Quick Launch（任务栏快速启动区）契约**：数据源为文件树中的真实文件夹节点 `C:\Documents and Settings\{user}\Application Data\Microsoft\Internet Explorer\Quick Launch`，快捷方式节点格式为 `{name, kind:'file', icon:'shortcut', appId, size:'1 KB', type}`；前端按 `appId==='showdesktop'` 或文件名含「显示桌面」渲染显示桌面按钮，标签取文件名去 `.lnk/.url/.scf` 后缀。初始内容按后台配置 `xp_quicklaunch_defaults` 播种（`showdesktop` 为固定必选项，缺失时强制置顶补入）；用户拖拽快捷方式进/出该文件夹经 `POST /fs/move`、`POST /fs`、`DELETE /fs` 持久化。老用户快照在 `GET /state` 加载路径对新勾选的默认项做**增量补入**，覆盖 `Documents and Settings` 下每个 XP 帐户主目录（Administrator/Guest 等；每帐户每项仅同步一次，快照顶层 `qlDefaultsApplied` 按帐户名记录已同步集合，用户删除已同步项不复活；落盘失败不阻断读取）。

### 4.5 回收站

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /recycle | 回收站列表 |
| POST | /recycle | 还原 |
| DELETE | /recycle | 彻底删除 |

条目 `key` 契约：由**客户端生成**（`被删节点完整路径#时间戳+随机`）。`DELETE /fs` 进回收站时，服务端从请求 `items[]` 中按路径匹配**仅采纳 key 标识符**（白名单：字符串、≤512 字节、无控制字符、含 `#` 分隔），条目内容（`node`/`name`/`origKey`/`deletedAt`）一律服务端依据真实被删节点构造，防止伪造 node 注入文件系统；key 缺失或不合法时服务端自建。还原/彻底删除按 key 精确匹配，保证与前端本地状态一致。

`origKey` 为**被删节点的父目录路径**（不含文件名），回收站窗口「原位置」列直接展示该值，还原时整段作为目标父目录。历史版本曾将 `origKey` 写为完整路径（含文件名），还原逻辑对末段恰等于条目文件名的旧格式自动截去兼容。

### 4.6 系统设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /settings | 获取 XP 系统设置 |
| PATCH | /settings | 更新 XP 系统设置 |

### 4.7 列表类资源

以下资源遵循统一的 CRUD 模式（GET 列表 / PUT 替换 / POST 新增 / DELETE 删除）：

| 资源 | 路径 | 说明 |
|------|------|------|
| 最近文档 | /recent-docs | 最近打开的文档列表 |
| 运行历史 | /run-history | 运行命令历史 |
| 打印机 | /printers | 打印机列表 |
| 计划任务 | /sched-tasks | 计划任务列表 |
| 网络驱动器 | /net-drives | 网络驱动器映射 |

### 4.8 音频设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /audio | 获取音量设置 |
| PUT | /audio | 更新音量设置 |
| DELETE | /audio | 重置音量设置 |

### 4.9 打印队列

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /print-jobs | 打印队列列表 |
| PUT | /print-jobs | 替换打印队列 |
| POST | /print-jobs | 新增打印任务 |
| PATCH | /print-jobs | 更新打印任务状态 |
| DELETE | /print-jobs | 删除打印任务 |

### 4.10 桌面布局

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /desktop | 获取桌面图标布局 |
| PUT | /desktop | 更新桌面图标布局 |

### 4.11 IE 浏览器数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /ie | 获取 IE 数据（收藏夹/历史等） |
| PUT | /ie | 更新 IE 数据 |
| DELETE | /ie | 清除历史记录 |

**响应字段契约**（`IeController::iePayload()`）：

| 字段 | 来源 | 说明 |
|------|------|------|
| home | 用户快照 `ie.home`（缺省回落 `defaultHome`） | 用户当前主页，可在桌面「Internet 选项」中自定义 |
| favorites | 用户快照 | 收藏夹 `[{url,title}]` |
| history | 用户快照 | 浏览历史 |
| defaultHome | 后台配置 `xp_ie_homepage`（实时计算） | **恒为后台配置值**，与 `home` 相互独立；前端「Internet 选项 → 使用默认页(D)」按钮与主页留空重置均取此值 |

`home` 与 `defaultHome` 分离是刻意设计：后台改配置会强制同步 `home`（见 4.12 `ieHomeApplied`），但同步之后用户仍可再次自定义 `home`，此时 `defaultHome` 保持后台值不变，「使用默认页」才能回到管理员设定的主页。

出厂默认主页为 `https://www.cmspro.cn/`（**必须带 https:// 协议前缀**：前端以 iframe 承载真实网页，站点部署在 HTTPS 下时 http 主页会被浏览器混合内容策略拦截而白屏）。后台填入纯域名时，`InitialStateProvider::normalizeIeHomepage()` 在**读取侧**自动补 `https://`；收藏夹首项标题取 `parse_url` 的 HOST，失败回退完整地址。

### 4.12 全量快照

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /state | 获取全量状态快照（前端启动时 hydrate） |

返回桌面布局、文件系统、设置、回收站等所有状态的合并快照，供前端初始化使用。

**驱动器容量注入**：响应前向 `fsTree` 根下名为 `(D:)` 结尾的 drive 节点注入 `total`/`used`（字节），数据源为后台空间管理：注册用户 `total = quota_mb × 1MiB`（`quota_mb=0` 不限制时取标称 40 GiB）、`used = used_mb × 1MiB`；免登录版无 UserSpace，`total` 取标称 40 GiB。注入字段仅存在于响应态，`saveState` 落盘前剥离，防止前端整表回传把配额固化进快照。前端磁盘属性对话框按节点 `total`/`used` 覆盖静态容量展示。出厂种子与老快照迁移只保留 `本地磁盘 (C:)` 与 `本地磁盘 (D:)` 两个 drive 节点（自动移除「3.5 软盘 (A:)」、「光盘驱动器 (D:)」）。

**IE 默认主页注入与强制同步**：

- **注入（仅响应态）**：`StateController::snapshot()` 向 `data.ie.defaultHome` 写入 `InitialStateProvider::configuredIeHomepage()`，供前端「Internet 选项 → 使用默认页」取值；该字段不参与落盘。前端 hydrate 时把它暴露为 `window.__XP_IE_HOME_DEFAULT__`，产物内两处兜底（`http://cn.msn.com/`）改为优先读该全局。
- **强制同步（会落盘）**：`StateService::applyStateMigrations()` 比对快照顶层 `ieHomeApplied`（记录「已生效的配置值」）与当前配置——不一致则覆盖 `ie.home` 并更新标记后落盘，一致则跳过。由此实现「后台改一次、所有用户下次加载桌面即生效」，同时**保留用户之后的自定义**（否则「Internet 选项」改主页形同虚设）。`InitialStateProvider::create()` 不种入该标记，首次加载由迁移补写。Guest 只读会话落盘失败不阻断读取。

### 4.13 文件上传与下载（blob）

内容存于独立对象存储、快照只留 `blobId` 引用的任意格式文件走本节端点（`FileController`）。与 `FsController` 的分工：后者处理「内容内嵌在快照 JSON 中」的文本与图片节点，受 10 MB 快照硬上限与 base64 膨胀制约；本节只受用户配额约束。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /fs/upload/init | 建立或复用上传会话 |
| POST | /fs/upload/chunk | 逐片上传（请求体为裸二进制） |
| POST | /fs/upload/complete | 合并落地为 blob 并挂载到文件树 |
| POST | /fs/upload/abort | 取消上传并清理分片 |
| GET | /fs/blob/{blobId} | 下载文件内容 |

**固定参数**（`BlobService` 常量）：

| 常量 | 值 | 含义 |
|------|-----|------|
| `CHUNK_SIZE` | 4194304（4 MB） | 单片字节数，末片可短 |
| `MAX_MERGE_BYTES` | 209715200（200 MB） | 单文件可合并上限（内存安全硬顶） |
| `UPLOAD_TTL_HOURS` | 24 | 进行中会话与 tmp 分片的超时清理口径 |

分片采用**裸二进制请求体**而非 multipart：省去表单解析与临时文件落盘，且 PHP 字符串二进制安全，`$request->getContent()` 可原样取回字节。这也绕开了 `post_max_size`（实测 50M）对单个大请求的静默丢弃。

#### POST /fs/upload/init

**请求体**（JSON）：

```json
{ "name": "安装包.iso", "parentPath": ["本地磁盘 (D:)", "Desktop"], "sizeBytes": 734003200 }
```

| 字段 | 类型 | 必填 | 校验 |
|------|------|------|------|
| `name` | string | 是 | 非空，且不得含路径分隔符 |
| `parentPath` | string[] | 是 | 必须是数组；节点须真实存在 |
| `sizeBytes` | int | 是 | 正整数；`> 0` 且 `≤ MAX_MERGE_BYTES` |

**响应 `data`**：

```json
{ "uploadId": "b7c1...", "chunkSize": 4194304, "chunkTotal": 175,
  "received": [0, 1, 2], "next": 3, "resumed": true }
```

| 字段 | 说明 |
|------|------|
| `uploadId` | 会话标识（`blobId` 同源生成器，64 位内字母数字） |
| `chunkSize` / `chunkTotal` | 分片大小与总片数（`ceil(sizeBytes / chunkSize)`） |
| `received` | 服务端已确认接收的分片索引数组（新建会话为空数组） |
| `next` | 下一个缺失分片索引；全部接收完毕为 `null` |
| `resumed` | 是否为断点续传（`count(received) > 0`） |

**断点续传语义**：命中**同名、同目录、同大小**的进行中会话时直接复用，返回服务端已确认的分片索引，客户端只需补传缺失部分。会话落库（`app_cmspro_windowsxponline_uploads`），因此关浏览器、断网、隔天回来都能继续传。

**校验顺序**（客户端踩坑点）：`name` → `parentPath` → `sizeBytes` → **访客只读** → **父路径存在** → **配额**。目录校验前置到 init，避免客户端传完整个大文件后才发现目标目录不存在；配额校验只在上传入口执行（`StateService::assertBlobFits()`），`saveState` 的快照校验口径保持不变，否则 blob 占满配额后桌面将无法保存任何改动（连删除大文件自救都做不到）。

**失败**：

| code | message |
|------|---------|
| 400 | `缺少必填字段: name` / `缺少必填字段: parentPath（路径段数组）` / `缺少必填字段: sizeBytes（正整数）` |
| 400 | `文件名不能为空且不得包含路径分隔符`（`invalid_param`） |
| 400 | `文件大小必须大于 0`（`invalid_param`） |
| 404 | `父路径不存在: {parentPath 以 / 连接}` |
| 409 | `访客模式为只读，不支持上传文件` |
| 409 | `文件过大，超出服务端可合并上限`（`too_large`） |
| 500 | `云空间不足（上限 %d MB，已用 %d MB），无法上传该文件`（`quota_exceeded`） |

> Guest 的快照不落盘，若仍允许上传，blob 会真实占用存储却没有任何树节点引用它，成为永远无法回收的孤儿对象，故在入口处直接拒绝。

#### POST /fs/upload/chunk

**查询参数**：`uploadId`（必填）、`index`（必填，分片序号，从 0 开始）。
**请求体**：该片裸二进制字节，`Content-Type: application/octet-stream`。

**响应 `data`**：与 init 相同（`uploadId`/`chunkSize`/`chunkTotal`/`received`/`next`/`resumed`）。

**幂等**：重复上传同一片直接覆盖并原样返回已接收列表，客户端网络抖动后无需感知服务端是否已收到该片。

> ⚠️ 校验顺序为**先解析会话、后校验序号**（`requireUpload()` → `is_numeric($index)`）。用未知 `uploadId` 测「缺 index」得到的是 404 `not_found` 而非 400。

**失败**：

| code | message |
|------|---------|
| 400 | `缺少必填查询参数: index（分片序号，从 0 开始）` |
| 400 | `分片序号超出范围`（`invalid_param`） |
| 400 | `分片 %d 大小应为 %d 字节，实际 %d 字节`（`chunk_mismatch`；末片按余数计算） |
| 404 | `上传会话不存在或已过期，请重新发起上传`（`not_found`，含不属于当前身份的 uploadId） |
| 409 | `该上传会话已结束，请重新发起上传`（`conflict`，status ≠ 0） |
| 500 | `分片写入云空间失败，请重试该分片`（`write_failed`） |

#### POST /fs/upload/complete

**请求**：表单或 JSON 传 `uploadId`。

**响应 `data`**：

```json
{ "name": "安装包 (2).iso", "blobId": "a91f...", "bytes": 734003200,
  "path": ["本地磁盘 (D:)", "Desktop", "安装包 (2).iso"] }
```

`name`/`path` 为服务端去重后的**最终值**，客户端必须以此为准回填本地树。

**落地顺序**：先合并 blob → 再写树节点（`attachNode`）→ 再存快照（`saveState`）。后两步任一失败都回滚 blob（`BlobService::remove()`）后重抛；反向顺序会出现「树里有节点但下载 404」的更坏结果，且无法自动修复。名称去重后同步元数据（`$file->name = $finalName; $file->save();`），否则下载到本地得到的是去重前的文件名。

**失败**：

| code | message |
|------|---------|
| 404 | `上传会话不存在或已过期，请重新发起上传` |
| 404 | `父路径不存在: {...}`（会话建立后目录被删；同时自动 abort 会话清理分片） |
| 409 | `该上传会话已结束，请重新发起上传` |
| 409 | `分片尚未接收完整，缺少第 %d 片` |
| 409 | `文件合并后大小与声明不一致，请重新上传` |
| 409 | `访客模式为只读，不支持上传文件`（同时自动 abort） |
| 409 | `分片 %d 已丢失，请重新上传该文件`（tmp 键被超时清理） |
| 500 | `state_too_large` 等快照写入异常（触发 10 MB 硬上限；blob 已回滚） |

#### POST /fs/upload/abort

**请求**：`uploadId`。**响应**：`{ "aborted": true }`。清理该会话已写入的全部分片并置 `status=2`。

#### GET /fs/blob/{blobId}

路由约束 `->where('blobId', '[A-Za-z0-9]{1,64}')`。成功时返回**裸字节流**（非信封），响应头：

| 头 | 值 | 用意 |
|----|-----|------|
| `Content-Type` | `application/octet-stream` | 强制二进制，阻断存储型 XSS |
| `Content-Length` | 字节数 | 下载进度可见 |
| `Content-Disposition` | `attachment; filename="{ascii}"; filename*=UTF-8''{rawurlencode}` | 中文名经 RFC 5987 传递 |
| `X-Content-Type-Options` | `nosniff` | 禁止浏览器嗅探 MIME |
| `Cache-Control` | `no-store` | **实际响应为 `no-store, private`**（Symfony 自动追加），断言须用包含匹配 |

> 若按上传时的真实 MIME 回显，用户存入的 HTML/SVG 会在本应用源下执行脚本，形成存储型 XSS。`filename` 中的 `\` `"` 被替换为 `_`，控制字符（`\x00-\x1F\x7F`）替换为 `_`，全为空白时回退 `download.bin`——混入 CRLF 可注入任意响应头（响应拆分），混入引号会截断 `filename` 值。

**失败**（信封格式，HTTP 200）：`404 文件不存在或无权访问`（含 blob 不属于当前身份）、`404 文件内容已丢失，请重新上传`（元数据在但对象缺失）。

**内存提示**：`read()` 全量载入内存后一次性下发，100 MB blob 的峰值约 200 MB；当前 `memory_limit=512M`，安全但余量不大。

**blob 对象键布局**：

```
正式：{userType}/{userId}/files/{blobId}
分片：{userType}/{userId}/tmp/{uploadId}/{index}
```

**配额口径**：`used = snapshotBytes(userType, userId) + BlobService::totalBytes(identity)`，`quotaBytes = quota_mb × 1048576`；`quota_mb <= 0` 表示不限制；`ANON_USER_TYPE`（免登录版）直接放行。

**会话状态机**（`app_cmspro_windowsxponline_uploads.status`）：`0` 进行中 → `1` 已完成 / `2` 已取消。仅 `0` 可写分片与合并。

### 4.14 压缩与解压（WinRAR 复刻）

三个端点对应 WinRAR 的三个动作（`ArchiveController`）。**压缩解压的实际格式为 ZIP**（PHP 无法生成 RAR，用内置 `ZipArchive`，不引入外部二进制），窗口视觉由前端 1:1 仿制。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /fs/archive/entries | 列出压缩包内条目 |
| POST | /fs/archive | 压缩选中的文件/文件夹 |
| POST | /fs/extract | 解压到目标目录 |

内容一律走 blob 独立存储：解压可能一次产出上百个文件，若沿用「内嵌 content」的老口径，快照会迅速撞上 10 MB 硬上限而整次失败。写入遵循与上传接口相同的**两段式**：先创建内容对象，再落盘快照；快照失败则回滚已创建的对象。

**固定参数**（`ArchiveService` 常量）：`MAX_TOTAL_BYTES = BlobService::MAX_MERGE_BYTES`（200 MB）、`MAX_ENTRIES = 2000`。

> ⚠️ GET 类端点的路径参数走 query：`BaseController::parsePath()` 对 query `path` 用 `explode('/')`，故前端须传 `?path=` + `encodeURIComponent(arr.join('/'))`；POST body 里的路径一律为数组。

#### GET /fs/archive/entries

**查询参数**：`path`（压缩包路径，`/` 连接后 URL 编码）。

**响应 `data`**：

```json
{ "name": "资料.zip",
  "entries": [ { "name": "a/报告.txt", "bytes": 1024, "dir": false } ] }
```

`entries[].name` 为归一化后的包内相对路径，`bytes` 为解压后大小，`dir` 标识目录条目。含非法路径（`..` 段）的条目**直接跳过不列出**：它们在解压时同样会被丢弃，列表若展示出来会让用户以为能解出而实际解不出。

条目名解码用 `statIndex($i, ZipArchive::FL_ENC_RAW)` 取压缩包内的原始字节：libzip 默认会把未标记 UTF-8 的条目名按 CP437 猜成合法 UTF-8，GBK 中文名会因此变成「╓╨╬─」，且 `mb_check_encoding` 判定通过，导致 GBK 兜底永不触发。

**失败**：

| code | message |
|------|---------|
| 400 | `缺少必填查询参数: path` |
| 400 | `目标不是文件` |
| 404 | `文件不存在或已被移动` |
| 404 | `文件内容已丢失，请重新上传` |

#### POST /fs/archive

**请求体**：

```json
{ "paths": [["本地磁盘 (D:)", "Desktop", "报告.txt"], ["本地磁盘 (D:)", "Desktop", "素材"]],
  "destPath": ["本地磁盘 (D:)", "Desktop"], "name": "备份.zip" }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `paths` | string[][] | 是 | 待压缩的文件/文件夹路径数组，非空 |
| `destPath` | string[] | 否 | 目标目录，缺省取源条目的父目录（`array_slice($source, 0, -1)`，WinRAR 默认行为）；节点 `kind` 须 ∈ `folder`/`drive` |
| `name` | string | 否 | 压缩包名。缺省：单选取目标名去扩展名，多选取 `新建压缩文件`；扩展名非 `zip` 时自动补 `.zip` |

**响应 `data`**：

```json
{ "name": "备份.zip", "blobId": "c3d2...", "bytes": 20480,
  "path": ["本地磁盘 (D:)", "Desktop", "备份.zip"], "entries": 12 }
```

**收集口径**（`ArchiveService::collect()`）：与 WinRAR「添加到压缩文件」一致——被选中的文件/文件夹**自身名称作为包内根级条目**，文件夹内部层级原样保留。空文件夹不产生条目（ZIP 需显式目录条目，而解压侧按文件路径隐式重建目录，两侧口径统一为「只存文件」）。

节点内容存在**三种历史形态**，压缩时全部覆盖（否则老数据压出来的包会缺文件）：`blobId`（独立对象存储，任意格式文件）、`src`（base64 dataURL，早期导入的图片/音频）、`content`（内嵌纯文本，记事本写入）。

**配额按压缩后真实字节校验**（`assertBlobFits($identity, strlen($data))`）：未压缩总量会大幅高估，误拒合法请求。

**失败**：

| code | message |
|------|---------|
| 400 | `缺少必填字段: paths` |
| 400 | `所选内容中没有可压缩的文件` |
| 404 | `所选文件不存在或已被移动`（任一路径失效即**整体失败**，不压部分内容） |
| 404 | `目标目录不存在` |
| 409 | `访客模式为只读，不支持压缩文件` |
| 409 | `所选内容中存在同名文件「{相对路径}」，请分次压缩或先重命名`（跨目录同名） |
| 409 | `所选内容共约 %d MB，超过单次压缩 %d MB 上限`（`too_large`） |
| 500 | 配额不足；或快照写入异常（此时 `BlobService::remove()` 回滚已创建对象后重抛） |

#### POST /fs/extract

**请求体**：

```json
{ "path": ["本地磁盘 (D:)", "Desktop", "资料.zip"], "destPath": ["本地磁盘 (D:)", "Desktop"] }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string[] | 是 | 压缩包路径 |
| `destPath` | string[] | 否 | 解压目标目录，缺省取压缩包父目录 |

**响应 `data`**：`{ "extracted": 12, "path": ["本地磁盘 (D:)", "Desktop", "资料"] }`——`path` 为**实际落地目录**。

**默认建同名子目录**：与 WinRAR「解压到 <名称>\」一致，`ensureFolderPath($fsTree, $destPath, [$this->folderName($node)])` 在目标目录下自动创建以压缩包名（去扩展名）命名的子目录。

**逐条落地的容错**：`storeEntry` 遇到同名文件挡路（`ensureFolderPath` 返回 null）时**跳过该条目而非整体失败**，与 WinRAR 的「跳过」一致；`extracted` 为实际写入数。写入过程中抛异常则 `BlobService::removeMany($identity, $created)` 回滚本次已创建的全部对象。

**条目名归一化**（`normalizeEntryName()`，防 zip slip）：`\` 统一为 `/`；`.` 段与空段跳过（continue）；出现 `..` 段直接返回 null 拒绝该条目；名称经 `sanitizeFileName()` 清洗（`\` `/` → `_`，剔除控制字符，`rtrim('. ')`，`.`/`..` → 空）。名称既作路径段参与树寻址，也写入 blob 元数据并出现在 `Content-Disposition` 中。

**失败**：

| code | message |
|------|---------|
| 400 | `缺少必填查询参数: path` |
| 400 | `压缩包内没有可解压的文件` |
| 404 | `文件不存在或已被移动` / `目标不是文件` / `文件内容已丢失，请重新上传` |
| 409 | `访客模式为只读，不支持解压文件` |
| 409 | `无法创建目标目录，请确认同名的不是文件` |
| 500 | 配额不足（按解出内容总字节校验）；快照超限（已回滚本次全部对象） |

**前端呈现**：窗口由补丁脚本 `winrar-r1.js` 以 vanilla DOM 自建（`window.__xpWinrar`，三入口 `open`/`addTo`/`extractTo`），复用 `wizard-r1.js` 的 XP Luna CSS 与树选择器。工具栏与菜单**只提供有后端支撑的动作**，不提供「测试」「删除」「修复」「追加到压缩包」；压缩对话框里的 RAR 格式、压缩方式与压缩选项一律**灰置**（Windows 软件表达「此选项不可用」的标准方式）。进度对话框用**不确定态滚动条**：压缩解压是一次性同步请求，服务端不回传中间进度，画假百分比等于欺骗用户；同理不提供取消按钮——fetch 中断后服务端仍会写完并落盘，「已取消但文件出现了」比没有取消更糟。
