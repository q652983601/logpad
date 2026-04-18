import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import QuickNote from "@/components/QuickNote";

export const metadata: Metadata = {
  title: "LogPad — 自媒体生产驾驶舱",
  description: "AI 辅助的真实学习日志生产系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body className="antialiased min-h-screen">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <QuickNote />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js') }`}
        </Script>
      </body>
    </html>
  );
}
