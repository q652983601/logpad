import { NextResponse } from 'next/server'
import { readPackaging, runExists } from '@/lib/pipeline'
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

    const packaging = readPackaging(id)
    if (!packaging) {
      return NextResponse.json({})
    }
    return NextResponse.json(packaging)
  } catch (err) {
    return errorResponse('Failed to read packaging', err instanceof Error ? err.message : undefined, 500)
  }
}
