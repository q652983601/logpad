import fs from 'fs'
import path from 'path'

export const DEFAULT_LOGPAD_WORKSPACE_ROOT = '/Users/wilsonlu/Desktop/Ai/media/media-codex/logpad-macos/workspace'
export const DEFAULT_LEGACY_MEDIA_ROOT = '/Users/wilsonlu/Desktop/Ai/media/media-codex'

export function resolveWorkspaceRoot(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(
    env.LOGPAD_WORKSPACE_ROOT
      || env.MEDIA_CODEX_ROOT
      || DEFAULT_LOGPAD_WORKSPACE_ROOT
  )
}

export function resolveLegacyMediaRoot(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(
    env.LOGPAD_BUSINESS_ROOT
      || env.LOGPAD_LEGACY_MEDIA_ROOT
      || DEFAULT_LEGACY_MEDIA_ROOT
  )
}

export function resolvePipelineRoot(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(env.LOGPAD_PIPELINE_ROOT || resolveLegacyMediaRoot(env))
}

export function resolveRunsDir(env: NodeJS.ProcessEnv = process.env): string {
  const root = resolveWorkspaceRoot(env)
  const appRunsDir = path.join(root, '03-content-projects', 'runs')
  const legacyRunsDir = path.join(root, 'runs')

  if (env.LOGPAD_WORKSPACE_ROOT) {
    return appRunsDir
  }

  if (path.basename(root) === 'workspace' || fs.existsSync(appRunsDir)) {
    return appRunsDir
  }

  return legacyRunsDir
}

export function resolveRunPath(id: string, env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveRunsDir(env), id)
}

export function resolveBusinessTruthDir(env: NodeJS.ProcessEnv = process.env): string {
  const root = resolveWorkspaceRoot(env)
  return path.join(root, '07-business-truth')
}

export function resolveAgentHandoffDir(env: NodeJS.ProcessEnv = process.env): string {
  const root = resolveWorkspaceRoot(env)
  return path.join(root, '02-agent-workflows', 'handoff')
}

export function resolveActiveEpisodesDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveLegacyMediaRoot(env), 'business-folder-os', '03-episodes', 'active')
}

export function resolveTranscribeOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveWorkspaceRoot(env), '04-inspiration-library', 'transcripts')
}
