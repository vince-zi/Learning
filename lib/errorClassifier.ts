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

export function generateDetailedDiffHint(userAttempt: string, correctSentence: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean)
  const attemptWords = clean(userAttempt)
  const correctWords = clean(correctSentence)

  const attemptSet = new Set(attemptWords)
  const correctSet = new Set(correctWords)

  // Find missing words (in correctSet but not in attemptSet)
  const missing = correctWords.filter(w => !attemptSet.has(w))
  // Find extra words (in attemptSet but not in correctSet)
  const extra = attemptWords.filter(w => !correctSet.has(w))

  const hasChineseInCorrect = /[\u4e00-\u9fa5]/.test(correctSentence)

  let hintParts: string[] = []

  if (missing.length > 0) {
    const uniqueMissing = Array.from(new Set(missing))
    hintParts.push(`💡 漏掉了或需要改正的关键词：${uniqueMissing.map(w => `**${w}**`).join(', ')}`)
  }

  if (extra.length > 0) {
    if (hasChineseInCorrect) {
      hintParts.push(`💡 请确保你用英文正确替换了原句中的中文部分。`)
    } else {
      const uniqueExtra = Array.from(new Set(extra))
      hintParts.push(`💡 句子中含有多余或拼错的词：${uniqueExtra.map(w => `**${w}**`).join(', ')}`)
    }
  }

  const typos: string[] = []
  for (const ext of extra) {
    for (const mis of missing) {
      if (getLevenshteinDistance(ext, mis) <= 2) {
        typos.push(`✍️ 拼写建议：你写的 **"${ext}"** 是不是应该是 **"${mis}"**？`)
      }
    }
  }
  if (typos.length > 0) {
    hintParts.push(...typos)
  }

  if (hintParts.length === 0) {
    return '提示：请仔细核对单词拼写、词序以及是否漏掉了关键修饰词。'
  }

  return hintParts.join('\n')
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i]
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return tmp[a.length][b.length]
}

export function getGrammarSkeleton(errorType: string, correctSentence: string): string {
  const lowercase = correctSentence.toLowerCase()
  
  if (errorType === 'grammar-tense') {
    if (lowercase.includes('yesterday') || lowercase.includes('ago') || lowercase.includes('last')) {
      return `   👉 **主语 (动作主角：谁) + 动词过去式 (已发生的动作) + 过去时间 (如 yesterday 昨天)**
   *例如：I (主语/我) + went (动词过去式/去了) + yesterday (时间/昨天)*
   *💡 语法小百科*：
   - **主语**：句子里的“主角”，说明是谁在做动作（例如：I, He, My friend）。
   - **过去式**：表示动作发生在过去，动词需要变身变形（例如 go 变成 went，buy 变成 bought）。`
    }
    if (lowercase.includes('have ') || lowercase.includes('has ') || lowercase.includes('had ')) {
      return `   👉 **主语 (动作主角：谁) + have/has/had (助动词) + 动词过去分词 (完成的动作) + 宾语 (动作承受者/什么东西)**
   *例如：I (主语) + have (助动词) + eaten (动词过去分词/吃完) + lunch (宾语/午饭)*
   *💡 语法小百科*：
   - **过去分词**：配合 have/has 表示“已经做完了某事”（如 eat 的分词是 eaten）。
   - **宾语**：动作针对的对象（如 吃“午饭 lunch”）。`
    }
    return `   👉 **主语 (谁) + 动词时态形式 (做的动作) + 其他成分**`
  }

  if (errorType === 'grammar-article') {
    return `   👉 **a / an / the (冠词/修饰名词的小帽) + 名词 (具体的人或物)**
   *例如：a (一个) + book (书)*
   *💡 语法小百科*：
   - **冠词**：专门戴在名词头上的小帽子（a, an, the）。
   - **a/an**：指“任意一个”。辅音开头的词用 a（如 a cup），元音(a, e, i, o, u)开头的词用 an（如 an apple）。
   - **the**：特指“那一个”（你和对方都知道的具体人或物，如 the sun 太阳）。`
  }

  if (errorType === 'grammar-preposition') {
    if (lowercase.includes('discuss')) {
      return `   👉 **discuss (及物动词/直接跟名词) + 宾语 (讨论的事情/名词)**
   *避坑：discuss 是及物动词（直接产生作用），后面直接接讨论的内容，不需要加任何多余的介词 about。直接说 discuss the problem。*`
    }
    if (lowercase.includes('listen')) {
      return `   👉 **listen (听/不及物动词) + to (介词/连接黏合剂) + 宾语 (听的对象/名词)**
   *避坑：listen 是不及物动词（动作较轻，不能直接连名词），必须依靠小介词 to 作“黏合剂”才能连上 music。*`
    }
    if (lowercase.includes('go home')) {
      return `   👉 **go (去/动词) + home (回家/副词)**
   *避坑：home 在这里是副词（已经包含了“往家走”的方向），前面不需要介词 to，千万别写成 go to home。*`
    }
    return `   👉 **动词 (做的动作) + 介词 (关系黏合剂) + 宾语 (承受动作者/名词)**
   *💡 语法小百科*：
   - **介词**：如 in, on, at, with, to，用来做桥梁连接，表示方位、时间或动作方向。
   - **不及物动词**：不能直接跟东西的动词，必须加上介词（如 listen **to**, depend **on**）。`
  }

  if (errorType === 'grammar-word-order') {
    if (lowercase.includes("don't") || lowercase.includes("doesn't") || lowercase.includes("didn't") || lowercase.includes("not")) {
      return `   👉 **主语 (谁) + 助动词否定形式 (don't/doesn't/didn't / 负责说“不”) + 动词原形 (动作) + 宾语 (动作承受者)**
   *例如：I (主语/我) + don't (说不) + like (喜欢/动词) + basketball (篮球/宾语)*
   *💡 语法小百科*：
   - **助动词**：帮助动词说话的词（如 do, does, did）。表示否定时要加 not 缩写成 don't，且后面的动词必须还原为最原始的样子（动词原形）。`
    }
    return `   👉 **疑问词 (问什么/如 What, Where) + 助动词 (do/does/did) + 主语 (谁) + 动词原形 (动作) + 其他?**
   *例如：What (什么) + do (助动词) + you (主语/你) + think (认为/动词) ?*`
  }

  if (errorType === 'grammar-agreement') {
    return `   👉 **第三人称单数主语 (He/She/It/单数名词/除我你之外的单个人或物) + 动词三单形式 (动词尾部加 -s 或 -es) + 宾语 (其他)**
   *例如：He (他) + likes (动词三单) + music (音乐/宾语)*
   *💡 语法小百科*：
   - **第三人称单数 (三单)**：说话时的旁观者且只有“一个”（比如他 He、她 She、我的朋友 My friend）。
   - **动词三单形式**：当主角是第三人称单数时，动词不能用原型，必须变形加 -s 或 -es（如 play 变成 plays）。`
  }

  if (errorType === 'expression-chinglish') {
    if (lowercase.includes('like') || lowercase.includes('love') || lowercase.includes('enjoy')) {
      return `   👉 **主语 (谁) + really (副词/修饰动作) + 动词 (like/love) + 宾语 (动作承受者)**
   *避坑：中文里常说“我很喜欢”，但英文里的 very 不能直接修饰动词（不能说 I very like）。必须用 really 放在动词前，或者把 very much 放在句尾。*`
    }
    if (lowercase.includes('turn on') || lowercase.includes('turn off')) {
      return `   👉 **turn on/off (开关电器/动词短语) + 宾语 (电器名词/如灯、电视)**
   *避坑：英文中开关电器、灯具要用 turn on/off，不能用开关物理房门大门的 open/close。*`
    }
    if (lowercase.includes('stir-fried') || lowercase.includes('vegetables') || lowercase.includes('dishes')) {
      return `   👉 **主语 (谁) + 动词 (做动作) + 宾语 (stir-fried vegetables / 炒菜) + 状语 (补充信息/午饭吃)**
   *例如：I (我) + had (吃/动词) + stir-fried vegetables (炒菜/宾语) + for lunch (状语/午饭吃)*`
    }
    return `   👉 **主语 (动作主角) + 动词 (动作) + 宾语 (动作承受者) + 状语 (时间、地点或方式等补充信息)**
   *💡 语法小百科*：
   - **中式英语 (Chinglish)**：指顺着中文一字一句直译。英语句型结构是有严格的“主-动-宾”顺序的，不能随意拼凑。
   - **状语**：修饰和补充说明动作是在“什么时候”、“在哪里”或“以什么方式”发生的词或短语（例如：在下午、在学校）。`
  }

  return `   👉 **主语 (动作主角：谁) + 动词 (所做动作) + 宾语 (动作针对的人或物) + 其他成分**
   *💡 语法小百科*：
   - **主语**：句子里的“主角”，说明是谁在做动作（例如：我、他、我的朋友）。
   - **宾语**：动作的对象，承受动作者（例如：喜欢“音乐”、打“篮球”）。`
}

