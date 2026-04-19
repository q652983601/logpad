import { NextRequest, NextResponse } from 'next/server'
import { aiRequestSchema, formatZodError, type AIRequest } from '@/lib/api-schemas'
import { runLocalAgent } from '@/lib/local-agent'
import { checkRateLimit } from '@/lib/rate-limit'

function buildPrompt(req: AIRequest): string {
  switch (req.action) {
    case 'rewrite_colloquial':
      return `请将以下口播脚本改写成更口语化、更自然的表达。要求：
1. 去掉书面语和过于正式的表达
2. 多用短句，增加停顿感
3. 保留关键信息和技术细节
4. 让语气像朋友聊天一样自然
5. 可以在适当位置加入（笑）、（停顿）等语气标记

原文：
${req.content}

请只返回改写后的脚本，不要添加额外说明。`

    case 'generate_titles':
      return `请为以下内容生成 3 个吸引点击的标题。要求：
1. 每个标题都要不同风格（悬念型、数字型、反常识型）
2. 控制在 20 字以内
3. 适合短视频平台（抖音/小红书/YouTube Shorts）
4. 突出核心卖点或冲突

内容：
${req.content}

请用 JSON 格式返回：{"titles": ["标题1", "标题2", "标题3"]}，只返回 JSON。`

    case 'generate_hooks':
      return `请为以下内容生成 3 个开场 Hook（前 3 秒抓眼球的句子）。要求：
1. 每个 Hook 都要强烈吸引观众继续看
2. 可以是提问、反常识、痛点共鸣、利益承诺等类型
3. 控制在 30 字以内
4. 口语化，像跟朋友说话

内容：
${req.content}

请用 JSON 格式返回：{"hooks": ["hook1", "hook2", "hook3"]}，只返回 JSON。`

    case 'generate_remotion':
      return `请根据以下脚本内容，生成 Remotion 动画/插画需求列表。要求：
1. 按时间顺序列出每个需要视觉辅助的点
2. 每个需求包含：时间点、内容描述、AI 生成提示词（英文）
3. 提示词要详细，包含风格、配色、构图等
4. 适合科技/数码评测类视频的视觉风格（深色背景、简洁、科技感）

脚本：
${req.content}

请用 JSON 格式返回：
{"scenes": [{"time": "00:00", "description": "描述", "prompt": "英文提示词"}]}
只返回 JSON。`

    case 'rewrite_douyin':
      return `请将以下脚本改写成适合抖音 60 秒版本的文案。要求：
1. 总字数控制在 150-180 字（约 60 秒口播）
2. 保留核心卖点和最有冲击力的信息
3. 开头 3 秒必须有强 Hook
4. 节奏紧凑，信息密度高
5. 结尾有明确的 CTA（关注/点赞/评论引导）

原文：
${req.content}

请只返回改写后的文案，不要添加额外说明。`

    case 'generate_review':
      return `请根据以下数据表现，生成一份详细的内容复盘报告。

数据：
${req.content}

请按以下结构输出：
1. 整体表现评价（一句话总结）
2. 封面/标题分析（CTR 相关）
3. 脚本/内容分析（完播率、平均观看时长相关）
4. 互动分析（点赞、评论、分享、转粉率）
5. 具体优化建议（至少 3 条可执行的建议）

语气要专业但易懂，像资深内容运营给创作者的建议。请用 Markdown 格式输出。`

    case 'generate_thumbnail_brief':
      return `请为以下视频发布内容生成 3 个封面方案。要求：
1. 每个方案分别覆盖：悬念型、数字型、对比型
2. 每个方案要包含：style、promise、layout、cover_text、asset_prompt
3. cover_text 控制在 8 个汉字以内
4. layout 要说明人物、文字、对比元素如何摆放
5. asset_prompt 用英文写，便于后续交给图像或设计 agent
6. 不要夸张虚假承诺，必须贴合内容

内容：
${req.content}

请只返回 JSON：
{"variants":[{"style":"悬念型","promise":"观众点击后得到什么","layout":"版面说明","cover_text":"封面字","asset_prompt":"English visual prompt"}]}`
  }
}

function wrapForAgent(req: AIRequest, prompt: string): string {
  const context = req.context ? `\n\n上下文：\n${req.context}` : ''
  return `你是 LogPad 的本地 Agent worker。产品层不直连模型 API，你现在通过本机 runtime 执行一次结构化生成任务。

约束：
- 只处理下面这一次任务，不要修改文件，不要运行命令。
- 如果要求 JSON，只返回可解析 JSON，不要包 Markdown 代码块。
- 如果要求纯文本，只返回结果本身。

任务类型：${req.action}${context}

${prompt}`
}

function getClientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'local'
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    const parsed = aiRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const limit = Number(process.env.LOGPAD_AGENT_RATE_LIMIT_PER_MINUTE || 60)
    const rate = checkRateLimit(`ai:${getClientKey(req)}`, limit, 60_000)
    if (!rate.ok) {
      return NextResponse.json(
        { error: `本地 Agent 请求过快，请 ${rate.retryAfter} 秒后再试` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    const body = parsed.data
    const prompt = wrapForAgent(body, buildPrompt(body))
    const response = await runLocalAgent({
      action: body.action,
      provider: body.provider,
      prompt,
    })

    return NextResponse.json({
      result: response.result,
      provider: response.provider,
      routed: true,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Local agent API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
