'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/store/session-store'
import { analytics } from '@/lib/analytics/tracker'

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-sm text-zinc-400">加载中...</p></div>}>
      <DiscoveryContent />
    </Suspense>
  )
}

function DiscoveryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const { discoveries, photos, module } = useSessionStore()
  const [feedback, setFeedback] = useState<string | null>(null)

  const isEnglish = module === 'english'
  const accentClass = isEnglish
    ? 'border-blue-500/40 from-blue-500/[0.03] to-blue-500/[0.005] shadow-blue-500/[0.03]'
    : 'border-amber-500/40 from-amber-500/[0.03] to-amber-500/[0.005] shadow-amber-500/[0.03]'
  const darkAccentClass = isEnglish ? 'dark:border-blue-900/40' : 'dark:border-amber-900/40'
  const tagClass = isEnglish
    ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-500/10'
    : 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/10'
  const gradientBg = isEnglish
    ? 'from-blue-500/5 via-blue-500/1 to-transparent'
    : 'from-amber-500/5 via-amber-500/1 to-transparent'

  const latestDiscovery = discoveries[discoveries.length - 1]

  useEffect(() => {
    analytics.pageView('discovery', sessionId || undefined)
  }, [sessionId])

  const handleFeedback = (type: string) => {
    setFeedback(type)
    analytics.questionAnswer(0, 0, sessionId || '')
  }

  const handleNewSession = () => {
    // 重置状态并回到首页
    useSessionStore.getState().resetSession()
    router.push('/')
  }

  if (!latestDiscovery) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-zinc-500 mb-4">还没有发现。完成一次练习后这里会出现你的发现卡片。</p>
        <Button onClick={() => router.push('/')}>开始练习</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 max-w-lg mx-auto w-full relative">
      {/* 渐变装饰背景 */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-gradient-to-b ${gradientBg} -z-10 blur-2xl pointer-events-none rounded-full`} />

      {/* 发现标题 */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-block text-2xl p-3 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-transparent rounded-2xl shadow-sm border border-amber-500/10 mb-4 select-none animate-bounce" style={{ animationDuration: '3s' }}>
          ✨
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          {isEnglish ? 'Your Discovery' : '你的今日发现'}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
          {isEnglish
            ? '通过真实的英语对话，你自己总结出的语言发现。'
            : '太棒了！这是你通过主动的实践与层层思考，自己总结出的摄影智慧结晶。'}
        </p>
      </div>

      {/* 发现卡片 */}
      <Card className={`w-full mb-8 relative border-2 ${accentClass} bg-gradient-to-br overflow-hidden p-6 md:p-8 animate-fade-in dark:border-amber-900/40 ${darkAccentClass}`} style={{ animationDelay: '100ms' }}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${isEnglish ? 'from-blue-500/10' : 'from-amber-500/10'} to-transparent -z-10 rounded-full`} />

        <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mb-3 flex items-center gap-1.5 leading-snug">
          💡 {latestDiscovery.title}
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-6 font-medium whitespace-pre-wrap">
          {latestDiscovery.summary}
        </p>
        <div className="flex flex-wrap gap-1.5 border-t border-zinc-200/55 dark:border-zinc-800/60 pt-4">
          {latestDiscovery.tags.map((tag) => (
            <span key={tag} className={`px-3 py-1 rounded-full ${tagClass} text-[10px] font-bold tracking-wider border`}>
              #{tag}
            </span>
          ))}
        </div>
      </Card>

      {/* 前后照片对比（仅摄影模块） */}
      {!isEnglish && photos.length >= 2 && (
        <div className="w-full mb-8 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 text-center">
            📷 你的实操前后对比
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="group text-center">
              <div className="overflow-hidden rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-md transition-all">
                <img
                  src={photos[0].imageUrl}
                  alt="第一次拍摄"
                  className="w-full object-cover aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-2">1st · 第一次尝试</p>
            </div>
            <div className="group text-center">
              <div className={`overflow-hidden rounded-2xl border ${isEnglish ? 'border-blue-500/20 dark:border-blue-900/20' : 'border-amber-500/20 dark:border-amber-900/20'} shadow-md shadow-amber-500/[0.02] transition-all`}>
                <img
                  src={photos[1].imageUrl}
                  alt="再拍"
                  className="w-full object-cover aspect-[4/3] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className={`text-[10px] font-bold ${isEnglish ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'} mt-2`}>2nd · 实践后再拍</p>
            </div>
          </div>
        </div>
      )}

      {/* 用户反馈 */}
      <div className="w-full mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
        {!feedback ? (
          <div className="w-full text-center">
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-3">
              {isEnglish ? '这次英语陪练对你有帮助吗？' : '你觉得这次提问式引导是否有帮助？'}
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => handleFeedback('helpful')}
                className={`px-4 py-2 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 transition-all cursor-pointer ${
                  isEnglish
                    ? 'hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:border-blue-500/30 dark:hover:text-blue-400 dark:hover:bg-blue-950/20'
                    : 'hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:border-amber-500/30 dark:hover:text-amber-400 dark:hover:bg-amber-950/20'
                }`}>
                👍 很有启发
              </button>
              <button onClick={() => handleFeedback('want_direct')}
                className={`px-4 py-2 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 transition-all cursor-pointer ${
                  isEnglish
                    ? 'hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:border-blue-500/30 dark:hover:text-blue-400 dark:hover:bg-blue-950/20'
                    : 'hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:border-amber-500/30 dark:hover:text-amber-400 dark:hover:bg-amber-950/20'
                }`}>
                📖 想要直接要答案
              </button>
              <button onClick={() => handleFeedback('continue')}
                className={`px-4 py-2 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 transition-all cursor-pointer ${
                  isEnglish
                    ? 'hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-600 dark:hover:border-blue-500/30 dark:hover:text-blue-400 dark:hover:bg-blue-950/20'
                    : 'hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:border-amber-500/30 dark:hover:text-amber-400 dark:hover:bg-amber-950/20'
                }`}>
                🔄 愿意继续尝试
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 text-center mb-2 animate-fade-in">
            ❤️ 感谢你的反馈，我会不断进化提问策略！
          </p>
        )}
      </div>

      {/* 继续练习 */}
      <div className="flex gap-4 w-full animate-fade-in" style={{ animationDelay: '250ms' }}>
        <Button variant="secondary" onClick={() => router.push('/progress')}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800">
          查看我的知识库
        </Button>
        <Button onClick={handleNewSession}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white hover:brightness-105 transition-all shadow-md shadow-amber-500/10 ${
            isEnglish ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-amber-600 to-amber-500'
          }`}>
          {isEnglish ? '开始下一次对话' : '进行下一个挑战'}
        </Button>
      </div>
    </div>
  )
}
