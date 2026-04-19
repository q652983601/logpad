'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'

interface VoiceNote {
  id: number
  title: string
  audio_path: string | null
  audio_name: string | null
  mime_type: string | null
  size: number
  transcript: string
  summary: string
  key_points: string
  tags: string
  status: string
  created_at: string
  updated_at: string
}

interface VoiceCollection {
  id: number
  title: string
  note_ids: string
  theme: string
  audience_pain: string
  theory_support: string
  content_angle: string
  draft_outline: string
  agent_brief: string
  status: string
  created_at: string
  updated_at: string
}

function parseJsonList(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function formatDate(value: string): string {
  return value ? value.slice(0, 16).replace('T', ' ') : ''
}

function makeRunId(): string {
  return `${new Date().toISOString().slice(0, 10)}-voice-${Math.random().toString(36).slice(2, 6)}`
}

export default function VoiceInboxPage() {
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [collections, setCollections] = useState<VoiceCollection[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [collectionTitle, setCollectionTitle] = useState('')
  const [agentLoadingId, setAgentLoadingId] = useState<number | null>(null)
  const [createRunLoadingId, setCreateRunLoadingId] = useState<number | null>(null)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const [notesRes, collectionsRes] = await Promise.all([
        fetch(`/api/voice-notes?${params.toString()}`),
        fetch('/api/voice-collections'),
      ])
      if (!notesRes.ok) throw new Error(`voice notes HTTP ${notesRes.status}`)
      if (!collectionsRes.ok) throw new Error(`collections HTTP ${collectionsRes.status}`)
      const [noteRows, collectionRows] = await Promise.all([notesRes.json(), collectionsRes.json()])
      setNotes(noteRows)
      setCollections(collectionRows)
      if (!activeNoteId && noteRows[0]) setActiveNoteId(noteRows[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeNote = useMemo(
    () => notes.find(note => note.id === activeNoteId) || notes[0],
    [activeNoteId, notes]
  )

  useEffect(() => {
    setTranscriptDraft(activeNote?.transcript || '')
  }, [activeNote?.id, activeNote?.transcript])

  function toggleSelected(id: number) {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!file && !transcriptDraft.trim()) return
    setUploading(true)
    setMessage('')
    try {
      const form = new FormData()
      if (file) form.append('file', file)
      form.append('title', title)
      form.append('tags', tags)
      form.append('transcript', transcriptDraft)
      const res = await fetch('/api/voice-notes', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '创建失败')
      setTitle('')
      setTags('')
      setTranscriptDraft('')
      setFile(null)
      setMessage('已加入口述资料库')
      await loadData()
      setActiveNoteId(data.id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '创建失败')
    } finally {
      setUploading(false)
    }
  }

  async function saveTranscript() {
    if (!activeNote) return
    setMessage('')
    const res = await fetch(`/api/voice-notes/${activeNote.id}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcriptDraft }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || '保存失败')
      return
    }
    setMessage('文字和摘要已保存')
    await loadData()
  }

  async function autoTranscribe() {
    if (!activeNote) return
    setMessage('转写中...')
    const res = await fetch(`/api/voice-notes/${activeNote.id}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || '转写失败')
      return
    }
    setTranscriptDraft(data.transcript || '')
    setMessage('转写完成')
    await loadData()
  }

  async function createCollection() {
    if (selectedIds.length === 0) return
    setMessage('')
    const selectedTitles = notes.filter(note => selectedIds.includes(note.id)).map(note => note.title)
    const res = await fetch('/api/voice-collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: collectionTitle || selectedTitles.slice(0, 2).join(' + ') || '口述组合',
        note_ids: selectedIds,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || '组合失败')
      return
    }
    setCollectionTitle('')
    setSelectedIds([])
    setMessage('已创建组合，可以让本机 Agent 讨论')
    await loadData()
  }

  async function discussCollection(id: number) {
    setAgentLoadingId(id)
    setMessage('')
    try {
      const res = await fetch(`/api/voice-collections/${id}/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Agent 讨论失败')
      setMessage('Agent 讨论已写回组合')
      await loadData()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Agent 讨论失败')
    } finally {
      setAgentLoadingId(null)
    }
  }

  async function createRunFromCollection(collection: VoiceCollection) {
    setCreateRunLoadingId(collection.id)
    setMessage('')
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: makeRunId(),
          title: collection.theme || collection.title,
          description: collection.agent_brief || collection.content_angle || collection.draft_outline,
          platforms: ['youtube', 'douyin-main', 'bilibili'],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '转选题失败')
      setMessage('已转入内容工厂')
      await loadData()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '转选题失败')
    } finally {
      setCreateRunLoadingId(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <ErrorBanner message={error} onRetry={loadData} />

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3">Voice Inbox</p>
            <h1 className="mt-1 text-2xl font-bold">口述资料库</h1>
            <p className="mt-1 text-sm text-text-2">上传录音、保存转写，把零散观点组合成选题和脚本方向。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">笔记</p>
              <p className="mt-1 text-xl font-semibold">{notes.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">已选</p>
              <p className="mt-1 text-xl font-semibold">{selectedIds.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-xs text-text-3">组合</p>
              <p className="mt-1 text-xl font-semibold">{collections.length}</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm text-text-2" role="status">
            {message}
          </div>
        )}

        <form onSubmit={createNote} className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">新增口述笔记</h2>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="标题，可留空自动生成"
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="标签，例如 心理学, Sony, agent"
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
            <label className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-sm text-text-2 hover:text-text">
              {file ? file.name : '选择录音'}
              <input type="file" accept="audio/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <textarea
            value={transcriptDraft}
            onChange={e => setTranscriptDraft(e.target.value)}
            rows={4}
            placeholder="可以先贴一段文字；如果只上传音频，后面点“自动转写”。"
            className="mt-3 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={uploading || (!file && !transcriptDraft.trim())}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {uploading ? '保存中...' : '保存到资料库'}
          </button>
        </form>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-3">搜索笔记</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索标题、摘要、转写内容"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>
          <button onClick={loadData} className="rounded-lg border border-border px-4 py-2 text-sm text-text-2 hover:text-text">
            刷新
          </button>
          <div className="flex-1">
            <label className="mb-1 block text-xs uppercase tracking-wider text-text-3">组合标题</label>
            <input
              value={collectionTitle}
              onChange={e => setCollectionTitle(e.target.value)}
              placeholder="比如：正能量心理学内容方向"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={createCollection}
            disabled={selectedIds.length === 0}
            className="rounded-lg bg-green/15 px-4 py-2 text-sm font-semibold text-green hover:bg-green/25 disabled:opacity-50"
          >
            组合选中笔记
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section>
            {loading ? (
              <div className="py-16 text-center text-sm text-text-2">加载中...</div>
            ) : notes.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-text-3">
                还没有口述笔记。先上传一段录音，或直接贴一段转写文字。
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const points = parseJsonList(note.key_points)
                  return (
                    <div
                      key={note.id}
                      className={`rounded-xl border bg-surface p-4 transition-colors ${activeNote?.id === note.id ? 'border-accent/50' : 'border-border hover:border-accent/30'}`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(note.id)}
                          onChange={() => toggleSelected(note.id)}
                          className="mt-1"
                          aria-label={`选择 ${note.title}`}
                        />
                        <button onClick={() => setActiveNoteId(note.id)} className="min-w-0 flex-1 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-text">{note.title}</h3>
                            <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] text-text-3">{note.status}</span>
                            {note.tags && <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{note.tags}</span>}
                          </div>
                          <p className="mt-1 text-sm text-text-2 line-clamp-2">{note.summary || note.transcript || '待转写/待摘要'}</p>
                          {points.length > 0 && (
                            <p className="mt-2 text-xs text-text-3">{points.slice(0, 3).join(' / ')}</p>
                          )}
                          <p className="mt-2 text-[10px] text-text-3">{formatDate(note.created_at)}</p>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">当前笔记</h2>
              {activeNote ? (
                <div className="mt-3">
                  <p className="text-sm font-medium text-text">{activeNote.title}</p>
                  {activeNote.audio_path && (
                    <audio src={activeNote.audio_path} controls className="mt-3 w-full" />
                  )}
                  <textarea
                    value={transcriptDraft}
                    onChange={e => setTranscriptDraft(e.target.value)}
                    rows={10}
                    placeholder="转写文字"
                    className="mt-3 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={saveTranscript} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">
                      保存文字并摘要
                    </button>
                    <button onClick={autoTranscribe} disabled={!activeNote.audio_path} className="rounded-lg border border-border px-3 py-2 text-xs text-text-2 hover:text-text disabled:opacity-40">
                      自动转写
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-3">选择一条笔记查看详情。</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">组合与主题讨论</h2>
              <div className="mt-3 space-y-3">
                {collections.length === 0 ? (
                  <p className="text-sm text-text-3">选中几条笔记后创建组合。</p>
                ) : collections.slice(0, 5).map(collection => (
                  <div key={collection.id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text">{collection.title}</p>
                        <p className="mt-1 text-xs text-text-3">{collection.theme || '待讨论主题'}</p>
                      </div>
                      <span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] text-text-3">{collection.status}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-text-2 line-clamp-5">
                      {collection.agent_brief || collection.draft_outline || collection.content_angle}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => discussCollection(collection.id)}
                        disabled={agentLoadingId === collection.id}
                        className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-50"
                      >
                        {agentLoadingId === collection.id ? '讨论中...' : '本机 Agent 讨论'}
                      </button>
                      <button
                        onClick={() => createRunFromCollection(collection)}
                        disabled={createRunLoadingId === collection.id}
                        className="rounded-lg bg-green/15 px-3 py-1.5 text-xs font-semibold text-green hover:bg-green/25 disabled:opacity-50"
                      >
                        {createRunLoadingId === collection.id ? '转入中...' : '转成选题'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
