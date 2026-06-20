// ============================================================
// Engine Layer: Scaffolding Regulator
// 脚手架动态调节引擎
//
// 根据学习者状态动态调整支持的：
// - 强度 (0-3)
// - 类型 (认知/元认知/情感)
// - 时机 (即时 vs 延迟)
//
// 核心原则：当学习者展现能力时撤出，遇到困难时介入
// ============================================================

import type { ScaffoldLevel } from '../../core/models/session'
import type { EmotionalState, BloomLevel } from '../../core/models/learner'
import { type ZPDZone } from '../../core/theories/zpd'

// --- 脚手架配置 ---
export interface ScaffoldConfig {
  level: ScaffoldLevel
  type: ScaffoldType
  timing: 'immediate' | 'delayed'
  strategy: SupportStrategy
  exitTrigger: string
}

export type ScaffoldType = 'cognitive' | 'metacognitive' | 'emotional'

export type SupportStrategy =
  | 'provide_options'       // 提供选项
  | 'narrow_scope'          // 缩小范围
  | 'use_analogy'           // 类比引导
  | 'model_thinking'        // 示范思考
  | 'simplify_task'          // 简化任务
  | 'confirm_progress'       // 确认进步
  | 'encourage'              // 简单鼓励
  | 'none'                   // 无支持（自主探索）

// --- 调节输入 ---
export interface RegulationInput {
  currentScaffoldLevel: ScaffoldLevel
  knowledgeEstimate: number       // 当前主题掌握度 0-1
  bloomLevel: BloomLevel
  emotionalState: EmotionalState
  consecutiveCorrect: number      // 连续正确次数
  consecutiveErrors: number       // 连续错误次数
  zpdZone: ZPDZone
  questionRound: number           // 当前轮次（第几轮提问）
}

// --- 调节输出 ---
export interface RegulationOutput {
  newScaffoldLevel: ScaffoldLevel
  config: ScaffoldConfig
  reason: string
}

/**
 * 调节脚手架配置
 */
export function regulate(config: RegulationInput): RegulationOutput {
  const newLevel = calculateScaffoldLevel(config)
  const type = determineScaffoldType(config)
  const timing = determineTiming(config)
  const strategy = selectStrategy(newLevel, config.emotionalState, type)
  const exitTrigger = determineExitTrigger(config)

  return {
    newScaffoldLevel: newLevel,
    config: {
      level: newLevel,
      type,
      timing,
      strategy,
      exitTrigger,
    },
    reason: generateReason(newLevel, config),
  }
}

function calculateScaffoldLevel(input: RegulationInput): ScaffoldLevel {
  let level = input.currentScaffoldLevel

  // 触发介入
  if (input.consecutiveErrors >= 3) level = Math.min(3, level + 2) as ScaffoldLevel
  else if (input.consecutiveErrors >= 2) level = Math.min(3, level + 1) as ScaffoldLevel
  else if (input.emotionalState === 'frustrated') level = Math.min(3, level + 1) as ScaffoldLevel
  else if (input.emotionalState === 'anxious') level = Math.min(3, level + 1) as ScaffoldLevel
  // 触发撤出
  else if (input.consecutiveCorrect >= 3) level = Math.max(0, level - 1) as ScaffoldLevel
  else if (input.emotionalState === 'confident' && input.knowledgeEstimate > 0.7)
    level = Math.max(0, level - 1) as ScaffoldLevel
  else if (input.emotionalState === 'bored')
    level = Math.max(0, level - 1) as ScaffoldLevel

  return level
}

function determineScaffoldType(input: RegulationInput): ScaffoldType {
  if (input.emotionalState === 'frustrated' || input.emotionalState === 'anxious') {
    return 'emotional'
  }
  if (input.knowledgeEstimate < 0.3) {
    return 'cognitive'
  }
  if (input.bloomLevel === 'remember' || input.bloomLevel === 'understand') {
    return 'cognitive'
  }
  return 'metacognitive'
}

