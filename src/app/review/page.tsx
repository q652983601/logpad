'use client'

import { useState, useEffect, useMemo } from 'react'
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

interface Metrics {
  id: number
  episode_id: string
  platform: string
  views: number
  completion_rate: number
  likes: number
  comments: number
  shares: number
  saves: number
  new_followers: number
  avg_watch_time: number
  ctr: number
  recorded_at: string
}

interface Learning {
  id: number
  episode_id: string
  tag: string
  content: string
  created_at: string
}

interface DiagnosisIssue {
  type: 'success' | 'warning' | 'error'
  message: string
  area: string
}

const PLATFORMS = ['全部', 'youtube', 'douyin', 'bilibili', 'xiaohongshu']
const LEARNING_TAGS = ['脚本', '剪辑', '封面', '选题', '发布', '其他']

function diagnose(data: Metrics): DiagnosisIssue[] {
  const issues: DiagnosisIssue[] = []

  if (data.ctr < 2) {
    issues.push({ type: 'warning', message: 'CTR 偏低，检查封面和标题吸引力', area: '封面/标题' })
  } else if (data.ctr > 6) {
    issues.push({ type: 'success', message: 'CTR 表现优秀，封面和标题吸引力强', area: '封面/标题' })
  }

  if (data.completion_rate < 30) {
    issues.push({ type: 'error', message: '完播率过低，Hook 可能不够强', area: '脚本' })
  } else if (data.completion_rate < 50) {
    issues.push({ type: 'warning', message: '完播率有提升空间', area: '脚本/剪辑' })
  } else {
    issues.push({ type: 'success', message: '完播率表现良好', area: '脚本/剪辑' })
  }

  if (data.views <= 0) {
    issues.push({ type: 'warning', message: '暂无播放量，互动率和转粉率先不参与判断', area: '数据' })
  } else {
    const engagementRate = (data.likes + data.comments + data.shares) / data.views * 100
    if (engagementRate < 3) {
      issues.push({ type: 'warning', message: '互动率偏低，增加明确的 CTA', area: '脚本' })
    } else if (engagementRate > 8) {
      issues.push({ type: 'success', message: '互动率表现优秀', area: '脚本' })
    }

    if (data.new_followers / data.views * 100 < 0.5) {
      issues.push({ type: 'warning', message: '转粉率偏低，人设感可能不足', area: '人设' })
    }
  }

  if (issues.length === 0) {
    issues.push({ type: 'success', message: '各项指标表现均衡，继续保持', area: '综合' })
  }

  return issues
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return '暂无数据'
  return `${(numerator / denominator * 100).toFixed(2)}%`
}

