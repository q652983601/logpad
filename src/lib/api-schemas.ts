import { z } from 'zod'
import { PIPELINE_STAGE_KEYS } from './pipeline-status'

const runId = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[\w.-]+$/)
  .refine(value => !value.includes('..') && !value.includes('/') && !value.includes('\\'), {
    message: 'Invalid run id',
  })

const stage = z.enum(PIPELINE_STAGE_KEYS)
const cliStage = z.enum([
  'signal',
  'research',
  'topic_decision',
  'script',
  'assets',
  'packaging',
  'production_check',
  'distribution',
  'metrics',
  'review',
])

export const aiActionSchema = z.enum([
  'rewrite_colloquial',
  'generate_titles',
  'generate_hooks',
  'generate_remotion',
  'rewrite_douyin',
  'generate_review',
  'generate_thumbnail_brief',
])

export const agentProviderSchema = z.enum(['codex', 'claude', 'openclaw-handoff'])

export const aiRequestSchema = z.object({
  action: aiActionSchema,
  content: z.string().min(1).max(20000),
  context: z.string().max(10000).optional(),
  provider: agentProviderSchema.optional(),
}).strict()

export type AIRequest = z.infer<typeof aiRequestSchema>
export type AgentProvider = z.infer<typeof agentProviderSchema>

export const agentTaskActionSchema = z.enum([
  'publish_patrol',
  'metrics_review',
  'weekly_strategy',
  'episode_unblock',
])

export const agentTaskSchema = z.object({
  action: agentTaskActionSchema,
  content: z.string().min(1).max(20000),
  episodeId: runId.optional(),
  context: z.string().max(10000).optional(),
}).strict()

export type AgentTaskRequest = z.infer<typeof agentTaskSchema>

export const cliCommandSchema = z.enum([
  'init',
  'validate',
  'status',
  'advance',
  'make-pack',
  'make-remotion-props',
  'remotion-qc',
])

export const cliRequestSchema = z
  .object({
    command: cliCommandSchema,
    runId: runId.optional(),
    title: z.string().min(1).max(200).optional(),
    episodeId: runId.optional(),
    platforms: z.array(z.string().min(1).max(60)).max(12).optional(),
    owner: z.string().min(1).max(80).optional(),
    force: z.boolean().optional(),
    to: z.union([stage, cliStage]).optional(),
    upto: z.union([stage, cliStage]).optional(),
    note: z.string().max(300).optional(),
    noPackageUpdate: z.boolean().optional(),
    composition: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,80}$/).optional(),
    frame: z.number().int().min(0).max(10000).optional(),
    scale: z.string().regex(/^(0(\.\d+)?|1(\.0+)?)$/).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.command === 'init' && !value.title) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'title is required for init' })
    }
    if (value.command !== 'init' && !value.runId) {
      ctx.addIssue({ code: 'custom', path: ['runId'], message: 'runId is required for this command' })
    }
    if (value.command === 'advance' && !value.to) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'to is required for advance' })
    }
    if (value.force && !value.note && value.command === 'advance') {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'note is required when force is true' })
    }
  })

export type CLIRequest = z.infer<typeof cliRequestSchema>

export const runCreateSchema = z.object({
  id: runId,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  platforms: z.array(z.string().min(1).max(60)).max(12).optional(),
}).strict()

export const metricPayloadSchema = z.object({
  episode_id: runId,
  platform: z.string().min(1).max(60),
  views: z.number().int().min(0).default(0),
  completion_rate: z.number().min(0).max(100).default(0),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
  new_followers: z.number().int().min(0).default(0),
  avg_watch_time: z.number().min(0).default(0),
  ctr: z.number().min(0).max(100).default(0),
}).strict()

export const metricPatchSchema = z.object({
  episode_id: runId.optional(),
  platform: z.string().min(1).max(60).optional(),
  views: z.number().int().min(0).optional(),
  completion_rate: z.number().min(0).max(100).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  new_followers: z.number().int().min(0).optional(),
  avg_watch_time: z.number().min(0).optional(),
  ctr: z.number().min(0).max(100).optional(),
}).strict().refine(value => Object.keys(value).length > 0, {
  message: 'At least one field is required',
})

export const timelineSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(80),
    time: z.string().max(30).optional(),
    start: z.number().min(0).optional(),
    end: z.number().min(0).optional(),
    description: z.string().max(2000).optional(),
    prompt: z.string().max(4000).optional(),
    status: z.string().max(40).optional(),
    asset_path: z.string().max(500).optional(),
  })).max(200),
}).passthrough()

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(issue => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  }).join('; ')
}
