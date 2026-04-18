import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT
  ? path.resolve(process.env.MEDIA_CODEX_ROOT)
  : path.resolve('/Users/wilsonlu/Desktop/Ai/media/media-codex')
const PIPELINE_SCRIPT = path.join(MEDIA_CODEX_ROOT, 'scripts', 'media_pipeline.py')

interface CLIRequest {
  command: 'init' | 'validate' | 'status' | 'advance' | 'make-pack'
  args?: string[]
  runId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CLIRequest

    if (!body.command) {
      return NextResponse.json({ error: 'Missing command' }, { status: 400 })
    }

    const validCommands = ['init', 'validate', 'status', 'advance', 'make-pack']
    if (!validCommands.includes(body.command)) {
      return NextResponse.json({ error: `Invalid command: ${body.command}` }, { status: 400 })
    }

    const args: string[] = [body.command]
    if (body.runId) args.push(body.runId)
    if (body.args) args.push(...body.args)

    const { stdout, stderr } = await execFileAsync('python3', [PIPELINE_SCRIPT, ...args], {
      cwd: MEDIA_CODEX_ROOT,
      timeout: 30000,
    })

    return NextResponse.json({
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    })
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message: string }
    console.error('CLI error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    }, { status: 500 })
  }
}
