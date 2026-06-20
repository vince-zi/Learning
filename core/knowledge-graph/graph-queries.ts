// ============================================================
// Core Layer: Graph Query Utilities
// 知识图谱查询：前置依赖、下一候选、ZPD匹配
// ============================================================

import type { KnowledgeGraph, KnowledgeNode, PathCandidate } from './graph-types'

/**
 * 获取节点的所有前置依赖（递归）
 */
export function getPrerequisites(
  nodeId: string,
  graph: KnowledgeGraph
): string[] {
  const result: string[] = []
  const node = graph.nodes.get(nodeId)
  if (!node) return result

  for (const prereqId of node.prerequisiteIds) {
    result.push(prereqId)
    result.push(...getPrerequisites(prereqId, graph))
  }
  return [...new Set(result)]
}

/**
 * 获取节点的直接后置节点
 */
export function getDependents(
  nodeId: string,
  graph: KnowledgeGraph
): KnowledgeNode[] {
  return graph.edges
    .filter(e => e.from === nodeId && e.type === 'requires')
    .map(e => graph.nodes.get(e.to))
    .filter((n): n is KnowledgeNode => n !== undefined)
}

/**
 * 检查所有前置依赖是否已完成
 */
export function canUnlock(
  nodeId: string,
  completedNodeIds: string[],
  graph: KnowledgeGraph
): boolean {
  const node = graph.nodes.get(nodeId)
  if (!node) return false
  return node.prerequisiteIds.every(prereq => completedNodeIds.includes(prereq))
}

/**
 * 获取当前可学习的候选节点（ZPD范围内）
 * 条件：前置依赖已完成 AND 自身未完成
 */
export function getZPDCandidates(
  completedNodeIds: string[],
  graph: KnowledgeGraph
): KnowledgeNode[] {
  const candidates: KnowledgeNode[] = []
  for (const [id, node] of graph.nodes) {
    if (completedNodeIds.includes(id)) continue
    if (canUnlock(id, completedNodeIds, graph)) {
      candidates.push(node)
    }
  }
  return candidates.sort((a, b) => a.difficulty - b.difficulty)
}

/**
 * 计算候选节点的综合评分
 * 多目标优化：效率 + 体验 + 保留 + 迁移
 */
export function scoreCandidates(
  candidates: KnowledgeNode[],
  completedNodeIds: string[],
  graph: KnowledgeGraph,
  userLayerPreference?: number
): PathCandidate[] {
  return candidates.map(node => {
    // 效率：优先完成低层级（基础更扎实）
    const efficiencyScore = 1 - (node.layer - 1) / 4

    // 体验：难度匹配 ZPD（不能太易不能太难）
    const experienceScore = node.bloomTarget === 'apply' ? 0.8 :
      node.bloomTarget === 'analyze' ? 0.6 :
      node.bloomTarget === 'understand' ? 0.9 : 0.5

    // 保留：节点在后续路径中的"解锁能力"（度中心性）
    const dependentCount = graph.edges.filter(e => e.from === node.id).length
    const retentionScore = Math.min(dependentCount / 5, 1)

    // 迁移：难度适中的节点最有迁移价值
    const transferScore = node.difficulty <= 5 ? 0.7 : 0.5

    // 如果有用户偏好层级，加权
    const layerBonus = userLayerPreference === node.layer ? 0.15 : 0

    const score =
      efficiencyScore * 0.3 +
      experienceScore * 0.25 +
      retentionScore * 0.2 +
      transferScore * 0.1 +
      layerBonus

    return {
      nodeId: node.id,
      score: Math.round(score * 100) / 100,
      reason: score > 0.7 ? '最佳学习窗口' :
        score > 0.5 ? '适合当前水平' : '可尝试挑战',
      estimatedTime: node.practiceTask.expectedDuration,
    }
  }).sort((a, b) => b.score - a.score)
}

/**
 * 查找节点的发现路径中特定阶段的第一个问题
 */
export function getFirstQuestionInPhase(
  nodeId: string,
  phaseIndex: number,
  graph: KnowledgeGraph
): string | null {
  const node = graph.nodes.get(nodeId)
  if (!node) return null
  const phase = node.discoveryPath.phases[phaseIndex]
  if (!phase || !phase.questions[0]) return null
  return phase.questions[0].template
}

/**
 * 获取指定层级的节点总数
 */
export function getLayerNodeCount(
  layer: number,
  graph: KnowledgeGraph
): number {
  return graph.layers.find(l => l.layer === layer)?.nodes.length ?? 0
}

/**
 * 获取学习路径的整体进度
 */
export function getMacroProgress(
  completedNodeIds: string[],
  graph: KnowledgeGraph
): number {
  const total = graph.nodes.size
  if (total === 0) return 0
  // 只看 completed，算重复
  const uniqueCompleted = new Set(completedNodeIds)
  const count = [...uniqueCompleted].filter(id => graph.nodes.has(id)).length
  return count / total
}
