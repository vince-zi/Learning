'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lightbulb, Languages, Sparkles, MessageSquare } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';

const ERROR_HINT_MAP: Record<string, { short: string; tip: string }> = {
  'grammar-tense':       { short: '时态', tip: '注意一下时间词：说昨天发生的事，动词要用过去式哦！' },
  'grammar-article':     { short: '冠词', tip: '在单数名词前记得加 a / an / the，比如 an apple，a car。' },
  'grammar-preposition': { short: '介词搭配', tip: '有些动词后面固定跟某个介词，比如 interested in 不是 interested about。' },
  'grammar-word-order':  { short: '语序', tip: '英语语序和中文不一样，疑问句需要把助动词提前，比如 Do you like...？' },
  'grammar-agreement':   { short: '主谓一致', tip: '主语是第三人称单数时，动词要加 s，比如 She likes，不是 She like。' },
  'vocabulary-choice':   { short: '词汇搭配', tip: '这个场景换个词会更地道，可以点下面的翻译看看 AI 是怎么说的。' },
  'expression-chinglish':{ short: '中式英语', tip: '这句话直译中文了，英语母语者通常会换种方式说，参考 AI 的回复学一学！' },
  'expression-incomplete':{ short: '句子不完整', tip: '这句话缺少主语或动词，补上会更清楚。' },
};

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
}

function MessageBubble({ 
  msg, 
  expandedDiffId, 
  onToggleDiff 
}: { 
  msg: ExtendedMessage; 
  expandedDiffId: string | null; 
  onToggleDiff: () => void;
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
        {/* removed MetaHint — analysis moved to yellow-dot DiffCard only */}

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
  const { messages, addMessage, isThinking, setThinking } = useSessionStore();
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [input, setInput] = useState('');
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const lastUserMsgIdRef = useRef<string | null>(null);
  const [msgExtras, setMsgExtras] = useState<Record<string, { _errorType?: string; _correctedText?: string }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Retrieve last session ID from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('learniny_last_session_id');
    if (saved) {
      setLastSessionId(saved);
    }
  }, []);

  // Fetch messages if a session is loaded
  const loadSessionMessages = (sessId: string) => {
    setIsInitializing(true);
    fetch(`/api/sessions/${sessId}/messages`)
      .then(res => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then(data => {
        if (data.session === null) {
          // Invalid session, clear saved ID
          localStorage.removeItem('learniny_last_session_id');
          setLastSessionId(null);
          return;
        }
        setActiveSessionId(sessId);
        if (data.messages && data.messages.length > 0) {
          useSessionStore.getState().setMessages(data.messages);
        } else {
          useSessionStore.getState().setMessages([]);
        }
      })
      .catch(err => {
        console.error(err);
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
      body: JSON.stringify({ userId: 'mock_user', module: 'english', theme: 'Free Conversation' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          const sessId = data.session.id;
          setActiveSessionId(sessId);
          localStorage.setItem('learniny_last_session_id', sessId);
          setLastSessionId(sessId);
          useSessionStore.getState().setMessages([]);
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
    if (!input.trim() || !activeSessionId) return;

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          userId: 'mock_user',
          userMessage: userText,
          module: 'english',
          roundNumber: messages.filter(m => m.role === 'user').length + 1,
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      if (data.message) {
        const aiMsgId = data.message.id || `ai_${Date.now()}`;

        if (data.detectedError) {
          const det = data.detectedError;
          setMsgExtras(prev => ({
            ...prev,
            [lastUserMsgIdRef.current!]: {
              _errorType: det.errorType,
              _correctedText: det.correctedText || undefined,
            },
            [aiMsgId]: {
              _errorType: det.errorType,
            },
          }));
        } else if (lastUserMsgIdRef.current) {
          // No error detected — mark user message as correct
          setMsgExtras(prev => ({
            ...prev,
            [lastUserMsgIdRef.current!]: {
              _errorType: '',
            },
          }));
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

  return (
    <div className="w-full h-full flex flex-col pt-24 pb-0 items-center justify-center pointer-events-auto">
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
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button 
                onClick={handleStartNewSession}
                disabled={isInitializing}
                className="flex-1 px-6 py-3.5 bg-brand-accent text-[#000000] text-xs font-bold tracking-widest uppercase hover:scale-105 transition-transform rounded-full shadow-[0_0_20px_rgba(0,255,157,0.2)] disabled:opacity-55 cursor-pointer"
              >
                {isInitializing ? '启动中...' : '开启新对话'}
              </button>
              {lastSessionId && (
                <button 
                  onClick={handleResumeLastSession}
                  disabled={isInitializing}
                  className="flex-1 px-6 py-3.5 bg-surface-card border border-divider hover:border-text-secondary text-text-primary text-xs font-bold tracking-widest uppercase hover:scale-105 transition-transform rounded-full disabled:opacity-55 cursor-pointer"
                >
                  {isInitializing ? '载入中...' : '继续上次对话'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal Chat Interface */
          <>
            {/* Fixed Top Bar — always visible */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 md:px-8 py-3 bg-gradient-to-b from-app-bg via-app-bg/95 to-transparent">
              <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase">ZPD Session Active</span>
              <button
                onClick={async () => {
                  if (activeSessionId) {
                    try { await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: activeSessionId }) }) } catch {}
                    localStorage.removeItem('learniny_last_session_id');
                    setLastSessionId(null);
                  }
                  setActiveSessionId(null);
                }}
                className="text-[9px] text-brand-error/70 hover:text-brand-error tracking-wider uppercase font-mono transition-colors cursor-pointer"
              >
                结束对话
              </button>
            </div>

            {/* Chat Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-8 space-y-6 flex flex-col pb-24 pt-12 scrollbar-none">

              {messages.length === 0 && !isThinking && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <p className="text-sm text-text-secondary/50 tracking-wider">对话已就绪，请输入你的第一句话...</p>
                </div>
              )}

              {extendedMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  expandedDiffId={expandedDiffId}
                  onToggleDiff={() => setExpandedDiffId(expandedDiffId === msg.id ? null : msg.id)}
                />
              ))}

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
