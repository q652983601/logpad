import { NextResponse } from 'next/server'
import { getPublishingPlan, updatePublishingPlan, deletePublishingPlan } from '@/lib/db'

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
