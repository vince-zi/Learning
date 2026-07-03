import React, { useState } from "react";
import { ChevronRight, X, Check, Flame, BookOpen, Target } from "lucide-react";

/* ============================================================
   DESIGN TOKENS (matches other Learniny prototypes)
   ============================================================ */
const tokens = {
  bg: "#10141F",
  bgGradient: "linear-gradient(180deg, #10141F 0%, #141A28 100%)",
  surfaceAI: "#1A2030",
  surfaceCard: "#181E2C",
  textPrimary: "#EDE9E1",
  textSecondary: "#8A93A6",
  gold: "#C9A15D",
  goldSoft: "#C9A15D33",
  teal: "#6FA8B5",
  tealSoft: "#6FA8B522",
  coral: "#B5675A",
  coralSoft: "#B5675A22",
  sage: "#7FA37A",
  sageSoft: "#7FA37A22",
  divider: "#2A3142",
};

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

/* ============================================================
   MOCK DATA
   ============================================================ */
const errorRecords = [
  {
    id: 1,
    original: "I am pay by card.",
    fixed: "I'll pay by card.",
    category: "时态 / 助动词",
    severity: "B1",
    stage: 0, // 0 = 未开始, 1 = 第一关完成, 2 = 已消灭
    date: "今天",
  },
  {
    id: 2,
    original: "I'm interested about the seasonal drinks.",
    fixed: "I'm interested in the seasonal drinks.",
    category: "介词搭配",
    severity: "B2",
    stage: 1,
    date: "今天",
  },
  {
    id: 3,
    original: "Yesterday I go to the coffee shop.",
    fixed: "Yesterday I went to the coffee shop.",
    category: "时态错误",
    severity: "B1",
    stage: 2,
    date: "昨天",
  },
  {
    id: 4,
    original: "I very like this song.",
    fixed: "I like this song a lot.",
    category: "中式英语",
    severity: "B1",
    stage: 0,
    date: "3 天前",
  },
  {
    id: 5,
    original: "I am student at a university.",
    fixed: "I am a student at a university.",
    category: "冠词错误",
    severity: "B2",
    stage: 1,
    date: "5 天前",
  },
];

const focusGroups = [
  { name: "介词专题", count: 7, color: tokens.teal },
  { name: "时态专题", count: 5, color: tokens.coral },
  { name: "冠词专题", count: 3, color: tokens.gold },
];

const stageInfo = [
  { label: "未开始", color: tokens.textSecondary },
  { label: "第一关完成", color: tokens.teal },
  { label: "已消灭", color: tokens.gold },
];

/* ============================================================
   REVIEW FLOW MODAL — two-stage
   ============================================================ */
function ReviewModal({ record, onClose }) {
  const [stage, setStage] = useState(record.stage >= 1 ? 1 : 0);
  // 0: stage1 in progress, 1: stage1 done -> stage2 in progress, 2: cleared

  const stepDone = (idx) => stage > idx;

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
          background: tokens.surfaceAI,
          clipPath: "polygon(0% 14px, 6% 0%, 94% 0%, 100% 14px, 100% 100%, 0% 100%)",
          padding: "22px 20px 28px",
          animation: "slideUp 0.28s ease-out",
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

        {/* two-stage progress */}
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
              }}
            >
              {stage === 0 ? record.original : "在餐厅，服务员问你想怎么付款，你会怎么说？"}
            </div>
            <div
              style={{
                border: `1px solid ${tokens.divider}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 18,
                color: tokens.textSecondary,
                fontSize: 14,
              }}
            >
              输入你的答案...
            </div>
            <button
              onClick={() => setStage(stage + 1)}
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
              }}
            >
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

/* ============================================================
   ERROR CARD
   ============================================================ */
function ErrorCard({ record, onReview }) {
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

/* ============================================================
   MAIN
   ============================================================ */
export default function LearninyErrorNotebook() {
  const [tab, setTab] = useState("all"); // all | focus
  const [reviewing, setReviewing] = useState(null);

  const pendingCount = errorRecords.filter((r) => r.stage < 2).length;
  const clearedThisWeek = errorRecords.filter((r) => r.stage === 2).length;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 430,
        height: 780,
        margin: "0 auto",
        background: tokens.bgGradient,
        borderRadius: 28,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
        boxShadow: "0 20px 60px #00000055",
        position: "relative",
      }}
    >
      <style>{fontImport}</style>
      <style>{`
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* header */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: tokens.textPrimary, marginBottom: 14 }}>
          错题本
        </div>

        {/* stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: tokens.surfaceCard, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <BookOpen size={12} color={tokens.teal} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: tokens.textSecondary }}>待温习</span>
            </div>
            <div style={{ fontSize: 20, fontFamily: "'Fraunces', serif", color: tokens.textPrimary }}>{pendingCount}</div>
          </div>
          <div style={{ flex: 1, background: tokens.surfaceCard, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <Flame size={12} color={tokens.gold} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: tokens.textSecondary }}>本周消灭</span>
            </div>
            <div style={{ fontSize: 20, fontFamily: "'Fraunces', serif", color: tokens.textPrimary }}>{clearedThisWeek}</div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 4, background: tokens.surfaceCard, borderRadius: 10, padding: 4, marginBottom: 14 }}>
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
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        {tab === "all" ? (
          errorRecords.map((r) => (
            <ErrorCard key={r.id} record={r} onReview={() => setReviewing(r)} />
          ))
        ) : (
          focusGroups.map((g, i) => (
            <div
              key={i}
              style={{
                background: tokens.surfaceCard,
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 10,
                border: `1px solid ${tokens.divider}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: `${g.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Target size={15} color={g.color} />
                </div>
                <div>
                  <div style={{ fontSize: 14, color: tokens.textPrimary, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: tokens.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                    {g.count} 条待强化
                  </div>
                </div>
              </div>
              <button
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: tokens.gold,
                  color: "#181410",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                }}
              >
                开始特训
              </button>
            </div>
          ))
        )}
      </div>

      {reviewing && <ReviewModal record={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}
