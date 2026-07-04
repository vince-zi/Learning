'use client';
import React, { useState, useEffect } from "react";
import { ChevronRight, X, Check, Flame, BookOpen, Target, Loader2 } from "lucide-react";
import { supabase } from '@/lib/db/supabase-client';
import { englishKnowledgeGraph } from '@/core/knowledge-graph/english-graph';

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
  const [aiFeedback, setAiFeedback] = useState('');
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
    if (!inputValue.trim() || !sessionId) return;
    setIsLoading(true);
    setAiFeedback('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, userMessage: inputValue, isEnglish: true })
      });
      const data = await res.json();
      
      if (data.isResolved) {
        setStage(data.resolvedStage === 1 ? 1 : 2);
        setInputValue('');
        if (data.resolvedStage === 1 && data.message?.content) {
          setAiTask(data.message.content);
        }
        if (data.resolvedStage === 2) {
          onComplete();
        }
      } else {
        setAiFeedback(data.message?.content || 'Needs improvement.');
      }
    } catch (err) {
      setAiFeedback('网络错误，请重试');
    } finally {
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
          {["第一关 · 纠正原句", "第二关 · 新场景重测"].map((label, idx) => (
            <React.Fragment key={idx}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: stepDone(idx) ? tokens.gold : stage === idx ? tokens.tealSoft : "#ffffff10",
                    border: stage === idx ? `1.5px solid ${tokens.teal}` : "none",
                    color: stepDone(idx) ? "#181410" : tokens.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {stepDone(idx) ? <Check size={13} /> : idx + 1}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: stage === idx ? tokens.textPrimary : tokens.textSecondary,
                    textAlign: "center",
                    width: 74,
                  }}
                >
                  {label}
                </div>
              </div>
              {idx === 0 && (
                <div style={{ flex: 1, height: 1.5, background: stepDone(0) ? tokens.gold : tokens.divider, margin: "0 4px 18px" }} />
              )}
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
                background: tokens.surfaceCard,
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
                fontSize: 15,
                color: tokens.coral,
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {stage === 0 ? record.original : (record.reviewScenario || aiTask || "加载新场景中...")}
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
                    💡 {getClueForErrorType(record.category, record.original)}
                  </div>
                )}
              </div>
            )}

            {aiFeedback && (
              <div style={{
                background: tokens.tealSoft,
                border: `1px solid ${tokens.teal}`,
                color: tokens.textPrimary,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 'bold', color: tokens.teal }}>💡 提示：</span>
                {aiFeedback}
              </div>
            )}

            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="输入你的答案..."
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
              {stage === 0 ? "提交，进入第二关" : "提交，完成消灭"}
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
              这个错误已从两个不同场景中验证掌握
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
  return (
    <div
      style={{
        background: tokens.surfaceCard,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        border: `1px solid ${tokens.divider}`,
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
              background: tokens.goldSoft,
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

      <div style={{ fontSize: 14, color: tokens.coral, textDecoration: "line-through", marginBottom: 3, opacity: 0.85 }}>
        {record.original}
      </div>
      <div style={{ fontSize: 14, color: tokens.textPrimary, marginBottom: 12 }}>
        {record.fixed}
      </div>

      {/* explanation */}
      {record.explanation && (
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
      setRecords(mapped);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

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
