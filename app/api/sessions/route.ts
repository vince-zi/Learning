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
    const { userId, theme, module = 'photography' } = body

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
        current_knowledge_node_id: moduleConfig.defaultKnowledgeNodeId,
        round_count: 0,
        photo_count: 0,
        discovery_count: 0,
        current_round: 0,
        module: module,
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
        knowledgeNodeId: moduleConfig.defaultKnowledgeNodeId,
        status: session.status,
        theme: session.theme,
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
