import { NextResponse } from 'next/server'
import { getVoiceNote, updateVoiceNote } from '@/lib/db'
import { formatZodError, voiceTranscribeSchema } from '@/lib/api-schemas'
import { summarizeTranscript } from '@/lib/voice'

type RouteContext = { params: Promise<{ id: string }> }

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const note = getVoiceNote(id)
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const parsed = voiceTranscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    let transcript = parsed.data.transcript?.trim() || ''
    if (!transcript && note.audio_path) {
      const { resolvePublicUploadPath, transcribeAudioFile } = await import('@/lib/server-transcribe')
      transcript = await transcribeAudioFile(resolvePublicUploadPath(note.audio_path))
    }
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript text or audio file is required' }, { status: 400 })
    }

    const analysis = summarizeTranscript(transcript)
    updateVoiceNote(id, {
      transcript,
      summary: analysis.summary,
      key_points: JSON.stringify(analysis.keyPoints),
      status: 'transcribed',
    })

    return NextResponse.json({
      success: true,
      transcript,
      summary: analysis.summary,
      key_points: analysis.keyPoints,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to transcribe voice note'
    console.error('POST /api/voice-notes/[id]/transcribe error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
