import fs from 'fs'
import path from 'path'
import { validateRunId } from './validation'

const MEDIA_CODEX_ROOT = process.env.MEDIA_CODEX_ROOT
  ? path.resolve(process.env.MEDIA_CODEX_ROOT)
  : path.resolve('/Users/wilsonlu/Desktop/Ai/media/media-codex')
const RUNS_DIR = path.join(MEDIA_CODEX_ROOT, 'runs')

function assertValidRunId(id: string): void {
  if (!validateRunId(id)) {
    throw new Error(`Invalid run id: ${id}`)
  }
}

export interface RunInfo {
  id: string
  title: string
  status: string
  createdAt: string
  description?: string
  platforms?: string[]
  stages: Record<string, { exists: boolean; data?: unknown }>
}

export function listRuns(): RunInfo[] {
  if (!fs.existsSync(RUNS_DIR)) return []

  const dirs = fs.readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))

  return dirs.map(dir => {
    const runPath = path.join(RUNS_DIR, dir.name)
    const episodePath = path.join(runPath, 'episode.json')
    let title = dir.name
    let status = 'unknown'
    let createdAt = ''
    let description = ''
    let platforms: string[] = []

    if (fs.existsSync(episodePath)) {
      try {
        const ep = JSON.parse(fs.readFileSync(episodePath, 'utf-8'))
        title = ep.title || dir.name
        status = ep.status || 'unknown'
        createdAt = ep.created_at || ''
        description = ep.description || ''
        platforms = Array.isArray(ep.platforms)
          ? ep.platforms
          : typeof ep.platforms === 'string'
            ? ep.platforms.split(',').map((item: string) => item.trim()).filter(Boolean)
            : []
      } catch {}
    }

    const stages: Record<string, { exists: boolean }> = {}
    const stageFiles = [
      ['signal', '01-signal/signal.json'],
      ['research', '02-research/research.json'],
      ['topic', '03-topic/topic_decision.json'],
      ['script', '04-script/script.json'],
      ['assets', '05-assets/asset_manifest.json'],
      ['packaging', '06-packaging/package.json'],
      ['production', '07-production/production_check.json'],
      ['distribution', '08-distribution/publish_plan.json'],
      ['metrics', '09-metrics/metrics.json'],
      ['review', '10-review/review.json'],
    ]

    for (const [name, filePath] of stageFiles) {
      stages[name] = { exists: fs.existsSync(path.join(runPath, filePath)) }
    }

    return { id: dir.name, title, status, createdAt, description, platforms, stages }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getRun(id: string): RunInfo | null {
  assertValidRunId(id)
  const runs = listRuns()
  return runs.find(r => r.id === id) || null
}

export function readScript(id: string): unknown | null {
  assertValidRunId(id)
  const scriptPath = path.join(RUNS_DIR, id, '04-script', 'script.json')
  if (!fs.existsSync(scriptPath)) return null
  try {
    return JSON.parse(fs.readFileSync(scriptPath, 'utf-8'))
  } catch {
    return null
  }
}

export function writeScript(id: string, data: unknown): void {
  assertValidRunId(id)
  const scriptDir = path.join(RUNS_DIR, id, '04-script')
  if (!fs.existsSync(scriptDir)) {
    fs.mkdirSync(scriptDir, { recursive: true })
  }
  fs.writeFileSync(path.join(scriptDir, 'script.json'), JSON.stringify(data, null, 2))
}

export function readPackaging(id: string): unknown | null {
  assertValidRunId(id)
  const pkgPath = path.join(RUNS_DIR, id, '06-packaging', 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  } catch {
    return null
  }
}

export function getScriptPath(id: string): string {
  assertValidRunId(id)
  return path.join(RUNS_DIR, id, '04-script', 'script.json')
}

export function getRunPath(id: string): string {
  assertValidRunId(id)
  return path.join(RUNS_DIR, id)
}

export function runExists(id: string): boolean {
  assertValidRunId(id)
  return fs.existsSync(path.join(RUNS_DIR, id))
}

export function initRun(
  id: string,
  title: string,
  options: { description?: string; platforms?: string[] } = {}
): void {
  assertValidRunId(id)
  const runPath = path.join(RUNS_DIR, id)
  if (!fs.existsSync(runPath)) {
    fs.mkdirSync(runPath, { recursive: true })
  }

  const episodePath = path.join(runPath, 'episode.json')
  if (!fs.existsSync(episodePath)) {
    const episode = {
      id,
      title,
      status: 'inbox',
      description: options.description || '',
      platforms: options.platforms || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    fs.writeFileSync(episodePath, JSON.stringify(episode, null, 2))
  }

  // Ensure all stage directories exist
  const stageDirs = [
    '01-signal',
    '02-research',
    '03-topic',
    '04-script',
    '05-assets',
    '06-packaging',
    '07-production',
    '08-distribution',
    '09-metrics',
    '10-review',
  ]
  for (const dir of stageDirs) {
    const stagePath = path.join(runPath, dir)
    if (!fs.existsSync(stagePath)) {
      fs.mkdirSync(stagePath, { recursive: true })
    }
  }
}

export interface ScriptBackup {
  filename: string
  timestamp: string
  path: string
}

export function backupScript(id: string): void {
  assertValidRunId(id)
  const scriptPath = path.join(RUNS_DIR, id, '04-script', 'script.json')
  if (!fs.existsSync(scriptPath)) return

  const backupsDir = path.join(RUNS_DIR, id, '04-script', 'backups')
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupsDir, `script-${timestamp}.json`)
  fs.copyFileSync(scriptPath, backupPath)

  // Keep only the last 10 backups
  const backups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('script-') && f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(backupsDir, f))
      return { filename: f, mtime: stat.mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)

  if (backups.length > 10) {
    for (const old of backups.slice(10)) {
      fs.unlinkSync(path.join(backupsDir, old.filename))
    }
  }
}

export function listScriptBackups(id: string): ScriptBackup[] {
  assertValidRunId(id)
  const backupsDir = path.join(RUNS_DIR, id, '04-script', 'backups')
  if (!fs.existsSync(backupsDir)) return []

  return fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('script-') && f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(backupsDir, f))
      return {
        filename: f,
        timestamp: new Date(stat.mtimeMs).toISOString(),
        path: path.join(backupsDir, f),
      }
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function readScriptBackup(id: string, filename: string): unknown | null {
  assertValidRunId(id)
  const backupsDir = path.join(RUNS_DIR, id, '04-script', 'backups')
  const backupPath = path.join(backupsDir, filename)

  // Security: ensure the resolved path is within the backups directory
  const resolved = path.resolve(backupPath)
  const resolvedBackupsDir = path.resolve(backupsDir)
  if (!resolved.startsWith(resolvedBackupsDir)) {
    throw new Error('Invalid backup filename')
  }

  if (!fs.existsSync(backupPath)) return null
  try {
    return JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  } catch {
    return null
  }
}

// ─── Writeback helpers for DB → runs/ sync ─────────────────────────────────

export function writeRunJson(id: string, subdir: string, filename: string, data: unknown): void {
  assertValidRunId(id)
  const dir = path.join(RUNS_DIR, id, subdir)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2))
}

export function readRunJson(id: string, subdir: string, filename: string): unknown | null {
  assertValidRunId(id)
  const filePath = path.join(RUNS_DIR, id, subdir, filename)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function appendToTruthLog(logPath: string, entry: string): void {
  const truthDir = path.join(MEDIA_CODEX_ROOT, 'truth')
  if (!fs.existsSync(truthDir)) {
    fs.mkdirSync(truthDir, { recursive: true })
  }
  const fullPath = path.join(truthDir, logPath)
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const line = `\n## ${new Date().toISOString()}\n${entry}\n`
  fs.appendFileSync(fullPath, line)
}
