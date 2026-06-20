// ============================================================
// Interface Layer: Anthropic (Claude) Adapter
// Claude API 适配器 — 实现 AIProvider 接口
// 支持多模态：文本 + 图片分析
// ============================================================

import type { AIProvider, ChatParams, ChatResponse, ImageAnalysisParams, ImageAnalysis, ChatMessage } from './provider-interface'
import { AIProviderError } from './provider-interface'

// 动态导入，避免未安装时的错误
let Anthropic: any = null

async function getClient() {
  if (!Anthropic) {
    try {
      const mod = await import('@anthropic-ai/sdk')
      Anthropic = mod.Anthropic
    } catch {
      throw new AIProviderError(
        '@anthropic-ai/sdk is not installed. Run: npm install @anthropic-ai/sdk',
        'anthropic',
        undefined,
        false
      )
    }
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export const anthropicAdapter: AIProvider = {
  name: 'anthropic',

  async chat(params: ChatParams): Promise<ChatResponse> {
    const client = await getClient()

    // 构建消息内容（支持多图片）
    const userContent: any[] = []

    // 如果有图片，先添加图片
    if (params.imageUrls && params.imageUrls.length > 0) {
      for (const url of params.imageUrls) {
        // 如果是 base64 或者 URL，下载并转为 base64
        const imageData = await fetchImageAsBase64(url)
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mimeType,
            data: imageData.base64,
          },
        })
      }
    }

    // 添加文本消息
    const lastMessage = params.messages[params.messages.length - 1]
    if (lastMessage) {
      userContent.push({
        type: 'text',
        text: lastMessage.content,
      })
    } else {
      userContent.push({
        type: 'text',
        text: params.messages.map(m => `${m.role}: ${m.content}`).join('\n'),
      })
    }

    try {
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: userContent },
        ],
      })

      // Extract text content
      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n')

      return {
        content: textContent,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
      }
    } catch (error: any) {
      const statusCode = error.status
      const isRetryable = statusCode === 429 || statusCode === 529 || statusCode === undefined
      throw new AIProviderError(
        error.message || 'Anthropic API call failed',
        'anthropic',
        statusCode,
        isRetryable
      )
    }
  },

  async analyzeImage(params: ImageAnalysisParams): Promise<ImageAnalysis> {
    const client = await getClient()

    const imageContents = await Promise.all(
      params.imageUrls.map(async (url) => {
        const imageData = await fetchImageAsBase64(url)
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: imageData.mimeType,
            data: imageData.base64,
          },
        }
      })
    )

    const userContent: any[] = [
      ...imageContents,
      { type: 'text' as const, text: params.question || '请详细分析这张照片的技术参数和视觉特征。' },
    ]

    try {
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514',
        max_tokens: 1024,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      })

      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n')

      return {
        observations: textContent.split('\n').filter((l: string) => l.trim()),
        rawResponse: textContent,
      }
    } catch (error: any) {
      throw new AIProviderError(
        error.message || 'Image analysis failed',
        'anthropic',
        error.status,
        error.status !== 400
      )
    }
  },
}

// --- 辅助函数 ---
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // 已经是 base64 data URL
  if (url.startsWith('data:')) {
    const [header, data] = url.split(',')
    const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
    return { base64: data, mimeType }
  }

  // 远程 URL — 下载并编码
  try {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    return { base64, mimeType }
  } catch (error) {
    throw new AIProviderError(
      `Failed to fetch image from URL: ${url}`,
      'anthropic',
      undefined,
      false
    )
  }
}
