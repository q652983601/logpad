import { NextResponse } from 'next/server'
import { getMetrics, updateMetrics } from '@/lib/db'
import { formatZodError, metricPatchSchema } from '@/lib/api-schemas'

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
  return NextResponse.json({ success: true })
}
