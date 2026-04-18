import { NextResponse } from 'next/server'
import { readPackaging } from '@/lib/pipeline'
import { validateRunId } from '@/lib/validation'

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

    const packaging = readPackaging(id)
    if (!packaging) {
      return errorResponse('Packaging not found', undefined, 404)
    }
    return NextResponse.json(packaging)
  } catch (err) {
    return errorResponse('Failed to read packaging', err instanceof Error ? err.message : undefined, 500)
  }
}
