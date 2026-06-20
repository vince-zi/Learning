'use client'

import { useSessionStore } from '@/store/session-store'
import { MODULE_CONFIG } from '@/core/models/session'
import type { ModuleType } from '@/core/models/session'
import Link from 'next/link'

export function Header() {
  const module = useSessionStore((s) => s.module)
  const config = MODULE_CONFIG[module]

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
          <nav className="flex items-center gap-4">
            <Link
              href="/progress"
              className={`text-xs font-semibold text-zinc-500 ${hoverClass} dark:text-zinc-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900`}
            >
              {module === 'english' ? '我的进度' : '我的进度'}
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}
