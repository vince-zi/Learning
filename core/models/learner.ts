// ============================================================
// Core Layer: Learner Profile Types
// 学习者画像 — 认知/情感/行为三维状态追踪
// 基于 Bloom 认知分类学 + 自我效能理论 + CEFR 语言框架
// ============================================================

// --- Bloom 认知层次 ---
export type BloomLevel =
  | 'remember'      // 记忆：能复述概念
  | 'understand'    // 理解：能解释含义
  | 'apply'         // 应用：能在新情境中运用
  | 'analyze'       // 分析：能分解部分与关系
  | 'evaluate'      // 评价：能判断和决策
  | 'create'        // 创造：能整合形成新作品

// --- 情感状态 ---
export type EmotionalState =
  | 'confident'     // 信心：愿意尝试，不惧失败
  | 'confused'      // 困惑：遇到认知冲突，正在思考
  | 'frustrated'    // 挫败：多次失败，需要帮助
  | 'excited'       // 兴奋：发现新规律，有成就感
  | 'bored'         // 无聊：任务太简单，缺挑战
  | 'anxious'       // 焦虑：担心学不会，自我怀疑

// --- 行为模式 ---
export type BehaviorPattern =
  | 'perfectionist'  // 完美主义者：拍得少，每张精心处理
  | 'explorer'       // 探索者：大量拍摄，尝试各种可能
  | 'social'         // 社交型：更关注互动
  | 'task_oriented'  // 任务导向：严格按要求，缺自主探索

// --- 认知画像 ---
export interface CognitiveProfile {
  knowledgeLevels: Record<string, number>      // 技能节点 ID → 掌握度 0-1
  bloomLevels: Record<string, BloomLevel>       // 技能节点 ID → 认知层次
  misconceptions: Misconception[]               // 已识别的误解
  strengthsWeaknesses: StrengthsWeaknesses
}

export interface Misconception {
  knowledgeNodeId: string
  description: string
  detectedAt: string
  resolved: boolean
}

export interface StrengthsWeaknesses {
  strengths: string[]      // 技能节点 ID
  weaknesses: string[]     // 技能节点 ID
}

// --- 元认知 ---
export interface Metacognition {
  selfRegulation: number       // 自我调节能力 0-1
  helpSeeking: number          // 求助策略质量 0-1
  errorAttribution: 'internal' | 'external' | 'balanced'
  reflectionDepth: number      // 反思深度 0-1
}

// --- 情感画像 ---
export interface EmotionalProfile {
  currentState: EmotionalState
  confidenceTrend: number[]     // 最近 7 天信心值
  optimalLearningWindow: {      // 最佳学习时段
    startHour: number
    endHour: number
  }
  frustrationTriggers: string[]
}

// --- 行为画像 ---
export interface BehavioralProfile {
  pattern: BehaviorPattern
  photoFrequency: number        // 每天拍摄次数
  taskCompletionRate: number    // 0-1
  explorationScore: number      // 超出任务要求的探索 0-1
  reflectionQuality: number     // 反思质量 0-1
  socialEngagement: number     // 社区互动倾向 0-1
}

// --- 完整学习者画像 ---
export interface LearnerProfile {
  userId: string
  cognitive: CognitiveProfile
  emotional: EmotionalProfile
  behavioral: BehavioralProfile
  lastUpdated: string
}

// --- 认知基线（首次对话收集） ---
export interface CognitiveBaseline {
  canIdentifyIntentResultGap: boolean     // 能否识别意图-结果差异
  observationAbility: number              // 观察自己作品的能力 0-1
  visualSensitivity: number               // 视觉敏感度 0-1
  languageStyle: 'abstract' | 'concrete'  // 语言表达习惯
  helpSeekingTendency: 'immediate' | 'try_first'
  confidenceLevel: number                 // 自信心 0-1
  motivationType: 'practical' | 'artistic'
}

// ============================================================
// English Learner Types — 英语学习者专用
// ============================================================

// CEFR 等级 (Common European Framework of Reference)
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_DESCRIPTIONS: Record<CefrLevel, { name: string; description: string }> = {
  'A1': { name: '初学者', description: '能理解和使用日常表达和非常基础的句子' },
  'A2': { name: '初级', description: '能就常见话题进行简单、直接的交流' },
  'B1': { name: '中级', description: '能应对大多数旅行场景，能就熟悉话题表达观点' },
  'B2': { name: '中高级', description: '能进行流畅自然的交流，能讨论抽象话题' },
  'C1': { name: '高级', description: '能灵活有效地使用语言，表达复杂思想' },
  'C2': { name: '精通', description: '能轻松理解几乎所有听到和读到的内容' },
}

// 英语能力维度
export type EnglishSkillArea =
  | 'vocabulary'       // 词汇
  | 'grammar'          // 语法
  | 'fluency'          // 流利度
  | 'pronunciation'    // 发音
  | 'comprehension'    // 理解
  | 'expression'       // 表达

// 英语错误类型
export type EnglishErrorType =
  | 'grammar-tense'       // 时态错误
  | 'grammar-article'     // 冠词
  | 'grammar-preposition' // 介词
  | 'grammar-word-order'  // 语序
  | 'grammar-agreement'   // 主谓一致
  | 'vocabulary-choice'   // 选词不准
  | 'vocabulary-collocation' // 搭配不当
  | 'expression-chinglish' // 中式英语
  | 'expression-incomplete' // 句子不完整
  | 'fluency-hesitation'  // 不自然的停顿

// 英语错误记录
export interface EnglishErrorPattern {
  type: EnglishErrorType
  frequency: number            // 出现频率
  examples: string[]            // 最近出现的例子
  description: string           // 中文解释
}

// 英语学习者画像
export interface EnglishLearnerProfile {
  userId: string
  cefrLevel: CefrLevel
  knownVocabularySize: number
  strengths: EnglishSkillArea[]
  weaknesses: EnglishSkillArea[]
  errorPatterns: EnglishErrorPattern[]
  sentencesProduced: number     // 已产出的英语句子数
  sessionsCompleted: number
  lastActiveAt: string
  updatedAt: string
}

// 英语诊断结果
export interface EnglishDiagnosisResult {
  cefrEstimate: CefrLevel
  fluencyScore: number          // 0-1
  accuracyScore: number         // 0-1
  complexityScore: number       // 0-1
  errorsInResponse: EnglishError[]
  emotionalState: EmotionalState
  needsCorrection: boolean
  correctionType?: 'recast' | 'clarification_request' | 'metalinguistic_hint' | 'direct'
}

export interface EnglishError {
  originalText: string
  suggestedCorrection: string
  errorType: EnglishErrorType
  severity: 'minor' | 'moderate' | 'major'
}
