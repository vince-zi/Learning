// ============================================================
// Interface Layer: Discovery Generation Prompt
// "今日发现"卡片生成
//
// 当用户完成完整的提问-再拍-对比循环后，
// 基于对话历史生成一条结构化的发现总结
// ============================================================

export interface DiscoveryCardData {
  title: string
  summary: string
  tags: string[]
  insight: string           // 用户的原始洞察表述
  knowledge_node_id?: string
  beforePhotoUrl?: string
  afterPhotoUrl?: string
}

/**
 * 构建发现生成 Prompt
 */
export function buildDiscoveryPrompt(
  sessionMessages: { role: string; content: string }[],
  knowledgeNodeName: string,
  userInsight?: string
): string {
  const messagesSummary = sessionMessages
    .map(m => `[${m.role === 'user' ? '用户' : '伙伴'}]: ${m.content}`)
    .join('\n\n')

  return `请基于以下对话，为这个摄影学习会话生成一个"今日发现"卡片。

对话内容：
${messagesSummary}

用户的关键洞察：${userInsight || '从对话中提取'}

相关摄影领域：${knowledgeNodeName}

请从以下摄影知识节点 ID 中，选择一个最符合本次对话学习内容的节点归类：
- visual-focus: 视觉重心控制
- visual-balance: 视觉平衡
- frame-boundary: 画面框架
- light-direction: 光线方向
- exposure-triangle: 曝光三要素
- color-temperature: 色温控制
- color-contrast: 色彩对比与搭配
- time-visualization: 时间视觉化
- perspective-narrative: 视角与叙事立场

请生成一个 JSON 格式的发现卡片（不要 markdown 代码块，直接输出 JSON）：
{
  "title": "发现标题（简短、有启发性，如'视觉重量的秘密'）",
  "summary": "2-3句话总结用户在本次会话中通过提问和实践发现的规律。用第二人称'你'。",
  "tags": ["相关的摄影术语标签", "3-5个"],
  "insight": "用户最核心的洞察——用他们自己的话或接近他们的话",
  "knowledge_node_id": "从上面选择的一个英文节点 ID，如 'visual-focus'"
}

要求：
- Title 不要用"今日发现"这种泛词，要具体
- Summary 强调用户自己发现的规律，不要写成你在教他们
- Tags 使用准确的摄影术语
- 语气温暖、庆祝性的，但不过分夸张`
}

/**
 * 解析 AI 返回的发现卡片 JSON
 */
export function parseDiscoveryResponse(
  aiResponse: string
): DiscoveryCardData | null {
  try {
    // 尝试直接解析
    const data = JSON.parse(aiResponse)
    return {
      title: data.title || '新的发现',
      summary: data.summary || '',
      tags: data.tags || [],
      insight: data.insight || '',
      knowledge_node_id: data.knowledge_node_id,
    }
  } catch {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        return {
          title: data.title || '新的发现',
          summary: data.summary || '',
          tags: data.tags || [],
          insight: data.insight || '',
          knowledge_node_id: data.knowledge_node_id,
        }
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * 手动构建发现卡片（当 AI 不可用时的回退方案）
 */
export function buildManualDiscovery(
  sessionMessages: { role: string; content: string }[],
  knowledgeNodeName: string
): DiscoveryCardData {
  // 从用户消息中提取关键洞察
  const userMessages = sessionMessages.filter(m => m.role === 'user')
  const insightPatterns = /发现|原来|规律|感觉|我觉得|我注意到|我意识到/g

  let bestInsight = ''
  for (const msg of [...userMessages].reverse()) {
    if (insightPatterns.test(msg.content)) {
      bestInsight = msg.content
      break
    }
  }

  return {
    title: `探索${knowledgeNodeName}`,
    summary: `通过对比拍摄和自我观察，你对${knowledgeNodeName}有了新的理解。${bestInsight ? `你注意到：${bestInsight.slice(0, 100)}` : ''}`,
    tags: [knowledgeNodeName, '自我发现', '对比实践'],
    insight: bestInsight || '通过实践和观察获得新的理解',
  }
}
