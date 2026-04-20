import { NextResponse } from 'next/server'
import { getMetrics, updateMetrics } from '@/lib/db'
import { formatZodError, metricPatchSchema } from '@/lib/api-schemas'
import { writeRunJson } from '@/lib/pipeline'
import { validateRunId } from '@/lib/validation'

type RouteContext = { params: Promise<{ id: string }> }

function parseId(id: string): number | null {
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const metric = getMetrics(id)
  if (!metric) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(metric)
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const current = getMetrics(id)
  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = metricPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
  }
  updateMetrics(id, parsed.data)
  const updated = getMetrics(id)
  if (updated?.episode_id && validateRunId(updated.episode_id)) {
    writeRunJson(updated.episode_id, '09-metrics', 'metrics.json', {
      episode_id: updated.episode_id,
      updated_at: new Date().toISOString(),
      status: 'draft',
      capture_windows: ['manual'],
      platform_metrics: [{
        platform: updated.platform,
        window: 'manual',
        captured_at: updated.recorded_at || new Date().toISOString(),
        views: updated.views,
        completion_rate: updated.completion_rate,
        likes: updated.likes,
        comments: updated.comments,
        shares: updated.shares,
        saves: updated.saves,
        new_followers: updated.new_followers,
        avg_watch_time: updated.avg_watch_time,
        ctr: updated.ctr,
        data_source: 'logpad_manual',
      }],
      packaging_diagnosis: 'pending',
      retention_diagnosis: 'pending',
      raw_exports: [],
    })
  }
  return NextResponse.json({ success: true })
}
