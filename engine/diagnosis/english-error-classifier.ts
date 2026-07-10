// ============================================================
// Engine Layer: English Error Classifier
// 英语错误分类引擎 — 区分不同类型的语言错误
// 基于 CEFR 错误分析框架和常见二语习得错误模式
// ============================================================

import type { EnglishErrorType, EnglishError, EnglishDiagnosisResult, CefrLevel, EmotionalState, EnglishLearnerProfile } from '../../core/models/learner'
import type { Message } from '../../core/models/session'

// --- 错误模式定义 ---
interface ErrorPattern {
  type: EnglishErrorType
  severity: 'minor' | 'moderate' | 'major'
  patterns: RegExp[]
  cefrTarget: CefrLevel  // 该错误通常在此级别被克服
  description: string
}

const ENGLISH_ERROR_PATTERNS: ErrorPattern[] = [
  // 时态错误
  {
    type: 'grammar-tense',
    severity: 'moderate',
    patterns: [
      // yesterday / last / ago + present-tense verb (either direction)
      /(?:yesterday|last\s+\w+|ago).*(?:go|come|see|do|have|make|take|get|say|know|think|find|give|tell|leave|bring|begin|write|run|eat|drink|sleep|speak|read|meet|buy|fly|grow|hear|keep|pay|send|spend|stand|teach|understand|wear|win)\b/i,
      // present-tense verb within 5 words before yesterday / last / ago / this morning
      /\b(?:go|come|see|do|have|make|take|get|say|know|think)\b(?:\s+\w+){0,6}\s+(?:yesterday|last|ago)/i,
      // would/should/could + present tense verb (wrong: "I would go yesterday")
      /\b(?:would|should|could|must)\s+(?:go|comes|does|has|makes|takes|gets|says|knows|thinks|wants|needs|likes)\b/i,
      // I + present verb when past expected (standalone)
      /\bI\s+(?:go|come|see|do|have|make|take|get|say)\b(?:\s+\w+){0,4}\s+(?:yesterday|last|ago|earlier|previously|in\s+\d{4})/i,
      // 现在完成时用过去时
      /(?:since|for\s+\d+|already|yet|just|ever|never|recently)\s+.*\bwas\b/i,
      /(?:since|for\s+\d+|already|yet|just|ever|never|recently)\s+.*\b(?:went|came|saw|did|had|made|took|got|said)\b/i,
      // past time marker + is/are (should be was/were)
      /(?:yesterday|last|ago)\s+.*\b(?:is|are|am)\b/i,
    ],
    cefrTarget: 'B1',
    description: '时态使用不正确'
  },
  // 冠词错误
  {
    type: 'grammar-article',
    severity: 'minor',
    patterns: [
      /\b(a)\s+[aeiou]/i,              // a + 元音开头
      /\b(an)\s+[^aeiou]/i,             // an + 非元音开头
      /\bI\s+am\s+(student|teacher|doctor|nurse|engineer|programmer|developer|designer|manager|lawyer|writer|driver|cook|chef|player|singer|actor|artist|scientist|pilot|clerk|officer)\b/i,  // 缺少冠词的职业/身份
      /\b(the)\s+([a-z]+)\s+(the)\b/i,  // 重复the
    ],
    cefrTarget: 'B2',
    description: '冠词使用不正确'
  },
  // 介词错误
  {
    type: 'grammar-preposition',
    severity: 'moderate',
    patterns: [
      /discuss\s+about/i,              // discuss about
      /married\s+with/i,               // married with → married to
      /depend\s+on\s+of/i,             // depend on + of
      /listen\s+music/i,               // listen music → listen to music
      /go\s+to\s+home/i,               // go to home
      /arrive\s+to/i,                  // arrive to → arrive at/in
    ],
    cefrTarget: 'B2',
    description: '介词搭配不正确'
  },
  // 语序错误
  {
    type: 'grammar-word-order',
    severity: 'moderate',
    patterns: [
      /\b(I\s+not\s+(like|know|think|want|have|go|see|understand))/i,        // 否定语序
      /\b(what\s+you\s+(like|think|want|mean))/i,          // 间接问句语序
      /\b(I\s+don't\s+know\s+what\s+(is|was|are|were)\s+(it|he|she|they|the|this|that))/i, // 间接问句倒装纠正
    ],
    cefrTarget: 'B1',
    description: '句子语序不正确'
  },
  // 主谓一致
  {
    type: 'grammar-agreement',
    severity: 'minor',
    patterns: [
      /\b(he|she|it|the\s+\w+|everyone|someone|nobody)\s+(have|do|go|come|make|take|get|say|know|think|want|need|like)\b/i,
      /\b(I|you|we|they)\s+(has|does|goes|comes|makes|takes|gets|says|knows|thinks|wants|needs|likes)\b/i,
    ],
    cefrTarget: 'A2',
    description: '主谓一致不对'
  },
  // 选词不准
  {
    type: 'vocabulary-choice',
    severity: 'minor',
    patterns: [
      /\b(big)\s+(problem|decision|change|difference|mistake)\b/i,    // big → major/significant
      /\b(good)\s+(chance|opportunity|idea|solution)\b/i,            // good → great/excellent
      /\b(make)\s+(homework|a\s+mistake|progress|a\s+decision)\b/i,  // make → do/make fix
    ],
    cefrTarget: 'B2',
    description: '词汇选择不够精准'
  },
  // 中式英语
  {
    type: 'expression-chinglish',
    severity: 'moderate',
    patterns: [
      /\b(very\s+much\s+(like|love|hate|enjoy|want|need))/i,      // I very much like
      /\b(I\s+very\s+(like|love|hate|enjoy|want|need))/i,         // I very like
      /\b(according\s+to\s+me)\b/i,                                 // according to me
      /\b(how\s+to\s+say)\b/i,                                      // how to say
      /\b(how\s+do\s+you\s+think)\b/i,                              // how do you think → what do you think
      /\b(open\s+the\s+(light|TV|computer|phone|air\s*conditioner))\b/i, // open the light
      /\b(close\s+the\s+(light|TV|computer|phone|air\s*conditioner))\b/i, // close the light
    ],
    cefrTarget: 'B1',
    description: '中式英语表达'
  },
  // 句子不完整
  {
    type: 'expression-incomplete',
    severity: 'moderate',
    patterns: [
      /^(yes|no|okay|ok|maybe|sorry|thanks|thank\s*you)$/i,       // 单字回复
      /^(because|so|but|and|or)\s/i,                                // 以连词开头的句子片段
    ],
    cefrTarget: 'A2',
    description: '句子不完整或过于简单'
  },
]

// --- CEFR 水平关键词检测 ---
const CEFR_LEVEL_PATTERNS: Array<{ level: CefrLevel; patterns: RegExp[] }> = [
  {
    level: 'A1',
    patterns: [
      /\b(hello|goodbye|thank\s*you|please|sorry|yes|no)\b/i,
      /\b(I\s+am|my\s+name\s+is|I\s+like|I\s+have)\b/i,
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
    ]
  },
  {
    level: 'A2',
    patterns: [
      /\b(yesterday|tomorrow|usually|sometimes|often|always|never)\b/i,
      /\b(I\s+(went|did|had|could|would|should))\b/i,
      /\b(because|but|so|and\s+then)\b/i,
    ]
  },
  {
    level: 'B1',
    patterns: [
      /\b(if|when|while|although|however|therefore|since)\b/i,
      /\b(I\s+(have\s+been|had\s+been|will\s+be|would\s+like))\b/i,
      /\b(in\s+my\s+opinion|I\s+believe|I\s+think|from\s+my\s+perspective)\b/i,
    ]
  },
  {
    level: 'B2',
    patterns: [
      /\b(nevertheless|furthermore|consequently|in\s+contrast|on\s+the\s+other\s+hand)\b/i,
      /\b(I\s+(would\s+have|might\s+have|could\s+have|should\s+have))\b/i,
      /\b(it\s+is\s+(widely|generally|commonly)\s+(believed|accepted|thought|agreed))\b/i,
    ]
  },
  {
    level: 'C1',
    patterns: [
      /\b(notwithstanding|albeit|conversely|inasmuch|whereby)\b/i,
      /\b(had\s+I\s+(known|been|seen|thought)|were\s+it\s+not\s+for)\b/i,
      /\b(it\s+goes\s+without\s+saying|needless\s+to\s+say|suffice\s+it\s+to\s+say)\b/i,
    ]
  },
]

// --- CEFR 层级权重（Bloom 对应） ---
const CEFR_RANK: Record<CefrLevel, number> = {
  'A1': 0, 'A2': 1, 'B1': 2, 'B2': 3, 'C1': 4, 'C2': 5,
}

/**
 * 对用户英语回答进行诊断
 */
export function diagnoseEnglishResponse(
  userResponse: string,
  sessionHistory: Message[],
  learnerProfile?: Partial<EnglishLearnerProfile>
): EnglishDiagnosisResult {
  const errorsInResponse = detectEnglishErrors(userResponse, learnerProfile)
  const cefrEstimate = estimateCefrLevel(userResponse, sessionHistory, learnerProfile?.cefrLevel)
  const fluencyScore = calculateFluencyScore(userResponse, sessionHistory)
  const accuracyScore = calculateAccuracyScore(userResponse, errorsInResponse)
  const complexityScore = calculateComplexityScore(userResponse)
  const emotionalState = detectEnglishEmotionalState(userResponse, sessionHistory)

  const needsCorrection = errorsInResponse.length > 0 && emotionalState !== 'frustrated'

  let correctionType: EnglishDiagnosisResult['correctionType'] = undefined
  if (needsCorrection) {
    // 选择纠错策略：优先 recast，除非用户反复犯同样的错误
    const majorErrors = errorsInResponse.filter(e => e.severity === 'major')
    const hasRepeatedError = checkRepeatedErrors(errorsInResponse, learnerProfile)

    if (hasRepeatedError && errorsInResponse.length >= 2) {
      correctionType = 'metalinguistic_hint'
    } else if (errorsInResponse.some(e => e.severity === 'major')) {
      correctionType = 'clarification_request'
    } else {
      correctionType = 'recast'
    }
  }

  return {
    cefrEstimate,
    fluencyScore,
    accuracyScore,
    complexityScore,
    errorsInResponse,
    emotionalState,
    needsCorrection,
    correctionType,
  }
}

/**
 * 检测英语回答中的错误
 * 自动剥离中文字符以确保正则匹配不被打断
 */
export function detectEnglishErrors(
  response: string,
  profile?: Partial<EnglishLearnerProfile>
): EnglishError[] {
  const errors: EnglishError[] = []

  // 1) Strip CJK for pure-English pattern matching
  const sanitized = response.replace(/[一-鿿㐀-䶿＀-￯]/g, ' ').replace(/\s+/g, ' ').trim()
  const hasCjk = /[一-鿿㐀-䶿＀-￯]/.test(response)

  // Initial pattern check on sanitized (pure English)
  matchPatterns(sanitized, errors)

  // 2) For mixed input, also check the raw text — time words may be in Chinese
  if (hasCjk && errors.length === 0) {
    matchPatterns(response, errors)
  }

  // 3) Mixed input fallback: Chinese hints stripped away time clues, so flag likely-tense errors
  if (errors.length === 0 && hasCjk && hasDetectableEnglish(response)) {
    const englishOnly = response
      .replace(/[一-鿿㐀-䶿＀-￯\p{P}]/gu, ' ')
      .replace(/\s+/g, ' ').trim()
    const words = englishOnly.split(/\s+/).filter(Boolean)
    if (words.length >= 3) {
      const hasBaseVerb = /\b(?:go|come|see|do|have|make|take|get|say)\b/i.test(englishOnly)
      const hasPastVerb = /\b(?:went|came|saw|did|had|made|took|got|said|was|were)\b/i.test(englishOnly)
      const hasAux = /\b(?:will|would|can|could|shall|should|may|might|must|am|is|are)\b/i.test(englishOnly)
      if (hasBaseVerb && !hasPastVerb && !hasAux) {
        errors.push({
          originalText: response,
          suggestedCorrection: '',
          errorType: 'grammar-tense',
          severity: 'moderate',
        })
      }
    }
  }

  return errors
}

function matchPatterns(text: string, errors: EnglishError[]) {
  for (const pattern of ENGLISH_ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(text)) {
        if (!errors.some(e => e.errorType === pattern.type)) {
          errors.push({
            originalText: extractErrorContext(text, regex),
            suggestedCorrection: '',
            errorType: pattern.type,
            severity: pattern.severity,
          })
          break
        }
      }
    }
  }
}