function determineTiming(input: RegulationInput): 'immediate' | 'delayed' {
  // 即时反馈：程序性技能、错误发生、信心建立时
  if (input.consecutiveErrors >= 2) return 'immediate'
  if (input.emotionalState === 'frustrated') return 'immediate'
  if (input.knowledgeEstimate < 0.2) return 'immediate'

  // 延迟反馈：概念性理解、创造性任务、元认知反思
  if (input.bloomLevel === 'analyze' || input.bloomLevel === 'create') return 'delayed'
  if (input.emotionalState === 'confident') return 'delayed'

  return 'immediate'
}

function selectStrategy(
  level: ScaffoldLevel,
  emotion: EmotionalState,
  type: ScaffoldType
): SupportStrategy {
  if (level === 0) return 'none'

  if (type === 'emotional') {
    return level >= 3 ? 'confirm_progress' : 'encourage'
  }

  if (type === 'metacognitive') {
    return level >= 3 ? 'model_thinking' : 'narrow_scope'
  }

  // cognitive
  switch (level) {
    case 1: return 'narrow_scope'
    case 2: return 'provide_options'
    case 3: return 'use_analogy'
    default: return 'none'
  }
}

function determineExitTrigger(input: RegulationInput): string {
  const newLevel = calculateScaffoldLevel(input)
  if (newLevel === 0) return '用户展现自主能力'
  if (newLevel === 1) return '连续正确2次后可撤出'
  if (newLevel === 2) return '连续正确3次后降级'
  return '正确回答当前问题后降级'
}

function generateReason(newLevel: ScaffoldLevel, input: RegulationInput): string {
  const change = newLevel - input.currentScaffoldLevel
  if (change > 0) {
    if (input.consecutiveErrors >= 3) return '连续错误触发脚手架介入'
    if (input.emotionalState === 'frustrated') return '检测到挫败情绪，增加支持'
    return '学习者需要更多支持'
  }
  if (change < 0) {
    if (input.consecutiveCorrect >= 3) return '连续正确，渐进撤出支持'
    if (input.emotionalState === 'bored') return '任务太简单，撤出支持增加挑战'
    return '学习者展现自主能力，渐进释放'
  }
  return '维持当前脚手架水平'
}

// --- 预设的脚手架策略提示映射 ---
export const SCAFFOLD_STRATEGIES: Record<SupportStrategy, {
  prefix: string
  examples: string[]
}> = {
  none: {
    prefix: '',
    examples: []
  },
  narrow_scope: {
    prefix: '让我们只看',
    examples: [
      '是曝光问题，还是构图问题？',
      '让我们只看光线。你觉得这张照片的光线是柔和还是强烈？',
    ]
  },
  provide_options: {
    prefix: '看这两张照片，',
    examples: [
      '一张背景清晰，一张背景模糊。你能看出它们的光圈设置有什么不同吗？A. f/2.8  B. f/8',
    ]
  },
  use_analogy: {
    prefix: '想象一下，',
    examples: [
      '如果你要画这幅画，你会先画什么？这和照片的焦点有什么关系？',
      '就像天平一样——左边放了一个重物，右边需要什么来平衡？',
    ]
  },
  model_thinking: {
    prefix: '如果是我，',
    examples: [
      '我会先注意光线的方向，然后思考它是如何影响主体纹理的。你觉得呢？',
    ]
  },
  simplify_task: {
    prefix: '让我们简化一下。',
    examples: [
      '这次只关注一个参数。试着只调节光圈，看看照片有什么变化。',
    ]
  },
  confirm_progress: {
    prefix: '别忘了你已经取得的进步：',
    examples: [
      '你刚才已经成功识别了视觉重心。这个新挑战是建立在那个基础之上的。',
    ]
  },
  encourage: {
    prefix: '',
    examples: [
      '试试看，没有对错之分。这是你的发现之旅。',
      '你已经迈出了重要的一步。现在让我们继续。',
    ]
  },
}
