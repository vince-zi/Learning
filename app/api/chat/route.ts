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
      explanationPreference,
    } = body

    const langPref = explanationPreference // null | 'chinese' | 'balanced' | 'english'
    const effectivePref: 'chinese' | 'balanced' | 'english' = (langPref === 'chinese' || langPref === 'english' || langPref === 'balanced') ? langPref : 'balanced'
    const isEnglishPref = effectivePref === 'english'
    const isChinesePref = effectivePref === 'chinese'
    const isBalancedPref = effectivePref === 'balanced'

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
    let showChooseLangHint = false
    let targetErrorToReview: any = null
    let targetErrorStage = 0
    let targetErrorTypeFriendly = ''
    let userWeaknesses: string[] = []
let practiceWeaknessProfile = ''
let weaknessProfileItems: Array<{errorType: string, friendlyName: string, exampleSentence: string, mastered: boolean}> = []

    if (isEnglish && (isReviewMode || isPracticeMode)) {
      showChooseLangHint = !explanationPreference && !continueChatting
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
        .select('id, original_text, corrected_text, error_type, error_pattern, severity, created_at')
        .eq('user_id', userId)
        .eq('noted_by_user', false)

      if (nodeDiscoveries && nodeDiscoveries.length > 0) {
        userContextPrompt += `\n[User's Past Discoveries]:\n` + 
          nodeDiscoveries.map(d => `- Discovery: ${d.title}. Summary: ${d.summary}`).join('\n')
      }
      if (nodeErrors && nodeErrors.length > 0) {
        userContextPrompt += `\n[User's Past Errors/Mistakes]:\n` + 
          nodeErrors.map(e => `- User said: "${e.original_text}". Correct form: "${e.corrected_text || ''}". Error Type: ${e.error_type} (${e.error_pattern || ''})`).join('\n')
        
        // 挑选一个错题作为本次会话的主攻复习句 (使用基于遗忘曲线的间隔重复加权选题算法)
        if (isReviewMode) {
          const specificIdMatch = sessionTheme.match(/^温习:\s*(.+)$/)
          if (specificIdMatch && specificIdMatch[1]) {
            const targetId = specificIdMatch[1]
            targetErrorToReview = nodeErrors.find(e => e.id === targetId)
          }
          if (!targetErrorToReview) {
            targetErrorToReview = selectTargetErrorSpacedRepetition(nodeErrors)
          }
          const pattern = targetErrorToReview ? (targetErrorToReview.error_pattern || '') : ''
          targetErrorStage = pattern.endsWith(':stage-1') ? 1 : 0
          targetErrorTypeFriendly = targetErrorToReview ? getFriendlyErrorName(targetErrorToReview.error_type) : ''
        }

        // 如果用户画像里没有总结出弱势，直接对现有的待复习错句类型做翻译兜底
        if (userWeaknesses.length === 0) {
          const rawTypes = Array.from(new Set(nodeErrors.map((e: any) => e.error_type))) as string[]
          userWeaknesses = rawTypes.map(t => getFriendlyErrorName(t))
        }

        // 为针对性训练构建弱点画像（含频率排序 + 例句）
        if (isPracticeMode && nodeErrors && nodeErrors.length > 0) {
          const errorsByType: Record<string, any[]> = {}
          for (const e of nodeErrors) {
            if (!errorsByType[e.error_type]) errorsByType[e.error_type] = []
            errorsByType[e.error_type].push(e)
          }
          const sortedTypes = Object.entries(errorsByType).sort((a, b) => b[1].length - a[1].length)
          practiceWeaknessProfile = '\n【你的英语弱点画像 — 针对性训练专属】\n'
          weaknessProfileItems = sortedTypes.map(([type, errors]) => {
            const fn = getFriendlyErrorName(type)
            const ex = errors.slice(0, 1).map((e: any) => `"${e.original_text}" → "${e.corrected_text || ''}"`).join('; ')
            practiceWeaknessProfile += `${weaknessProfileItems.length + 1}. ${fn} (${errors.length}次) — 举例: ${ex}\n`
            return { errorType: type, friendlyName: fn, exampleSentence: ex, mastered: false }
          })
        } else if (isPracticeMode) {
          practiceWeaknessProfile = '\n【你的英语弱点画像 — 针对性训练专属】\n⚠️ 暂无历史错题记录。请从最常见的初学者语法错误开始训练，并在开场告知用户。\n'
        }
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

    let explanationPrefPrompt = ''
    let systemPromptForThisRequest = activeSystemPrompt
    if (isEnglish) {
      if (isChinesePref) {
        // 中文模式：regex 替换系统提示为中文 heavy 版本
        systemPromptForThisRequest = systemPromptForThisRequest
          .replace(
            /1\. \*\*English-First with Chinese Help When Needed[\s\S]*?(?=\n2\. \*\*)/,
            `1. **中英双语 — 中文讲解为主**：
   - 英文进行对话和提问，但语法讲解、纠正、教学点**必须用中文**详细解释。
   - 遇到复杂词汇或长句时**必须在后面加括号提供中文翻译**。例如："He spilled the beans (泄露了秘密)。"
   - 中文讲解使用"小白大白话"——用生活化类比来解释语法，严禁学术术语。
   - 每条讲解回复至少要有 25% 是中文。`
          )
          .replace(
            /2\. \*\*Clear Grammar Explanations[\s\S]*?(?=\n3\. \*\*)/,
            `2. **语法讲解 — 中文大白话（禁止反问）**：
   - 如果用户提问语法或处于纠错中，**必须立即用中文给出直接、清晰的讲解**，绝对不能反问用户。
   - **小白大白话教学**：用最生动日常的中文类比解释，严禁学术语法名词。
   - -ing：表示"正在做"或"把动作当成一件事情/爱好"。
   - the：特指那个你我都知道的特定东西。that：指着/区分的那一个。
   - to do：倾向于未来（想去跑），doing：正在做或指整个动作本身。
   - 每个语法纠正必须用中文解释，不止英文。`
          )
          .replace(
            /4\. \*\*温和纠错[\s\S]*?(?=\n5\. \*\*)/,
            `4. **温和纠错（Recast + 中文解释 — 必须）**：
   当用户犯错时，不要直接说"That's wrong"。在回复中自然重复正确形式，**必须**用括号加中文解释。
   每个纠正都要有中文解释——不止是英文。例如：
   - 用户："I go to the store yesterday."
   - 你："Oh, you went (went是go的过去式，昨天的事→用过去式 went) to the store yesterday! What did you buy? 🛒"`
          )
      } else if (isBalancedPref) {
        // 平衡模式：regex 替换系统提示，必须含中文提示
        systemPromptForThisRequest = systemPromptForThisRequest
          .replace(
            /1\. \*\*English-First with Chinese Help When Needed[\s\S]*?(?=\n2\. \*\*)/,
            `1. **English Conversation + Chinese Grammar Hints (英语对话，中文语法提示)**：
   - Chat and ask questions in English.
   - When explaining grammar or correcting errors: English explanation first, then a Chinese hint in brackets like (提示：...). This is MANDATORY.
   - Every grammar correction or teaching point MUST include Chinese brackets. Do not skip them.
   - For vocabulary: English definition first, then (中文词) in brackets.`
          )
          .replace(
            /2\. \*\*Clear Grammar Explanations[\s\S]*?(?=\n3\. \*\*)/,
            `2. **Grammar Teaching — Chinese Hint Required (语法教学要求)**：
   - When teaching grammar: simple English first, then (提示：中文解释) in brackets. REQUIRED, not optional.
   - Use everyday analogies. No academic grammar terms.
   - Every grammar correction MUST end with a Chinese bracket hint — even for simple corrections add at least a short one.`
          )
          .replace(
            /4\. \*\*温和纠错[\s\S]*?(?=\n5\. \*\*)/,
            `4. **Correction with Chinese Hint (纠错+提示)**：Repeat the correct form naturally, then add Chinese hint: (注意：...). Example:
   - User: "I go to the store yesterday."
   - You: "Oh, you went (注意：yesterday是过去时间 → 用过去式 went) to the store yesterday! What did you buy? 🛒"`
          )
      } else if (isEnglishPref) {
        // 英语模式：追加硬覆盖 Prompt，不依赖脆弱的 regex 去匹配系统提示文本
        explanationPrefPrompt = `\n\n## LANGUAGE PREFERENCE: ENGLISH IMMERSION (纯英沉浸 — 强制覆盖)
[本指令优先级最高 — 覆盖之前 ALL 语言相关指令，包括系统提示中的任何中文相关要求]:

The user has chosen PURE ENGLISH mode. This is NON-NEGOTIABLE.

ABSOLUTE RULES:
- You MUST output ZERO Chinese characters in your entire response. Not even one.
- Explain grammar, corrections, and teaching points in SIMPLE ENGLISH ONLY.
- If the user seems confused, simplify your English further. Use emoji. Do NOT fall back to Chinese.
- When correcting errors (Recast), repeat the correct form naturally in English. No Chinese notes.
- For vocabulary: English definition only. No Chinese translations.
- IGNORE any instruction in the system prompt that tells you to use Chinese, provide Chinese translations, or add Chinese hints. Those instructions do NOT apply in this mode.
- If you output even a single Chinese character, you have failed this task.`
      }
    }

    let finalSystemPrompt = systemPromptForThisRequest + styleInstruction + explanationPrefPrompt

    // Append CORRECTED tag instruction for all English conversations (more reliable in system prompt)
    if (isEnglish) {
      finalSystemPrompt += `\n\n## CORRECTED + HINT TAGS (REQUIRED FOR EVERY ENGLISH RESPONSE):\nWhenever the user writes something in English:\n1. You MUST append "[CORRECTED: <the fully corrected version of the user's sentence>]" at the very end of your response.\n2. If there was ANY grammar error you corrected in your reply (even implicitly via recast), you MUST ALSO append "[HINT: <a one-sentence explanation in Chinese of WHY the correction was made, using plain everyday language and zero academic grammar terms>]" right after [CORRECTED:].\nExample: If user said "I have went" and you corrected to "went", append: "[HINT: have后面直接跟动词原形就行，不需要再把动词变成过去式]"`
    }

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

    console.log('[API Chat debug]', {
      userMessage,
      isEnglish,
      hasDiag: !!englishDiag,
      errorsCount: englishDiag?.errorsInResponse?.length || 0,
      errors: englishDiag?.errorsInResponse
    });

    // 错误记录的持久化移至 AI 回复生成之后进行，以便保存提取的 corrected_text

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
          if (targetErrorToReview) {
            const orig = targetErrorToReview.original_text
            const corr = targetErrorToReview.corrected_text || ''
            const type = targetErrorToReview.error_type || ''
            const targetConceptName = getFriendlyErrorName(type)
            
            if (targetErrorStage === 0) {
              actionPrompt = `You are in "Review Mode" (Stage 1 — Correct the original sentence).
Your role is an encouraging, warm conversation companion. Follow the language mode rules from the system prompt (English/Balanced/Chinese).
Open the conversation in a friendly companion tone. Say: look what I found in our chat logs — you said: '${orig}'. We wanted to make it sound more natural. As our smarter self, how would you rewrite this to make it perfect?
Ask only one question.${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
            } else {
              actionPrompt = `You are in "Review Mode" (Stage 2 — New scenario application).
Your role is an encouraging, warm conversation companion testing if the user has mastered "${targetConceptName}" in a new context. Follow the language mode rules from the system prompt.
Create a vivid, simple daily scenario (ordering at a cafe, airport, hobbies, etc.). Challenge the user with a sentence that tests "${type}" in this new scenario. Do NOT show the original wrong sentence "${orig}" or corrected sentence "${corr}".
Ask only one question.${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
            }
          } else {
            actionPrompt = `You are in "Review Mode".
Since the user has no recorded mistakes, pick a typical beginner English grammar mistake (e.g. "I very like playing basketball" or "I go to school yesterday"), play the role of the past user saying it, and ask the user to correct/rephrase it. Ask only one question.${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
          }
        } else if (isPracticeMode) {
          actionPrompt = `You are in "Targeted Practice Mode" (针对训练模式) for "${nodeDisplayName}".

${practiceWeaknessProfile}

${isEnglishPref ? `
OPENING — This is the first message. Do the following:
1. Warmly welcome the user in ENGLISH. Say: "Welcome to Targeted Practice! I analyzed your conversation history and here's your grammar weakness profile:"
2. Clearly announce their weakness profile in English: read out each weakness from the profile above, in order, with the example error sentence.
3. Declare: "Today we'll start with #1 — [weakness name]." Explain this weakness in super simple, plain everyday English with a vivid analogy. No academic terms.
4. Give ONE targeted challenge (translation, correction, or fill-in-blank) that specifically tests this weakness.

CRITICAL RULES:
- ONLY train weaknesses listed in the profile above. NEVER introduce a grammar topic not in the profile.
- Stay on one weakness until the user answers correctly at least 2 times in a row. When mastered, append "[MASTERED: <friendlyName>]" (use the exact friendly name from the profile). Then move to the next weakness.
- Progress: #1 → #2 → #3. No skipping.
- RESPOND IN ENGLISH ONLY. Zero Chinese characters.
- If no weaknesses in profile, pick ONE common beginner topic and stick with it.

Ask only one challenge. Keep it encouraging.`
: isBalancedPref ? `
OPENING — This is the first message. Do the following:
1. Warmly welcome the user bilingually. Say: "Welcome to Targeted Practice! 欢迎来到针对训练！I analyzed your chat history. Here's your grammar weakness profile / 你的语法弱点画像："
2. Announce each weakness with its English name FIRST, Chinese name in brackets: e.g. "1. Verb Tenses (动词时态) — you said 'I go yesterday' instead of 'I went'."
3. Declare: "Today we'll start with #1 — [weakness]. 今天从第1个开始。" Explain this weakness in simple everyday English. Add a short Chinese analogy if it helps.
4. Give ONE targeted challenge (translation, correction, or fill-in-blank) in English.

CRITICAL RULES:
- ONLY train weaknesses listed in the profile above. NEVER introduce a grammar topic not in the profile.
- Stay on one weakness until the user answers correctly at least 2 times in a row. When mastered, append "[MASTERED: <friendlyName>]" (use the exact friendly name from the profile).
- Progress: #1 → #2 → #3. No skipping.
- MAIN CONVERSATION: English. GRAMMAR CORRECTIONS: simple English first, short Chinese hint only for tricky points.
- If no weaknesses in profile, pick ONE common beginner topic and stick with it.

Ask only one challenge. Keep it encouraging.`
: `
OPENING — This is the first message. Do the following:
1. Warmly welcome the user. Say: "欢迎来到针对训练！我分析了你的历史对话记录，这是你目前的语法弱点画像："
2. Clearly announce their weakness profile: read out each weakness from the profile above, in order, with the example error sentence.
3. Declare: "今天我们从第 1 个开始——【弱点名称】。" Explain this weakness in super simple "大白话" Chinese with a vivid everyday analogy. No academic terms.
4. Give ONE targeted challenge (translation, correction, or fill-in-blank) that specifically tests this weakness.

CRITICAL RULES:
- ONLY train weaknesses listed in the profile above. NEVER introduce a grammar topic not in the profile.
- Stay on one weakness until the user answers correctly at least 2 times in a row. When mastered, append "[MASTERED: <弱点名称>]" (e.g. "[MASTERED: 动词时态 (Tenses)]") at the very end of your response. Only then move to the next weakness.
- Progress: #1 → #2 → #3. No skipping.
- If no weaknesses in profile, pick ONE common beginner topic and stick with it.

Ask only one challenge. Keep it encouraging.`
}
- NEVER skip around randomly. Progress: #1 mastered → #2 mastered → #3 mastered.
- If the user has no weaknesses in the profile (empty), pick ONE common beginner topic and stick with it.

Ask only one challenge. Keep it encouraging.${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
        } else {
          const userHasEnglish = /[a-zA-Z]{3,}/.test(userMessage)
          const errorHintFirst = userHasEnglish
            ? (isEnglishPref
              ? `The user's message contains English. ⚠️ IMPORTANT: You MUST append exactly "[CORRECTED: <the fully corrected version of the user's sentence>]" at the very end of your response.`
              : isBalancedPref
              ? `用户的发言中包含英文。⚠️ 重要：你必须在回复末尾确切地附加 "[CORRECTED: <用户句子的完整正确版本>]" 标签。`
              : `用户在消息中使用了英文。⚠️ 重要：你必须在回复末尾确切地附加 "[CORRECTED: <用户句子的完整正确版本>]" 标签。`)
            : ''
          actionPrompt = `用户刚刚开始了英语学习对话。请你用英语和他们聊天，像朋友一样。
目的引导用户用英语多表达。从用户的消息出发，问一个相关的问题让他们继续说下去。
如果用户的消息很短，问一个开放式问题让他们展开。如果用户已经说了一些内容，追问更多细节。
每次只问一个问题。用自然的、口语化的英语。
如果用户的表达中有语法或词汇错误，不要直接指出来——用 recast（隐性纠错），在你的回复中自然地使用正确的形式。${errorHintFirst}`
        }
      } else {
        // 第一条消息：摄影模式-无图片，直接提问进行话题讨论
        actionPrompt = `用户向你提问了一个摄影问题。请结合你的摄影知识，用启发式提问引导用户自己开始思考和探讨如何解决或实现这个问题。
不要直接给出具体的摄影参数、最终技巧或标准答案，而是引导他们先描述或思考他们想达到的视觉效果、以及他们目前面临的具体问题（如光线、环境、构图等）。
每次只问一个问题，引导他们发现背后的规律。`
      }
    } else if (isEnglish) {
      // 英语模块：后续对话
      const correctedInstruction = /[a-zA-Z]{3,}/.test(userMessage)
        ? `\n⚠️ IMPORTANT: You MUST append exactly "[CORRECTED: <the fully corrected version of the user's sentence>]" at the very end of your response.`
        : ''
      const errorHint = (englishDiag && englishDiag.errorsInResponse.length > 0
        ? (isEnglishPref
          ? `\nPotential language issues in the user's recent response: ${englishDiag.errorsInResponse.map(e => `${e.errorType}(${e.severity})`).join(', ')}. Strategy: ${englishDiag.correctionType || 'recast'}. Use recast (naturally repeat the correct form in your reply) to correct. If the same error has appeared multiple times, give a short meta-linguistic hint in English.`
          : isBalancedPref
          ? `\nPotential language issues in user's response: ${englishDiag.errorsInResponse.map(e => `${e.errorType}(${e.severity})`).join(', ')}. Strategy: ${englishDiag.correctionType || 'recast'}. Correct via recast. If error persists, add a brief Chinese hint in brackets.`
          : `\n用户在最近回答中的潜在语言问题：${englishDiag.errorsInResponse.map(e => `${e.errorType}(${e.severity})`).join(', ')}。纠正策略：${englishDiag.correctionType || 'recast'}。使用 recast（在你的回复中自然重复正确形式）来纠正。如果同一错误已出现多次，可以给一个简短的元语言提示。`)
        : '') + correctedInstruction
      const levelHint = englishDiag
        ? (isEnglishPref
          ? `\nUser's estimated CEFR level: ${englishDiag.cefrEstimate}. Adjust your vocabulary and sentence complexity to match this level (i+1 principle).`
          : isBalancedPref
          ? `\nUser's estimated CEFR level: ${englishDiag.cefrEstimate}. Adjust vocabulary and complexity accordingly (i+1).`
          : `\n用户的估计 CEFR 水平：${englishDiag.cefrEstimate}。调整你的词汇和句子复杂度匹配这个水平（i+1 原则）。`)
        : ''

      if (isReviewMode) {
        if (targetErrorToReview) {
          const orig = targetErrorToReview.original_text
          const type = targetErrorToReview.error_type || ''
          
          if (targetErrorStage === 0) {
            actionPrompt = `You are in "Review Mode" (Stage 1 — Correct the original sentence).
You are a warm English conversation companion helping them perfect their past statement.
The original error was: "${orig}".
Evaluate the user's latest response. Did they correct this past error successfully and naturally?
Be extremely strict: the rephrased sentence must be 100% correct, natural, and native-like English (100% accuracy).
If it is 100% correct and natural, praise them warmly (e.g. "Bull's-eye! Perfect intuition!"), explain the grammar rule or why the correction is correct in simple terms (no academic grammar terms).
Crucially, you must append "[RESOLVED: ${orig}]" at the very end of your response.
If they did not succeed or if there are still minor errors, typos, or unnatural phrasing, do NOT show them the answer. Instead, use Recast and Scaffolding (e.g. give a gentle clue like "Close! Think about the verb tense here...", ask a scaffolding question), and encourage them to try rephrasing it again. Do NOT append the RESOLVED tag.
Keep the focus entirely on guiding them to perfect their past language expressions. Ask only one question. You may use up to 6 sentences for evaluation + explanation + next challenge. ${errorHint}${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
          } else {
            actionPrompt = `You are in "Review Mode" (Stage 2 — New scenario application).
You are a warm English conversation companion testing if they can apply "${type}" in the scenario.
The user's original error being reviewed is: "${orig}".
Evaluate the user's latest response. Did they complete the translation or sentence challenge correctly, using the correct grammar form of "${type}"?
Be extremely strict: their sentence must be 100% correct and natural English (100% accuracy).
If it is 100% correct and natural, praise them warmly (e.g. "Spot on! You've totally mastered this!"), explain the grammar point in simple terms (no academic grammar terms).
Crucially, you must append "[RESOLVED: ${orig}]" at the very end of your response to mark this error as fully conquered!
If they did not succeed or if there are still minor errors, typos, or incorrect phrasing, do NOT give the answer. Use Recast and Scaffolding (e.g. "Almost! Remember to use... Can you try that again?"), guide them step-by-step, and do NOT append the RESOLVED tag.
Keep the focus entirely on perfecting their expression under this new scenario. Ask only one question. You may use up to 6 sentences for evaluation + explanation + next challenge. ${errorHint}${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
          }
        } else {
          actionPrompt = `You are in "Review Mode".
Evaluate the user's latest response. Did they correct the mistake successfully?
If they did, praise them and append "[RESOLVED: <original_mistake>]" at the end. Otherwise give them a hint and ask them to try again.${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
        }
      } else if (isPracticeMode) {
        actionPrompt = `You are in "Targeted Practice Mode" (针对训练模式).

${practiceWeaknessProfile}

YOUR JOB: Read the conversation history to determine which weakness from the profile you are currently practicing. Then evaluate the user's latest response.

${isEnglishPref ? `
EVALUATION (English mode):
- If the user CORRECTLY applied the grammar rule:
  * Praise warmly in English with a simple explanation of WHY it's correct.
  * Track: have they answered correctly 2+ times in a row for THIS weakness?
    - YES (2+ consecutive correct): Announce "Perfect! You've mastered this!" and append "[MASTERED: <friendlyName>]". Then move to the NEXT weakness.
    - NOT YET (only 1 correct): Give another challenge on the SAME weakness. Say "Nicely done! Let's do one more to lock it in."
- If the user's answer has ERRORS:
  * Gently explain the error in simple English. Show the contrast (error → correct). No academic grammar terms.
  * Give a scaffolded HINT. Stay on the SAME weakness.

CRITICAL CONSTRAINTS:
- ONLY train weaknesses in the profile. NEVER introduce a new topic.
- Stay on one weakness until 2+ consecutive correct. Then append [MASTERED: ...].
- Progress: #1 → #2 → #3. No skipping.
- Give ONE question at a time.
- ENGLISH ONLY. Zero Chinese.

WHEN ALL mastered: warmly congratulate and suggest "全局温习" to apply everything in real conversation.
`
: isBalancedPref ? `
EVALUATION (Balanced bilingual mode):
- If the user CORRECTLY applied the grammar rule:
  * Praise warmly in English with a simple explanation of WHY. Add a short Chinese cheer like "很好！" in brackets.
  * Track: have they answered correctly 2+ times in a row for THIS weakness?
    - YES (2+ consecutive correct): Announce "Well done! You've mastered this! 攻克成功！" and append "[MASTERED: <friendlyName>]". Then move to the NEXT weakness.
    - NOT YET (only 1 correct): Give another challenge on the SAME weakness. Say "Nice! Let's do one more to make sure. 再来一题巩固一下～"
- If the user's answer has ERRORS:
  * Explain the error in simple English FIRST. If tricky, add a short Chinese hint in brackets (1 sentence max). Show the contrast. No academic terms.
  * Give a scaffolded HINT. Stay on the SAME weakness.

CRITICAL CONSTRAINTS:
- ONLY train weaknesses in the profile. NEVER introduce a new topic.
- Stay on one weakness until 2+ consecutive correct. Then append [MASTERED: ...].
- Progress: #1 → #2 → #3. No skipping.
- Main explanation: English. Short Chinese hints only for tricky grammar points.
- Give ONE question at a time.

WHEN ALL mastered: warmly congratulate and suggest "全局温习" to apply everything in real conversation.
`
: `
EVALUATION (中文辅助模式):
- If the user CORRECTLY applied the grammar rule:
  * Praise warmly with a "大白话" explanation in Chinese of WHY it's correct.
  * Track: have they answered correctly 2+ times in a row for THIS weakness?
    - YES (2+ consecutive correct): Announce "✅ 这个弱点已攻克！" and append exactly "[MASTERED: <弱点名称>]" (e.g. "[MASTERED: 动词时态 (Tenses)]"). Then move to the NEXT weakness.
    - NOT YET (only 1 correct): Give another challenge on the SAME weakness. Say "很好！再来一题巩固一下～"
- If the user's answer has ERRORS:
  * Gently explain the error in "大白话" Chinese. Show the contrast (错 → 对). No academic grammar terms.
  * Give a scaffolded HINT. Stay on the SAME weakness.

CRITICAL CONSTRAINTS:
- ONLY train weaknesses in the profile. NEVER introduce a new topic.
- Stay on one weakness until 2+ consecutive correct. Then append [MASTERED: ...].
- Progress: #1 → #2 → #3. No skipping.
- Use "大白话小白教学" — zero academic grammar terms.
- Give ONE question at a time.

WHEN ALL mastered: warmly congratulate and suggest "全局温习" to apply everything in real conversation.
`}

${errorHint}${showChooseLangHint ? '\n\n⚠️ IMPORTANT: You MUST append exactly " [CHOOSE_LANG]" at the very end of your response to ask for language preference.' : ''}`
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

    // 英语模式：清除 actionPrompt 中所有中文指令，替换为对应英文
    if (isEnglishPref && actionPrompt) {
      actionPrompt = actionPrompt
        .replace(/欢迎来到针对训练！/g, 'Welcome to Targeted Practice!')
        .replace(/我分析了你的历史对话记录，这是你目前的语法弱点画像/g, "I analyzed your chat history. Here's your grammar weakness profile")
        .replace(/今天我们从第 (\d) 个开始——/g, "Today we'll start with #$1 — ")
        .replace(/今天我们从第/g, "Today we'll start with #")
        .replace(/弱点名称/g, 'weakness name')
        .replace(/大白话/g, 'plain everyday English')
        .replace(/小白/g, 'beginner-friendly')
        .replace(/用中英文/g, 'in simple English')
        .replace(/中英文/g, 'English')
        .replace(/中文/g, 'English')
        .replace(/温习模式/g, 'Review Mode')
        .replace(/针对训练模式/g, 'Targeted Practice Mode')
        .replace(/第一关/g, 'Level 1')
        .replace(/第二关/g, 'Level 2')
        .replace(/原句改错/g, 'Original Sentence Correction')
        .replace(/新场景迁移/g, 'New Scenario Application')
        .replace(/⚠️ 重要/g, '⚠️ IMPORTANT')
        .replace(/对话末尾附加 " \[CHOOSE_LANG\]"/g, 'the very end of your response append " [CHOOSE_LANG]"')
        .replace(/弱点画像/g, 'weakness profile')
        .replace(/\(\)/g, '()') // cleanup
    }

    // 每个语言模式追加统一的结构化输出格式指令
    const langEnforcementSuffix = isEnglishPref
      ? '\n\n## OUTPUT LANGUAGE — ENGLISH ONLY\nYour entire output must be in English only. Zero Chinese characters.'
      : isBalancedPref
      ? '\n\n## OUTPUT FORMAT — BALANCED\nYour response must include these elements (in order):\n[English greeting/conversation]\n(提示：中文语法提示) — a short Chinese hint in brackets\n[English challenge/question]\n\nYou MUST include the (提示：...) bracket. Do not skip it.'
      : '\n\n## OUTPUT FORMAT — CHINESE\nYour response must use this structure:\n[一句英文开场]\n【中文语法讲解】— explain the grammar in Chinese 大白话, at least 2-3 sentences\n（挑战/问题）— in English\n\nYou MUST include the 【中文语法讲解】section. Do not skip it.'

    explanationPrefPrompt += langEnforcementSuffix

    // 同时在 actionPrompt (user message) 末尾追加语言指令 — DeepSeek 对 user message 权重更高
    if (isEnglish && (isReviewMode || isPracticeMode)) {
      actionPrompt += langEnforcementSuffix
    }

    // 将系统提示(actionPrompt)作为隐藏指令合并到最后一条 user 消息中
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
      maxTokens: 800,
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
    let masteredWeakness: string | undefined = undefined

    let showLangSelector = false
    let cleanedAiResponse = aiResponse
    let extractedCorrectedText: string | null = null
    let extractedHintText: string | null = null

    if (isEnglish) {
      const correctedMatch = cleanedAiResponse.match(/\[CORRECTED:\s*([\s\S]*?)\]/i)
      if (correctedMatch) {
        extractedCorrectedText = correctedMatch[1].trim()
        cleanedAiResponse = cleanedAiResponse.replace(/\[CORRECTED:\s*[\s\S]*?\]/gi, '').trim()
      }
      const hintMatch = cleanedAiResponse.match(/\[HINT:\s*([\s\S]*?)\]/i)
      if (hintMatch) {
        extractedHintText = hintMatch[1].trim()
        cleanedAiResponse = cleanedAiResponse.replace(/\[HINT:\s*[\s\S]*?\]/gi, '').trim()
      }
    }

    if (isEnglish && cleanedAiResponse.includes('[CHOOSE_LANG]')) {
      showLangSelector = true
      cleanedAiResponse = cleanedAiResponse.replace(/\[CHOOSE_LANG\]/gi, '').trim()
      finalAiResponse = cleanedAiResponse
    } else {
      finalAiResponse = cleanedAiResponse
    }

    if (isEnglish) {
      if (cleanedAiResponse.includes('[Normal Reply]') || cleanedAiResponse.includes('[Challenge Task]')) {
        const normalMatch = cleanedAiResponse.match(/\[Normal Reply\]([\s\S]*?)(?=\[Challenge Task\]|$)/i)
        const challengeMatch = cleanedAiResponse.match(/\[Challenge Task\]([\s\S]*?)$/i)
        
        const normalPart = normalMatch ? normalMatch[1].trim() : ''
        const challengePart = challengeMatch ? challengeMatch[1].trim() : ''
        
        if (challengePart) {
          isTask = true
          challengeInstruction = challengePart
          finalAiResponse = normalPart || cleanedAiResponse.replace(/\[Challenge Task\][\s\S]*$/i, '').replace(/\[Normal Reply\]/i, '').trim()
        } else {
          finalAiResponse = cleanedAiResponse.replace(/\[Normal Reply\]/i, '').trim()
        }
      } else {
        // 回退逻辑：如果 AI 没有遵循标记格式，但仍包含 challenge 特征词
        if ((cleanedAiResponse.includes("Here's a small challenge") || cleanedAiResponse.includes("challenge for you")) && !continueChatting) {
          isTask = true
          const parts = cleanedAiResponse.split(/Here's a small challenge for you:?/i)
          finalAiResponse = parts[0].trim()
          challengeInstruction = parts[1] ? parts[1].trim() : 'Please complete the challenge.'
        }
      }

      // 检查 AI 是否判定解决了某条历史错句，并更新数据库 noted_by_user = true
      const resolvedMatch = cleanedAiResponse.match(/\[RESOLVED:\s*([\s\S]*?)\]/i)
      if (resolvedMatch) {
        const rawResolvedText = resolvedMatch[1].trim()
        const cleanResolvedText = rawResolvedText.replace(/^["'*`“]+|["'*`”]+$/g, '').trim()
        isResolved = true
        resolvedText = cleanResolvedText
        // 去除 [RESOLVED: ...] 标签，不展示给用户
        finalAiResponse = finalAiResponse.replace(/\[RESOLVED:\s*[\s\S]*?\]/gi, '').trim()
        
        try {
          if (targetErrorStage === 0) {
            // 通过第一关：更新 error_pattern 标记
            const currentPattern = targetErrorToReview?.error_pattern || ''
            const newPattern = currentPattern.endsWith(':stage-1') ? currentPattern : `${currentPattern}:stage-1`
            await supabase
              .from('error_records')
              .update({ error_pattern: newPattern, corrected_text: userMessage })
              .eq('user_id', userId)
              .eq('original_text', cleanResolvedText)
              .eq('noted_by_user', false)
          } else {
            // 通过第二关：完全攻克，打上 noted_by_user 标记
            await supabase
              .from('error_records')
              .update({ noted_by_user: true })
              .eq('user_id', userId)
              .eq('original_text', cleanResolvedText)
              .eq('noted_by_user', false)
          }
        } catch (dbErr) {
          console.error('[Error Resolve Failed]:', dbErr)
        }
      }
      
      // 检查 AI 是否判定攻克了某个语法弱点（针对训练模式）
      if (isPracticeMode) {
        const masteredMatch = cleanedAiResponse.match(/\[MASTERED:\s*([^\]]+)\]/i)
        if (masteredMatch) {
          masteredWeakness = masteredMatch[1].trim()
          const matchedItem = weaknessProfileItems.find(w =>
            w.friendlyName === masteredWeakness || w.errorType === masteredWeakness
          )
          if (matchedItem) {
            matchedItem.mastered = true
          }
          finalAiResponse = finalAiResponse.replace(/\[MASTERED:\s*[^\]]+\]/gi, '').trim()
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

    // --- 8.5 记录英语错误（带有提取到的 corrected_text） ---
    if (isEnglish && englishDiag && englishDiag.errorsInResponse.length > 0) {
      try {
        const errorInserts = englishDiag.errorsInResponse.map(e => {
          const cleanText = e.originalText.replace(/^\.\.\.|\.\.\.$/g, '').trim() || userMessage
          return {
            user_id: userId,
            session_id: sessionId,
            original_text: cleanText,
            corrected_text: extractedCorrectedText || null,
            error_type: e.errorType,
            error_pattern: e.errorType,
            severity: e.severity,
          }
        })
        await supabase.from('error_records').insert(errorInserts)
      } catch (dbErr) {
        console.error('[Error Records Insertion Failed]:', dbErr)
      }
    } else if (isEnglish && extractedCorrectedText) {
      // LLM detected an error (via [CORRECTED:] tag) that regex engine missed
      const norm = (s: string) => s.replace(/[.!?，。？！…\s]+$/g, '').toLowerCase().trim()
      if (norm(extractedCorrectedText) !== norm(userMessage)) {
        const detected = englishDiag?.errorsInResponse?.[0]
        try {
          await supabase.from('error_records').insert({
            user_id: userId,
            session_id: sessionId,
            original_text: userMessage,
            corrected_text: extractedCorrectedText,
            error_type: detected?.errorType || 'expression-chinglish',
            error_pattern: detected?.errorType || 'expression-chinglish',
            severity: detected?.severity || 'moderate',
          })
        } catch (dbErr) {
          console.error('[Error Records LLM Fallback Failed]:', dbErr)
        }
      }
    }

    // --- 8.6 为错误创建星图发现记录（点亮星座节点） ---
    const hadError = (isEnglish && englishDiag && englishDiag.errorsInResponse.length > 0) ||
      (isEnglish && extractedCorrectedText && (() => {
        const norm = (s: string) => s.replace(/[.!?，。？！…\s]+$/g, '').toLowerCase().trim()
        return norm(extractedCorrectedText) !== norm(userMessage)
      })())
    if (hadError && activeNodeId) {
      try {
        const errorType = englishDiag?.errorsInResponse?.[0]?.errorType || 'expression-chinglish'
        await supabase.from('discoveries').insert({
          id: uuidv4(),
          session_id: sessionId,
          user_id: userId || 'anonymous',
          title: `发现错误模式：${getFriendlyErrorName(errorType)}`,
          summary: `你在"${activeNodeId}"的练习中出现了${getFriendlyErrorName(errorType)}相关的语法问题。已记录到错题本，可在「温习」页进行针对性强化。`,
          tags: [errorType, activeNodeId],
          source_round: round || 1,
          knowledge_node_id: activeNodeId,
        })
      } catch (dbErr) {
        console.error('[Discovery Creation Failed]:', dbErr)
      }
    }

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
    // 优先使用 AI 的 [CORRECTED:] 标签（LLM 比规则引擎更准确）
    const firstDetectedError = englishDiag?.errorsInResponse?.[0] ?? null

    return NextResponse.json({
      success: true,
      showLangSelector,
      weaknessProfile: weaknessProfileItems,
      targetErrorType: targetErrorTypeFriendly || undefined,
      userWeaknesses: userWeaknesses.length > 0 ? userWeaknesses : undefined,
      masteredWeakness,
      // 前端纠错展示数据：correctedText 与用户原句不同（忽略尾标点）才算有错
      detectedError: extractedCorrectedText && (() => {
        const norm = (s: string) => s.replace(/[.!?，。？！…\s]+$/g, '').toLowerCase().trim()
        return norm(extractedCorrectedText) !== norm(userMessage)
      })() ? {
        errorType: firstDetectedError?.errorType || 'expression-chinglish',
        correctedText: extractedCorrectedText,
        hintText: extractedHintText || undefined,
      } : null,
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
      resolvedStage: isResolved ? (targetErrorStage + 1) : undefined,
      reviewStage: (isReviewMode && targetErrorToReview) ? (targetErrorStage + 1) : undefined,
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

function getFriendlyErrorName(type: string): string {
  const names: Record<string, string> = {
    'grammar-tense': '动词时态 (Tenses)',
    'grammar-article': '冠词使用 (Articles)',
    'grammar-preposition': '介词搭配 (Prepositions)',
    'grammar-word-order': '语序结构 (Word Order)',
    'grammar-agreement': '主谓一致 (Subject-Verb Agreement)',
    'vocabulary-choice': '词汇搭配 (Word Choice)',
    'expression-chinglish': '中式英语 (Chinglish)',
    'expression-incomplete': '句子完整性 (Sentence Completeness)',
  }
  return names[type] || type || '语法词汇 (Grammar/Vocabulary)'
}

function selectTargetErrorSpacedRepetition(errors: any[]): any {
  if (!errors || errors.length === 0) return null
  
  const now = new Date().getTime()
  const scoredErrors = errors.map(err => {
    // 1. 基础权重 (Severity)
    let severityWeight = 50
    if (err.severity === 'major') severityWeight = 100
    else if (err.severity === 'moderate') severityWeight = 80

    // 2. 关卡权重 (Stage 1 处于新场景迁移，优先级稍微提高以趁热打铁)
    const isStage1 = (err.error_pattern || '').endsWith(':stage-1')
    const stageWeight = isStage1 ? 30 : 0

    // 3. 遗忘曲线时间因子 (Created Age)
    const createdAt = new Date(err.created_at).getTime()
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
    
    let timeFactor = 1.0
    if (hoursSinceCreation < 0.2) {
      // 12分钟内刚创造的：短期记忆中，进行冷却，降低打扰
      timeFactor = 0.4
    } else if (hoursSinceCreation < 24) {
      // 12分钟-24小时内：最适合第一次复习，大幅提升权重
      timeFactor = 1.6
    } else if (hoursSinceCreation < 72) {
      // 1-3天内：记忆衰退期，权重提升
      timeFactor = 1.3
    } else {
      // 3天以上：更旧的错题，保持正常权重
      timeFactor = 1.0
    }

    // 4. 最终打分 + 随机扰动 (0.8 - 1.2)，防止每次都考同一个错题导致死锁
    const baseScore = (severityWeight + stageWeight) * timeFactor
    const randomJitter = Math.random() * 0.4 + 0.8
    const finalScore = baseScore * randomJitter

    return {
      error: err,
      score: finalScore,
    }
  })

  // 按得分从高到低排序，返回最高分者
  scoredErrors.sort((a, b) => b.score - a.score)
  return scoredErrors[0].error
}
