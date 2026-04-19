import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { assetFolderImportSchema, formatZodError } from '@/lib/api-schemas'
import { createAsset, getAssetByPath } from '@/lib/db'

export const runtime = 'nodejs'

const EXT_MAP: Record<string, { type: string; mime: string }> = {
  '.jpg': { type: 'image', mime: 'image/jpeg' },
  '.jpeg': { type: 'image', mime: 'image/jpeg' },
  '.png': { type: 'image', mime: 'image/png' },
  '.webp': { type: 'image', mime: 'image/webp' },
  '.gif': { type: 'image', mime: 'image/gif' },
  '.mp4': { type: 'video', mime: 'video/mp4' },
  '.mov': { type: 'video', mime: 'video/quicktime' },
  '.m4v': { type: 'video', mime: 'video/mp4' },
  '.webm': { type: 'video', mime: 'video/webm' },
  '.mp3': { type: 'audio', mime: 'audio/mpeg' },
  '.m4a': { type: 'audio', mime: 'audio/mp4' },
  '.wav': { type: 'audio', mime: 'audio/wav' },
  '.aac': { type: 'audio', mime: 'audio/aac' },
  '.ogg': { type: 'audio', mime: 'audio/ogg' },
}

function scanFiles(root: string, recursive: boolean, limit: number): string[] {
  const out: string[] = []
  const stack = [root]
  while (stack.length && out.length < limit) {
    const dir = stack.pop()!
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (recursive) stack.push(full)
        continue
      }
      if (!entry.isFile()) continue
      if (EXT_MAP[path.extname(entry.name).toLowerCase()]) out.push(full)
      if (out.length >= limit) break
    }
  }
  return out
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = assetFolderImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const folder = path.resolve(parsed.data.folderPath)
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const files = scanFiles(folder, parsed.data.recursive, parsed.data.limit)
    let imported = 0
    let skipped = 0

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase()
      const info = EXT_MAP[ext]
      if (!info) continue
      const localPath = `local:${filePath}`
      if (getAssetByPath(localPath)) {
        skipped += 1
        continue
      }
      const stat = fs.statSync(filePath)
      createAsset({
        episode_id: parsed.data.episode_id || null,
        name: path.basename(filePath),
        type: info.type,
        mime_type: info.mime,
        path: localPath,
        size: stat.size,
        source: parsed.data.source,
        status: 'indexed',
      })
      imported += 1
    }

    return NextResponse.json({ imported, skipped, scanned: files.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to import folder'
    console.error('POST /api/assets/import-folder error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
