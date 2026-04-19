'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
          <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">出错了</h2>
            <p className="text-[var(--text-2)] text-sm mb-6">
              页面渲染时遇到了问题，请尝试重新加载。
            </p>
            {this.state.error && (
              <div className="mb-6 text-left bg-[var(--surface-2)] rounded-lg p-4 overflow-auto">
                <p className="text-xs text-red-400 font-mono">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
