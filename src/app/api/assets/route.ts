import { NextResponse } from 'next/server'
import { listAssets, createAsset, getEpisode, listEpisodes, countAssets } from '@/lib/db'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { validateRunId } from '@/lib/validation'
import { listRuns, runExists } from '@/lib/pipeline'
import { parsePagination } from '@/lib/pagination'

const MAX_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.aac', '.pdf']
const ALLOWED_SOURCES = new Set(['实拍', 'AI生成', '录屏', '音乐', '其他'])

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString('ascii')
}

function sniffMime(buffer: Buffer, ext: string): string | null {
  if (buffer.length < 4) return null

  if (ext === '.jpg' || ext === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff ? 'image/jpeg' : null
  }
  if (ext === '.png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png' : null
  }
  if (ext === '.gif') {
    const signature = ascii(buffer, 0, 6)
    return signature === 'GIF87a' || signature === 'GIF89a' ? 'image/gif' : null
  }
  if (ext === '.webp') {
    return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP' ? 'image/webp' : null
  }
  if (ext === '.mp4' || ext === '.mov') {
    return ascii(buffer, 4, 8) === 'ftyp' ? (ext === '.mov' ? 'video/quicktime' : 'video/mp4') : null
  }
  if (ext === '.avi') {
    return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'AVI ' ? 'video/x-msvideo' : null
  }
  if (ext === '.mkv') {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3 ? 'video/x-matroska' : null
  }
  if (ext === '.mp3') {
    const hasId3 = ascii(buffer, 0, 3) === 'ID3'
    const hasFrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0
    return hasId3 || hasFrameSync ? 'audio/mpeg' : null
  }
  if (ext === '.wav') {
    return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WAVE' ? 'audio/wav' : null
  }
  if (ext === '.aac') {
    return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0 ? 'audio/aac' : null
  }
  if (ext === '.pdf') {
    return ascii(buffer, 0, 4) === '%PDF' ? 'application/pdf' : null
  }

  return null
}

function getAssetType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'other'
}

function inferEpisodeIdFromFilename(filename: string): string | null {
  const stem = path.basename(filename, path.extname(filename)).toLowerCase()
  const knownIds = new Set<string>()

  for (const episode of listEpisodes()) {
    knownIds.add(episode.id)
  }
  for (const run of listRuns()) {
    knownIds.add(run.id)
  }

  const match = [...knownIds]
    .filter(id => stem.includes(id.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]

  return match || null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || undefined
    const episode_id = searchParams.get('episode_id') || undefined
    const search = searchParams.get('search') || undefined
    const pagination = parsePagination(searchParams, { limit: 100, maxLimit: 300 })

    const filters = { source, episode_id, search }
    const assets = listAssets({ ...filters, ...pagination })
    const total = countAssets(filters)
    return NextResponse.json(assets, {
      headers: {
        'X-Total-Count': String(total),
        'X-Limit': String(pagination.limit),
        'X-Offset': String(pagination.offset),
      },
    })
  } catch (err) {
    console.error('GET /api/assets error:', err)
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const rawSource = (formData.get('source') as string) || '其他'
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : '其他'
    const requestedEpisodeId = (formData.get('episode_id') as string) || null

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

    let episode_id = requestedEpisodeId
    if (!episode_id) {
      episode_id = inferEpisodeIdFromFilename(file.name)
    }

    if (episode_id) {
      if (!validateRunId(episode_id)) {
        return NextResponse.json({ error: 'Invalid episode_id' }, { status: 400 })
      }
      const exists = getEpisode(episode_id) || runExists(episode_id)
      if (!exists) {
        return NextResponse.json({ error: 'episode_id not found' }, { status: 400 })
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sniffedMime = sniffMime(buffer, ext)
    if (!sniffedMime) {
      return NextResponse.json({ error: 'File content does not match the allowed file type' }, { status: 400 })
    }

    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', dateDir)
    await mkdir(uploadDir, { recursive: true })

    const baseName = path.basename(file.name, ext)
    const safeName = `${baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}-${Date.now()}${ext}`
    const filePath = path.join(uploadDir, safeName)

    await writeFile(filePath, buffer)

    const relativePath = `/uploads/${dateDir}/${safeName}`
    const type = getAssetType(sniffedMime)

    const id = createAsset({
      episode_id,
      name: file.name,
      type,
      mime_type: sniffedMime,
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
