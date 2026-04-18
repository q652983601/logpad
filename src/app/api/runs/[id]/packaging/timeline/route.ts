import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { validateRunId } from '@/lib/validation'

const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT || '/Users/wilsonlu/Desktop/Ai/media/media-codex'
const RUNS_DIR = path.resolve(MEDIA_CODEX_ROOT, 'runs')

function errorResponse(error: string, details?: string, status = 500) {
  return NextResponse.json({ error, details }, { status })
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    const timelinePath = path.join(RUNS_DIR, id, '06-packaging', 'timeline.json')
    if (!fs.existsSync(timelinePath)) {
      return NextResponse.json({ items: [] })
    }
    try {
      const data = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'))
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ items: [] })
    }
  } catch (err) {
    return errorResponse('Failed to read timeline', err instanceof Error ? err.message : undefined, 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON body', undefined, 400)
    }

    const pkgDir = path.join(RUNS_DIR, id, '06-packaging')
    if (!fs.existsSync(pkgDir)) {
      fs.mkdirSync(pkgDir, { recursive: true })
    }
    fs.writeFileSync(path.join(pkgDir, 'timeline.json'), JSON.stringify(body, null, 2))
    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse('Failed to write timeline', err instanceof Error ? err.message : undefined, 500)
  }
}
