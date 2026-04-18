// 口语化检测规则引擎 — 本地规则，无需 API

export interface ScriptIssue {
  type: 'written_language' | 'long_sentence' | 'passive_voice' | 'too_formal'
  text: string
  suggestion: string
  index: number
  length: number
}

const WRITTEN_PATTERNS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /综上所述|总而言之|总的来说/g, suggestion: '简单说 / 一句话' },
  { pattern: /值得注意的是|需要指出的是/g, suggestion: '注意 / 你会发现' },
  { pattern: /笔者|作者认为|本文认为/g, suggestion: '我 / 我觉得' },
  { pattern: /一定程度上|某种程度上/g, suggestion: '有点 / 算是' },
  { pattern: /具有……的特点/g, suggestion: '特点是…… / ……很关键' },
  { pattern: /提供了……的解决方案/g, suggestion: '解决了…… / 搞定了……' },
  { pattern: /在很大程度上/g, suggestion: '挺 / 非常' },
  { pattern: /由于……因此/g, suggestion: '因为……所以' },
  { pattern: /然而|但是值得注意的是/g, suggestion: '不过 / 但' },
  { pattern: /不仅……而且/g, suggestion: '不但……还' },
  { pattern: /旨在|目的在于/g, suggestion: '为了 / 就是想' },
  { pattern: /涉及到|涉及到/g, suggestion: '涉及 / 关于' },
  { pattern: /进行一个……的操作/g, suggestion: '……一下' },
  { pattern: /开展|进行|实施/g, suggestion: '做 / 搞 / 弄' },
  { pattern: /优化了……性能/g, suggestion: '让……更快 / 提升了……' },
  { pattern: /体现了|反映了/g, suggestion: '说明 / 看得出' },
  { pattern: /换言之|也就是说/g, suggestion: '说白了 / 意思就是' },
  { pattern: /除此之外|另外值得一提的是/g, suggestion: '还有 / 另外' },
  { pattern: / notwithstanding/g, suggestion: '不过' },
]

const FORMAL_WORDS: Record<string, string> = {
  '购买': '买',
  '拥有': '有',
  '进行': '做',
  '优化': '改进/让……更好',
  '提升': '提高/让……更……',
  '获取': '拿到/得到',
  '使用': '用',
  '选择': '选',
  '呈现': '显示/出现',
  '展示': '给……看',
  '确实': '真的',
  '确实如此': '对啊',
  '非常重要': '很关键/特别重要',
  '十分': '非常/挺',
  '极其': '特别/超级',
  '颇为': '挺/比较',
  '相当': '挺/蛮',
  '较为': '比较/还行',
  '显著': '明显',
  '明显': '一眼就能看出',
  '差异': '差别/不一样',
  '优势': '好处/厉害的地方',
  '劣势': '缺点/不好的地方',
  '特性': '特点',
  '功能': '用法/能干嘛',
  '参数': '数据/配置',
  '表现': '表现/效果',
  '体验': '感觉/用起来',
}

export function detectColloquialIssues(text: string): ScriptIssue[] {
  const issues: ScriptIssue[] = []

  // 1. 检测书面化短语
  for (const { pattern, suggestion } of WRITTEN_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern))
    for (const match of matches) {
      issues.push({
        type: 'written_language',
        text: match[0],
        suggestion,
        index: match.index!,
        length: match[0].length,
      })
    }
  }

  // 2. 检测过于正式的单个词
  for (const [word, suggestion] of Object.entries(FORMAL_WORDS)) {
    const regex = new RegExp(word, 'g')
    const matches = Array.from(text.matchAll(regex))
    for (const match of matches) {
      issues.push({
        type: 'too_formal',
        text: match[0],
        suggestion,
        index: match.index!,
        length: match[0].length,
      })
    }
  }

  // 3. 检测长句（超过35个字无标点）
  const sentenceRegex = /[^。！？.!?\n]+[。！？.!?\n]?/g
  const sentences = Array.from(text.matchAll(sentenceRegex))
  for (const match of sentences) {
    const sentence = match[0].trim()
    if (sentence.length > 35) {
      issues.push({
        type: 'long_sentence',
        text: sentence.slice(0, 20) + '...',
        suggestion: '拆成短句，加停顿',
        index: match.index!,
        length: match[0].length,
      })
    }
  }

  // 4. 检测被动语态（被……/由……）
  const passiveRegex = /被[\u4e00-\u9fa5]{1,6}[\u4e00-\u9fa5]{0,4}/g
  const passiveMatches = Array.from(text.matchAll(passiveRegex))
  for (const match of passiveMatches) {
    issues.push({
      type: 'passive_voice',
      text: match[0],
      suggestion: '改为主动语态',
      index: match.index!,
      length: match[0].length,
    })
  }

  // 按位置排序
  issues.sort((a, b) => a.index - b.index)

  // 去重：同一个位置只保留一个
  const seen = new Set<number>()
  return issues.filter(issue => {
    if (seen.has(issue.index)) return false
    seen.add(issue.index)
    return true
  })
}

export function getIssueColor(type: ScriptIssue['type']): string {
  switch (type) {
    case 'written_language': return 'bg-orange/15 text-orange border-orange/30'
    case 'too_formal': return 'bg-yellow/15 text-yellow border-yellow/30'
    case 'long_sentence': return 'bg-blue/15 text-blue border-blue/30'
    case 'passive_voice': return 'bg-purple/15 text-purple border-purple/30'
    default: return 'bg-surface-3 text-text-3'
  }
}

export function getIssueLabel(type: ScriptIssue['type']): string {
  switch (type) {
    case 'written_language': return '书面语'
    case 'too_formal': return '过于正式'
    case 'long_sentence': return '长句'
    case 'passive_voice': return '被动语态'
    default: return '其他'
  }
}
