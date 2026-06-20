// ============================================================
// Interface Layer: AI Provider Interface
// 抽象 AI 提供商，使引擎层与具体 LLM 解耦
// 添加新提供商只需实现此接口
// ============================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatParams {
  systemPrompt: string
  messages: ChatMessage[]
  imageUrls?: string[]
  temperature?: number
  maxTokens?: number
}

export interface ChatResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface ImageAnalysisParams {
  imageUrls: string[]
  systemPrompt: string
  question?: string
}

export interface ImageAnalysis {
  observations: string[]
  technicalAssessment?: {
    exposure?: string
    composition?: string
    lighting?: string
    color?: string
  }
  rawResponse: string
}

/**
 * AI Provider 抽象接口
 *
 * 所有 AI 提供商适配器必须实现此接口。
 * 引擎层只依赖此接口，不感知具体提供商。
 */
export interface AIProvider {
  /** 名称标识 */
  readonly name: string

  /** 多模态对话（支持图片） */
  chat(params: ChatParams): Promise<ChatResponse>

  /** 纯图片分析（不进行对话） */
  analyzeImage(params: ImageAnalysisParams): Promise<ImageAnalysis>
}

/**
 * AI Provider 错误类型
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public providerName: string,
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
