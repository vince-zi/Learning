// ============================================================
// API: POST /api/feedback
// Stores user feedback/suggestions to Supabase user_feedback table
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, message, page } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: '请输入建议内容' }, { status: 400 });
    }

    if (message.trim().length > 1000) {
      return NextResponse.json({ error: '建议内容不能超过 1000 字' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('user_feedback').insert({
      user_id: user_id || 'anonymous',
      message: message.trim(),
      page: page || 'profile',
    });

    if (error) {
      console.error('[Feedback] Supabase insert error:', error);
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Unexpected error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