export function highlightProblematicParts(orig: string, corrected: string): string {
  const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  const correctWords = corrected.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const correctSet = new Set(correctWords)

  const tokens = orig.split(/(\s+)/)
  
  const highlightedTokens = tokens.map(token => {
    if (!token || /^\s+$/.test(token)) return token

    const match = token.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/)
    if (!match) return token

    const prefix = match[1]
    const word = match[2]
    const suffix = match[3]

    if (!word) return token

    const cleaned = cleanWord(word)
    if (cleaned && !correctSet.has(cleaned)) {
      return `${prefix}<u>**${word}**</u>${suffix}`
    }
    return token
  })

  return highlightedTokens.join('')
}

export function generateStepByStepCritique(
  userAttempt: string,
  correctSentence: string,
  errorType: string,
  _targetText: string,
  _typeName: string,
  _isTranslationChallenge: boolean = false
): string {
  const diffDisplay = generateWordLevelDiff(userAttempt, correctSentence)
  const formulaText = getGrammarSkeleton(errorType, correctSentence)

  const lines: string[] = []
  lines.push(`接近了，再试一次吧～`)
  lines.push(`📊 **差分对比**（红删绿增）：${diffDisplay}`)
  lines.push(`📐 **语法结构**：\n\n${formulaText}`)

  return lines.join('\n\n')
}

/**
 * Word-level Longest Common Subsequence (LCS) Diff
 * Computes word alignment and outputs red/green diff format.
 * Red format: ~~[- word]~~
 * Green format: **[+ word]**
 */
export function generateWordLevelDiff(attempt: string, correct: string): string {
  const cleanWord = (w: string) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim().toLowerCase();
  
  const attemptWords = attempt.split(/\s+/).filter(Boolean);
  const correctWords = correct.split(/\s+/).filter(Boolean);

  const n = attemptWords.length;
  const m = correctWords.length;
  const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (cleanWord(attemptWords[i - 1]) === cleanWord(correctWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n, j = m;
  const diffParts: string[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cleanWord(attemptWords[i - 1]) === cleanWord(correctWords[j - 1])) {
      diffParts.push(correctWords[j - 1]);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffParts.push(`**[+ ${correctWords[j - 1]}]**`);
      j--;
    } else {
      diffParts.push(`~~[- ${attemptWords[i - 1]}]~~`);
      i--;
    }
  }

  return diffParts.reverse().join(' ');
}


