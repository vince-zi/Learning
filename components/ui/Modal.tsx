'use client'

import { useEffect } from 'react'

interface ModalOption {
  label: string
  description?: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  onClick: () => void
}

interface ModalProps {
  isOpen: boolean
  title: string
  message?: string
  icon?: string
  options: ModalOption[]
  onClose?: () => void
}

export function Modal({ isOpen, title, message, icon, options, onClose }: ModalProps) {
  // 按 Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      {/* 背景蒙层 */}
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />

      {/* 弹窗主体 */}
      <div
        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-zinc-900/30 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
        }}
      >
        {/* 渐变顶部装饰线 */}
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="px-5 pt-5 pb-4">
          {/* 图标和标题 */}
          <div className="flex items-start gap-3 mb-3">
            {icon && (
              <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
            )}
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">
                {title}
              </h2>
              {message && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* 选项列表 */}
          <div className="flex flex-col gap-2 mt-4">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={opt.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 active:scale-[0.98] ${
                  opt.variant === 'primary'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : opt.variant === 'ghost'
                    ? 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {opt.icon && (
                  <span className="text-base shrink-0">{opt.icon}</span>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                  {opt.description && (
                    <div className={`text-[11px] mt-0.5 leading-tight ${
                      opt.variant === 'primary' ? 'text-blue-200' : 'text-zinc-400'
                    }`}>
                      {opt.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
