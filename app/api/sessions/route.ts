// ============================================================
// API Route: POST /api/sessions
// 创建新的学习会话
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'
import { v4 as uuidv4 } from 'uuid'
import { MODULE_CONFIG } from '@/core/models/session'
import type { ModuleType } from '@/core/models/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
        const { userId, theme, module = 'english', questioningStyle = 'gentle', knowledgeNodeId } = body

    const moduleConfig = MODULE_CONFIG[module as ModuleType]

    const supabase = getServerClient()

    // 确保用户存在（upsert）
    const finalUserId = userId || `anon_${uuidv4()}`
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: finalUserId,
        is_anonymous: !userId,
        last_active_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (userError) {
      console.error('User upsert failed:', JSON.stringify(userError))
      return NextResponse.json({
        success: false,
        error: 'User setup failed',
        detail: userError.message,
        code: userError.code,
        hint: userError.hint,
        details: userError.details,
      }, { status: 500 })
    }

    // 创建会话
    const sessionId = uuidv4()
    const { data: session, error } = await supabase
      .from('learning_sessions')
      .insert({
        id: sessionId,
        user_id: finalUserId,
        status: 'started',
        theme: theme || moduleConfig.defaultTheme,
        current_knowledge_node_id: knowledgeNodeId || moduleConfig.defaultKnowledgeNodeId,
        round_count: 0,
        photo_count: 0,
        discovery_count: 0,
        current_round: 0,
        module: module,
        questioning_style: questioningStyle,
      })
      .select()
      .single()

    if (error) {
      console.error('Session insert failed:', JSON.stringify(error))
      return NextResponse.json({ error: 'Failed to create session', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        userId: finalUserId,
        module: module,
        knowledgeNodeId: session.current_knowledge_node_id,
        currentKnowledgeNodeId: session.current_knowledge_node_id,
        status: session.status,
        theme: session.theme,
        questioningStyle: session.questioning_style,
        startedAt: session.started_at,
      },
    })
  } catch (error: any) {
    console.error('[Sessions API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}

/** PATCH /api/sessions — mark session as completed */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { sessionId } = body
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const supabase = getServerClient()
    const { error } = await supabase
      .from('learning_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    if (error) {
      console.error('[Sessions PATCH] Error:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Sessions PATCH] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
