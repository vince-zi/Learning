// ============================================================
// Core Layer: Knowledge Graph Types
// 知识图谱节点、依赖边、发现路径
// ============================================================

import type { QuestionType } from '../models/session'
import type { BloomLevel } from '../models/learner'

// --- 知识图谱节点 ---
export interface KnowledgeNode {
  id: string
  layer: 1 | 2 | 3 | 4
  name: string
  nameEn: string
  description: string
  discoveryPath: DiscoveryPath      // 发现链：逐步提问序列
  practiceTask: TaskTemplate
  prerequisiteIds: string[]         // 前置依赖节点 ID
  bloomTarget: BloomLevel           // 该节点期望达到的认知层次
  difficulty: number                // 难度系数 1-10
  tags: string[]
}

// --- 发现路径 ---
export interface DiscoveryPath {
  phases: DiscoveryPhase[]
}

export interface DiscoveryPhase {
  name: string
  purpose: string
  questions: KnowledgeQuestion[]   // 该阶段的提问序列
  exitCondition: string            // 退出该阶段的条件
}

export interface KnowledgeQuestion {
  id: string
  type: QuestionType
  template: string                  // 问题模板，支持 {{variable}} 占位
  variables: string[]               // 模板中的变量名
  purpose: string
  expectedInsight?: string          // 期望用户获得的洞察
}

// --- 实践任务模板 ---
export interface TaskTemplate {
  instruction: string
  description: string
  difficulty: number
  expectedDuration: string         // e.g. "5min"
  scaffoldingHints: ScaffoldingHint[]
}

export interface ScaffoldingHint {
  level: 1 | 2 | 3                 // 支持强度递增
  hint: string
}

// --- 依赖边 ---
export interface DependencyEdge {
  from: string                     // 前置节点 ID
  to: string                       // 后置节点 ID
  type: 'requires' | 'recommends'
  description: string
}

// --- 知识图谱 ---
export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>
  edges: DependencyEdge[]
  layers: LayerInfo[]
}

export interface LayerInfo {
  layer: 1 | 2 | 3 | 4
  name: string
  description: string
  durationWeeks: number
  nodes: string[]                   // 该层的节点 ID 列表
}

// --- 路径规划相关 ---
export interface LearningPath {
  userId: string
  currentNodeId: string
  completedNodes: string[]
  nextCandidates: PathCandidate[]
  macroProgress: number             // 整体进度 0-1
}

export interface PathCandidate {
  nodeId: string
  score: number                     // 综合评分（效率+体验+保留+迁移）
  reason: string
  estimatedTime: string
}
