// ============================================================
// API Route: POST /api/discoveries
// 100% 本地化生成"今日发现"与"能力画像评估"，无大模型调用开销
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'
import { v4 as uuidv4 } from 'uuid'
import { getCachedProvider } from '@/interface/ai/provider-factory'

// 错题类型与发现模板映射
const ERROR_TYPE_MAP: Record<string, { title: string; summary: string; tags: string[]; knowledgeNodeId: string }> = {
  'expression-chinglish': {
    title: '突破中式英语思维',
    summary: '你注意到在日常表达中要避免逐字翻译的“中式思维”，使用更地道自然的英文搭配。',
    tags: ['地道表达', '思维转换', '口语流利度'],
    knowledgeNodeId: 'opinion-expression',
  },
  'grammar-preposition': {
    title: '精确把握介词使用',
    summary: '介词常常影响表达的精确度，你在今天的练习中重点注意并修正了介词的使用场景。',
    tags: ['介词搭配', '语法精准', '句型结构'],
    knowledgeNodeId: 'everyday-situations',
  },
  'grammar-article': {
    title: '细品冠词的奥妙',
    summary: '定冠词与不定冠词（a/an/the）的使用决定了表达是泛指还是特指，你已开始对这些微小语法点建立警觉。',
    tags: ['定冠词', '名词单复数', '精准语法'],
    knowledgeNodeId: 'question-asking',
  },
  'grammar-tense': {
    title: '掌握时态的时空交织',
    summary: '时态决定了事情发生的时空维度，通过对话你更准确地把握了过去时、现在时或完成时的语境差异。',
    tags: ['时态对比', '过去时', '时序叙述'],
    knowledgeNodeId: 'storytelling',
  },
  'vocabulary-collocation': {
    title: '探索自然词汇搭配',
    summary: '英语中有许多固定的词汇组合，通过对比修正，你体会到了哪些词语搭配在一起最地道。',
    tags: ['词汇搭配', '语感习惯', '地道口语'],
    knowledgeNodeId: 'likes-dislikes',
  },
}

const STRENGTHS_MAP: Record<string, string> = {
  'expression-chinglish': '成功攻克中式英语表达习惯，开始运用更地道的句式结构',
  'grammar-preposition': '掌握了常见英语介词的搭配规律，空间和抽象关系表达更精确',
  'grammar-article': '对名词单复数及冠词的泛指/特指建立了清晰的语感边界',
  'grammar-tense': '能够在过去时和现在时等时态语境中准确切换，叙事条理清晰',
  'vocabulary-collocation': '积累了多组地道的英语词汇固定搭配，表达更为流畅自然',
}

const WEAKNESSES_MAP: Record<string, string> = {
  'expression-chinglish': '有时受中文思维直译影响，需进一步打破固有字对字翻译习惯',
  'grammar-preposition': '部分介词（in/on/at/to）的抽象用法仍有混淆，需巩固固定搭配',
  'grammar-article': '偶尔遗漏定冠词/不定冠词，对单复数及特指的敏感度需提高',
  'grammar-tense': '在叙述过去发生的事时，时态动词的过去式变形规则偶尔会有遗忘',
  'vocabulary-collocation': '部分动宾搭配或词组组装还不够自然，需加强常用词块记忆',
}

function calculateCefrLevel(conqueredCount: number): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (conqueredCount < 2) return "A1"
  if (conqueredCount < 5) return "A2"
  if (conqueredCount < 10) return "B1"
  if (conqueredCount < 16) return "B2"
  if (conqueredCount < 24) return "C1"
  return "C2"
}

function estimateVocabularySize(cefr: string, conqueredCount: number): number {
  const baseMap: Record<string, number> = {
    A1: 500,
    A2: 1200,
    B1: 2500,
    B2: 4500,
    C1: 7000,
    C2: 9500,
  }
  const multiplierMap: Record<string, number> = {
    A1: 80,
    A2: 120,
    B1: 180,
    B2: 250,
    C1: 300,
    C2: 400,
  }
  const base = baseMap[cefr] || 500
  const mult = multiplierMap[cefr] || 80
  return base + conqueredCount * mult
}

