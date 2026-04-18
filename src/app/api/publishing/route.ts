import { NextResponse } from 'next/server'
import { listPublishingPlans, createPublishingPlan } from '@/lib/db'
import { writeRunJson } from '@/lib/pipeline'
import { validateRunId } from '@/lib/validation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || undefined
  const status = searchParams.get('status') || undefined
  const date = searchParams.get('date') || undefined
  const episode_id = searchParams.get('episode_id') || undefined

  const plans = listPublishingPlans({ platform, status, date, episode_id })
  return NextResponse.json(plans)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { episode_id, platform, title, description, tags, scheduled_at, status } = body

  const id = createPublishingPlan({
    episode_id,
    platform,
    title,
    description,
    tags,
    scheduled_at,
    status: status || 'draft',
  })

  // Writeback to runs/<episode_id>/08-distribution/publish_plan.json
  if (episode_id && validateRunId(episode_id)) {
    try {
      writeRunJson(episode_id, '08-distribution', 'publish_plan.json', {
        id,
        episode_id,
        platform,
        title,
        description,
        tags,
        scheduled_at,
        status: status || 'draft',
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Failed to write publish_plan.json:', err)
    }
  }

  return NextResponse.json({ success: true, id })
}
