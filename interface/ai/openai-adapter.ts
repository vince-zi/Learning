// ============================================================
// Interface Layer: OpenAI Adapter
// OpenAI API 适配器 — 实现 AIProvider 接口
// 支持 GPT-4o / GPT-4 Vision 等模型
// ============================================================

import type { AIProvider, ChatParams, ChatResponse, ImageAnalysisParams, ImageAnalysis } from './provider-interface'
import { AIProviderError } from './provider-interface'

let OpenAI: any = null

async function getClient() {
  if (!OpenAI) {
    try {
      const mod = await import('openai')
      OpenAI = mod.default
    } catch {
      throw new AIProviderError(
        'openai is not installed. Run: npm install openai',
        'openai',
        undefined,
        false
      )
    }
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export const openaiAdapter: AIProvider = {
  name: 'openai',

  async chat(params: ChatParams): Promise<ChatResponse> {
    const client = await getClient()

    // 构建消息数组
    const messages: any[] = [
      { role: 'system', content: params.systemPrompt },
    ]

    // 添加对话历史
    for (const msg of params.messages.slice(0, -1)) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // 最后一条消息（可能包含图片）
    const lastMsg = params.messages[params.messages.length - 1]
    if (lastMsg) {
      const content: any[] = [{ type: 'text', text: lastMsg.content }]
      if (params.imageUrls) {
        for (const url of params.imageUrls) {
          content.push({
            type: 'image_url',
            image_url: { url, detail: 'auto' },
          })
        }
      }
      messages.push({ role: 'user', content })
    }

    try {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature ?? 0.7,
        messages,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      }
    } catch (error: any) {
      const statusCode = error.status
      throw new AIProviderError(
        error.message || 'OpenAI API call failed',
        'openai',
        statusCode,
        statusCode !== 400
      )
    }
  },

  async analyzeImage(params: ImageAnalysisParams): Promise<ImageAnalysis> {
    const client = await getClient()

    const content: any[] = [
      { type: 'text', text: params.question || '请详细分析这张照片的技术参数和视觉特征。' },
    ]

    for (const url of params.imageUrls) {
      content.push({
        type: 'image_url',
        image_url: { url, detail: 'high' },
      })
    }

    try {
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content },
        ],
      })

      const textContent = response.choices[0]?.message?.content || ''

      return {
        observations: textContent.split('\n').filter((l: string) => l.trim()),
        rawResponse: textContent,
      }
    } catch (error: any) {
      throw new AIProviderError(
        error.message || 'Image analysis failed',
        'openai',
        error.status,
        error.status !== 400
      )
    }
  },
}
