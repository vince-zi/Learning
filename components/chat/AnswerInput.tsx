'use client'

import { useState, type KeyboardEvent } from 'react'

interface AnswerInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function AnswerInput({ onSubmit, isLoading, placeholder }: AnswerInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    setValue('') // 先清空输入，防止连续点击或回车触发重复提交
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4">
      <div className="flex gap-3 items-end max-w-2xl mx-auto">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '说说你的想法...'}
          rows={2}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-amber-500/60 dark:focus:bg-zinc-900 transition-all disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !value.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:brightness-105 shadow-md shadow-amber-500/10 hover:shadow-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-all shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
      <p className="text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-2">
        Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  )
}
