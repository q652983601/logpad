import { NextResponse } from 'next/server'
import { getPublishingPlan, updatePublishingPlan, deletePublishingPlan } from '@/lib/db'
import { getRun, writeRunJson } from '@/lib/pipeline'
import { isReadyToPublish } from '@/lib/pipeline-status'
import { validateRunId } from '@/lib/validation'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const plan = getPublishingPlan(id)
  if (!plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(plan)
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const body = await request.json()

  // Gate: publishing only requires the pre-publish stages. Metrics/review happen
  // after the public post exists.
  if (body.status === 'published') {
    const plan = getPublishingPlan(id)
    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const run = plan.episode_id ? getRun(plan.episode_id) : null
    if (!run) {
      return NextResponse.json({ error: 'Episode run not found' }, { status: 400 })
    }
    if (!isReadyToPublish(run.stages)) {
      return NextResponse.json({ error: 'Cannot publish: pre-publish gates are not complete' }, { status: 403 })
    }
  }

  updatePublishingPlan(id, body)
  const updated = getPublishingPlan(id)
  if (updated?.episode_id && validateRunId(updated.episode_id)) {
    writeRunJson(updated.episode_id, '08-distribution', 'publish_plan.json', {
      id: updated.id,
      episode_id: updated.episode_id,
      platform: updated.platform,
      title: updated.title,
      description: updated.description,
      tags: updated.tags,
      scheduled_at: updated.scheduled_at,
      status: updated.status,
      updated_at: new Date().toISOString(),
    })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  deletePublishingPlan(id)
  return NextResponse.json({ success: true })
}
