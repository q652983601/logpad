'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'
import { PIPELINE_STAGE_KEYS, PRE_PUBLISH_STAGE_KEYS, countCompletedStages, isReadyToPublish } from '@/lib/pipeline-status'
import { cn } from '@/lib/utils'

interface PublishingPlan {
  id: number
  episode_id: string
  platform: string
  title: string
  description: string
  tags: string
  scheduled_at: string
  status: string
  episode_title?: string
}

interface Episode {
  id: string
  title: string
}

interface ThumbnailVariant {
  style: string
  promise: string
  layout: string
  cover_text: string
  asset_prompt: string
}

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: 'text-red-500', bg: 'bg-red-500/10', fields: ['title', 'description', 'tags', 'thumbnail'] },
  { id: 'douyin', name: '抖音', color: 'text-white', bg: 'bg-white/10', fields: ['title', 'description', 'hashtags'] },
  { id: 'bilibili', name: 'B站', color: 'text-blue-400', bg: 'bg-blue-400/10', fields: ['title', 'description', 'tags', 'category'] },
  { id: 'xiaohongshu', name: '小红书', color: 'text-red-400', bg: 'bg-red-400/10', fields: ['title', 'content', 'hashtags'] },
]

const STATUS_OPTIONS = [
  { key: 'draft', label: '草稿', color: 'text-text-3', bg: 'bg-surface-3' },
  { key: 'pending', label: '待审核', color: 'text-orange', bg: 'bg-orange/15' },
  { key: 'scheduled', label: '已排期', color: 'text-accent', bg: 'bg-accent/15' },
  { key: 'published', label: '已发布', color: 'text-green', bg: 'bg-green/15' },
]

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getWeekStart(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number) {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  return nd
}

