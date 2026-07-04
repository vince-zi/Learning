// ============================================================
// Interface Layer: DeepSeek Adapter
// DeepSeek API 适配器 — OpenAI 兼容接口
// Base URL: https://api.deepseek.com/v1
// Model: deepseek-chat (DeepSeek-V3)
//
// 注意：DeepSeek V3 是纯文本模型，不支持图片多模态。
// 图片分析会通过文本描述的方式降级处理。
// ============================================================

import type { AIProvider, ChatParams, ChatResponse, ImageAnalysisParams, ImageAnalysis } from './provider-interface'
import { AIProviderError } from './provider-interface'

let OpenAI: any = null

function getBaseURL(): string {
  return process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
}

function getModel(): string {
  return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
}

async function getClient() {
  if (!OpenAI) {
    try {
      const mod = await import('openai')
      OpenAI = mod.default
    } catch {
      throw new AIProviderError(
        'openai is not installed. Run: npm install openai',
        'deepseek',
        undefined,
        false
      )
    }
  }
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: getBaseURL(),
  })
}

export const deepseekAdapter: AIProvider = {
  name: 'deepseek',

  async chat(params: ChatParams): Promise<ChatResponse> {
    const client = await getClient()

    const messages: any[] = [
      { role: 'system', content: params.systemPrompt },
    ]

    // 添加对话历史
    for (const msg of params.messages.slice(0, -1)) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // 最后一条消息（可能包含图片）
    const lastMsg = params.messages[params.messages.length - 1]
    const hasImages = params.imageUrls && params.imageUrls.length > 0

    if (lastMsg) {
      if (hasImages) {
        const content: any[] = [{ type: 'text', text: lastMsg.content }]
        for (const url of params.imageUrls!) {
          content.push({
            type: 'image_url',
            image_url: { url, detail: 'auto' },
          })
        }
        messages.push({ role: 'user', content })
      } else {
        messages.push({ role: 'user', content: lastMsg.content })
      }
    }

    try {
      const response = await client.chat.completions.create({
        model: getModel(),
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
      // ✅ 429 Rate Limit — 指数退避重试一次
      if ((error as any)?.status === 429 || (error as any)?.message?.includes('rate limit')) {
        console.warn('[DeepSeek] Rate limit hit, retrying in 2s...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        return this.chat(params)
      }

      const errorMsg = error.message || ''
      // 如果报错是因为不支持 image_url 且确实有图片，则进行降级处理重新调用
      if (hasImages && (error.status === 400 || errorMsg.includes('image_url') || errorMsg.includes('deserializ'))) {
        console.warn('[AI] DeepSeek model does not support image_url. Falling back to text description.')
        
        const fallbackMessages: any[] = [
          { role: 'system', content: params.systemPrompt },
        ]
        for (const msg of params.messages.slice(0, -1)) {
          fallbackMessages.push({ role: msg.role, content: msg.content })
        }
        
        // 构造降级的文本消息
        const fallbackContent = `[用户上传了 ${params.imageUrls!.length} 张照片]\n\n${lastMsg?.content || ''}\n\n请基于用户对照片的描述来引导他们思考。你可以请用户描述照片中的重要视觉元素（主体的位置、光线方向、颜色等）。`
        fallbackMessages.push({ role: 'user', content: fallbackContent })
        
        try {
          const response = await client.chat.completions.create({
            model: getModel(),
            max_tokens: params.maxTokens || 1024,
            temperature: params.temperature ?? 0.7,
            messages: fallbackMessages,
          })
          
          return {
            content: response.choices[0]?.message?.content || '',
            usage: {
              inputTokens: response.usage?.prompt_tokens ?? 0,
              outputTokens: response.usage?.completion_tokens ?? 0,
            },
          }
        } catch (fallbackError: any) {
          throw new AIProviderError(
            fallbackError.message || 'DeepSeek fallback API call failed',
            'deepseek',
            fallbackError.status,
            fallbackError.status !== 400
          )
        }
      }

      const statusCode = error.status
      throw new AIProviderError(
        error.message || 'DeepSeek API call failed',
        'deepseek',
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
        model: getModel(),
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
      const errorMsg = error.message || ''
      if (error.status === 400 || errorMsg.includes('image_url') || errorMsg.includes('deserializ')) {
        console.warn('[AI] DeepSeek model does not support image_url for analyzeImage. Falling back to text.')
        const prompt = params.question ||
          `用户上传了 ${params.imageUrls.length} 张照片。由于我无法直接查看图片，请基于以下策略引导用户：
1. 请用户描述照片中的关键视觉元素（主体位置、光线、色彩等）
2. 通过苏格拉底式提问引导用户自己观察 and 思考
3. 不要假装你看得见图片`

        try {
          const response = await client.chat.completions.create({
            model: getModel(),
            max_tokens: 1024,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: prompt },
            ],
          })

          const textContent = response.choices[0]?.message?.content || ''

          return {
            observations: textContent.split('\n').filter((l: string) => l.trim()),
            rawResponse: textContent,
          }
        } catch (fallbackError: any) {
          throw new AIProviderError(
            fallbackError.message || 'Image analysis fallback failed',
            'deepseek',
            fallbackError.status,
            fallbackError.status !== 400
          )
        }
      }

      throw new AIProviderError(
        error.message || 'Image analysis failed',
        'deepseek',
        error.status,
        error.status !== 400
      )
    }
  },
}
