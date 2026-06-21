// ============================================================
// API Route: PATCH /api/sessions/:id
// 更新学习会话状态 (例如启动新一轮/重置状态)
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const { status, current_round, completed_at, theme } = body

    const supabase = getServerClient()

    const updates: any = {}
    if (status !== undefined) updates.status = status
    if (current_round !== undefined) updates.current_round = current_round
    if (completed_at !== undefined) {
      updates.completed_at = completed_at
    } else if (completed_at === null) {
      updates.completed_at = null
    }
    if (theme !== undefined) updates.theme = theme

    const { data: session, error } = await supabase
      .from('learning_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update session:', error.message)
      return NextResponse.json({ error: 'Failed to update session', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: {
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
        questioningStyle: session.questioning_style,
      },
    })
  } catch (error: any) {
    console.error('[Session PATCH API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const supabase = getServerClient()
    const { error } = await supabase
      .from('learning_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Failed to delete session:', error.message)
      return NextResponse.json({ error: 'Failed to delete session', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Session DELETE API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete session' },
      { status: 500 }
    )
  }
}