function getFallbackDiscovery(knowledgeNodeId: string) {
  const nodeMap: Record<string, string> = {
    'self-intro': '自我介绍与个人信息',
    'daily-routine': '日常习惯叙述',
    'likes-dislikes': '喜好与感受表达',
    'everyday-situations': '日常场景对话应对',
    'question-asking': '有效提问与信息获取',
    'opinion-expression': '独立观点表达与阐述',
    'comparing-discussing': '多维比较与辩证讨论',
    'storytelling': '个人故事与时序叙述',
    'abstract-thinking': '抽象与假设性思维',
  }
  const nodeName = nodeMap[knowledgeNodeId] || '日常英语口语交流'
  return {
    title: `攻克表达挑战：${nodeName}`,
    summary: `在今天的场景对话练习中，你展现了极佳的沟通主动性。通过 AI 的启发式对话，你进一步锤炼了关于“${nodeName}”的英语语感与句法反应速度。`,
    tags: [nodeName, '语感锻炼', '口语自信度'],
    insight: '在真实对话中自然地应用词汇与句型，建立了更强的表达直觉。',
    knowledge_node_id: knowledgeNodeId,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, userId, knowledgeNodeId, module = 'english' } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const isEnglish = module === 'english'
    const supabase = getServerClient()

    // 1. 并行读取数据（包括当前会话的消息、照片，以及用户历史画像和错句记录）
    const [messagesRes, photosRes, profileRes, errorsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
      supabase
        .from('photos')
        .select('*')
        .eq('session_id', sessionId)
        .order('upload_order', { ascending: true }),
      (isEnglish && userId && userId !== 'anonymous')
        ? supabase.from('english_learner_profiles').select('*').eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
      (isEnglish && userId && userId !== 'anonymous')
        ? supabase.from('error_records').select('session_id, original_text, corrected_text, error_type, noted_by_user').eq('user_id', userId)
        : Promise.resolve({ data: null }),
    ])

    const messages = messagesRes.data || []
    const photos = photosRes.data || []
    const currentProfile = profileRes.data
    const allErrors = errorsRes.data || []

    const beforePhotoUrl = photos?.[0]?.image_url
    const afterPhotoUrl = photos?.[1]?.image_url

    // 2. 计算“今日发现卡片”
    let cardData: any = null

    if (isEnglish) {
      // 检查对话长度与发言有效性（忽略初始化信号）
      const userMessages = messages.filter((m: any) => m.role === 'user' && m.content !== '[INIT_FREE_CONVERSATION]')
      const totalUserCharCount = userMessages.reduce((sum: number, m: any) => sum + (m.content || '').length, 0)
      const realUserMessages = userMessages.filter((m: any) => {
        const cleanMsg = (m.content || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '')
        return !['hi', 'hello', 'hey', 'ok', 'yes', 'no'].includes(cleanMsg)
      })

      if (realUserMessages.length < 1 || totalUserCharCount < 8) {
        return NextResponse.json({
          success: false,
          tooShort: true,
          error: '对话过短，未产生知识点积累'
        })
      }

      // 调用 LLM 提炼今日学习发现
      const formattedHistory = messages
        .filter((m: any) => m.content !== '[INIT_FREE_CONVERSATION]')
        .map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n')

      try {
        const provider = getCachedProvider()
        const response = await provider.chat({
          systemPrompt: "你是一个专业的英语教学评估助手。你需要分析学生的对话历史，提炼出他们最核心的一项今日语法/句法/表达发现。请务必以精简、准确的 JSON 格式输出，不要包含任何 markdown 代码块格式标记（如 ```json 等），也不需要多余的修饰词，直接输出 JSON 串本身。",
          messages: [
            {
              role: 'user',
              content: `请分析以下这段学生与 AI 英语教练的对话，提炼今日最关键的学习发现。
对话历史：
"""
${formattedHistory}
"""

输出要求：
输出一个包含以下字段的纯 JSON 对象，不要包含 markdown 标记：
{
  "title": "今日发现的一个简短吸引人的标题，中文（例如：'克服直译思维'、'时态的过去时表达'）",
  "summary": "对本项发现的中文核心解析（2-3句）。请结合对话历史中学生实际说过的句子，指出哪里说得不妥，以及经过 AI 提示后他们是如何用正确的句子重新表达的。示例：'你发现表示...时不要直译为...，而是可以用更地道的“...”来表达。'",
  "insight": "从学生第一人称视角的简短感悟（1句），总结本轮所得（示例：'我发现当表达...时，使用...会比...自然得多。'）",
  "tags": ["标签1", "标签2"] （2-3个中文技能标签，例如：["地道表达", "时态对比"]）
}`
            }
          ],
          maxTokens: 500,
          temperature: 0.3
        })

        let jsonText = response.content.trim()
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(json)?/, '').replace(/```$/, '').trim()
        }
        cardData = JSON.parse(jsonText)
      } catch (err) {
        console.error('Failed to generate discovery via LLM:', err)
        // 容错度低：如果生成失败，使用本地备用启发式数据
        cardData = getFallbackDiscovery(knowledgeNodeId || 'self-intro')
      }
    } else {
      // 摄影模式保持原状
      cardData = {
        title: `视觉构图探索：${knowledgeNodeId || '视觉重心'}`,
        summary: `今天在对话中你探索了关于“${knowledgeNodeId || '视觉重心'}”的内容，加深了对于画面构图和视觉美学的直觉。`,
        tags: [knowledgeNodeId || '视觉重心', '画面平衡', '视觉审美'],
        insight: '通过启发式互动，对摄影构图的重心与光影关系建立了更多感知。',
        knowledge_node_id: knowledgeNodeId || 'visual-focus',
      }
    }

    // 验证并选择最终写入数据库的节点 ID
    const validNodes = isEnglish
      ? ['self-intro', 'daily-routine', 'likes-dislikes', 'everyday-situations', 'question-asking', 'opinion-expression', 'comparing-discussing', 'storytelling', 'abstract-thinking']
      : ['visual-focus', 'visual-balance', 'frame-boundary', 'light-direction', 'exposure-triangle', 'color-temperature', 'color-contrast', 'time-visualization', 'perspective-narrative']

    const finalNodeId = (cardData.knowledge_node_id && validNodes.includes(cardData.knowledge_node_id))
      ? cardData.knowledge_node_id
      : (knowledgeNodeId && validNodes.includes(knowledgeNodeId))
      ? knowledgeNodeId
      : (isEnglish ? 'self-intro' : 'visual-focus')

    // 3. 本地启发式计算“英语能力画像评估” (0ms LLM 延迟)
    let profilePromise: PromiseLike<any> = Promise.resolve()
    if (isEnglish && userId && userId !== 'anonymous') {
      const unsolvedErrors = allErrors.filter((e: any) => !e.noted_by_user)
      const solvedErrors = allErrors.filter((e: any) => e.noted_by_user)

      // 计算 CEFR 级别和词汇量
      const cefrLevel = calculateCefrLevel(solvedErrors.length)
      const vocabularySize = estimateVocabularySize(cefrLevel, solvedErrors.length)

      // 生成优势 Strengths (从已征服的错题类型中提取)
      const strengthsSet = new Set<string>()
      solvedErrors.forEach((e: any) => {
        if (STRENGTHS_MAP[e.error_type]) strengthsSet.add(STRENGTHS_MAP[e.error_type])
      })
      const strengths = Array.from(strengthsSet).slice(0, 2)
      if (strengths.length < 2) strengths.push('在启发式交互中勇于开口，具备良好的语感直觉')
      if (strengths.length < 2) strengths.push('能够积极自我纠错，自主学习动力较强')

      // 生成弱点 Weaknesses (从待解决的错题类型中提取)
      const weaknessesSet = new Set<string>()
      unsolvedErrors.forEach((e: any) => {
        if (WEAKNESSES_MAP[e.error_type]) weaknessesSet.add(WEAKNESSES_MAP[e.error_type])
      })
      const weaknesses = Array.from(weaknessesSet).slice(0, 2)
      if (weaknesses.length < 2) weaknesses.push('需要增加对话的单次输入长度，尝试使用连词构建长句')
      if (weaknesses.length < 2) weaknesses.push('建议在温习板块中多加复习，加深地道语感钢印')

      profilePromise = supabase
        .from('english_learner_profiles')
        .upsert({
          user_id: userId,
          cefr_level: cefrLevel,
          known_vocabulary_size: vocabularySize,
          strengths,
          weaknesses,
          sessions_completed: (currentProfile?.sessions_completed || 0) + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to upsert english learner profile:', error.message)
          }
        })
    }

    // 4. 并行写入发现记录、更新会话以及用户画像
    const discoveryId = uuidv4()
    const insertDiscoveryPromise = supabase
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

    const updateSessionPromise = supabase
      .from('learning_sessions')
      .update({
        discovery_count: (messages?.length ? 1 : 1),
      })
      .eq('id', sessionId)

    const [insertRes, updateRes, _profileRes] = await Promise.all([
      insertDiscoveryPromise,
      updateSessionPromise,
      profilePromise,
    ])

    if (insertRes.error) {
      console.error('Failed to save discovery:', insertRes.error.message)
    }
    if (updateRes.error) {
      console.error('Failed to update session:', updateRes.error.message)
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
