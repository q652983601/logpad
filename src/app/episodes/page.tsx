'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'
import { countCompletedStages, PIPELINE_STAGE_KEYS } from '@/lib/pipeline-status'

interface Episode {
  id: string
  title: string
  status: string
  dbStatus: string
  createdAt: string
  stages: Record<string, { exists: boolean }>
}

const STATUS_LABELS: Record<string, string> = {
  inbox: '收件箱',
  researching: '研究中',
  scripting: '写脚本',
  shooting: '录制',
  editing: '包装',
  published: '已发布',
}

const NEXT_ACTION: Record<string, { label: string; href: (id: string) => string }> = {
  inbox: { label: '判断承诺点', href: id => `/episodes/${id}` },
  researching: { label: '补研究证据', href: id => `/episodes/${id}` },
  scripting: { label: '写口播脚本', href: id => `/episodes/${id}/script` },
  shooting: { label: '进入录制', href: id => `/episodes/${id}/record` },
  editing: { label: '做包装检查', href: id => `/episodes/${id}` },
  published: { label: '看数据复盘', href: () => '/review' },
}

function nextMissingStage(stages: Episode['stages']): string {
  return PIPELINE_STAGE_KEYS.find(stage => !stages?.[stage]?.exists) || 'done'
}

export default function EpisodesIndex() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  async function loadEpisodes() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/runs?limit=200')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEpisodes(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEpisodes()
  }, [])

  const filtered = useMemo(() => {
    return episodes.filter(ep => {
      const epStatus = ep.dbStatus || ep.status
      if (status !== 'all' && epStatus !== status) return false
      if (query && !`${ep.title} ${ep.id}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [episodes, query, status])

  const active = filtered.filter(ep => !['published', 'archived'].includes(ep.dbStatus || ep.status))
  const readyToRecord = filtered.filter(ep => ['scripting', 'shooting'].includes(ep.dbStatus || ep.status))

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <ErrorBanner message={error} onRetry={loadEpisodes} />

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3">Topic Workspace</p>
            <h1 className="mt-1 text-2xl font-bold">内容工厂</h1>
            <p className="mt-1 text-sm text-text-2">按选题推进脚本、录制、包装和复盘。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">活跃选题</p>
              <p className="mt-1 text-xl font-semibold">{active.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">可录制</p>
              <p className="mt-1 text-xl font-semibold">{readyToRecord.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">总数</p>
              <p className="mt-1 text-xl font-semibold">{filtered.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索标题或 ID"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-text-2">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <p className="text-sm text-text-2">没有匹配的选题。</p>
            <Link href="/" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              回首页新建选题
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ep => {
              const epStatus = ep.dbStatus || ep.status
              const action = NEXT_ACTION[epStatus] || NEXT_ACTION.inbox
              const done = countCompletedStages(ep.stages)
              const missing = nextMissingStage(ep.stages)
              return (
                <div key={ep.id} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/30">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-surface-3 px-2 py-0.5 text-[11px] text-text-3">{STATUS_LABELS[epStatus] || epStatus}</span>
                        <span className="font-mono text-[11px] text-text-3">{ep.id}</span>
                      </div>
                      <Link href={`/episodes/${ep.id}`} className="text-base font-semibold text-text hover:text-accent">
                        {ep.title}
                      </Link>
                      <p className="mt-1 text-xs text-text-3">
                        {done}/10 节点完成{missing !== 'done' ? `，下一缺口：${missing}` : '，可进入发布复盘'}
                      </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3 md:w-40">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${done * 10}%` }} />
                    </div>
                    <Link
                      href={action.href(ep.id)}
                      className="shrink-0 rounded-lg border border-accent/40 px-4 py-2 text-center text-sm font-semibold text-accent hover:bg-accent/10"
                    >
                      {action.label}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
