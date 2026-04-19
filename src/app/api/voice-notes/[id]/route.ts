import { NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { deleteVoiceNote, getVoiceNote, updateVoiceNote } from '@/lib/db'
import { formatZodError, voiceNotePatchSchema } from '@/lib/api-schemas'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const note = getVoiceNote(id)
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(note)
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const body = await request.json()
    const parsed = voiceNotePatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }
    updateVoiceNote(id, {
      ...parsed.data,
      key_points: parsed.data.key_points ? JSON.stringify(parsed.data.key_points) : undefined,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/voice-notes/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update voice note' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const note = getVoiceNote(id)
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (note.audio_path) {
    try {
      const publicDir = path.resolve(process.cwd(), 'public')
      const audioPath = path.resolve(publicDir, note.audio_path.replace(/^\/+/, ''))
      const relativePath = path.relative(publicDir, audioPath)
      if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        await unlink(audioPath)
      }
    } catch (err) {
      console.warn('Failed to delete voice upload:', err)
    }
  }

  deleteVoiceNote(id)
  return NextResponse.json({ success: true })
}
