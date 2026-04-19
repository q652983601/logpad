import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import ErrorBoundary from "@/components/ErrorBoundary";
import QuickNote from "@/components/QuickNote";

export const metadata: Metadata = {
  title: "LogPad — 自媒体生产驾驶舱",
  description: "AI 辅助的真实学习日志生产系统",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f7f9fc" />
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function () {
  try {
    var theme = localStorage.getItem('logpad-theme');
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#f7f9fc');
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();`}
        </Script>
      </head>
      <body className="antialiased min-h-screen">
        <AppProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AppProviders>
        <QuickNote />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function (registration) {
    registration.addEventListener('updatefound', function () {
      var worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('logpad:update-ready'));
        }
      });
    });
  });
}`}
        </Script>
      </body>
    </html>
  );
}
