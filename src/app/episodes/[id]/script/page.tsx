'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'
import { detectColloquialIssues, getIssueColor, getIssueLabel, ScriptIssue } from '@/lib/ai-assistant'

interface ScriptData {
  title?: string
  hooks?: string[]
  script?: string
  beats?: Array<{ name: string; content: string }>
  cta?: string
  platform_variants?: Record<string, string>
}

interface DraftData {
  script: ScriptData
  timestamp: number
}

type AIAction = 'rewrite_colloquial' | 'generate_titles' | 'generate_hooks' | 'generate_remotion' | 'rewrite_douyin'

interface ScriptBackup {
  filename: string
  timestamp: string
  path: string
}

interface AIResult {
  titles?: string[]
  hooks?: string[]
  scenes?: Array<{ time: string; description: string; prompt: string }>
  text?: string
}

function getDraftKey(episodeId: string) {
  return `logpad-draft-${episodeId}`
}

function loadDraft(episodeId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(episodeId))
    if (!raw) return null
    return JSON.parse(raw) as DraftData
  } catch {
    return null
  }
}

function saveDraft(episodeId: string, script: ScriptData) {
  try {
    const data: DraftData = { script, timestamp: Date.now() }
    localStorage.setItem(getDraftKey(episodeId), JSON.stringify(data))
  } catch {
    // ignore localStorage errors
  }
}

function clearDraft(episodeId: string) {
  try {
    localStorage.removeItem(getDraftKey(episodeId))
  } catch {
    // ignore localStorage errors
  }
}

