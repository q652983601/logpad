'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface BeatData {
  name: string
  content: string
}

interface ScriptData {
  script?: string
  beats?: BeatData[]
}

interface PackagingData {
  shot_list?: Array<{ time: string; description: string; type: string }>
  host_vo_brief?: {
    lighting: string
    camera_position: string
    background: string
    tone: string
  }
  remotion_illustration_prompts?: Array<{ time: string; prompt: string }>
}

type TakeStatus = 'not_recorded' | 'recorded' | 'usable' | 'backup' | 'needs_retake'

interface TakeEntry {
  id: string
  label: string
  status: TakeStatus
  asset_path?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface BeatTakeState {
  beat_index: number
  beat_name: string
  status: TakeStatus
  selected_take_id?: string
  notes?: string
  takes: TakeEntry[]
}

interface RecordingTakes {
  beats: BeatTakeState[]
  updated_at?: string
}

const TAKE_STATUS_OPTIONS: Array<{ value: TakeStatus; label: string; className: string }> = [
  { value: 'not_recorded', label: '未录', className: 'bg-surface-3 text-text-3' },
  { value: 'recorded', label: '已录', className: 'bg-accent/15 text-accent' },
  { value: 'usable', label: '可用', className: 'bg-green/15 text-green' },
  { value: 'backup', label: '备用', className: 'bg-orange/15 text-orange' },
  { value: 'needs_retake', label: '重录', className: 'bg-red-500/10 text-red-400' },
]

function statusLabel(status: TakeStatus): string {
  return TAKE_STATUS_OPTIONS.find(option => option.value === status)?.label || status
}

function statusClassName(status: TakeStatus): string {
  return TAKE_STATUS_OPTIONS.find(option => option.value === status)?.className || 'bg-surface-3 text-text-3'
}

function emptyTakeRow(beat: BeatData, index: number): BeatTakeState {
  return {
    beat_index: index,
    beat_name: beat.name || `Beat ${index + 1}`,
    status: 'not_recorded',
    takes: [],
  }
}

function mergeTakeRows(beats: BeatData[], takes: RecordingTakes): BeatTakeState[] {
  return beats.map((beat, index) => {
    const existing = takes.beats?.find(item => item.beat_index === index)
    if (!existing) return emptyTakeRow(beat, index)
    return {
      ...existing,
      beat_index: index,
      beat_name: beat.name || existing.beat_name || `Beat ${index + 1}`,
      takes: Array.isArray(existing.takes) ? existing.takes : [],
    }
  })
}

export default function RecordPage() {
  const params = useParams()
  const id = params.id as string
  const [script, setScript] = useState<ScriptData>({})
  const [packaging, setPackaging] = useState<PackagingData>({})
  const [loading, setLoading] = useState(true)
  const [activeBeat, setActiveBeat] = useState(0)
  const [prompterOpen, setPrompterOpen] = useState(false)
  const [prompterSpeed, setPrompterSpeed] = useState(55)
  const [prompterFontSize, setPrompterFontSize] = useState(34)
  const [prompterPaused, setPrompterPaused] = useState(false)
  const [prompterBeat, setPrompterBeat] = useState(0)
  const [takes, setTakes] = useState<RecordingTakes>({ beats: [] })
  const [takesSaving, setTakesSaving] = useState(false)
  const [takesMessage, setTakesMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/runs/${id}/script`).then(r => r.ok ? r.json() : {}),
      fetch(`/api/runs/${id}/packaging`).then(r => r.ok ? r.json() : {}),
      fetch(`/api/runs/${id}/takes`).then(r => r.ok ? r.json() : { beats: [] }),
    ]).then(([scriptData, pkgData, takesData]) => {
      setScript(scriptData)
      setPackaging(pkgData)
      setTakes(takesData?.beats ? takesData : { beats: [] })
      setLoading(false)
    })
  }, [id])

  const brief = packaging.host_vo_brief || {
    lighting: '左侧柔光，避免顶光和逆光',
    camera_position: '正面 45°，胸像构图',
    background: '书架或简洁墙面，避免杂乱',
    tone: '平视、亲切、略带笨拙的真实感',
  }

  const beats = useMemo(() => {
    if (script.beats?.length) return script.beats
    return [
      { name: 'Hook', content: script.script ? `${script.script.slice(0, 200)}...` : '暂无内容' },
    ]
  }, [script.beats, script.script])

  const takeRows = useMemo(() => mergeTakeRows(beats, takes), [beats, takes])
  const illustrations = packaging.remotion_illustration_prompts || []
  const prompterText = useMemo(() => {
    return beats.slice(prompterBeat).map((beat, idx) => `${prompterBeat + idx + 1}. ${beat.name}\n${beat.content}`).join('\n\n')
  }, [beats, prompterBeat])

  function replaceTakeRows(rows: BeatTakeState[]) {
    setTakes({
      beats: rows,
      updated_at: new Date().toISOString(),
    })
  }

  function updateBeatTake(beatIndex: number, patch: Partial<BeatTakeState>) {
    replaceTakeRows(takeRows.map(row => (
      row.beat_index === beatIndex ? { ...row, ...patch } : row
    )))
  }

  function addTake(beatIndex: number) {
    const now = new Date().toISOString()
    replaceTakeRows(takeRows.map(row => {
      if (row.beat_index !== beatIndex) return row
      const nextTake: TakeEntry = {
        id: `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: `Take ${row.takes.length + 1}`,
        status: 'recorded',
        created_at: now,
        updated_at: now,
      }
      return {
        ...row,
        status: row.status === 'not_recorded' ? 'recorded' : row.status,
        selected_take_id: row.selected_take_id || nextTake.id,
        takes: [...row.takes, nextTake],
      }
    }))
  }

  function updateTake(beatIndex: number, takeId: string, patch: Partial<TakeEntry>) {
    replaceTakeRows(takeRows.map(row => {
      if (row.beat_index !== beatIndex) return row
      const nextTakes = row.takes.map(take => (
        take.id === takeId ? { ...take, ...patch, updated_at: new Date().toISOString() } : take
      ))
      const nextSelectedId = patch.status === 'usable' || patch.status === 'backup'
        ? takeId
        : row.selected_take_id
      const selectedTake = nextTakes.find(take => take.id === nextSelectedId)
      return {
        ...row,
        selected_take_id: nextSelectedId,
        status: selectedTake?.status || row.status,
        takes: nextTakes,
      }
    }))
  }

  function deleteTake(beatIndex: number, takeId: string) {
    replaceTakeRows(takeRows.map(row => {
      if (row.beat_index !== beatIndex) return row
      const nextTakes = row.takes.filter(take => take.id !== takeId)
      return {
        ...row,
        status: nextTakes.length ? row.status : 'not_recorded',
        selected_take_id: row.selected_take_id === takeId ? nextTakes[0]?.id : row.selected_take_id,
        takes: nextTakes,
      }
    }))
  }

  async function saveTakes() {
    setTakesSaving(true)
    setTakesMessage('')
    try {
      const payload = { beats: takeRows, updated_at: new Date().toISOString() }
      const res = await fetch(`/api/runs/${id}/takes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setTakes(payload)
      setTakesMessage('录制状态已保存')
    } catch (err) {
      setTakesMessage(err instanceof Error ? err.message : '保存失败')
    } finally {
      setTakesSaving(false)
    }
  }

  useEffect(() => {
    if (!prompterOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPrompterOpen(false)
      if (event.code === 'Space') {
        event.preventDefault()
        setPrompterPaused(paused => !paused)
      }
      if (event.key === 'ArrowRight') {
        setPrompterBeat(beat => Math.min(beats.length - 1, beat + 1))
        setActiveBeat(beat => Math.min(beats.length - 1, beat + 1))
      }
      if (event.key === 'ArrowLeft') {
        setPrompterBeat(beat => Math.max(0, beat - 1))
        setActiveBeat(beat => Math.max(0, beat - 1))
      }
      if (event.key === 'ArrowUp') setPrompterSpeed(speed => Math.min(120, speed + 5))
      if (event.key === 'ArrowDown') setPrompterSpeed(speed => Math.max(20, speed - 5))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [beats.length, prompterOpen])

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-text-3 font-mono">{id}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-orange/15 text-orange">口播录制</span>
          </div>
          <h1 className="text-2xl font-bold">录制工作室</h1>
          <button
            onClick={() => {
              setPrompterBeat(activeBeat)
              setPrompterPaused(false)
              setPrompterOpen(true)
            }}
            className="mt-4 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            打开全屏提词器
          </button>
        </div>

        <div className="grid gap-4 mb-8 md:grid-cols-3 md:gap-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">💡 光线</p>
            <p className="text-sm text-text">{brief.lighting}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">📷 机位</p>
            <p className="text-sm text-text">{brief.camera_position}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-sm text-text-3 mb-1">🎨 背景</p>
            <p className="text-sm text-text">{brief.background}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-4">分段录制指引</h3>
            <div className="space-y-3">
              {beats.map((beat, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBeat(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    activeBeat === idx
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-surface border-border hover:border-accent/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeBeat === idx ? 'bg-accent text-white' : 'bg-surface-3 text-text-3'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm">{beat.name}</span>
                  </div>
                  <p className="text-sm text-text-2 line-clamp-2 pl-10">{beat.content}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">当前段落详情</h3>
            {beats[activeBeat] && takeRows[activeBeat] && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs bg-accent/15 text-accent font-medium">
                    Beat {activeBeat + 1}
                  </span>
                  <span className="text-sm font-medium">{beats[activeBeat].name}</span>
                  <span className={`ml-auto rounded px-2 py-1 text-xs ${statusClassName(takeRows[activeBeat].status)}`}>
                    {statusLabel(takeRows[activeBeat].status)}
                  </span>
                </div>

                <div className="bg-surface-2 rounded-lg p-4 mb-4 text-sm text-text-2 leading-relaxed">
                  {beats[activeBeat].content}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-text">Take 管理</h4>
                    <select
                      value={takeRows[activeBeat].status}
                      onChange={event => updateBeatTake(activeBeat, { status: event.target.value as TakeStatus })}
                      className="ml-auto rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                    >
                      {TAKE_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => addTake(activeBeat)}
                      className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
                    >
                      新增 Take
                    </button>
                  </div>

                  <textarea
                    value={takeRows[activeBeat].notes || ''}
                    onChange={event => updateBeatTake(activeBeat, { notes: event.target.value })}
                    placeholder="这一段录制注意点，例如：第一句重录、镜头看左边、补一段手持 B-roll。"
                    rows={2}
                    className="mb-3 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                  />

                  {takeRows[activeBeat].takes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-sm text-text-3">
                      还没有记录 take。录完一段后点“新增 Take”，把文件路径或素材库路径填进来。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {takeRows[activeBeat].takes.map(take => (
                        <div key={take.id} className="rounded-lg border border-border bg-surface-2 p-3">
                          <div className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
                            <input
                              value={take.label}
                              onChange={event => updateTake(activeBeat, take.id, { label: event.target.value })}
                              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                            />
                            <select
                              value={take.status}
                              onChange={event => {
                                const status = event.target.value as TakeStatus
                                updateTake(activeBeat, take.id, { status })
                              }}
                              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text focus:border-accent focus:outline-none"
                            >
                              {TAKE_STATUS_OPTIONS.filter(option => option.value !== 'not_recorded').map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => deleteTake(activeBeat, take.id)}
                              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                            >
                              删除
                            </button>
                          </div>
                          <input
                            value={take.asset_path || ''}
                            onChange={event => updateTake(activeBeat, take.id, { asset_path: event.target.value })}
                            placeholder="/uploads/... 或本地素材路径"
                            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                          />
                          <textarea
                            value={take.notes || ''}
                            onChange={event => updateTake(activeBeat, take.id, { notes: event.target.value })}
                            placeholder="这个 take 的问题或优点"
                            rows={2}
                            className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={saveTakes}
                      disabled={takesSaving}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                    >
                      {takesSaving ? '保存中...' : '保存录制状态'}
                    </button>
                    {takesMessage && (
                      <span role="status" className="text-xs text-text-3">{takesMessage}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold mt-6 mb-4">Remotion 插画需求</h3>
            {illustrations.length > 0 ? (
              <div className="space-y-3">
                {illustrations.map((ill, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-3 mb-1">{ill.time}</p>
                    <p className="text-sm text-text-2">{ill.prompt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl p-5 text-center">
                <p className="text-sm text-text-3">暂无插画需求</p>
                <p className="text-xs text-text-3 mt-1">在脚本编辑器中点击生成 Remotion 插画需求</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {prompterOpen && (
        <div
          className="fixed inset-0 z-[80] bg-bg text-text flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompter-title"
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-xs text-text-3 font-mono">{id}</p>
              <h2 id="prompter-title" className="text-lg font-semibold">全屏提词器</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={() => setPrompterPaused(paused => !paused)}
                className="rounded-md bg-surface-2 px-3 py-1.5 text-text hover:bg-surface-3"
              >
                {prompterPaused ? '继续' : '暂停'}
              </button>
              <label className="text-text-2">速度</label>
              <input
                type="range"
                min="20"
                max="120"
                value={prompterSpeed}
                onChange={e => setPrompterSpeed(Number(e.target.value))}
              />
              <label className="text-text-2 ml-2">字号</label>
              <input
                type="range"
                min="24"
                max="56"
                value={prompterFontSize}
                onChange={e => setPrompterFontSize(Number(e.target.value))}
              />
              <button
                onClick={() => setPrompterOpen(false)}
                className="ml-2 rounded-md border border-border px-3 py-1.5 text-text-2 hover:bg-surface-2"
              >
                关闭
              </button>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-accent/70" />
            <div className="absolute left-4 top-4 z-10 hidden max-h-[calc(100%-2rem)] w-56 overflow-auto rounded-lg border border-border bg-surface/90 p-2 shadow-lg md:block">
              <p className="mb-2 px-2 text-xs text-text-3">从段落开始</p>
              {beats.map((beat, idx) => (
                <button
                  key={`${beat.name}-${idx}`}
                  onClick={() => {
                    setPrompterBeat(idx)
                    setActiveBeat(idx)
                    setPrompterPaused(false)
                  }}
                  className={`mb-1 block w-full rounded-md px-2 py-2 text-left text-xs transition-colors ${
                    prompterBeat === idx ? 'bg-accent text-white' : 'text-text-2 hover:bg-surface-2'
                  }`}
                >
                  {idx + 1}. {beat.name}
                </button>
              ))}
            </div>
            <div
              key={`${prompterSpeed}-${prompterFontSize}-${prompterBeat}`}
              className="mx-auto max-w-5xl whitespace-pre-wrap px-6 leading-relaxed text-center md:pl-64"
              style={{
                fontSize: `${prompterFontSize}px`,
                animation: `prompter-scroll ${prompterSpeed}s linear forwards`,
                animationPlayState: prompterPaused ? 'paused' : 'running',
              }}
            >
              {`\n\n\n${prompterText}\n\n\n`}
            </div>
          </div>
          <div className="shrink-0 border-t border-border px-4 py-2 text-center text-xs text-text-3">
            Space 暂停/继续，←/→ 跳段，↑/↓ 调速，Esc 退出
          </div>
          <style jsx>{`
            @keyframes prompter-scroll {
              from { transform: translateY(38vh); }
              to { transform: translateY(-100%); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
