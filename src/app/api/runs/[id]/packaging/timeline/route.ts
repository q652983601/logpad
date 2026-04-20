import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { validateRunId } from '@/lib/validation'
import { formatZodError, timelineSchema } from '@/lib/api-schemas'
import { getRunPath } from '@/lib/pipeline'

type RouteContext = { params: Promise<{ id: string }> }

function errorResponse(error: string, details?: string, status = 500) {
  return NextResponse.json({ error, details }, { status })
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    const timelinePath = path.join(getRunPath(id), '06-packaging', 'timeline.json')
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
  { params }: RouteContext
) {
  try {
    const { id } = await params
    if (!id || !validateRunId(id)) {
      return errorResponse('Invalid id parameter', undefined, 400)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON body', undefined, 400)
    }

    const parsed = timelineSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid timeline body', formatZodError(parsed.error), 400)
    }

    const pkgDir = path.join(getRunPath(id), '06-packaging')
    if (!fs.existsSync(pkgDir)) {
      fs.mkdirSync(pkgDir, { recursive: true })
    }
    fs.writeFileSync(path.join(pkgDir, 'timeline.json'), JSON.stringify(parsed.data, null, 2))
    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse('Failed to write timeline', err instanceof Error ? err.message : undefined, 500)
  }
}
