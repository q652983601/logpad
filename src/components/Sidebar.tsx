'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { icon: '◆', label: '选题看板', href: '/' },
  { icon: '✎', label: '内容工厂', href: '/episodes' },
  { icon: '◍', label: '口述资料库', href: '/voice' },
  { icon: '▣', label: '包装车间', href: '/packaging' },
  { icon: '▤', label: '素材库', href: '/assets' },
]

const opsItems = [
  { icon: '▶', label: '发布台', href: '/distribution' },
  { icon: '◈', label: '数据复盘', href: '/review' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navContent = (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight">LogPad</h1>
        <p className="text-xs text-text-3 mt-1">自媒体生产驾驶舱</p>
      </div>

      <nav className="flex-1 px-4">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3 px-3 mb-2">Workspace</p>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-2 hover:text-text hover:bg-surface-2'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-3 px-3 mb-2">Operations</p>
          {opsItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-2 hover:text-text hover:bg-surface-2'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <ThemeToggle />
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-xs text-text-3">当前方向</p>
          <p className="text-xs text-text mt-1 font-medium">ITP 型好奇者学习日志</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-surface border border-border text-text shadow-sm"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[55]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-border flex-col h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile slide-in sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-[56] w-64 bg-surface border-r border-border flex flex-col transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>
    </>
  )
}
