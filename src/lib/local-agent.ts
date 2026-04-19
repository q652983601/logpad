import { spawn } from 'child_process'
import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import type { AgentProvider } from './api-schemas'

const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT
  ? path.resolve(process.env.MEDIA_CODEX_ROOT)
  : path.resolve('/Users/wilsonlu/Desktop/Ai/media/media-codex')

interface RunLocalAgentOptions {
  provider?: AgentProvider
  prompt: string
  action: string
  timeoutMs?: number
}

interface RunLocalAgentResult {
  provider: AgentProvider
  result: string
}

function runWithInput(command: string, args: string[], input: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: MEDIA_CODEX_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    let finished = false

    const timer = setTimeout(() => {
      if (finished) return
      finished = true
      child.kill('SIGTERM')
      reject(new Error(`${command} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', err => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', code => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (code === 0) {
        resolve(stdout.trim())
        return
      }
      reject(new Error(`${command} exited with ${code}: ${stderr.trim() || stdout.trim()}`))
    })

    child.stdin.end(input)
  })
}

export async function handoffToOpenClaw(prompt: string, action: string): Promise<string> {
  const inboxDir = path.join(MEDIA_CODEX_ROOT, 'handoff', 'logpad-agent-requests')
  await mkdir(inboxDir, { recursive: true })
  const file = path.join(inboxDir, `${new Date().toISOString().slice(0, 10)}.md`)
  const entry = [
    `## ${new Date().toISOString()} - ${action}`,
    '',
    'Source: LogPad local agent dispatcher',
    '',
    '```text',
    prompt.trim(),
    '```',
    '',
  ].join('\n')
  await appendFile(file, entry, 'utf8')
  return `已写入 OpenClaw handoff：${path.relative(MEDIA_CODEX_ROOT, file)}`
}

export async function runLocalAgent(options: RunLocalAgentOptions): Promise<RunLocalAgentResult> {
  const provider = options.provider || (process.env.LOGPAD_AGENT_PROVIDER as AgentProvider | undefined) || 'codex'
  const timeoutMs = options.timeoutMs ?? Number(process.env.LOGPAD_AGENT_TIMEOUT_MS || 180000)

  if (provider === 'openclaw-handoff') {
    return {
      provider,
      result: await handoffToOpenClaw(options.prompt, options.action),
    }
  }

  if (provider === 'claude') {
    return {
      provider,
      result: await runWithInput('claude', ['-p'], options.prompt, timeoutMs),
    }
  }

  return {
    provider: 'codex',
    result: await runWithInput(
      'codex',
      ['exec', '--cd', MEDIA_CODEX_ROOT, '--skip-git-repo-check', '--ephemeral', '--sandbox', 'read-only', '-'],
      options.prompt,
      timeoutMs
    ),
  }
}
