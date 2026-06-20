// ============================================================
// API Route: PATCH /api/tasks/:id
// 更新任务状态
// ============================================================

import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/db/supabase-server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'accepted', 'skipped', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = getServerClient()
    const updates: Record<string, any> = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('practice_tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
