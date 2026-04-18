'use client'

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null
  return (
    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
      <span className="text-sm text-red-400">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-red-500/15 text-red-400 rounded text-xs font-medium hover:bg-red-500/25"
        >
          重试
        </button>
      )}
    </div>
  )
}
