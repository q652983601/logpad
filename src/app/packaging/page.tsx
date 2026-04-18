'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

interface TimelineItem {
  id: string
  time: string
  label: string
  type: 'host_vo' | 'broll' | 'remotion' | 'transition'
  description: string
  prompt?: string
  status: 'pending' | 'generating' | 'done' | 'approved'
  duration: string
}

export default function PackagingPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<TimelineItem>>({
    time: '',
    label: '',
    type: 'remotion',
    description: '',
    prompt: '',
    duration: '3s',
    status: 'pending',
  })

  // Mock loading for now - would fetch from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setItems([
        {
          id: '1',
          time: '00:00',
          label: 'Hook 开场',
          type: 'host_vo',
          description: '真人出镜，手持镜头展示',
          status: 'done',
          duration: '6s',
        },
        {
          id: '2',
          time: '00:06',
          label: '标题动画',
          type: 'remotion',
          description: '标题渐入动画',
          prompt: 'Create a title card animation with "索尼 50mm F1.4" text, dark tech aesthetic, smooth fade-in',
          status: 'done',
          duration: '3s',
        },
        {
          id: '3',
          time: '00:45',
          label: '光圈对比',
          type: 'remotion',
          description: 'F1.4 vs F2.8 vs F4 景深对比',
          prompt: 'Depth-of-field comparison: show three panels with progressive blur from F1.4 to F4',
          status: 'pending',
          duration: '5s',
        },
        {
          id: '4',
          time: '01:30',
          label: '重量对比图',
          type: 'remotion',
          description: '50mm vs 35mm vs 24-70 重量对比',
          prompt: 'Bar chart comparing lens weights: 50mm (516g), 35mm (524g), 24-70 (886g)',
          status: 'pending',
          duration: '4s',
        },
      ])
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const typeConfig = {
    host_vo: { label: '口播', color: 'bg-green/15 text-green', icon: '🎙️' },
    broll: { label: 'B-Roll', color: 'bg-orange/15 text-orange', icon: '🎬' },
    remotion: { label: 'Remotion', color: 'bg-accent/15 text-accent', icon: '✨' },
    transition: { label: '转场', color: 'bg-text-3/15 text-text-3', icon: '↔️' },
  }

  const statusConfig = {
    pending: { label: '待处理', color: 'bg-surface-3 text-text-3' },
    generating: { label: '生成中', color: 'bg-orange/15 text-orange' },
    done: { label: '已完成', color: 'bg-green/15 text-green' },
    approved: { label: '已确认', color: 'bg-accent/15 text-accent' },
  }

  function handleSubmit() {
    if (!formData.time || !formData.label) return

    if (editingId) {
      setItems(prev => prev.map(item =>
        item.id === editingId ? { ...item, ...formData } as TimelineItem : item
      ))
      setEditingId(null)
    } else {
      setItems(prev => [...prev, {
        ...formData as TimelineItem,
        id: Date.now().toString(),
      }])
    }

    setShowForm(false)
    setFormData({
      time: '',
      label: '',
      type: 'remotion',
      description: '',
      prompt: '',
      duration: '3s',
      status: 'pending',
    })
  }

  function startEdit(item: TimelineItem) {
    setFormData(item)
    setEditingId(item.id)
    setShowForm(true)
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function updateStatus(id: string, status: TimelineItem['status']) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status } : item
    ))
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="text-text-2">加载中...</div>
      </main>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">包装车间</h2>
            <p className="text-text-2 text-sm mt-1">Remotion 时间轴：脚本时间点与插画/动画需求对位</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setFormData({
                time: '',
                label: '',
                type: 'remotion',
                description: '',
                prompt: '',
                duration: '3s',
                status: 'pending',
              })
            }}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {showForm ? '取消' : '+ 添加时间点'}
          </button>
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6">
            <h3 className="font-semibold mb-4">{editingId ? '编辑时间点' : '添加时间点'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-3 block mb-1">时间码</label>
                <input
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  placeholder="00:00"
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-sm text-text-3 block mb-1">标签</label>
                <input
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  placeholder="例如：标题动画"
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-sm text-text-3 block mb-1">类型</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TimelineItem['type'] })}
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                >
                  <option value="host_vo">口播</option>
                  <option value="broll">B-Roll</option>
                  <option value="remotion">Remotion</option>
                  <option value="transition">转场</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-3 block mb-1">时长</label>
                <input
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="3s"
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-text-3 block mb-1">描述</label>
                <input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="画面内容描述..."
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              {formData.type === 'remotion' && (
                <div className="col-span-2">
                  <label className="text-sm text-text-3 block mb-1">AI Prompt</label>
                  <textarea
                    value={formData.prompt}
                    onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="描述需要生成的插画/动画内容..."
                    className="w-full h-20 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text resize-none focus:outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90"
              >
                {editingId ? '保存' : '添加'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="px-5 py-2 bg-surface-2 text-text-2 rounded-lg text-sm hover:text-text"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          {/* Timeline track */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-3" />

          <div className="space-y-4">
            {items.map((item) => {
              const typeInfo = typeConfig[item.type]
              const statusInfo = statusConfig[item.status]

              return (
                <div key={item.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 ${
                    item.status === 'done' || item.status === 'approved'
                      ? 'bg-green border-green'
                      : item.type === 'remotion'
                      ? 'bg-accent border-accent'
                      : 'bg-surface-2 border-text-3'
                  }`} />

                  <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/20 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-text-3">{item.time}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs text-text-3">{item.duration}</span>
                        </div>

                        <h4 className="font-medium text-text mb-1">{item.label}</h4>
                        <p className="text-sm text-text-2">{item.description}</p>

                        {item.prompt && (
                          <div className="mt-3 p-3 bg-surface-2 rounded-lg border border-border">
                            <p className="text-xs text-text-3 mb-1">AI Prompt</p>
                            <p className="text-sm text-text-2">{item.prompt}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(item.id, 'generating')}
                            className="px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25"
                          >
                            开始生成
                          </button>
                        )}
                        {item.status === 'generating' && (
                          <button
                            onClick={() => updateStatus(item.id, 'done')}
                            className="px-3 py-1.5 bg-green/15 text-green rounded-lg text-xs font-medium hover:bg-green/25"
                          >
                            标记完成
                          </button>
                        )}
                        {item.status === 'done' && (
                          <button
                            onClick={() => updateStatus(item.id, 'approved')}
                            className="px-3 py-1.5 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25"
                          >
                            确认
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-1.5 bg-surface-2 text-text-2 rounded-lg text-xs hover:text-text"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="px-3 py-1.5 bg-surface-2 text-red-400 rounded-lg text-xs hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-3 text-lg mb-2">暂无时间点</p>
            <p className="text-text-3 text-sm">点击"添加时间点"开始创建 Remotion 时间轴</p>
          </div>
        )}
      </main>
    </div>
  )
}
