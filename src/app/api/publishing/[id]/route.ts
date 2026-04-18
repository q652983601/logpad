import { NextResponse } from 'next/server'
import { getPublishingPlan, updatePublishingPlan, deletePublishingPlan } from '@/lib/db'
import { getRun } from '@/lib/pipeline'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
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
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const body = await request.json()

  // Gate: publishing requires all pipeline stages complete
  if (body.status === 'published') {
    const plan = getPublishingPlan(id)
    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const run = plan.episode_id ? getRun(plan.episode_id) : null
    if (!run) {
      return NextResponse.json({ error: 'Episode run not found' }, { status: 400 })
    }
    const allDone = Object.values(run.stages || {}).every(s => s.exists)
    if (!allDone) {
      return NextResponse.json({ error: 'Cannot publish: pipeline not complete' }, { status: 403 })
    }
  }

  updatePublishingPlan(id, body)
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  deletePublishingPlan(id)
  return NextResponse.json({ success: true })
}
