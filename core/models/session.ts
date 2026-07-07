// ============================================================
// Core Layer: Session & Message Types
// 学习会话状态机、消息、照片、任务的核心类型定义
// 基于 Bloom 掌握学习理论与 Vygotsky ZPD 理论
// ============================================================

// --- 学习模块类型 ---
export type ModuleType = 'photography' | 'english'

export const DEFAULT_MODULE: ModuleType = 'english'

export const MODULE_CONFIG: Record<ModuleType, {
  name: string
  nameEn: string
  icon: string
  defaultTheme: string
  defaultKnowledgeNodeId: string
}> = {
  photography: {
    name: '摄影',
    nameEn: 'Photography',
    icon: '📷',
    defaultTheme: '视觉重心与注意力引导',
    defaultKnowledgeNodeId: 'visual-focus',
  },
  english: {
    name: '英语',
    nameEn: 'English',
    icon: '🗣️',
    defaultTheme: '自我介绍与表达',
    defaultKnowledgeNodeId: 'self-intro',
  },
}

// --- 会话状态机 ---
// started → in_progress → completed | dropped
export type SessionStatus = 'started' | 'in_progress' | 'completed' | 'dropped'

// --- 消息系统 ---
export type MessageRole = 'user' | 'assistant'
export type MessageType = 'question' | 'answer' | 'summary' | 'task'

export interface Message {
  id: string
  sessionId: string
  role: MessageRole
  messageType: MessageType
  content: string
  relatedPhotoId?: string
  metadata?: MessageMetadata
  createdAt: string
}

export interface MessageMetadata {
  questionType?: QuestionType
  roundNumber?: number
  discoveryRef?: string
  taskRef?: string
}

// 六种苏格拉底提问类型（来自摄影版设计文档第四部分）
export type QuestionType =
  | 'clarification'   // 澄清性问题
  | 'assumption'       // 假设性问题
  | 'evidence'         // 证据性问题
  | 'perspective'      // 视角性问题
  | 'implication'      // 影响性问题
  | 'meta'             // 元问题

// --- 照片 ---
export interface Photo {
  id: string
  sessionId: string
  userId: string
  imageUrl: string
  thumbnailUrl?: string
  uploadOrder: number       // 第几轮上传：1=初次, 2=再拍
  exifData?: ExifSummary
  note?: string
  uploadedAt: string
}

export interface ExifSummary {
  aperture?: string
  shutterSpeed?: string
  iso?: number
  focalLength?: string
  make?: string
  model?: string
}

// --- 练习任务 ---
export type TaskStatus = 'pending' | 'accepted' | 'skipped' | 'completed'
export type TaskType = 'reshoot' | 'explore' | 'compare' | 'free'

export interface PracticeTask {
  id: string
  sessionId: string
  taskType: TaskType
  instruction: string
  scaffoldingHints: string[]     // 脚手架提示（分层）
  status: TaskStatus
  createdAt: string
  completedAt?: string
}

// --- 发现时刻 ---
export interface Discovery {
  id: string
  sessionId: string
  userId: string
  title: string
  summary: string
  photoUrls: string[]           // 关联的照片 URL
  tags: string[]                 // 摄影术语标签
  sourceRound: number            // 来自第几轮
  knowledgeNodeId?: string       // 关联的知识图谱节点
  createdAt: string
}

// --- 学习会话 ---
export interface LearningSession {
  id: string
  userId: string
  module: ModuleType              // 学习模块: photography | english
  status: SessionStatus
  theme?: string                 // 练习主题
  roundCount: number
  photoCount: number
  discoveryCount: number
  currentRound: number
  startedAt: string
  completedAt?: string
  questioningStyle?: 'gentle' | 'sharp' | 'action'
  currentKnowledgeNodeId?: string
  knowledgeNodeId?: string
  metadata?: SessionMetadata
}

export interface SessionMetadata {
  currentKnowledgeNodeId?: string
  scaffoldLevel?: ScaffoldLevel
  questionCountInRound?: number
}

// 脚手架支持级别（连续谱）
export type ScaffoldLevel = 0 | 1 | 2 | 3
// 0 = 无支持（自主探索）
// 1 = 最小支持（简单提示）
// 2 = 中等支持（选项/缩小范围）
// 3 = 最大支持（示范/直接讲解）

// --- 用户 ---
export interface User {
  id: string
  nickname?: string
  isAnonymous: boolean
  totalSessions: number
  totalDiscoveries: number
  skillUnlocks: string[]        // 已解锁的技能节点 ID
  createdAt: string
  lastActiveAt: string
}
