export function summarizeTranscript(text: string): { summary: string; keyPoints: string[] } {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return { summary: '', keyPoints: [] }

  const parts = clean
    .split(/[。！？!?；;\n]+/)
    .map(item => item.trim())
    .filter(Boolean)

  const keyPoints = parts
    .filter(item => item.length >= 8)
    .slice(0, 6)

  const summary = keyPoints.length
    ? keyPoints.slice(0, 2).join('。').slice(0, 260)
    : clean.slice(0, 260)

  return { summary, keyPoints }
}

export function buildVoiceCollectionDraft(notes: Array<{ title: string; transcript: string; summary: string }>): {
  theme: string
  audience_pain: string
  theory_support: string
  content_angle: string
  draft_outline: string
} {
  const combined = notes.map(note => [note.title, note.summary, note.transcript].filter(Boolean).join('：')).join('\n')
  const compact = combined.replace(/\s+/g, ' ').slice(0, 600)
  const titles = notes.map(note => note.title).filter(Boolean).slice(0, 4)

  return {
    theme: titles.length ? titles.join(' / ') : '待讨论主题',
    audience_pain: '待本机 Agent 根据这些口述素材补充用户搜索痛点、表达困惑和平台语境。',
    theory_support: '待本机 Agent 补充可引用的理论、论文、心理学概念或反例边界。',
    content_angle: compact ? `从这些口述素材里提炼一个真实表达角度：${compact}` : '先补转写文本，再提炼内容角度。',
    draft_outline: notes.map((note, index) => `${index + 1}. ${note.title}\n   ${note.summary || note.transcript.slice(0, 120) || '待补文字'}`).join('\n'),
  }
}
