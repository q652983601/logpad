import { NextResponse } from 'next/server'
import { listMetrics, createMetrics } from '@/lib/db'
import { writeRunJson } from '@/lib/pipeline'
import { validateRunId } from '@/lib/validation'
import { formatZodError, metricPayloadSchema } from '@/lib/api-schemas'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const episode_id = searchParams.get('episode_id') || undefined
  const platform = searchParams.get('platform') || undefined
  if (episode_id && !validateRunId(episode_id)) {
    return NextResponse.json({ error: 'Invalid episode_id' }, { status: 400 })
  }

  const metrics = listMetrics({ episode_id, platform })
  return NextResponse.json(metrics)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = metricPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }
  const metric = parsed.data

  createMetrics(metric)

  // Writeback to runs/<episode_id>/09-metrics/metrics.json
  if (validateRunId(metric.episode_id)) {
    try {
      writeRunJson(metric.episode_id, '09-metrics', 'metrics.json', {
        episode_id: metric.episode_id,
        updated_at: new Date().toISOString(),
        status: 'draft',
        capture_windows: ['manual'],
        platform_metrics: [{
          platform: metric.platform,
          window: 'manual',
          captured_at: new Date().toISOString(),
          views: metric.views,
          completion_rate: metric.completion_rate,
          likes: metric.likes,
          comments: metric.comments,
          shares: metric.shares,
          saves: metric.saves,
          new_followers: metric.new_followers,
          avg_watch_time: metric.avg_watch_time,
          ctr: metric.ctr,
          data_source: 'logpad_manual',
        }],
        packaging_diagnosis: 'pending',
        retention_diagnosis: 'pending',
        raw_exports: [],
      })
    } catch (err) {
      console.warn('Failed to write metrics.json:', err)
    }
  }

  return NextResponse.json({ success: true })
}
