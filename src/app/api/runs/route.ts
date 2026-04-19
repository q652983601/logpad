import { NextResponse } from 'next/server'
import { listRuns, initRun } from '@/lib/pipeline'
import { listEpisodes, createEpisode } from '@/lib/db'
import { formatZodError, runCreateSchema } from '@/lib/api-schemas'
import { parsePagination } from '@/lib/pagination'

function errorResponse(error: string, details?: string, status = 500) {
  return NextResponse.json({ error, details }, { status })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams, { limit: 100, maxLimit: 300 })
    const runs = listRuns()
    const episodes = listEpisodes()

    // Merge runs with DB episodes
    const merged = runs.map(run => {
      const ep = episodes.find(e => e.id === run.id)
      return {
        ...run,
        dbStatus: ep?.status || 'inbox',
        description: ep?.description || run.description,
        targetPlatforms: ep?.target_platforms
          ? ep.target_platforms.split(',').map(item => item.trim()).filter(Boolean)
          : run.platforms || [],
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
        description: ep.description,
        targetPlatforms: ep.target_platforms
          ? ep.target_platforms.split(',').map(item => item.trim()).filter(Boolean)
          : [],
        stages: {},
        dbStatus: ep.status,
        score_curiosity: ep.score_curiosity,
        score_audience: ep.score_audience,
        score_platform: ep.score_platform,
        score_feasibility: ep.score_feasibility,
      }))

    const allRuns = [...merged, ...dbOnly]
    const page = allRuns.slice(pagination.offset, pagination.offset + pagination.limit)
    return NextResponse.json(page, {
      headers: {
        'X-Total-Count': String(allRuns.length),
        'X-Limit': String(pagination.limit),
        'X-Offset': String(pagination.offset),
      },
    })
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

    const parsed = runCreateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid request body', formatZodError(parsed.error), 400)
    }

    const { id, title, description, platforms } = parsed.data

    // Create the filesystem truth first so SQLite never points at a missing run.
    initRun(id, title, { description, platforms })

    createEpisode({
      id,
      title,
      status: 'inbox',
      platforms: platforms ? platforms.join(',') : undefined,
      description,
      target_platforms: platforms ? platforms.join(',') : undefined,
      run_path: `${process.env.MEDIA_CODEX_ROOT || '/Users/wilsonlu/Desktop/Ai/media/media-codex'}/runs/${id}`,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return errorResponse('Failed to create episode', err instanceof Error ? err.message : undefined, 500)
  }
}
