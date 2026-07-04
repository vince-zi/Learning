import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'
import { getServerClient } from '@/lib/db/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, taskId, instruction, userAnswer } = body

    if (!sessionId || !taskId || !instruction || !userAnswer) {
      return NextResponse.json(
        { error: 'sessionId, taskId, instruction, and userAnswer are required' },
        { status: 400 }
      )
    }

    const provider = getCachedProvider()
    const evaluationPrompt = `你是一个英语学习助教。请评估用户针对以下挑战任务的回答是否正确/合理。

挑战任务指令: "${instruction}"
用户填写的回答: "${userAnswer}"

评估标准：
1. 用户的回答是否符合任务指令的要求？
2. 用户的回答是否大体上正确（允许极其微小的拼写或标点问题，但语法和核心词汇要正确）？

请按照以下 JSON 格式进行回复：
{
  "passed": true 或 false (如果回答正确，填 true；如果错误，填 false),
  "feedback": "一句生动有趣的反馈，如果回答正确，给予称赞，如果是错的，给予温和的改进提示。反馈中使用中英文双语对照（英文后紧跟中文翻译，如：Great job! (做得真棒！)")"
}

仅输出上述 JSON，不要包含 markdown 代码块标记，不要包含任何其他文字。`

    const response = await provider.chat({
      systemPrompt: '你是一个严格输出JSON的助手。',
      messages: [
        { role: 'user', content: evaluationPrompt }
      ],
      maxTokens: 300,
      temperature: 0.3,
    })

    const rawContent = response.content || ''
    const cleanContent = rawContent.replace(/```json/i, '').replace(/```/g, '').trim()
    
    let evaluationResult
    try {
      evaluationResult = JSON.parse(cleanContent)
    } catch (e) {
      console.error('Failed to parse AI evaluation JSON:', rawContent)
      // Fallback
      // ⚠️ 安全修复：JSON解析失败时不能默认判定通过，改为 false 防止错题被误判为正确
      evaluationResult = {
        passed: false,
        feedback: "Evaluation format error, please try again. (AI评估格式异常，请重试。)"
      }
    }

    const supabase = getServerClient()

    if (evaluationResult.passed) {
      // 1. 更新任务状态为 completed
      await supabase
        .from('practice_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      // 获取当前轮数以保持一致的 round_number
      const { data: sessionData } = await supabase
        .from('learning_sessions')
        .select('current_round')
        .eq('id', sessionId)
        .single()

      const currentRound = sessionData?.current_round || 1

      // 2. 插入用户答案消息到 messages
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        message_type: 'answer',
        content: userAnswer,
        round_number: currentRound,
      })

      // 3. 插入助教反馈消息到 messages
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'assistant',
        message_type: 'question',
        content: evaluationResult.feedback,
        round_number: currentRound,
      })
    }

    return NextResponse.json({
      success: true,
      passed: evaluationResult.passed,
      feedback: evaluationResult.feedback
    })

  } catch (error: any) {
    console.error('[Evaluate API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Evaluation failed' },
      { status: 500 }
    )
  }
}
