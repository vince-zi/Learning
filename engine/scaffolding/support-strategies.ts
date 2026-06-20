// ============================================================
// Engine Layer: Support Strategies
// 6种脚手架支持策略的完整实现
// 当用户无法回答时提供思维支架
// ============================================================

import type { ScaffoldLevel } from '../../core/models/session'

export interface SupportPrompt {
  strategy: string
  message: string
  level: ScaffoldLevel
}

/**
 * 策略1：提供选项
 * 将开放性问题转化为封闭式选择，降低认知负荷
 */
export function provideOptions(
  question: string,
  options: string[]
): SupportPrompt {
  return {
    strategy: 'provide_options',
    message: `${question}\n\n${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}`,
    level: 2,
  }
}

/**
 * 策略2：缩小范围
 * 将宽泛的问题聚焦到具体维度
 */
export function narrowScope(
  originalQuestion: string,
  focusArea: string
): SupportPrompt {
  return {
    strategy: 'narrow_scope',
    message: `让我们只看${focusArea}。${originalQuestion}`,
    level: 1,
  }
}

/**
 * 策略3：类比引导
 * 用日常类比让抽象概念变得具体
 */
export function useAnalogy(
  concept: string,
  analogy: string,
  bridge: string
): SupportPrompt {
  return {
    strategy: 'use_analogy',
    message: `想象一下，${analogy}。这和${concept}有什么关系？${bridge}`,
    level: 3,
  }
}

/**
 * 策略4：示范思考
 * 展示专家的思考过程
 */
export function modelThinking(
  observation: string,
  thoughtProcess: string[],
  invitation: string
): SupportPrompt {
  return {
    strategy: 'model_thinking',
    message: `我注意到${observation}。让我分享我的思考过程：\n${thoughtProcess.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${invitation}`,
    level: 3,
  }
}

/**
 * 策略5：简化任务
 * 将复杂任务分解为更小、更可管理的子任务
 */
export function simplifyTask(
  originalTask: string,
  simplifiedSteps: string[]
): SupportPrompt {
  return {
    strategy: 'simplify_task',
    message: `让我们把任务分解一下。${originalTask}\n\n一步步来：\n${simplifiedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    level: 2,
  }
}

/**
 * 策略6：确认进步
 * 在困难时提醒用户已经取得的成就，维持动机
 */
export function confirmProgress(
  achievements: string[],
  nextStep: string
): SupportPrompt {
  return {
    strategy: 'confirm_progress',
    message: `在你继续之前，让我们回顾一下你已经做到的：\n${achievements.map(a => `✓ ${a}`).join('\n')}\n\n${nextStep}`,
    level: 2,
  }
}

// --- 脚手架选择器：基于用户状态自动选择最佳策略 ---
export interface StrategySelectorInput {
  knowledgeEstimate: number      // 0-1
  emotionalState: string
  questionType: string           // clarification, evidence, implication etc.
  previousAttemptFailed: boolean
}

export function selectBestStrategy(
  input: StrategySelectorInput
): 'provide_options' | 'narrow_scope' | 'use_analogy' | 'model_thinking' {
  if (input.knowledgeEstimate < 0.2 || input.previousAttemptFailed) {
    // 知识极弱或已失败 → 选项或类比
    return input.knowledgeEstimate < 0.1 ? 'model_thinking' : 'provide_options'
  }

  if (input.emotionalState === 'frustrated') {
    return 'narrow_scope'  // 挫败时缩小范围
  }

  if (input.questionType === 'implication' || input.questionType === 'assumption') {
    return 'use_analogy'    // 抽象问题用类比
  }

  return 'narrow_scope'      // 默认缩小范围
}
