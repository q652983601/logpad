'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Sidebar from '@/components/Sidebar'
import ErrorBanner from '@/components/ErrorBanner'

interface Asset {
  id: number
  episode_id: string | null
  name: string
  type: string
  mime_type: string | null
  path: string
  size: number
  source: string
  status: string
  created_at: string
  episode_title?: string | null
}

interface Episode {
  id: string
  title: string
}

const SOURCE_TAGS = ['实拍', 'AI生成', '录屏', '音乐', '本地文件夹', '其他']

const SOURCE_COLORS: Record<string, string> = {
  '实拍': 'bg-green/15 text-green',
  'AI生成': 'bg-accent/15 text-accent',
  '录屏': 'bg-orange/15 text-orange',
  '音乐': 'bg-accent-2/15 text-accent-2',
  '本地文件夹': 'bg-green/15 text-green',
  '其他': 'bg-surface-3 text-text-2',
}

function assetUrl(asset: Asset): string {
  return asset.path.startsWith('local:') ? `/api/assets/${asset.id}/file` : asset.path
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function VideoThumbnail({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return

    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    const onLoaded = () => {
      video.currentTime = 0.1
    }
    const onSeeked = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 180
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      setReady(true)
    }
    const onError = () => setReady(true)

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      video.removeAttribute('src')
      video.load()
    }
  }, [src, visible])

  return (
    <div ref={containerRef} className="w-full h-full bg-surface-3 flex items-center justify-center relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl text-text-3">▶</span>
        </div>
      )}
    </div>
  )
}

const AUDIO_BAR_HEIGHTS = [9, 18, 12, 26, 16, 22, 11, 28, 15, 20, 13, 24]

function AudioPlaceholder() {
  return (
    <div className="w-full h-full bg-surface-3 flex flex-col items-center justify-center gap-2">
      <svg width="48" height="32" viewBox="0 0 48 32" fill="none" className="opacity-40">
        {AUDIO_BAR_HEIGHTS.map((h, i) => {
          return (
            <rect
              key={i}
              x={i * 4}
              y={(32 - h) / 2}
              width="2.5"
              height={h}
              rx="1.25"
              fill="currentColor"
              className="text-text-2"
            />
          )
        })}
      </svg>
      <span className="text-[10px] text-text-3 uppercase tracking-wider">Audio</span>
    </div>
  )
}