function BarChart({ data, labelKey, valueKey, color = 'accent', max }: {
  data: Record<string, unknown>[]
  labelKey: string
  valueKey: string
  color?: string
  max?: number
}) {
  const values = data.map(d => Number(d[valueKey]) || 0)
  const chartMax = max || Math.max(...values, 1)
  const barColor = color === 'accent'
    ? 'rgb(var(--accent))'
    : color === 'green'
      ? 'rgb(var(--green))'
      : color === 'orange'
        ? 'rgb(var(--orange))'
        : 'rgb(var(--accent-2))'

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0
        const pct = (val / chartMax) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-20 text-xs text-text-3 truncate text-right shrink-0">{String(d[labelKey])}</div>
            <div className="flex-1 h-6 bg-surface-2 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor, opacity: 0.85 }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[10px] text-text font-medium">
                {typeof d[valueKey] === 'number' && (d[valueKey] as number) < 10
                  ? (d[valueKey] as number).toFixed(1)
                  : formatNumber(Number(d[valueKey]))}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data, valueKey }: { data: Record<string, unknown>[]; valueKey: string }) {
  const values = data.map(d => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * 100
    const y = 100 - ((v - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="h-40 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
        {values.map((v, i) => {
          const x = (i / (values.length - 1 || 1)) * 100
          const y = 100 - ((v - min) / range) * 100
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="rgb(var(--accent))" />
          )
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-text-3 mt-1">
        {data.map((d, i) => (
          <span key={i} className="truncate max-w-[3rem]">{String(d['label'] || d['episode_id'] || '').slice(0, 6)}</span>
        ))}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [metrics, setMetrics] = useState<Metrics[]>([])
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState('全部')
  const [searchTag, setSearchTag] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'diagnosis' | 'learnings'>('overview')

  // Forms
  const [showMetricForm, setShowMetricForm] = useState(false)
  const [showLearningForm, setShowLearningForm] = useState(false)
  const [metricForm, setMetricForm] = useState<Partial<Metrics>>({ platform: 'youtube' })
  const [learningForm, setLearningForm] = useState({ episode_id: '', tag: '脚本', content: '' })

  // Local Agent review
  const [aiReviewLoading, setAiReviewLoading] = useState<number | null>(null)
  const [aiReviewResult, setAiReviewResult] = useState<Record<number, string>>({})
  const [aiReviewError, setAiReviewError] = useState('')
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [eps, mts, lns] = await Promise.all([
        fetch('/api/runs').then(r => r.json()),
        fetch('/api/metrics').then(r => r.json()),
        fetch('/api/learnings').then(r => r.json()),
      ])
      setEpisodes(eps)
      setMetrics(mts)
      setLearnings(lns)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const publishedEpisodes = useMemo(() =>
    episodes.filter(e => (e.dbStatus || e.status) === 'published'),
    [episodes]
  )

  const filteredMetrics = useMemo(() => {
    let m = metrics
    if (platformFilter !== '全部') {
      m = m.filter(x => x.platform === platformFilter)
    }
    return m.slice(0, 10)
  }, [metrics, platformFilter])

  const filteredLearnings = useMemo(() => {
    let l = learnings
    if (searchTag !== '全部') l = l.filter(x => x.tag === searchTag)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      l = l.filter(x => x.content.toLowerCase().includes(q) || x.episode_id.toLowerCase().includes(q))
    }
    return l
  }, [learnings, searchTag, searchQuery])

  const overview = useMemo(() => {
    const totalContent = publishedEpisodes.length
    const totalViews = metrics.reduce((s, m) => s + (m.views || 0), 0)
    const avgCompletion = metrics.length
      ? metrics.reduce((s, m) => s + (m.completion_rate || 0), 0) / metrics.length
      : 0
    const top3 = [...metrics]
      .sort((a, b) => b.views - a.views)
      .slice(0, 3)
      .map(m => {
        const ep = episodes.find(e => e.id === m.episode_id)
        return { ...m, title: ep?.title || m.episode_id }
      })
    return { totalContent, totalViews, avgCompletion, top3 }
  }, [publishedEpisodes, metrics, episodes])

  async function submitMetric(e: React.FormEvent) {
    e.preventDefault()
    if (!metricForm.episode_id) return
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricForm),
    })
    const res = await fetch('/api/metrics')
    setMetrics(await res.json())
    setShowMetricForm(false)
    setMetricForm({ platform: 'youtube' })
  }

  async function submitLearning(e: React.FormEvent) {
    e.preventDefault()
    if (!learningForm.episode_id || !learningForm.content) return
    await fetch('/api/learnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(learningForm),
    })
    const res = await fetch('/api/learnings')
    setLearnings(await res.json())
    setShowLearningForm(false)
    setLearningForm({ episode_id: '', tag: '脚本', content: '' })
  }

  async function generateAIReview(metric: Metrics) {
    setAiReviewLoading(metric.id)
    setAiReviewError('')

    const engagementRate = formatRate(metric.likes + metric.comments + metric.shares, metric.views)
    const followRate = formatRate(metric.new_followers, metric.views)

    const content = `内容: ${episodes.find(e => e.id === metric.episode_id)?.title || metric.episode_id}
平台: ${metric.platform}
播放量: ${metric.views}
完播率: ${metric.completion_rate}%
平均观看时长: ${metric.avg_watch_time}秒
CTR: ${metric.ctr}%
点赞: ${metric.likes}
评论: ${metric.comments}
分享: ${metric.shares}
收藏: ${metric.saves}
新增粉丝: ${metric.new_followers}
互动率: ${engagementRate}
转粉率: ${followRate}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_review', content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Agent 请求失败')

      setAiReviewResult(prev => ({ ...prev, [metric.id]: data.result }))
    } catch (err: unknown) {
      setAiReviewError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setAiReviewLoading(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {error && <ErrorBanner message={error} onRetry={loadData} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">数据复盘</h2>
            <p className="text-text-2 text-sm mt-1">趋势图表、本地 Agent 诊断、学习银行</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowMetricForm(!showMetricForm)}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              + 录入数据
            </button>
            <button
              onClick={() => setShowLearningForm(!showLearningForm)}
              className="px-5 py-2.5 rounded-full bg-surface-2 border border-border text-text text-sm font-semibold hover:bg-surface-3 transition-colors"
            >
              + 添加经验
            </button>
          </div>
        </div>

        {/* Forms */}
        {showMetricForm && (
          <form onSubmit={submitMetric} className="mb-8 bg-surface border border-border rounded-xl p-5 grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-text-3 mb-1 block">Episode</label>
              <select
                value={metricForm.episode_id || ''}
                onChange={e => setMetricForm({ ...metricForm, episode_id: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                <option value="">选择内容</option>
                {publishedEpisodes.map(ep => (
                  <option key={ep.id} value={ep.id}>{ep.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">平台</label>
              <select
                value={metricForm.platform || 'youtube'}
                onChange={e => setMetricForm({ ...metricForm, platform: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                {PLATFORMS.filter(p => p !== '全部').map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">播放量</label>
              <input
                type="number"
                value={metricForm.views || ''}
                onChange={e => setMetricForm({ ...metricForm, views: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">完播率 (%)</label>
              <input
                type="number"
                step="0.1"
                value={metricForm.completion_rate || ''}
                onChange={e => setMetricForm({ ...metricForm, completion_rate: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">点赞</label>
              <input
                type="number"
                value={metricForm.likes || ''}
                onChange={e => setMetricForm({ ...metricForm, likes: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">评论</label>
              <input
                type="number"
                value={metricForm.comments || ''}
                onChange={e => setMetricForm({ ...metricForm, comments: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">分享</label>
              <input
                type="number"
                value={metricForm.shares || ''}
                onChange={e => setMetricForm({ ...metricForm, shares: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">收藏</label>
              <input
                type="number"
                value={metricForm.saves || ''}
                onChange={e => setMetricForm({ ...metricForm, saves: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">新增粉丝</label>
              <input
                type="number"
                value={metricForm.new_followers || ''}
                onChange={e => setMetricForm({ ...metricForm, new_followers: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">平均观看 (秒)</label>
              <input
                type="number"
                value={metricForm.avg_watch_time || ''}
                onChange={e => setMetricForm({ ...metricForm, avg_watch_time: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">CTR (%)</label>
              <input
                type="number"
                step="0.1"
                value={metricForm.ctr || ''}
                onChange={e => setMetricForm({ ...metricForm, ctr: Number(e.target.value) })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="col-span-4 flex gap-3 mt-2">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                保存
              </button>
              <button type="button" onClick={() => setShowMetricForm(false)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                取消
              </button>
            </div>
          </form>
        )}

        {showLearningForm && (
          <form onSubmit={submitLearning} className="mb-8 bg-surface border border-border rounded-xl p-5 grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-3 mb-1 block">Episode</label>
              <select
                value={learningForm.episode_id}
                onChange={e => setLearningForm({ ...learningForm, episode_id: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                <option value="">选择内容</option>
                {publishedEpisodes.map(ep => (
                  <option key={ep.id} value={ep.id}>{ep.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-3 mb-1 block">标签</label>
              <select
                value={learningForm.tag}
                onChange={e => setLearningForm({ ...learningForm, tag: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                {LEARNING_TAGS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs text-text-3 mb-1 block">经验内容</label>
              <textarea
                value={learningForm.content}
                onChange={e => setLearningForm({ ...learningForm, content: e.target.value })}
                rows={3}
                placeholder="总结这期的经验..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="col-span-3 flex gap-3 mt-2">
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">
                保存
              </button>
              <button type="button" onClick={() => setShowLearningForm(false)} className="px-4 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text">
                取消
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {[
            { key: 'overview', label: '总览' },
            { key: 'charts', label: '趋势图表' },
            { key: 'diagnosis', label: 'Agent 诊断' },
            { key: 'learnings', label: '学习银行' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-2 hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">总内容数</p>
                <p className="text-3xl font-bold mt-2">{overview.totalContent}</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">总播放量</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(overview.totalViews)}</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">平均完播率</p>
                <p className="text-3xl font-bold mt-2">{overview.avgCompletion.toFixed(1)}%</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-text-3 uppercase tracking-wider">数据条目</p>
                <p className="text-3xl font-bold mt-2">{metrics.length}</p>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">最受欢迎 TOP 3</h3>
              {overview.top3.length === 0 ? (
                <p className="text-text-3 text-sm">暂无数据</p>
              ) : (
                <div className="space-y-3">
                  {overview.top3.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-text-3 w-6">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-text-3">{m.platform} · {m.recorded_at.slice(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatNumber(m.views)}</p>
                        <p className="text-[10px] text-text-3">播放量</p>
                      </div>
                      <div className="text-right w-16">
                        <p className="text-sm font-semibold">{m.completion_rate.toFixed(1)}%</p>
                        <p className="text-[10px] text-text-3">完播</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            <div className="flex gap-2 mb-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    platformFilter === p
                      ? 'bg-accent text-white'
                      : 'bg-surface-2 text-text-2 hover:text-text'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">播放量趋势（最近10条）</h3>
                {filteredMetrics.length === 0 ? (
                  <p className="text-text-3 text-sm">暂无数据</p>
                ) : (
                  <BarChart
                    data={[...filteredMetrics].reverse().map(m => ({
                      label: episodes.find(e => e.id === m.episode_id)?.title?.slice(0, 8) || m.episode_id.slice(0, 6),
                      value: m.views,
                    }))}
                    labelKey="label"
                    valueKey="value"
                    color="accent"
                  />
                )}
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4">完播率对比</h3>
                {filteredMetrics.length === 0 ? (
                  <p className="text-text-3 text-sm">暂无数据</p>
                ) : (
                  <BarChart
                    data={[...filteredMetrics].reverse().map(m => ({
                      label: episodes.find(e => e.id === m.episode_id)?.title?.slice(0, 8) || m.episode_id.slice(0, 6),
                      value: m.completion_rate,
                    }))}
                    labelKey="label"
                    valueKey="value"
                    color="green"
                    max={100}
                  />
                )}
              </div>

              <div className="bg-surface border border-border rounded-xl p-5 md:col-span-2">
                <h3 className="text-sm font-semibold mb-4">互动率趋势（点赞+评论+分享 / 播放量）</h3>
                {filteredMetrics.length === 0 ? (
                  <p className="text-text-3 text-sm">暂无数据</p>
                ) : (
                  <LineChart
                    data={[...filteredMetrics].reverse().map(m => ({
                      label: episodes.find(e => e.id === m.episode_id)?.title?.slice(0, 8) || m.episode_id.slice(0, 6),
                      value: m.views > 0 ? ((m.likes + m.comments + m.shares) / m.views * 100) : 0,
                    }))}
                    valueKey="value"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            {aiReviewError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                {aiReviewError}
              </div>
            )}
            {metrics.length === 0 ? (
              <p className="text-text-3 text-sm">暂无数据，请先录入指标</p>
            ) : (
              metrics.map(m => {
                const ep = episodes.find(e => e.id === m.episode_id)
                const issues = diagnose(m)
                return (
                  <div key={m.id} className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold">{ep?.title || m.episode_id}</h4>
                        <p className="text-xs text-text-3">{m.platform} · {m.recorded_at.slice(0, 10)}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-text-2">播放 <b className="text-text">{formatNumber(m.views)}</b></span>
                        <span className="text-text-2">完播 <b className="text-text">{m.completion_rate}%</b></span>
                        <span className="text-text-2">CTR <b className="text-text">{m.ctr}%</b></span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {issues.map((issue, i) => (
                        <div
                          key={i}
                          className={`rounded-lg px-4 py-3 text-sm border ${
                            issue.type === 'success'
                              ? 'bg-green/10 border-green/20 text-green'
                              : issue.type === 'error'
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : 'bg-orange/10 border-orange/20 text-orange'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider opacity-70">{issue.area}</span>
                          <p className="mt-0.5">{issue.message}</p>
                        </div>
                      ))}
                    </div>

                    {aiReviewResult[m.id] ? (
                      <div className="mt-3 p-4 bg-surface-2 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">本地 Agent 复盘报告</span>
                          <button
                            onClick={() => setAiReviewResult(prev => { const n = { ...prev }; delete n[m.id]; return n })}
                            className="text-xs text-text-3 hover:text-text"
                          >
                            收起
                          </button>
                        </div>
                        <div className="text-sm text-text-2 whitespace-pre-wrap leading-relaxed">
                          {aiReviewResult[m.id]}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(aiReviewResult[m.id])
                          }}
                          className="mt-3 text-xs px-3 py-1.5 bg-accent/15 text-accent rounded hover:bg-accent/25"
                        >
                          复制到剪贴板
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateAIReview(m)}
                        disabled={aiReviewLoading === m.id}
                        className="mt-2 text-xs px-3 py-1.5 bg-accent/15 text-accent rounded hover:bg-accent/25 disabled:opacity-50"
                      >
                        {aiReviewLoading === m.id ? 'Agent 分析中...' : '生成本地 Agent 复盘报告'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Learnings */}
        {activeTab === 'learnings' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <select
                value={searchTag}
                onChange={e => setSearchTag(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
              >
                <option value="全部">全部标签</option>
                {LEARNING_TAGS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索经验..."
                className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
              />
            </div>

            {filteredLearnings.length === 0 ? (
              <p className="text-text-3 text-sm">暂无经验记录</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLearnings.map(l => {
                  const ep = episodes.find(e => e.id === l.episode_id)
                  return (
                    <div key={l.id} className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                          {l.tag}
                        </span>
                        <span className="text-[10px] text-text-3">{l.created_at.slice(0, 10)}</span>
                      </div>
                      <p className="text-xs text-text-3 mb-2">{ep?.title || l.episode_id}</p>
                      <p className="text-sm text-text leading-relaxed">{l.content}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
