import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

function mediaCodexRoot(): string {
  return process.env.MEDIA_CODEX_ROOT
    ? path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_CODEX_ROOT)
    : '/Users/wilsonlu/Desktop/Ai/media/media-codex'
}

export function resolvePublicUploadPath(publicPath: string): string {
  const publicDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'public')
  const relative = publicPath.replace(/^\/+/, '')
  const resolved = path.resolve(publicDir, relative)
  const diff = path.relative(publicDir, resolved)
  if (diff.startsWith('..') || path.isAbsolute(diff)) {
    throw new Error('Unsafe audio path')
  }
  return resolved
}

export async function transcribeAudioFile(audioPath: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set for transcription')
  }

  const cli = process.env.LOGPAD_TRANSCRIBE_CLI
    || `${process.env.HOME || ''}/.codex/skills/transcribe/scripts/transcribe_diarize.py`
  if (!fs.existsSync(/*turbopackIgnore: true*/ cli)) {
    throw new Error(`Transcribe CLI not found: ${cli}`)
  }

  const root = mediaCodexRoot()
  const outDir = path.join(/*turbopackIgnore: true*/ root, 'output', 'transcribe', 'logpad-voice')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${Date.now()}-${path.basename(audioPath)}.txt`)

  await execFileAsync('python3', [
    cli,
    audioPath,
    '--response-format',
    'text',
    '--out',
    outPath,
  ], {
    cwd: root,
    timeout: Number(process.env.LOGPAD_TRANSCRIBE_TIMEOUT_MS || 180000),
    env: process.env,
  })

  return fs.readFileSync(outPath, 'utf-8').trim()
}
