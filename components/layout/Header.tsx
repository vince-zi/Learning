'use client'

import { useState, useEffect } from 'react'
import { useSessionStore } from '@/store/session-store'
import { MODULE_CONFIG } from '@/core/models/session'
import type { ModuleType } from '@/core/models/session'
import Link from 'next/link'

export function Header() {
  const module = useSessionStore((s) => s.module)
  const config = MODULE_CONFIG[module]

  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const gradientClass = module === 'english'
    ? 'from-blue-600 via-blue-500 to-cyan-400'
    : 'from-amber-600 via-amber-500 to-yellow-400'

  const hoverClass = module === 'english'
    ? 'hover:text-blue-600 dark:hover:text-blue-400'
    : 'hover:text-amber-600 dark:hover:text-amber-400'

  return (
    <>
      <div className={`h-[2px] w-full bg-gradient-to-r ${gradientClass} shrink-0`} />
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 dark:bg-zinc-950/80 border-b border-zinc-200/60 dark:border-zinc-900/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50 hover:opacity-80 transition-opacity flex items-center gap-1.5">
            <span className="text-base">{config.icon}</span>
            <span>{module === 'english' ? '英语陪练伙伴' : '摄影思考伙伴'}</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/progress"
              className={`text-xs font-semibold text-zinc-500 ${hoverClass} dark:text-zinc-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900`}
            >
              我的进度
            </Link>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95 duration-250 border border-transparent hover:border-zinc-200/30 dark:hover:border-zinc-800/30 flex items-center justify-center"
              aria-label="切换日夜间模式"
              title={theme === 'dark' ? '切换为白天模式' : '切换为夜间模式'}
            >
              {!mounted ? (
                <div className="w-4 h-4" />
              ) : theme === 'dark' ? (
                <svg className="w-4 h-4 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>
    </>
  )
}
