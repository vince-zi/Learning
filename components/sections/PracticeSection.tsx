'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lightbulb, Languages, Sparkles, MessageSquare, CheckCircle2, Info, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
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
  isFirstUserMsg,
  onPlayAudio,
  playingId,
  playingLoadingId
}: { 
  msg: ExtendedMessage; 
  expandedDiffId: string | null; 
  onToggleDiff: () => void;
  isFirstUserMsg: boolean;
  onPlayAudio?: (id: string, text: string) => void;
  playingId?: string | null;
  playingLoadingId?: string | null;
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
            <div className="mt-3 pt-2 border-t border-divider flex justify-end items-center gap-4 select-none">
              <button
                onClick={() => onPlayAudio?.(msg.id, msg.content)}
                disabled={playingLoadingId === msg.id}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {playingLoadingId === msg.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : playingId === msg.id ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {playingLoadingId === msg.id ? '生成中...' : playingId === msg.id ? '暂停' : '朗读'}
              </button>

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
  
  const [langPref, setLangPref] = useState<'chinese' | 'balanced' | 'english'>(() => {
    if (typeof window === 'undefined') return 'balanced';
    return (localStorage.getItem('learniny_lang_pref') as 'chinese' | 'balanced' | 'english') || 'balanced';
  });
  const [langSwitchToast, setLangSwitchToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LANG_PREF_LABELS: Record<'chinese' | 'balanced' | 'english', { label: string; desc: string }> = {
    chinese:  { label: '🇨🇳 中文解释', desc: '英文对话，语法提示用中文' },
    balanced: { label: '⚖️ 双语平衡', desc: '英文对话，提示用中文' },
    english:  { label: '🇬🇧 纯英沉浸', desc: '全程零中文，AI 只说英文' },
  };

  const handleLangPrefChange = (pref: 'chinese' | 'balanced' | 'english') => {
    if (pref === langPref) return;
    setLangPref(pref);
    localStorage.setItem('learniny_lang_pref', pref);
    // Show toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setLangSwitchToast(pref);
    toastTimeoutRef.current = setTimeout(() => setLangSwitchToast(null), 2800);
  };

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const [input, setInput] = useState('');

  // 语音播放 (TTS) 状态
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingLoadingId, setPlayingLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [asrError, setAsrError] = useState<string | null>(null);

  // 语音录音 (ASR) 状态 (使用浏览器原生 Web Speech API)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 卸载组件时停止播放 & 页面加载时预热加载浏览器原生音色库 (修复 Chrome/Safari 获取声音列表为空的问题)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayAudio = (id: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    // 1. 如果正在播当前这个，点击则停止
    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    // 2. 如果正在播放其他语音，先停止它
    window.speechSynthesis.cancel();
    setPlayingId(null);

    setPlayingLoadingId(id);

    // 清理文本：只朗读英文内容，过滤系统生成的标记和中文提示（如括号翻译）
    const cleanedText = text
      .replace(/\[CORRECTED:[\s\S]*?\]/g, '')
      .replace(/\[HINT:[\s\S]*?\]/g, '')
      .replace(/\[SCENARIO:[\s\S]*?\]/g, '')
      .replace(/\[MEMORY:[\s\S]*?\]/g, '')
      .replace(/[\u4e00-\u9fa5（）()]/g, '') // 移除非英文括号和中文
      .trim();

    if (!cleanedText) {
      setPlayingLoadingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US'; // 设为美式英语

    // 尝试寻找高质量的英文发音人
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (
      v.name.includes('Google') || 
      v.name.includes('Natural') || 
      v.name.includes('Microsoft') || 
      v.name.includes('Samantha')
    ));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setPlayingLoadingId(null);
      setPlayingId(id);
    };

    utterance.onend = () => {
      setPlayingId(null);
    };

    utterance.onerror = (e) => {
      console.error('[SpeechSynthesis Error]', e);
      setPlayingLoadingId(null);
      setPlayingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // 初始化浏览器原生语音识别引擎 (支持 Chrome/Safari/Edge 等主流移动和 PC 浏览器)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recog = new SpeechRecognitionClass();
        recog.continuous = false; // 短句模式，说完即停
        recog.interimResults = false; // 仅返回最终识别的文本
        recog.lang = 'en-US'; // 设为英语识别

        recog.onstart = () => {
          setIsRecording(true);
          setAsrError(null);
        };

        recog.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          if (resultText && resultText.trim()) {
            setInput(prev => {
              const base = prev.trim();
              return base ? `${base} ${resultText.trim()}` : resultText.trim();
            });
            setTimeout(() => {
              const el = document.getElementById('chat-textarea') as HTMLTextAreaElement;
              if (el) {
                el.focus();
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
            }, 50);
          } else {
            setAsrError('未检测到您说话的内容，请再试一次');
          }
        };

        recog.onerror = (event: any) => {
          console.error('[SpeechRecognition Error]', event);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            setAsrError('麦克风访问被拒绝。请在浏览器地址栏左侧允许该网站使用麦克风。');
          } else if (event.error === 'no-speech') {
            setAsrError('未听到声音，请大声说话并重试。');
          } else if (event.error === 'audio-capture') {
            setAsrError('未检测到录音硬件设备，请检查麦克风连接。');
          } else {
            setAsrError(`语音识别发生错误: ${event.error}`);
          }
        };

        recog.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      setAsrError('您的浏览器不支持原生语音识别，建议使用 Chrome、Safari 或 Edge 浏览器。');
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    } else {
      setAsrError(null);
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.error('[Start Recognition Error]', err);
        try {
          recognitionRef.current.stop();
        } catch {}
        setIsRecording(false);
      }
    }
  };

  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const lastUserMsgIdRef = useRef<string | null>(null);
  const [msgExtras, setMsgExtras] = useState<Record<string, { _errorType?: string; _correctedText?: string; _hintText?: string }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  useEffect(() => {
    // Auto-clean old mock_user data
    if (localStorage.getItem('learniny_user_id') === 'mock_user') {
      localStorage.removeItem('learniny_user_id');
    }
    // Show saved session as "继续上次对话" option, but don't auto-load
    const saved = localStorage.getItem('learniny_last_session_id');
    if (saved) {
      setLastSessionId(saved);
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
        useSessionStore.getState().setActiveChatSessionId(sessId);
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
      body: JSON.stringify({
        module: 'english',
        theme: 'Free Conversation',
        userId: getUserId() || undefined,  // 传入已登录用户的真实 ID
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          const sessId = data.session.id;
          setActiveSessionId(sessId);
          useSessionStore.getState().setActiveChatSessionId(sessId);
          setSession(data.session);
          useSessionStore.getState().setMessages([]);
          // 只有当 localStorage 里没有真实用户 ID 时，才用后端返回的 userId
          // 避免把已登录用户的 user_* ID 被 anon_* 覆盖
          const existingId = getUserId();
          if ((!existingId || existingId.startsWith('anon_')) &&
              data.session.userId && data.session.userId !== 'mock_user') {
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
              explanationPreference: langPref,
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
      // In pure English immersion mode, skip frontend analysis UI entirely
      const isImmersionMode = langPref === 'english';

      // Run analyze + chat in parallel — analyze returns <1s for instant yellow dot
      // (skipped in English immersion mode to keep interface fully immersive)
      const parallelRequests: [Promise<Response>, Promise<Response>] = isImmersionMode
        ? [Promise.resolve(new Response(null, { status: 204 })), fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSessionId,
              userId: getUserId() || undefined,
              userMessage: userText,
              module: 'english',
              roundNumber: messages.filter(m => m.role === 'user').length + 1,
              explanationPreference: langPref,
            }),
          })]
        : [fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: userText }),
          }), fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSessionId,
              userId: getUserId() || undefined,
              userMessage: userText,
              module: 'english',
              roundNumber: messages.filter(m => m.role === 'user').length + 1,
              explanationPreference: langPref,
            }),
          })];

      const [analyzeRes, chatRes] = await Promise.all(parallelRequests);

      if (!chatRes.ok) throw new Error('API request failed');

      // Fast analysis result — show yellow dot immediately (skipped in immersion mode)
      if (!isImmersionMode && analyzeRes.ok && analyzeRes.status !== 204) {
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

        if (!isImmersionMode && data.detectedError) {
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
        } else if (!isImmersionMode && lastUserMsgIdRef.current) {
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

    const sessionIdToProcess = activeSessionId;
    const nodeToProcess = session?.currentKnowledgeNodeId || 'self-intro';

    // 1. 立即跳转到首页，并开启后台加载 Modal
    setSummaryData({ isLoading: true });
    
    localStorage.removeItem('learniny_last_session_id');
    setLastSessionId(null);
    setActiveSessionId(null);
    useSessionStore.getState().setActiveChatSessionId(null);
    setSession(null);
    useSessionStore.getState().setActiveSection('home');
    setIsEndingSession(false);

    // 2. 在后台异步执行结算 API 调用
    try {
      const userId = getUserId() || undefined;
      // 2.1 抽提今日发现
      const res = await fetch('/api/discoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdToProcess,
          userId,
          knowledgeNodeId: nodeToProcess,
          module: 'english',
        }),
      });

      let discoveryData = null;
      if (res.ok) {
        discoveryData = await res.json();
      }

      // 2.2 归档会话
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdToProcess }),
      });

      // 2.3 填充数据到 Modal
      if (discoveryData && discoveryData.success) {
        setSummaryData(discoveryData.discovery);
      } else if (discoveryData && discoveryData.tooShort) {
        setSummaryData({
          title: '本轮对话过短',
          summary: '你刚才的对话较短，系统无法评估出实质性的语法点。建议下次与 AI 多进行几轮英语交流，帮助我们更好地为你总结并点亮星图哦～',
          isNotice: true
        });
      } else {
        // Fallback if success is false
        setSummaryData({
          title: '对话圆满结束',
          summary: '本轮对话已顺利保存，星图数据已成功更新！你可以前往个人画像页面查看你的学习足迹。',
          isNotice: true
        });
      }
    } catch (err) {
      console.error('Error during async ending session:', err);
      // Fallback on error
      setSummaryData({
        title: '对话已成功结束',
        summary: '网络请求超时，但你的学习对话数据已安全归档。你可以稍后在个人画像中查看最新的星图点亮进度！',
        isNotice: true
      });
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
              {lastSessionId && (
                <button
                  onClick={handleResumeLastSession}
                  disabled={isInitializing}
                  className="w-full px-6 py-3.5 bg-surface-card border border-brand-accent/30 text-brand-accent text-xs font-bold tracking-widest uppercase hover:scale-105 transition-transform rounded-full disabled:opacity-55 cursor-pointer text-center"
                >
                  {isInitializing ? '加载中...' : '继续上次对话'}
                </button>
              )}
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
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 md:px-8 py-3.5 bg-gradient-to-b from-app-bg via-app-bg/95 to-transparent">
              <span className="text-[10px] text-text-secondary font-mono tracking-widest uppercase hidden sm:inline">ZPD Session Active</span>
              
              {/* Language Preference Switcher */}
              <div className="flex bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/10 rounded-full p-1 text-[11px] font-medium text-text-secondary shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
                <button
                  onClick={() => handleLangPrefChange('chinese')}
                  className={`px-3 py-1 rounded-full transition-all duration-300 cursor-pointer ${
                    langPref === 'chinese'
                      ? 'bg-brand-accent text-[#000000] font-bold shadow-[0_0_12px_rgba(0,255,157,0.4)] scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  🇨🇳 中文
                </button>
                <button
                  onClick={() => handleLangPrefChange('balanced')}
                  className={`px-3 py-1 rounded-full transition-all duration-300 cursor-pointer ${
                    langPref === 'balanced'
                      ? 'bg-brand-accent text-[#000000] font-bold shadow-[0_0_12px_rgba(0,255,157,0.4)] scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  ⚖️ 双语
                </button>
                <button
                  onClick={() => handleLangPrefChange('english')}
                  className={`px-3 py-1 rounded-full transition-all duration-300 cursor-pointer ${
                    langPref === 'english'
                      ? 'bg-brand-accent text-[#000000] font-bold shadow-[0_0_12px_rgba(0,255,157,0.4)] scale-105'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  🇬🇧 纯英
                </button>
              </div>

              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={isEndingSession}
                className="px-3.5 py-1.5 bg-brand-error/5 hover:bg-brand-error/15 border border-brand-error/25 hover:border-brand-error/50 rounded-full text-[10px] font-bold text-brand-error tracking-wider uppercase transition-all duration-300 disabled:opacity-55 cursor-pointer shadow-[0_0_12px_rgba(255,75,75,0.05)] animate-pulse"
              >
                {isEndingSession ? '结算中...' : '结束对话'}
              </button>
            </div>

            {/* Chat Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-8 space-y-6 flex flex-col pb-24 pt-20 scrollbar-none">

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
                    onPlayAudio={handlePlayAudio}
                    playingId={playingId}
                    playingLoadingId={playingLoadingId}
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
              <div className="max-w-2xl mx-auto">

                {/* Mode indicator + toast / asrError */}
                <div className="mb-2 flex flex-col gap-1.5 px-1">
                  {asrError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] font-medium text-brand-error flex items-start gap-1.5 bg-brand-error/10 border border-brand-error/20 px-3.5 py-2.5 rounded-xl mb-1 text-left pointer-events-auto"
                    >
                      <span className="leading-relaxed">⚠️ {asrError}</span>
                      <button 
                        onClick={() => setAsrError(null)}
                        className="ml-auto hover:text-white font-mono font-bold cursor-pointer text-text-secondary/70 text-[10px]"
                      >
                        [✕]
                      </button>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <AnimatePresence mode="wait">
                      {langSwitchToast ? (
                        <motion.span
                          key={langSwitchToast}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.25 }}
                          className="text-[11px] font-bold text-brand-accent tracking-wide"
                        >
                          ✓ 已切换至{LANG_PREF_LABELS[langSwitchToast as 'chinese' | 'balanced' | 'english'].label} — 下条消息起生效
                        </motion.span>
                      ) : (
                        <motion.span
                          key={`static-${langPref}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] text-text-secondary/60 tracking-wide"
                        >
                          {LANG_PREF_LABELS[langPref].label} · {LANG_PREF_LABELS[langPref].desc}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative flex items-center">
                  <textarea
                    id="chat-textarea"
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      const el = e.target;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                    }}
                    onFocus={handleInputFocus}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    rows={1}
                    placeholder={isRecording ? "正在录音，点击右侧麦克风停止录音..." : "输入内容，Enter 发送"}
                    disabled={isTranscribing}
                    className="w-full bg-surface-card border border-divider rounded-2xl py-4 pl-5 pr-12 text-[15px] focus:outline-none focus:border-text-secondary transition-colors placeholder:text-text-secondary font-normal text-text-primary shadow-lg resize-none overflow-hidden scrollbar-none disabled:opacity-75"
                  />
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={isTranscribing}
                    className={`absolute right-3.5 p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center
                      ${isRecording 
                        ? 'bg-brand-error text-white animate-pulse' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-divider/30'
                      } disabled:opacity-50`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                </div>

              </div>
            </div>
          </>
        )}

      </div>

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-surface-card border border-divider rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-lg font-display text-text-primary mb-2">结束对话</h3>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              确定结束：生成今日发现，点亮星图<br />
              保留对话：退出聊天，下次继续
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowEndConfirm(false); handleEndSession(); }}
                className="w-full px-6 py-3.5 bg-brand-accent text-[#000000] text-sm font-bold tracking-wider rounded-2xl hover:scale-[1.02] transition-transform"
              >
                确定结束，形成今日发现
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); setActiveSessionId(null); useSessionStore.getState().setActiveChatSessionId(null); useSessionStore.getState().setActiveSection('home'); }}
                className="w-full px-6 py-3.5 bg-transparent border border-divider text-text-secondary text-sm font-medium tracking-wider rounded-2xl hover:border-text-secondary hover:text-text-primary transition-all"
              >
                保留对话，稍后继续
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
