import { NextResponse } from 'next/server'
import { formatZodError, recordingTakesSchema } from '@/lib/api-schemas'
import { readRunJson, runExists, writeRunJson } from '@/lib/pipeline'
import { validateRunId } from '@/lib/validation'

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
    if (!runExists(id)) {
      return errorResponse('Run not found', undefined, 404)
    }

    const takes = readRunJson(id, '07-production', 'takes.json')
    return NextResponse.json(takes || { beats: [] })
  } catch (err) {
    return errorResponse('Failed to read recording takes', err instanceof Error ? err.message : undefined, 500)
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
    if (!runExists(id)) {
      return errorResponse('Run not found', undefined, 404)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON body', undefined, 400)
    }

    const parsed = recordingTakesSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid recording takes body', formatZodError(parsed.error), 400)
    }

    writeRunJson(id, '07-production', 'takes.json', {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse('Failed to write recording takes', err instanceof Error ? err.message : undefined, 500)
  }
}
