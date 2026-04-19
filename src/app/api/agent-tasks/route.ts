import { NextRequest, NextResponse } from 'next/server'
import { agentTaskSchema, formatZodError, type AgentTaskRequest } from '@/lib/api-schemas'
import { handoffToOpenClaw } from '@/lib/local-agent'
import { checkRateLimit } from '@/lib/rate-limit'

const ACTION_LABELS: Record<AgentTaskRequest['action'], string> = {
  publish_patrol: '发布巡检',
  metrics_review: '数据复盘',
  weekly_strategy: '周策略',
  episode_unblock: '单期解卡',
}

function getClientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'local'
}

function buildHandoffPrompt(task: AgentTaskRequest): string {
  const label = ACTION_LABELS[task.action]
  const episodeLine = task.episodeId ? `关联选题：${task.episodeId}\n` : ''
  const context = task.context ? `\n补充上下文：\n${task.context.trim()}\n` : ''

  return `你是 Wilson 本机自媒体工作流的 OpenClaw/Codex 协作 Agent。

任务：${label}
${episodeLine}
请基于下面的 LogPad 状态，完成一次异步巡检或策略整理：
- 找出今天最该推进的事项
- 标出卡住、缺数据、临近发布的风险
- 给出可以直接交给 Codex/Claude/人工执行的下一步
- 不要公开发布内容，只写回工作建议和待办
${context}
LogPad 状态：
${task.content.trim()}`
}

export async function POST(req: NextRequest) {
  try {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = agentTaskSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const limit = Number(process.env.LOGPAD_AGENT_TASK_RATE_LIMIT_PER_MINUTE || 30)
    const rate = checkRateLimit(`agent-task:${getClientKey(req)}`, limit, 60_000)
    if (!rate.ok) {
      return NextResponse.json(
        { error: `系统交接请求过快，请 ${rate.retryAfter} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    const task = parsed.data
    const result = await handoffToOpenClaw(buildHandoffPrompt(task), ACTION_LABELS[task.action])

    return NextResponse.json({
      success: true,
      result,
      action: task.action,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('POST /api/agent-tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
