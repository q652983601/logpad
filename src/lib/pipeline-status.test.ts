import { describe, expect, it } from 'vitest'
import { countCompletedStages, isPipelineComplete, isReadyToPublish, toCliStage } from './pipeline-status'

describe('pipeline status helpers', () => {
  it('maps UI stage names to CLI stage names', () => {
    expect(toCliStage('topic')).toBe('topic_decision')
    expect(toCliStage('production')).toBe('production_check')
    expect(toCliStage('review')).toBe('review')
  })

  it('counts only the canonical ten pipeline stages', () => {
    const stages = {
      signal: { exists: true },
      research: { exists: true },
      random: { exists: true },
    }
    expect(countCompletedStages(stages)).toBe(2)
    expect(isPipelineComplete(stages)).toBe(false)
  })

  it('detects completion consistently', () => {
    const complete = {
      signal: { exists: true },
      research: { exists: true },
      topic: { exists: true },
      script: { exists: true },
      assets: { exists: true },
      packaging: { exists: true },
      production: { exists: true },
      distribution: { exists: true },
      metrics: { exists: true },
      review: { exists: true },
    }
    expect(countCompletedStages(complete)).toBe(10)
    expect(isPipelineComplete(complete)).toBe(true)
    expect(isReadyToPublish(complete)).toBe(true)
  })

  it('separates publish readiness from post-publish loop closure', () => {
    const readyToPublish = {
      signal: { exists: true },
      research: { exists: true },
      topic: { exists: true },
      script: { exists: true },
      assets: { exists: true },
      packaging: { exists: true },
      production: { exists: true },
      distribution: { exists: true },
      metrics: { exists: false },
      review: { exists: false },
    }
    expect(isReadyToPublish(readyToPublish)).toBe(true)
    expect(isPipelineComplete(readyToPublish)).toBe(false)
  })
})
