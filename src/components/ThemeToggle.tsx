'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const THEME_KEY = 'logpad-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function setMetaThemeColor(theme: Theme) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#f7f9fc')
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  localStorage.setItem(THEME_KEY, theme)
  setMetaThemeColor(theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    const nextTheme = isTheme(stored) ? stored : 'light'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs text-text-2 transition-colors hover:border-accent/40 hover:text-text"
      aria-label={`切换到${isLight ? '深色' : '浅色'}模式`}
      aria-pressed={!isLight}
    >
      <span>
        <span className="block font-medium text-text">{isLight ? '浅色模式' : '深色模式'}</span>
        <span className="text-text-3">{isLight ? '白底，更适合长时间操作' : '暗底，适合弱光环境'}</span>
      </span>
      <span className="relative h-6 w-11 rounded-full bg-surface-3">
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-accent transition-transform ${
            isLight ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}
