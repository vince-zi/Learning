// ============================================================
// Helper utility: Error Classifier & Formatting Rules
// 从 app/api/chat/route.ts 拆分出来的错误分类及修复规则引擎
// ============================================================

export function getFriendlyErrorName(type: string): string {
  const names: Record<string, string> = {
    'grammar-tense': '动词时态 (Tenses)',
    'grammar-article': '冠词使用 (Articles)',
    'grammar-preposition': '介词搭配 (Prepositions)',
    'grammar-word-order': '语序结构 (Word Order)',
    'grammar-agreement': '主谓一致 (Subject-Verb Agreement)',
    'vocabulary-choice': '词汇搭配 (Word Choice)',
    'expression-chinglish': '中式英语 (Chinglish)',
    'expression-incomplete': '句子完整性 (Sentence Completeness)',
  }
  return names[type] || type || '语法词汇 (Grammar/Vocabulary)'
}

/** 规则引擎直接计算 target_fix：模式替换，不依赖 LLM */
export function computeTargetFix(error: any): string | null {
  const text = error.originalText || ''
  const type: string = error.errorType || ''
  // strip context wrappers from error.originalText
  const clean = text.replace(/^\.\.\./, '').replace(/\.\.\.$/, '').trim()
  const rules: Record<string, Array<{ re: RegExp; replacement: string | null }>> = {
    'grammar-preposition': [
      { re: /discuss\s+about/i, replacement: 'discuss' },
      { re: /married\s+with/i, replacement: 'married to' },
      { re: /listen\s+music/i, replacement: 'listen to music' },
      { re: /go\s+to\s+home/i, replacement: 'go home' },
      { re: /arrive\s+to/i, replacement: 'arrive at/in' },
      { re: /depend\s+on\s+of/i, replacement: 'depend on' },
    ],
    'expression-chinglish': [
      { re: /I\s+very\s+(like|love|hate|enjoy|want|need)/gi, replacement: 'I really $1' },
      { re: /according\s+to\s+me/i, replacement: 'in my opinion' },
      { re: /how\s+to\s+say/i, replacement: 'how do you say' },
      { re: /open\s+the\s+(light|TV|computer)/gi, replacement: 'turn on the $1' },
      { re: /close\s+the\s+(light|TV|computer)/gi, replacement: 'turn off the $1' },
    ],
    'grammar-tense': [
      { re: /(?:I\s+)?go\s+to\s+.*yesterday/i, replacement: 'went (past tense)' },
      { re: /I\s+have\s+went/i, replacement: 'I have gone' },
      { re: /(?:yesterday|last|ago).*(?:go|come|see|do|have)\b.*/i, replacement: null },
    ],
    'grammar-article': [
      { re: /\ba\s+([aeiou])/i, replacement: 'an $1' },
      { re: /\ban\s+([^aeiou])/i, replacement: 'a $1' },
    ],
    'grammar-word-order': [
      { re: /I\s+not\s+(like|know|think|want|have)/i, replacement: "I don't $1" },
      { re: /what\s+you\s+(like|think|want|mean)/i, replacement: 'what do you $1' },
    ],
    'grammar-agreement': [
      { re: /\b(he|she|it)\s+have\b/i, replacement: '$1 has' },
      { re: /\b(he|she|it)\s+do\b/i, replacement: '$1 does' },
    ],
  }

  const typeRules = rules[type]
  if (typeRules) {
    for (const rule of typeRules) {
      if (rule.re.test(clean)) {
        if (rule.replacement === null) return null
        return clean.replace(rule.re, rule.replacement)
      }
    }
  }
  return null
}

/** 从错误原文中提取具体的错误片段 */
export function extractErrorSpan(text: string, errorType: string): string | null {
  const extractors: Record<string, RegExp> = {
    'grammar-tense': /(?:go|come|see|do|have|make|take|get|say|was|were|went|came)\b\s?\w*/i,
    'grammar-preposition': /discuss\s+about|married\s+with|listen\s+(?:to\s+)?music|go\s+to\s+home|arrive\s+to|depend\s+on\s+of/i,
    'grammar-article': /\b(?:a|an|the)\s+\w+/i,
    'grammar-word-order': /I\s+not\s+\w+|what\s+you\s+\w+/i,
    'grammar-agreement': /\b(?:he|she|it)\s+(?:have|do|go)/i,
    'expression-chinglish': /I\s+very\s+\w+|according\s+to\s+me|how\s+to\s+say|open\s+the\s+\w+/i,
    'vocabulary-choice': /\b(?:big)\s+\w+\b/i,
    'expression-incomplete': /^(?:yes|no|okay|ok|maybe|sorry)\b/i,
  }

  const re = extractors[errorType]
  if (re) {
    const match = text.match(re)
    return match ? match[0] : null
  }
  return null
}
