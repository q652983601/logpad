import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import { resolveWorkspaceRoot } from './workspace-paths'

async function appendWorkspaceFile(relativePath: string, content: string): Promise<void> {
  const filePath = path.join(resolveWorkspaceRoot(), relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(filePath, content, 'utf8')
}

export async function appendWorkspaceJsonLine(relativePath: string, value: unknown): Promise<void> {
  await appendWorkspaceFile(relativePath, `${JSON.stringify(value)}\n`)
}

export async function appendVoiceNoteToWorkspace(note: {
  id: number
  title: string
  summary: string
  transcript: string
  tags: string
  audioPath?: string
}): Promise<void> {
  const entry = [
    `## ${new Date().toISOString()} - ${note.title}`,
    '',
    `- source: web-pwa`,
    `- note_id: ${note.id}`,
    note.tags ? `- tags: ${note.tags}` : '- tags:',
    note.audioPath ? `- audio_path: ${note.audioPath}` : '- audio_path:',
    '',
    '### Summary',
    '',
    note.summary || 'pending',
    '',
    '### Transcript',
    '',
    note.transcript || 'pending',
    '',
  ].join('\n')

  await appendWorkspaceFile('04-inspiration-library/inbox/logpad-web-voice-captures.md', entry)
}

export async function appendVoiceCollectionToWorkspace(collection: {
  id: number
  title: string
  noteIds: number[]
  theme: string
  audiencePain: string
  theorySupport: string
  contentAngle: string
  draftOutline: string
}): Promise<void> {
  const entry = [
    `## ${new Date().toISOString()} - ${collection.title}`,
    '',
    `- source: web-pwa`,
    `- collection_id: ${collection.id}`,
    `- note_ids: ${collection.noteIds.join(', ')}`,
    '',
    '### Theme',
    '',
    collection.theme,
    '',
    '### Audience Pain',
    '',
    collection.audiencePain,
    '',
    '### Theory Support',
    '',
    collection.theorySupport,
    '',
    '### Content Angle',
    '',
    collection.contentAngle,
    '',
    '### Draft Outline',
    '',
    collection.draftOutline,
    '',
  ].join('\n')

  await appendWorkspaceFile('04-inspiration-library/groups/logpad-web-idea-groups.md', entry)
}
