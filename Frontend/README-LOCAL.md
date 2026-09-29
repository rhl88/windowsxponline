# WebXP — Windows XP WebOS 复刻版

浏览器里的 Windows XP：像素级复刻 Luna 主题桌面、40+ 应用/系统组件、完整虚拟文件系统与回收站、全套 API 化状态管理。

## 快速开始

```bash
npm install        # 或 bun install / pnpm install
npm run dev        # http://localhost:3000
```

启动后走完整 XP 引导流程（BIOS → XP logo → 欢迎屏），单击 **Administrator** 登录桌面。

## 生产构建

```bash
npm run build
npm start          # standalone 模式（.next/standalone/server.js）
```

> **standalone 注意**：server.js 会切换工作目录，需在 `.env` 中显式指定状态库绝对路径：
> `XP_STATE_FILE=/absolute/path/to/db/xp-state.json`
> 首次运行会自动播种全新初始状态（壁纸/桌面图标/文件系统等）。

## 环境变量（.env）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | SQLite（Prisma 脚手架预留，XP 功能不依赖） |
| `NEXT_PUBLIC_API_BASE` | 可选。对接真实后端时的 API 基址；不设置 = 同源 `/api/v1` JSON mock |
| `XP_STATE_FILE` | 可选。standalone 部署时 JSON 状态库绝对路径 |

API 基址三级优先级：系统内「API 数据源设置」对话框（localStorage）> `NEXT_PUBLIC_API_BASE` > 默认同源 `/api/v1`。

## 目录速览

```
src/app/api/v1/    本地 JSON mock API（38 个端点）
src/server/        mock-db + 操作层（持久化到 db/xp-state.json）
src/components/xp/ 桌面/任务栏/窗口管理器/全部应用
docs/              API 文档（md + docx）
public/            壁纸与媒体资源
```

接口文档：`docs/API.md`（含所有端点、DTO 与调用约定）。

## 素材致谢

- 系统图标（桌面/资源管理器/对话框/开始按钮旗帜等）：[B00merang Artwork - Windows XP](https://github.com/B00merang-Artwork/Windows-XP)，GPL-2.0，详见 `docs/ICON-CREDITS.md`
- 真实 XP 音效采样：见 `public/media/snd/` 来源说明（GitHub 社区采样）
