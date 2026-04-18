'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface EpisodeDetail {
  id: string
  title: string
  status: string
  dbStatus: string
  createdAt: string
  stages: Record<string, { exists: boolean }>
  scores?: {
    curiosity?: number
    audience?: number
    platform?: number
    feasibility?: number
  }
}

export default function EpisodePage() {
  const params = useParams()
  const id = params.id as string
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cliLoading, setCliLoading] = useState<string | null>(null)
  const [cliResult, setCliResult] = useState<{ command: string; stdout: string; stderr: string } | null>(null)
  const [cliError, setCliError] = useState('')

  async function loadEpisode() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEpisode(data)
    } catch (err: unknown) {
      setError('加载失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEpisode()
  }, [id])

  async function runCli(command: string) {
    setCliLoading(command)
    setCliError('')
    setCliResult(null)
    try {
      const res = await fetch('/api/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, runId: id }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'CLI 命令失败')
      }
      setCliResult({ command, stdout: data.stdout, stderr: data.stderr })
      // 刷新 episode 数据
      await loadEpisode()
    } catch (err: unknown) {
      setCliError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setCliLoading(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadEpisode} className="px-3 py-1 bg-red-500/20 rounded text-xs hover:bg-red-500/30">重试</button>
          </div>
        </main>
      </div>
    )
  }

  if (!episode) return <div className="flex items-center justify-center h-screen text-text-2">未找到</div>

  const stageList = [
    { name: 'Signal', key: 'signal', file: '01-signal/signal.json' },
    { name: 'Research', key: 'research', file: '02-research/research.json' },
    { name: 'Topic', key: 'topic', file: '03-topic/topic_decision.json' },
    { name: 'Script', key: 'script', file: '04-script/script.json' },
    { name: 'Assets', key: 'assets', file: '05-assets/asset_manifest.json' },
    { name: 'Packaging', key: 'packaging', file: '06-packaging/package.json' },
    { name: 'Production', key: 'production', file: '07-production/production_check.json' },
    { name: 'Distribution', key: 'distribution', file: '08-distribution/publish_plan.json' },
    { name: 'Metrics', key: 'metrics', file: '09-metrics/metrics.json' },
    { name: 'Review', key: 'review', file: '10-review/review.json' },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-text-3 font-mono">{episode.id}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-accent/15 text-accent font-medium">
              {episode.dbStatus}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{episode.title}</h1>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">创建时间</p>
            <p className="text-lg font-semibold">{episode.createdAt?.slice(0, 10) || '—'}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">完成节点</p>
            <p className="text-lg font-semibold">
              {Object.values(episode.stages || {}).filter(s => s.exists).length} / 10
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">综合评分</p>
            <p className="text-lg font-semibold">
              {episode.scores
                ? ((episode.scores.curiosity || 0) + (episode.scores.audience || 0) + (episode.scores.platform || 0) + (episode.scores.feasibility || 0)) / 4
                : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">生产节点</h3>
            <div className="space-y-3">
              {stageList.map((stage, idx) => {
                const exists = episode.stages?.[stage.key]?.exists
                return (
                  <div key={stage.key} className="flex items-center gap-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      exists ? 'bg-green/20 text-green' : 'bg-surface-3 text-text-3'
                    }`}>
                      {exists ? '✓' : String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm ${exists ? 'text-text' : 'text-text-3'}`}>{stage.name}</span>
                    {exists && (
                      <span className="ml-auto text-xs text-green">已完成</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">快速操作</h3>
            <div className="space-y-3">
              <a href={`/episodes/${id}/script`} className="block w-full p-4 bg-surface-2 border border-border rounded-lg hover:border-accent/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text group-hover:text-accent transition-colors">脚本编辑器</p>
                    <p className="text-sm text-text-3 mt-0.5">编写和编辑口播脚本</p>
                  </div>
                  <span className="text-accent">→</span>
                </div>
              </a>
              <a href={`/episodes/${id}/record`} className="block w-full p-4 bg-surface-2 border border-border rounded-lg hover:border-accent/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text group-hover:text-accent transition-colors">口播录制</p>
                    <p className="text-sm text-text-3 mt-0.5">查看录制 brief 和分段指引</p>
                  </div>
                  <span className="text-accent">→</span>
                </div>
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold text-text-3 mb-3 uppercase tracking-wider">Pipeline CLI</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runCli('status')}
                  disabled={!!cliLoading}
                  className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-2 hover:text-text hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  {cliLoading === 'status' ? '执行中...' : '📊 查看状态'}
                </button>
                <button
                  onClick={() => runCli('validate')}
                  disabled={!!cliLoading}
                  className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-2 hover:text-text hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  {cliLoading === 'validate' ? '执行中...' : '✅ 验证节点'}
                </button>
                <button
                  onClick={() => runCli('advance')}
                  disabled={!!cliLoading}
                  className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-2 hover:text-text hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  {cliLoading === 'advance' ? '执行中...' : '🚀 推进阶段'}
                </button>
                <button
                  onClick={() => runCli('make-pack')}
                  disabled={!!cliLoading}
                  className="px-3 py-2 bg-surface-2 border border-border rounded-lg text-xs text-text-2 hover:text-text hover:border-accent/30 transition-colors disabled:opacity-50"
                >
                  {cliLoading === 'make-pack' ? '执行中...' : '📦 生成发布包'}
                </button>
              </div>

              {cliError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {cliError}
                </div>
              )}

              {cliResult && (
                <div className="mt-3 p-3 bg-surface-2 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-3 uppercase">{cliResult.command} 输出</span>
                    <button
                      onClick={() => setCliResult(null)}
                      className="text-[10px] text-text-3 hover:text-text"
                    >
                      收起
                    </button>
                  </div>
                  {cliResult.stdout && (
                    <pre className="text-xs text-text-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto">{cliResult.stdout}</pre>
                  )}
                  {cliResult.stderr && (
                    <pre className="text-xs text-orange mt-2 whitespace-pre-wrap leading-relaxed max-h-32 overflow-auto">{cliResult.stderr}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
