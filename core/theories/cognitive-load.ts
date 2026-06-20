// ============================================================
// Core Layer: Cognitive Load Theory
// 认知负荷优化 — 基于 Sweller 认知负荷理论
//
// 三种认知负荷：
// - Intrinsic Load (内在负荷)：任务本身的复杂度
// - Extraneous Load (外在负荷)：无关信息/糟糕设计带来的负担
// - Germane Load (有效负荷)：用于图式构建和自动化的认知资源
//
// 目标：最小化外在负荷，优化内在负荷，最大化有效负荷
// ============================================================

/**
 * 评估当前任务的认知负荷
 */
export interface CognitiveLoadAssessment {
  intrinsicLoad: number     // 0-1，任务内在复杂度
  extraneousLoad: number    // 0-1，外在干扰负荷
  germaneLoad: number       // 0-1，有效学习负荷
  totalLoad: number         // 0-1，综合负荷
  isOverloaded: boolean     // 是否认知过载
  recommendation: string    // 调节建议
}

/**
 * 计算认知负荷
 *
 * @param taskComplexity - 任务包含的变量/概念数量 (1-10)
 * @param uiDistraction - 界面干扰程度 (0-1)
 * @param priorKnowledge - 学习者已有的先验知识 (0-1)
 * @param questionsPerRound - 当前轮次问题数量
 */
export function assessCognitiveLoad(
  taskComplexity: number,
  uiDistraction: number,
  priorKnowledge: number,
  questionsPerRound: number
): CognitiveLoadAssessment {
  // 内在负荷 = 任务复杂度 / (1 + 先验知识)
  const intrinsicLoad = Math.min(1, (taskComplexity / 10) / (1 + priorKnowledge * 2))

  // 外在负荷 = 界面干扰 + 过多问题的负担
  const extraneousLoad = Math.min(1, uiDistraction + (questionsPerRound > 4 ? 0.2 : 0))

  // 有效负荷 = 剩余认知资源中用于学习的部分
  const germaneLoad = Math.max(0, 0.5 - extraneousLoad * 0.5)

  // 总负荷
  const totalLoad = Math.min(1, intrinsicLoad + extraneousLoad)

  const isOverloaded = totalLoad > 0.8

  let recommendation: string
  if (isOverloaded) {
    recommendation = '认知过载：减少同轮问题数、简化任务或增加脚手架支持'
  } else if (extraneousLoad > 0.4) {
    recommendation = '外在负荷偏高：简化界面、减少无关信息'
  } else if (germaneLoad < 0.2) {
    recommendation = '有效负荷不足：增加深度问题、促进图式构建'
  } else {
    recommendation = '认知负荷在最佳范围内'
  }

  return {
    intrinsicLoad: Math.round(intrinsicLoad * 100) / 100,
    extraneousLoad: Math.round(extraneousLoad * 100) / 100,
    germaneLoad: Math.round(germaneLoad * 100) / 100,
    totalLoad: Math.round(totalLoad * 100) / 100,
    isOverloaded,
    recommendation,
  }
}

/**
 * 根据认知负荷推荐每轮最佳问题数量
 * Michel Thomas 原则：不让学生记忆孤立信息
 */
export function recommendQuestionCount(
  cognitiveLoad: CognitiveLoadAssessment,
  userStamina: number   // 用户学习耐力 0-1
): number {
  const baseCount = cognitiveLoad.isOverloaded ? 2 : 3
  const staminaBonus = Math.floor(userStamina * 2)  // 0-2 额外问题
  return Math.min(6, baseCount + staminaBonus)
}

/**
 * 评估信息密度是否过高
 * Thomas 原则：教授结构而非孤立词汇
 */
export function isInformationDense(
  conceptsPerMessage: number,
  userLevel: number
): boolean {
  // 初学者：每消息最多 1-2 个概念
  // 进阶者：每消息最多 3-4 个概念
  const maxConcepts = userLevel < 0.3 ? 2 : userLevel < 0.7 ? 3 : 4
  return conceptsPerMessage > maxConcepts
}
