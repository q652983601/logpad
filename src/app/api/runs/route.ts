import { NextResponse } from 'next/server'
import { listRuns } from '@/lib/pipeline'
import { listEpisodes, createEpisode } from '@/lib/db'

function errorResponse(error: string, details?: string, status = 500) {
  return NextResponse.json({ error, details }, { status })
}

export async function GET() {
  try {
    const runs = listRuns()
    const episodes = listEpisodes()

    // Merge runs with DB episodes
    const merged = runs.map(run => {
      const ep = episodes.find(e => e.id === run.id)
      return {
        ...run,
        dbStatus: ep?.status || 'inbox',
        score_curiosity: ep?.score_curiosity,
        score_audience: ep?.score_audience,
        score_platform: ep?.score_platform,
        score_feasibility: ep?.score_feasibility,
      }
    })

    // Also include DB episodes that don't have runs yet
    const dbOnly = episodes
      .filter(ep => !runs.find(r => r.id === ep.id))
      .map(ep => ({
        id: ep.id,
        title: ep.title,
        status: ep.status,
        createdAt: ep.created_at,
        stages: {},
        dbStatus: ep.status,
        score_curiosity: ep.score_curiosity,
        score_audience: ep.score_audience,
        score_platform: ep.score_platform,
        score_feasibility: ep.score_feasibility,
      }))

    return NextResponse.json([...merged, ...dbOnly])
  } catch (err) {
    return errorResponse('Failed to list runs', err instanceof Error ? err.message : undefined, 500)
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid JSON body', undefined, 400)
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Body must be an object', undefined, 400)
    }

    const { id, title, platforms } = body as Record<string, unknown>

    if (!id || typeof id !== 'string') {
      return errorResponse('Missing or invalid field: id', undefined, 400)
    }
    if (!title || typeof title !== 'string') {
      return errorResponse('Missing or invalid field: title', undefined, 400)
    }

    createEpisode({
      id,
      title,
      status: 'inbox',
      platforms: Array.isArray(platforms) ? platforms.join(',') : undefined,
      run_path: `${process.env.MEDIA_CODEX_ROOT || '/Users/wilsonlu/Desktop/Ai/media/media-codex'}/runs/${id}`,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return errorResponse('Failed to create episode', err instanceof Error ? err.message : undefined, 500)
  }
}