function AssetCard({
  asset,
  onClick,
}: {
  asset: Asset
  onClick: (asset: Asset) => void
}) {
  const isImage = asset.type === 'image'
  const isVideo = asset.type === 'video'
  const isAudio = asset.type === 'audio'

  return (
    <div
      onClick={() => onClick(asset)}
      className="group bg-surface border border-border rounded-xl overflow-hidden cursor-pointer hover:border-accent/30 transition-colors"
    >
      <div className="aspect-video bg-surface-2 relative overflow-hidden">
        {isImage && (
          <Image
            src={assetUrl(asset)}
            alt={asset.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {isVideo && <VideoThumbnail src={assetUrl(asset)} />}
        {isAudio && <AudioPlaceholder />}
        {!isImage && !isVideo && !isAudio && (
          <div className="w-full h-full flex items-center justify-center text-text-3 text-sm">未知类型</div>
        )}

        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[asset.source] || SOURCE_COLORS['其他']}`}>
            {asset.source}
          </span>
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm text-text truncate" title={asset.name}>
          {asset.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-text-3">{formatSize(asset.size)}</span>
          {asset.episode_title && (
            <span className="text-[10px] text-accent truncate max-w-[120px]" title={asset.episode_title}>
              {asset.episode_title}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSource, setActiveSource] = useState<string>('')
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [importingFolder, setImportingFolder] = useState(false)
  const [folderMessage, setFolderMessage] = useState('')

  const fetchAssets = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (activeSource) params.set('source', activeSource)
      if (search) params.set('search', search)
      params.set('limit', '200')
      const res = await fetch(`/api/assets?${params.toString()}`)
      const data = await res.json()

      // Fetch episodes to map titles
      const epRes = await fetch('/api/runs')
      const epData = await epRes.json() as Episode[]
      const epMap = new Map<string, string>()
      epData.forEach(e => epMap.set(e.id, e.title))

      const enriched = (data as Asset[]).map(a => ({
        ...a,
        episode_title: a.episode_id ? epMap.get(a.episode_id) || null : null,
      }))
      setAssets(enriched)
      setEpisodes(epData.map(e => ({ id: e.id, title: e.title })))
    } catch (err) {
      console.error('Failed to fetch assets:', err)
    } finally {
      setLoading(false)
    }
  }, [activeSource, search])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await fetchAssets()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [fetchAssets])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress('')

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(`上传中 ${i + 1}/${files.length}: ${file.name}`)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', activeSource || '其他')

      try {
        const res = await fetch('/api/assets', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json()
          alert(`上传失败: ${err.error || file.name}`)
        }
      } catch {
        alert(`上传失败: ${file.name}`)
      }
    }

    setUploading(false)
    setUploadProgress('')
    fetchAssets()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(e.dataTransfer.files)
  }

  async function updateAssetDetail(id: number, updates: { source?: string; episode_id?: string | null }) {
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Update failed')
      fetchAssets()
      if (detailAsset && detailAsset.id === id) {
        const epTitle = updates.episode_id ? episodes.find(e => e.id === updates.episode_id)?.title || null : null
        setDetailAsset({ ...detailAsset, ...updates, episode_title: epTitle })
      }
    } catch (err) {
      console.error('Failed to update asset:', err)
    }
  }

  async function deleteAssetItem(id: number) {
    const localOnly = detailAsset?.path.startsWith('local:')
    if (!confirm(localOnly ? '确定从 LogPad 移除该索引？原始本地文件不会删除。' : '确定删除该素材？上传文件将一并删除。')) return
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDetailAsset(null)
      fetchAssets()
    } catch (err) {
      console.error('Failed to delete asset:', err)
    }
  }

  async function importLocalFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!folderPath.trim()) return
    setImportingFolder(true)
    setFolderMessage('')
    try {
      const res = await fetch('/api/assets/import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          source: activeSource || '本地文件夹',
          recursive: true,
          limit: 500,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '导入失败')
      setFolderMessage(`已索引 ${data.imported || 0} 个，跳过重复 ${data.skipped || 0} 个`)
      await fetchAssets()
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImportingFolder(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {error && <ErrorBanner message={error} onRetry={loadData} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">素材库</h2>
            <p className="text-text-2 text-sm mt-1">管理图片、视频、音频素材，支持上传和本地文件夹索引</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? '上传中...' : '+ 上传素材'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />

        {/* Search & Filters */}
        <form onSubmit={importLocalFolder} className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs uppercase tracking-wider text-text-3">本地文件夹索引</label>
              <input
                value={folderPath}
                onChange={e => setFolderPath(e.target.value)}
                placeholder="/Users/wilsonlu/Desktop/素材/sony-50mm"
                className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-xs text-text-3">只登记本地路径，不复制大文件；删除索引不会删除原始文件。</p>
            </div>
            <button
              type="submit"
              disabled={importingFolder || !folderPath.trim()}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {importingFolder ? '索引中...' : '索引文件夹'}
            </button>
          </div>
          {folderMessage && <p className="mt-3 text-xs text-text-2">{folderMessage}</p>}
        </form>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索文件名..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveSource('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeSource === '' ? 'bg-accent text-white' : 'bg-surface-2 text-text-2 hover:text-text'
              }`}
            >
              全部
            </button>
            {SOURCE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveSource(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeSource === tag ? 'bg-accent text-white' : 'bg-surface-2 text-text-2 hover:text-text'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Upload progress */}
        {uploadProgress && (
          <div className="mb-4 text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">
            {uploadProgress}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-8 ${
            dragOver ? 'border-accent bg-accent/5' : 'border-border bg-surface/50'
          }`}
        >
          <p className="text-sm text-text-2">拖拽文件到此处上传，或点击右上角按钮</p>
          <p className="text-xs text-text-3 mt-1">支持图片、视频、音频，单文件最大 100MB</p>
        </div>

        {/* Asset grid */}
        {loading ? (
          <div className="text-center text-text-2 py-20">加载中...</div>
        ) : assets.length === 0 ? (
          <div className="text-center text-text-3 py-20">
            <p className="text-sm">暂无素材</p>
            <p className="text-xs mt-1">上传你的第一个素材吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map(asset => (
              <AssetCard key={asset.id} asset={asset} onClick={setDetailAsset} />
            ))}
          </div>
        )}
      </main>

      {/* Detail panel */}
      {detailAsset && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setDetailAsset(null)}
        >
          <div
            className="w-full max-w-md bg-surface border-l border-border h-full overflow-auto p-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-detail-title"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="asset-detail-title" className="text-lg font-bold">素材详情</h3>
              <button
                onClick={() => setDetailAsset(null)}
                className="text-text-3 hover:text-text text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="aspect-video bg-surface-2 rounded-xl overflow-hidden mb-6 flex items-center justify-center relative">
              {detailAsset.type === 'image' && (
                <Image
                  src={assetUrl(detailAsset)}
                  alt={detailAsset.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 448px"
                  className="object-cover"
                />
              )}
              {detailAsset.type === 'video' && (
                <video src={assetUrl(detailAsset)} controls className="w-full h-full object-contain" />
              )}
              {detailAsset.type === 'audio' && (
                <div className="flex flex-col items-center gap-3">
                  <AudioPlaceholder />
                  <audio src={assetUrl(detailAsset)} controls className="w-full px-4" />
                </div>
              )}
              {!['image', 'video', 'audio'].includes(detailAsset.type) && (
                <span className="text-text-3 text-sm">无法预览</span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-3 uppercase tracking-wider">文件名</label>
                <p className="text-sm text-text mt-1 break-all">{detailAsset.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-3 uppercase tracking-wider">类型</label>
                  <p className="text-sm text-text mt-1 capitalize">{detailAsset.type}</p>
                </div>
                <div>
                  <label className="text-xs text-text-3 uppercase tracking-wider">大小</label>
                  <p className="text-sm text-text mt-1">{formatSize(detailAsset.size)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-text-3 uppercase tracking-wider">上传时间</label>
                <p className="text-sm text-text mt-1">{formatDate(detailAsset.created_at)}</p>
              </div>

              <div>
                <label className="text-xs text-text-3 uppercase tracking-wider">路径</label>
                <p className="text-xs text-text-2 mt-1 break-all">{detailAsset.path.startsWith('local:') ? detailAsset.path.slice('local:'.length) : detailAsset.path}</p>
              </div>

              <div>
                <label className="text-xs text-text-3 uppercase tracking-wider">来源标签</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {SOURCE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => updateAssetDetail(detailAsset.id, { source: tag })}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        detailAsset.source === tag
                          ? SOURCE_COLORS[tag]
                          : 'bg-surface-2 text-text-3 hover:text-text'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-text-3 uppercase tracking-wider">关联选题</label>
                <select
                  value={detailAsset.episode_id || ''}
                  onChange={e => updateAssetDetail(detailAsset.id, { episode_id: e.target.value || null })}
                  className="mt-2 w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                >
                  <option value="">无关联</option>
                  {episodes.map(ep => (
                    <option key={ep.id} value={ep.id}>
                      {ep.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <a
                  href={assetUrl(detailAsset)}
                  download={detailAsset.name}
                  className="flex-1 text-center px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text hover:bg-surface-3 transition-colors"
                >
                  下载文件
                </a>
                <button
                  onClick={() => deleteAssetItem(detailAsset.id)}
                  className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  删除素材
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
