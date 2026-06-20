// ============================================================
// Interface Layer: Provider Factory
// 根据环境变量自动选择 AI 提供商
// 优先级：DEEPSEEK_API_KEY → ANTHROPIC_API_KEY → OPENAI_API_KEY → MOCK (Fallback)
// ============================================================

import type { AIProvider } from './provider-interface'
import { deepseekAdapter } from './deepseek-adapter'
import { anthropicAdapter } from './anthropic-adapter'
import { openaiAdapter } from './openai-adapter'
import { mockAdapter } from './mock-adapter'

export type ProviderType = 'deepseek' | 'anthropic' | 'openai' | 'mock'

/**
 * 获取当前配置的 AI Provider
 */
export function getAIProvider(): AIProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('[AI] Using DeepSeek provider')
    return deepseekAdapter
  }

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[AI] Using Anthropic (Claude) provider')
    return anthropicAdapter
  }

  if (process.env.OPENAI_API_KEY) {
    console.log('[AI] Using OpenAI provider')
    return openaiAdapter
  }

  console.warn('[AI] No AI provider configured. Falling back to Mock Provider for testing logic.')
  return mockAdapter
}

/**
 * 获取指定类型的 Provider
 */
export function getProviderByType(type: ProviderType): AIProvider {
  switch (type) {
    case 'deepseek':
      return deepseekAdapter
    case 'anthropic':
      return anthropicAdapter
    case 'openai':
      return openaiAdapter
    case 'mock':
      return mockAdapter
  }
}

/**
 * 检查可用的 Provider
 */
export function getAvailableProviders(): ProviderType[] {
  const providers: ProviderType[] = []
  if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek')
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (providers.length === 0) providers.push('mock')
  return providers
}

// 单例：延迟初始化
let _cachedProvider: AIProvider | null = null

export function getCachedProvider(): AIProvider {
  if (!_cachedProvider) {
    _cachedProvider = getAIProvider()
  }
  return _cachedProvider
}
