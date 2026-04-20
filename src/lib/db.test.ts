import path from 'path'
import { describe, expect, it } from 'vitest'
import { resolveDbPath } from './db'

describe('db path resolver', () => {
  it('uses the app data directory by default', () => {
    expect(resolveDbPath({ LOGPAD_WORKSPACE_ROOT: '/tmp/logpad-workspace' } as unknown as NodeJS.ProcessEnv)).toBe(
      '/tmp/logpad-workspace/01-app-control/state/logpad.db'
    )
  })

  it('supports explicit file paths', () => {
    expect(resolveDbPath({ LOGPAD_DB_PATH: '/tmp/custom/logpad.db' } as unknown as NodeJS.ProcessEnv)).toBe('/tmp/custom/logpad.db')
  })

  it('supports file URLs', () => {
    const resolved = resolveDbPath({ DATABASE_URL: 'file:///tmp/logpad-url.db' } as unknown as NodeJS.ProcessEnv)
    expect(resolved).toBe(path.normalize('/tmp/logpad-url.db'))
  })
})
