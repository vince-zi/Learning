'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lightbulb, Languages, Sparkles, MessageSquare, CheckCircle2, Info } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { getUserId, setUserId } from '@/lib/user-id';

const ERROR_HINT_MAP: Record<string, { short: string; tip: string }> = {
  'grammar-tense':       { short: '时态', tip: '什么时候发生的事，动词就要穿什么衣服。昨天的事 → 过去式(went/did)；正在发生 → 进行时(going)；平时常做的事 → 现在式(go)。' },
  'grammar-article':     { short: '冠词', tip: 'a/an 是"随便一个"，the 是"你我都知道的那个"。第一次提到用 a，再说时用 the。元音开头的词前面 an 更顺口，比如 an apple。' },
  'grammar-preposition': { short: '介词搭配', tip: '介词是动词的"小尾巴"，不同动词配不同的尾巴。interested in、listen to、arrive at——这些小尾巴没有为什么，记就是了。' },
  'grammar-word-order':  { short: '语序', tip: '疑问句要把帮助词（do/can/will）放到主语前面。Do you like... ? Can you... ? Will it... ? 就像中文里的"吗"，不过英语是放到前面。' },
  'grammar-agreement':   { short: '主谓一致', tip: '英语动词看主人。主人是 he/she/it（第三人称单数）→ 动词加 s：She likes。主人是 I/you/we/they → 不加 s：They like。' },
  'vocabulary-choice':   { short: '词汇搭配', tip: '同一个意思，不同场景用不同的词。多留意 AI 用什么词替换了你用的词，记多了自然就有语感。' },
  'expression-chinglish':{ short: '中文直译', tip: '中文和英语的"说话习惯"不一样。不是每个字翻译过去就是对的。试试记住整句的表达方式，而不是拆开翻译。' },
  'expression-incomplete':{ short: '句子要完整', tip: '英语句子必须有主语 + 动词。比如不能说 "Very good"（缺主语和动词），要说 "It is very good"。' },
};

const UNDERSTOOD_HINTS_KEY = 'learniny_understood_hints';

function getUnderstoodHints(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNDERSTOOD_HINTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markHintUnderstood(errorType: string): Set<string> {
  const current = getUnderstoodHints();
  current.add(errorType);
  localStorage.setItem(UNDERSTOOD_HINTS_KEY, JSON.stringify([...current]));
  return current;
}

function DiffCard({ original, corrected, errorType }: { original: string, corrected: string, errorType?: string }) {
  const hint = errorType ? ERROR_HINT_MAP[errorType] : null;
  return (
    <div className="mt-3 w-full clip-sheet bg-surface-card border border-divider shadow-2xl relative p-5">
      {hint && (
        <div className="mb-3 text-[11px] text-brand-hint/80 flex items-start gap-1.5 font-mono">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{hint.tip}</span>
        </div>
      )}
      <div className="mb-3">
        <span className="text-text-secondary block mb-1 text-[10px] uppercase tracking-wider font-mono">您的原句</span>
        <span className="text-brand-error line-through decoration-brand-error/50 text-sm">{original}</span>
      </div>
      
      <div className="flex items-center gap-2 text-divider py-1.5">
        <div className="h-px w-8 bg-divider" />
        <Sparkles className="w-3 h-3 text-brand-accent" />
        <div className="h-px flex-1 bg-divider" />
      </div>

      <div>
        <span className="text-text-secondary block mb-1 text-[10px] uppercase tracking-wider font-mono">建议表达</span>
        <span className="text-brand-accent text-sm font-medium drop-shadow-[0_0_8px_rgba(0,255,157,0.3)]">{corrected}</span>
      </div>
    </div>
  );
}

/** Inline hint — matches prototype badge style. Uses AI-generated hint text when available. */
function SyntaxHint({ errorType, hintText }: { errorType: string; hintText?: string }) {
  const hint = ERROR_HINT_MAP[errorType];
  const [dismissed, setDismissed] = useState(() => getUnderstoodHints().has(errorType));

  if (dismissed) return null;

  const text = hintText || hint?.tip;
  if (!text) return null;

  const handleUnderstand = () => {
    markHintUnderstood(errorType);
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 mb-1.5 pl-1"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md w-fit text-[10px] font-mono tracking-wider"
          style={{ background: '#00B2FF15', border: '1px solid #00B2FF38', color: '#00B2FF' }}
        >
          <Info size={12} strokeWidth={2.5} />
          <span>小提示 · {hint?.short || '语法'}</span>
        </div>
        <button
          onClick={handleUnderstand}
          className="flex items-center gap-1 text-[10px] font-mono tracking-wider transition-colors cursor-pointer"
          style={{ color: '#00B2FF', background: 'transparent', border: 'none' }}
        >
          <CheckCircle2 size={12} strokeWidth={2} />
          懂了
        </button>
      </div>
      <p className="text-[12.5px] leading-relaxed pl-0.5" style={{ color: '#8A93A6' }}>
        {text}
      </p>
    </motion.div>
  );
}

interface ExtendedMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  messageType: 'question' | 'answer' | 'summary' | 'task';
  content: string;
  createdAt: string;
  metadata?: { questionType?: string; roundNumber?: number; discoveryRef?: string; taskRef?: string };
  _errorType?: string;
  _correctedText?: string;
  _hintText?: string;
}

