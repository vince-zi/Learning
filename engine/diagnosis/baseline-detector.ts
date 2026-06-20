// ============================================================
// Engine Layer: Baseline Detector
// 首次用户基线检测 — 从第一次对话中提取认知/行为/情感基线
// ============================================================

import type { CognitiveBaseline } from '../../core/models/learner'

/**
 * 从用户的第一次响应中提取认知基线
 *
 * @param firstResponse - 用户对"你希望观众注意到什么"的回答
 * @param secondResponse - 用户对"实际视线落在哪里"的回答
 * @param responseTimeMs - 用户的响应时间（毫秒）
 * @returns 认知基线数据
 */
export function detectBaseline(
  firstResponse: string,
  secondResponse: string,
  responseTimeMs: number
): CognitiveBaseline {
  // 能否识别意图-结果差异
  const canIdentifyGap = detectIntentResultGap(firstResponse, secondResponse)

  // 观察能力：是否能描述具体视觉元素
  const observationAbility = scoreObservationAbility(
    firstResponse,
    secondResponse
  )

  // 视觉敏感度：是否使用了视觉相关的词汇
  const visualSensitivity = scoreVisualSensitivity(
    firstResponse,
    secondResponse
  )

  // 语言表达习惯：抽象 vs 具体
  const languageStyle = detectLanguageStyle(firstResponse, secondResponse)

  // 求助倾向：基于响应时间判断
  const helpSeekingTendency = detectHelpTendency(responseTimeMs, firstResponse)

  // 自信心水平
  const confidenceLevel = detectConfidence(firstResponse, secondResponse)

  // 动机类型
  const motivationType = detectMotivationType(firstResponse, secondResponse)

  return {
    canIdentifyIntentResultGap: canIdentifyGap,
    observationAbility,
    visualSensitivity,
    languageStyle,
    helpSeekingTendency,
    confidenceLevel,
    motivationType,
  }
}

function detectIntentResultGap(first: string, second: string): boolean {
  // 如果两个回答描述不同的视觉焦点，说明用户能识别差异
  const words1 = new Set(first.toLowerCase().split(/\s+/).filter(w => w.length > 1))
  const words2 = new Set(second.toLowerCase().split(/\s+/).filter(w => w.length > 1))

  // Jaccard 相似度
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  const similarity = union.size > 0 ? intersection.size / union.size : 0

  // 相似度低 = 识别到差异 = 能力高
  return similarity < 0.5
}

function scoreObservationAbility(first: string, second: string): number {
  let score = 0

  // 视觉词汇
  const visualWords = /颜色|光|亮|暗|位置|大小|形状|清晰|模糊|前景|背景|中间|左边|右边|上面|下面/
  if (visualWords.test(first)) score += 0.3
  if (visualWords.test(second)) score += 0.3

  // 具体指代
  const specificRefs = /这个|那个|杯子|桌子|人|花|树|建筑|窗|门|灯/
  if (specificRefs.test(first)) score += 0.2
  if (specificRefs.test(second)) score += 0.2

  return Math.min(1, score)
}

function scoreVisualSensitivity(first: string, second: string): number {
  let score = 0

  // 描述视觉特性的高级词汇
  const sensitiveWords = /质感|层次|深度|空间|对比|色调|氛围|情绪|感觉|故事/
  if (sensitiveWords.test(first)) score += 0.4
  if (sensitiveWords.test(second)) score += 0.4

  // 对细节的注意
  const detailWords = /细节|纹理|阴影|高光|反光|边缘/
  if (detailWords.test(first)) score += 0.3
  if (detailWords.test(second)) score += 0.3

  return Math.min(1, score)
}

function detectLanguageStyle(
  first: string,
  second: string
): 'abstract' | 'concrete' {
  const combined = first + ' ' + second
  const abstractWords = /感觉|氛围|情绪|表达|意义|故事|意境/
  const concreteWords = /位置|颜色|大小|光圈|快门|ISO|设置|参数/

  const abstractCount = (combined.match(abstractWords) || []).length
  const concreteCount = (combined.match(concreteWords) || []).length

  return abstractCount > concreteCount ? 'abstract' : 'concrete'
}

function detectHelpTendency(
  responseTimeMs: number,
  response: string
): 'immediate' | 'try_first' {
  // 响应很快 + 说不知道 = 立即求助
  if (responseTimeMs < 5000 && /不知道|不会|怎么办|帮我/.test(response)) {
    return 'immediate'
  }
  return 'try_first'
}

function detectConfidence(first: string, second: string): number {
  let confidence = 0.5 // 默认中性

  // 自信表达
  const confidentWords = /我觉得|我认为|我知道|肯定是|一定|很确定/
  if (confidentWords.test(first)) confidence += 0.2
  if (confidentWords.test(second)) confidence += 0.1

  // 不自信表达
  const unconfidentWords = /可能|好像|也许|不太确定|不知道|不会拍/
  if (unconfidentWords.test(first)) confidence -= 0.15
  if (unconfidentWords.test(second)) confidence -= 0.15

  return Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100
}

function detectMotivationType(
  first: string,
  second: string
): 'practical' | 'artistic' {
  const combined = first + ' ' + second
  const artisticWords = /美|好看|感觉|表达|情绪|故事|艺术|氛围|意境|漂亮/
  const practicalWords = /功能|记录|拍清楚|参数|设置|技术|正确|标准/

  const artisticCount = (combined.match(artisticWords) || []).length
  const practicalCount = (combined.match(practicalWords) || []).length

  return artisticCount >= practicalCount ? 'artistic' : 'practical'
}
