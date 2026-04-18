import { NextRequest, NextResponse } from 'next/server'

interface AIPromptRequest {
  action: 'rewrite_colloquial' | 'generate_titles' | 'generate_hooks' | 'generate_remotion' | 'rewrite_douyin' | 'generate_review'
  content: string
  context?: string
}

function buildPrompt(req: AIPromptRequest): string {
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

    default:
      return req.content
  }
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAI(prompt: string): Promise<string> {
  // 优先使用 Claude，其次 OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return callClaude(prompt)
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(prompt)
  }
  throw new Error('No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AIPromptRequest

    if (!body.action || !body.content) {
      return NextResponse.json({ error: 'Missing action or content' }, { status: 400 })
    }

    const prompt = buildPrompt(body)
    const result = await callAI(prompt)

    return NextResponse.json({ result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('AI API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
