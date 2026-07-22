import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 电商运营 Agent",
  description: "面向电商新手和运营团队的飞书驱动 AI 店铺运营教练。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
