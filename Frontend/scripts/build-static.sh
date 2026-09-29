#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# 静态发布构建脚本（WebXP → 纯静态站点）
# 产物：out/ —— 任意静态 Web 环境（Nginx/Apache/GitHub Pages/CDN）直接托管
# 数据：浏览器内置 Local 引擎（localStorage 持久化，无需 Node）
#
# 用法：bash scripts/build-static.sh
# 可选：OUT_DIR=/path 指定产物目录（默认 out/）
# ═══════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="${OUT_DIR:-out}"
API_DIR="src/app/api"
API_STASH=".api-stash-$$"

echo "▸ [1/4] 质量门（lint + tsc）"
bun run lint
# tsc 仅校验项目源码（skills/ 为工具链目录，历史噪音不阻断）
TSC_OUT=$(bunx tsc --noEmit 2>&1 || true)
if echo "$TSC_OUT" | grep -qE '^src/'; then
  echo "$TSC_OUT" | grep -E '^src/'
  echo "✗ src/ 存在类型错误"
  exit 1
fi

echo "▸ [2/4] 移出 API 路由（静态导出不兼容服务端路由）"
if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$API_STASH"
else
  echo "  （$API_DIR 不存在，跳过）"
fi

restore_api() {
  if [ -d "$API_STASH" ]; then
    mv "$API_STASH" "$API_DIR"
    echo "  （API 路由已恢复）"
  fi
}
trap restore_api EXIT

echo "▸ [3/4] 静态导出构建（NEXT_PUBLIC_API_BASE=local → Local 引擎）"
rm -rf "$OUT_DIR"
# 直接调 next build：package.json 的 build 命令含 standalone 专属拷贝步骤（静态模式不适用）
NEXT_PUBLIC_API_BASE=local bunx next build

echo "▸ [4/4] 产物校验"
if [ ! -f "$OUT_DIR/index.html" ]; then
  echo "✗ 缺少 $OUT_DIR/index.html——构建失败"
  exit 1
fi
FILES=$(find "$OUT_DIR" -type f | wc -l)
SIZE=$(du -sh "$OUT_DIR" | cut -f1)
echo ""
echo "✓ 静态构建完成：$OUT_DIR/（$FILES 个文件，$SIZE）"
echo "  托管示例：  cd $OUT_DIR && python3 -m http.server 8080"
echo "  Nginx：     root $PWD/$OUT_DIR;（单页应用，无需 rewrite）"
echo "  数据说明：  localStorage 持久化；「API 数据源设置」(apicfg) 可切换自建后端"
