export const PIPELINE_STAGE_KEYS = [
  'signal',
  'research',
  'topic',
  'script',
  'assets',
  'packaging',
  'production',
  'distribution',
  'metrics',
  'review',
] as const

export type PipelineStageKey = typeof PIPELINE_STAGE_KEYS[number]

export const PIPELINE_STAGE_TO_CLI_STAGE: Record<PipelineStageKey, string> = {
  signal: 'signal',
  research: 'research',
  topic: 'topic_decision',
  script: 'script',
  assets: 'assets',
  packaging: 'packaging',
  production: 'production_check',
  distribution: 'distribution',
  metrics: 'metrics',
  review: 'review',
}

export type StageStatusMap = Record<string, { exists?: boolean } | undefined>

export function isPipelineStageKey(value: string): value is PipelineStageKey {
  return (PIPELINE_STAGE_KEYS as readonly string[]).includes(value)
}

export function toCliStage(stage: string): string {
  if (isPipelineStageKey(stage)) return PIPELINE_STAGE_TO_CLI_STAGE[stage]
  return stage
}

export function countCompletedStages(stages: StageStatusMap | null | undefined): number {
  if (!stages) return 0
  return PIPELINE_STAGE_KEYS.filter(stage => stages[stage]?.exists === true).length
}

export function isPipelineComplete(stages: StageStatusMap | null | undefined): boolean {
  if (!stages) return false
  return PIPELINE_STAGE_KEYS.every(stage => stages[stage]?.exists === true)
}
