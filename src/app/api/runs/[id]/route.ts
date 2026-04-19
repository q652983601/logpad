import { NextResponse } from 'next/server'
import { getRun } from '@/lib/pipeline'
import { getEpisode, updateEpisodeStatus } from '@/lib/db'
import { validateRunId, validateStatus } from '@/lib/validation'

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

    const run = getRun(id)
    const episode = getEpisode(id)

    if (!run && !episode) {
      return errorResponse('Not found', undefined, 404)
    }

    return NextResponse.json({
      ...run,
      id,
      title: run?.title || episode?.title || id,
      status: run?.status || episode?.status || 'inbox',
      createdAt: run?.createdAt || episode?.created_at || '',
      stages: run?.stages || {},
      dbStatus: episode?.status || 'inbox',
      description: episode?.description || run?.description || '',
      targetPlatforms: episode?.target_platforms
        ? episode.target_platforms.split(',').map(item => item.trim()).filter(Boolean)
        : run?.platforms || [],
      scores: {
        curiosity: episode?.score_curiosity,
        audience: episode?.score_audience,
        platform: episode?.score_platform,
        feasibility: episode?.score_feasibility,
      }
    })
  } catch (err) {
    return errorResponse('Failed to get run', err instanceof Error ? err.message : undefined, 500)
  }
}

export async function PATCH(
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

    if (!body || typeof body !== 'object') {
      return errorResponse('Body must be an object', undefined, 400)
    }

    const { status } = body as Record<string, unknown>
    if (status && typeof status === 'string') {
      if (!validateStatus(status)) {
        return errorResponse('Invalid status', undefined, 400)
      }
      updateEpisodeStatus(id, status)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse('Failed to update run', err instanceof Error ? err.message : undefined, 500)
  }
}
