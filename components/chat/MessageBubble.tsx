'use client'

import { useState } from 'react'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  type?: 'question' | 'answer' | 'summary' | 'task'
  timestamp?: string
}

export function MessageBubble({ role, content, type }: MessageBubbleProps) {
  const isUser = role === 'user'
  
  // 翻译相关的本地状态
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)

  // 检测文本中是否包含英文字符（至少包含一个3个字母及以上的单词），避免在纯中文对话（如摄影模块）中显示翻译按钮
  const hasEnglish = /[a-zA-Z]{3,}/.test(content)

  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null)
      return
    }

    setIsTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      const data = await res.json()
      if (data.success && data.translation) {
        setTranslatedText(data.translation)
      } else {
        console.error('Translation failed:', data.error)
      }
    } catch (err) {
      console.error('Error translating text:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  // 实践挑战卡片的渲染 (task 类型)
  if (type === 'task') {
    return (
      <div className="mx-4 my-4 animate-fade-in">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-amber-500/[0.01] p-5 shadow-lg shadow-amber-500/[0.02] dark:border-amber-950 dark:from-amber-950/20 dark:to-transparent">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm p-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl">📷</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">实践挑战任务</span>
            </div>
            {hasEnglish && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors select-none py-1 px-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-400/5 dark:hover:bg-blue-400/10"
              >
                {isTranslating ? '翻译中...' : translatedText ? '收起翻译 ✕' : '翻译 🌐'}
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">
            {content}
          </p>

          {/* 翻译显示区 */}
          {translatedText && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/[0.02] border border-blue-500/10 text-[13px] text-zinc-600 dark:text-zinc-400 select-text animate-fade-in leading-relaxed">
              <p className="font-semibold text-[10px] text-blue-500/85 mb-1.5 select-none">任务翻译：</p>
              <p className="whitespace-pre-wrap">{translatedText}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 正常对话泡的渲染 (user 或 assistant)
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mx-4 my-2.5 animate-fade-in`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-600 to-amber-400 text-white text-[10px] flex items-center justify-center font-bold mr-2 mt-1 shadow-xs shrink-0 select-none">
          伴
        </div>
      )}
      <div
        className={`max-w-[78%] px-4.5 py-3 text-sm leading-relaxed shadow-xs relative ${
          isUser
            ? 'rounded-2xl rounded-tr-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-normal'
            : 'rounded-2xl rounded-tl-sm bg-amber-50/40 border border-amber-500/10 text-zinc-800 dark:bg-zinc-900/60 dark:border-zinc-850 dark:text-zinc-200'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>

        {/* 翻译按钮 */}
        {!isUser && hasEnglish && (
          <div className="mt-2 pt-1.5 border-t border-zinc-200/20 dark:border-zinc-800/20 flex justify-between items-center gap-4 select-none">
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500">觉得吃力？</span>
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {isTranslating ? '翻译中...' : translatedText ? '收起翻译 ✕' : '翻译成中文 🌐'}
            </button>
          </div>
        )}

        {/* 翻译显示区 */}
        {translatedText && (
          <div className="mt-2.5 p-2 rounded-xl bg-blue-500/[0.02] border border-blue-500/10 text-[13px] text-zinc-600 dark:text-zinc-400 select-text animate-fade-in leading-relaxed">
            <p className="font-semibold text-[10px] text-blue-500/85 mb-1 select-none">中文翻译：</p>
            <p className="whitespace-pre-wrap">{translatedText}</p>
          </div>
        )}
      </div>
    </div>
  )
}
