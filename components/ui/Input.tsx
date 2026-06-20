'use client'

import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  loading?: boolean
}

export const Input = forwardRef<HTMLTextAreaElement, InputProps>(
  ({ loading, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 ${className}`}
        rows={3}
        disabled={loading}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
