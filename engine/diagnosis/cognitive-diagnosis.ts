// ============================================================
// Engine Layer: Cognitive Diagnosis Engine
// 多维度认知诊断 — 纯函数，不依赖外部服务
//
// 诊断维度：知识 + 能力 + 元认知 + 情感
// 数据来源：显式（回答内容）+ 隐式（响应模式）+ 行为
// ============================================================

import type { EmotionalState, BloomLevel } from '../../core/models/learner'
import type { Message } from '../../core/models/session'

// --- 诊断结果 ---
export interface DiagnosisResult {
  knowledgeEstimate: number           // 当前主题掌握度估计 0-1
  bloomLevel: BloomLevel
  emotionalState: EmotionalState
  misconceptions: string[]
  depthScore: number                  // 回答深度 0-1
  needsScaffolding: boolean
  scaffoldType?: 'conceptual' | 'procedural' | 'metacognitive'
}

// --- 情感状态关键词检测 ---
const EMOTION_PATTERNS: Array<{ state: EmotionalState; patterns: RegExp[] }> = [
  {
    state: 'confident',
    patterns: [/我试试/, /我觉得/, /我发现了/, /没问题/, /可以/, /是的/]
  },
  {
    state: 'confused',
    patterns: [/不确定/, /可能/, /好像/, /也许/, /.../, /嗯/]
  },
  {
    state: 'frustrated',
    patterns: [/太难了/, /不会/, /不知道/, /搞不懂/, /总是/, /还是不行/]
  },
  {
    state: 'excited',
    patterns: [/原来如此/, /明白了/, /太棒了/, /有意思/, /居然/, /哇/]
  },
  {
    state: 'bored',
    patterns: [/简单/, /又是/, /重复/, /知道了/]
  },
  {
    state: 'anxious',
    patterns: [/学不会/, /担心/, /怕/, /紧张/, /怎么办/]
  },
]

// --- Bloom 层次关键词检测 ---
const BLOOM_PATTERNS: Array<{ level: BloomLevel; patterns: RegExp[] }> = [
  { level: 'remember', patterns: [/定义/, /是什么/, /我知道/] },
  { level: 'understand', patterns: [/意思是/, /因为/, /所以/, /我理解/] },
  { level: 'apply', patterns: [/我用了/, /我试了/, /我调节了/, /拍摄时/] },
  { level: 'analyze', patterns: [/分析/, /对比/, /区别/, /关系/, /原因/] },
  { level: 'evaluate', patterns: [/更好/, /合适/, /选择/, /判断/, /决定/] },
  { level: 'create', patterns: [/创造/, /设计/, /新的/, /我发明了/] },
]

/**
 * 对单条用户回答进行认知诊断
 *
 * @param userResponse - 用户回答文本
 * @param sessionHistory - 当前会话的消息历史
 * @param topicComplexity - 当前主题的复杂度 (1-10)
 * @returns 诊断结果
 */
export function diagnose(
  userResponse: string,
  sessionHistory: Message[],
  topicComplexity: number = 3
): DiagnosisResult {
  const emotionalState = detectEmotionalState(userResponse, sessionHistory)
  const bloomLevel = detectBloomLevel(userResponse, sessionHistory)
  const depthScore = calculateDepthScore(userResponse)
  const knowledgeEstimate = estimateKnowledge(
    userResponse,
    sessionHistory,
    topicComplexity
  )
  const misconceptions = detectMisconceptions(userResponse)
  const needsScaffolding = determineScaffoldNeed(
    knowledgeEstimate,
    depthScore,
    emotionalState
  )
  const scaffoldType = needsScaffolding
    ? determineScaffoldType(userResponse, knowledgeEstimate)
    : undefined

  return {
    knowledgeEstimate,
    bloomLevel,
    emotionalState,
    misconceptions,
    depthScore,
    needsScaffolding,
    scaffoldType,
  }
}

/**
 * 检测情感状态
 */
export function detectEmotionalState(
  response: string,
  history: Message[]
): EmotionalState {
  // 1. 基于当前回答的关键词
  for (const { state, patterns } of EMOTION_PATTERNS) {
    if (patterns.some(p => p.test(response))) {
      return state
    }
  }

  // 2. 基于最近历史的情感趋势
  const recentHistory = history.slice(-4)
  const frustratedCount = recentHistory.filter(m =>
    m.role === 'user' && /不会|不知道|太难/.test(m.content)
  ).length

  if (frustratedCount >= 2) return 'frustrated'
  if (recentHistory.length === 0) return 'confident'

  // 默认
  return 'confident'
}

