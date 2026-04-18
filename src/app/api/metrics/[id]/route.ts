import { NextResponse } from 'next/server'
import { getMetrics, updateMetrics } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const metric = getMetrics(Number(params.id))
  if (!metric) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(metric)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  updateMetrics(Number(params.id), body)
  return NextResponse.json({ success: true })
}
