import { NextResponse } from 'next/server'
import { listAssets, createAsset } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    return NextResponse.json({ id, path: relativePath })
  } catch (err) {
    console.error('POST /api/assets error:', err)
    return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 })
  }
}
