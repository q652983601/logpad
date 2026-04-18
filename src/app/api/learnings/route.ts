import { NextResponse } from 'next/server'
import { listLearnings, createLearning } from '@/lib/db'
import { appendToTruthLog } from '@/lib/pipeline'

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

  // Writeback to truth/reviews/review-log.md
  try {
    appendToTruthLog('reviews/review-log.md', `**Episode**: ${episode_id}\n**Tag**: ${tag}\n${content}`)
  } catch (err) {
    console.warn('Failed to append to review-log.md:', err)
  }

  return NextResponse.json({ success: true })
}
