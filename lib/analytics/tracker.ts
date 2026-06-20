// ============================================================
// Infrastructure: Analytics Tracker
// MVP 埋点工具 — 记录核心事件到数据库
// ============================================================

import { supabase } from '../db/supabase-client'

export type AnalyticsEventName =
  | 'page_view'
  | 'photo_upload'
  | 'question_answer'
  | 'task_accept'
  | 'task_complete'
  | 'task_skip'
  | 'discovery_complete'
  | 'session_start'
  | 'session_complete'

export interface AnalyticsProperties {
  page?: string
  roundNumber?: number
  questionIndex?: number
  taskType?: string
  discoveryId?: string
  sessionId?: string
  duration?: number
  [key: string]: unknown
}

/**
 * 记录分析事件
 */
export async function trackEvent(
  eventName: AnalyticsEventName,
  properties?: AnalyticsProperties,
  userId?: string,
  sessionId?: string
): Promise<void> {
  try {
    // 优先使用 Supabase（如果配置了）
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { error } = await supabase.from('analytics_events').insert({
        event_name: eventName,
        user_id: userId || null,
        session_id: sessionId || null,
        properties: properties || {},
      })
      if (error) console.warn('[Analytics] Insert error:', error.message)
    } else {
      // 开发模式：记录到控制台
      console.log(
        `[Analytics] ${eventName}`,
        JSON.stringify(properties),
        userId ? `user:${userId}` : '',
        sessionId ? `session:${sessionId}` : ''
      )
    }
  } catch (err) {
    // 静默失败，不干扰用户流程
    console.warn('[Analytics] Track error:', err)
  }
}

/**
 * 便捷的跟踪方法
 */
export const analytics = {
  pageView(page: string, sessionId?: string) {
    trackEvent('page_view', { page }, undefined, sessionId)
  },

  photoUpload(roundNumber: number, sessionId: string) {
    trackEvent('photo_upload', { roundNumber }, undefined, sessionId)
  },

  questionAnswer(questionIndex: number, roundNumber: number, sessionId: string) {
    trackEvent('question_answer', { questionIndex, roundNumber }, undefined, sessionId)
  },

  taskAccept(taskType: string, sessionId: string) {
    trackEvent('task_accept', { taskType }, undefined, sessionId)
  },

  taskComplete(taskType: string, sessionId: string) {
    trackEvent('task_complete', { taskType }, undefined, sessionId)
  },

  taskSkip(taskType: string, sessionId: string) {
    trackEvent('task_skip', { taskType }, undefined, sessionId)
  },

  discoveryComplete(discoveryId: string, sessionId: string) {
    trackEvent('discovery_complete', { discoveryId }, undefined, sessionId)
  },

  sessionStart(sessionId: string) {
    trackEvent('session_start', {}, undefined, sessionId)
  },

  sessionComplete(sessionId: string, duration: number) {
    trackEvent('session_complete', { duration }, undefined, sessionId)
  },
}
