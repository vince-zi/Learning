// ============================================================
// API Route: POST /api/translate
// 利用 DeepSeek AI 将指定文本翻译成中文
// ============================================================

import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const provider = getCachedProvider()
    const response = await provider.chat({
      systemPrompt: "你是一个专业的翻译助手。请将给定的文本（主要是英语）翻译成自然、流畅、准确的中文。如果原文中已包含中文片段，请原样保留。只需输出翻译后的纯中文结果，不需要任何解释、注释、前言或额外格式。",
      messages: [
        { role: 'user', content: text }
      ],
      maxTokens: 800,
      temperature: 0.3,
    })

    return NextResponse.json({
      success: true,
      translation: response.content.trim(),
    })
  } catch (error: any) {
    console.error('[Translate API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    )
  }
}