/** Check if text contains at least one complete English word (3+ letters) */
function hasDetectableEnglish(text: string): boolean {
  return /[a-zA-Z]{3,}/.test(text)
}

/**
 * 估计 CEFR 水平
 */
export function estimateCefrLevel(
  response: string,
  history: Message[],
  knownLevel?: CefrLevel
): CefrLevel {
  let highestDetected: CefrLevel = 'A1'

  // 检查当前回答
  for (const { level, patterns } of CEFR_LEVEL_PATTERNS) {
    if (patterns.some(p => p.test(response))) {
      if (CEFR_RANK[level] > CEFR_RANK[highestDetected]) {
        highestDetected = level
      }
    }
  }

  // 检查历史
  const recentResponses = history
    .filter(m => m.role === 'user')
    .slice(-5)
    .map(m => m.content)

  for (const resp of recentResponses) {
    for (const { level, patterns } of CEFR_LEVEL_PATTERNS) {
      if (patterns.some(p => p.test(resp))) {
        if (CEFR_RANK[level] > CEFR_RANK[highestDetected]) {
          highestDetected = level
        }
      }
    }
  }

  // 如果有已知水平，取最大的
  if (knownLevel && CEFR_RANK[knownLevel] > CEFR_RANK[highestDetected]) {
    highestDetected = knownLevel
  }

  return highestDetected
}

