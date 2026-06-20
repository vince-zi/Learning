// ============================================================
// Engine Layer: Next Challenge Selector
// 下一步挑战选择算法
//
// 基于以下因素选择最合适的学习挑战：
// - ZPD 匹配度
// - 用户情感状态
// - 技能依赖关系
// - 学习进度
// ============================================================

import type { KnowledgeGraph, KnowledgeNode } from '../../core/knowledge-graph/graph-types'
import { getZPDCandidates, scoreCandidates } from '../../core/knowledge-graph/graph-queries'
import { calculateZPDMatch } from '../../core/theories/zpd'
import type { EmotionalState, LearnerProfile } from '../../core/models/learner'
import type { ScaffoldLevel } from '../../core/models/session'

export interface ChallengeSelection {
  nodeId: string
  nodeName: string
  questionPhase: number       // 从哪个提问阶段开始 (0-3)
  scaffoldLevel: ScaffoldLevel
  practiceTask: string
  rationale: string
}

/**
 * 为当前学习状态选择最佳的下一个挑战
 */
export function selectNextChallenge(
  completedNodeIds: string[],
  currentKnowledgeLevels: Record<string, number>,
  graph: KnowledgeGraph,
  emotionalState: EmotionalState,
  currentScaffoldLevel: ScaffoldLevel,
  profile?: LearnerProfile
): ChallengeSelection {
  // 1. 获取 ZPD 候选
  let candidates = getZPDCandidates(completedNodeIds, graph)

  // 2. 如果情绪不良，降级难度
  if (emotionalState === 'frustrated' || emotionalState === 'anxious') {
    candidates = candidates.sort((a, b) => a.difficulty - b.difficulty)
  }

  // 3. 如果兴奋或无聊，升级难度
  if (emotionalState === 'excited' || emotionalState === 'bored') {
    candidates = candidates.sort((a, b) => b.difficulty - a.difficulty)
  }

  const scored = scoreCandidates(candidates, completedNodeIds, graph)

  // 4. 选择得分最高的候选
  const bestCandidate = scored[0]
  if (!bestCandidate) {
    // 回退到第一个未完成的节点
    return createFallbackChallenge(graph, completedNodeIds, currentScaffoldLevel)
  }

  const node = graph.nodes.get(bestCandidate.nodeId)
  if (!node) {
    return createFallbackChallenge(graph, completedNodeIds, currentScaffoldLevel)
  }

  // 5. 确定从哪个提问阶段开始
  const questionPhase = determineStartingPhase(
    node,
    currentKnowledgeLevels[bestCandidate.nodeId] ?? 0,
    emotionalState
  )

  // 6. 确定脚手架水平
  const scaffoldLevel = determineInitialScaffold(
    node,
    currentKnowledgeLevels[bestCandidate.nodeId] ?? 0,
    emotionalState,
    currentScaffoldLevel
  )

  // 7. 生成理由
  const rationale = generateRationale(
    bestCandidate.nodeId,
    node,
    questionPhase,
    emotionalState,
    profile
  )

  return {
    nodeId: bestCandidate.nodeId,
    nodeName: node.name,
    questionPhase,
    scaffoldLevel,
    practiceTask: node.practiceTask.instruction,
    rationale,
  }
}

function determineStartingPhase(
  node: KnowledgeNode,
  knowledgeLevel: number,
  emotionalState: EmotionalState
): number {
  // 如果知识水平高，可以跳过开放探索阶段
  if (knowledgeLevel > 0.5 && emotionalState === 'confident') return 2  // 从规律发现开始
  if (knowledgeLevel > 0.3) return 1   // 从聚焦观察开始
  return 0   // 从开放探索开始
}

function determineInitialScaffold(
  node: KnowledgeNode,
  knowledgeLevel: number,
  emotionalState: EmotionalState,
  currentScaffoldLevel: ScaffoldLevel
): ScaffoldLevel {
  // 新节点开始：中等脚手架
  if (knowledgeLevel < 0.1) {
    return currentScaffoldLevel > 0 ? currentScaffoldLevel : 1
  }

  if (emotionalState === 'frustrated' || emotionalState === 'anxious') {
    return 2
  }

  if (emotionalState === 'confident') {
    return Math.max(0, currentScaffoldLevel - 1) as ScaffoldLevel
  }

  return currentScaffoldLevel
}

function generateRationale(
  nodeId: string,
  node: KnowledgeNode,
  phase: number,
  emotion: EmotionalState,
  profile?: LearnerProfile
): string {
  const parts: string[] = []

  parts.push(`${node.name} 是当前最佳学习目标`)

  if (emotion === 'excited') parts.push('学习者处于兴奋状态，提供适中挑战')
  if (emotion === 'frustrated') parts.push('学习者需要成功体验，选择可达成目标')
  if (emotion === 'bored') parts.push('增加难度以维持参与度')

  if (profile?.behavioral.pattern === 'explorer') {
    parts.push('探索者偏好：提供开放性和多样化任务')
  }

  if (phase === 0) parts.push('从开放探索开始，建立初步认知')
  if (phase === 2) parts.push('已有基础认知，直接进入规律发现阶段')

  return parts.join('。')
}

function createFallbackChallenge(
  graph: KnowledgeGraph,
  completedNodeIds: string[],
  scaffoldLevel: ScaffoldLevel
): ChallengeSelection {
  // 找到第一个未完成的节点
  for (const layer of graph.layers) {
    for (const nodeId of layer.nodes) {
      if (!completedNodeIds.includes(nodeId)) {
        const node = graph.nodes.get(nodeId)!
        return {
          nodeId: node.id,
          nodeName: node.name,
          questionPhase: 0,
          scaffoldLevel,
          practiceTask: node.practiceTask.instruction,
          rationale: '基于知识图谱顺序的默认路径',
        }
      }
    }
  }

  // 所有节点完成
  const firstNode = graph.nodes.get(graph.layers[0].nodes[0])!
  return {
    nodeId: firstNode.id,
    nodeName: firstNode.name,
    questionPhase: 0,
    scaffoldLevel: 1,
    practiceTask: firstNode.practiceTask.instruction,
    rationale: '所有节点已完成，从基础重新开始',
  }
}

// --- 快捷函数：是否需要给出再拍任务 ---
export function shouldIssueReshootTask(
  roundNumber: number,
  userDepthScore: number,
  discoveryMade: boolean
): boolean {
  // 第2轮后，如果用户表现出深度思考，给再拍任务
  if (roundNumber >= 2 && userDepthScore > 0.3 && !discoveryMade) return true
  // 第3轮后，无论怎样都给任务
  if (roundNumber >= 3) return true
  return false
}
