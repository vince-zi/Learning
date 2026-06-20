// ============================================================
// API Route: POST /api/chat
// AI 对话核心 — 全部由 DeepSeek 驱动，基于用户文字描述
// ============================================================

import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'
import { SYSTEM_PROMPT } from '@/interface/prompts/system-prompt'
import { ENGLISH_SYSTEM_PROMPT } from '@/interface/prompts/english-system-prompt'
import { diagnose } from '@/engine/diagnosis/cognitive-diagnosis'
import { diagnoseEnglishResponse } from '@/engine/diagnosis/english-error-classifier'
import { regulate } from '@/engine/scaffolding/scaffold-regulator'
import { getServerClient } from '@/lib/db/supabase-server'
import type { Message, ModuleType } from '@/core/models/session'
import { photographyKnowledgeGraph } from '@/core/knowledge-graph/photography-graph'
import { englishKnowledgeGraph } from '@/core/knowledge-graph/english-graph'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      sessionId,
      userId,
      userMessage,
      phase,
      questionIndex,
      roundNumber,
      imageUrls,
      module = 'photography',
      continueChatting = false,
    } = body

    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: 'sessionId and userMessage are required' },
        { status: 400 }
      )
    }

    // --- 1. 获取会话信息与对话历史 ---
    const supabase = getServerClient()
    const { data: sessionData, error: sessionErr } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionErr || !sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionModule = sessionData.module || module || 'photography'
    const sessionTheme = sessionData.theme || ''
    const isEnglish = sessionModule === 'english'
    const isAssessment = isEnglish && (sessionTheme === 'English Level Placement Assessment' || sessionData.current_knowledge_node_id === 'placement-assessment')
    const activeIsAssessment = isAssessment && !continueChatting

    const activeSystemPrompt = isEnglish ? ENGLISH_SYSTEM_PROMPT : SYSTEM_PROMPT
    const activeKnowledgeGraph = isEnglish ? englishKnowledgeGraph : photographyKnowledgeGraph
    const defaultNodeId = isEnglish ? 'self-intro' : 'visual-focus'

    const { data: historyMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100)

    const sessionHistory: Message[] = (historyMessages || []).map((m: any) => ({
      id: m.id,
      sessionId: m.session_id,
      role: m.role,
      messageType: m.message_type,
      content: m.content,
      relatedPhotoId: m.related_photo_id,
      metadata: {
        roundNumber: m.round_number,
        ...(m.metadata || {}),
      },
      createdAt: m.created_at,
    }))

    // --- 2. 记录用户消息 ---
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'user',
      message_type: 'answer',
      content: userMessage,
      round_number: roundNumber || 1,
    })

    // --- 3. 引擎层诊断（根据模块选择不同的诊断逻辑）---
    const diagResult = diagnose(userMessage, sessionHistory, 3)

    // 英语模块：额外的英语错误诊断
    const englishDiag = isEnglish
      ? diagnoseEnglishResponse(userMessage, sessionHistory)
      : null

    // --- 4. 脚手架调节 ---
    const regulation = regulate({
      currentScaffoldLevel: 1,
      knowledgeEstimate: diagResult.knowledgeEstimate,
      bloomLevel: diagResult.bloomLevel,
      emotionalState: diagResult.emotionalState,
      consecutiveCorrect: diagResult.needsScaffolding ? 0 : 1,
      consecutiveErrors: diagResult.needsScaffolding ? 1 : 0,
      zpdZone: 'zpd',
      questionRound: roundNumber || 1,
    })

    // --- 5. 构建 Prompt — 让 DeepSeek 基于用户描述工作 ---
    const round = roundNumber || 1
    const isFirstMessage = sessionHistory.length === 0
    const isReshoot = phase === 'second_round' || phase === 'waiting_reshoot'
    const conversationSoFar = sessionHistory
      .slice(-10)
      .map(m => `[${m.role === 'assistant' ? '伙伴' : '用户'}]: ${m.content}`)
      .join('\n\n')

    const knowledgeNode = activeKnowledgeGraph.nodes.get(defaultNodeId)
    const taskInstruction = knowledgeNode?.practiceTask.instruction || ''

    const assistantMsgCount = sessionHistory.filter(m => m.role === 'assistant').length
    const currentRoundAiMsgCount = sessionHistory.filter(
      m => m.role === 'assistant' && m.metadata?.roundNumber === round
    ).length
    const currentRoundMsgCount = sessionHistory.filter(
      m => m.metadata?.roundNumber === round
    ).length

    let actionPrompt = ''
    if (activeIsAssessment) {
      // 英语水平测评专项引导 (温柔测评官)
      if (isFirstMessage) {
        actionPrompt = `You are starting a "English Level Placement Assessment" (英语直觉定级测评) session. 
Your goal is to gently assess the user's English level. 
Start with a warm welcome in English, let them know we will have a simple conversation of about 4-5 rounds to evaluate their English level, and ask them to introduce themselves briefly in English (e.g. name, location, what they do, or hobbies). 
Keep it encouraging, friendly, and remember to only ask one question.`
      } else if (assistantMsgCount === 1) {
        actionPrompt = `This is Round 2 of the English Level Placement Assessment.
Acknowledge their introduction warmly. Now, slightly increase the difficulty. Ask them a question about their daily routine or habits (e.g., what they do on weekends, or their typical workday).
Use recast (rephrasing incorrect grammar naturally in your response) to correct errors, but do not explain the grammar rule. Ask one question.`
      } else if (assistantMsgCount === 2) {
        actionPrompt = `This is Round 3 of the English Level Placement Assessment.
Now, increase the difficulty further. Ask them to describe a specific everyday situation or choice (e.g., how they handle stress, or their favorite trip and why).
Use recast to correct errors. Ask one question.`
      } else if (assistantMsgCount === 3) {
        actionPrompt = `This is Round 4 of the English Level Placement Assessment.
Increase the difficulty to test their abstract expression limits. Ask them a more complex or opinion-based question (e.g., "Do you think social media brings people closer together or pulls them apart? Why?").
Use recast to correct errors. Ask one question.`
      } else {
        // assistantMsgCount >= 4
        actionPrompt = `This is the final round (Round 5) of the English Level Placement Assessment.
Do not ask any more questions. Warmly thank the user in English for completing the conversation assessment. Tell them that their personalized English proficiency report (CEFR level, estimated vocabulary, strengths and weaknesses) is ready.
Instruct them to click the "Generate Placement Report" button below to view the details in their progress dashboard.`
      }
    } else if (isFirstMessage) {
      const hasImages = imageUrls && imageUrls.length > 0
      if (hasImages && !isEnglish) {
        // 第一条消息：摄影模式-有图片，引导用户观察照片
        actionPrompt = `用户刚刚上传了一张照片，系统已经把照片通过多模态接口传给你了。
请结合照片内容，用引导式提问引导用户自己开始观察和描述他们照片中的重要视觉元素（如主体的位置、光线方向、大小等）。
不要直接给照片好坏下结论或给出标准答案，而是引导他们思考。每次只问一个问题。`
      } else if (isEnglish) {
        // 第一条消息：英语模式
        const errorHint = englishDiag && englishDiag.errorsInResponse.length > 0
          ? `\n用户在第一条消息中的潜在语言问题：${englishDiag.errorsInResponse.map(e => e.errorType).join(', ')}。但请不要直接指出来——在回复中自然地使用 recast（隐性纠错）。`
          : ''
        actionPrompt = `用户刚刚开始了英语学习对话。请你用英语和他们聊天，像朋友一样。
目的是引导用户用英语多表达。从用户的消息出发，问一个相关的问题让他们继续说下去。
如果用户的消息很短，问一个开放式问题让他们展开。如果用户已经说了一些内容，追问更多细节。
每次只问一个问题。用自然的、口语化的英语。
如果用户的表达中有语法或词汇错误，不要直接指出来——用 recast（隐性纠错），在你的回复中自然地使用正确的形式。${errorHint}`
      } else {
        // 第一条消息：摄影模式-无图片，直接提问进行话题讨论
        actionPrompt = `用户向你提问了一个摄影问题。请结合你的摄影知识，用启发式提问引导用户自己开始思考和探讨如何解决或实现这个问题。
不要直接给出具体的摄影参数、最终技巧或标准答案，而是引导他们先描述或思考他们想达到的视觉效果、以及他们目前面临的具体问题（如光线、环境、构图等）。
每次只问一个问题，引导他们发现背后的规律。`
      }
    } else if (isEnglish) {
      // 英语模块：后续对话
      const errorHint = englishDiag && englishDiag.errorsInResponse.length > 0
        ? `\n用户在最近回答中的潜在语言问题：${englishDiag.errorsInResponse.map(e => `${e.errorType}(${e.severity})`).join(', ')}。纠正策略：${englishDiag.correctionType || 'recast'}。使用 recast（在你的回复中自然重复正确形式）来纠正。如果同一错误已出现多次，可以给一个简短的元语言提示。`
        : ''
      const levelHint = englishDiag
        ? `\n用户的估计 CEFR 水平：${englishDiag.cefrEstimate}。调整你的词汇和句子复杂度匹配这个水平（i+1 原则）。`
        : ''

      if (currentRoundAiMsgCount >= 4 && !continueChatting) {
        // 多轮后：考虑给英语练习任务
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

请判断用户是否已经表达了一个完整的想法。如果是，给他们一个小的英语练习任务——比如用另一种方式重新表达同样的意思，或者写两句话来比较/对比。任务要简单，5分钟内可完成。以"Here's a small challenge for you: "开头。

如果用户还有更多可以说的，继续用英语提问引导。延续他们的话题，问他们为什么这样想，或者让他们举一个例子。每次只问一个问题。${errorHint}${levelHint}`
      } else if (continueChatting) {
        // 用户明确选择「继续聊天」，绝对不要给挑战，只管自然对话
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

⚠️ 重要：用户已选择继续自由聊天，绝对不要给出任何练习任务或 challenge。不要以 "Here's a small challenge" 开头。
只需继续自然对话：基于用户的回答追问更多细节，让他们多表达。使用 recast 纠正错误。每次只问一个问题。${errorHint}${levelHint}`
      } else {
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

继续用英语提问。基于用户的回答，自然追问：
- 为什么这么想？
- 能举个具体的例子吗？
- 有什么相关的经历吗？
- 如果换个角度，会怎样？

保持聊天自然流畅。使用 recast 纠正任何语法错误。每次只问一个问题。${errorHint}${levelHint}`
      }
    } else if (isReshoot && round >= 2) {
      // 摄影：第二轮对比照片
      actionPrompt = `用户已经完成了再拍任务，上传了新的对比照片。
这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

请引导用户对比两次拍摄的差异。问他们：哪张更接近你想表达的效果？为什么？你观察到了什么不同？
每次只问一个问题。如果用户已经表达了规律性认识，确认他们的发现。`
    } else if (currentRoundMsgCount >= 6) {
      // 摄影：多轮对话后考虑给任务
      if (currentRoundAiMsgCount >= 3) {
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

请判断用户是否已经有了明确的观察或发现。如果有，给出一个简单的拍摄任务——让他们尝试换个角度或位置再拍一张来做对比。任务要简单，3分钟内可完成。以"我想请你再拍一张照片："开头。

如果用户还没有明确的发现，继续用启发式提问引导他们。每次只问一个问题。`
      } else {
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

继续启发式提问。基于用户的描述，追问他们注意到了什么。引导他们发现自己的拍摄意图和实际效果之间的差异。每次只问一个问题。`
      }
    } else {
      // 摄影：正常的启发式追问
      actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

基于用户的回答，继续用启发式提问。引导他们：
- 注意他们想表达的 vs 实际表达的
- 观察视觉元素（位置、大小、光线）
- 思考为什么会这样

不要直接给答案。每次只问一个问题。如果用户表达了规律性认识，确认并命名它。`
    }

    // 将系统提示(actionPrompt)作为隐藏指令合并到最后一条 user 消息中，确保合法的交替对话格式
    const finalUserContent = userMessage + (actionPrompt ? `\n\n[系统指令(对用户不可见)：${actionPrompt}]` : '')

    // --- 6. 调用 AI ---
    const provider = getCachedProvider()
    const response = await provider.chat({
      systemPrompt: activeSystemPrompt,
      messages: [
        ...sessionHistory.slice(-6).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: finalUserContent },
      ],
      imageUrls,
      maxTokens: 400,
      temperature: 0.7,
    })

    const aiResponse = response.content

    // --- 7. 判断是否给了任务 ---
    const isTask = isEnglish
      ? (aiResponse.includes('Here\'s a small challenge') || aiResponse.includes('challenge for you')) && !continueChatting
      : aiResponse.includes('我想请你再拍') || aiResponse.includes('拍摄任务')

    // --- 8. 记录 AI 消息 ---
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'assistant',
      message_type: isTask ? 'task' : 'question',
      content: aiResponse,
      round_number: round,
      metadata: {
        scaffoldLevel: regulation.newScaffoldLevel,
        emotionalState: diagResult.emotionalState,
      },
    })

    // --- 9. 更新会话状态 ---
    await supabase
      .from('learning_sessions')
      .update({
        status: 'in_progress',
        current_round: round,
        question_count_in_round: questionIndex || 1,
        current_knowledge_node_id: defaultNodeId,
      })
      .eq('id', sessionId)

    // --- 10. 返回 ---
    return NextResponse.json({
      success: true,
      message: {
        content: aiResponse,
        role: 'assistant',
        type: isTask ? 'task' : 'question',
      },
      diagnosis: {
        emotionalState: diagResult.emotionalState,
        knowledgeLevel: diagResult.knowledgeEstimate,
      },
      nextAction: isTask ? 'issue_task' : 'continue_chat',
      questionIndex: (questionIndex || 1) + 1,
      phase: isTask ? 'reshoot_task' : phase || 'first_round',
      isAssessmentCompleted: activeIsAssessment && assistantMsgCount >= 4,
    })
  } catch (error: any) {
    console.error('[Chat API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
