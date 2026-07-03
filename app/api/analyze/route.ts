// ============================================================
// API Route: POST /api/analyze
// Fast grammar analysis — lightweight LLM call, returns in <1s
// Separate from the main chat flow so yellow-dot works instantly
// ============================================================

import { NextResponse } from 'next/server'
import { getCachedProvider } from '@/interface/ai/provider-factory'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userMessage } = body

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage required' }, { status: 400 })
    }

    // Only analyze if there's English content
    if (!/[a-zA-Z]{3,}/.test(userMessage)) {
      return NextResponse.json({ corrected: false })
    }

    const provider = getCachedProvider()
    const response = await provider.chat({
      systemPrompt: `You are a grammar checker. For the given sentence:
1. If the English is correct, respond ONLY with: CORRECT
2. If there are grammar errors, respond ONLY with: FIX: <the fully corrected version>

Do NOT add any other text, explanations, or conversation. Just the raw output as specified above.`,

      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 80,
      temperature: 0,
    })

    const text = response.content.trim()

    if (text.startsWith('CORRECT') || text === 'CORRECT') {
      return NextResponse.json({ corrected: false })
    }

    const fixMatch = text.match(/^FIX:\s*(.+)/i)
    if (fixMatch) {
      const corrected = fixMatch[1].trim()
      if (corrected.toLowerCase().trim() !== userMessage.toLowerCase().trim()) {
        return NextResponse.json({ corrected: true, correctedText: corrected })
      }
    }

    return NextResponse.json({ corrected: false })
  } catch (error: any) {
    console.error('[Analyze API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
