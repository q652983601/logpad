'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'

interface Episode {
  id: string
  title: string
  status: string
  dbStatus: string
  createdAt: string
  stages: Record<string, { exists: boolean }>
  score_curiosity?: number
  score_audience?: number
  score_platform?: number
  score_feasibility?: number
}

const COLUMNS = [
  { key: 'inbox', label: 'Inbox', color: 'text-text-2' },
  { key: 'researching', label: 'Researching', color: 'text-orange' },
  { key: 'scripting', label: 'Scripting', color: 'text-accent' },
  { key: 'shooting', label: 'Shooting', color: 'text-orange' },
  { key: 'editing', label: 'Editing', color: 'text-accent-2' },
  { key: 'published', label: 'Published', color: 'text-green' },
]

const TAG_COLORS: Record<string, string> = {
  '工作流': 'bg-orange/15 text-orange',
  '装备': 'bg-green/15 text-green',
  'AI': 'bg-accent/15 text-accent',
  '生活方式': 'bg-accent-2/15 text-accent-2',
}

export default function Dashboard() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function loadEpisodes() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/runs')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEpisodes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEpisodes()
  }, [])

  async function createEpisode(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const id = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`

    try {
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: newTitle, platforms: ['youtube', 'douyin', 'bilibili'] }),
      })

      await loadEpisodes()
      setNewTitle('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
  }

  async function moveStatus(id: string, status: string) {
    try {
      await fetch(`/api/runs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      await loadEpisodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <ErrorBanner message={error} onRetry={loadEpisodes} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">选题看板</h2>
            <p className="text-text-2 text-sm mt-1">从想法到发布，每个选题的状态一目了然</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + 新建选题
          </button>
        </div>

        {showForm && (
          <form onSubmit={createEpisode} className="mb-8 bg-surface border border-border rounded-xl p-5">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="输入选题标题..."
              className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex gap-3 mt-3">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                创建
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                取消
              </button>
            </div>
          </form>
        )}

        <div className="flex overflow-x-auto flex-nowrap gap-4 lg:grid lg:grid-cols-6">
          {COLUMNS.map(col => (
            <div key={col.key} className="bg-surface/50 rounded-xl border border-border min-w-[280px] lg:min-w-0">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                <span className="text-xs bg-surface-3 px-2 py-0.5 rounded-full text-text-3">
                  {episodes.filter(e => (e.dbStatus || e.status) === col.key).length}
                </span>
              </div>
              <div className="p-3 space-y-3">
                {episodes
                  .filter(e => (e.dbStatus || e.status) === col.key)
                  .map(ep => (
                    <div key={ep.id} className="bg-surface-2 border border-border rounded-lg p-3 group hover:border-accent/30 transition-colors">
                      <a href={`/episodes/${ep.id}`} className="block">
                        <h4 className="text-sm font-medium text-text leading-snug mb-2">{ep.title}</h4>
                      </a>

                      {ep.score_curiosity && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent to-accent-2 rounded-full"
                              style={{ width: `${(ep.score_curiosity + (ep.score_audience || 0) + (ep.score_platform || 0) + (ep.score_feasibility || 0)) / 4 * 10}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-text-3">
                            {((ep.score_curiosity + (ep.score_audience || 0) + (ep.score_platform || 0) + (ep.score_feasibility || 0)) / 4).toFixed(1)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-3">{ep.id.slice(0, 8)}</span>
                        {Object.entries(ep.stages || {}).filter(([, v]) => v.exists).length > 0 && (
                          <span className="text-[10px] text-green ml-auto">
                            {Object.entries(ep.stages).filter(([, v]) => v.exists).length}/10 节点
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-border/50 flex gap-1">
                        {COLUMNS.map((c, i) => {
                          const currentIdx = COLUMNS.findIndex(cc => cc.key === (ep.dbStatus || ep.status))
                          const isActive = i === currentIdx
                          const isDone = i < currentIdx
                          return (
                            <button
                              key={c.key}
                              onClick={() => moveStatus(ep.id, c.key)}
                              className={`flex-1 h-1 rounded-full transition-colors ${
                                isActive ? 'bg-accent' : isDone ? 'bg-green/50' : 'bg-surface-3'
                              }`}
                              title={c.label}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
