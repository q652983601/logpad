'use client'

import { useState, useEffect, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'
import { countCompletedStages } from '@/lib/pipeline-status'

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

interface Metrics {
  id: number
  episode_id: string
  platform: string
  views: number
  completion_rate: number
  likes: number
  comments: number
  shares: number
  new_followers: number
  ctr: number
  recorded_at: string
}

interface PublishingPlan {
  id: number
  episode_id: string
  platform: string
  title: string
  scheduled_at: string | null
  status: string
}

const COLUMNS = [
  { key: 'inbox', label: 'Inbox', color: 'text-text-2' },
  { key: 'researching', label: 'Researching', color: 'text-orange' },
  { key: 'scripting', label: 'Scripting', color: 'text-accent' },
  { key: 'shooting', label: 'Shooting', color: 'text-orange' },
  { key: 'editing', label: 'Editing', color: 'text-accent-2' },
  { key: 'published', label: 'Published', color: 'text-green' },
]

const PLATFORM_OPTIONS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'douyin', label: '抖音' },
  { id: 'bilibili', label: 'B站' },
  { id: 'xiaohongshu', label: '小红书' },
]

const START_TARGETS = [
  { id: 'episode', label: '先判断选题' },
  { id: 'script', label: '直接写脚本' },
  { id: 'record', label: '进入录制' },
]

