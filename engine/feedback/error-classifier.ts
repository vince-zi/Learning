// ============================================================
// Engine Layer: Error Classifier
// 错误分类引擎 — 区分概念性/程序性/粗心错误
// ============================================================

import type { Message } from '../../core/models/session'

export type ErrorType = 'conceptual' | 'procedural' | 'careless' | 'none'

export interface ErrorClassification {
  type: ErrorType
  label: string
  description: string
  suggestedResponse: string    // 引擎建议的应对方式
  requiresExperiment: boolean  // 是否需要实践验证
}

// --- 概念性错误特征 ---
const CONCEPTUAL_PATTERNS = [
  /快门.*景深|景深.*快门/,                     // 快门控制景深
  /光圈.*运动|光圈.*模糊|光圈.*速度/,           // 光圈控制运动模糊
  /ISO.*景深|ISO.*背景/,                        // ISO控制景深
  /构图.*必须|必须.*中间|必须.*三分/,           // 构图是刚性规则
  /好照片.*(一定|必须|应该|只有)/,              // 绝对规则
  /后期.*作弊|P图.*不真实/,                     // 后期是不真实的
  /像素.*越好|像素.*质量/,                      // 像素=质量
]

// --- 程序性错误特征 ---
const PROCEDURAL_PATTERNS = [
  /设置了.*但是|设了.*还是|调了.*仍然/,         // 设置后效果不对
  /忘记了|忘了/,                                // 遗漏步骤
  /不知道怎么|调什么|按什么/,                   // 操作不确定
  /照片.*白|全白|过曝/,                          // 操作导致过曝
  /照片.*黑|全黑|欠曝/,                          // 操作导致欠曝
  /不知道怎么.*参数/,                           // 参数操作困惑
]

// --- 粗心错误特征 ---
const CARELESS_PATTERNS = [
  /总是忘记|又忘记|还是忘记/,                   // 重复遗忘
  /没注意|没看到|忽略了/,                       // 注意力不足
  /应该.*但是没/,                               // 知道应该做但没做
  /又.*ISO|又.*光圈|又.*快门/,                  // 重复参数错误
]

/**
 * 分类用户回答中的错误
 */
export function classifyError(
  userResponse: string,
  sessionHistory: Message[],
  topicKnowledgeLevel: number
): ErrorClassification {
  // 检测概念性错误
  for (const pattern of CONCEPTUAL_PATTERNS) {
    if (pattern.test(userResponse)) {
      return {
        type: 'conceptual',
        label: '概念性误解',
        description: '对摄影原理的理解有误',
        suggestedResponse: '不直接否定，通过实验让用户自己发现',
        requiresExperiment: true,
      }
    }
  }

  // 检测程序性错误
  for (const pattern of PROCEDURAL_PATTERNS) {
    if (pattern.test(userResponse)) {
      return {
        type: 'procedural',
        label: '操作步骤问题',
        description: '理解原理但执行有误',
        suggestedResponse: '引导用户检查参数关系，自己找到解决方案',
        requiresExperiment: false,
      }
    }
  }

  // 检测粗心错误
  for (const pattern of CARELESS_PATTERNS) {
    if (pattern.test(userResponse)) {
      return {
        type: 'careless',
        label: '注意力疏忽',
        description: '因注意力不集中导致的简单错误',
        suggestedResponse: '邀请用户参与设计检查流程，培养元认知',
        requiresExperiment: false,
      }
    }
  }

  // 基于知识水平的分类
  if (topicKnowledgeLevel < 0.3) {
    return {
      type: 'conceptual',
      label: '概念性薄弱',
      description: '对该主题的理解还不够深入',
      suggestedResponse: '提供概念性脚手架，通过提问引导理解',
      requiresExperiment: true,
    }
  }

  return {
    type: 'none',
    label: '无明确错误',
    description: '回答未检测到系统性的错误',
    suggestedResponse: '继续当前提问链',
    requiresExperiment: false,
  }
}

/**
 * 基于错误类型生成纠错策略
 * Michel Thomas 核心思想：不直接指出错误，通过提问让用户自己发现
 */
export function generateCorrectionStrategy(
  error: ErrorClassification,
  knowledgeNodeId: string
): CorrectionStrategy {
  switch (error.type) {
    case 'conceptual':
      return {
        approach: 'experiment_discovery',
        steps: [
          `引导一个简单的实验来验证用户的假设`,
          `让用户自己观察结果并描述`,
          `通过提问让用户修正自己的理解`,
        ],
        avoidDirectStatement: true,
        examplePrompt: `你说X决定了Y。让我们做个实验：拍摄同一个物体，一次用A，一次用B。Y有变化吗？你观察到了什么？`,
      }
    case 'procedural':
      return {
        approach: 'guided_troubleshooting',
        steps: [
          `确认用户的目标是什么`,
          `引导用户检查关键参数`,
          `让用户自己提出解决方案`,
        ],
        avoidDirectStatement: true,
        examplePrompt: `你希望得到X效果，但照片出现了Y。让我们检查一下：你觉得Y是因为进光太多，还是感光时间太长？如果缩短时间，还能得到X效果吗？所以我们需要在保持长曝光的同时减少进光量，可以调节什么参数？`,
      }
    case 'careless':
      return {
        approach: 'self_monitoring_design',
        steps: [
          `不批评，指出观察到的模式`,
          `邀请用户参与设计解决方案`,
          `让用户自己实施`,
        ],
        avoidDirectStatement: true,
        examplePrompt: `我注意到你最近几次拍摄，X设置都不是你预期的。你觉得是什么原因？我们可以设计一个什么机制，帮助你在拍摄前检查X？`,
      }
    case 'none':
      return {
        approach: 'continue',
        steps: [`继续当前提问链`],
        avoidDirectStatement: false,
        examplePrompt: ``,
      }
  }
}

export interface CorrectionStrategy {
  approach: string
  steps: string[]
  avoidDirectStatement: boolean
  examplePrompt: string
}