/**
 * 计算流利度分数
 */
function calculateFluencyScore(response: string, history: Message[]): number {
  let score = 0

  // 句子长度
  const avgWordCount = response.trim().split(/\s+/).length
  if (avgWordCount > 30) score += 0.3
  else if (avgWordCount > 15) score += 0.2
  else if (avgWordCount > 5) score += 0.1

  // 连接词使用
  const connectorCount = (response.match(/\b(because|so|but|however|therefore|and|then|also|moreover|although|while|whereas|if|when|since|unless|until|after|before)\b/gi) || []).length
  if (connectorCount > 3) score += 0.2
  else if (connectorCount > 1) score += 0.15
  else if (connectorCount > 0) score += 0.1

  // 句子完整性
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 2) score += 0.2
  else if (sentences.length > 1) score += 0.1

  // 自发纠正（自我纠正标志 — 有元认知）
  if (/\b(I\s+mean|sorry|let\s+me\s+rephrase|actually|or\s+rather|what\s+I\s+meant)\b/i.test(response)) {
    score += 0.15
  }

  // 多样化开头
  const sentenceStarts = sentences.map(s => s.trim().substring(0, 10).toLowerCase())
  const uniqueStarts = new Set(sentenceStarts).size
  if (uniqueStarts > 2) score += 0.15
  else if (uniqueStarts > 1) score += 0.1

  return Math.min(1, score)
}