const STATUS_ACTIONS: Record<string, { label: string; href: (id: string) => string; tone: string }> = {
  inbox: { label: '判断是否值得做', href: id => `/episodes/${id}`, tone: 'text-text-2' },
  researching: { label: '补信号和研究证据', href: id => `/episodes/${id}`, tone: 'text-orange' },
  scripting: { label: '完善脚本和 Hook', href: id => `/episodes/${id}/script`, tone: 'text-accent' },
  shooting: { label: '录制口播素材', href: id => `/episodes/${id}/record`, tone: 'text-orange' },
  editing: { label: '做包装、发布包和 QC', href: id => `/episodes/${id}`, tone: 'text-accent-2' },
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function daysSince(value: string, referenceTime: number): number {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 0
  return Math.max(0, Math.floor((referenceTime - time) / 86400000))
}

export default function Dashboard() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [plans, setPlans] = useState<PublishingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newPromise, setNewPromise] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube', 'douyin', 'bilibili'])
  const [startTarget, setStartTarget] = useState('episode')
  const [showForm, setShowForm] = useState(false)
  const [agentTaskLoading, setAgentTaskLoading] = useState(false)
  const [agentTaskMessage, setAgentTaskMessage] = useState('')
  const [snapshotTime, setSnapshotTime] = useState(0)

  async function loadEpisodes() {
    setLoading(true)
    setError('')
    try {
      const [runsRes, metricsRes, plansRes] = await Promise.all([
        fetch('/api/runs?limit=120'),
        fetch('/api/metrics'),
        fetch('/api/publishing'),
      ])
      if (!runsRes.ok) throw new Error(`HTTP ${runsRes.status}`)
      const [runs, metricRows, planRows] = await Promise.all([
        runsRes.json(),
        metricsRes.ok ? metricsRes.json() : Promise.resolve([]),
        plansRes.ok ? plansRes.json() : Promise.resolve([]),
      ])
      setEpisodes(runs)
      setMetrics(metricRows)
      setPlans(planRows)
      setSnapshotTime(Date.now())
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
        body: JSON.stringify({
          id,
          title: newTitle,
          description: newPromise,
          platforms: selectedPlatforms.length ? selectedPlatforms : ['youtube'],
        }),
      })

      await loadEpisodes()
      setNewTitle('')
      setNewPromise('')
      setSelectedPlatforms(['youtube', 'douyin', 'bilibili'])
      setShowForm(false)
      if (startTarget === 'script') {
        window.location.href = `/episodes/${id}/script`
      } else if (startTarget === 'record') {
        window.location.href = `/episodes/${id}/record`
      } else {
        window.location.href = `/episodes/${id}`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    }
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms(current => (
      current.includes(platform)
        ? current.filter(item => item !== platform)
        : [...current, platform]
    ))
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

  const metricsByEpisode = useMemo(() => {
    const map = new Map<string, Metrics[]>()
    for (const metric of metrics) {
      const list = map.get(metric.episode_id) || []
      list.push(metric)
      map.set(metric.episode_id, list)
    }
    return map
  }, [metrics])

  const plansByEpisode = useMemo(() => {
    const map = new Map<string, PublishingPlan[]>()
    for (const plan of plans) {
      const list = map.get(plan.episode_id) || []
      list.push(plan)
      map.set(plan.episode_id, list)
    }
    return map
  }, [plans])

  const commandCenter = useMemo(() => {
    const active = episodes.filter(e => !['published', 'archived'].includes(e.dbStatus || e.status))
    const published = episodes.filter(e => (e.dbStatus || e.status) === 'published')
    const noMetrics = published.filter(e => !metricsByEpisode.has(e.id))
    const stalled = active.filter(e => daysSince(e.createdAt, snapshotTime) >= 7)
    const scheduledSoon = plans.filter(plan => {
      if (plan.status === 'published' || !plan.scheduled_at) return false
      const when = new Date(plan.scheduled_at).getTime()
      if (!Number.isFinite(when)) return false
      const diff = when - snapshotTime
      return diff >= 0 && diff <= 7 * 86400000
    })

    const actionRows = [
      ...noMetrics.slice(0, 3).map(ep => ({
        key: `metrics-${ep.id}`,
        label: '补发布后数据',
        detail: ep.title,
        href: '/review',
        tone: 'text-green',
      })),
      ...scheduledSoon.slice(0, 3).map(plan => ({
        key: `schedule-${plan.id}`,
        label: '检查即将发布',
        detail: plan.title,
        href: '/distribution',
        tone: 'text-accent',
      })),
      ...active.slice(0, 6).map(ep => {
        const status = ep.dbStatus || ep.status
        const action = STATUS_ACTIONS[status] || STATUS_ACTIONS.inbox
        return {
          key: `episode-${ep.id}`,
          label: action.label,
          detail: ep.title,
          href: action.href(ep.id),
          tone: action.tone,
        }
      }),
    ].slice(0, 5)

    return {
      activeCount: active.length,
      publishedCount: published.length,
      noMetricsCount: noMetrics.length,
      scheduledSoonCount: scheduledSoon.length,
      stalledCount: stalled.length,
      actionRows,
    }
  }, [episodes, metricsByEpisode, plans, snapshotTime])

  async function sendSystemHandoff() {
    if (agentTaskLoading) return
    setAgentTaskLoading(true)
    setAgentTaskMessage('')

    const nextActions = commandCenter.actionRows.length
      ? commandCenter.actionRows.map((item, idx) => `${idx + 1}. ${item.label}: ${item.detail}`).join('\n')
      : '暂无明确下一步，建议检查灵感速记和新建选题。'

    const statusLines = [
      `进行中：${commandCenter.activeCount}`,
      `已发布：${commandCenter.publishedCount}`,
      `待补数据：${commandCenter.noMetricsCount}`,
      `7 天内发布：${commandCenter.scheduledSoonCount}`,
      `卡住超过 7 天：${commandCenter.stalledCount}`,
      '',
      '今天优先动作：',
      nextActions,
    ].join('\n')

    try {
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_patrol',
          content: statusLines,
          context: '来自 LogPad 首页操作台。请按本机自媒体工作流写回可执行待办，适合 OpenClaw 异步巡检。',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '系统交接失败')
      setAgentTaskMessage(data.result || '已写入系统交接单')
    } catch (err) {
      setAgentTaskMessage(err instanceof Error ? err.message : '系统交接失败')
    } finally {
      setAgentTaskLoading(false)
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
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-3">
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="选题标题，例如：我用 3 个 agent 做一条 AI 视频"
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                  autoFocus
                />
                <textarea
                  value={newPromise}
                  onChange={e => setNewPromise(e.target.value)}
                  placeholder="这条内容给观众的承诺点：看完能得到什么、少走什么弯路"
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-text-3 mb-2">目标平台</p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map(platform => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => togglePlatform(platform.id)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedPlatforms.includes(platform.id)
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border bg-surface-2 text-text-2 hover:text-text'
                        }`}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-3 mb-2">创建后进入</p>
                  <select
                    value={startTarget}
                    onChange={e => setStartTarget(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                  >
                    {START_TARGETS.map(target => (
                      <option key={target.id} value={target.id}>{target.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                创建并进入
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                取消
              </button>
            </div>
          </form>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 mb-8">
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-text-3 uppercase tracking-wider">Today</p>
                <h3 className="text-lg font-semibold mt-1">今天先推进这些</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href="/review" className="text-xs text-accent hover:text-accent/80">查看复盘</a>
                <button
                  onClick={sendSystemHandoff}
                  disabled={agentTaskLoading}
                  className="text-xs px-3 py-1.5 rounded-md border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
                >
                  {agentTaskLoading ? '交接中...' : 'OpenClaw 巡检'}
                </button>
              </div>
            </div>
            {agentTaskMessage && (
              <div className="mb-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent">
                {agentTaskMessage}
              </div>
            )}
            {commandCenter.actionRows.length === 0 ? (
              <div className="text-sm text-text-3 py-6">当前没有卡住的事项，可以从新建选题或灵感速记开始。</div>
            ) : (
              <div className="space-y-2">
                {commandCenter.actionRows.map((item, idx) => (
                  <a
                    key={item.key}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg bg-surface-2 border border-border px-3 py-3 hover:border-accent/30 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-md bg-surface-3 text-[11px] text-text-2 flex items-center justify-center">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${item.tone}`}>{item.label}</p>
                      <p className="text-xs text-text-3 truncate mt-0.5">{item.detail}</p>
                    </div>
                    <span className="text-text-3">→</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-3">进行中</p>
              <p className="text-2xl font-bold mt-1">{commandCenter.activeCount}</p>
              <p className="text-[11px] text-text-3 mt-2">还没发布的选题</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-3">待补数据</p>
              <p className="text-2xl font-bold mt-1">{commandCenter.noMetricsCount}</p>
              <p className="text-[11px] text-text-3 mt-2">已发布但没复盘</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-3">7 天内发布</p>
              <p className="text-2xl font-bold mt-1">{commandCenter.scheduledSoonCount}</p>
              <p className="text-[11px] text-text-3 mt-2">需要检查文案</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-3">卡住超过 7 天</p>
              <p className="text-2xl font-bold mt-1">{commandCenter.stalledCount}</p>
              <p className="text-[11px] text-text-3 mt-2">建议砍掉或推进</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: '选题收件箱', value: episodes.filter(e => (e.dbStatus || e.status) === 'inbox').length, hint: '先判断承诺' },
            { label: '脚本队列', value: episodes.filter(e => ['researching', 'scripting'].includes(e.dbStatus || e.status)).length, hint: '做成可录文案' },
            { label: '制作队列', value: episodes.filter(e => ['shooting', 'editing'].includes(e.dbStatus || e.status)).length, hint: '录制和包装' },
            { label: '已发布', value: commandCenter.publishedCount, hint: '等数据回流' },
          ].map(item => (
            <div key={item.label} className="bg-surface/70 border border-border rounded-xl p-4">
              <p className="text-xs text-text-3">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(item.value)}</p>
              <p className="text-[11px] text-text-3 mt-2">{item.hint}</p>
            </div>
          ))}
        </section>

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
                        {countCompletedStages(ep.stages || {}) > 0 && (
                          <span className="text-[10px] text-green ml-auto">
                            {countCompletedStages(ep.stages)}/10 节点
                          </span>
                        )}
                      </div>

                      {(metricsByEpisode.has(ep.id) || plansByEpisode.has(ep.id)) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {plansByEpisode.has(ep.id) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                              {plansByEpisode.get(ep.id)?.length} 个发布计划
                            </span>
                          )}
                          {metricsByEpisode.get(ep.id)?.[0] && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green/10 text-green">
                              {formatNumber(metricsByEpisode.get(ep.id)?.[0].views || 0)} 播放
                            </span>
                          )}
                        </div>
                      )}

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
