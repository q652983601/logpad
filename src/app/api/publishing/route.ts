import { NextResponse } from 'next/server'
import { listPublishingPlans, createPublishingPlan } from '@/lib/db'

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

  return NextResponse.json({ success: true, id })
}
