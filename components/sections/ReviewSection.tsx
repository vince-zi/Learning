'use client';
import React, { useState, useEffect } from "react";
import { ChevronRight, X, Check, Flame, BookOpen, Target, Loader2 } from "lucide-react";
import { supabase } from '@/lib/db/supabase-client';

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
  };
  return names[type] || type || '语法词汇';
}

const stageInfo = [
  { label: "未开始", color: tokens.textSecondary },
  { label: "第一关完成", color: tokens.teal },
  { label: "已消灭", color: tokens.gold },
];

function ReviewModal({ record, onClose, onComplete }: { record: any, onClose: () => void, onComplete: () => void }) {
  const [stage, setStage] = useState(record.stage >= 1 ? 1 : 0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [aiTask, setAiTask] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const stepDone = (idx: number) => stage > idx;

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module: 'english', theme: '温习: ' + record.id })
        });
        const data = await res.json();
        if (mounted && data.success) {
          setSessionId(data.session.id);
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: data.session.id, userMessage: 'I am ready to review.', isEnglish: true })
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
        body: JSON.stringify({ sessionId, userMessage: inputValue, isEnglish: true })
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
            <div style={{ fontSize: 13, color: tokens.textSecondary, marginBottom: 8 }}>
              {stage === 0 ? "纠正这句话：" : "新场景 · 请重新造句表达相同意思："}
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
              {stage === 0 ? record.original : (aiTask || "加载新场景中...")}
            </div>

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

            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="输入你的答案..."
              disabled={isLoading || !sessionId}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
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
            {record.severity}
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
    const keywordMap: Record<string, string> = {
      '介词专题': '介词',
      '时态专题': '时态',
      '冠词专题': '冠词',
    };
    const keyword = keywordMap[categoryName] || categoryName;
    const match = records.find(r => r.category.includes(keyword) && r.stage < 2);
    if (match) {
      setReviewing(match);
    }
  };

  const fetchRecords = async () => {
    const { data } = await supabase.from('error_records').select('*').order('created_at', { ascending: false });
    if (data) {
      const mapped = data.map(d => {
        const stageNum = d.noted_by_user ? 2 : (d.error_pattern?.endsWith(':stage-1') ? 1 : 0);
        const diffTime = Math.abs(new Date().getTime() - new Date(d.created_at).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dateStr = diffDays === 1 ? '今天' : diffDays === 2 ? '昨天' : `${diffDays} 天前`;

        return {
          id: d.id,
          original: d.original_text,
          fixed: d.corrected_text || '待 AI 修正...',
          category: getFriendlyErrorName(d.error_type),
          severity: d.severity?.toUpperCase() || 'B1',
          stage: stageNum,
          date: dateStr,
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

  const focusGroups = [
    { name: "介词专题", count: records.filter(r => r.category.includes('介词') && r.stage < 2).length, color: tokens.teal },
    { name: "时态专题", count: records.filter(r => r.category.includes('时态') && r.stage < 2).length, color: tokens.coral },
    { name: "冠词专题", count: records.filter(r => r.category.includes('冠词') && r.stage < 2).length, color: tokens.gold },
  ].filter(g => g.count > 0);

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

        {reviewing && <ReviewModal record={reviewing} onClose={() => setReviewing(null)} onComplete={fetchRecords} />}
      </div>
    </div>
  );
}
