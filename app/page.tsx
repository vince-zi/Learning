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

  // 活跃会话恢复相关的本地状态
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeSessionTheme, setActiveSessionTheme] = useState<string | null>(null)

  // 监测当前选择的模块下是否有未完成的活跃会话记录
  useEffect(() => {
    const cachedId = localStorage.getItem(`learniny_active_session_id_${module}`)
    const cachedTheme = localStorage.getItem(`learniny_active_session_theme_${module}`)
    if (cachedId) {
      setActiveSessionId(cachedId)
      setActiveSessionTheme(cachedTheme || '')
    } else {
      setActiveSessionId(null)
      setActiveSessionTheme(null)
    }
  }, [module])

  const isPhotography = module === 'photography'

  const photoQuickTemplates = [
    { label: '我想把美女/女朋友拍得更好看 👩', text: '我想探讨如何把美女/女朋友拍得更好看，应该注意什么？' },
    { label: '我想在暗光下拍出清晰美丽的夜景 🌃', text: '我想探讨在暗光或夜晚场景下，如何拍出清晰且有氛围感的夜景照片？' },
    { label: '我想拍出背景虚化的高级美食 🍰', text: '我想学习怎么拍出那种主体清晰、背景虚化得很漂亮的美食特写？' },
    { label: '日常生活中如何拍出高级感照片？ ✨', text: '在日常的普通场景里，如何通过构图或寻找光线拍出有高级感的照片？' },
  ]

  const englishQuickTemplates = [
    { label: '我想练习自我介绍 🗣️', text: 'I want to practice introducing myself in English naturally. Can you help me?' },
    { label: '我不会用英语表达观点 💭', text: 'When I try to express my opinions in English, I feel stuck. Can we practice that?' },
    { label: '我想聊聊我的日常生活 📅', text: 'I want to talk about my daily routine and habits in more natural English.' },
    { label: '真实场景我一开口就卡住 😰', text: 'In real English conversations, I freeze up. Can we practice everyday situations?' },
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
        body: JSON.stringify({ userId, module }),
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
        body: JSON.stringify({ userId, theme: trimmed.substring(0, 30), module }),
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
        body: JSON.stringify({ userId, theme, module }),
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
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 md:py-16 max-w-4xl mx-auto w-full">
      {/* 渐变装饰背景 */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] -z-10 blur-3xl pointer-events-none rounded-full ${
        isPhotography
          ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/2 to-transparent'
          : 'bg-gradient-to-b from-blue-500/10 via-blue-500/2 to-transparent'
      }`} />

      {/* 模块切换 Tabs */}
      <div className="w-full max-w-sm mx-auto mb-8 animate-fade-in">
        <div className="flex bg-zinc-100 dark:bg-zinc-800/60 rounded-xl p-1">
          {(Object.entries(MODULE_CONFIG) as [ModuleType, typeof MODULE_CONFIG[ModuleType]][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setModule(key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                module === key
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <span className="mr-1.5">{config.icon}</span>
              {config.name}
            </button>
          ))}
        </div>
      </div>

      {/* 头部欢迎区 */}
      <div className="w-full text-center mb-10 animate-fade-in">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
          isPhotography
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400'
        }`}>
          {MODULE_CONFIG[module].icon} {isPhotography ? '摄影学习新范式' : '英语学习新范式'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4 leading-tight">
          {isPhotography ? (
            <>你好！我是你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300">摄影思考伙伴</span></>
          ) : (
            <>你好！我是你的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300">英语陪练伙伴</span></>
          )}
        </h1>
        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
          {isPhotography ? (
            <>我不会直接给你干瘪的"参数和规则"，而是通过引导式的温和提问，陪伴并引导你
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">自己去观察和发现</span>摄影背后的规律。</>
          ) : (
            <>我不会跟你讲语法规则。我用启发式的互动追问，陪你
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">在真实对话中自然地发现英语的规律</span>。</>
          )}
        </p>
      </div>

      {/* 活跃会话恢复提示条 */}
      {activeSessionId && (
        <div 
          className={`w-full max-w-xl mx-auto mb-8 rounded-2xl border p-4 flex items-center justify-between gap-4 shadow-md transition-all duration-300 animate-fade-in ${
            isPhotography
              ? 'border-amber-500/25 bg-amber-500/[0.02] dark:border-amber-500/15'
              : 'border-blue-500/25 bg-blue-500/[0.02] dark:border-blue-500/15'
          }`}
          style={{ animation: 'fadeIn 0.35s ease both' }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-xl shrink-0 mt-0.5">💡</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">检测到您有一个未完成的对话！</p>
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
              className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-350 p-1.5 rounded-lg transition-colors"
              title="忽略本次提示"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l8 8M10 2l-8 8"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 核心操作区 */}
      {isPhotography ? (
        /* ===== 摄影模块：双栏布局 ===== */
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {/* 模式一：实战拍摄 */}
          <Card className={`relative flex flex-col justify-between transition-all duration-300 border-2 ${
            activeTab === 'photo'
              ? 'border-amber-500/60 shadow-lg shadow-amber-500/5 dark:bg-zinc-900/80'
              : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`} onClick={() => setActiveTab('photo')}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl">📷</span>
                  <div>
                    <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base">模式一：实操拍照探讨</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">从一张身边的真实照片开启学习</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                上传一张你刚才拍摄的或相册里的照片。我将根据这张照片，引导你发现视觉重心、光影和构图的奥秘。
              </p>
              <div className="mb-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <ImageUploader onUpload={handleFileReady} isLoading={isStarting} label="拍一张你面前的任何物品，发给我" />
              </div>
            </div>
            {activeTab === 'photo' && selectedFile && (
              <div className="mt-4 animate-fade-in pointer-events-auto">
                <Button onClick={handleStartPhotoSession} loading={isStarting} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium hover:brightness-105 transition-all">
                  开启我的拍照对话
                </Button>
              </div>
            )}
          </Card>

          {/* 模式二：话题直聊 */}
          <Card className={`relative flex flex-col justify-between transition-all duration-300 border-2 ${
            activeTab === 'text'
              ? 'border-amber-500/60 shadow-lg shadow-amber-500/5 dark:bg-zinc-900/80'
              : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`} onClick={() => setActiveTab('text')}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl">💬</span>
                  <div>
                    <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base">模式二：场景探讨（免图直聊）</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">无图提问，针对性分析具体摄影难题</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                不需要上传图片，直接告诉我你当下想拍好的场景或摄影疑问。
              </p>
              <div className="space-y-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="在此输入你的具体摄影难题，例如：我想把一个美女拍得更好看，应该怎么去引导和选择角度？"
                  className="w-full h-24 p-3 text-xs rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none transition-all"
                />
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">推荐场景提问：</span>
                  <div className="flex flex-col gap-1.5">
                    {quickTemplates.map((t, idx) => (
                      <button key={idx} onClick={() => { setActiveTab('text'); setCustomQuestion(t.text) }}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-zinc-100 hover:border-amber-500/30 hover:bg-amber-500/5 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all font-normal truncate">
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
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  直接开启场景对话
                </Button>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ===== 英语模块：单栏全宽布局 ===== */
        <div className="w-full max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <Card className="border-2 border-blue-500/20 shadow-lg shadow-blue-500/5 dark:bg-zinc-900/80">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl p-2 bg-blue-100 dark:bg-blue-950/50 rounded-xl">🗣️</span>
              <div>
                <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base">开始英语对话</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">用英语跟我聊天——我会用提问引导你越说越多</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              随便打点什么——你想聊的话题、想练习的表达、或者就说句嗨。
              我会通过循序渐进的启发式追问帮你自然地越说越流利。<strong>不讲语法规则，只有真实对话。</strong>
            </p>

            <div className="space-y-3 mb-4">
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="用英语输入你想聊的内容，例如：&quot;I want to practice talking about my daily life&quot; 或者直接 &quot;Hi!&quot;"
                className="w-full h-28 p-3 text-sm rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
              />

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">快速开始话题：</span>
                <div className="flex flex-col gap-1.5">
                  {quickTemplates.map((t, idx) => (
                    <button key={idx} onClick={() => setCustomQuestion(t.text)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-zinc-100 hover:border-blue-500/30 hover:bg-blue-500/5 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-normal">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleStartTextSession(customQuestion)} loading={isStarting} disabled={!customQuestion.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold tracking-wider rounded-xl">
                {customQuestion.trim() ? '开始日常对话 →' : '在上方输入内容以开始'}
              </Button>
              <Button onClick={handleStartAssessmentSession} loading={isStarting}
                className="flex-1 py-3 bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold hover:brightness-105 border border-blue-500/20 dark:border-blue-900/30 transition-all text-xs font-bold tracking-wider rounded-xl shadow-xs">
                🎯 开启 5分钟英语定级测评
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-lg p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400 flex items-center justify-between mb-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline font-semibold ml-2 hover:text-red-800">关闭</button>
        </div>
      )}

      {/* 说明 */}
      <div className="text-center mt-4 text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-sm">
        {isPhotography
          ? '无论使用什么模式，我们最终都将通过对话，帮助你沉淀出属于你自己的摄影发现知识库。'
          : '通过一次次对话，你将在真实的交流中自然地积累英语语感——而不是死记硬背。'}
      </div>
    </div>
  )
}
