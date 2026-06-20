'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MessageList } from '@/components/chat/MessageList'
import { AnswerInput } from '@/components/chat/AnswerInput'
import { PhotoPreview } from '@/components/upload/PhotoPreview'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useSessionStore } from '@/store/session-store'
import { useUploadStore } from '@/store/upload-store'
import { analytics } from '@/lib/analytics/tracker'
import { supabase } from '@/lib/db/supabase-client'
import type { Message } from '@/core/models/session'

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-sm text-zinc-400">加载中...</p></div>}>
      <PracticeContent />
    </Suspense>
  )
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')

  const {
    session, photos, messages, currentTask,
    addMessage, setMessages, setCurrentTask, clearCurrentTask,
    isThinking, setThinking, error, setError,
    phase, setPhase, addPhoto, addDiscovery,
    setSession, setModule,
  } = useSessionStore()

  const { setStatus } = useUploadStore()

  const [questionIndex, setQuestionIndex] = useState(1)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isAssessmentCompleted, setIsAssessmentCompleted] = useState(false)
  const [showChallengeBar, setShowChallengeBar] = useState(false)
  const [showAssessmentBar, setShowAssessmentBar] = useState(false)
  const [continueChatting, setContinueChatting] = useState(false)
  const [pendingTaskData, setPendingTaskData] = useState<any>(null)
  const [hintDismissed, setHintDismissed] = useState(false)
  const [showDiscoveryBar, setShowDiscoveryBar] = useState(false)

  // 加载会话历史
  useEffect(() => {
    if (!sessionId) return

    async function loadHistory() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`)
        const data = await res.json()
        
        if (data.session) {
          setSession({
            id: data.session.id,
            userId: data.session.userId,
            module: data.session.module,
            status: data.session.status,
            theme: data.session.theme,
            roundCount: data.session.roundCount,
            photoCount: data.session.photoCount,
            discoveryCount: data.session.discoveryCount,
            currentRound: data.session.currentRound,
            startedAt: data.session.startedAt,
            completedAt: data.session.completedAt,
          })
          setModule(data.session.module)
          
          if (data.session.status === 'completed' || (data.session.discoveryCount > 0 && data.session.status !== 'in_progress')) {
            setPhase('discovery')
            // 已完成，清理活跃会话缓存
            localStorage.removeItem(`learniny_active_session_id_${data.session.module}`)
            localStorage.removeItem(`learniny_active_session_theme_${data.session.module}`)
          } else {
            // 未完成，缓存为当前活跃会话
            localStorage.setItem(`learniny_active_session_id_${data.session.module}`, data.session.id)
            localStorage.setItem(`learniny_active_session_theme_${data.session.module}`, data.session.theme || '')
          }
        }

        const storeState = useSessionStore.getState()
        const currentSession = data.session || storeState.session

        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages)
          const currentRoundNum = currentSession?.currentRound || 1
          const assistantMsgsInRound = data.messages.filter(
            (m: Message) => m.role === 'assistant' && m.metadata?.roundNumber === currentRoundNum
          )
          setQuestionIndex(assistantMsgsInRound.length + 1)
          
          const isAssessmentSession = currentSession?.theme === 'English Level Placement Assessment'
          const isEnglish = currentSession?.module === 'english'
          if (isAssessmentSession && assistantMsgsInRound.length >= 5) {
            setIsAssessmentCompleted(true)
          } else if (assistantMsgsInRound.length >= 4 && !isAssessmentSession) {
            if (!isEnglish) {
              setPhase('reshoot_task')
            }
          }
        } else {
          // 防止 React Strict Mode 在开发环境下挂载两次 useEffect，导致触发两次初始消息调用
          if (useSessionStore.getState().messages.length > 0) return

          // 全新会话：自动触发第一条 AI 消息
          setIsLoadingHistory(false)
          setThinking(true)
          try {
            const isEnglish = currentSession?.module === 'english'
            const storePhotos = useSessionStore.getState().photos
            const initialMsgText = searchParams.get('initialMessage') || (storePhotos.length > 0 ? '我上传了一张照片' : (isEnglish ? 'Hi, I want to practice my English.' : '我想探讨一些摄影技巧'))
            
            // 将第一条用户发送的消息加入本地 UI 显示，使聊天体验更连贯
            addMessage({
              id: `init_user_${Date.now()}`,
              sessionId: sessionId || '',
              role: 'user',
              messageType: 'answer',
              content: initialMsgText,
              createdAt: new Date().toISOString(),
            })

            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                userId: currentSession?.userId || '',
                userMessage: initialMsgText,
                phase: 'first_round',
                questionIndex: 1,
                roundNumber: 1,
                module: currentSession?.module || 'photography',
                imageUrls: storePhotos.map(p => p.imageUrl),
              }),
            })
            const chatData = await res.json()
            if (chatData.success) {
              addMessage({
                id: `ai_first_${Date.now()}`,
                sessionId: sessionId || '',
                role: 'assistant',
                messageType: 'question',
                content: chatData.message.content,
                createdAt: new Date().toISOString(),
              })
              setPhase(chatData.phase || 'first_round')
            }
          } catch { /* ignore */ }
          setThinking(false)
        }
      } catch (err) {
        console.error('Failed to load history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
    analytics.pageView('practice', sessionId || undefined)
  }, [sessionId, setMessages, setPhase, searchParams, addMessage, setSession, setModule])

  // 生成发现
  const handleGenerateDiscovery = useCallback(async () => {
    if (!sessionId) return

    setThinking(true)
    try {
      const res = await fetch('/api/discoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: session?.userId,
          module: session?.module || 'photography',
          knowledgeNodeId: session?.module === 'english' ? 'self-intro' : 'visual-focus',
        }),
      })
      const data = await res.json()

      if (data.success && data.discovery) {
        addDiscovery({
          id: data.discovery.id,
          sessionId,
          userId: session?.userId || '',
          title: data.discovery.title,
          summary: data.discovery.summary,
          photoUrls: photos.map(p => p.imageUrl),
          tags: data.discovery.tags || [],
          sourceRound: 2,
          createdAt: new Date().toISOString(),
        })

        analytics.discoveryComplete(data.discovery.id, sessionId)
        setPhase('discovery')

        // 清理当前模块的活跃会话记录
        if (session?.module) {
          localStorage.removeItem(`learniny_active_session_id_${session.module}`)
          localStorage.removeItem(`learniny_active_session_theme_${session.module}`)
        }

        // 跳转到对应页面
        if (session?.theme === 'English Level Placement Assessment') {
          router.push('/progress')
        } else {
          router.push(`/discovery?session=${sessionId}`)
        }
      }
    } catch (err: any) {
      setError(err.message || '生成发现失败')
    } finally {
      setThinking(false)
    }
  }, [sessionId, session, photos, addDiscovery, setPhase, setThinking, setError, router])

  // 发送用户回答
  const handleSendMessage = useCallback(async (content: string) => {
    if (!sessionId || isThinking) return

    // 如果提示栏显示中且用户直接输入了新消息，自动视为“继续聊天”并关闭提示栏
    if (showChallengeBar) {
      setContinueChatting(true)
      setPendingTaskData(null)
      setShowChallengeBar(false)
    }
    if (showAssessmentBar) {
      setContinueChatting(true)
      setShowAssessmentBar(false)
    }

    setThinking(true)
    setError(null)

    // 乐观添加用户消息
    const userMsg: Message = {
      id: `temp_${Date.now()}`,
      sessionId,
      role: 'user',
      messageType: 'answer',
      content,
      createdAt: new Date().toISOString(),
    }
    addMessage(userMsg)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: session?.userId,
          userMessage: content,
          phase,
          questionIndex,
          roundNumber: session?.currentRound || 1,
          imageUrls: photos.map(p => p.imageUrl),
          continueChatting,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Chat failed')
      }

      // 添加 AI 消息
      addMessage({
        id: `temp_ai_${Date.now()}`,
        sessionId,
        role: 'assistant',
        messageType: data.message.type,
        content: data.message.content,
        createdAt: new Date().toISOString(),
      })

      analytics.questionAnswer(questionIndex, session?.currentRound || 1, sessionId)

      // 推进状态：检测是否应该显示提示栏
      if (data.nextAction === 'issue_task' && !continueChatting) {
        // 记录待处理任务
        setPendingTaskData({
          id: `task_${Date.now()}`,
          sessionId,
          taskType: 'reshoot',
          instruction: data.message.content,
          scaffoldingHints: [],
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        setShowChallengeBar(true)
      } else {
        setQuestionIndex(data.questionIndex)
      }

      if (data.isAssessmentCompleted && !continueChatting) {
        // 展示「继续聊/生成报告」提示栏
        setShowAssessmentBar(true)
      }

      if (data.phase && data.nextAction !== 'issue_task') {
        setPhase(data.phase)
      }
    } catch (err: any) {
      setError(err.message || '发送失败，请重试')
    } finally {
      setThinking(false)
    }
  }, [sessionId, isThinking, phase, questionIndex, session, photos, addMessage, setThinking, setError, setPhase, setCurrentTask, continueChatting, setContinueChatting, showChallengeBar, showAssessmentBar, handleGenerateDiscovery])

  // 上传第二轮照片
  const handleReshootUpload = useCallback(async (file: File) => {
    if (!sessionId || !session?.userId) return

    setStatus('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)
      formData.append('userId', session.userId)
      formData.append('uploadOrder', '2')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      addPhoto({
        id: data.photo?.id || '',
        sessionId,
        userId: session.userId,
        imageUrl: data.photo?.imageUrl || '',
        uploadOrder: 2,
        uploadedAt: new Date().toISOString(),
      })

      analytics.photoUpload(2, sessionId)

      // 标记任务完成
      if (currentTask) {
        await fetch(`/api/tasks/${currentTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
        clearCurrentTask()
        analytics.taskComplete('reshoot', sessionId)
      }

      // 进入第二轮提问
      setPhase('second_round')
      setQuestionIndex(1)

      // 自动触发第一轮对话
      setThinking(true)
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: session.userId,
          userMessage: '我已经完成了再拍任务。这是第二张照片。',
          phase: 'second_round',
          questionIndex: 1,
          roundNumber: 2,
          imageUrls: [...photos.map(p => p.imageUrl), data.photo?.imageUrl].filter(Boolean),
        }),
      })
      const chatData = await chatRes.json()
      setThinking(false)

      if (chatData.success) {
        addMessage({
          id: `temp_ai_${Date.now()}`,
          sessionId,
          role: 'assistant',
          messageType: chatData.message.type,
          content: chatData.message.content,
          createdAt: new Date().toISOString(),
        })
      }
    } catch (err: any) {
      setError(err.message || '上传失败，请重试')
      setStatus('idle')
    }
  }, [sessionId, session, photos, currentTask, addPhoto, clearCurrentTask, setPhase, setStatus, setThinking, setError, addMessage])



  // 跳过任务
  const handleSkipTask = async () => {
    if (currentTask) {
      await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped' }),
      })
      clearCurrentTask()
      analytics.taskSkip('reshoot', sessionId || '')
    }
    // 跳转到发现
    handleGenerateDiscovery()
  }

  // 处理练习挑战选择：「继续聊」
  const handleContinueChatFromChallenge = () => {
    setContinueChatting(true)
    setShowDiscoveryBar(false)
    setPendingTaskData(null)
    setShowChallengeBar(false)
  }

  // 处理练习挑战选择：「接受练习」
  const handleAcceptChallenge = () => {
    setShowDiscoveryBar(false)
    if (pendingTaskData) {
      setPhase('reshoot_task')
      setCurrentTask(pendingTaskData)
    }
    setPendingTaskData(null)
    setShowChallengeBar(false)
  }

  // 处理测评结束选择：「继续聊」
  const handleContinueChatFromAssessment = () => {
    setContinueChatting(true)
    setShowDiscoveryBar(false)
    setShowAssessmentBar(false)
  }

  // 处理测评结束选择：「生成报告」
  const handleFinishAssessment = () => {
    setIsAssessmentCompleted(true)
    setShowAssessmentBar(false)
  }

  // 继续本轮对话
  const handleResumeSession = useCallback(async () => {
    if (!sessionId || !session) return

    setThinking(true)
    setError(null)
    try {
      const nextRound = (session.currentRound || 1) + 1
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          current_round: nextRound,
          completed_at: null,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to resume session')
      }

      const welcomeContent = session.module === 'english'
        ? "Great! Let's continue our conversation. What else would you like to talk about today?"
        : "太棒了，我们继续对拍摄或对话内容进行更深度的探讨。你又有了哪些新想法吗？"

      // 插入一条系统/友情提示的消息到 Supabase 数据库以持久化
      const { data: dbMsg, error: dbMsgErr } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          message_type: 'question',
          content: welcomeContent,
          round_number: nextRound,
        })
        .select()
        .single()

      if (dbMsgErr) {
        throw dbMsgErr
      }

      // 更新本地 store 中的会话对象
      setSession({
        ...session,
        status: 'in_progress',
        currentRound: nextRound,
      })

      // 重新标记该会话为活跃会话
      localStorage.setItem(`learniny_active_session_id_${session.module}`, sessionId)
      localStorage.setItem(`learniny_active_session_theme_${session.module}`, session.theme || '')

      // 重置状态
      setPhase('first_round')
      setQuestionIndex(1)
      setContinueChatting(false)
      setIsAssessmentCompleted(false)

      // 添加到本地消息流
      addMessage({
        id: dbMsg.id,
        sessionId,
        role: 'assistant',
        messageType: 'question',
        content: welcomeContent,
        createdAt: dbMsg.created_at || new Date().toISOString(),
      })

    } catch (err: any) {
      setError(err.message || '继续对话失败，请重试')
    } finally {
      setThinking(false)
    }
  }, [sessionId, session, setSession, setPhase, addMessage, setThinking, setError, setContinueChatting, setIsAssessmentCompleted])

  const isAssessmentSession = session?.theme === 'English Level Placement Assessment'
  const isEnglishModule = session?.module === 'english'

  // 显示提示条：AI 回复达4条以上，且是正常对话状态（没有在测评/任务/完成状态）
  const currentRoundNum = session?.currentRound || 1
  const aiMsgCount = messages.filter(
    m => m.role === 'assistant' && (m.metadata?.roundNumber === currentRoundNum || !m.metadata?.roundNumber)
  ).length
  const showHintBar = (
    continueChatting ||
    (aiMsgCount >= 4 && isEnglishModule)
  ) &&
  !hintDismissed &&
  !isAssessmentCompleted &&
  phase !== 'reshoot_task' &&
  phase !== 'second_round' &&
  phase !== 'discovery' &&
  phase !== 'completed'

  // 显示发现栏：英语模式下 6+ 条 AI 回复自动弹出，或者用户点击"继续聊"后仍然保持可见
  const shouldShowDiscoveryBar = (
    isEnglishModule &&
    !isAssessmentSession &&
    aiMsgCount >= 6 &&
    !isAssessmentCompleted &&
    phase !== 'discovery' &&
    phase !== 'completed' &&
    !showChallengeBar &&
    !showAssessmentBar
  )

  // 当满足条件时自动显示发现栏
  // 如果用户选择了"再聊一会儿"，每3轮后再次提示
  useEffect(() => {
    if (shouldShowDiscoveryBar && !continueChatting) {
      setShowDiscoveryBar(true)
    }
    // 如果用户已选了继续聊，在 9/12/15 轮时再次弹出
    if (shouldShowDiscoveryBar && continueChatting && aiMsgCount >= 9 && aiMsgCount % 3 === 0) {
      setContinueChatting(false)
      setShowDiscoveryBar(true)
    }
  }, [shouldShowDiscoveryBar, continueChatting, aiMsgCount, setContinueChatting])

  if (isLoadingHistory) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-400">加载对话中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-58px)] md:h-[calc(100vh-74px)] max-w-2xl mx-auto w-full bg-white/90 dark:bg-zinc-950/90 md:border-x border-zinc-200/50 dark:border-zinc-900/50 md:shadow-xl md:shadow-zinc-500/5 md:rounded-t-2xl overflow-hidden mt-0 md:mt-4 relative backdrop-blur-xs">
      {/* 顶部会话模式与主题横幅 */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className={`text-base p-1.5 rounded-lg shrink-0 ${
            session?.module === 'english' ? 'bg-blue-100 dark:bg-blue-950/60' : 'bg-amber-100 dark:bg-amber-950/60'
          }`}>
            {session?.module === 'english' ? '🗣️' : (photos.length > 0 ? '📷' : '💬')}
          </span>
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none mb-1">
              {session?.module === 'english' ? '英语陪练模式' : (photos.length > 0 ? '摄影实操模式' : '场景话题探讨模式')}
            </span>
            <h2 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              主题: {session?.theme || '加载中...'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold tracking-wide shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {session?.module === 'english' ? '聊天中' : '陪伴中'}
        </div>
      </div>

      {/* 照片预览区 */}
      {photos.length > 0 && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className={`grid gap-3 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {photos.map((photo) => (
              <PhotoPreview
                key={photo.id}
                imageUrl={photo.imageUrl}
                order={photo.uploadOrder}
                label={photo.uploadOrder === 1 ? '第一张' : '再拍'}
              />
            ))}
          </div>
        </div>
      )}

      {/* 对话区 */}
      <div className="flex-1 min-h-0 relative bg-gradient-to-b from-zinc-50/20 to-transparent dark:from-zinc-900/5 dark:to-transparent">
        <div className="absolute inset-0">
          <MessageList messages={messages} isLoading={isThinking} />
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 font-semibold underline shrink-0">关闭</button>
        </div>
      )}

      {/* 底部操作区 */}
      {phase === 'reshoot_task' && currentTask ? (
        session?.module === 'english' ? (
          /* 英语任务：不需要上传照片，文本挑战 */
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/20 shrink-0">
            <Card className="!border-blue-200/60 !bg-blue-500/5 dark:!border-blue-900/40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✏️</span>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">练习挑战</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                {currentTask.instruction}
              </p>
            </Card>
            <div className="space-y-3">
              <AnswerInput
                onSubmit={handleSendMessage}
                isLoading={isThinking}
                placeholder="用英语写下你的回答..."
              />
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={handleSkipTask} className="flex-1 text-xs">
                  跳过，查看我的发现
                </Button>
                <Button variant="primary" size="sm" onClick={handleGenerateDiscovery} className="flex-1 text-xs bg-blue-600 hover:bg-blue-700">
                  生成我的发现
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* 摄影任务：上传照片 */
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/20 shrink-0">
          <Card className="!border-amber-200/60 !bg-amber-500/5 dark:!border-amber-900/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📷</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">拍摄任务</span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {currentTask.instruction}
            </p>
          </Card>

          <div className="space-y-3">
            <ImageUploader
              onUpload={handleReshootUpload}
              label="完成拍摄，上传照片"
            />
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={handleSkipTask} className="flex-1 text-xs">
                暂不拍摄，直接看发现
              </Button>
              <Button variant="primary" size="sm" onClick={handleGenerateDiscovery} className="flex-1 text-xs">
                生成我的发现
              </Button>
            </div>
          </div>
        </div>
        )
      ) : phase === 'second_round' ? (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/20 dark:bg-zinc-900/10 shrink-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <AnswerInput
                onSubmit={handleSendMessage}
                isLoading={isThinking}
                placeholder={session?.module === 'english' ? '说说你的发现...' : '说说你的发现...'}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleGenerateDiscovery} loading={isThinking} className="shrink-0 self-end h-10 mb-8 rounded-xl font-medium text-xs">
              生成发现
            </Button>
          </div>
        </div>
      ) : isAssessmentCompleted ? (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-6 text-center bg-zinc-50/20 dark:bg-zinc-900/10 space-y-3 shrink-0">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center gap-1.5">
            ✨ 测评对话已圆满结束，AI 测评官正在整理你的报告
          </div>
          <Button onClick={handleGenerateDiscovery} loading={isThinking} size="lg" className="w-full max-w-sm py-3 text-white font-bold hover:brightness-105 transition-all text-xs tracking-wider rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/10">
            📊 生成我的英语定级报告
          </Button>
        </div>
      ) : phase === 'discovery' || phase === 'completed' ? (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/20 dark:bg-zinc-900/10 shrink-0">
          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              onClick={() => router.push(`/discovery?session=${sessionId}`)}
              size="lg"
              variant="secondary"
              className="flex-1 text-xs font-semibold rounded-xl"
            >
              查看我的发现 🖼️
            </Button>
            <Button
              onClick={handleResumeSession}
              size="lg"
              loading={isThinking}
              className={`flex-1 text-white text-xs font-semibold rounded-xl hover:brightness-105 transition-all ${
                session?.module === 'english'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/10'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-md shadow-amber-500/10'
              }`}
            >
              继续这轮学习 💬
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50/10 dark:bg-zinc-900/5 shrink-0 flex flex-col">
          {/* 提示条：4轮后提示可生成发现（小而轻的提示） */}
          {showHintBar && !showDiscoveryBar && (
            <div
              className={`mx-3 mb-2 mt-1 rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ${
                isEnglishModule
                  ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40'
                  : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40'
              }`}
              style={{ animation: 'fadeIn 0.35s ease both' }}
            >
              <span className="text-base shrink-0">{isEnglishModule ? '💡' : '✨'}</span>
              <p className={`text-[11px] flex-1 leading-tight font-medium ${
                isEnglishModule ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {isEnglishModule
                  ? isAssessmentSession
                    ? '对话已进行多轮，随时可以生成你的定级报告'
                    : '对话已挺丰富了！随时可以结束并生成今日发现'
                  : '聊得不错！随时可以结束这次对话并查看你的发现'}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleGenerateDiscovery}
                  disabled={isThinking}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg text-white transition-all ${
                    isEnglishModule
                      ? 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                      : 'bg-amber-600 hover:bg-amber-500 active:scale-95'
                  } disabled:opacity-50`}
                >
                  {isEnglishModule && isAssessmentSession ? '生成报告' : '生成发现'}
                </button>
                <button
                  onClick={() => setHintDismissed(true)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5 rounded transition-colors"
                  title="关闭提示"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 2l8 8M10 2l-8 8"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* 发现栏：6轮以上英语对话后显示，大卡片引导结束对话 */}
          {showDiscoveryBar && (
            <div
              className="mx-3 mb-3 mt-1 rounded-2xl border-2 border-blue-400/40 dark:border-blue-700/40 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 p-4 shadow-lg shadow-blue-500/5"
              style={{ animation: 'fadeIn 0.4s ease both' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 leading-snug">
                    对话已相当丰富了！
                  </p>
                  <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 leading-relaxed mt-0.5">
                    你已经聊了 {aiMsgCount} 轮，是时候把这次对话沉淀为一份「今日发现」了
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    setShowDiscoveryBar(false)
                    setContinueChatting(true)
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-blue-300/60 dark:border-blue-700/60 bg-white/80 dark:bg-zinc-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all active:scale-[0.98]"
                >
                  💬 再聊一会儿
                </button>
                <button
                  onClick={handleGenerateDiscovery}
                  disabled={isThinking}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shadow-md shadow-blue-500/20 disabled:opacity-60"
                >
                  ✨ 生成今日发现
                </button>
              </div>
            </div>
          )}

          {/* 练习挑战提示栏：非阻塞式 */}
          {showChallengeBar && pendingTaskData && (
            <div
              className="mx-3 mb-3 mt-1 rounded-2xl border-2 border-amber-400/40 dark:border-amber-700/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-zinc-900/20 p-4 shadow-lg shadow-amber-500/5 animate-fade-in"
              style={{ animation: 'fadeIn 0.4s ease both' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300 leading-snug">
                    {session?.module === 'english' ? 'AI 给你提了一个小挑战！' : 'AI 建议你进行对比拍摄练习！'}
                  </p>
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 leading-relaxed mt-0.5">
                    你可以接受这个练习来深化你的直觉规律，也可以选择继续聊天或随时查看你的发现。
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleAcceptChallenge}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20"
                >
                  {session?.module === 'english' ? '📝 接受挑战' : '📷 接受并拍摄'}
                </button>
                <button
                  onClick={handleContinueChatFromChallenge}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-750 dark:text-zinc-350 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-all active:scale-[0.98]"
                >
                  💬 继续自由聊天
                </button>
                <button
                  onClick={() => {
                    setPendingTaskData(null)
                    setShowChallengeBar(false)
                    handleGenerateDiscovery()
                  }}
                  className="py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                >
                  直接看发现 🎉
                </button>
              </div>
            </div>
          )}

          {/* 测评结束提示栏：非阻塞式 */}
          {showAssessmentBar && (
            <div
              className="mx-3 mb-3 mt-1 rounded-2xl border-2 border-blue-400/40 dark:border-blue-700/40 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-zinc-900/20 p-4 shadow-lg shadow-blue-500/5 animate-fade-in"
              style={{ animation: 'fadeIn 0.4s ease both' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 leading-snug">
                    {isAssessmentSession ? '测评对话已完成！' : 'AI 认为你已经聊了很多了！'}
                  </p>
                  <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 leading-relaxed mt-0.5">
                    {isAssessmentSession
                      ? 'AI 已收集足够信息来为你分析英语水平，你也可以选择继续聊聊或现在查看报告。'
                      : '你可以选择继续自由聊天，也可以随时生成你的今日发现。'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={isAssessmentSession ? handleFinishAssessment : () => { setShowAssessmentBar(false); handleGenerateDiscovery() }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.98] shadow-md shadow-blue-500/20"
                >
                  {isAssessmentSession ? '📊 立即生成定级报告' : '🎉 生成今日发现'}
                </button>
                <button
                  onClick={handleContinueChatFromAssessment}
                  className="flex-1 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all active:scale-[0.98]"
                >
                  💬 再聊一会儿
                </button>
              </div>
            </div>
          )}
          <AnswerInput
            onSubmit={handleSendMessage}
            isLoading={isThinking}
            placeholder={
              session?.module === 'english'
                ? (messages.length === 0 ? '用英语输入你想聊的内容...' : '继续用英语聊下去...')
                : (messages.length === 0 ? '描述一下你的摄影疑问或想法...' : '继续你的想法...')
            }
          />
        </div>
      )}
    </div>
  )
}

