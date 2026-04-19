import { describe, expect, it } from 'vitest'
import { agentTaskSchema, aiRequestSchema, cliRequestSchema, metricPatchSchema, metricPayloadSchema, recordingTakesSchema, runCreateSchema } from './api-schemas'

describe('api schemas', () => {
  it('rejects arbitrary CLI args', () => {
    const parsed = cliRequestSchema.safeParse({
      command: 'status',
      runId: '20260419-test',
      args: ['--to', 'review'],
    })
    expect(parsed.success).toBe(false)
  })

  it('requires structured args for advance', () => {
    expect(cliRequestSchema.safeParse({ command: 'advance', runId: '20260419-test' }).success).toBe(false)
    expect(cliRequestSchema.safeParse({ command: 'advance', runId: '20260419-test', to: 'topic' }).success).toBe(true)
  })

  it('bounds local agent requests', () => {
    expect(aiRequestSchema.safeParse({ action: 'generate_titles', content: 'hello', provider: 'codex' }).success).toBe(true)
    expect(aiRequestSchema.safeParse({ action: 'generate_thumbnail_brief', content: 'title', provider: 'codex' }).success).toBe(true)
    expect(aiRequestSchema.safeParse({ action: 'generate_titles', content: '', provider: 'codex' }).success).toBe(false)
    expect(aiRequestSchema.safeParse({ action: 'generate_titles', content: 'hello', provider: 'ollama' }).success).toBe(false)
  })

  it('validates metric create and patch payloads', () => {
    expect(metricPayloadSchema.safeParse({
      episode_id: '20260419-test',
      platform: 'youtube',
      views: 0,
      ctr: 101,
    }).success).toBe(false)
    expect(metricPatchSchema.safeParse({}).success).toBe(false)
    expect(metricPatchSchema.safeParse({ views: 100, unknown: true }).success).toBe(false)
    expect(metricPatchSchema.safeParse({ views: 100 }).success).toBe(true)
  })

  it('validates system agent handoff tasks', () => {
    expect(agentTaskSchema.safeParse({
      action: 'publish_patrol',
      content: 'active: 3',
      context: 'dashboard',
    }).success).toBe(true)
    expect(agentTaskSchema.safeParse({
      action: 'publish_patrol',
      content: 'active: 3',
      args: ['run-anything'],
    }).success).toBe(false)
    expect(agentTaskSchema.safeParse({
      action: 'unknown',
      content: 'active: 3',
    }).success).toBe(false)
  })

  it('accepts richer episode creation context', () => {
    expect(runCreateSchema.safeParse({
      id: '20260419-topic',
      title: '我用 agent 做一条视频',
      description: '观众看完知道怎么拆工作流',
      platforms: ['youtube', 'douyin'],
    }).success).toBe(true)
    expect(runCreateSchema.safeParse({
      id: '20260419-topic',
      title: 'bad',
      description: 'x'.repeat(1001),
    }).success).toBe(false)
  })

  it('validates recording take writebacks', () => {
    expect(recordingTakesSchema.safeParse({
      beats: [{
        beat_index: 0,
        beat_name: 'Hook',
        status: 'usable',
        selected_take_id: 'take-1',
        takes: [{
          id: 'take-1',
          label: 'Take 1',
          status: 'usable',
          asset_path: '/uploads/20260419/hook.mov',
          notes: 'best opening',
        }],
      }],
      updated_at: new Date().toISOString(),
    }).success).toBe(true)
    expect(recordingTakesSchema.safeParse({
      beats: [{
        beat_index: 0,
        beat_name: 'Hook',
        status: 'done',
        takes: [],
      }],
    }).success).toBe(false)
  })
})
