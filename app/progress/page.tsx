'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/store/session-store'
import { analytics } from '@/lib/analytics/tracker'
import { supabase } from '@/lib/db/supabase-client'
import { englishKnowledgeGraph } from '@/core/knowledge-graph/english-graph'
import { photographyKnowledgeGraph } from '@/core/knowledge-graph/photography-graph'

interface ProgressStats {
  totalSessions: number
  totalPhotos: number
  totalDiscoveries: number
  streakDays: number
  skillsUnlocked: { id: string; name: string; status: string }[]
}

export default function ProgressPage() {
  const router = useRouter()
  const { discoveries, photos, module } = useSessionStore()
  const [dbDiscoveries, setDbDiscoveries] = useState<any[]>([])
  const [englishProfile, setEnglishProfile] = useState<any>(null)
  const [errorRecords, setErrorRecords] = useState<any[]>([])
  const [showConqueredVault, setShowConqueredVault] = useState(false)
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isEnglish = module === 'english'

  const photoSkills = [
    { id: 'visual-focus', name: '视觉重心与注意力引导', status: 'in_progress' },
    { id: 'visual-balance', name: '视觉平衡与重量', status: 'locked' },
    { id: 'frame-boundary', name: '画面框架与边界', status: 'locked' },
    { id: 'light-direction', name: '光线的方向与质感', status: 'locked' },
    { id: 'exposure-triangle', name: '曝光三要素的发现', status: 'locked' },
    { id: 'color-temperature', name: '色彩的冷暖与情绪', status: 'locked' },
    { id: 'color-contrast', name: '色彩对比与和谐', status: 'locked' },
    { id: 'time-visualization', name: '照片中的时间感', status: 'locked' },
    { id: 'perspective-narrative', name: '视角与叙事立场', status: 'locked' },
  ]

  const englishSkills = [
    { id: 'self-intro', name: '自我介绍与个人信息', status: 'in_progress' },
    { id: 'daily-routine', name: '日常生活与习惯表达', status: 'locked' },
    { id: 'likes-dislikes', name: '喜好与感受表达', status: 'locked' },
    { id: 'everyday-situations', name: '日常场景应对', status: 'locked' },
    { id: 'question-asking', name: '提问的艺术', status: 'locked' },
    { id: 'opinion-expression', name: '观点表达与论证', status: 'locked' },
    { id: 'comparing-discussing', name: '比较与讨论', status: 'locked' },
    { id: 'storytelling', name: '叙事与故事讲述', status: 'locked' },
    { id: 'abstract-thinking', name: '抽象话题与假设思维', status: 'locked' },
  ]

  const [stats, setStats] = useState<ProgressStats>({
    totalSessions: 0,
    totalPhotos: 0,
    totalDiscoveries: 0,
    streakDays: 0,
    skillsUnlocked: isEnglish ? englishSkills : photoSkills,
  })

  const loadStats = () => {
    try {
      const stored = localStorage.getItem(`learniny_stats_${module}`)
      if (stored) {
        setStats(s => ({ ...s, ...JSON.parse(stored) }))
      } else {
        setStats({
          totalSessions: 0,
          totalPhotos: 0,
          totalDiscoveries: 0,
          streakDays: 0,
          skillsUnlocked: isEnglish ? englishSkills : photoSkills,
        })
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const queryModule = searchParams.get('module')
      if (queryModule === 'english' || queryModule === 'photography') {
        if (queryModule !== module) {
          useSessionStore.getState().setModule(queryModule)
          return
        }
      }
    }

    analytics.pageView('progress')
    // 1. 先从 LocalStorage 载入缓存的统计数据（实现无延迟加载）
    loadStats()

    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) {
      setIsLoading(false)
      return
    }

    async function syncData() {
      setIsLoading(true)
      try {
        // 获取该用户在当前 module 下 of discoveries
        const { data: discoveriesData, error: discError } = await supabase
          .from('discoveries')
          .select('*, learning_sessions!inner(module)')
          .eq('user_id', userId)
          .eq('learning_sessions.module', module)
          .order('created_at', { ascending: false })

        if (discError) throw discError
        
        if (discoveriesData) {
          setDbDiscoveries(discoveriesData)

          // 英语模块特有：获取英语学习者画像与错题本记录
          if (isEnglish) {
            const { data: profile } = await supabase
              .from('english_learner_profiles')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle()
            setEnglishProfile(profile)

            const { data: errRecords } = await supabase
              .from('error_records')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
            setErrorRecords(errRecords || [])
          }
          
          // 获取相关的 session 和 photo 统计数
          const { data: sessionsData } = await supabase
            .from('learning_sessions')
            .select('started_at')
            .eq('user_id', userId)
            .eq('module', module)

          let totalPhotos = 0
          if (!isEnglish) {
            const { data: photosData } = await supabase
              .from('photos')
              .select('id')
              .eq('user_id', userId)
            totalPhotos = photosData?.length || 0
          }

          const totalSessions = sessionsData?.length || 0
          const totalDiscoveries = discoveriesData.length

          // 真实天数计算：从 started_at 提取 YYYY-MM-DD，进行 Set 去重计数
          const uniqueDays = new Set(
            (sessionsData || [])
              .map(s => s.started_at)
              .filter(Boolean)
              .map(d => d.split('T')[0])
          )
          const streakDays = uniqueDays.size || 1

          // 动态计算技能树解锁情况（摄影/英语）
          const graph = isEnglish ? englishKnowledgeGraph : photographyKnowledgeGraph
          const graphNodes = Array.from(graph.nodes.values())
          
          const masteredNodeIds = new Set(
            (discoveriesData || [])
              .map(d => d.knowledge_node_id)
              .filter(Boolean)
          )
          
          const skillsList = graphNodes.map(node => {
            let status = 'locked'
            if (masteredNodeIds.has(node.id)) {
              status = 'mastered'
            } else if (
              node.prerequisiteIds.length === 0 ||
              node.prerequisiteIds.every(reqId => masteredNodeIds.has(reqId))
            ) {
              status = 'in_progress'
            }
            return {
              id: node.id,
              name: node.name,
              status,
            }
          }) as ProgressStats['skillsUnlocked']

          const newStats: ProgressStats = {
            totalSessions,
            totalPhotos,
            totalDiscoveries,
            streakDays,
            skillsUnlocked: skillsList,
          }

          setStats(newStats)
          localStorage.setItem(`learniny_stats_${module}`, JSON.stringify(newStats))
        }
      } catch (err) {
        console.error('[Progress Sync Error]:', err)
      } finally {
        setIsLoading(false)
      }
    }

    syncData()
  }, [module, isEnglish])

  const handleNewSession = () => {
    useSessionStore.getState().resetSession()
    router.push('/')
  }

  // 开始针对性技能练习
  const handleStartPractice = async (nodeId: string, nodeName: string, forceTargeted = false) => {
    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) return

    try {
      // 1. 重置客户端会话状态 (清空旧消息、照片缓存等)
      useSessionStore.getState().resetSession()

      const theme = (isEnglish && forceTargeted)
        ? `针对训练: ${nodeName}`
        : nodeName

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module, knowledgeNodeId: nodeId }),
      })
      const data = await res.json()
      if (data.success) {
        analytics.sessionStart(data.session.id)
        useSessionStore.getState().setSession({
          id: data.session.id,
          userId,
          module,
          status: 'in_progress',
          theme,
          roundCount: 0,
          photoCount: 0,
          discoveryCount: 0,
          currentRound: 1,
          startedAt: new Date().toISOString(),
          metadata: {
            currentKnowledgeNodeId: nodeId,
          },
        })
        useSessionStore.getState().setPhase('first_round')
        router.push(`/practice?session=${data.session.id}`)
      }
    } catch (err) {
      console.error('Failed to start targeted practice:', err)
    }
  }

  // 开始温习会话 (仅英语模块支持)
  const handleStartReview = async (nodeId: string, nodeName: string) => {
    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) return

    try {
      // 1. 重置客户端会话状态 (清空旧消息、照片缓存等)
      useSessionStore.getState().resetSession()
      
      const theme = `温习: ${nodeName}`
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module, knowledgeNodeId: nodeId }),
      })
      const data = await res.json()
      if (data.success) {
        analytics.sessionStart(data.session.id)
        useSessionStore.getState().setSession({
          id: data.session.id,
          userId,
          module,
          status: 'in_progress',
          theme,
          roundCount: 0,
          photoCount: 0,
          discoveryCount: 0,
          currentRound: 1,
          startedAt: new Date().toISOString(),
          metadata: {
            currentKnowledgeNodeId: nodeId,
          },
        })
        useSessionStore.getState().setPhase('first_round')
        router.push(`/practice?session=${data.session.id}`)
      }
    } catch (err) {
      console.error('Failed to start review:', err)
    }
  }

  // 开始全局温习会话 (从所有历史错句中复习)
  const handleStartGlobalReview = async () => {
    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) return

    try {
      useSessionStore.getState().resetSession()
      
      const theme = '全局温习'
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module, knowledgeNodeId: 'global-review' }),
      })
      const data = await res.json()
      if (data.success) {
        analytics.sessionStart(data.session.id)
        useSessionStore.getState().setSession({
          id: data.session.id,
          userId,
          module,
          status: 'in_progress',
          theme,
          roundCount: 0,
          photoCount: 0,
          discoveryCount: 0,
          currentRound: 1,
          startedAt: new Date().toISOString(),
          metadata: {
            currentKnowledgeNodeId: 'global-review',
          },
        })
        useSessionStore.getState().setPhase('first_round')
        router.push(`/practice?session=${data.session.id}`)
      }
    } catch (err) {
      console.error('Failed to start global review:', err)
    }
  }

  // 开始全局针对特训会话 (分析全部历史错句盲区并进行专项特训)
  const handleStartGlobalPractice = async () => {
    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) return

    try {
      useSessionStore.getState().resetSession()
      
      const theme = '全局针对训练'
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module, knowledgeNodeId: 'global-practice' }),
      })
      const data = await res.json()
      if (data.success) {
        analytics.sessionStart(data.session.id)
        useSessionStore.getState().setSession({
          id: data.session.id,
          userId,
          module,
          status: 'in_progress',
          theme,
          roundCount: 0,
          photoCount: 0,
          discoveryCount: 0,
          currentRound: 1,
          startedAt: new Date().toISOString(),
          metadata: {
            currentKnowledgeNodeId: 'global-practice',
          },
        })
        useSessionStore.getState().setPhase('first_round')
        router.push(`/practice?session=${data.session.id}`)
      }
    } catch (err) {
      console.error('Failed to start global practice:', err)
    }
  }

  // 开始定级测评会话
  const handleStartAssessment = async () => {
    const userId = localStorage.getItem('learniny_user_id')
    if (!userId) return

    try {
      const theme = 'English Level Placement Assessment'
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module: 'english' }),
      })
      const data = await res.json()
      if (data.success) {
        analytics.sessionStart(data.session.id)
        useSessionStore.getState().setSession({
          id: data.session.id,
          userId,
          module: 'english',
          status: 'in_progress',
          theme,
          roundCount: 0,
          photoCount: 0,
          discoveryCount: 0,
          currentRound: 1,
          startedAt: new Date().toISOString(),
        })
        useSessionStore.getState().setPhase('first_round')
        router.push(`/practice?session=${data.session.id}`)
      }
    } catch (err) {
      console.error('Failed to start assessment:', err)
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-10 max-w-lg mx-auto w-full relative">
      {/* 渐变装饰背景 */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] -z-10 blur-2xl pointer-events-none rounded-full ${
        isEnglish
          ? 'bg-gradient-to-b from-blue-500/5 via-blue-500/1 to-transparent'
          : 'bg-gradient-to-b from-amber-500/5 via-amber-500/1 to-transparent'
      }`} />

      {/* 页面标题 */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1.5">
          我的学习进度
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          在这里，你可以查看你所探索解锁的各项技能进度，以及温习巩固薄弱直觉。
        </p>
      </div>

      {/* 模块选择 Tab 栏 */}
      <div className="flex gap-2.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-6">
        <button
          onClick={() => {
            useSessionStore.getState().setModule('photography')
            router.replace('/progress?module=photography')
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
            !isEnglish
              ? 'bg-white dark:bg-zinc-800 text-amber-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          📸 摄影知识库
        </button>
        <button
          onClick={() => {
            useSessionStore.getState().setModule('english')
            router.replace('/progress?module=english')
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
            isEnglish
              ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          🗣️ 英语知识库
        </button>
      </div>

      {/* 英语学习者画像卡片 */}
      {isEnglish && (
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '80ms' }}>
          {isLoading ? (
            /* 优雅的加载骨架屏 */
            <Card className="p-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-10 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
                <div className="h-px bg-zinc-150 dark:bg-zinc-800" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </Card>
          ) : englishProfile ? (
            <Card className="relative overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/[0.04] via-blue-500/[0.01] to-transparent p-6 shadow-md dark:border-blue-900/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent -z-10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest leading-none mb-1.5">🗣️ 我的英语直觉画像</h2>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">基于启发式真实对话深度评测</p>
                </div>
                {/* CEFR Badge */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-extrabold tracking-tight px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-md shadow-blue-500/10">
                    {englishProfile.cefr_level || 'A1'}
                  </span>
                  <span className="text-[9px] font-bold text-blue-500 mt-1 uppercase tracking-wider">CEFR 等级</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-5 border-t border-b border-zinc-100 dark:border-zinc-900 py-4">
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">估算词汇量</span>
                  <span className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                    {englishProfile.known_vocabulary_size?.toLocaleString() || '---'} <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">词</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">参与会话</span>
                  <span className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                    {englishProfile.sessions_completed || 0} <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">次</span>
                  </span>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="space-y-4">
                {englishProfile.strengths && englishProfile.strengths.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-emerald-650 dark:text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      语言表达优势 (Strengths)
                    </h3>
                    <ul className="space-y-1.5 pl-3 border-l border-emerald-500/10">
                      {englishProfile.strengths.map((str: string, idx: number) => (
                        <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {englishProfile.weaknesses && englishProfile.weaknesses.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-blue-650 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      重点突破方向 (Weaknesses)
                    </h3>
                    <ul className="space-y-1.5 pl-3 border-l border-blue-500/10">
                      {englishProfile.weaknesses.map((weak: string, idx: number) => (
                        <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {weak}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            /* 未定级占位引导卡片 */
            <Card className="relative overflow-hidden border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-xl mx-auto mb-4 select-none animate-bounce" style={{ animationDuration: '3s' }}>
                🎯
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">开启你的首个英语直觉画像</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto mb-5">
                通过一个 5 分钟的 1对1 趣味对话定级测评，AI 将对你的词汇量、口语表达流利度及语法直觉进行全方位评估，生成个性化的成长画像。
              </p>
              <Button onClick={handleStartAssessment} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-105 transition-all text-xs font-bold tracking-wider text-white rounded-xl shadow-md shadow-blue-500/10">
                立即开始 5 分钟英语水平测评
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* 统计卡片网格 */}
      <div className={`grid ${isEnglish ? 'grid-cols-3' : 'grid-cols-2'} gap-3.5 mb-8 animate-fade-in`} style={{ animationDelay: '50ms' }}>
        <Card className="text-center !border-zinc-200/65 dark:!border-zinc-900/65 bg-white/50 dark:bg-zinc-950/40 p-4 transition-all duration-300 hover:shadow-md">
          <p className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{stats.totalSessions || discoveries.length}</p>
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">完成练习</p>
        </Card>
        {!isEnglish && (
          <Card className="text-center !border-zinc-200/65 dark:!border-zinc-900/65 bg-white/50 dark:bg-zinc-950/40 p-4 transition-all duration-300 hover:shadow-md">
            <p className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{stats.totalPhotos || photos.length}</p>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">上传照片</p>
          </Card>
        )}
        <Card className="text-center !border-zinc-200/65 dark:!border-zinc-900/65 bg-white/50 dark:bg-zinc-950/40 p-4 transition-all duration-300 hover:shadow-md">
          <p className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{stats.totalDiscoveries || discoveries.length}</p>
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">发现时刻</p>
        </Card>
        <Card className={`text-center p-4 transition-all duration-300 hover:shadow-md border ${
          isEnglish
            ? '!border-blue-500/20 dark:!border-blue-950/40 bg-blue-500/[0.02] dark:bg-blue-950/[0.05]'
            : '!border-amber-500/20 dark:!border-amber-950/40 bg-amber-500/[0.02] dark:bg-amber-950/[0.05]'
        }`}>
          <p className={`text-3xl font-extrabold tracking-tight ${
            isEnglish ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
          }`}>{stats.streakDays || 1}</p>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
            isEnglish ? 'text-blue-500 dark:text-blue-500' : 'text-amber-500 dark:text-amber-500'
          }`}>学习天数</p>
        </Card>
      </div>

      {/* 全局复习与专项训练控制台 */}
      {isEnglish && (
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            🔄 全局复习与专项强化
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* 全局温习卡片 */}
            <Card className="flex flex-col justify-between p-4 border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/20 hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔄</span>
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">全局对话温习</h3>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                  扮演“过去的你”，提取你以往所有会话的历史错句，由现在的你进行更完美的重构与演练。
                </p>
              </div>
              <Button
                onClick={handleStartGlobalReview}
                className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-105 text-[10px] font-bold text-white rounded-lg transition-all"
              >
                开始全局温习
              </Button>
            </Card>

            {/* 语法与词汇针对特训卡片 */}
            <Card className="flex flex-col justify-between p-4 border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/20 hover:shadow-md transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">语法与词汇特训</h3>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                  汇总分析你以往所有会话中最高频的错误模式，由 AI 主动开展翻译或改写等针对性专项特训。
                </p>
              </div>
              <Button
                onClick={handleStartGlobalPractice}
                className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-105 text-[10px] font-bold text-white rounded-lg transition-all"
              >
                开始专项针对训练
              </Button>
            </Card>
          </div>

          {/* 我的英语直觉错题本 */}
          <div className="mt-8">
            <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span>📓 我的英语直觉错题本</span>
              {errorRecords.length > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-extrabold leading-none">
                  {errorRecords.filter(e => e.noted_by_user).length}/{errorRecords.length} 已消灭
                </span>
              )}
            </h2>

            <Card className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/20 shadow-sm space-y-4">
              {/* 头部总结 */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/50 dark:border-zinc-900">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">防线加固进度</p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500">通过“原句重构”与“迁移应用”双重验证才算彻底消灭错误</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base">🏆</span>
                  <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                    {errorRecords.filter(e => e.noted_by_user).length}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">项攻克</span>
                </div>
              </div>

              {/* 待攻克错题列表 */}
              {errorRecords.filter(e => !e.noted_by_user).length > 0 ? (
                <div className="space-y-3">
                  {errorRecords.filter(e => !e.noted_by_user).map((err) => {
                    const pattern = err.error_pattern || ''
                    const stage1Passed = pattern.endsWith(':stage-1') || pattern.endsWith(':stage-2')
                    const stage2Passed = pattern.endsWith(':stage-2') || err.noted_by_user

                    const isExpanded = expandedErrorId === err.id
                    return (
                      <div
                        key={err.id}
                        onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                        className="p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-800 cursor-pointer select-none active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug break-all">
                            “{err.original_text}”
                          </p>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 shrink-0">
                            {getFriendlyErrorName(err.error_type)}
                          </span>
                        </div>

                        {/* 双关卡指示条 */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* 关卡 1 */}
                          <div className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[9px] font-bold ${
                            stage1Passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'
                          }`}>
                            <span>1. 原句纠偏</span>
                            <span>{stage1Passed ? '✓ 已通关' : '○ 待挑战'}</span>
                          </div>

                          {/* 关卡 2 */}
                          <div className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[9px] font-bold ${
                            stage2Passed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'
                          }`}>
                            <span>2. 场景迁移</span>
                            <span>{stage2Passed ? '✓ 已掌握' : '○ 待挑战'}</span>
                          </div>
                        </div>

                        {/* 展开的详情面板 */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-dashed border-zinc-200/50 dark:border-zinc-800 text-[10px] space-y-2 animate-fade-in text-zinc-500">
                            <p className="flex items-start gap-1">
                              <span className="font-bold text-zinc-500 shrink-0">💡 推荐表达：</span>
                              <span className="text-zinc-800 dark:text-zinc-300 font-semibold break-all">
                                {err.corrected_text || '暂无详细建议，请在全局温习中与 AI 对话纠正'}
                              </span>
                            </p>
                            <p>
                              <span className="font-bold text-zinc-500">🔍 语法分类：</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{getFriendlyErrorName(err.error_type)}</span>
                            </p>
                            <div className="pt-1 text-[9px] text-zinc-400 dark:text-zinc-500 leading-normal space-y-1">
                              <p className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${stage1Passed ? 'bg-emerald-500' : 'bg-zinc-350 dark:bg-zinc-700'}`} />
                                第一阶段 (原句纠偏)：扮演过去的自己，在原句上改错，提升短期记忆。
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${stage2Passed ? 'bg-emerald-500' : 'bg-zinc-350 dark:bg-zinc-700'}`} />
                                第二阶段 (场景迁移)：AI 创造全新的日常场景盲测相同语法，实现直觉内化。
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-400 dark:text-zinc-600">
                  <span className="text-2xl block mb-2">🎉</span>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">太棒了！你目前没有任何悬而未决的语法弱项！</p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">继续保持优秀的英语直觉表达吧</p>
                </div>
              )}

              {/* 已彻底消灭的错题 (荣誉册) */}
              {errorRecords.filter(e => e.noted_by_user).length > 0 && (
                <div className="pt-2 border-t border-dashed border-zinc-200/50 dark:border-zinc-900">
                  <button
                    onClick={() => setShowConqueredVault(!showConqueredVault)}
                    className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <span>🏆 已消灭的直觉盲区 ({errorRecords.filter(e => e.noted_by_user).length})</span>
                    </span>
                    <span>{showConqueredVault ? '收起 ▴' : '展开 ▾'}</span>
                  </button>

                  {showConqueredVault && (
                    <div className="space-y-2 mt-3 pt-2 animate-fade-in">
                      {errorRecords.filter(e => e.noted_by_user).map((err) => (
                        <div key={err.id} className="p-2.5 rounded-lg bg-emerald-500/[0.02] border border-emerald-500/10 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {err.error_type} 已攻克
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through leading-none">
                            原句：{err.original_text}
                          </p>
                          <p className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 leading-normal flex items-start gap-1">
                            <span className="shrink-0 text-emerald-500">➔</span>
                            <span>正确：{err.corrected_text || '已改正'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 技能解锁 — 垂直时间轴路线图 */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
          {isEnglish ? '🗣️ 英语直觉成长路线图' : '📷 摄影直觉成长路线图'}
        </h2>
        
        {/* 时间轴容器 */}
        <div className="relative pl-6 space-y-5 border-l-2 border-zinc-200 dark:border-zinc-900 ml-3.5">
          {stats.skillsUnlocked.map((skill, idx) => {
            const isMastered = skill.status === 'mastered'
            const isInProgress = skill.status === 'in_progress'
            const isLocked = skill.status === 'locked'
            
            return (
              <div key={skill.name} className="relative group animate-fade-in" style={{ animationDelay: `${120 + idx * 40}ms` }}>
                {/* 时间轴圆点节点 */}
                <span className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  isMastered
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/10'
                    : isInProgress
                    ? isEnglish
                      ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 animate-pulse'
                      : 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600 ring-4 ring-zinc-100/10'
                }`}>
                  {isMastered ? '✓' : isInProgress ? '🔍' : '🔒'}
                </span>

                {/* 技能信息卡片 */}
                <div className={`p-3.5 rounded-xl border transition-all duration-300 ${
                  isMastered
                    ? 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent dark:border-emerald-950/40 dark:from-emerald-950/10'
                    : isInProgress
                    ? isEnglish
                      ? 'border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-transparent dark:border-blue-950/40 dark:from-blue-950/10 shadow-xs'
                      : 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent dark:border-amber-950/40 dark:from-amber-950/10 shadow-xs'
                    : 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-900/60 dark:bg-zinc-900/10 opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isLocked ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200'
                    }`}>
                      {skill.name}
                    </span>
                    <span className={`text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md ${
                      isMastered
                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : isInProgress
                        ? isEnglish
                          ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                          : 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'
                    }`}>
                      {isMastered ? '已掌握' : isInProgress ? '探索中' : '待激活'}
                    </span>
                  </div>

                  {/* 操作按钮区 */}
                  {!isLocked && (
                    <div className="flex gap-2 mt-3 pt-2.5 border-t border-dashed border-zinc-200/50 dark:border-zinc-800/40">
                      {isEnglish ? (
                        isMastered ? (
                          <button
                            onClick={() => handleStartPractice(skill.id, skill.name)}
                            className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 dark:border-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/5"
                          >
                            <span>再次温习</span>
                            <span>🔄</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartPractice(skill.id, skill.name)}
                            className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all bg-blue-500 text-white hover:brightness-105 shadow-sm shadow-blue-500/10"
                          >
                            <span>开始针对性练习</span>
                            <span>🎯</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleStartPractice(skill.id, skill.name)}
                          className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all bg-amber-500 text-white hover:brightness-105 shadow-sm shadow-amber-500/10"
                        >
                          <span>开始练习</span>
                          <span>🎯</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 摄影探索画廊 */}
      {dbDiscoveries.length > 0 && (
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-5">
            {isEnglish ? '🗣️ 英语发现画廊' : '🖼️ 摄影探索画廊'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dbDiscoveries.map((d) => {
              const beforePhotoUrl = d.photo_urls?.[0]
              const afterPhotoUrl = d.photo_urls?.[1]
              const hasPhotos = beforePhotoUrl || afterPhotoUrl

              return (
                <Card key={d.id} className="flex flex-col justify-between overflow-hidden !border-zinc-200/65 dark:!border-zinc-900/65 bg-white/40 dark:bg-zinc-950/20 transition-all duration-300 hover:shadow-md hover:scale-[1.01] p-4">
                  <div>
                    {/* 图片展示区 (仅在非英语模块下显示) */}
                    {!isEnglish && (
                      hasPhotos ? (
                        <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-xl mb-3.5 border border-zinc-200/20 dark:border-zinc-800/40 shadow-xs">
                          {beforePhotoUrl ? (
                            <div className="relative aspect-[4/3] overflow-hidden group">
                              <img src={beforePhotoUrl} alt="Before" className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105" />
                              <span className="absolute bottom-1 left-1.5 bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Before</span>
                            </div>
                          ) : (
                            <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-center text-[10px] text-zinc-400">无图</div>
                          )}
                          {afterPhotoUrl ? (
                            <div className="relative aspect-[4/3] overflow-hidden group">
                              <img src={afterPhotoUrl} alt="After" className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105" />
                              <span className="absolute bottom-1 left-1.5 bg-amber-600/80 text-[8px] text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">After</span>
                            </div>
                          ) : (
                            <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-center text-[10px] text-zinc-400">未重拍</div>
                          )}
                        </div>
                      ) : (
                        /* 免图场景的创意 SVG 占位图 */
                        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900/40 dark:to-zinc-900/5 rounded-xl overflow-hidden mb-3.5 border border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-center shadow-xs">
                          {/* 三分法辅助线 */}
                          <div className="absolute inset-0 grid grid-cols-3 pointer-events-none">
                            <div className="border-r border-dashed border-zinc-300/40 dark:border-zinc-800/30" />
                            <div className="border-r border-dashed border-zinc-300/40 dark:border-zinc-800/30" />
                            <div />
                          </div>
                          <div className="absolute inset-0 grid grid-rows-3 pointer-events-none">
                            <div className="border-b border-dashed border-zinc-300/40 dark:border-zinc-800/30" />
                            <div className="border-b border-dashed border-zinc-300/40 dark:border-zinc-800/30" />
                            <div />
                          </div>
                          {/* 居中相机标线与图标 */}
                          <div className="flex flex-col items-center gap-1.5 text-zinc-400 dark:text-zinc-600 opacity-60">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                              <circle cx="12" cy="13" r="3.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[8px] font-extrabold tracking-wider uppercase">💬 场景探讨发现</span>
                          </div>
                        </div>
                      )
                    )}
                    
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1">
                      💡 {d.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3 mb-4">
                      {d.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/20 dark:border-zinc-800/40 pt-3 mt-auto">
                    <div className="flex flex-wrap gap-1">
                      {d.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                          isEnglish
                            ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push(`/practice?session=${d.session_id}`)}
                      className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1 active:scale-95 ${
                        isEnglish
                          ? 'border-blue-200 text-blue-700 hover:bg-blue-50/50 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-950/20'
                          : 'border-amber-200 text-amber-700 hover:bg-amber-50/50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/20'
                      }`}
                    >
                      <span>继续对话</span>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6h8M6 2l4 4-4 4"/>
                      </svg>
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 开始新练习 */}
      <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
        <Button 
          onClick={handleNewSession} 
          size="lg" 
          className={`w-full py-3 text-white font-medium hover:brightness-105 transition-all shadow-md rounded-xl text-xs font-bold tracking-wider ${
            isEnglish
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/10'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-amber-500/10'
          }`}
        >
          {isEnglish ? '开始下一次英语对话' : '开始下一个摄影练习'}
        </Button>
      </div>
    </div>
  )
}

function getFriendlyErrorName(type: string): string {
  const names: Record<string, string> = {
    'grammar-tense': '动词时态 (Tenses)',
    'grammar-article': '冠词使用 (Articles)',
    'grammar-preposition': '介词搭配 (Prepositions)',
    'grammar-word-order': '语序结构 (Word Order)',
    'grammar-agreement': '主谓一致 (Subject-Verb Agreement)',
    'vocabulary-choice': '词汇搭配 (Word Choice)',
    'expression-chinglish': '中式英语 (Chinglish)',
    'expression-incomplete': '句子完整性 (Sentence Completeness)',
  }
  return names[type] || type || '语法词汇 (Grammar/Vocabulary)'
}
