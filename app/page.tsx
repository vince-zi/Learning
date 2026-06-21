'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSessionStore } from '@/store/session-store'
import { useUploadStore } from '@/store/upload-store'
import { analytics } from '@/lib/analytics/tracker'
import { MODULE_CONFIG } from '@/core/models/session'
import type { ModuleType } from '@/core/models/session'

export default function Home() {
  const router = useRouter()

  // 模块和共享状态
  const { module, setModule, setSession, setPhase, addPhoto, resetSession } = useSessionStore()
  const { setStatus, error, setError } = useUploadStore()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // 文本直聊模式状态
  const [customQuestion, setCustomQuestion] = useState('')
  const [activeTab, setActiveTab] = useState<'photo' | 'text'>('photo')

  // 苏格拉底学习契约状态
  const [questioningStyle, setQuestioningStyle] = useState<'gentle' | 'sharp' | 'action'>('gentle')
  const [hasSelectedModule, setHasSelectedModule] = useState(false)

  // 活跃会话恢复相关的本地状态
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSessionTheme, setActiveSessionTheme] = useState<string | null>(null)

  // 监测当前选择的模块下是否有未完成 of 活跃会话记录
  useEffect(() => {
    if (!hasSelectedModule) {
      setActiveSessionId(null)
      setActiveSessionTheme(null)
      return
    }
    const cachedId = localStorage.getItem(`learniny_active_session_id_${module}`)
    const cachedTheme = localStorage.getItem(`learniny_active_session_theme_${module}`)
    if (cachedId) {
      setActiveSessionId(cachedId)
      setActiveSessionTheme(cachedTheme || '')
    } else {
      setActiveSessionId(null)
      setActiveSessionTheme(null)
    }
  }, [module, hasSelectedModule])

  const isPhotography = module === 'photography'

  const photoQuickTemplates = [
    { label: '我想把美女/女朋友拍得更好看 👩', text: '我想探讨如何把美女/女朋友拍得更好看，应该注意什么？' },
    { label: '我想在暗光下拍出清晰美丽的夜景 🌃', text: '我想探讨在暗光或夜晚场景下，如何拍出清晰且有氛围感的夜景照片？' },
    { label: '我想拍出背景虚化的高级美食 🍰', text: '我想学习怎么拍出那种主体清晰、背景虚化得很漂亮的美食特写？' },
    { label: '日常生活中如何拍出高级感照片？ ✨', text: '在日常的普通场景里，如何通过构图或寻找光线拍出有高级感的照片？' },
  ]

  const englishQuickTemplates = [
    { label: '我想练习日常自我介绍 🗣️', text: 'I want to practice introducing myself in English naturally. Can you help me?' },
    { label: '我不会用英语表达个人观点 💭', text: 'When I try to express my opinions in English, I feel stuck. Can we practice that?' },
    { label: '我想聊聊我的日常生活与爱好 📅', text: 'I want to talk about my daily routine and habits in more natural English.' },
    { label: '真实交流中一开口就容易卡壳 😰', text: 'In real English conversations, I freeze up. Can we practice everyday situations?' },
  ]

  const quickTemplates = isPhotography ? photoQuickTemplates : englishQuickTemplates

  // 生成匿名用户 ID
  const getUserId = () => {
    if (typeof window === 'undefined') return ''
    let userId = localStorage.getItem('learniny_user_id')
    if (!userId) {
      userId = 'anon_' + crypto.randomUUID()
      localStorage.setItem('learniny_user_id', userId)
    }
    return userId
  }

  const handleFileReady = (file: File) => {
    setSelectedFile(file)
  }

  // 开始拍照对话模式
  const handleStartPhotoSession = async () => {
    if (!selectedFile) return

    setIsStarting(true)
    setStatus('uploading')
    setError(null)
    resetSession() // 清空历史状态

    try {
      const userId = getUserId()

      // 1. 创建会话
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, module, questioningStyle }),
      })
      const sessionData = await sessionRes.json()

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to create session')
      }

      // 2. 上传照片
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('sessionId', sessionData.session.id)
      formData.append('userId', userId)
      formData.append('uploadOrder', '1')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload photo')
      }

      // 3. 追踪
      analytics.sessionStart(sessionData.session.id)
      analytics.photoUpload(1, sessionData.session.id)

      // 4. 更新客户端状态
      setSession({
        id: sessionData.session.id,
        userId,
        module,
        status: 'in_progress',
        theme: MODULE_CONFIG[module].defaultTheme,
        roundCount: 0,
        photoCount: 1,
        discoveryCount: 0,
        currentRound: 1,
        startedAt: new Date().toISOString(),
        questioningStyle,
        metadata: {
          currentKnowledgeNodeId: sessionData.session.currentKnowledgeNodeId,
        },
      })

      addPhoto({
        id: uploadData.photo?.id || '',
        sessionId: sessionData.session.id,
        userId,
        imageUrl: uploadData.photo?.imageUrl || '',
        uploadOrder: 1,
        uploadedAt: new Date().toISOString(),
      })

      setPhase('first_round')

      // 5. 跳转到练习页
      router.push(`/practice?session=${sessionData.session.id}`)
    } catch (err: any) {
      setError(err.message || '启动会话失败，请重试')
    } finally {
      setIsStarting(false)
      setStatus('idle')
    }
  }

  // 开始免图直聊模式
  const handleStartTextSession = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return

    setIsStarting(true)
    setError(null)
    resetSession() // 清空历史状态

    try {
      const userId = getUserId()

      // 1. 创建会话，将问题作为会话主题
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme: trimmed.substring(0, 30), module, questioningStyle }),
      })
      const sessionData = await sessionRes.json()

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to create session')
      }

      // 2. 追踪
      analytics.sessionStart(sessionData.session.id)

      // 3. 更新客户端状态
      setSession({
        id: sessionData.session.id,
        userId,
        module,
        status: 'in_progress',
        theme: trimmed.substring(0, 30),
        roundCount: 0,
        photoCount: 0,
        discoveryCount: 0,
        currentRound: 1,
        startedAt: new Date().toISOString(),
        questioningStyle,
        metadata: {
          currentKnowledgeNodeId: sessionData.session.currentKnowledgeNodeId,
        },
      })

      setPhase('first_round')

      // 4. 跳转到练习页并携带初始问题
      router.push(`/practice?session=${sessionData.session.id}&initialMessage=${encodeURIComponent(trimmed)}`)
    } catch (err: any) {
      setError(err.message || '启动话题失败，请重试')
    } finally {
      setIsStarting(false)
    }
  }

  // 开始英语定级测评会话
  const handleStartAssessmentSession = async () => {
    setIsStarting(true)
    setError(null)
    resetSession()

    try {
      const userId = getUserId()
      const theme = 'English Level Placement Assessment'

      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, module, questioningStyle }),
      })
      const sessionData = await sessionRes.json()

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to create session')
      }

      analytics.sessionStart(sessionData.session.id)

      setSession({
        id: sessionData.session.id,
        userId,
        module,
        status: 'in_progress',
        theme,
        roundCount: 0,
        photoCount: 0,
        discoveryCount: 0,
        currentRound: 1,
        startedAt: new Date().toISOString(),
        questioningStyle,
        metadata: {
          currentKnowledgeNodeId: sessionData.session.currentKnowledgeNodeId,
        },
      })

      setPhase('first_round')
      router.push(`/practice?session=${sessionData.session.id}`)
    } catch (err: any) {
      setError(err.message || '启动测评失败，请重试')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 md:py-16 max-w-4xl mx-auto w-full relative">
      {/* 注入水波纹呼吸动画样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ripple-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }
        .animate-ripple-1 {
          animation: ripple-ring 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-ripple-2 {
          animation: ripple-ring 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 1.3s;
        }
        .animate-ripple-3 {
          animation: ripple-ring 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 2.6s;
        }
      `}} />

      {/* 动态渐变背景底色 */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[380px] -z-15 blur-3xl pointer-events-none rounded-full transition-all duration-700 ${
        hasSelectedModule
          ? (isPhotography
              ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/2 to-transparent'
              : 'bg-gradient-to-b from-blue-500/10 via-blue-500/2 to-transparent')
          : 'bg-gradient-to-b from-zinc-500/5 to-transparent'
      }`} />

      {/* 苹果风极简 brand header welcome area */}
      <div className="w-full text-center mt-4 mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-550 tracking-widest uppercase mb-4 leading-tight">
          {hasSelectedModule && !isPhotography ? '启发 · 表达 · 语感' : '启发 · 观察 · 发现'}
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed font-medium">
          {hasSelectedModule && !isPhotography ? (
            <>
              这不是普通的 AI 问答，而是一个通过循序渐进的引导式追问，陪伴并启发您{' '}
              <span className="mx-1.5 px-2.5 py-0.5 rounded-lg font-extrabold text-xs md:text-sm bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300 border border-blue-500/20 dark:border-blue-400/20 shadow-xs inline-block align-middle my-1">
                在交流中自然建立直觉语感
              </span>{' '}
              的深度思考与口语陪练伙伴。
            </>
          ) : (
            <>
              这不是普通的 AI 问答，而是一个通过循序渐进的引导式追问，陪伴并启发您
              <span className="mx-1.5 px-2.5 py-0.5 rounded-lg font-extrabold text-xs md:text-sm bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-500/20 dark:border-amber-400/20 shadow-xs inline-block align-middle my-1">
                自己去探索事物本质规律
              </span>
              的深度思考伙伴。
            </>
          )}
        </p>
      </div>

      {/* 第一步：选择探索模块 */}
      <div className="w-full max-w-2xl mx-auto mb-10 animate-fade-in">
        <div className="text-center mb-5">
          <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
            hasSelectedModule
              ? (isPhotography ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400')
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
          }`}>
            Step 1 / 第一步
          </span>
          <h2 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2">
            选择您当下的探索领域
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 摄影模块 */}
          <div
            onClick={() => {
              setModule('photography')
              setHasSelectedModule(true)
            }}
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-350 relative group overflow-hidden ${
              module === 'photography' && hasSelectedModule
                ? 'border-amber-500/70 bg-amber-500/[0.01] shadow-lg shadow-amber-500/5 ring-4 ring-amber-500/10 dark:bg-zinc-900/10'
                : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/20 hover:border-zinc-350 dark:hover:border-zinc-700'
            }`}
          >
            {module === 'photography' && hasSelectedModule && (
              <div className="absolute top-4 right-4 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                已选中
              </div>
            )}
            <div className="flex items-center gap-3.5 mb-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📷</span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">摄影思考伙伴</h3>
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mt-0.5">Photography Partner</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              不直接教授干瘪的参数规则，而是通过对照片画面的交互提问，引导您的双眼发现光影与构图的本源奥秘。
            </p>
          </div>

          {/* 英语模块 */}
          <div
            onClick={() => {
              setModule('english')
              setHasSelectedModule(true)
            }}
            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-350 relative group overflow-hidden ${
              module === 'english' && hasSelectedModule
                ? 'border-blue-500/70 bg-blue-500/[0.01] shadow-lg shadow-blue-500/5 ring-4 ring-blue-500/10 dark:bg-zinc-900/10'
                : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-950/20 hover:border-zinc-350 dark:hover:border-zinc-700'
            }`}
          >
            {module === 'english' && hasSelectedModule && (
              <div className="absolute top-4 right-4 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                已选中
              </div>
            )}
            <div className="flex items-center gap-3.5 mb-3">
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🗣️</span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">英语陪练伙伴</h3>
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mt-0.5">English Partner</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
              不宣讲死板语法规则，通过轻松追问与隐性纠错（Recast），帮助您在真实交流中自然建立直觉语感。
            </p>
          </div>
        </div>
      </div>

      {/* 第二步：价值对比与水波纹呼吸动效 (选择模块后解锁展示) */}
      {hasSelectedModule && (
        <div className="w-full max-w-2xl mx-auto mb-12 animate-fade-in space-y-4">
          <div className="text-center mb-5">
            <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
              isPhotography ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              Step 2 / 第二步
            </span>
            <h2 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2">
              {isPhotography ? '感知启发式摄影学习的魅力' : '感知启发式英语习得的魅力'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative overflow-visible">
            {/* 传统 AI 对话 (Passive Feed) */}
            <div className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-850/60 bg-zinc-50/10 dark:bg-zinc-950/5 space-y-3 opacity-40 transition-opacity hover:opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔴</span>
                  <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                    传统 AI 灌输问答
                  </h4>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-250/20 dark:border-zinc-800/20">
                  被动灌输 💤
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-455 leading-relaxed font-normal">
                {isPhotography
                  ? '直接向你灌输硬性的摄影参数与公式化的构图规则，大脑没有经历主动的画面观察与美学反思，过目即忘。'
                  : '直接向你灌输标准句子翻译与死板的语法规则，大脑没有经历主动的语意重组与口语开口，犹如死记硬背。'}
              </p>
              <div className="p-2.5 rounded-lg bg-zinc-105/30 dark:bg-zinc-900/30 border border-zinc-200/10 dark:border-zinc-850/10 text-[10px] text-zinc-400 italic font-mono leading-relaxed">
                {isPhotography ? 'AI: “拍美食要用逆光，设定大光圈f/2.8。”' : 'AI: “表达个人观点，这里建议使用 In my opinion。”'}
              </div>
            </div>

            {/* 苏格拉底启发卡片 - 带水波纹脉冲圈 (Ripple Rings) */}
            <div className={`p-5 rounded-2xl border-2 bg-white dark:bg-zinc-900/90 space-y-3 relative z-10 transition-all duration-300 ${
              isPhotography 
                ? 'border-amber-500 shadow-lg shadow-amber-500/10 dark:shadow-amber-500/5 ring-1 ring-amber-500/20' 
                : 'border-blue-500 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/5 ring-1 ring-blue-500/20'
            }`}>
              
              {/* === 水波纹呼吸脉冲圈 (Ripple Rings) === */}
              <div className="absolute inset-0 -z-20 rounded-2xl pointer-events-none overflow-visible">
                <div className={`absolute inset-0 rounded-2xl border-2 animate-ripple-1 ${
                  isPhotography ? 'border-amber-500/20' : 'border-blue-500/20'
                }`} />
                <div className={`absolute inset-0 rounded-2xl border-2 animate-ripple-2 ${
                  isPhotography ? 'border-amber-500/20' : 'border-blue-500/20'
                }`} />
                <div className={`absolute inset-0 rounded-2xl border-2 animate-ripple-3 ${
                  isPhotography ? 'border-amber-500/20' : 'border-blue-500/20'
                }`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <h4 className={`text-xs font-extrabold uppercase tracking-wide ${
                    isPhotography ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {isPhotography ? '苏格拉底启发导师' : '苏格拉底启发陪练'}
                  </h4>
                </div>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                  isPhotography 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}>
                  主动探索 🚀
                </span>
              </div>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-200 leading-relaxed font-semibold">
                {isPhotography
                  ? '以引导性问题启发你的双眼聚焦光影与构图细节、反思直觉，陪伴并引导你自己总结出画面的美学规律，内化为拍摄直觉。'
                  : '以引导性问题追问你表达背后的思维逻辑，鼓励多开口多表达，陪伴并在交流中自然习得地道语感，内化为沟通直觉。'}
              </p>
              <div className={`p-2.5 rounded-lg border text-[10px] font-mono leading-relaxed font-semibold ${
                isPhotography 
                  ? 'bg-amber-500/[0.03] border-amber-500/25 text-amber-955 dark:text-amber-300' 
                  : 'bg-blue-500/[0.03] border-blue-500/25 text-blue-955 dark:text-blue-300'
              }`}>
                {isPhotography 
                  ? 'AI: “看你拍的蛋糕，阴影延伸到了哪里？它如何改变了奶油的纹理？”' 
                  : 'AI: “你刚才表达了支持。如果现在站到对立面反驳，你会怎么用英语组织措辞？”'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 第三步：操作动作与对话区 (选择模块后解锁展示) */}
      {hasSelectedModule && (
        <div className="w-full max-w-2xl mx-auto mb-8 animate-fade-in space-y-6">
          <div className="text-center mb-3">
            <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
              isPhotography ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              Step 3 / 第三步
            </span>
            <h2 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2">
              开启您的探索对话
            </h2>
          </div>

          {/* 契约状态与风格选择栏 */}
          <div className="w-full">
            <div className={`p-5 rounded-2xl border flex flex-col gap-4 shadow-sm bg-white dark:bg-zinc-900 ${
              isPhotography 
                ? 'border-amber-500/25 bg-amber-500/[0.01]' 
                : 'border-blue-500/25 bg-blue-500/[0.01]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="text-xl">🤝</span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-550">
                      苏格拉底对话契约已生效
                    </h3>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {isPhotography
                        ? '我承诺不进行灌输式解答，以引导性问题陪伴您自主发现规律。'
                        : '我承诺不进行生硬的语法灌输，以引导性提问陪伴您自然开口、建立语感。'}
                    </p>
                  </div>
                </div>
                <span className={`self-start sm:self-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isPhotography 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}>
                  启发引擎已就位 🚀
                </span>
              </div>

              {/* 风格卡片直接选择 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'gentle' as const,
                    name: '温和引导',
                    sub: 'Gentle Scaffold',
                    icon: '🌱',
                    desc: isPhotography
                      ? '多肯定、多鼓励。AI 会向你提供选项或缩小观察范围，降低挫败感，适合体验。'
                      : '多肯定、多鼓励。AI 会提供句式支架与缩小开口范围，降低开口难度，适合轻松体验。',
                    example: isPhotography 
                      ? '“观察一下画面，你觉得光线是从哪边照进来的？”'
                      : '“别担心，我们可以一步步来。能尝试用最简单的词汇聊聊你今天过得怎么样吗？”',
                  },
                  {
                    id: 'sharp' as const,
                    name: '犀利思辨',
                    sub: 'Devil\'s Advocate',
                    icon: '⚡',
                    desc: isPhotography
                      ? '反思直觉，追问逻辑。挑战你的观察盲区，逼迫进行深度画析。'
                      : '主动切入你表达背后的逻辑，挑战观点漏洞，逼迫你用英文进行更深度的思辨输出。',
                    example: isPhotography
                      ? '“这里的阴影看起来很突兀。它是你故意留下的吗？”'
                      : '“你赞同这个做法。但如果有人声称这完全是浪费时间，你会怎么反驳他？”',
                  },
                  {
                    id: 'action' as const,
                    name: '实战督导',
                    sub: 'Action Coach',
                    icon: '🔥',
                    desc: isPhotography
                      ? '直奔动手，极简分析。AI 会挑战你立即拿起相机重拍，对比细节。'
                      : '极简的机制解释，侧重即学即练。AI 会迅速给出句式改写挑战，在实操中提炼语感。',
                    example: isPhotography
                      ? '“现在将镜头拉近一倍，重新构图拍一张发给我对比！”'
                      : '“试着把刚才的回答用被动语态改写一次，看看语气有什么微妙变化？”',
                  },
                ].map((s) => {
                  const isSelected = questioningStyle === s.id
                  return (
                    <div
                      key={s.id}
                      onClick={() => setQuestioningStyle(s.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                        isSelected
                          ? isPhotography
                            ? 'border-amber-500 bg-white dark:bg-zinc-900 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20'
                            : 'border-blue-500 bg-white dark:bg-zinc-900 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
                          : 'border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/20 hover:border-zinc-350 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl">{s.icon}</span>
                          <div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block leading-none">{s.name}</span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black block mt-0.5">{s.sub}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {s.desc}
                        </p>
                      </div>

                      {/* 启发示例 */}
                      <div className={`mt-3.5 p-2 rounded-xl text-[9.5px] font-mono leading-relaxed border ${
                        isSelected
                          ? isPhotography 
                            ? 'bg-amber-500/[0.03] border-amber-500/25 text-amber-900 dark:text-amber-300' 
                            : 'bg-blue-500/[0.03] border-blue-500/25 text-blue-900 dark:text-blue-300'
                          : 'bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-800/40 text-zinc-450 dark:text-zinc-500'
                      }`}>
                        <span className="font-sans font-bold text-[9px] mr-1 block text-zinc-450 dark:text-zinc-500 select-none">
                          启发示例:
                        </span>
                        {s.example}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 活跃会话恢复提示条 */}
          {activeSessionId && (
            <div 
              className={`w-full rounded-2xl border p-4 flex items-center justify-between gap-4 shadow-md transition-all duration-305 ${
                isPhotography
                  ? 'border-amber-500/25 bg-amber-500/[0.02] dark:border-amber-500/15'
                  : 'border-blue-500/25 bg-blue-500/[0.02] dark:border-blue-500/15'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl shrink-0 mt-0.5">💡</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    检测到您有一个未完成的对话！
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                    主题: {activeSessionTheme || (isPhotography ? '未命名摄影探讨' : '未命名英语练习')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => {
                    router.push(`/practice?session=${activeSessionId}`)
                  }}
                  size="sm"
                  className={`text-xs font-semibold py-1.5 px-3 text-white rounded-xl hover:brightness-105 active:scale-95 shadow-sm ${
                    isPhotography 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-amber-500/10'
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/10'
                  }`}
                >
                  继续对话 💬
                </Button>
                <button
                  onClick={() => {
                    localStorage.removeItem(`learniny_active_session_id_${module}`)
                    localStorage.removeItem(`learniny_active_session_theme_${module}`)
                    setActiveSessionId(null)
                    setActiveSessionTheme(null)
                  }}
                  className="text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-350 p-1.5 rounded-lg transition-colors"
                  title="忽略本次提示"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 2l8 8M10 2l-8 8"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* 核心操作卡片 */}
          {isPhotography ? (
            /* ===== 摄影模块：双栏布局 ===== */
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* 模式一：实战拍摄 */}
              <Card className={`relative flex flex-col justify-between transition-all duration-300 border-2 cursor-pointer ${
                activeTab === 'photo'
                  ? 'border-amber-500 bg-white dark:bg-zinc-900/90 shadow-xl shadow-amber-500/10 dark:shadow-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white/40 dark:bg-zinc-950/20 opacity-55 hover:opacity-85'
              }`} onClick={() => setActiveTab('photo')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-amber-100 dark:bg-amber-955/50 rounded-xl">📷</span>
                      <div>
                        <h3 className="font-bold text-zinc-955 dark:text-zinc-550 text-base">模式一：实操拍照探讨</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">从一张身边的真实照片开启学习</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 font-medium">
                    上传一张你刚才拍摄的或相册里的照片。我将根据这张照片，引导你发现视觉重心、光影和构图的奥秘。
                  </p>
                  <div className="mb-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <ImageUploader onUpload={handleFileReady} isLoading={isStarting} label="拍一张你面前的任何物品，发给我" />
                  </div>
                </div>
                {activeTab === 'photo' && selectedFile && (
                  <div className="mt-4 animate-fade-in pointer-events-auto">
                    <Button onClick={handleStartPhotoSession} loading={isStarting} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold hover:brightness-105 transition-all duration-200 active:scale-98 shadow-md shadow-amber-500/10">
                      开启我的拍照对话
                    </Button>
                  </div>
                )}
              </Card>

              {/* 模式二：场景探讨（免图直聊） */}
              <Card className={`relative flex flex-col justify-between transition-all duration-300 border-2 cursor-pointer ${
                activeTab === 'text'
                  ? 'border-amber-500 bg-white dark:bg-zinc-900/90 shadow-xl shadow-amber-500/10 dark:shadow-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white/40 dark:bg-zinc-950/20 opacity-55 hover:opacity-85'
              }`} onClick={() => setActiveTab('text')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-amber-100 dark:bg-amber-955/50 rounded-xl">💬</span>
                      <div>
                        <h3 className="font-bold text-zinc-955 dark:text-zinc-550 text-base">模式二：场景探讨（免图直聊）</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">无图提问，针对性分析具体摄影难题</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4 font-medium">
                    不需要上传图片，直接告诉我你当下想拍好的场景或摄影疑问。
                  </p>
                  <div className="space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="在此输入你的具体摄影难题，例如：我想把一个美女拍得更好看，应该怎么去引导 and 选择角度？"
                      className="w-full h-24 p-3 text-xs rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 resize-none transition-all duration-200"
                    />
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 tracking-wider uppercase">推荐场景提问：</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quickTemplates.map((t, idx) => (
                          <button key={idx} onClick={() => { setActiveTab('text'); setCustomQuestion(t.text) }}
                            className="text-left text-[11px] leading-snug px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-900/40 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:bg-amber-500/5 hover:-translate-y-0.5 text-zinc-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 transition-all font-medium shadow-xs hover:shadow-sm duration-200 active:scale-98">
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {activeTab === 'text' && (
                  <div className="mt-4 animate-fade-in pointer-events-auto">
                    <Button onClick={() => handleStartTextSession(customQuestion)} loading={isStarting} disabled={!customQuestion.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold hover:brightness-105 transition-all duration-200 active:scale-98 shadow-md shadow-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed">
                      直接开启场景对话
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            /* ===== 英语模块：单栏全宽布局 ===== */
            <div className="w-full animate-fade-in">
              <Card className="border-2 border-blue-500 bg-white dark:bg-zinc-900/90 shadow-xl shadow-blue-500/10 dark:shadow-blue-500/5 ring-1 ring-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl p-2 bg-blue-100 dark:bg-blue-955/50 rounded-xl">🗣️</span>
                  <div>
                    <h3 className="font-bold text-zinc-955 dark:text-zinc-555 text-base">开始英语对话</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">用英语跟我聊天——我会用提问引导你越说越多</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-655 dark:text-zinc-450 leading-relaxed mb-4">
                  随便输入点什么——你想聊的话题、想练习的表达，或者就说句嗨。我会通过循序渐进的启发式追问帮你自然地越说越流利。不讲枯燥的语法规则，只有真实的对话练习。
                </p>

                <div className="space-y-4 mb-4">
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="用英语输入你想聊的内容，例如：&quot;I want to practice talking about my daily life&quot; 或者直接 &quot;Hi!&quot;"
                    className="w-full h-28 p-3 text-sm rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 resize-none transition-all duration-200"
                  />

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 tracking-wider uppercase">快速选择场景：</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickTemplates.map((t, idx) => (
                        <button key={idx} onClick={() => setCustomQuestion(t.text)}
                          className="text-left text-[11px] leading-snug px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white/50 dark:bg-zinc-900/40 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-955/20 hover:-translate-y-0.5 text-zinc-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-450 transition-all font-medium shadow-xs hover:shadow-sm duration-200 active:scale-98">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => handleStartTextSession(customQuestion)} loading={isStarting} disabled={!customQuestion.trim()}
                    className="flex-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold hover:brightness-105 transition-all duration-200 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-xs tracking-wider rounded-xl shadow-md shadow-blue-500/10">
                    {customQuestion.trim() ? '开始日常对话 →' : '在上方输入内容以开始'}
                  </Button>
                  <Button onClick={handleStartAssessmentSession} loading={isStarting}
                    className="flex-1 py-3 bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold hover:brightness-105 border border-blue-500/20 dark:border-blue-900/30 transition-all duration-200 active:scale-98 text-xs tracking-wider rounded-xl shadow-xs">
                    🎯 开启 5分钟英语定级测评
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="underline font-semibold ml-2 hover:text-red-800">关闭</button>
            </div>
          )}

          {/* 说明 */}
          <div className="text-center mt-4 text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-sm mx-auto">
            {isPhotography
              ? '无论使用什么模式，我们最终都将通过对话，帮助你沉淀出属于你自己的摄影发现知识库。'
              : '通过一次次对话，你将在真实的交流中自然地积累英语语感——而不是死记硬背。'}
          </div>
        </div>
      )}
    </div>
  )
}