export default function DistributionPage() {
  const [plans, setPlans] = useState<PublishingPlan[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPlan, setSelectedPlan] = useState<PublishingPlan | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [draggingPlan, setDraggingPlan] = useState<PublishingPlan | null>(null)
  const [stagesMap, setStagesMap] = useState<Record<string, Record<string, { exists: boolean }>>>({})
  const [error, setError] = useState('')

  // Create form state
  const [createEpisodeId, setCreateEpisodeId] = useState('')
  const [createPlatform, setCreatePlatform] = useState('youtube')
  const [createTitle, setCreateTitle] = useState('')
  const [createScheduled, setCreateScheduled] = useState('')

  // Editor state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editScheduled, setEditScheduled] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editLink, setEditLink] = useState('')
  const [thumbnailLoading, setThumbnailLoading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState('')
  const [thumbnailVariants, setThumbnailVariants] = useState<ThumbnailVariant[]>([])
  const [selectedThumbnailIdx, setSelectedThumbnailIdx] = useState<number | null>(null)

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/publishing')
    const data = await res.json()
    setPlans(data)
  }, [])

  const fetchEpisodes = useCallback(async () => {
    const res = await fetch('/api/runs')
    const data = await res.json() as Array<{ id: string; title: string; stages?: Record<string, { exists: boolean }> }>
    setEpisodes(data.map(e => ({ id: e.id, title: e.title })))
    // Also fetch stages for checklist
    const stages: Record<string, Record<string, { exists: boolean }>> = {}
    for (const e of data) {
      if (e.stages) stages[e.id] = e.stages
    }
    setStagesMap(stages)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([fetchPlans(), fetchEpisodes()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [fetchPlans, fetchEpisodes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
  }, [plans, platformFilter, statusFilter])

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const monthStart = useMemo(() => {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    return d
  }, [selectedDate])

  const monthDays = useMemo(() => {
    const start = new Date(monthStart)
    start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1))
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [monthStart])

  function plansForDate(date: Date) {
    const s = formatDate(date)
    return filteredPlans.filter(p => p.scheduled_at && p.scheduled_at.startsWith(s))
  }

  function openEditor(plan: PublishingPlan) {
    setSelectedPlan(plan)
    setEditTitle(plan.title || '')
    setEditDescription(plan.description || '')
    setEditTags(plan.tags || '')
    setEditScheduled(plan.scheduled_at ? plan.scheduled_at.slice(0, 16) : '')
    setEditStatus(plan.status || 'draft')
    setEditLink('')
    setThumbnailError('')
    setThumbnailVariants([])
    setSelectedThumbnailIdx(null)
    setShowEditor(true)
  }

  async function generateThumbnailBrief(plan: PublishingPlan) {
    setThumbnailLoading(true)
    setThumbnailError('')
    setThumbnailVariants([])
    try {
      const content = [
        `平台：${PLATFORMS.find(p => p.id === plan.platform)?.name || plan.platform}`,
        `标题：${editTitle || plan.title}`,
        `描述：${editDescription || plan.description || ''}`,
        `标签：${editTags || plan.tags || ''}`,
      ].join('\n')
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_thumbnail_brief',
          content,
          context: '为真人出镜自媒体视频生成封面方案，输出必须方便设计 agent 或图像 agent 接着执行。',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '封面方案生成失败')

      const text = String(data.result || '')
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Agent 返回内容不是 JSON')
      const parsed = JSON.parse(jsonMatch[0]) as { variants?: ThumbnailVariant[] }
      const variants = Array.isArray(parsed.variants) ? parsed.variants : []
      setThumbnailVariants(variants)
      setSelectedThumbnailIdx(variants.length > 0 ? 0 : null)
    } catch (err) {
      setThumbnailError(err instanceof Error ? err.message : '封面方案生成失败')
    } finally {
      setThumbnailLoading(false)
    }
  }

  function applyThumbnailVariant(variant: ThumbnailVariant) {
    const block = [
      '',
      '【封面方案】',
      `风格：${variant.style}`,
      `封面字：${variant.cover_text}`,
      `点击承诺：${variant.promise}`,
      `版式：${variant.layout}`,
      `素材提示：${variant.asset_prompt}`,
    ].join('\n')
    setEditDescription(current => `${current || ''}${block}`)
  }

  async function savePlan() {
    if (!selectedPlan) return
    await fetch(`/api/publishing/${selectedPlan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription,
        tags: editTags,
        scheduled_at: editScheduled ? new Date(editScheduled).toISOString() : null,
        status: editStatus,
      }),
    })
    await fetchPlans()
    setShowEditor(false)
  }

  async function markPublished() {
    if (!selectedPlan) return
    const stages = stagesMap[selectedPlan.episode_id] || {}
    if (!isReadyToPublish(stages)) {
      alert('还有发布前 gate 未完成，无法发布')
      return
    }
    const res = await fetch(`/api/publishing/${selectedPlan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || '发布失败')
      return
    }
    await fetchPlans()
    setShowEditor(false)
  }

  async function deletePlan() {
    if (!selectedPlan) return
    if (!confirm('确定删除这个发布计划？')) return
    await fetch(`/api/publishing/${selectedPlan.id}`, { method: 'DELETE' })
    await fetchPlans()
    setShowEditor(false)
  }

  async function createPlan() {
    if (!createEpisodeId || !createTitle) return
    await fetch('/api/publishing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode_id: createEpisodeId,
        platform: createPlatform,
        title: createTitle,
        scheduled_at: createScheduled ? new Date(createScheduled).toISOString() : null,
        status: 'draft',
      }),
    })
    await fetchPlans()
    setShowCreate(false)
    setCreateEpisodeId('')
    setCreateTitle('')
    setCreateScheduled('')
  }

  async function handleDrop(date: Date, e: React.DragEvent) {
    e.preventDefault()
    if (!draggingPlan) return
    const newDate = formatDate(date)
    const scheduled = `${newDate}T${draggingPlan.scheduled_at ? draggingPlan.scheduled_at.slice(11, 16) : '09:00'}:00.000Z`
    await fetch(`/api/publishing/${draggingPlan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: scheduled }),
    })
    setDraggingPlan(null)
    await fetchPlans()
  }

  function copyPlatformText(plan: PublishingPlan) {
    const pf = PLATFORMS.find(p => p.id === plan.platform)
    const lines: string[] = []
    if (plan.title) lines.push(`标题：${plan.title}`)
    if (plan.description) lines.push(`描述：${plan.description}`)
    if (plan.tags) lines.push(`标签：${plan.tags}`)
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => alert(`已复制 ${pf?.name || ''} 文案`))
  }

  function getStatusBadge(status: string) {
    const s = STATUS_OPTIONS.find(o => o.key === status) || STATUS_OPTIONS[0]
    return (
      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', s.color, s.bg)}>
        {s.label}
      </span>
    )
  }

  function getPlatformBadge(pid: string) {
    const p = PLATFORMS.find(x => x.id === pid)
    if (!p) return <span className="text-[10px] text-text-3">{pid}</span>
    return (
      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', p.color, p.bg)}>
        {p.name}
      </span>
    )
  }

  function renderChecklist(episodeId: string) {
    const stages = stagesMap[episodeId] || {}
    const doneCount = countCompletedStages(stages)
    const publishReady = isReadyToPublish(stages)
    const prePublishDone = PRE_PUBLISH_STAGE_KEYS.filter(key => stages[key]?.exists).length
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-2">发布 Checklist</span>
          <span className={cn('text-[10px] font-medium', publishReady ? 'text-green' : 'text-orange')}>
            {prePublishDone}/{PRE_PUBLISH_STAGE_KEYS.length} 发布前
          </span>
        </div>
        <div className="space-y-1.5">
          {PRE_PUBLISH_STAGE_KEYS.map(key => {
            const done = !!stages[key]?.exists
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center', done ? 'bg-green border-green' : 'border-text-3')}>
                  {done && <span className="text-[8px] text-white">✓</span>}
                </div>
                <span className={cn('text-[11px]', done ? 'text-text-2 line-through' : 'text-text')}>{key}</span>
              </div>
            )
          })}
        </div>
        {!publishReady && (
          <p className="text-[10px] text-orange mt-2">还有发布前 gate 未完成，先补 production/distribution 之前的缺口。</p>
        )}
        {publishReady && doneCount < PIPELINE_STAGE_KEYS.length && (
          <p className="text-[10px] text-text-3 mt-2">metrics / review 会在发布后补，不阻塞标记已发布。</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-text-2">加载中...</main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {error && <ErrorBanner message={error} onRetry={loadData} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">发布台</h2>
            <p className="text-text-2 text-sm mt-1">排期、多平台文案、发布 Checklist 一站式管理</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + 新建发布计划
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs md:text-sm">
          <div className="flex bg-surface rounded-lg border border-border p-1">
            <button onClick={() => setView('week')} className={cn('px-3 py-1.5 text-xs rounded-md font-medium', view === 'week' ? 'bg-surface-2 text-text' : 'text-text-2 hover:text-text')}>周视图</button>
            <button onClick={() => setView('month')} className={cn('px-3 py-1.5 text-xs rounded-md font-medium', view === 'month' ? 'bg-surface-2 text-text' : 'text-text-2 hover:text-text')}>月视图</button>
          </div>
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
          >
            <option value="all">全部平台</option>
            {PLATFORMS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
          >
            <option value="all">全部状态</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          {view === 'week' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="px-2 py-1 text-xs bg-surface border border-border rounded-md text-text-2 hover:text-text"
              >
                ← 上周
              </button>
              <span className="text-xs text-text-2">
                {formatDate(weekStart)} ~ {formatDate(addDays(weekStart, 6))}
              </span>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="px-2 py-1 text-xs bg-surface border border-border rounded-md text-text-2 hover:text-text"
              >
                下周 →
              </button>
            </div>
          )}
          {view === 'month' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className="px-2 py-1 text-xs bg-surface border border-border rounded-md text-text-2 hover:text-text"
              >
                ← 上月
              </button>
              <span className="text-xs text-text-2">
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
              </span>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className="px-2 py-1 text-xs bg-surface border border-border rounded-md text-text-2 hover:text-text"
              >
                下月 →
              </button>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="mb-8">
          {view === 'week' ? (
            <div className="grid grid-cols-7 gap-1 md:gap-3">
              {['一','二','三','四','五','六','日'].map(d => (
                <div key={d} className="text-center text-[10px] text-text-3 font-semibold uppercase tracking-wider">
                  周{d}
                </div>
              ))}
              {weekDays.map((day, idx) => {
                const dayPlans = plansForDate(day)
                const isToday = formatDate(day) === formatDate(new Date())
                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[100px] md:min-h-[140px] rounded-xl border p-1 md:p-2 transition-colors',
                      isToday ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface/40'
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(day, e)}
                  >
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <span className={cn('text-[10px] md:text-xs font-medium', isToday ? 'text-accent' : 'text-text-2')}>
                        {day.getDate()}
                      </span>
                      <span className="text-[9px] md:text-[10px] text-text-3">{dayPlans.length}</span>
                    </div>
                    <div className="space-y-1 md:space-y-1.5">
                      {dayPlans.map(plan => (
                        <div
                          key={plan.id}
                          draggable
                          onDragStart={() => setDraggingPlan(plan)}
                          onClick={() => openEditor(plan)}
                          className="cursor-pointer rounded-lg bg-surface-2 border border-border px-1 md:px-2 py-1 md:py-1.5 hover:border-accent/40 transition-colors"
                        >
                          <div className="flex items-center gap-1 md:gap-1.5 mb-0.5">
                            {getPlatformBadge(plan.platform)}
                          </div>
                          <p className="text-[10px] md:text-[11px] text-text leading-snug truncate">{plan.episode_title || plan.title}</p>
                          {plan.scheduled_at && (
                            <p className="text-[9px] md:text-[10px] text-text-3 mt-0.5">{plan.scheduled_at.slice(11, 16)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {['一','二','三','四','五','六','日'].map(d => (
                <div key={d} className="text-center text-[9px] md:text-[10px] text-text-3 font-semibold uppercase tracking-wider py-1">
                  周{d}
                </div>
              ))}
              {monthDays.map((day, idx) => {
                const dayPlans = plansForDate(day)
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
                const isToday = formatDate(day) === formatDate(new Date())
                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[60px] md:min-h-[100px] rounded-lg border p-1 md:p-1.5 transition-colors',
                      isToday ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface/40',
                      !isCurrentMonth && 'opacity-40'
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(day, e)}
                  >
                    <div className="flex items-center justify-between mb-0.5 md:mb-1">
                      <span className={cn('text-[10px] md:text-[11px] font-medium', isToday ? 'text-accent' : 'text-text-2')}>
                        {day.getDate()}
                      </span>
                      {dayPlans.length > 0 && (
                        <span className="text-[8px] md:text-[9px] text-text-3">{dayPlans.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                      {dayPlans.slice(0, 3).map(plan => (
                        <div
                          key={plan.id}
                          draggable
                          onDragStart={() => setDraggingPlan(plan)}
                          onClick={() => openEditor(plan)}
                          className="cursor-pointer rounded bg-surface-2 border border-border px-1 md:px-1.5 py-0.5 md:py-1 hover:border-accent/40 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span className={cn('w-1.5 h-1.5 rounded-full', PLATFORMS.find(p => p.id === plan.platform)?.bg.replace('/10', '') || 'bg-text-3')} />
                            <span className="text-[9px] md:text-[10px] text-text truncate">{plan.episode_title || plan.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayPlans.length > 3 && (
                        <p className="text-[8px] md:text-[9px] text-text-3 pl-1">+{dayPlans.length - 3} 更多</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Plan List */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">发布计划列表</h3>
            <span className="text-xs text-text-3">共 {filteredPlans.length} 条</span>
          </div>
          <div className="divide-y divide-border">
            {filteredPlans.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-text-3">暂无发布计划</div>
            )}
            {filteredPlans.map(plan => (
              <div
                key={plan.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-surface-2/50 transition-colors cursor-pointer"
                onClick={() => openEditor(plan)}
              >
                <div className="w-24 shrink-0">{getPlatformBadge(plan.platform)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{plan.episode_title || plan.title}</p>
                  <p className="text-[11px] text-text-3 truncate mt-0.5">{plan.title}</p>
                </div>
                <div className="w-28 shrink-0 text-center">{getStatusBadge(plan.status)}</div>
                <div className="w-32 shrink-0 text-right">
                  <p className="text-xs text-text-2">{plan.scheduled_at ? plan.scheduled_at.slice(0, 10) : '未排期'}</p>
                  <p className="text-[10px] text-text-3">{plan.scheduled_at ? plan.scheduled_at.slice(11, 16) : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-plan-title"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 id="create-plan-title" className="text-sm font-semibold">新建发布计划</h3>
              <button onClick={() => setShowCreate(false)} className="text-text-3 hover:text-text text-lg">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-text-3 mb-1.5">选择选题</label>
                <select
                  value={createEpisodeId}
                  onChange={e => {
                    setCreateEpisodeId(e.target.value)
                    const ep = episodes.find(x => x.id === e.target.value)
                    if (ep) setCreateTitle(ep.title)
                  }}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                >
                  <option value="">请选择...</option>
                  {episodes.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-3 mb-1.5">发布平台</label>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setCreatePlatform(p.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        createPlatform === p.id
                          ? 'border-accent bg-accent/10 text-accent font-medium'
                          : 'border-border bg-surface-2 text-text-2 hover:text-text'
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-3 mb-1.5">标题</label>
                <input
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                  placeholder="输入发布标题..."
                />
              </div>
              <div>
                <label className="block text-xs text-text-3 mb-1.5">排期时间</label>
                <input
                  type="datetime-local"
                  value={createScheduled}
                  onChange={e => setCreateScheduled(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={createPlan} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                  创建
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[92vh] overflow-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-plan-title"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPlatformBadge(selectedPlan.platform)}
                <h3 id="edit-plan-title" className="text-sm font-semibold">{selectedPlan.episode_title || selectedPlan.title}</h3>
              </div>
              <button onClick={() => setShowEditor(false)} className="text-text-3 hover:text-text text-lg">&times;</button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left: Editor */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-text-3 mb-1.5">状态</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-text-3 mb-1.5">排期时间</label>
                    <input
                      type="datetime-local"
                      value={editScheduled}
                      onChange={e => setEditScheduled(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-3 mb-1.5">标题</label>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                    placeholder="输入标题..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-3 mb-1.5">
                    {selectedPlan.platform === 'xiaohongshu' ? '正文' : '描述 / 简介'}
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={6}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent resize-none"
                    placeholder="输入内容..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-text-3 mb-1.5">
                    {selectedPlan.platform === 'douyin' || selectedPlan.platform === 'xiaohongshu' ? '话题标签' : '标签'}
                  </label>
                  <input
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                    placeholder="用逗号分隔多个标签..."
                  />
                </div>

                <div className="rounded-lg border border-border bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-3 mb-1">封面方案</p>
                      <p className="text-sm text-text">生成悬念型、数字型、对比型 3 个方向</p>
                    </div>
                    <button
                      onClick={() => generateThumbnailBrief(selectedPlan)}
                      disabled={thumbnailLoading}
                      className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                    >
                      {thumbnailLoading ? '生成中...' : '生成封面方案'}
                    </button>
                  </div>
                  {thumbnailError && (
                    <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                      {thumbnailError}
                    </p>
                  )}
                  {thumbnailVariants.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {thumbnailVariants.map((variant, idx) => (
                        <button
                          key={`${variant.style}-${idx}`}
                          type="button"
                          onClick={() => setSelectedThumbnailIdx(idx)}
                          className={`block w-full rounded-md border bg-surface p-3 text-left transition-colors ${
                            selectedThumbnailIdx === idx ? 'border-accent' : 'border-border hover:border-accent/40'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-accent">{variant.style}</span>
                            <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">{variant.cover_text}</span>
                          </div>
                          <p className="text-xs text-text-2">{variant.promise}</p>
                          <p className="mt-2 text-xs text-text-3">{variant.layout}</p>
                          <p className="mt-2 text-[11px] text-text-3 font-mono">{variant.asset_prompt}</p>
                        </button>
                      ))}
                      {selectedThumbnailIdx !== null && thumbnailVariants[selectedThumbnailIdx] && (
                        <button
                          type="button"
                          onClick={() => applyThumbnailVariant(thumbnailVariants[selectedThumbnailIdx])}
                          className="rounded-md border border-accent/40 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10"
                        >
                          写入发布说明
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {selectedPlan.platform === 'youtube' && (
                  <div className="w-full h-32 bg-surface-2 border border-dashed border-border rounded-lg flex items-center justify-center text-text-3 text-xs">
                    封面文件上传可接下一阶段素材库
                  </div>
                )}

                {selectedPlan.platform === 'bilibili' && (
                  <div>
                    <label className="block text-xs text-text-3 mb-1.5">分区</label>
                    <input
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                      placeholder="输入分区..."
                    />
                  </div>
                )}

                {selectedPlan.status === 'published' && (
                  <div>
                    <label className="block text-xs text-text-3 mb-1.5">发布后链接</label>
                    <input
                      value={editLink}
                      onChange={e => setEditLink(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button onClick={savePlan} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                    保存
                  </button>
                  <button onClick={() => copyPlatformText(selectedPlan)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                    复制文案
                  </button>
                  {selectedPlan.status !== 'published' && (() => {
                    const stages = stagesMap[selectedPlan.episode_id] || {}
                    const publishReady = isReadyToPublish(stages)
                    return publishReady ? (
                      <button onClick={markPublished} className="px-4 py-2 bg-green/15 text-green rounded-lg text-sm font-medium hover:bg-green/25">
                        标记为已发布
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-surface-3 text-text-3 rounded-lg text-sm cursor-not-allowed" title="发布前 gate 未完成">
                        标记为已发布
                      </span>
                    )
                  })()}
                  <button onClick={deletePlan} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 ml-auto">
                    删除
                  </button>
                </div>
              </div>

              {/* Right: Checklist */}
              <div className="bg-surface-2 border border-border rounded-xl p-4 h-fit">
                <h4 className="text-sm font-semibold text-text mb-3">选题信息</h4>
                <div className="space-y-2 text-xs text-text-2">
                  <div className="flex justify-between">
                    <span className="text-text-3">选题</span>
                    <span className="text-text text-right max-w-[60%]">{selectedPlan.episode_title || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">平台</span>
                    <span>{PLATFORMS.find(p => p.id === selectedPlan.platform)?.name || selectedPlan.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">状态</span>
                    <span>{STATUS_OPTIONS.find(s => s.key === editStatus)?.label || editStatus}</span>
                  </div>
                </div>
                {renderChecklist(selectedPlan.episode_id)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
