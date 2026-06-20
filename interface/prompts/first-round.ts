// ============================================================
// Interface Layer: First Round Question Templates
// 第一轮提问 — 用户首次上传照片后的对话流程
//
// 4个固定问题框架（来自设计文档）：
// 1. 你拍这张照片时，最希望别人先注意到什么？
// 2. 你现在看这张照片，视线先落在哪里？
// 3. 你觉得这两者一致吗？
// 4. 如果不一致，你觉得可能是什么原因？
// ============================================================

export interface FirstRoundTemplate {
  questionIndex: number
  template: string
  variables: string[]
  purpose: string
  expectedInsight?: string
  followUpIfStuck?: string
}

export const FIRST_ROUND_QUESTIONS: FirstRoundTemplate[] = [
  {
    questionIndex: 1,
    template: `你好！我看到了这张照片。在告诉我你的拍摄想法之前，我想先问你：当你按下快门的那一刻，你希望观众注意到这张照片的什么？`,
    variables: [],
    purpose: '引导用户表达拍摄意图，建立"意图"概念',
    followUpIfStuck: '不一定是技术层面，就说说你当时想拍什么？',
  },
  {
    questionIndex: 2,
    template: `好的，我理解了你的想法。那现在，请你再仔细看看这张照片——撇开你的拍摄想法，现在你的视线首先会落在照片的哪个位置？`,
    variables: [],
    purpose: '引导用户观察实际的视觉焦点，发现可能与意图的差异',
    followUpIfStuck: '不用想太多，就凭第一感觉。你的眼睛最先看到了什么？',
  },
  {
    questionIndex: 3,
    template: `有意思。你希望观众注意到 {{intendedFocus}}，但实际视线却先落在 {{actualFocus}}。你觉得这两者一致吗？`,
    variables: ['intendedFocus', 'actualFocus'],
    purpose: '让用户自己发现意图-结果的错位',
    expectedInsight: '意识到"想表达的"和"实际表达的"之间存在差距',
    followUpIfStuck: '如果你觉得一致，那是好消息。如果不一致——这很正常，这正是我们要探索的。',
  },
  {
    questionIndex: 4,
    template: `你觉得是什么原因造成了这个差异？是什么让观众的注意力跑到了 {{actualFocus}} 而不是 {{intendedFocus}}？`,
    variables: ['intendedFocus', 'actualFocus'],
    purpose: '引导用户分析视觉注意力引导的因素',
    expectedInsight: '开始理解位置、大小、光线等因素对注意力的影响',
    followUpIfStuck: '想想看：{{intendedFocus}} 在照片中的位置、大小、亮度——和 {{actualFocus}} 相比，哪个更"显眼"？',
  },
]

/**
 * 构建第一轮提问的完整 Prompt
 */
export function buildFirstRoundPrompt(
  question: FirstRoundTemplate,
  variables: Record<string, string>
): string {
  let prompt = question.template
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(`{{${key}}}`, value)
  }
  return prompt
}

/**
 * 获取第一轮的第一个问题（无需变量填充）
 */
export function getFirstQuestion(): string {
  return FIRST_ROUND_QUESTIONS[0].template
}

/**
 * 获取下一轮问题索引
 */
export function getNextFirstRoundQuestion(
  currentIndex: number,
  userAnswer: string
): FirstRoundTemplate | null {
  const nextIndex = currentIndex + 1
  if (nextIndex >= FIRST_ROUND_QUESTIONS.length) return null
  return FIRST_ROUND_QUESTIONS[nextIndex]
}
