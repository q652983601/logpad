import { describe, expect, it } from 'vitest'
import { validateEpisodeId, validateRunId, validateScriptData, validateStatus } from './validation'

describe('validation helpers', () => {
  it('accepts normal media run ids and rejects traversal', () => {
    expect(validateRunId('2026-04-19-topic_01')).toBe(true)
    expect(validateRunId('../secret')).toBe(false)
    expect(validateRunId('runs/abc')).toBe(false)
    expect(validateRunId('abc\\def')).toBe(false)
  })

  it('validates episode ids and statuses', () => {
    expect(validateEpisodeId('20260419-a1b2')).toBe(true)
    expect(validateEpisodeId('2026-04-19-a1b2')).toBe(false)
    expect(validateStatus('published')).toBe(true)
    expect(validateStatus('deleted')).toBe(false)
  })

  it('reports script shape errors', () => {
    const result = validateScriptData({ title: 123, sections: 'bad', duration: 'fast' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('title must be a string')
    expect(result.errors).toContain('sections must be an array')
    expect(result.errors).toContain('duration must be a number')
  })
})
