'use client';
import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, X, Check, Flame, BookOpen, Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from '@/lib/db/supabase-client';
import { englishKnowledgeGraph } from '@/core/knowledge-graph/english-graph';
import { useSessionStore } from '@/store/session-store';

const tokens = {
  surfaceAI: "#0A0A0A",
  surfaceCard: "#0D0D0D",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  gold: "#00FF9D",
  goldSoft: "#00FF9D22",
  teal: "#00E5FF",
  tealSoft: "#00E5FF22",
  coral: "#FF3366",
  coralSoft: "#FF336622",
  divider: "#1A1A1A",
};

function getClueForErrorType(type: string, original: string): string {
  const genericHints: Record<string, string> = {
    'grammar-tense': '试试看"昨天/刚才发生的事"需要用哪种动词形式？',
    'grammar-article': '单数可数名词前面少了点什么？',
    'grammar-preposition': '固定搭配的介词是什么？回顾一下这个短语的完整形式。',
    'grammar-word-order': '英语的语序和中文不太一样，试试调整词的位置。',
    'grammar-agreement': '主语和动词要"一致"——单数主语配单数动词。',
    'vocabulary-choice': '这个词在这种情况下不太自然，母语者会怎么说？',
    'expression-chinglish': '试着用英文的思维方式重新组织这句话，而不是逐字翻译。',
    'expression-incomplete': '这个句子缺少了关键成分——是主语、动词还是宾语？',
    '时态 / 助动词': '要不要加个助动词？表示"将要"或"正在"时，需要一个帮手词。',
    '介词搭配': '这个动词后面要跟哪个介词？回忆一下这个短语的固定搭配。',
    '时态错误': '时间决定了动词的形式——这件事发生在过去、现在还是将来？',
    '冠词错误': '这个名词前面要加 a/an 还是 the？可数名词不能光着身子。',
    '中式英语': '试着用英文的语序和习惯来表达，而不是中文直译。',
  };
  return genericHints[type] || `"${original.slice(0, 20)}..." 这里可以改得更自然一些。`;
}

function renderAiTaskWithColors(text: string): React.ReactNode {
  if (!text) return null;
  
  // 使用正则表达式对新场景进行模糊匹配并截取
  const regex = /(【新场景挑战】|Now here's a new scenario[^\n:]*|Now let's try a new scenario[^\n:]*|Now try this:|New scenario challenge:|New scenario:)/i;
  
  const match = text.match(regex);
  if (match && match.index !== undefined) {
    const splitIndex = match.index;
    const splitKey = match[0];
    const prefix = text.slice(0, splitIndex).trim();
    const suffix = text.slice(splitIndex + splitKey.length).trim();
    
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {prefix && (
          <div style={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
            {prefix}
          </div>
        )}
        <div style={{
          background: tokens.tealSoft,
          borderLeft: `3px solid ${tokens.teal}`,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          padding: "12px 14px",
          color: tokens.teal,
          fontWeight: 600,
          lineHeight: 1.6,
          fontSize: 14,
        }}>
          📌 【新场景挑战】{suffix}
        </div>
      </div>
    );
  }
  
  // 兜底：如果完全没有匹配到上述任何新场景提示词，直接以 teal 风格渲染整个框（符合第二关风格）
  return (
    <div style={{
      background: tokens.tealSoft,
      borderLeft: `3px solid ${tokens.teal}`,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      padding: "12px 14px",
      color: tokens.teal,
      fontWeight: 600,
      lineHeight: 1.6,
      fontSize: 14,
    }}>
      {text}
    </div>
  );
}


const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

function getFriendlyErrorName(type: string): string {
  const names: Record<string, string> = {
    'grammar-tense': '动词时态',
    'grammar-article': '冠词使用',
    'grammar-preposition': '介词搭配',
    'grammar-word-order': '语序结构',
    'grammar-agreement': '主谓一致',
    'vocabulary-choice': '词汇搭配',
    'expression-chinglish': '中式英语',
    'expression-incomplete': '句子完整性',
    '时态 / 助动词': '时态 / 助动词',
    '介词搭配': '介词搭配',
    '时态错误': '时态错误',
    '冠词错误': '冠词错误',
    '中式英语': '中式英语',
  };
  return names[type] || type || '语法';
}

