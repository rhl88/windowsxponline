import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windows XP WebOS - 1:1 复刻",
  description: "运行在浏览器里的 Windows XP：Luna 主题、开始菜单、任务栏、扫雷、纸牌、画图、计算器、IE —— 致敬 2001。",
  keywords: ["Windows XP", "WebOS", "复刻", "Luna", "怀旧", "扫雷", "纸牌"],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M6 12 Q14 7 22 7 L22 22 Q14 22 6 26 Z' fill='%23e0492f'/%3E%3Cpath d='M25 7 Q33 7 41 11 L41 24 Q33 21 25 22 Z' fill='%237ac843'/%3E%3Cpath d='M6 29 Q14 25 22 25 L22 40 Q14 40 6 43 Z' fill='%2346a4ee'/%3E%3Cpath d='M25 25 Q33 24 41 27 L41 41 Q33 38 25 40 Z' fill='%23f5d43a'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#245edb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-black overflow-hidden">{children}</body>
    </html>
  );
}
