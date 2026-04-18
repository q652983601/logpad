import { NextResponse } from 'next/server'
import { listLearnings, createLearning } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const episode_id = searchParams.get('episode_id') || undefined
  const tag = searchParams.get('tag') || undefined

  const learnings = listLearnings({ episode_id, tag })
  return NextResponse.json(learnings)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { episode_id, tag, content } = body

  if (!episode_id || !tag || !content) {
    return NextResponse.json({ error: 'episode_id, tag and content are required' }, { status: 400 })
  }

  createLearning({ episode_id, tag, content })
  return NextResponse.json({ success: true })
}
