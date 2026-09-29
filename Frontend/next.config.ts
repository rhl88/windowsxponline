import type { NextConfig } from "next";

/* 双发布形态：
 * - 动态部署（默认）：output=standalone，Node 运行时 + /api/v1 模拟服务
 * - 静态发布（NEXT_PUBLIC_API_BASE=local）：output=export，纯 HTML/JS/CSS，
 *   数据走浏览器内置 Local 引擎（localStorage），api/ 目录由构建脚本临时移出 */
const isStaticExport = process.env.NEXT_PUBLIC_API_BASE === "local";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  /* Turbopack 生产构建不会自动内联 NEXT_PUBLIC_*（bundle 中保留字面引用，浏览器端恒 undefined）
   * → 必须用 env 配置显式注入；空串在 getApiBase 中被跳过，动态版行为不变 */
  env: { NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? "" },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
