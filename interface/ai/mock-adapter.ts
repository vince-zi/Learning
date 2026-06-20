// ============================================================
// Interface Layer: Mock AI Provider Adapter
// 用于在没有配置任何真实 API Key 时支持脱机测试系统逻辑
// ============================================================

import type { AIProvider, ChatParams, ChatResponse, ImageAnalysisParams, ImageAnalysis } from './provider-interface'

export const mockAdapter: AIProvider = {
  name: 'mock',

  async chat(params: ChatParams): Promise<ChatResponse> {
    console.log('[AI] Using Mock Provider Chat')
    
    let lastUserMessage = params.messages[params.messages.length - 1]?.content || ''
    // 过滤掉拼接到 user content 尾部的系统隐藏指令，防止在 Mock 复读时泄露给用户
    if (lastUserMessage.includes('[系统指令')) {
      lastUserMessage = lastUserMessage.split('[系统指令')[0].trim()
    }
    
    // 判断是否是英语测评或普通英语模块
    const isEnglish = params.systemPrompt.includes('English') || 
                      params.systemPrompt.includes('CEFR') || 
                      params.systemPrompt.includes('english')
                      
    let content = ''
    if (isEnglish) {
      // 模拟英语助手的回复风格，且包含中英文括号释义
      content = `Hello! This is a mock AI response (这是一个模拟的 AI 回复) to help you test the system flow (帮助你测试系统流程). I received your input (我收到了你的输入): "${lastUserMessage}". We can keep talking (我们可以继续聊) to trigger the interactive challenge modal (来触发互动的挑战弹窗) or assessment summaries (或者定级总结报告)!`
    } else {
      content = `【模拟摄影回复】收到您的消息：“${lastUserMessage}”。作为一个本地模拟伙伴，我很乐意与您探讨摄影技巧。请继续尝试对话以触发拍摄练习或查看今日发现！`
    }

    // 模拟一些延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    return {
      content,
      usage: {
        inputTokens: 10,
        outputTokens: 50,
      },
    }
  },

  async analyzeImage(params: ImageAnalysisParams): Promise<ImageAnalysis> {
    console.log('[AI] Using Mock Provider Image Analysis')
    
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    return {
      observations: [
        '【模拟观察 1】画面的主体位于视觉中心。',
        '【模拟观察 2】光线过渡自然，曝光良好。'
      ],
      technicalAssessment: {
        exposure: '曝光准确，高光与暗部细节保留完整',
        composition: '经典的三分法构图，视觉中心明确',
        lighting: '柔和的散射光，阴影较弱',
        color: '色调温和，色彩饱和度适中'
      },
      rawResponse: '【模拟图片分析】照片看起来很棒，构图和光影控制得体。'
    }
  }
}
