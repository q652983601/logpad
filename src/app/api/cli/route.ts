import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { cliRequestSchema, formatZodError, type CLIRequest } from '@/lib/api-schemas'
import { toCliStage } from '@/lib/pipeline-status'
import { resolvePipelineRoot, resolveRunsDir } from '@/lib/workspace-paths'

const execFileAsync = promisify(execFile)

const PIPELINE_ROOT = resolvePipelineRoot()
const PIPELINE_SCRIPT = path.join(PIPELINE_ROOT, 'scripts', 'media_pipeline.py')

function resolveRunArg(runId: string): string {
  if (runId.includes('/') || path.isAbsolute(runId)) return runId
  return path.join(resolveRunsDir(), runId)
}

function buildPipelineArgs(body: CLIRequest): string[] {
  const args: string[] = [body.command]

  switch (body.command) {
    case 'init':
      args.push('--title', body.title || '')
      if (body.episodeId) args.push('--episode-id', body.episodeId)
      if (body.platforms?.length) args.push('--platforms', body.platforms.join(','))
      if (body.owner) args.push('--owner', body.owner)
      if (body.force) args.push('--force')
      break
    case 'validate':
      args.push('--run', body.runId ? resolveRunArg(body.runId) : '')
      if (body.upto) args.push('--upto', toCliStage(body.upto))
      break
    case 'status':
    case 'make-pack':
      args.push('--run', body.runId ? resolveRunArg(body.runId) : '')
      break
    case 'advance':
      args.push('--run', body.runId ? resolveRunArg(body.runId) : '', '--to', toCliStage(body.to || 'signal'))
      if (body.note) args.push('--note', body.note)
      if (body.force) args.push('--force')
      break
    case 'make-remotion-props':
      args.push('--run', body.runId ? resolveRunArg(body.runId) : '')
      if (body.noPackageUpdate) args.push('--no-package-update')
      break
    case 'remotion-qc':
      args.push('--run', body.runId ? resolveRunArg(body.runId) : '')
      if (body.composition) args.push('--composition', body.composition)
      if (body.frame !== undefined) args.push('--frame', String(body.frame))
      if (body.scale) args.push('--scale', body.scale)
      break
  }

  return args
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    const parsed = cliRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const body = parsed.data
    const args = buildPipelineArgs(body)
    const timeout = body.command === 'remotion-qc' ? 120000 : 30000

    const { stdout, stderr } = await execFileAsync('python3', [PIPELINE_SCRIPT, ...args], {
      cwd: PIPELINE_ROOT,
      timeout,
      maxBuffer: 1024 * 1024,
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
