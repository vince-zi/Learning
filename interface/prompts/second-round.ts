// ============================================================
// Interface Layer: Second Round Question Templates
// 第二轮提问 — 用户完成再拍任务后上传对比照片
//
// 问题框架：
// 1. 哪张更接近你想表达的效果？
// 2. 你觉得为什么会这样？
// 3. 追问 1-2 个深化问题
// ============================================================

import type { QuestionType } from '../../core/models/session'

export interface SecondRoundTemplate {
  questionIndex: number
  template: string
  variables: string[]
  type: QuestionType
  purpose: string
}

export const SECOND_ROUND_QUESTIONS: SecondRoundTemplate[] = [
  {
    questionIndex: 1,
    template: `你拍了两张不同的照片——一张主体在左边，一张在右边。哪张更接近你想表达的效果？`,
    variables: [],
    type: 'clarification',
    purpose: '引导用户进行比较并做出审美判断',
  },
  {
    questionIndex: 2,
    template: `你觉得为什么这张更接近你的想法？是位置变化带来的什么不同感觉？`,
    variables: [],
    type: 'evidence',
    purpose: '引导用户分析位置对视觉效果的影响',
  },
  {
    questionIndex: 3,
    template: `你发现了什么规律？如果让你用一句话总结刚才的发现，你会怎么说？`,
    variables: [],
    type: 'meta',
    purpose: '引导用户自己表述发现的规律',
  },
  {
    questionIndex: 4,
    template: `这个发现对你之前的理解有什么改变？如果下次拍摄——不用我再提示——你会主动怎么做？`,
    variables: [],
    type: 'meta',
    purpose: '验证用户能否迁移应用到新情境',
  },
]

/**
 * 构建比较分析 Prompt（用于 AI 对比两张照片）
 */
export function buildComparisonPrompt(
  firstPhotoUrl: string,
  secondPhotoUrl: string,
  userResponses: string[],
  taskInstruction: string
): string {
  return `用户拍摄了第一张照片后，我给出了这个任务："${taskInstruction}"
用户完成了任务并上传了第二张照片。

用户在第一轮的回答：
${userResponses.map((r, i) => `${i + 1}. ${r}`).join('\n')}

现在用户上传了对比照片。请先简短地观察两张照片在主题位置、光线、构图上的差异（只是内心观察，不要说出来），然后依次向用户提问。
记住：不要评价照片好坏，不要直接给出结论。问完一个问题后等待用户回答。`
}

// --- 通用再拍任务生成 Prompt ---
export function buildReshootTaskPrompt(
  discoverySoFar: string,
  knowledgeNodeName: string
): string {
  return `基于我们目前的对话，用户正在探索"${knowledgeNodeName}"这个领域。
他们已经有了这样的发现：${discoverySoFar || '尚未形成明确的发现'}。

现在请设计一个简单的再拍任务，让用户通过自己的实践来验证或深化这个发现。要求：
1. 任务简单明确——3分钟内可完成
2. 不直接告诉用户答案，而是让他们自己通过拍摄来观察
3. 任务与我们已经讨论的内容有关联
4. 用日常语言描述，不出现专业术语

请直接给出任务描述，以"我想请你再拍一张（或两张）照片："开头。`
}
