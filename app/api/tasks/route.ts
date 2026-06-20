// ============================================================
// API Route: POST /api/tasks
// 生成实践任务（再拍挑战）
// ============================================================

import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'
import { SYSTEM_PROMPT } from '@/interface/prompts/system-prompt'
import { getServerClient } from '@/lib/db/supabase-server'
import { photographyKnowledgeGraph } from '@/core/knowledge-graph/photography-graph'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, userId, knowledgeNodeId, conversationSummary } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // 获取知识节点
    const nodeId = knowledgeNodeId || 'visual-focus'
    const node = photographyKnowledgeGraph.nodes.get(nodeId)

    const taskInstruction = node?.practiceTask.instruction ||
      '请再拍两张照片：一张把主体放在左边，一张放在右边。然后告诉我你的观察。'

    const hints = node?.practiceTask.scaffoldingHints.map(h => h.hint) || []

    // 尝试用 AI 润色任务
    let finalInstruction = taskInstruction
    try {
      const provider = getCachedProvider()
      const response = await provider.chat({
        systemPrompt: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `基于我们之前的对话，用户正在学习"${node?.name || '视觉重心'}"。请用自然、鼓励的语气给出以下任务（保持核心指令不变，但可以调整语序和语气）：\n\n${taskInstruction}`,
          },
        ],
        maxTokens: 200,
        temperature: 0.7,
      })
      finalInstruction = response.content || taskInstruction
    } catch {
      // 使用模板回退
    }

    // 写入数据库
    const taskId = uuidv4()
    const supabase = getServerClient()
    await supabase.from('practice_tasks').insert({
      id: taskId,
      session_id: sessionId,
      task_type: 'reshoot',
      instruction: finalInstruction,
      scaffolding_hints: hints,
      status: 'pending',
    })

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        instruction: finalInstruction,
        hints,
        type: 'reshoot',
      },
    })
  } catch (error: any) {
    console.error('[Tasks API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
