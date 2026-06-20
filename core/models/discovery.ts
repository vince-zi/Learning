// ============================================================
// Core Layer: Discovery & Achievement Types
// 发现时刻、技能解锁、成就感系统
// 基于自我效能理论 (Bandura) + 掌握学习 (Bloom)
// ============================================================

// --- 发现时刻 ---
export interface DiscoveryMoment {
  id: string
  userId: string
  sessionId: string
  title: string
  description: string
  knowledgeNodeId: string
  questionChain: string[]        // 触发该发现的提问链
  userInsight: string            // 用户自己的发现表述
  beforePhotoUrl?: string
  afterPhotoUrl?: string
  createdAt: string
}

// --- 技能解锁 ---
export interface SkillUnlock {
  knowledgeNodeId: string
  name: string
  layer: number
  unlockedAt: string
  subSkills: SubSkillStatus[]
}

export interface SubSkillStatus {
  name: string
  status: 'mastered' | 'in_progress' | 'locked'
}

// --- 微成就 ---
export type AchievementType =
  | 'first_photo'          // 上传第一张照片
  | 'first_discovery'      // 第一次发现时刻
  | 'first_reshoot'        // 第一次再拍
  | 'week_streak'          // 连续学习一周
  | 'skill_mastered'       // 掌握一个完整技能节点
  | 'layer_complete'       // 完成一整层知识图谱
  | 'discovery_streak_3'   // 连续3天有发现
  | 'explorer_spirit'      // 超出任务自主探索

export interface Achievement {
  type: AchievementType
  title: string
  description: string
  icon: string
  earnedAt?: string
  progress: {
    current: number
    target: number
  }
}

// --- 里程碑 ---
export interface Milestone {
  day: number
  title: string
  description: string
  requiredDiscoveries: number
  unlockedSkills: string[]
  celebrationMessage: string
}

// --- 学习历程（用于 Before/After 对比） ---
export interface LearningProgress {
  userId: string
  totalSessions: number
  totalDiscoveries: number
  totalPhotos: number
  skillsUnlocked: SkillUnlock[]
  recentDiscoveries: DiscoveryMoment[]     // 最近 5 个
  streakDays: number
  firstPhoto?: string                      // 第一张照片 URL
  latestPhoto?: string                     // 最新照片 URL
  progressByLayer: LayerProgress[]
}

export interface LayerProgress {
  layer: number
  name: string
  totalNodes: number
  masteredNodes: number
  percentage: number
}

// --- 社区认可 ---
export interface PeerReview {
  id: string
  photoId: string
  reviewerId: string
  type: 'question' | 'insight' | 'encouragement'
  content: string
  createdAt: string
}

export interface MentorRecognition {
  mentorId: string
  photoId: string
  comment: string
  badgeType: 'gold' | 'silver' | 'bronze'
  awardedAt: string
}
