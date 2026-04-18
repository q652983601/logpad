'use client'

import { useState, useEffect } from 'react'
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

  if (loading) return <div className="flex items-center justify-center h-screen text-text-2">加载中...</div>

  const brief = packaging.host_vo_brief || {
    lighting: '左侧柔光，避免顶光和逆光',
    camera_position: '正面 45°，胸像构图',
    background: '书架或简洁墙面，避免杂乱',
    tone: '平视、亲切、略带笨拙的真实感',
  }

  const beats = script.beats || [
    { name: 'Hook', content: script.script?.slice(0, 200) + '...' || '暂无内容' },
  ]

  const illustrations = packaging.remotion_illustration_prompts || []

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
                <p className="text-xs text-text-3 mt-1">在脚本编辑器中点击"生成 Remotion 插画需求"</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
