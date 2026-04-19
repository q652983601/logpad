'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import CommandPalette from './CommandPalette'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15000,
        refetchOnWindowFocus: false,
      },
    },
  }))
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const onUpdateReady = () => setUpdateReady(true)
    window.addEventListener('logpad:update-ready', onUpdateReady)
    return () => window.removeEventListener('logpad:update-ready', onUpdateReady)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <CommandPalette />
      {updateReady && (
        <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg border border-accent/30 bg-surface px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text">LogPad 有新版本</span>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
            >
              刷新
            </button>
          </div>
        </div>
      )}
    </QueryClientProvider>
  )
}
