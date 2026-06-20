// ============================================================
// Engine Layer: Path Planner
// 学习路径规划引擎
//
// 三级路径：
// - 宏观路径：从新手到专家的完整技能树
// - 中观路径：阶段内的模块序列
// - 微观路径：单次学习会话的内容流
//
// 基于知识图谱 + ZPD + 用户画像的个性化规划
// ============================================================

import type { KnowledgeGraph, LearningPath, PathCandidate } from '../../core/knowledge-graph/graph-types'
import {
  getZPDCandidates,
  scoreCandidates,
  getMacroProgress,
} from '../../core/knowledge-graph/graph-queries'
import type { LearnerProfile } from '../../core/models/learner'

export interface PlanMacroPathOutput {
  learningPath: LearningPath
  recommendations: string[]
  estimatedWeeks: number
}

/**
 * 规划宏观学习路径
 */
export function planMacroPath(
  userId: string,
  completedNodeIds: string[],
  graph: KnowledgeGraph,
  profile?: LearnerProfile
): PlanMacroPathOutput {
  // 获取所有 ZPD 候选节点
  const candidates = getZPDCandidates(completedNodeIds, graph)

  // 基于用户画像调整评分
  const userLayerPreference = profile
    ? inferLayerPreference(profile)
    : undefined

  const scored = scoreCandidates(candidates, completedNodeIds, graph, userLayerPreference)

  // 当前节点 = 最近一个未完成的候选
  const currentNodeId = candidates[0]?.id ?? graph.layers[0].nodes[0]

  const learningPath: LearningPath = {
    userId,
    currentNodeId,
    completedNodes: completedNodeIds,
    nextCandidates: scored.slice(0, 3),
    macroProgress: getMacroProgress(completedNodeIds, graph),
  }

  const estimatedWeeks = estimateRemainingWeeks(
    graph.nodes.size - completedNodeIds.length,
    profile
  )

  return {
    learningPath,
    recommendations: scored.slice(0, 3).map(c => c.reason),
    estimatedWeeks,
  }
}

/**
 * 规划中观路径（阶段内模块序列）
 */
export function planMesoPath(
  layer: number,
  completedNodeIds: string[],
  graph: KnowledgeGraph
): string[] {
  const layerNodes = graph.layers
    .find(l => l.layer === layer)
    ?.nodes ?? []

  // 按依赖关系拓扑排序
  return topologicalSort(layerNodes, graph.edges)
    .filter(id => !completedNodeIds.includes(id))
}

/**
 * 规划微观路径（单次会话的内容流）
 */
export function planMicroPath(
  nodeId: string,
  graph: KnowledgeGraph,
  questionIndex: number = 0
): MicroPathStep[] {
  const node = graph.nodes.get(nodeId)
  if (!node) return []

  const steps: MicroPathStep[] = []
  const phases = node.discoveryPath.phases

  for (const phase of phases) {
    for (const question of phase.questions) {
      steps.push({
        type: 'question',
        content: question.template,
        questionId: question.id,
        questionType: question.type,
        phaseName: phase.name,
        exitCondition: phase.exitCondition,
      })
      steps.push({ type: 'wait_for_answer', content: '', questionId: question.id })
    }

    // 阶段完成后插入实践任务
    if (phase.name === '规律发现') {
      steps.push({
        type: 'practice_task',
        content: node.practiceTask.instruction,
        taskDifficulty: node.practiceTask.difficulty,
        hints: node.practiceTask.scaffoldingHints.map(h => h.hint),
      })
      steps.push({ type: 'wait_for_upload', content: '' })
    }
  }

  return steps
}

export interface MicroPathStep {
  type: 'question' | 'wait_for_answer' | 'practice_task' | 'wait_for_upload'
  content: string
  questionId?: string
  questionType?: string
  phaseName?: string
  exitCondition?: string
  taskDifficulty?: number
  hints?: string[]
}

// --- 辅助函数 ---

function inferLayerPreference(profile: LearnerProfile): number | undefined {
  // 行为模式决定偏好层级
  switch (profile.behavioral.pattern) {
    case 'explorer':
      return 3  // 色彩情绪层 — 更自由
    case 'perfectionist':
      return 2  // 光线曝光层 — 更技术
    case 'social':
      return 1  // 视觉语言层 — 更易分享
    default:
      return undefined
  }
}

function estimateRemainingWeeks(
  remainingNodes: number,
  profile?: LearnerProfile
): number {
  const nodesPerWeek = profile?.behavioral.photoFrequency
    ? Math.max(1, Math.ceil(profile.behavioral.photoFrequency * 2))
    : 3
  return Math.ceil(remainingNodes / nodesPerWeek)
}

function topologicalSort(
  nodeIds: string[],
  edges: { from: string; to: string; type: string }[]
): string[] {
  const requiresEdges = edges.filter(e => e.type === 'requires')
  const inDegree: Record<string, number> = {}
  const adjacency: Record<string, string[]> = {}

  for (const id of nodeIds) {
    inDegree[id] = 0
    adjacency[id] = []
  }

  for (const edge of requiresEdges) {
    if (nodeIds.includes(edge.from) && nodeIds.includes(edge.to)) {
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1
      adjacency[edge.from] = adjacency[edge.from] || []
      adjacency[edge.from].push(edge.to)
    }
  }

  const queue = nodeIds.filter(id => inDegree[id] === 0)
  const result: string[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    for (const neighbor of adjacency[node] || []) {
      inDegree[neighbor]--
      if (inDegree[neighbor] === 0) queue.push(neighbor)
    }
  }

  return result
}