function MessageBubble({ 
  msg, 
  expandedDiffId, 
  onToggleDiff,
  isFirstUserMsg
}: { 
  msg: ExtendedMessage; 
  expandedDiffId: string | null; 
  onToggleDiff: () => void;
  isFirstUserMsg: boolean;
}) {
  const isUser = msg.role === 'user';
  const hasEnglish = /[a-zA-Z]{3,}/.test(msg.content);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const hasExtra = '_errorType' in msg;
  const isCorrect = isUser && hasExtra && !msg._errorType;
  const hasError = isUser && hasExtra && !!msg._errorType;
  const showAnalysis = (hasError || isCorrect) && expandedDiffId === msg.id;

  const handleTranslate = async () => {
    if (translatedText) { setTranslatedText(null); return; }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content }),
      });
      const data = await res.json();
      if (data.success && data.translation) setTranslatedText(data.translation);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col w-full mb-6 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
        {/* Syntax hint above AI bubble */}
        {!isUser && msg._errorType && (
          <SyntaxHint errorType={msg._errorType} hintText={msg._hintText} />
        )}

        <div
          className={`relative px-5 py-3.5 text-[15px] leading-relaxed break-words shadow-sm
            ${isUser
              ? `bg-surface-user text-text-on-user rounded-[24px] rounded-br-[8px]`
              : 'bg-surface-ai border border-divider text-text-primary rounded-[24px] rounded-bl-[8px]'
            }`}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>

          {isUser && (
            <button
              onClick={onToggleDiff}
              className="absolute -right-[5px] -bottom-[5px] w-[9px] h-[9px] rounded-full shadow-[0_0_8px_rgba(201,161,93,0.4)] border-2 border-app-bg hover:scale-125 transition-transform cursor-pointer z-10"
              style={{ background: '#C9A15D' }}
            />
          )}

          {!isUser && hasEnglish && (
            <div className="mt-3 pt-2 border-t border-divider flex justify-end items-center select-none">
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <Languages className="w-3.5 h-3.5" />
                {isTranslating ? '翻译中...' : translatedText ? '收起翻译' : '翻译'}
              </button>
            </div>
          )}

          <AnimatePresence>
            {translatedText && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 text-[13px] text-text-secondary leading-relaxed border-t border-divider pt-3">
                  <p className="whitespace-pre-wrap">{translatedText}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {hasError && !showAnalysis && isFirstUserMsg && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#C9A15D] font-medium"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#C9A15D] animate-pulse" />
              <span>💡 尝试点击右下角“小黄点”查看地道改写建议</span>
            </motion.div>
          )}

          {showAnalysis && hasError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden w-full"
            >
              <div className="mt-2 bg-brand-error/10 border border-brand-error/30 rounded-xl p-3">
                <p className="text-sm text-brand-error line-through decoration-brand-error/60 whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg._correctedText && (
                  <>
                    <div className="h-px bg-brand-error/20 my-2" />
                    <p className="text-sm text-brand-accent font-medium whitespace-pre-wrap">
                      {msg._correctedText}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
          {showAnalysis && !hasError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden w-full"
            >
              <div className="mt-2 bg-brand-accent/10 border border-brand-accent/30 rounded-xl p-3">
                <p className="text-sm text-brand-accent whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function PracticeSection() {
  const { messages, addMessage, isThinking, setThinking, session, setSession, summaryData, setSummaryData } = useSessionStore();
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [input, setInput] = useState('');
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const lastUserMsgIdRef = useRef<string | null>(null);
  const [msgExtras, setMsgExtras] = useState<Record<string, { _errorType?: string; _correctedText?: string; _hintText?: string }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('learniny_last_session_id');
    // Auto-clean old mock_user data
    if (localStorage.getItem('learniny_user_id') === 'mock_user') {
      localStorage.removeItem('learniny_user_id');
    }
    if (saved) {
      setLastSessionId(saved);
      loadSessionMessages(saved);
    }
  }, []);

  // Fetch messages if a session is loaded
  const loadSessionMessages = (sessId: string) => {
    setIsInitializing(true);
    // 8s timeout — don't hang forever on stale sessions
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(`/api/sessions/${sessId}/messages`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then(data => {
        clearTimeout(timeout);
        if (data.session === null) {
          // Invalid session, clear saved IDs
          localStorage.removeItem('learniny_last_session_id');
          setLastSessionId(null);
          return;
        }
        setActiveSessionId(sessId);
        if (data.session) {
          setSession(data.session);
        }
        if (data.messages && data.messages.length > 0) {
          useSessionStore.getState().setMessages(data.messages);
        } else {
          useSessionStore.getState().setMessages([]);
        }
      })
      .catch(err => {
        clearTimeout(timeout);
        console.error('Session load failed:', err.message);
        localStorage.removeItem('learniny_last_session_id');
        setLastSessionId(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  };

  const handleStartNewSession = () => {
    setIsInitializing(true);
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'english', theme: 'Free Conversation' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          const sessId = data.session.id;
          setActiveSessionId(sessId);
          setSession(data.session);
          useSessionStore.getState().setMessages([]);
          // Save backend-generated userId for subsequent requests
          if (data.session.userId && data.session.userId !== 'mock_user') {
            setUserId(data.session.userId);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsInitializing(false));
  };

  const handleResumeLastSession = () => {
    if (lastSessionId) {
      loadSessionMessages(lastSessionId);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [messages, isThinking]);

  useEffect(() => {
    if (expandedDiffId) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [expandedDiffId]);
  
  // Trigger greeting automatically when starting a new session or loading an empty session
  useEffect(() => {
    if (activeSessionId && messages.length === 0 && !isThinking && !isInitializing) {
      let active = true;
      const sendInitSignal = async () => {
        setThinking(true);
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSessionId,
              userId: getUserId() || undefined,
              userMessage: '[INIT_FREE_CONVERSATION]',
              module: 'english',
              roundNumber: 1,
            }),
          });
          if (!res.ok) throw new Error('Init API request failed');
          const data = await res.json();
          if (active && data.success && data.message) {
            addMessage({
              id: `assistant_init_${Date.now()}`,
              sessionId: activeSessionId,
              role: 'assistant',
              messageType: 'question',
              content: data.message.content,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('Failed to send init signal:', err);
        } finally {
          setThinking(false);  // always reset — addMessage may trigger cleanup
        }
      };
      sendInitSignal();
      return () => {
        active = false;
      };
    }
  }, [activeSessionId, messages.length, isInitializing]);

  const handleInputFocus = () => {
    for (const delay of [100, 250, 450]) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, delay);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useSessionStore.getState().isThinking || !input.trim() || !activeSessionId) return;

    // Save session ID to localStorage ONLY when user actually sends a message!
    if (localStorage.getItem('learniny_last_session_id') !== activeSessionId) {
      localStorage.setItem('learniny_last_session_id', activeSessionId);
      setUserId(getUserId() || '');  // ensure userId is persisted for session lifecycle
      setLastSessionId(activeSessionId);
    }

    const userText = input;
    const userMsgId = `user_${Date.now()}`;
    setInput('');
    setThinking(true);

    lastUserMsgIdRef.current = userMsgId;

    addMessage({
      id: userMsgId,
      sessionId: activeSessionId,
      role: 'user' as const,
      messageType: 'answer' as const,
      content: userText,
      createdAt: new Date().toISOString(),
    });

    try {
      // Run analyze + chat in parallel — analyze returns <1s for instant yellow dot
      const [analyzeRes, chatRes] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: userText }),
        }),
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            userId: getUserId() || undefined,
            userMessage: userText,
            module: 'english',
            roundNumber: messages.filter(m => m.role === 'user').length + 1,
          }),
        }),
      ]);

      if (!chatRes.ok) throw new Error('API request failed');

      // Fast analysis result — show yellow dot immediately
      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        if (analyzeData.corrected && analyzeData.correctedText) {
          setMsgExtras(prev => ({
            ...prev,
            [userMsgId]: {
              _errorType: 'grammar-check',
              _correctedText: analyzeData.correctedText,
            },
          }));
        } else {
          setMsgExtras(prev => ({
            ...prev,
            [userMsgId]: { _errorType: '' },
          }));
        }
      }

      const data = await chatRes.json();

      if (data.message) {
        const aiMsgId = data.message.id || `ai_${Date.now()}`;

        if (data.detectedError) {
          const det = data.detectedError;
          setMsgExtras(prev => ({
            ...prev,
            [lastUserMsgIdRef.current!]: {
              ...(prev[lastUserMsgIdRef.current!] || {}),
              _errorType: det.errorType,
              _correctedText: det.correctedText || prev[lastUserMsgIdRef.current!]?._correctedText || undefined,
            },
            [aiMsgId]: {
              _errorType: det.errorType,
              _hintText: det.hintText || undefined,
            },
          }));
        } else if (lastUserMsgIdRef.current) {
          // Ensure correct messages still get their green state
          setMsgExtras(prev => {
            if (prev[lastUserMsgIdRef.current!]) return prev; // analyze already set it
            return { ...prev, [lastUserMsgIdRef.current!]: { _errorType: '' } };
          });
        }

        if (data.currentKnowledgeNodeId && session) {
          setSession({ ...session, currentKnowledgeNodeId: data.currentKnowledgeNodeId });
        }

        addMessage({
          id: aiMsgId,
          sessionId: activeSessionId,
          role: 'assistant' as const,
          messageType: data.message.type as "question" | "answer" | "summary" | "task",
          content: data.message.content,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setThinking(false);
    }
  };

  const extendedMessages: ExtendedMessage[] = messages.map(msg => ({
    ...msg,
    ...(msgExtras[msg.id] || {}),
  }));

  const handleEndSession = async () => {
    if (!activeSessionId || isEndingSession) return;
    setIsEndingSession(true);

    // 10 seconds safety timeout to force local reset if backend hangs
    const safetyTimeout = setTimeout(() => {
      console.warn('Ending session timed out. Forcing local state reset.');
      localStorage.removeItem('learniny_last_session_id');
      setLastSessionId(null);
      setActiveSessionId(null);
      setSession(null);
      setIsEndingSession(false);
    }, 10000);

    try {
      const userId = getUserId() || undefined;
      // 1. 调用 POST /api/discoveries 自动抽提学习发现与评估，点亮星图
      const res = await fetch('/api/discoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          userId,
          knowledgeNodeId: session?.currentKnowledgeNodeId || 'self-intro',
          module: 'english',
        }),
      });

      let discoveryData = null;
      if (res.ok) {
        discoveryData = await res.json();
      }

      // 2. 调用 PATCH /api/sessions 归档会话
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });

      clearTimeout(safetyTimeout);

      // 无论成功还是失败，都立即清理本地对话会话状态，并切回首页
      localStorage.removeItem('learniny_last_session_id');
      setLastSessionId(null);
      setActiveSessionId(null);
      setSession(null);
      useSessionStore.getState().setActiveSection('home');

      if (discoveryData && discoveryData.success) {
        setSummaryData(discoveryData.discovery);
      } else if (discoveryData && discoveryData.tooShort) {
        setSummaryData({
          title: '本轮对话过短',
          summary: '你刚才的对话较短，系统无法评估出实质性的语法点。建议下次与 AI 多进行几轮英语交流，帮助我们更好地为你总结并点亮星图哦～',
          isNotice: true
        });
      }
    } catch (err) {
      console.error('Error during ending session:', err);
      clearTimeout(safetyTimeout);
      localStorage.removeItem('learniny_last_session_id');
      setLastSessionId(null);
      setActiveSessionId(null);
      setSession(null);
      useSessionStore.getState().setActiveSection('home');
    } finally {
      setIsEndingSession(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-12 pb-0 items-center justify-center pointer-events-auto">
      <div className="max-w-2xl w-full h-full flex flex-col relative overflow-hidden">

        
        {/* Welcome State / Setup session */}
        {!activeSessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-12 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center mb-6 animate-pulse">
              <MessageSquare className="w-8 h-8 text-brand-accent drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
            </div>
            <h2 className="text-2xl font-display text-text-primary tracking-wide mb-3 uppercase">启发式对话学习</h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-8">
              不提供直接的答案，而是在自然对话中通过启发式提问，引导你自我发现英语的句法规律与表达直觉。
            </p>
            <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
              <button 
                onClick={handleStartNewSession}
                disabled={isInitializing}
                className="w-full px-6 py-3.5 bg-brand-accent text-[#000000] text-xs font-bold tracking-widest uppercase hover:scale-105 transition-transform rounded-full shadow-[0_0_20px_rgba(0,255,157,0.2)] disabled:opacity-55 cursor-pointer text-center"
              >
                {isInitializing ? '启动中...' : '开启新对话'}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Chat Interface */
          <>
            {/* Fixed Top Bar — always visible */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 md:px-8 py-3 bg-gradient-to-b from-app-bg via-app-bg/95 to-transparent">
              <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">ZPD Session Active</span>
              <button
                onClick={handleEndSession}
                disabled={isEndingSession}
                className="px-3.5 py-1.5 bg-brand-error/5 hover:bg-brand-error/15 border border-brand-error/25 hover:border-brand-error/50 rounded-full text-[10px] font-bold text-brand-error tracking-wider uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(255,75,75,0.05)] animate-pulse"
              >
                {isEndingSession ? '结算中...' : '结束对话'}
              </button>
            </div>

            {/* Chat Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-8 space-y-6 flex flex-col pb-24 pt-12 scrollbar-none">

              {messages.length === 0 && !isThinking && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <p className="text-sm text-text-secondary/50 tracking-wider">对话已就绪，请输入你的第一句话...</p>
                </div>
              )}

              {extendedMessages.map((msg) => {
                const userMsgs = extendedMessages.filter(m => m.role === 'user')
                const isFirstUserMsg = userMsgs.length > 0 && userMsgs[0].id === msg.id
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    expandedDiffId={expandedDiffId}
                    onToggleDiff={() => setExpandedDiffId(expandedDiffId === msg.id ? null : msg.id)}
                    isFirstUserMsg={isFirstUserMsg}
                  />
                )
              })}

              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-surface-ai border border-divider rounded-[24px] rounded-bl-[8px] px-4 py-4 flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              <div className="h-8 shrink-0" />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-app-bg via-app-bg to-transparent">
              <form onSubmit={handleSend} autoComplete="off" className="relative flex items-center max-w-2xl mx-auto">
                {/* Hidden fake input to confuse browser autofill */}
                <input type="text" className="hidden" aria-hidden tabIndex={-1} autoComplete="off" readOnly />
                <input
                  type="search"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onFocus={handleInputFocus}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  name="x9kq7z"
                  placeholder="Type or speak (try 'I have went')..."
                  className="w-full bg-surface-card border border-divider rounded-full py-4 pl-5 pr-14 text-[15px] focus:outline-none focus:border-text-secondary transition-colors placeholder:text-text-secondary font-normal text-text-primary shadow-lg [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isThinking}
                  className="absolute right-2 p-2.5 bg-brand-accent hover:bg-brand-accent/90 rounded-full text-[#000000] transition-colors disabled:opacity-50 disabled:hover:bg-brand-accent cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}

      </div>


    </div>
  );
}
