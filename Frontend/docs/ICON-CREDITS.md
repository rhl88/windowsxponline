# 图标素材来源与致谢 (Icon Credits)

## public/icons/{48,32,16} 中的真实 XP 图标

本项目部分图标素材取自 **B00merang Artwork - Windows XP** 图标主题
(https://github.com/B00merang-Artwork/Windows-XP)，该主题是经典 YlmfOS
图标主题的重制版，图标画风来自真实 Windows XP 系统资源。

- 许可证：GPL-2.0（全文见同目录 `ICON-LICENSE-GPL2.txt`）
- 用途：WebXP 像素级复刻项目的系统图标（桌面 / 资源管理器 / 对话框 / 开始按钮旗帜等）

## 已替换图标清单（25 项 × 48/32 桶 + 10 项 16 桶）

| 用途 | 图标名 |
| --- | --- |
| 桌面系统图标 | mycomputer, mydocs, mynetplaces, recycle-empty, recycle-full |
| 文件夹 | folder-plain, folder-open, folder-pictures, folder-music, folder-video |
| 驱动器/设备 | harddrive, cddrive, floppydrive, printer |
| 系统位置 | controlpanel, useravatar |
| 对话框 | dlg-error, dlg-info, dlg-warn |
| 电源对话框 | power-restart, power-standby, switchuser |
| 文件类型 | audiofile, videofile |
| 开始按钮旗帜 | winflag（16 桶按 20×20 渲染，开始按钮 1:1 显示） |

16px 档仅在存在原生 16×16 像素画时替换（folder 系列 / user-trash /
network / tray-volume / audio / video），应用类小图标保留程序化绘制版本。

注：ie 图标曾短暂替换为 B00merang 版本，后依用户要求回退为 PIL 原稿
（三桶均为程序化绘制版本，不含 GPL 素材）。

## 原程序化（PIL）图标备份

被替换的原始 PIL 手绘图标备份于开发目录 `.zscripts/pil-icons-backup/`
（不随分发包发布），如需回滚可整目录拷回 `public/icons/`。