/**
 * 计算准确度分数
 */
function calculateAccuracyScore(response: string, errors: EnglishError[]): number {
  const wordCount = response.trim().split(/\s+/).length
  const errorCount = errors.length

  // 基于错误密度
  const errorDensity = wordCount > 0 ? errorCount / wordCount : 1
  const baseScore = Math.max(0, 1 - errorDensity * 10) // 10词1错=0.9分

  return Math.round(baseScore * 100) / 100
}

/**
 * 计算复杂度分数
 */
function calculateComplexityScore(response: string): number {
  let score = 0

  // 从句使用
  const clausePatterns = [
    /\b(which|that|who|whom|whose)\b/gi,   // 关系从句
    /\b(if|unless|whether)\b/gi,            // 条件从句
    /\b(because|since|as|due\s+to)\b/gi,    // 原因从句
    /\b(although|though|even\s+though|while|whereas)\b/gi, // 让步从句
    /\b(when|after|before|until|while|as\s+soon\s+as)\b/gi, // 时间从句
  ]

  let clauseScore = 0
  for (const pattern of clausePatterns) {
    if (pattern.test(response)) clauseScore++
  }
  score += Math.min(0.4, clauseScore * 0.1)

  // 词汇多样性
  const words = response.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const uniqueWords = new Set(words)
  const typeTokenRatio = words.length > 0 ? uniqueWords.size / words.length : 0
  score += typeTokenRatio > 0.7 ? 0.3 : typeTokenRatio > 0.5 ? 0.2 : 0.1

  // 修饰语使用（副词、形容词）
  const modifierCount = (response.match(/\b(\w+ly|\w+ful|\w+ous|\w+ive|\w+able|very|quite|rather|extremely|somewhat|slightly|completely|absolutely|definitely|probably|possibly)\b/gi) || []).length
  score += modifierCount > 3 ? 0.3 : modifierCount > 1 ? 0.2 : 0.1

  return Math.min(1, score)
}