export default function ScriptEditor() {
  const params = useParams()
  const id = params.id as string
  const [script, setScript] = useState<ScriptData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false)
  const [draftBanner, setDraftBanner] = useState<'pending' | 'restored' | null>(null)
  const [activeTab, setActiveTab] = useState('main')
  const [showIssues, setShowIssues] = useState(false)
  const [aiLoading, setAiLoading] = useState<AIAction | null>(null)
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiError, setAiError] = useState('')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showBackups, setShowBackups] = useState(false)
  const [backups, setBackups] = useState<ScriptBackup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [pendingDraft, setPendingDraft] = useState<ScriptData | null>(null)

  async function loadScript() {
    setLoading(true)
    setError('')
    setPendingDraft(null)
    try {
      const draft = loadDraft(id)
      const r = await fetch(`/api/runs/${id}/script`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data: ScriptData = await r.json()
      const serverData: ScriptData = {
        script: data.script || '',
        hooks: data.hooks || ['', '', ''],
        beats: data.beats || [],
        cta: data.cta || '',
        title: data.title || '',
        platform_variants: data.platform_variants || {},
      }

      // Always load server data first; do NOT restore draft until user confirms
      setScript(serverData)

      if (draft && draft.timestamp > (data.script ? Date.now() - 86400000 : 0)) {
        setDraftBanner('pending')
        setPendingDraft(draft.script)
      } else {
        setDraftBanner(null)
        if (draft) clearDraft(id)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScript()
  }, [id])

  const wordCount = (script.script || '').length
  const estimatedMinutes = Math.ceil(wordCount / 200)

  const issues = useMemo(() => {
    if (!script.script) return []
    return detectColloquialIssues(script.script)
  }, [script.script])

  const performSave = useCallback(async () => {
    const res = await fetch(`/api/runs/${id}/script`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(script),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }, [id, script])

  const save = useCallback(async () => {
    setSaving(true)
    setSaveError('')
    try {
      await performSave()
      clearDraft(id)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }, [performSave, id])

  // Auto-save effect: debounced 3s
  useEffect(() => {
    if (loading) return
    if (draftBanner === 'pending') return  // Do NOT autosave while user is deciding on draft
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    saveDraft(id, script)
    autoSaveTimerRef.current = setTimeout(() => {
      performSave().then(() => {
        clearDraft(id)
        setAutoSaveIndicator(true)
        setTimeout(() => setAutoSaveIndicator(false), 2000)
      }).catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : '自动保存失败')
      })
    }, 3000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [script, id, loading, performSave, draftBanner])

  async function callAI(action: AIAction) {
    setAiLoading(action)
    setAiError('')
    setAiResult(null)

    try {
      const content = action === 'generate_remotion'
        ? script.script || ''
        : action === 'generate_titles'
        ? `${script.title || ''}\n${script.script || ''}`
        : action === 'generate_hooks'
        ? `${script.title || ''}\n${script.script || ''}`
        : script.script || ''

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, content }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 请求失败')

      const text = data.result as string

      // 尝试解析 JSON 结果
      if (action === 'generate_titles' || action === 'generate_hooks' || action === 'generate_remotion') {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            setAiResult(parsed)
            return
          }
        } catch {}
      }

      // 纯文本结果
      setAiResult({ text })
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setAiLoading(null)
    }
  }

  function applyTextResult() {
    if (aiResult?.text) {
      setScript({ ...script, script: aiResult.text })
      setAiResult(null)
    }
  }

  function applyTitle(idx: number) {
    if (aiResult?.titles?.[idx]) {
      setScript({ ...script, title: aiResult.titles[idx] })
      setAiResult(null)
    }
  }

  function applyHook(idx: number) {
    if (aiResult?.hooks?.[idx]) {
      const newHooks = [...(script.hooks || ['', '', ''])]
      newHooks[idx] = aiResult.hooks[idx]
      setScript({ ...script, hooks: newHooks })
      setAiResult(null)
    }
  }

  async function loadBackups() {
    setBackupsLoading(true)
    try {
      const res = await fetch(`/api/runs/${id}/script?backups=true`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBackups(data as ScriptBackup[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载备份失败')
    } finally {
      setBackupsLoading(false)
    }
  }

  function openBackups() {
    setShowBackups(true)
    loadBackups()
  }

  async function restoreBackup(filename: string) {
    try {
      const res = await fetch(`/api/runs/${id}/script?backup=${encodeURIComponent(filename)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setScript({
        script: data.script || '',
        hooks: data.hooks || ['', '', ''],
        beats: data.beats || [],
        cta: data.cta || '',
        title: data.title || '',
        platform_variants: data.platform_variants || {},
      })
      setConfirmRestore(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '恢复备份失败')
    }
  }

  function renderHighlightedText(text: string, issues: ScriptIssue[]) {
    if (!showIssues || issues.length === 0) return text

    const parts: Array<{ text: string; issue?: ScriptIssue }> = []
    let lastIndex = 0

    for (const issue of issues) {
      if (issue.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, issue.index) })
      }
      parts.push({ text: text.slice(issue.index, issue.index + issue.length), issue })
      lastIndex = issue.index + issue.length
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex) })
    }

    return parts.map((part, i) => {
      if (part.issue) {
        return (
          <mark
            key={i}
            className={`rounded px-0.5 border ${getIssueColor(part.issue.type)}`}
            title={`${getIssueLabel(part.issue.type)}: 建议改为「${part.issue.suggestion}」`}
          >
            {part.text}
          </mark>
        )
      }
      return <span key={i}>{part.text}</span>
    })
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  if (error) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <ErrorBanner message={error} onRetry={loadScript} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <ErrorBanner message={error} onRetry={loadScript} />
        {draftBanner === 'pending' && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
            <span className="text-sm text-accent">检测到本地草稿</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (pendingDraft) {
                    setScript(pendingDraft)
                    setPendingDraft(null)
                  }
                  setDraftBanner('restored')
                }}
                className="px-3 py-1 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90"
              >
                恢复
              </button>
              <button
                onClick={() => {
                  clearDraft(id)
                  setPendingDraft(null)
                  setDraftBanner(null)
                }}
                className="px-3 py-1 bg-surface-3 text-text-3 rounded text-xs font-medium hover:text-text"
              >
                丢弃
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm text-text-3 font-mono">{id}</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-accent/15 text-accent">脚本编辑</span>
            </div>
            <h1 className="text-2xl font-bold">内容工厂</h1>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {saveError}
              </div>
            )}
            {autoSaveIndicator && (
              <span className="text-xs text-green-400">已自动保存</span>
            )}
            <button
              onClick={save}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                saving
                  ? 'bg-surface-3 text-text-3'
                  : 'bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90'
              }`}
            >
              {saving ? '保存中...' : '保存脚本'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Editor */}
          <div className="flex-1">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex border-b border-border">
                {['main', 'beats', 'hooks', 'platforms'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-accent border-b-2 border-accent bg-accent/5'
                        : 'text-text-2 hover:text-text'
                    }`}
                  >
                    {tab === 'main' && '主脚本'}
                    {tab === 'beats' && 'Beat 大纲'}
                    {tab === 'hooks' && 'Hook 与标题'}
                    {tab === 'platforms' && '平台适配'}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'main' && (
                  <div>
                    {showIssues && issues.length > 0 && (
                      <div className="mb-4 p-3 bg-surface-2 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">检测到 {issues.length} 处口语化问题</span>
                          <button
                            onClick={() => setShowIssues(false)}
                            className="text-xs text-text-3 hover:text-text"
                          >
                            隐藏
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {issues.slice(0, 8).map((issue, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded border ${getIssueColor(issue.type)}`}>
                              {getIssueLabel(issue.type)}: {issue.text.slice(0, 15)}{issue.text.length > 15 ? '...' : ''}
                            </span>
                          ))}
                          {issues.length > 8 && (
                            <span className="text-xs px-2 py-1 rounded bg-surface-3 text-text-3">
                              +{issues.length - 8} 更多
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        value={script.script || ''}
                        onChange={e => setScript({ ...script, script: e.target.value })}
                        placeholder="在此编写口播脚本...&#10;&#10;提示：&#10;• 用口语化表达&#10;• 括号内加语气提示（笑）、（停顿）&#10;• 关键数字前加 [停顿] 标记"
                        className="w-full h-[500px] bg-transparent text-sm text-text leading-relaxed resize-none focus:outline-none placeholder:text-text-3/50"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'beats' && (
                  <div className="space-y-4">
                    {(script.beats || []).map((beat, idx) => (
                      <div key={idx} className="bg-surface-2 border border-border rounded-lg p-4">
                        <input
                          value={beat.name}
                          onChange={e => {
                            const newBeats = [...(script.beats || [])]
                            newBeats[idx].name = e.target.value
                            setScript({ ...script, beats: newBeats })
                          }}
                          className="w-full bg-transparent text-sm font-semibold text-text mb-2 focus:outline-none"
                          placeholder="Beat 名称"
                        />
                        <textarea
                          value={beat.content}
                          onChange={e => {
                            const newBeats = [...(script.beats || [])]
                            newBeats[idx].content = e.target.value
                            setScript({ ...script, beats: newBeats })
                          }}
                          className="w-full h-20 bg-transparent text-sm text-text-2 resize-none focus:outline-none placeholder:text-text-3/50"
                          placeholder="Beat 内容描述..."
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setScript({ ...script, beats: [...(script.beats || []), { name: '', content: '' }] })}
                      className="w-full py-3 border border-dashed border-border rounded-lg text-sm text-text-3 hover:text-text hover:border-accent/30 transition-colors"
                    >
                      + 添加 Beat
                    </button>
                  </div>
                )}

                {activeTab === 'hooks' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-text-3 block mb-2">标题候选</label>
                      <input
                        value={script.title || ''}
                        onChange={e => setScript({ ...script, title: e.target.value })}
                        className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text focus:outline-none focus:border-accent"
                        placeholder="主标题"
                      />
                    </div>
                    {(script.hooks || []).map((hook, idx) => (
                      <div key={idx}>
                        <label className="text-sm text-text-3 block mb-2">Hook {idx + 1}</label>
                        <input
                          value={hook}
                          onChange={e => {
                            const newHooks = [...(script.hooks || [])]
                            newHooks[idx] = e.target.value
                            setScript({ ...script, hooks: newHooks })
                          }}
                          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text focus:outline-none focus:border-accent"
                          placeholder={`Hook 变体 ${idx + 1}`}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-sm text-text-3 block mb-2">CTA</label>
                      <input
                        value={script.cta || ''}
                        onChange={e => setScript({ ...script, cta: e.target.value })}
                        className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm text-text focus:outline-none focus:border-accent"
                        placeholder="结尾行动号召..."
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'platforms' && (
                  <div className="space-y-4">
                    {['youtube', 'douyin', 'bilibili', 'xiaohongshu'].map(platform => (
                      <div key={platform} className="bg-surface-2 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold capitalize">{platform}</span>
                          <span className="text-xs text-text-3">
                            {platform === 'youtube' && '6-8 分钟'}
                            {platform === 'douyin' && '45-70 秒'}
                            {platform === 'bilibili' && '4-6 分钟'}
                            {platform === 'xiaohongshu' && '图文/视频'}
                          </span>
                        </div>
                        <textarea
                          value={script.platform_variants?.[platform] || ''}
                          onChange={e => {
                            setScript({
                              ...script,
                              platform_variants: {
                                ...script.platform_variants,
                                [platform]: e.target.value,
                              },
                            })
                          }}
                          className="w-full h-24 bg-transparent text-sm text-text-2 resize-none focus:outline-none placeholder:text-text-3/50"
                          placeholder={`${platform} 版本文案...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="w-full lg:w-72 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">脚本统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-3">字数</span>
                  <span className="font-semibold">{wordCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-3">预估时长</span>
                  <span className="font-semibold">{estimatedMinutes}:{String(Math.floor((wordCount % 200) / 200 * 60)).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-3">WPM</span>
                  <span className="font-semibold">200</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-3">Beats</span>
                  <span className="font-semibold">{(script.beats || []).length}</span>
                </div>
                {issues.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-3">口语化问题</span>
                    <button
                      onClick={() => setShowIssues(!showIssues)}
                      className={`font-semibold ${showIssues ? 'text-accent' : 'text-orange'}`}
                    >
                      {issues.length} 个{showIssues ? '（已显示）' : '（点击显示）'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">AI 助手</h3>
              <div className="space-y-2">
                <button
                  onClick={() => callAI('rewrite_colloquial')}
                  disabled={!!aiLoading}
                  className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors disabled:opacity-50"
                >
                  {aiLoading === 'rewrite_colloquial' ? '生成中...' : '✨ 改写这段更口语化'}
                </button>
                <button
                  onClick={() => callAI('generate_titles')}
                  disabled={!!aiLoading}
                  className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors disabled:opacity-50"
                >
                  {aiLoading === 'generate_titles' ? '生成中...' : '✨ 生成 3 个标题候选'}
                </button>
                <button
                  onClick={() => callAI('generate_hooks')}
                  disabled={!!aiLoading}
                  className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors disabled:opacity-50"
                >
                  {aiLoading === 'generate_hooks' ? '生成中...' : '✨ 生成 3 个 Hook 候选'}
                </button>
                <button
                  onClick={() => callAI('generate_remotion')}
                  disabled={!!aiLoading}
                  className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors disabled:opacity-50"
                >
                  {aiLoading === 'generate_remotion' ? '生成中...' : '✨ 生成 Remotion 插画需求'}
                </button>
                <button
                  onClick={() => callAI('rewrite_douyin')}
                  disabled={!!aiLoading}
                  className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors disabled:opacity-50"
                >
                  {aiLoading === 'rewrite_douyin' ? '生成中...' : '✨ 改写成抖音 60 秒版'}
                </button>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">版本历史</h3>
              <button
                onClick={openBackups}
                className="w-full text-left px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-2 hover:border-accent/30 hover:text-text transition-colors"
              >
                📜 查看版本历史
              </button>
            </div>

            {/* AI Results Panel */}
            {(aiResult || aiError) && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">AI 生成结果</h3>
                  <button
                    onClick={() => { setAiResult(null); setAiError('') }}
                    className="text-xs text-text-3 hover:text-text"
                  >
                    关闭
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {aiError}
                  </div>
                )}

                {aiResult?.text && (
                  <div className="space-y-3">
                    <div className="text-sm text-text-2 whitespace-pre-wrap max-h-64 overflow-auto">
                      {aiResult.text}
                    </div>
                    <button
                      onClick={applyTextResult}
                      className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90"
                    >
                      应用到脚本
                    </button>
                  </div>
                )}

                {aiResult?.titles && (
                  <div className="space-y-2">
                    {aiResult.titles.map((title, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-text-3 w-6">{i + 1}</span>
                        <span className="flex-1 text-sm text-text">{title}</span>
                        <button
                          onClick={() => applyTitle(i)}
                          className="text-xs px-2 py-1 bg-accent/15 text-accent rounded hover:bg-accent/25"
                        >
                          应用
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult?.hooks && (
                  <div className="space-y-2">
                    {aiResult.hooks.map((hook, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-text-3 w-6">{i + 1}</span>
                        <span className="flex-1 text-sm text-text">{hook}</span>
                        <button
                          onClick={() => applyHook(i)}
                          className="text-xs px-2 py-1 bg-accent/15 text-accent rounded hover:bg-accent/25"
                        >
                          应用
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {aiResult?.scenes && (
                  <div className="space-y-3 max-h-64 overflow-auto">
                    {aiResult.scenes.map((scene, i) => (
                      <div key={i} className="p-3 bg-surface-2 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-text-3">{scene.time}</span>
                        </div>
                        <p className="text-sm text-text mb-1">{scene.description}</p>
                        <p className="text-xs text-text-3 italic">{scene.prompt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Backups Modal */}
      {showBackups && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[480px] max-h-[70vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">版本历史</h3>
              <button
                onClick={() => setShowBackups(false)}
                className="text-sm text-text-3 hover:text-text"
              >
                关闭
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-2">
              {backupsLoading ? (
                <div className="text-sm text-text-3 text-center py-8">加载中...</div>
              ) : backups.length === 0 ? (
                <div className="text-sm text-text-3 text-center py-8">暂无历史版本</div>
              ) : (
                backups.map(b => (
                  <div
                    key={b.filename}
                    className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-lg"
                  >
                    <div>
                      <div className="text-sm text-text">{new Date(b.timestamp).toLocaleString('zh-CN')}</div>
                      <div className="text-xs text-text-3 font-mono mt-0.5">{b.filename}</div>
                    </div>
                    <button
                      onClick={() => setConfirmRestore(b.filename)}
                      className="text-xs px-3 py-1.5 bg-accent/15 text-accent rounded hover:bg-accent/25 transition-colors"
                    >
                      恢复此版本
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[360px] p-5 shadow-xl">
            <h3 className="font-semibold mb-2">确认恢复</h3>
            <p className="text-sm text-text-2 mb-5">
              确定要恢复到此版本吗？当前内容将被覆盖。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-4 py-2 text-sm text-text-2 hover:text-text transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => restoreBackup(confirmRestore)}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
