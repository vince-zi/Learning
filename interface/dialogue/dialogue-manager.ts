// ============================================================
// Interface Layer: Dialogue Manager
// 对话上下文管理 — 编排引擎层与接口层的协作
//
// 负责：
// 1. 管理对话状态（当前轮次、阶段、问题索引）
// 2. 调用引擎层进行诊断和决策
// 3. 调用接口层生成 Prompt 并请求 AI
// 4. 组装返回给前端的下一步指令
// ============================================================

import type { AIProvider } from '../ai/provider-interface'
import type { FeedbackInstruction } from '../../engine/feedback/feedback-generator'
import type { ScaffoldConfig } from '../../engine/scaffolding/scaffold-regulator'
import type { ChallengeSelection } from '../../engine/pathway/next-challenge'

// --- 对话状态 ---
export interface DialogueState {
  sessionId: string
  phase: DialoguePhase
  roundNumber: number
  questionIndex: number
  conversationHistory: DialogueMessage[]
  scaffoldConfig: ScaffoldConfig
  currentKnowledgeNodeId: string | null
  discoveriesSoFar: string[]
  userInsight: string | null
}

export type DialoguePhase =
  | 'welcome'           // 欢迎与首次拍照引导
  | 'first_round'       // 第一轮提问（4个问题）
  | 'reshoot_task'      // 给出再拍任务
  | 'waiting_reshoot'   // 等待用户上传再拍照片
  | 'second_round'      // 第二轮提问（对比分析）
  | 'discovery'         // 生成发现总结
  | 'completed'         // 会话完成

export interface DialogueMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// --- 对话动作（返回给前端的指令） ---
export type DialogueAction =
  | { type: 'ask_question'; question: string; questionIndex: number; round: number }
  | { type: 'wait_for_answer'; prompt?: string }
  | { type: 'issue_task'; instruction: string; hints: string[]; taskId: string }
  | { type: 'wait_for_upload'; prompt: string }
  | { type: 'show_discovery'; cardData: any }
  | { type: 'session_complete'; summary: string }

// --- 对话管理器 ---
export class DialogueManager {
  private state: DialogueState

  constructor(sessionId: string) {
    this.state = {
      sessionId,
      phase: 'welcome',
      roundNumber: 0,
      questionIndex: 0,
      conversationHistory: [],
      scaffoldConfig: { level: 1, type: 'cognitive', timing: 'immediate', strategy: 'narrow_scope', exitTrigger: '' },
      currentKnowledgeNodeId: null,
      discoveriesSoFar: [],
      userInsight: null,
    }
  }

  /** 获取当前状态 */
  getState(): DialogueState {
    return { ...this.state }
  }

  /** 获取当前阶段 */
  getPhase(): DialoguePhase {
    return this.state.phase
  }

  /** 记录用户消息 */
  recordUserMessage(content: string): void {
    this.state.conversationHistory.push({
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    })
  }

  /** 记录助手消息 */
  recordAssistantMessage(content: string, metadata?: Record<string, unknown>): void {
    this.state.conversationHistory.push({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      metadata,
    })
  }

  /** 推进到下一阶段 */
  advancePhase(newPhase: DialoguePhase): void {
    this.state.phase = newPhase
    if (newPhase === 'first_round' || newPhase === 'second_round') {
      this.state.roundNumber++
      this.state.questionIndex = 1
    }
  }

  /** 推进问题索引 */
  advanceQuestion(): void {
    this.state.questionIndex++
  }

  /** 设置当前知识节点 */
  setKnowledgeNode(nodeId: string): void {
    this.state.currentKnowledgeNodeId = nodeId
  }

  /** 记录用户发现 */
  recordDiscovery(insight: string): void {
    this.state.discoveriesSoFar.push(insight)
    this.state.userInsight = insight
  }

  /** 获取对话历史摘要（用于 AI 上下文） */
  getHistorySummary(maxMessages: number = 20): DialogueMessage[] {
    return this.state.conversationHistory.slice(-maxMessages)
  }

  /** 转换为 AI Provider 的消息格式 */
  toAIMessages(): { role: string; content: string }[] {
    return this.state.conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
  }

  /**
   * 检查当前阶段是否应该自动推进
   * 例如：第一轮所有问题问完后自动进入 reshoot_task
   */
  shouldAdvancePhase(): boolean {
    switch (this.state.phase) {
      case 'first_round':
        return this.state.questionIndex > 4
      case 'second_round':
        return this.state.questionIndex > 4
      default:
        return false
    }
  }

  /** 下一阶段映射 */
  getNextPhase(): DialoguePhase {
    switch (this.state.phase) {
      case 'welcome': return 'first_round'
      case 'first_round': return 'reshoot_task'
      case 'reshoot_task': return 'waiting_reshoot'
      case 'waiting_reshoot': return 'second_round'
      case 'second_round': return 'discovery'
      case 'discovery': return 'completed'
      case 'completed': return 'completed'
    }
  }
}
