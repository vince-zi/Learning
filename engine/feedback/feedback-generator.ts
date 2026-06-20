// ============================================================
// Engine Layer: Feedback Generator
// 反馈生成引擎 — 诊断性/过程性/激励性反馈
//
// 基于引擎的诊断结果生成结构化的反馈指令，
// 由 Interface Layer 翻译为具体的自然语言。
// 引擎本身不生成自然语言，只输出反馈指令。
// ============================================================

import type { BloomLevel, EmotionalState } from '../../core/models/learner'
import type { ErrorType } from './error-classifier'

// --- 反馈类型 ---
export type FeedbackCategory = 'diagnostic' | 'process' | 'motivational'

// --- 反馈指令（引擎输出，非自然语言） ---
export interface FeedbackInstruction {
  category: FeedbackCategory
  tone: 'affirming' | 'neutral' | 'encouraging' | 'challenging'
  focus: string                   // 反馈焦点（知识节点ID或通用标签）
  highlights: string[]            // 需要强调的点（关键词，非句子）
  suggestions: string[]           // 改进方向（关键词，非句子）
  discoveryConfirmation?: string  // 确认用户发现的规律
  bloomShift?: BloomLevel         // 建议提升到的认知层次
}

// --- 输入 ---
export interface FeedbackInput {
  knowledgeLevel: number
  bloomLevel: BloomLevel
  emotionalState: EmotionalState
  depthScore: number
  misconceptions: string[]
  errorType: ErrorType
  consecutiveCorrect: number
  isDiscovery: boolean            // 用户是否自己表达了规律发现
  discoveredPattern?: string      // 用户发现的规律描述
}

/**
 * 生成结构化反馈指令
 */
export function generateFeedback(input: FeedbackInput): FeedbackInstruction[] {
  const instructions: FeedbackInstruction[] = []

  // 1. 诊断性反馈 — 关于"哪里对/错"和"为什么"
  instructions.push(generateDiagnosticFeedback(input))

  // 2. 过程性反馈 — 关于"怎么改进"和"什么策略"
  if (input.depthScore < 0.5 || input.errorType !== 'none') {
    instructions.push(generateProcessFeedback(input))
  }

  // 3. 激励性反馈 — 关于"进步"和"成长"
  instructions.push(generateMotivationalFeedback(input))

  // 4. 如果有发现，添加发现确认
  if (input.isDiscovery && input.discoveredPattern) {
    instructions.push(generateDiscoveryConfirmation(input))
  }

  return instructions
}

function generateDiagnosticFeedback(input: FeedbackInput): FeedbackInstruction {
  if (input.errorType !== 'none') {
    return {
      category: 'diagnostic',
      tone: 'neutral',
      focus: input.misconceptions[0] ?? 'unknown',
      highlights: ['观察到了有价值的思考过程'],
      suggestions: ['通过实验验证当前理解'],
    }
  }

  if (input.knowledgeLevel > 0.7 && input.depthScore > 0.5) {
    return {
      category: 'diagnostic',
      tone: 'affirming',
      focus: 'accurate_understanding',
      highlights: ['理解准确', '表达清晰', '有深度分析'],
      suggestions: ['可以尝试更复杂的场景'],
      bloomShift: input.bloomLevel === 'analyze' ? 'evaluate' : 'analyze',
    }
  }

  return {
    category: 'diagnostic',
    tone: 'encouraging',
    focus: 'progressing_understanding',
    highlights: ['思考方向正确'],
    suggestions: ['继续深入探索'],
  }
}

function generateProcessFeedback(input: FeedbackInput): FeedbackInstruction {
  if (input.errorType === 'conceptual') {
    return {
      category: 'process',
      tone: 'encouraging',
      focus: 'conceptual_understanding',
      highlights: ['发现的意识很好'],
      suggestions: ['通过实验验证', '观察具体证据', '发现因果规律'],
    }
  }

  if (input.errorType === 'procedural') {
    return {
      category: 'process',
      tone: 'encouraging',
      focus: 'parameter_relationships',
      highlights: ['理解目标正确'],
      suggestions: ['检查参数关系', '一次只改一个变量', '记录每次变化'],
    }
  }

  if (input.errorType === 'careless') {
    return {
      category: 'process',
      tone: 'encouraging',
      focus: 'attention_management',
      highlights: ['已经具备了正确知识'],
      suggestions: ['设计拍摄前检查流程', '养成参数确认习惯'],
    }
  }

  return {
    category: 'process',
    tone: 'encouraging',
    focus: 'thinking_depth',
    highlights: ['参与度很好'],
    suggestions: ['尝试从更多角度思考', '考虑因果关系'],
  }
}

function generateMotivationalFeedback(input: FeedbackInput): FeedbackInstruction {
  if (input.emotionalState === 'frustrated') {
    return {
      category: 'motivational',
      tone: 'affirming',
      focus: 'effort_and_persistence',
      highlights: ['你已经在挑战自己', '思考过程本身就有价值'],
      suggestions: [],
    }
  }

  if (input.consecutiveCorrect >= 2) {
    return {
      category: 'motivational',
      tone: 'challenging',
      focus: 'growth_mindset',
      highlights: ['连续表现很好', '能力在持续增长'],
      suggestions: ['准备迎接更大的挑战'],
    }
  }

  if (input.isDiscovery) {
    return {
      category: 'motivational',
      tone: 'affirming',
      focus: 'discovery_moment',
      highlights: ['自己发现了规律', '这比被动接收更有价值'],
      suggestions: [],
    }
  }

  return {
    category: 'motivational',
    tone: 'encouraging',
    focus: 'learning_process',
    highlights: ['每一次尝试都在进步'],
    suggestions: [],
  }
}

function generateDiscoveryConfirmation(input: FeedbackInput): FeedbackInstruction {
  return {
    category: 'diagnostic',
    tone: 'affirming',
    focus: 'pattern_discovery',
    highlights: ['自主发现规律'],
    suggestions: ['尝试在不同场景中应用这个发现'],
    discoveryConfirmation: input.discoveredPattern,
  }
}
