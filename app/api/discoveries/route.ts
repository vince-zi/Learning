// ============================================================
// API Route: POST /api/discoveries
// 生成"今日发现"卡片
// ============================================================

import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'
import { SYSTEM_PROMPT } from '@/interface/prompts/system-prompt'
import { ENGLISH_SYSTEM_PROMPT } from '@/interface/prompts/english-system-prompt'
import { buildDiscoveryPrompt, parseDiscoveryResponse, buildManualDiscovery } from '@/interface/prompts/discovery-prompt'
import { getServerClient } from '@/lib/db/supabase-server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, userId, knowledgeNodeId, module = 'photography' } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const isEnglish = module === 'english'

    // 获取会话消息历史
    const supabase = getServerClient()
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const sessionMessages = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }))

    // 获取相关照片（仅摄影模式）
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('session_id', sessionId)
      .order('upload_order', { ascending: true })

    const beforePhotoUrl = photos?.[0]?.image_url
    const afterPhotoUrl = photos?.[1]?.image_url

    // 尝试用 AI 生成发现
    let cardData = null
    try {
      const provider = getCachedProvider()
      const prompt = isEnglish
        ? buildEnglishDiscoveryPrompt(
            sessionMessages,
            knowledgeNodeId || 'self-intro',
            extractInsightFromMessages(sessionMessages)
          )
        : buildDiscoveryPrompt(
            sessionMessages,
            knowledgeNodeId || '视觉重心与构图',
            extractInsightFromMessages(sessionMessages)
          )

      const response = await provider.chat({
        systemPrompt: isEnglish ? ENGLISH_SYSTEM_PROMPT : SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.7,
      })

      cardData = parseDiscoveryResponse(response.content)
    } catch (aiError) {
      console.warn('[Discoveries API] AI failed, using manual fallback:', aiError)
    }

    // 回退方案
    if (!cardData) {
      cardData = isEnglish
        ? buildManualEnglishDiscovery(sessionMessages, knowledgeNodeId || '自我介绍与表达')
        : buildManualDiscovery(sessionMessages, knowledgeNodeId || '视觉重心')
    }

    // 验证并选择知识图谱节点 ID
    const validNodes = isEnglish
      ? ['self-intro', 'daily-routine', 'likes-dislikes', 'everyday-situations', 'question-asking', 'opinion-expression', 'comparing-discussing', 'storytelling', 'abstract-thinking']
      : ['visual-focus', 'visual-balance', 'frame-boundary', 'light-direction', 'exposure-triangle', 'color-temperature', 'color-contrast', 'time-visualization', 'perspective-narrative']

    const nodeFromAi = (cardData as any).knowledge_node_id
    const finalNodeId = (nodeFromAi && validNodes.includes(nodeFromAi))
      ? nodeFromAi
      : (knowledgeNodeId && validNodes.includes(knowledgeNodeId))
      ? knowledgeNodeId
      : (isEnglish ? 'self-intro' : 'visual-focus')

    // 写入数据库
    const discoveryId = uuidv4()
    const { data: discovery, error } = await supabase
      .from('discoveries')
      .insert({
        id: discoveryId,
        session_id: sessionId,
        user_id: userId || 'anonymous',
        title: cardData.title,
        summary: cardData.summary,
        photo_urls: [beforePhotoUrl, afterPhotoUrl].filter(Boolean) as string[],
        tags: cardData.tags,
        source_round: 2,
        knowledge_node_id: finalNodeId,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save discovery:', error.message)
    }

    // 更新会话
    await supabase
      .from('learning_sessions')
      .update({
        discovery_count: (messages?.length ? 1 : 1),
      })
      .eq('id', sessionId)

    // 英语模块：评估并保存英语学习者画像 (CEFR 等级 & 词汇量预估)
    if (isEnglish && userId && userId !== 'anonymous') {
      try {
        const provider = getCachedProvider()
        const messagesSummary = sessionMessages
          .map((m: any) => `[${m.role === 'assistant' ? 'Partner' : 'User'}]: ${m.content}`)
          .join('\n\n')

        // 获取用户当前的画像（若有）
        const { data: currentProfile } = await supabase
          .from('english_learner_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        // 获取用户历史所有已解决/未解决错词，以提供极具说服力的提升汇总
        const { data: allErrors } = await supabase
          .from('error_records')
          .select('original_text, corrected_text, error_type, noted_by_user')
          .eq('user_id', userId)

        const unsolvedErrors = (allErrors || []).filter((e: any) => !e.noted_by_user)
        const solvedErrors = (allErrors || []).filter((e: any) => e.noted_by_user)

        const unsolvedSummary = unsolvedErrors.length > 0
          ? unsolvedErrors.map((e: any) => `- "${e.original_text}" (考点: ${e.error_type})`).join('\n')
          : '暂无未解决的语法错句。'

        const solvedSummary = solvedErrors.length > 0
          ? solvedErrors.map((e: any) => `- 错句 "${e.original_text}" 已完美重构为 "${e.corrected_text || ''}"`).join('\n')
          : '暂无已彻底掌握的语法。'

        const profilePrompt = `Based on the following English conversation history and the user's historical error ledger, perform a language proficiency evaluation of the User.

Conversation History:
${messagesSummary}

User's Historical Errors (Unsolved, still weak areas):
${unsolvedSummary}

User's Conquered Errors (Solved, demonstrating progress & improvement):
${solvedSummary}

${currentProfile ? `Current Profile State:
- CEFR Level: ${currentProfile.cefr_level}
- Vocabulary Size: ${currentProfile.known_vocabulary_size}
- Strengths: ${JSON.stringify(currentProfile.strengths)}
- Weaknesses: ${JSON.stringify(currentProfile.weaknesses)}` : 'No current profile (this is their first assessment).'}

Evaluate and output a JSON object containing the following keys (no markdown code blocks, output raw JSON):
{
  "cefr_level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "known_vocabulary_size": number (integer estimate of their vocabulary size),
  "strengths": ["用中文列出 2-3 个具体的英语优势，优先结合并具体指出用户已经攻克了哪些语法盲区 (Conquered Errors)，给用户极强的提升感和成就感"],
  "weaknesses": ["用中文列出 2-3 个具体的英语弱点或改进方向，需要精准地从 Unsolved 列表中提取错题模式并给出建议"]
}

Ensure the output is valid JSON.`

        const profileResponse = await provider.chat({
          systemPrompt: 'You are an expert English language proficiency assessor. You evaluate written and spoken English dialogs and output structured assessments.',
          messages: [{ role: 'user', content: profilePrompt }],
          maxTokens: 400,
          temperature: 0.5,
        })

        let evalData = null
        try {
          const content = profileResponse.content.trim()
          const jsonStart = content.indexOf('{')
          const jsonEnd = content.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            evalData = JSON.parse(content.substring(jsonStart, jsonEnd + 1))
          } else {
            evalData = JSON.parse(content)
          }
        } catch (jsonErr) {
          console.warn('[Profile Assessment] Failed to parse AI JSON:', jsonErr)
        }

        if (evalData) {
          const { error: profileUpsertError } = await supabase
            .from('english_learner_profiles')
            .upsert({
              user_id: userId,
              cefr_level: evalData.cefr_level || currentProfile?.cefr_level || 'A1',
              known_vocabulary_size: evalData.known_vocabulary_size || currentProfile?.known_vocabulary_size || 500,
              strengths: evalData.strengths || currentProfile?.strengths || [],
              weaknesses: evalData.weaknesses || currentProfile?.weaknesses || [],
              sessions_completed: (currentProfile?.sessions_completed || 0) + 1,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

          if (profileUpsertError) {
            console.error('Failed to upsert english learner profile:', profileUpsertError.message)
          }
        }
      } catch (profError) {
        console.error('[Profile Assessment Error]:', profError)
      }
    }

    return NextResponse.json({
      success: true,
      discovery: {
        id: discoveryId,
        ...cardData,
        beforePhotoUrl,
        afterPhotoUrl,
      },
    })
  } catch (error: any) {
    console.error('[Discoveries API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function extractInsightFromMessages(
  messages: { role: string; content: string }[]
): string | undefined {
  // 找包含"我发现"、"我注意到"、"感觉"、"原来"的用户消息
  const userMessages = messages.filter(m => m.role === 'user')
  const insightPatterns = [/我发现/, /我注意到/, /原来/, /规律/, /感觉.*因为/]

  for (const msg of [...userMessages].reverse()) {
    for (const pattern of insightPatterns) {
      if (pattern.test(msg.content)) {
        return msg.content
      }
    }
  }
  return undefined
}

/**
 * 构建英语发现生成 Prompt
 */
function buildEnglishDiscoveryPrompt(
  sessionMessages: { role: string; content: string }[],
  knowledgeNodeName: string,
  userInsight?: string
): string {
  const messagesSummary = sessionMessages
    .map(m => `[${m.role === 'assistant' ? 'Partner' : 'You'}]: ${m.content}`)
    .join('\n\n')

  return `Based on this English conversation, generate a "Today's Discovery" card.

Conversation:
${messagesSummary}

User's key insight: ${userInsight || 'Extract from the conversation'}

English skill area: ${knowledgeNodeName}

Classify this discovery into one of the following English knowledge graph nodes (choose the best match based on the conversation):
- self-intro: 自我介绍与个人信息
- daily-routine: 日常习惯叙述
- likes-dislikes: 喜好与感受表达
- everyday-situations: 日常场景对话应对
- question-asking: 有效提问与信息获取
- opinion-expression: 独立观点表达与阐述
- comparing-discussing: 多维比较与辩证讨论
- storytelling: 个人故事与时序叙述
- abstract-thinking: 抽象与假设性思维

Generate a JSON discovery card (no markdown code block, output raw JSON):
{
  "title": "用中文写一个简短、启发性的发现卡片标题 (例如：'探索过去时态的语感直觉' 或 '发现日常表达中的主被动选择')",
  "summary": "用中文写 2-3 句话，总结用户通过这次对话学到或发现的英语规律。使用 '你' (第二人称)。",
  "tags": ["用中文写相关的英语学习标签 (例如：'过去时', '流畅度', '主动词')", "3-5个标签"],
  "insight": "用户的核心感悟与发现 — 用中文写出",
  "knowledge_node_id": "one of the node IDs listed above, e.g., 'daily-routine'"
}

Requirements:
- Title, summary, tags, and insight MUST be written in Chinese (中文) so the user can easily read and understand their own progress.
- Title should be specific, not generic like "Today's Discovery".
- Warm, celebratory tone but not exaggerated.`
}

/**
 * 手动构建英语发现卡片（AI 不可用时的回退）
 */
function buildManualEnglishDiscovery(
  sessionMessages: { role: string; content: string }[],
  knowledgeNodeName: string
): any {
  const userMessages = sessionMessages.filter(m => m.role === 'user')
  const insightPatterns = /discover|notice|realize|learn|understood|interesting|I see|I get/i

  let bestInsight = ''
  for (const msg of [...userMessages].reverse()) {
    if (insightPatterns.test(msg.content)) {
      bestInsight = msg.content
      break
    }
  }

  return {
    title: `探索英语表达：${knowledgeNodeName}`,
    summary: `通过这轮英语对话，你在“${knowledgeNodeName}”方面获得了新的发现与理解。${bestInsight ? `你注意到：${bestInsight.slice(0, 100)}` : ''}`,
    tags: [knowledgeNodeName, '自我发现', '口语练习'],
    insight: bestInsight || '通过对话和练习，获得了新的直觉理解',
  }
}
