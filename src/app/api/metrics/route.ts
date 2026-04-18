import { NextResponse } from 'next/server'
import { listMetrics, createMetrics } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const episode_id = searchParams.get('episode_id') || undefined
  const platform = searchParams.get('platform') || undefined

  const metrics = listMetrics({ episode_id, platform })
  return NextResponse.json(metrics)
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    episode_id,
    platform,
    views,
    completion_rate,
    likes,
    comments,
    shares,
    saves,
    new_followers,
    avg_watch_time,
    ctr,
  } = body

  if (!episode_id || !platform) {
    return NextResponse.json({ error: 'episode_id and platform are required' }, { status: 400 })
  }

  createMetrics({
    episode_id,
    platform,
    views: views ?? 0,
    completion_rate: completion_rate ?? 0,
    likes: likes ?? 0,
    comments: comments ?? 0,
    shares: shares ?? 0,
    saves: saves ?? 0,
    new_followers: new_followers ?? 0,
    avg_watch_time: avg_watch_time ?? 0,
    ctr: ctr ?? 0,
  })

  return NextResponse.json({ success: true })
}
