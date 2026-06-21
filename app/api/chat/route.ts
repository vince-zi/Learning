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
import { v4 as uuidv4 } from 'uuid'

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

    const queryNodeId = sessionData.current_knowledge_node_id || (isEnglish ? 'self-intro' : 'visual-focus')
    const isReviewMode = isEnglish && (sessionTheme === '全局温习' || sessionTheme.startsWith('温习: '))
    const isPracticeMode = isEnglish && (sessionTheme === '全局针对训练' || sessionTheme.startsWith('针对训练: '))

    // 1.1 查询用户在全局或该节点下的历史“发现卡片”和“错题记录” (仅英语温习/特训可用)
    let userContextPrompt = ''
    if (isEnglish && (isReviewMode || isPracticeMode)) {
      const isGlobal = sessionTheme === '全局温习' || sessionTheme === '全局针对训练'
      
      let discoveriesQuery = supabase
        .from('discoveries')
        .select('title, summary')
        .eq('user_id', userId)
      
      if (!isGlobal) {
        discoveriesQuery = discoveriesQuery.eq('knowledge_node_id', queryNodeId)
      }
      
      const { data: nodeDiscoveries } = await discoveriesQuery.limit(isGlobal ? 10 : 3)

      const { data: nodeErrors } = await supabase
        .from('error_records')
        .select('original_text, corrected_text, error_type, error_pattern')
        .eq('user_id', userId)
        .eq('noted_by_user', false)
        .limit(isGlobal ? 10 : 5)

      if (nodeDiscoveries && nodeDiscoveries.length > 0) {
        userContextPrompt += `\n[User's Past Discoveries]:\n` + 
          nodeDiscoveries.map(d => `- Discovery: ${d.title}. Summary: ${d.summary}`).join('\n')
      }
      if (nodeErrors && nodeErrors.length > 0) {
        userContextPrompt += `\n[User's Past Errors/Mistakes]:\n` + 
          nodeErrors.map(e => `- User said: "${e.original_text}". Correct form: "${e.corrected_text || ''}". Error Type: ${e.error_type} (${e.error_pattern || ''})`).join('\n')
      }
    }

    const activeSystemPrompt = (isEnglish ? ENGLISH_SYSTEM_PROMPT : SYSTEM_PROMPT) + 
      (userContextPrompt ? `\n\n## USER HISTORICAL DATA CONTEXT:\nUse the following user data to customize the review or practice. Check if they made progress:\n${userContextPrompt}` : '')
    const questioningStyle = sessionData.questioning_style || 'gentle'
    
    let styleInstruction = ''
    if (questioningStyle === 'sharp') {
      styleInstruction = isEnglish
        ? `\n\n## QUESTIONING STYLE: SHARP CHALLENGER (犀利思辨)
You must act as a Sharp Challenger / Devil's Advocate. Genuinely but firmly point out assumptions, ask for justifications and evidence, ask "what if" questions, and challenge the user's logic to push their critical thinking and expression limits. Keep it friendly but intellectually challenging.`
        : `\n\n## 提问风格：犀利挑战 (Devil's Advocate)
你的核心风格是“犀利挑战”。在保持友好伙伴关系的前提下，多做反思性追问。主动挑明用户陈述中的隐含假设，追问其逻辑漏洞或反面论证。要求用户给出支撑其看法的观察证据。多问“如果...会怎样”、“为什么不...”等视角性和元认知问题，激发深层思考。`
    } else if (questioningStyle === 'action') {
      styleInstruction = isEnglish
        ? `\n\n## QUESTIONING STYLE: ACTION COACH (实战督导)
You must act as a direct, action-oriented Coach. Focus on hands-on application and practice. Promptly guide the user to construct sentences, modify expressions, or do micro-exercises. Transition to tasks and challenges earlier than usual. Keep explanations short and push the user to practice.`
        : `\n\n## 提问风格：实战督导 (Action Coach)
你的提问应该极具实操导向。当用户进行了一定的观察或表达后，主动将对话引向动手实验（例如摄影中改变位置重新拍摄，英语中改写或者立即运用某个句型）。比平时更早地给出具体的小任务或挑战，让用户在动手实操中发现规律。`
    } else {
      // gentle
      styleInstruction = isEnglish
        ? `\n\n## QUESTIONING STYLE: GENTLE GUIDE (温和引导)
You must act as a Gentle Guide. Use encouraging, patient, and warm tones. Use incremental step-by-step scaffolding. Never pressure the user. If they are unsure, narrow down the scope or offer friendly options. Focus on building confidence.`
        : `\n\n## 提问风格：温和引导 (Gentle Guide)
你的核心风格是“温和引导”。在提问时，循序渐进，极具同理心和鼓励性。多肯定用户的观察。问题要足够简单、聚焦。不要给用户太大的认知负荷。如果用户感到不确定，立即缩小问题范围并给以提示或选项。`
    }

    const finalSystemPrompt = activeSystemPrompt + styleInstruction
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

    // 如果诊断出英语语法/词汇错误，实时将错句持久化至数据库，供温习与针对特训使用
    if (isEnglish && englishDiag && englishDiag.errorsInResponse.length > 0) {
      try {
        const errorInserts = englishDiag.errorsInResponse.map(e => {
          const cleanText = e.originalText.replace(/^\.\.\.|\.\.\.$/g, '').trim() || userMessage
          return {
            user_id: userId,
            session_id: sessionId,
            original_text: cleanText,
            corrected_text: e.suggestedCorrection || null,
            error_type: e.errorType,
            error_pattern: e.errorType,
            severity: e.severity,
          }
        })
        await supabase.from('error_records').insert(errorInserts)
      } catch (dbErr) {
        console.error('[Error Records Insertion Failed]:', dbErr)
      }
    }

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

    const activeNodeId = sessionData.current_knowledge_node_id || defaultNodeId
    const knowledgeNode = activeKnowledgeGraph.nodes.get(activeNodeId)
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
        const nodeName = knowledgeNode?.name || '当前话题'
        const isGlobal = sessionTheme === '全局温习' || sessionTheme === '全局针对训练'
        const nodeDisplayName = isGlobal ? '我们的全部对话' : nodeName
        if (isReviewMode) {
          actionPrompt = `You are in "Review Mode" (温习模式) for "${nodeDisplayName}". 
Your role is to act as the "past user" (曾经的我/Vince). You must review the user's past mistakes or expressions from history.
Look at the USER HISTORICAL DATA CONTEXT provided in the system prompt.
If there are past error records, pick one (e.g. user said "original_text"), open the conversation in English by saying:
"Hi! I'm the past you. In our previous chats, I tried to say: '[Quote user's past original_text]'. Back then, it wasn't the most natural English. Now, as my smarter, present self, can you help me correct or rephrase this statement in a better way? How should we say it?"
If no past errors are found, look up a typical beginner mistake (e.g. verb pattern errors like 'I like play...', or tense errors like 'I go to school yesterday'), invent a typical mistake, and ask the user to correct/rephrase it.
Be encouraging, play the role of the past user asking their present self for help. Explain clearly in both English and Chinese. Ask only one question.`
        } else if (isPracticeMode) {
          actionPrompt = `You are in "Targeted Practice Mode" (针对训练模式) for "${nodeDisplayName}".
Your goal is to guide the user to practice their weak areas.
Look at the USER HISTORICAL DATA CONTEXT provided in the system prompt to find their past errors.
Open the conversation in English by welcoming the user to Targeted Practice, explain the specific weak area we are practicing today (e.g. correct verb patterns, tenses, or prepositions, based on their past mistakes or node topic), and give them a targeted translation or correction challenge.
Example challenge: "How do you translate: '我喜欢打篮球，但不喜欢跑步' into natural English? Pay attention to the verb patterns."
Explain clearly in both English and Chinese. Ask only one question.`
        } else {
          const errorHint = englishDiag && englishDiag.errorsInResponse.length > 0
            ? `\n用户在第一条消息中的潜在语言问题：${englishDiag.errorsInResponse.map(e => e.errorType).join(', ')}。但请不要直接指出来——在回复中自然地使用 recast（隐性纠错）。`
            : ''
          actionPrompt = `用户刚刚开始了英语学习对话。请你用英语和他们聊天，像朋友一样。
目的是引导用户用英语多表达。从用户的消息出发，问一个相关的问题让他们继续说下去。
如果用户的消息很短，问一个开放式问题让他们展开。如果用户已经说了一些内容，追问更多细节。
每次只问一个问题。用自然的、口语化的英语。
如果用户的表达中有语法或词汇错误，不要直接指出来——用 recast（隐性纠错），在你的回复中自然地使用正确的形式。${errorHint}`
        }
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

      if (isReviewMode) {
        actionPrompt = `You are in "Review Mode" (温习模式).
You are still roleplaying as the "past user" discussing with their "present self".
Evaluate the user's latest response. Did they correct the past mistake/phrase successfully and naturally?
Be extremely strict: the rephrased sentence must be 100% correct, natural, and native-like English (100% accuracy).
If it is 100% correct and natural, praise them warmly, explain why the correction is correct (briefly in English & Chinese). 
Crucially, you must append "[RESOLVED: <exact_original_text_of_the_error_being_corrected>]" at the very end of your response. The original text in the tag must match the exact original_text from the historical context (e.g., "[RESOLVED: I very like dogs]").
If they did not succeed or if there are still minor errors, typos, or unnatural phrasing, give them a gentle hint (recast or simple explanation), ask them to try rephrasing it again, and do NOT append the RESOLVED tag.
Keep the focus entirely on reviewing and perfecting their past language expressions. Ask only one question. ${errorHint}`
      } else if (isPracticeMode) {
        actionPrompt = `You are in "Targeted Practice Mode" (针对训练模式).
Evaluate the user's latest response for the targeted exercise.
Provide immediate feedback: use recast to show the correct form, point out any grammar or vocabulary weaknesses, and explain the rule briefly in English & Chinese.
Then, present the next targeted challenge (e.g. another translation sentence, a sentence transformation, or a fill-in-the-blank question) to reinforce their learning.
Keep the training focused, encouraging, and structured. Ask only one question. ${errorHint}`
      } else if (currentRoundAiMsgCount >= 4 && !continueChatting) {
        // 多轮后：考虑给英语练习任务
        actionPrompt = `这是当前对话：
${conversationSoFar}

用户最新回答: ${userMessage}

请根据上下文，判断用户是否已经表达了一个完整的想法，从而适合给他们一个轻量的英语练习挑战（例如：用另一种方式重新表达同样的意思，或者用过去式/将来时改写某句话，或者用某个特定单词造句。任务要简单，1分钟内可完成）。

如果适合给挑战，请你同时输出正常回复和挑战内容。请严格遵循以下输出格式：
[Normal Reply]
<你的正常对话回复，继续延续话题、提问或鼓励，绝对不能在此部分中提及“挑战”、“任务”等，也绝对不要以 "Here's a small challenge" 开头。字数控制在3句以内。>

[Challenge Task]
<具体的练习挑战指令，只能包含一句话的英文/中文提示，例如：Try to rewrite your last sentence using the past tense "went" instead of "go".>

如果不适合给挑战（例如用户还在展开表达，或者尚未表达完整想法，需要继续追问引导），则直接像平常一样输出你的正常对话回复，千万不要包含 [Challenge Task] 或 [Normal Reply] 标记。

每次只问一个问题。${errorHint}${levelHint}`
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

保持聊天自然流畅。使用 recast 纠正任何语法错误。每次只问一个问题. ${errorHint}${levelHint}`
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
      systemPrompt: finalSystemPrompt,
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

    // --- 7. 解析回复与挑战任务 ---
    let finalAiResponse = aiResponse
    let challengeInstruction = ''
    let isTask = false
    let taskId = ''
    let isResolved = false
    let resolvedText: string | undefined = undefined

    if (isEnglish) {
      if (aiResponse.includes('[Normal Reply]') || aiResponse.includes('[Challenge Task]')) {
        const normalMatch = aiResponse.match(/\[Normal Reply\]([\s\S]*?)(?=\[Challenge Task\]|$)/i)
        const challengeMatch = aiResponse.match(/\[Challenge Task\]([\s\S]*?)$/i)
        
        const normalPart = normalMatch ? normalMatch[1].trim() : ''
        const challengePart = challengeMatch ? challengeMatch[1].trim() : ''
        
        if (challengePart) {
          isTask = true
          challengeInstruction = challengePart
          finalAiResponse = normalPart || aiResponse.replace(/\[Challenge Task\][\s\S]*$/i, '').replace(/\[Normal Reply\]/i, '').trim()
        } else {
          finalAiResponse = aiResponse.replace(/\[Normal Reply\]/i, '').trim()
        }
      } else {
        // 回退逻辑：如果 AI 没有遵循标记格式，但仍包含 challenge 特征词
        if ((aiResponse.includes("Here's a small challenge") || aiResponse.includes("challenge for you")) && !continueChatting) {
          isTask = true
          const parts = aiResponse.split(/Here's a small challenge for you:?/i)
          finalAiResponse = parts[0].trim()
          challengeInstruction = parts[1] ? parts[1].trim() : 'Please complete the challenge.'
        }
      }

      // 检查 AI 是否判定解决了某条历史错句，并更新数据库 noted_by_user = true
      const resolvedMatch = aiResponse.match(/\[RESOLVED:\s*([\s\S]*?)\]/i)
      if (resolvedMatch) {
        const rawResolvedText = resolvedMatch[1].trim()
        const cleanResolvedText = rawResolvedText.replace(/^["'*`“]+|["'*`”]+$/g, '').trim()
        isResolved = true
        resolvedText = cleanResolvedText
        // 去除 [RESOLVED: ...] 标签，不展示给用户
        finalAiResponse = finalAiResponse.replace(/\[RESOLVED:\s*[\s\S]*?\]/gi, '').trim()
        
        try {
          await supabase
            .from('error_records')
            .update({ noted_by_user: true, corrected_text: userMessage })
            .eq('user_id', userId)
            .eq('original_text', cleanResolvedText)
            .eq('noted_by_user', false)
        } catch (dbErr) {
          console.error('[Error Resolve Failed]:', dbErr)
        }
      }
      
      // 如果触发了挑战，并且用户没有选择继续自由聊天，我们将该挑战持久化到 practice_tasks 数据库中
      if (isTask && challengeInstruction) {
        taskId = uuidv4()
        await supabase.from('practice_tasks').insert({
          id: taskId,
          session_id: sessionId,
          task_type: 'reshoot',
          instruction: challengeInstruction,
          status: 'pending',
        })
      }
    } else {
      isTask = aiResponse.includes('我想请你再拍') || aiResponse.includes('拍摄任务')
      if (isTask) {
        challengeInstruction = aiResponse
      }
    }

    // --- 8. 记录 AI 消息 ---
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'assistant',
      // 对于英语，我们将消息保存为 'question' (普通对话气泡)，避免在对话历史中渲染成任务卡片
      message_type: isTask && !isEnglish ? 'task' : 'question',
      content: finalAiResponse,
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
        current_knowledge_node_id: activeNodeId,
      })
      .eq('id', sessionId)

    // --- 10. 返回 ---
    return NextResponse.json({
      success: true,
      message: {
        content: finalAiResponse,
        role: 'assistant',
        type: isTask && !isEnglish ? 'task' : 'question',
      },
      diagnosis: {
        emotionalState: diagResult.emotionalState,
        knowledgeLevel: diagResult.knowledgeEstimate,
      },
      nextAction: isTask ? 'issue_task' : 'continue_chat',
      questionIndex: (questionIndex || 1) + 1,
      phase: isTask && !isEnglish ? 'reshoot_task' : phase || 'first_round',
      isAssessmentCompleted: activeIsAssessment && assistantMsgCount >= 4,
      isResolved,
      resolvedText,
      challengeTask: isTask && isEnglish ? {
        id: taskId,
        instruction: challengeInstruction,
        type: 'reshoot',
      } : undefined,
    })
  } catch (error: any) {
    console.error('[Chat API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}