/**
 * 检测 Bloom 认知层次
 */
export function detectBloomLevel(
  response: string,
  history: Message[]
): BloomLevel {
  // 检查当前回答
  for (const { level, patterns } of BLOOM_PATTERNS) {
    if (patterns.some(p => p.test(response))) {
      return level
    }
  }

  // 检查会话历史中的趋势 — 如果最近多次使用 apply+ 层次的词语
  const recentResponses = history
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content)

  let highestLevel: BloomLevel = 'remember'
  for (const resp of recentResponses) {
    for (const { level, patterns } of BLOOM_PATTERNS) {
      if (patterns.some(p => p.test(resp))) {
        if (bloomRank(level) > bloomRank(highestLevel)) {
          highestLevel = level
        }
      }
    }
  }

  return highestLevel
}

/**
 * 计算回答深度分数
 */
export function calculateDepthScore(response: string): number {
  let score = 0

  // 长度因子（过短=浅层）
  const len = response.trim().length
  if (len > 80) score += 0.3
  else if (len > 30) score += 0.2
  else if (len > 10) score += 0.1

  // 因果表述
  if (/因为|所以|导致|由于|因此/.test(response)) score += 0.2

  // 具体细节
  if (/\d+|光圈|快门|ISO|构图|光线|色彩|曝光/.test(response)) score += 0.15

  // 反思性表述
  if (/我觉得|我发现|我注意到|我意识到|我明白了/.test(response)) score += 0.15

  // 迁移性表述
  if (/下次|以后|其他|别的|不同/.test(response)) score += 0.1

  // 质疑/追问
  if (/\?|为什么|怎么|如何/.test(response)) score += 0.1

  return Math.min(1, score)
}

/**
 * 估计当前主题的知识掌握度
 */
export function estimateKnowledge(
  response: string,
  history: Message[],
  topicComplexity: number
): number {
  const depthScore = calculateDepthScore(response)

  // 准确率因子：历史上正确回答的比例（如果可用）
  const userAnswers = history.filter(m => m.role === 'user')
  const qualityAnswers = userAnswers.filter(m => calculateDepthScore(m.content) > 0.3)

  const accuracyFactor =
    userAnswers.length > 0
      ? qualityAnswers.length / userAnswers.length
      : 0.5

  // 综合估计
  const estimate = depthScore * 0.5 + accuracyFactor * 0.3 + (1 - topicComplexity / 10) * 0.2

  return Math.round(Math.min(1, Math.max(0, estimate)) * 100) / 100
}

/**
 * 检测可能的误解
 */
export function detectMisconceptions(response: string): string[] {
  const misconceptions: string[] = []

  // 常见摄影误解检测
  if (/快门.*景深|景深.*快门/.test(response)) {
    misconceptions.push('shutter-speed-controls-depth-of-field')
  }
  if (/光圈.*速度|光圈.*运动/.test(response)) {
    misconceptions.push('aperture-controls-motion-blur')
  }
  if (/ISO.*景深|ISO.*背景模糊/.test(response)) {
    misconceptions.push('iso-controls-depth-of-field')
  }
  if (/构图.*规则|必须.*三分|必须.*中间/.test(response)) {
    misconceptions.push('composition-is-rigid-rules')
  }
  if (/好照片.*必须|一定要/.test(response)) {
    misconceptions.push('absolute-rules-in-photography')
  }

  return misconceptions
}

// --- 辅助函数 ---

function bloomRank(level: BloomLevel): number {
  const ranks: Record<BloomLevel, number> = {
    remember: 0,
    understand: 1,
    apply: 2,
    analyze: 3,
    evaluate: 4,
    create: 5,
  }
  return ranks[level]
}

function determineScaffoldNeed(
  knowledge: number,
  depth: number,
  emotion: EmotionalState
): boolean {
  if (emotion === 'frustrated' || emotion === 'anxious') return true
  if (knowledge < 0.3) return true
  if (depth < 0.2) return true
  return false
}

function determineScaffoldType(
  response: string,
  knowledge: number
): 'conceptual' | 'procedural' | 'metacognitive' {
  if (knowledge < 0.2) return 'conceptual'
  if (/步骤|操作|怎么调|设置/.test(response)) return 'procedural'
  return 'metacognitive'
}
