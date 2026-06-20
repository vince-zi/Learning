// ============================================================
// API Route: GET /api/sessions/:id/messages
// 获取会话的消息历史
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const supabase = getServerClient()
    
    // 1. Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // 2. Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    const sessionMapped = session ? {
      id: session.id,
      userId: session.user_id,
      module: session.module,
      status: session.status,
      theme: session.theme,
      roundCount: session.round_count,
      photoCount: session.photo_count,
      discoveryCount: session.discovery_count,
      currentRound: session.current_round,
      startedAt: session.started_at,
      completedAt: session.completed_at,
    } : null

    return NextResponse.json({
      session: sessionMapped,
      messages: (messages || []).map((m: any) => ({
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
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
