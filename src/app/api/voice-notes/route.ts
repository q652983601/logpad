import { NextResponse } from 'next/server'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { createVoiceNote, listVoiceNotes } from '@/lib/db'
import { summarizeTranscript } from '@/lib/voice'
import { appendVoiceNoteToWorkspace } from '@/lib/workspace-writeback'

const ALLOWED_AUDIO = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
])

function safeFilename(name: string): string {
  const ext = path.extname(name).toLowerCase()
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  return `${base || 'voice'}-${Date.now()}${ext || '.m4a'}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || undefined
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500)
  const notes = listVoiceNotes({ search, limit })
  return NextResponse.json(notes)
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const rawTitle = String(formData.get('title') || '').trim()
    const transcript = String(formData.get('transcript') || '').trim()
    const tags = String(formData.get('tags') || '').trim()

    let audioPath = ''
    let audioName = ''
    let mimeType = ''
    let size = 0

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_AUDIO.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported audio type' }, { status: 400 })
      }
      const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voice', day)
      await mkdir(uploadDir, { recursive: true })
      const filename = safeFilename(file.name)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(uploadDir, filename), buffer)
      audioPath = `/uploads/voice/${day}/${filename}`
      audioName = file.name
      mimeType = file.type
      size = file.size
    }

    if (!audioPath && !transcript) {
      return NextResponse.json({ error: 'Audio file or transcript is required' }, { status: 400 })
    }

    const analysis = summarizeTranscript(transcript)
    const title = rawTitle || analysis.summary.slice(0, 42) || audioName || '未命名口述笔记'
    const id = createVoiceNote({
      title,
      audio_path: audioPath || null,
      audio_name: audioName || null,
      mime_type: mimeType || null,
      size,
      transcript,
      summary: analysis.summary,
      key_points: JSON.stringify(analysis.keyPoints),
      tags,
      status: transcript ? 'transcribed' : 'uploaded',
    })

    await appendVoiceNoteToWorkspace({
      id,
      title,
      summary: analysis.summary,
      transcript,
      tags,
      audioPath,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/voice-notes error:', err)
    return NextResponse.json({ error: 'Failed to create voice note' }, { status: 500 })
  }
}
