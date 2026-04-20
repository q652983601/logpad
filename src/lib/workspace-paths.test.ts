import { describe, expect, it } from 'vitest'
import path from 'path'
import {
  DEFAULT_LOGPAD_WORKSPACE_ROOT,
  resolveActiveEpisodesDir,
  resolveAgentHandoffDir,
  resolveBusinessTruthDir,
  resolveRunPath,
  resolveRunsDir,
  resolveWorkspaceRoot,
} from './workspace-paths'

describe('workspace path resolution', () => {
  it('defaults web truth to the LogPad Mac workspace', () => {
    expect(resolveWorkspaceRoot({} as NodeJS.ProcessEnv)).toBe(DEFAULT_LOGPAD_WORKSPACE_ROOT)
    expect(resolveRunsDir({} as NodeJS.ProcessEnv)).toBe(
      path.join(DEFAULT_LOGPAD_WORKSPACE_ROOT, '03-content-projects', 'runs')
    )
  })

  it('uses LOGPAD_WORKSPACE_ROOT as the first-class truth source', () => {
    const env = { LOGPAD_WORKSPACE_ROOT: '/tmp/logpad-workspace' } as unknown as NodeJS.ProcessEnv

    expect(resolveRunsDir(env)).toBe('/tmp/logpad-workspace/03-content-projects/runs')
    expect(resolveRunPath('episode-1', env)).toBe('/tmp/logpad-workspace/03-content-projects/runs/episode-1')
    expect(resolveBusinessTruthDir(env)).toBe('/tmp/logpad-workspace/07-business-truth')
    expect(resolveAgentHandoffDir(env)).toBe('/tmp/logpad-workspace/02-agent-workflows/handoff')
  })

  it('keeps legacy business folder reads separate from Mac workspace writes', () => {
    const env = {
      LOGPAD_WORKSPACE_ROOT: '/tmp/logpad-workspace',
      LOGPAD_BUSINESS_ROOT: '/tmp/media-codex',
    } as unknown as NodeJS.ProcessEnv

    expect(resolveActiveEpisodesDir(env)).toBe('/tmp/media-codex/business-folder-os/03-episodes/active')
  })
})
