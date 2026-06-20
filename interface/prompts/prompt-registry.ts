// ============================================================
// Interface Layer: Prompt Registry
// Prompt 版本管理与注册中心
//
// 所有 Prompt 集中管理，便于：
// - 版本追踪
// - A/B 测试
// - 快速热更新（无需重新部署）
// - 文档化每个 Prompt 的用途和效果
// ============================================================

export interface PromptVersion {
  version: string
  prompt: string
  updatedAt: string
  notes: string
}

export interface RegisteredPrompt {
  id: string
  name: string
  description: string
  currentVersion: string
  versions: PromptVersion[]
  tags: string[]
}

/**
 * Prompt 注册表
 */
export const promptRegistry: Map<string, RegisteredPrompt> = new Map([
  [
    'system-role',
    {
      id: 'system-role',
      name: '摄影思考伙伴角色定义',
      description: '定义 AI 的角色、核心原则、提问策略和禁止行为',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 system-prompt.ts',
          updatedAt: '2026-06-18',
          notes: '初始版本，提取自摄影版 Mitchell Thomas 系统设计文档',
        },
      ],
      tags: ['core', 'persona', 'v1'],
    },
  ],
  [
    'first-round',
    {
      id: 'first-round',
      name: '第一轮提问模板',
      description: '用户首次上传照片后的4个固定问题框架',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 first-round.ts',
          updatedAt: '2026-06-18',
          notes: '初始版本：意图→观察→差异→原因 四步链',
        },
      ],
      tags: ['core', 'first-session', 'v1'],
    },
  ],
  [
    'second-round',
    {
      id: 'second-round',
      name: '第二轮提问模板',
      description: '用户完成再拍任务后的对比提问和深化追问',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 second-round.ts',
          updatedAt: '2026-06-18',
          notes: '初始版本：比较→分析→总结→迁移',
        },
      ],
      tags: ['core', 'reshoot', 'v1'],
    },
  ],
  [
    'discovery',
    {
      id: 'discovery',
      name: '发现总结生成',
      description: '基于对话历史生成"今日发现"卡片',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 discovery-prompt.ts',
          updatedAt: '2026-06-18',
          notes: '初始版本：JSON格式输出，包含标题/摘要/标签/洞察',
        },
      ],
      tags: ['core', 'discovery', 'v1'],
    },
  ],
  [
    'reshoot-task',
    {
      id: 'reshoot-task',
      name: '再拍任务生成',
      description: '基于当前发现生成实践任务',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 second-round.ts 中的 buildReshootTaskPrompt',
          updatedAt: '2026-06-18',
          notes: '初始版本：基于知识图谱节点生成任务',
        },
      ],
      tags: ['core', 'task', 'v1'],
    },
  ],
  [
    'error-correction',
    {
      id: 'error-correction',
      name: '错误纠正引导',
      description: '当用户存在误解时的引导策略（实验驱动）',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          prompt: '见 error-classifier.ts 的 generateCorrectionStrategy',
          updatedAt: '2026-06-18',
          notes: '初始版本：不直接纠正，通过实验让用户自己发现',
        },
      ],
      tags: ['core', 'error', 'v1'],
    },
  ],
])

/**
 * 获取指定 Prompt 的当前版本
 */
export function getPrompt(id: string): RegisteredPrompt | undefined {
  return promptRegistry.get(id)
}

/**
 * 列出所有已注册的 Prompt
 */
export function listPrompts(): { id: string; name: string; currentVersion: string }[] {
  return Array.from(promptRegistry.values()).map(p => ({
    id: p.id,
    name: p.name,
    currentVersion: p.currentVersion,
  }))
}