/**
 * 检测英语对话中的情感状态
 */
function detectEnglishEmotionalState(
  response: string,
  history: Message[]
): EmotionalState {
  // 兴奋
  if (/\b(wow|amazing|really\?\?|I\s+see\!|got\s+it\!|makes\s+sense\!|interesting\!|that\'s\s+cool)\b/i.test(response)) {
    return 'excited'
  }

  // 困惑
  if (/\b(wait|hmm|let\s+me\s+think|I\'m\s+not\s+sure|what\s+do\s+you\s+mean|sorry\s+can\s+you|I\s+don\'t\s+understand|how\s+do\s+I)\b/i.test(response)) {
    return 'confused'
  }

  // 挫败
  if (/\b(this\s+is\s+too\s+hard|I\s+can\'t|I\s+give\s+up|it\'s\s+impossible|I\'ll\s+never|why\s+is\s+English\s+so)\b/i.test(response)) {
    return 'frustrated'
  }

  // 焦虑
  if (/\b(I\'m\s+nervous|I\'m\s+worried|I\'m\s+afraid|what\s+if\s+I|I\s+might\s+say\s+something\s+wrong)\b/i.test(response)) {
    return 'anxious'
  }

  // 无聊
  if (/\b(again\?|same\s+thing|I\s+already\s+know|too\s+easy)\b/i.test(response)) {
    return 'bored'
  }

  // 基于历史判断
  const recentUser = history.filter(m => m.role === 'user').slice(-3)
  const frustratedCount = recentUser.filter(m =>
    /can't|cannot|too\s+hard|give\s+up/.test(m.content)
  ).length

  if (frustratedCount >= 2) return 'frustrated'

  return 'confident'
}

/**
 * 检查是否有重复错误
 */
function checkRepeatedErrors(
  currentErrors: EnglishError[],
  profile?: Partial<EnglishLearnerProfile>
): boolean {
  if (!profile?.errorPatterns) return false

  const currentTypes = new Set(currentErrors.map(e => e.errorType))
  const knownTypes = new Set(profile.errorPatterns.map(p => p.type))

  return currentErrors.some(e => knownTypes.has(e.errorType))
}

/**
 * 提取错误上下文
 */
function extractErrorContext(response: string, regex: RegExp): string {
  const match = response.match(regex)
  if (match && match.index !== undefined) {
    const start = Math.max(0, match.index - 20)
    const end = Math.min(response.length, match.index + match[0].length + 20)
    return '...' + response.slice(start, end).trim() + '...'
  }
  return match?.[0] || ''
}

/**
 * 统计给定文本中的英语错误
 */
export function countEnglishErrors(response: string): Record<EnglishErrorType, number> {
  const counts: Record<EnglishErrorType, number> = {} as Record<EnglishErrorType, number>
  const errors = detectEnglishErrors(response)
  for (const e of errors) {
    counts[e.errorType] = (counts[e.errorType] || 0) + 1
  }
  return counts
}

/**
 * 获取纠错提示文本
 */
export function getCorrectionHint(errorType: EnglishErrorType): string {
  const hints: Record<EnglishErrorType, string> = {
    'grammar-tense': '注意时间词和动词形式的关系',
    'grammar-article': '注意 a/an/the 的使用',
    'grammar-preposition': '注意介词搭配',
    'grammar-word-order': '英语的问句和否定句语序与中文不同',
    'grammar-agreement': '主语和动词需要在数和人称上一致',
    'vocabulary-choice': '可以尝试更精准的词汇',
    'vocabulary-collocation': '有些词习惯搭配使用，如 heavy rain（不说 big rain）',
    'expression-chinglish': '这种表达在英语中不自然，可以尝试这样说...',
    'expression-incomplete': '试着把句子说完整，用连词把想法连接起来',
    'fluency-hesitation': '不用怕犯错，把你的想法继续说下去',
  }
  return hints[errorType] || '继续练习，你会越来越好的'
}
