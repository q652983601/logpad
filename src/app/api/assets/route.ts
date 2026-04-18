import { NextResponse } from 'next/server'
import { listAssets, createAsset } from '@/lib/db'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { validateRunId } from '@/lib/validation'

const MAX_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.aac', '.pdf']

function getAssetType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'other'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || undefined
    const episode_id = searchParams.get('episode_id') || undefined
    const search = searchParams.get('search') || undefined

    const assets = listAssets({ source, episode_id, search })
    return NextResponse.json(assets)
  } catch (err) {
    console.error('GET /api/assets error:', err)
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const source = (formData.get('source') as string) || '其他'
    const episode_id = (formData.get('episode_id') as string) || null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 413 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ error: `File type not allowed. Allowed: ${ALLOWED_EXTS.join(', ')}` }, { status: 400 })
    }

    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', dateDir)
    await mkdir(uploadDir, { recursive: true })

    const baseName = path.basename(file.name, ext)
    const safeName = `${baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}-${Date.now()}${ext}`
    const filePath = path.join(uploadDir, safeName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const relativePath = `/uploads/${dateDir}/${safeName}`
    const type = getAssetType(file.type || 'application/octet-stream')

    const id = createAsset({
      episode_id,
      name: file.name,
      type,
      mime_type: file.type || 'application/octet-stream',
      path: relativePath,
      size: file.size,
      source,
      status: 'ready',
    })

    // Sync to runs/<episode_id>/05-assets/asset_manifest.json
    if (episode_id && validateRunId(episode_id)) {
      try {
        const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT
          ? path.resolve(process.env.MEDIA_CODEX_ROOT)
          : path.resolve('/Users/wilsonlu/Desktop/Ai/media/media-codex')
        const manifestDir = path.join(MEDIA_CODEX_ROOT, 'runs', episode_id, '05-assets')
        const manifestPath = path.join(manifestDir, 'asset_manifest.json')
        await mkdir(manifestDir, { recursive: true })

        let manifest: { assets: Array<{ id: number; name: string; type: string; path: string; source: string; uploaded_at: string }> } = { assets: [] }
        try {
          const raw = await readFile(manifestPath, 'utf-8')
          manifest = JSON.parse(raw)
          if (!Array.isArray(manifest.assets)) manifest.assets = []
        } catch {
          // file doesn't exist yet
        }

        manifest.assets.push({
          id,
          name: file.name,
          type,
          path: relativePath,
          source,
          uploaded_at: new Date().toISOString(),
        })

        await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
      } catch (manifestErr) {
        console.warn('Failed to write asset_manifest.json:', manifestErr)
      }
    }

    return NextResponse.json({ id, path: relativePath })
  } catch (err) {
    console.error('POST /api/assets error:', err)
    return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 })
  }
}
