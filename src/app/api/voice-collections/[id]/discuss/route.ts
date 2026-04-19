import { NextResponse } from 'next/server'
import { getVoiceCollection, getVoiceNote, updateVoiceCollection } from '@/lib/db'
import { formatZodError, voiceCollectionDiscussSchema } from '@/lib/api-schemas'
import { runLocalAgent } from '@/lib/local-agent'

type RouteContext = { params: Promise<{ id: string }> }

function parseIds(value: string): number[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch {
    return []
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const collection = getVoiceCollection(id)
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const parsed = voiceCollectionDiscussSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const notes = parseIds(collection.note_ids)
      .map(noteId => getVoiceNote(noteId))
      .filter(Boolean)

    const noteText = notes.map((note, index) => [
      `## 笔记 ${index + 1}: ${note!.title}`,
      `摘要: ${note!.summary || '无'}`,
      `文字: ${note!.transcript || '无转写文字'}`,
    ].join('\n')).join('\n\n')

    const prompt = `你是 Wilson 的本地内容策略 Agent。下面是一组零散口述笔记，请把它们讨论成一个可拍的视频主题。

要求输出 Markdown，必须包含：
1. 推荐主题和一句话观众承诺
2. 这些口述里真正想表达的 3-6 个观点，并把表达润色得更清楚
3. 需要补的理论、论文、心理学概念或可信来源类型
4. 用户可能搜索的痛点和平台表达语境
5. 适合做成的内容结构和脚本大纲
6. 哪些观点风险较高，需要 Wilson 人工确认

不要公开发布，不要伪造论文标题。没有确认来源时，请写“需要检索确认”。

组合标题：${collection.title}
当前草稿角度：${collection.content_angle}

口述笔记：
${noteText}`

    const result = await runLocalAgent({
      action: 'voice_collection_discuss',
      provider: parsed.data.provider,
      prompt,
      timeoutMs: Number(process.env.LOGPAD_AGENT_TIMEOUT_MS || 180000),
    })

    updateVoiceCollection(id, {
      agent_brief: result.result,
      status: 'discussed',
    })

    return NextResponse.json({ success: true, result: result.result, provider: result.provider })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to discuss voice collection'
    console.error('POST /api/voice-collections/[id]/discuss error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
