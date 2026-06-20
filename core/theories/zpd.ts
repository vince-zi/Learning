// ============================================================
// Core Layer: Zone of Proximal Development (ZPD) Calculations
// Vygotsky 最近发展区理论
// ZPD = 学习者当前能力 + 适当挑战 − 脚手架支持
// ============================================================

/**
 * 计算任务难度是否在学习者的 ZPD 范围内
 *
 * 原理：任务应处于"学习者不能独立完成，但在指导下可以完成"的区域
 *
 * @param learnerAbility - 学习者在相关技能上的能力值 (0-1)
 * @param taskDifficulty - 任务难度系数 (1-10)
 * @param scaffoldLevel - 当前脚手架支持级别 (0-3)
 * @returns ZPD 匹配度 (0-1) 以及是否在 ZPD 内
 */
export function calculateZPDMatch(
  learnerAbility: number,
  taskDifficulty: number,
  scaffoldLevel: number
): { matchScore: number; isInZPD: boolean; zone: ZPDZone } {
  // 将任务难度归一化到 0-1
  const normalizedDifficulty = taskDifficulty / 10

  // 有效难度 = 任务难度 − 脚手架补偿
  // 脚手架每级补偿 0.15 的难度
  const scaffoldCompensation = scaffoldLevel * 0.15
  const effectiveDifficulty = Math.max(0, normalizedDifficulty - scaffoldCompensation)

  // ZPD 最佳距离：任务比当前能力难 0.1-0.3
  // 即 Vygotsky 所说的"跳一跳够得着"
  const gap = effectiveDifficulty - learnerAbility

  let zone: ZPDZone
  if (gap < -0.1) {
    zone = 'too_easy'     // 过于简单 → 无聊
  } else if (gap <= 0.3) {
    zone = 'zpd'          // 最佳学习区
  } else if (gap <= 0.5) {
    zone = 'frustration_edge' // ZPD 边缘 → 需要更多脚手架
  } else {
    zone = 'too_hard'     // 过于困难 → 挫败
  }

  const matchScore = calculateMatchScore(gap)

  return {
    matchScore,
    isInZPD: zone === 'zpd' || zone === 'frustration_edge',
    zone,
  }
}

export type ZPDZone = 'too_easy' | 'zpd' | 'frustration_edge' | 'too_hard'

/**
 * 根据 ZPD 区域推荐脚手架调节
 */
export function recommendScaffoldAdjustment(
  zone: ZPDZone,
  currentScaffoldLevel: number
): { newLevel: number; reason: string } {
  switch (zone) {
    case 'too_easy':
      return {
        newLevel: Math.max(0, currentScaffoldLevel - 1),
        reason: '任务太简单，撤出部分支持以增加挑战'
      }
    case 'zpd':
      return {
        newLevel: currentScaffoldLevel,
        reason: '在学习区内，维持当前支持'
      }
    case 'frustration_edge':
      return {
        newLevel: Math.min(3, currentScaffoldLevel + 1),
        reason: 'ZPD 边缘，增加脚手架帮助突破'
      }
    case 'too_hard':
      return {
        newLevel: 3,
        reason: '任务太难，降低难度或提供最大支持'
      }
  }
}

function calculateMatchScore(gap: number): number {
  // 最佳 gap ≈ 0.15，用高斯函数评估
  const optimal = 0.15
  const sigma = 0.2
  return Math.exp(-((gap - optimal) ** 2) / (2 * sigma ** 2))
}

/**
 * 计算学习者在知识图谱上的当前 ZPD 范围
 * 返回所有在 ZPD 内的节点 ID
 */
export function findZPDNodes(
  knowledgeLevels: Record<string, number>,
  scaffoldLevel: number,
  nodeDifficulties: Record<string, number>
): string[] {
  const zpdNodes: string[] = []
  for (const [nodeId, difficulty] of Object.entries(nodeDifficulties)) {
    const ability = knowledgeLevels[nodeId] ?? 0
    const { isInZPD } = calculateZPDMatch(ability, difficulty, scaffoldLevel)
    if (isInZPD) {
      zpdNodes.push(nodeId)
    }
  }
  return zpdNodes
}