function getFriendlySeverity(severity: string): string {
  const map: Record<string, string> = {
    'minor': 'A2',
    'moderate': 'B1',
    'major': 'B2',
  };
  return map[severity?.toLowerCase()] || severity?.toUpperCase() || 'B1';
}

function buildFocusGroups(records: any[]) {
  const categoryColorMap: Record<string, string> = {
    "介词搭配": tokens.teal,
    "代词": tokens.teal,
    "时态错误": tokens.coral,
    "时态 / 助动词": tokens.coral,
    "冠词错误": tokens.gold,
    "中式英语": tokens.teal,
    "语法": tokens.teal,
  };
  const pending = records.filter((r) => r.stage < 2);
  const grouped: Record<string, { name: string; count: number; color: string }> = {};
  pending.forEach((r) => {
    const key = r.category;
    if (!grouped[key]) {
      grouped[key] = { name: key, count: 0, color: categoryColorMap[key] || tokens.teal };
    }
    grouped[key].count += 1;
  });
  return Object.values(grouped).sort((a, b) => b.count - a.count);
}

const stageInfo = [
  { label: "未开始", color: tokens.textSecondary },
  { label: "第一关完成", color: tokens.teal },
  { label: "已消灭", color: tokens.gold },
];

function ReviewModal({ record, userId, onClose, onComplete }: { record: any, userId: string, onClose: () => void, onComplete: () => void }) {
  const [stage, setStage] = useState(record.stage >= 1 ? 1 : 0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [aiTask, setAiTask] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showClue, setShowClue] = useState(false);

  const stepDone = (idx: number) => stage > idx;

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, module: 'english', theme: '温习: ' + record.id })
        });
        const data = await res.json();
        if (mounted && data.success) {
          setSessionId(data.session.id);
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: data.session.id, userId, userMessage: 'I am ready to review.', isEnglish: true })
          });
          const chatData = await chatRes.json();
          if (mounted && chatData.message?.content) {
            setAiTask(chatData.message.content);
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    initSession();
    return () => { mounted = false; };
  }, [record.id]);

  const handleSubmit = async () => {
    if (isSubmittingRef.current || !inputValue.trim() || !sessionId) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setAiFeedback('');
    setSuccessMessage('');
    setIsError(false);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          userId, 
          userMessage: inputValue, 
          isEnglish: true,
          reviewStage: stage
        })
      });
      const data = await res.json();
      
      if (data.isResolved) {
        setInputValue('');
        if (data.resolvedStage === 1) {
          setStage(1);
          setSuccessMessage('✅ 答对啦！成功通过第一关，进入第二关。');
          if (data.message?.content) {
            setAiTask(data.message.content);
          }
        } else if (data.resolvedStage === 2) {
          setStage(2);
          onComplete();
        }
      } else {
        setIsError(true);
        setAiFeedback(data.message?.content || '句子表达仍有提升空间，再试一次吧。');
      }
    } catch (err) {
      setIsError(true);
      setAiFeedback('网络错误，请重试');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#00000070",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "rgba(13, 13, 13, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "32px 32px 0px 0px",
          padding: "22px 20px 28px",
          animation: "slideUp 0.28s ease-out",
          boxShadow: "0px -10px 40px rgba(0, 0, 0, 0.8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: tokens.textPrimary }}>
            温习模式
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textSecondary, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          {["消除这道错题"].map((label, idx) => (
            <React.Fragment key={idx}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: stage === 2 ? tokens.gold : tokens.tealSoft,
                    border: stage !== 2 ? `1.5px solid ${tokens.teal}` : "none",
                    color: stage === 2 ? "#181410" : tokens.teal,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {stage === 2 ? <Check size={13} /> : idx + 1}
                </div>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: stage === 2 ? tokens.gold : tokens.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {stage < 2 ? (
          <>
            {/* dialogue context — when and where the error happened */}
            {record.dialogueContext && (
              <div style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: 0.6 }}>💬</span>
                <span>{record.dialogueContext}</span>
              </div>
            )}

            <div style={{ fontSize: 13, color: tokens.textSecondary, marginBottom: 8 }}>
              {stage === 0 ? "纠正这句话：" : "新场景 · 请用正确表达回答："}
            </div>
            <div
              style={{
                borderRadius: 10,
                fontSize: 15,
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {stage === 0 ? (
                <div style={{
                  background: tokens.surfaceCard,
                  borderRadius: 10,
                  padding: "14px 16px",
                  color: tokens.coral,
                }}>
                  {record.original}
                </div>
              ) : (
                renderAiTaskWithColors(record.reviewScenario || aiTask || "加载新场景中...")
              )}
            </div>

            {/* first-round inline grammar explanation */}
            {stage === 0 && record.explanation && (
              <div
                style={{
                  background: tokens.tealSoft,
                  border: `1px solid ${tokens.teal}33`,
                  borderRadius: 8, padding: "10px 12px", marginBottom: 14,
                  fontSize: 12, color: tokens.textSecondary, lineHeight: 1.6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <span style={{ color: tokens.teal, fontWeight: 600, marginRight: 4 }}>语法提示</span>
                    {record.explanation}
                  </span>
                  <button
                    onClick={() => setShowClue(!showClue)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: tokens.gold,
                      fontSize: 11,
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      marginLeft: 8,
                      flexShrink: 0,
                    }}
                  >
                    {showClue ? '收起线索' : '💡 获取线索'}
                  </button>
                </div>
                {showClue && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 10px',
                    background: tokens.goldSoft,
                    borderRadius: 6,
                    color: tokens.textPrimary,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}>
                    <div>💡 {getClueForErrorType(record.category, record.original)}</div>
                    {record.fixed && record.fixed !== '待 AI 修正...' && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255, 255, 255, 0.1)', color: tokens.gold }}>
                        👉 参考表达：{record.fixed}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 错误提示气泡：高对比珊瑚红 */}
            {aiFeedback && (
              <div style={{
                background: tokens.coralSoft,
                border: `1.5px solid ${tokens.coral}`,
                color: tokens.textPrimary,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 'bold', color: tokens.coral }}>❌ 答错啦，请根据提示修改：</span>
                <div style={{ marginTop: 4, color: tokens.textSecondary }}>{aiFeedback}</div>
              </div>
            )}

            {/* 成功提示气泡：高对比金色/绿色 */}
            {successMessage && (
              <div style={{
                background: tokens.goldSoft,
                border: `1.5px solid ${tokens.gold}`,
                color: tokens.textPrimary,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 'bold', color: tokens.gold }}>{successMessage}</span>
              </div>
            )}

            <textarea
              key={stage === 0 ? "stage-0-input" : "stage-1-input"}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={stage === 0 ? "输入修改后的正确句子..." : "输入你在新场景下的回答..."}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isLoading || !sessionId}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              rows={3}
              style={{
                width: "100%",
                background: "transparent",
                border: `1px solid ${tokens.divider}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 18,
                color: tokens.textPrimary,
                fontSize: 14,
                outline: 'none',
                resize: 'none',
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !sessionId || !inputValue.trim()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: tokens.gold,
                color: "#181410",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: (isLoading || !sessionId || !inputValue.trim()) ? 0.6 : 1,
              }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              提交并消除错题
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: tokens.goldSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Check size={24} color={tokens.gold} />
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: tokens.textPrimary, marginBottom: 6 }}>
              已消灭
            </div>
            <div style={{ fontSize: 13, color: tokens.textSecondary, marginBottom: 20 }}>
              你已完美纠正了该错句，已成功掌握！
            </div>
            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${tokens.divider}`,
                background: "transparent",
                color: tokens.textPrimary,
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              返回错题本
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ record, onReview }: { record: any, onReview: () => void }) {
  const info = stageInfo[record.stage];
  const [isExpanded, setIsExpanded] = useState(false);
  const isConquered = record.stage === 2;

  return (
    <div
      style={{
        background: tokens.surfaceCard,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        border: `1px solid ${tokens.divider}`,
        opacity: isConquered ? 0.75 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 5,
              background: "#ffffff10",
              color: tokens.textSecondary,
            }}
          >
            {record.category}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 5,
              background: isConquered ? `${tokens.gold}20` : tokens.goldSoft,
              color: tokens.gold,
            }}
          >
            {record.cefrLevel}
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: tokens.textSecondary }}>
          {record.date}
        </span>
      </div>

      {!isConquered ? (
        <>
          <div style={{ fontSize: 14, color: tokens.coral, textDecoration: "line-through", marginBottom: 3, opacity: 0.85 }}>
            {record.original}
          </div>
          <div style={{ fontSize: 14, color: tokens.textPrimary, marginBottom: 12 }}>
            {record.fixed}
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, color: tokens.coral, textDecoration: "line-through", opacity: 0.6 }}>
              {record.original}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: "transparent",
                border: "none",
                color: tokens.textSecondary,
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                fontSize: 11,
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
              }}
            >
              {isExpanded ? "收起" : "展开详情"}
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          
          {isExpanded && (
            <div style={{ 
              marginTop: 10, 
              padding: "10px 12px", 
              background: "#ffffff04", 
              borderRadius: 8, 
              borderLeft: `2px solid ${tokens.gold}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              animation: "slideUp 0.2s ease"
            }}>
              <div>
                <div style={{ fontSize: 11, color: tokens.textSecondary, marginBottom: 2 }}>改正好的句子：</div>
                <div style={{ fontSize: 13, color: tokens.gold }}>{record.fixed}</div>
              </div>
              {record.reviewScenario && (
                <div>
                  <div style={{ fontSize: 11, color: tokens.textSecondary, marginBottom: 2 }}>第二关情景挑战：</div>
                  <div style={{ fontSize: 13, color: tokens.teal, lineHeight: 1.4 }}>
                    {record.reviewScenario}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {record.explanation && (!isConquered || isExpanded) && (
        <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55, marginBottom: 12, borderLeft: `2px solid ${tokens.divider}`, paddingLeft: 8 }}>
          {record.explanation}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: info.color, fontFamily: "'JetBrains Mono', monospace" }}>
          ● {info.label}
        </span>
        {record.stage < 2 && (
          <button
            onClick={onReview}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: tokens.teal,
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {record.stage === 0 ? "开始温习" : "继续第二关"} <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReviewSection() {
  const { activeSection } = useSessionStore();
  const [tab, setTab] = useState("all");
  const [reviewing, setReviewing] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);

  const handleStartFocusTraining = (categoryName: string) => {
    const match = records.find(r => r.category === categoryName && r.stage < 2);
    if (match) {
      setReviewing(match);
    }
  };

  const fetchRecords = async () => {
    const userId = localStorage.getItem('learniny_user_id') || 'mock_user';
    const { data } = await supabase.from('error_records').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // batch-fetch sessions to get context (topic names / theme)
      const sessionIds = [...new Set(data.map(d => d.session_id).filter(Boolean))] as string[];
      let sessionMap: Record<string, any> = {};
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase.from('learning_sessions').select('id, theme, current_knowledge_node_id').in('id', sessionIds);
        if (sessions) {
          sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));
        }
      }

      const mapped = data.map(d => {
        const stageNum = d.noted_by_user ? 2 : (d.error_pattern?.endsWith(':stage-1') ? 1 : 0);
        const diffTime = Math.abs(new Date().getTime() - new Date(d.created_at).getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const dateStr = diffDays === 0 ? '今天' : diffDays === 1 ? '昨天' : `${diffDays} 天前`;

        // build dialogue context from session data
        let dialogueContext = '';
        const sess = d.session_id ? sessionMap[d.session_id] : null;
        if (sess) {
          const nodeId = sess.current_knowledge_node_id;
          const nodeName = nodeId ? englishKnowledgeGraph.nodes.get(nodeId)?.name : '';
          dialogueContext = nodeName
            ? `你在「${nodeName}」中说错了这句话 · ${dateStr}`
            : `${dateStr}的对话中说错了这句话`;
        } else {
          dialogueContext = dateStr ? `在${dateStr}的对话中说错了这句话` : '';
        }

        return {
          id: d.id,
          original: d.original_text,
          fixed: d.corrected_text || '待 AI 修正...',
          category: getFriendlyErrorName(d.error_type || 'grammar'),
          cefrLevel: getFriendlySeverity(d.severity),
          explanation: d.explanation || null,
          reviewScenario: d.review_scenario || null,
          stage: stageNum,
          date: dateStr,
          dialogueContext,
        };
      });
      
      // 错句去重合并与最高关卡进度同步
      const seen = new Set<string>();
      const deduplicated: typeof mapped = [];
      const normalizeText = (text: string) => {
        return text.toLowerCase().trim().replace(/[.,!?，。！？]/g, '');
      };

      // 1. 找出重复句子中取得的最高 stage 状态
      const maxStageMap = new Map<string, number>();
      mapped.forEach(item => {
        const norm = normalizeText(item.original);
        const currentMax = maxStageMap.get(norm) ?? 0;
        if (item.stage > currentMax) {
          maxStageMap.set(norm, item.stage);
        }
      });

      // 2. 过滤去重，只保留最新的一条，并将 stage 强行同步为该句取得的全局最高 stage
      mapped.forEach(item => {
        const norm = normalizeText(item.original);
        if (!seen.has(norm)) {
          seen.add(norm);
          const maxStage = maxStageMap.get(norm) ?? item.stage;
          deduplicated.push({
            ...item,
            stage: maxStage
          });
        }
      });

      // 3. 对去重后的卡片按掌握状态排序（未消灭置顶，已消灭置底）
      const sorted = deduplicated.sort((a, b) => {
        if (a.stage === 2 && b.stage < 2) return 1;
        if (a.stage < 2 && b.stage === 2) return -1;
        return 0; // 保持原有创建时间降序
      });
      
      setRecords(sorted);
    }
  };

  useEffect(() => {
    if (activeSection === 'review') {
      fetchRecords();
    }
  }, [activeSection]);

  const pendingCount = records.filter((r) => r.stage < 2).length;
  const clearedThisWeek = records.filter((r) => r.stage === 2).length;

  const focusGroups = buildFocusGroups(records);

  return (
    <div className="w-full h-full flex flex-col justify-center pt-24 pb-20 px-6 md:px-12 pointer-events-auto">
      <style>{fontImport}</style>
      <style>{`
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
      `}</style>
      
      <div className="max-w-2xl mx-auto w-full h-full flex flex-col relative overflow-hidden">
        {/* header */}
        <div style={{ padding: "0 0 10px" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: tokens.textPrimary, marginBottom: 18 }}>
            错题本
          </div>

          {/* stats row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, background: tokens.surfaceCard, border: `1px solid ${tokens.divider}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <BookOpen size={14} color={tokens.teal} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: tokens.textSecondary }}>待温习</span>
              </div>
              <div style={{ fontSize: 24, fontFamily: "'Fraunces', serif", color: tokens.textPrimary }}>{pendingCount}</div>
            </div>
            <div style={{ flex: 1, background: tokens.surfaceCard, border: `1px solid ${tokens.divider}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Flame size={14} color={tokens.gold} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: tokens.textSecondary }}>已消灭</span>
              </div>
              <div style={{ fontSize: 24, fontFamily: "'Fraunces', serif", color: tokens.textPrimary }}>{clearedThisWeek}</div>
            </div>
          </div>

          {/* tabs */}
          <div style={{ display: "flex", gap: 4, background: tokens.surfaceCard, border: `1px solid ${tokens.divider}`, borderRadius: 10, padding: 4, marginBottom: 16 }}>
            {[
              { key: "all", label: "全部错题" },
              { key: "focus", label: "专项训练" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 7,
                  border: "none",
                  background: tab === t.key ? tokens.gold : "transparent",
                  color: tab === t.key ? "#181410" : tokens.textSecondary,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto pr-2 pb-8 scrollbar-none">
          {tab === "all" ? (
            records.length > 0 ? (
              records.map((r) => (
                <ErrorCard key={r.id} record={r} onReview={() => setReviewing(r)} />
              ))
            ) : (
              <div style={{ textAlign: 'center', color: tokens.textSecondary, marginTop: 40, fontSize: 14 }}>
                暂无错题记录。去练习中多说几句吧！
              </div>
            )
          ) : (
            focusGroups.length > 0 ? (
              focusGroups.map((g, i) => (
                <div
                  key={i}
                  style={{
                    background: tokens.surfaceCard,
                    borderRadius: 12,
                    padding: "16px",
                    marginBottom: 10,
                    border: `1px solid ${tokens.divider}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: g.color + "22",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Target size={18} color={g.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, color: tokens.textPrimary, fontWeight: 600, marginBottom: 2 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                        {g.count} 条待强化
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartFocusTraining(g.name)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: tokens.gold,
                      color: "#181410",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    开始特训
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: tokens.textSecondary, marginTop: 40, fontSize: 14 }}>
                暂无需要专项训练的弱点。
              </div>
            )
          )}
        </div>

        {reviewing && <ReviewModal record={reviewing} userId={localStorage.getItem('learniny_user_id') || 'mock_user'} onClose={() => setReviewing(null)} onComplete={fetchRecords} />}
      </div>
    </div>
  );
}
