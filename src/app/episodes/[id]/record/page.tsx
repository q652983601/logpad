'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface ScriptData {
  script?: string
  beats?: Array<{ name: string; content: string }>
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

  useEffect(() => {
    Promise.all([
      fetch(`/api/runs/${id}/script`).then(r => r.ok ? r.json() : {}),
      fetch(`/api/runs/${id}/packaging`).then(r => r.ok ? r.json() : {}),
    ]).then(([scriptData, pkgData]) => {
      setScript(scriptData)
      setPackaging(pkgData)
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

  const illustrations = packaging.remotion_illustration_prompts || []
  const prompterText = useMemo(() => {
    return beats.slice(prompterBeat).map((beat, idx) => `${prompterBeat + idx + 1}. ${beat.name}\n${beat.content}`).join('\n\n')
  }, [beats, prompterBeat])

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

        <div className="grid grid-cols-3 gap-6 mb-8">
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

        <div className="grid grid-cols-2 gap-6">
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
            {beats[activeBeat] && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs bg-accent/15 text-accent font-medium">
                    Beat {activeBeat + 1}
                  </span>
                  <span className="text-sm font-medium">{beats[activeBeat].name}</span>
                </div>

                <div className="bg-surface-2 rounded-lg p-4 mb-4 text-sm text-text-2 leading-relaxed">
                  {beats[activeBeat].content}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-3 w-16">Take 1</span>
                    <span className="px-2 py-1 rounded text-xs bg-green/15 text-green">✓ 可用</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-3 w-16">Take 2</span>
                    <span className="px-2 py-1 rounded text-xs bg-orange/15 text-orange">~ 备用</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-3 w-16">Take 3</span>
                    <span className="px-2 py-1 rounded text-xs bg-surface-3 text-text-3">— 未录</span>
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
          className="fixed inset-0 z-[80] bg-black text-white flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompter-title"
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs text-white/45 font-mono">{id}</p>
              <h2 id="prompter-title" className="text-lg font-semibold">全屏提词器</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                onClick={() => setPrompterPaused(paused => !paused)}
                className="rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/15"
              >
                {prompterPaused ? '继续' : '暂停'}
              </button>
              <label className="text-white/60">速度</label>
              <input
                type="range"
                min="20"
                max="120"
                value={prompterSpeed}
                onChange={e => setPrompterSpeed(Number(e.target.value))}
              />
              <label className="text-white/60 ml-2">字号</label>
              <input
                type="range"
                min="24"
                max="56"
                value={prompterFontSize}
                onChange={e => setPrompterFontSize(Number(e.target.value))}
              />
              <button
                onClick={() => setPrompterOpen(false)}
                className="ml-2 rounded-md border border-white/20 px-3 py-1.5 text-white/80 hover:bg-white/10"
              >
                关闭
              </button>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-accent/70" />
            <div className="absolute left-4 top-4 z-10 hidden max-h-[calc(100%-2rem)] w-56 overflow-auto rounded-lg border border-white/10 bg-black/60 p-2 md:block">
              <p className="mb-2 px-2 text-xs text-white/45">从段落开始</p>
              {beats.map((beat, idx) => (
                <button
                  key={`${beat.name}-${idx}`}
                  onClick={() => {
                    setPrompterBeat(idx)
                    setActiveBeat(idx)
                    setPrompterPaused(false)
                  }}
                  className={`mb-1 block w-full rounded-md px-2 py-2 text-left text-xs transition-colors ${
                    prompterBeat === idx ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/10'
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
          <div className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-xs text-white/45">
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
