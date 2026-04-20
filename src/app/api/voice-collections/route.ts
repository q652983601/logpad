import { NextResponse } from 'next/server'
import { createVoiceCollection, getVoiceNote, listVoiceCollections } from '@/lib/db'
import { formatZodError, voiceCollectionCreateSchema } from '@/lib/api-schemas'
import { buildVoiceCollectionDraft } from '@/lib/voice'
import { appendVoiceCollectionToWorkspace } from '@/lib/workspace-writeback'

export async function GET() {
  return NextResponse.json(listVoiceCollections())
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = voiceCollectionCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const notes = parsed.data.note_ids
      .map(id => getVoiceNote(id))
      .filter(Boolean)
      .map(note => ({
        title: note!.title,
        transcript: note!.transcript || '',
        summary: note!.summary || '',
      }))

    if (notes.length === 0) {
      return NextResponse.json({ error: 'No valid notes selected' }, { status: 400 })
    }

    const draft = buildVoiceCollectionDraft(notes)
    const id = createVoiceCollection({
      title: parsed.data.title,
      note_ids: JSON.stringify(parsed.data.note_ids),
      theme: draft.theme,
      audience_pain: draft.audience_pain,
      theory_support: draft.theory_support,
      content_angle: draft.content_angle,
      draft_outline: draft.draft_outline,
      agent_brief: '',
      status: 'draft',
    })

    await appendVoiceCollectionToWorkspace({
      id,
      title: parsed.data.title,
      noteIds: parsed.data.note_ids,
      theme: draft.theme,
      audiencePain: draft.audience_pain,
      theorySupport: draft.theory_support,
      contentAngle: draft.content_angle,
      draftOutline: draft.draft_outline,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/voice-collections error:', err)
    return NextResponse.json({ error: 'Failed to create voice collection' }, { status: 500 })
  }
}
