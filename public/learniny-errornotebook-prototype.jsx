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
   [FIX 1] severity -> cefrLevel: 字段名与实际含义对齐（CEFR 难度等级）
   [FIX 2] 新增 explanation: 每条错误附带语法解析，让用户知道"为什么错"
   [FIX 3] 新增 reviewScenario: 第二关情景由数据驱动，不再硬编码
   [NEW]   新增 dialogueContext: 对话背景还原，显示用户当初说这句话时的上下文
   [NEW]   新增 pedagogicalClue: 模糊线索，引导学习者思考而不直接给出答案
   ============================================================ */
const INITIAL_RECORDS = [
  {
    id: 1,
    original: "I am pay by card.",
    fixed: "I'll pay by card.",
    category: "时态 / 助动词",
    cefrLevel: "B1",
    explanation:
      '"am pay" 把 be 动词和裸动词混用了。表达将来的意愿／意图要用「will / 'll + 动词原形」，be 动词在此处多余。',
    reviewScenario: "在餐厅，服务员问你想怎么付款，你会怎么说？",
    dialogueContext: "周日下午 · 当 AI 问你周末打算怎么过、想如何付账单时",
    pedagogicalClue: "表达将来的动作或主动打算时，应该直接使用 'll / will 加上动词原形，不需要再加上 be 动词 (am/is/are) 哦。",
    stage: 0,
    date: "今天",
  },
  {
    id: 2,
    original: "I'm interested about the seasonal drinks.",
    fixed: "I'm interested in the seasonal drinks.",
    category: "介词搭配",
    cefrLevel: "B2",
    explanation:
      '"interested" 固定搭配介词是 in，不是 about。about 后接话题或原因，in 后接感兴趣的对象／领域。',
    reviewScenario: "朋友向你推荐一款新咖啡，你想表达自己很感兴趣，你会怎么说？",
    dialogueContext: "周三上午 · 当 AI 推荐最新夏季限定冰美式，并询问你的看法时",
    pedagogicalClue: "在英语中，表示对某事物感兴趣时，'interested' 固定和表示「在……里面」的那个核心介词搭配使用。",
    stage: 1,
    date: "今天",
  },
  {
    id: 3,
    original: "Yesterday I go to the coffee shop.",
    fixed: "Yesterday I went to the coffee shop.",
    category: "时态错误",
    cefrLevel: "B1",
    explanation:
      '"yesterday" 明确标示过去时间，谓语动词必须用一般过去时。go 的过去式是 went，不能用原形。',
    reviewScenario: "你的朋友问你昨天下午去了哪里，请用完整句子回答。",
    dialogueContext: "昨天下午 · 当你向 AI 分享你昨天的出行行程时",
    pedagogicalClue: "注意到句首的 'Yesterday' 提示词了吗？这是典型的过去时间标志，谓语动词需要采用特殊的不规则过去式形式。",
    stage: 2,
    date: "昨天",
  },
  {
    id: 4,
    original: "I very like this song.",
    fixed: "I like this song a lot.",
    category: "中式英语",
    cefrLevel: "B1",
    explanation:
      '英语副词不能直接夹在主语和动词之间修饰动词（汉式"很喜欢"结构）。程度副词 very 只修饰形容词／副词，不直接修饰动词；强调动词程度应用 a lot / really / very much 放在句尾，或 really 放在动词前。',
    reviewScenario: "你刚看完一部电影，想告诉朋友你非常喜欢它，你会怎么说？",
    dialogueContext: "3 天前 · 当 AI 为你推荐了一首经典英文老歌，你听完后表达喜爱时",
    pedagogicalClue: "在英文中我们不能说 'very like'。要么把程度修饰放到句子最末尾（如 a lot），要么把 'very' 替换为可以放在动词前面的强调副词。",
    stage: 0,
    date: "3 天前",
  },
  {
    id: 5,
    original: "I am student at a university.",
    fixed: "I am a student at a university.",
    category: "冠词错误",
    cefrLevel: "B2",
    explanation:
      "可数名词单数在首次提及、非特指时必须带不定冠词 a / an。student 是可数单数名词，不能裸用，需在前加 a。",
    reviewScenario: "你在做自我介绍，需要说明自己是一名大学生，你会怎么说？",
    dialogueContext: "5 天前 · 当你在初次与 AI 建立学习档案并介绍自己的背景身份时",
    pedagogicalClue: "作为一个表示职业或身份的可数单数名词，'student' 的前面缺少了一个非常基础且必不可少的英文不定冠词修饰。",
    stage: 1,
    date: "5 天前",
  },
];

/* ============================================================
   [FIX 4] buildFocusGroups: 从 records 动态计算分组和数量
   ============================================================ */
function buildFocusGroups(records) {
  const categoryColorMap = {
    "介词搭配": tokens.teal,
    "时态错误": tokens.coral,
    "时态 / 助动词": tokens.coral,
    "冠词错误": tokens.gold,
    "中式英语": tokens.sage,
  };
  const pending = records.filter((r) => r.stage < 2);
  const grouped = {};
  pending.forEach((r) => {
    const key = r.category;
    if (!grouped[key]) {
      grouped[key] = { name: key, count: 0, color: categoryColorMap[key] || tokens.textSecondary };
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

/* ============================================================
   REVIEW FLOW MODAL — two-stage
   [FIX] 输入框从静态 <div> 改为真实可交互的 <textarea>
   [NEW] 对话背景还原：💬 在第一关显示当初说这句话的上下文场景
   [NEW] 模糊线索：💡 右上角按钮，点击展开启发性线索，不直接给出答案
   ============================================================ */
function ReviewModal({ record, onClose, onComplete }) {
  const [stage, setStage] = useState(record.stage >= 1 ? 1 : 0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showClue, setShowClue] = useState(false);
  const stepDone = (idx) => stage > idx;

  const handleSubmit = () => {
    if (stage < 1) {
      setStage(1);
      setUserAnswer("");
      setShowClue(false);
    } else {
      setStage(2);
      onComplete(record.id);
    }
  };

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "#00000070",
        display: "flex", alignItems: "flex-end", zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", background: tokens.surfaceAI,
          clipPath: "polygon(0% 14px, 6% 0%, 94% 0%, 100% 14px, 100% 100%, 0% 100%)",
          padding: "22px 20px 28px", animation: "slideUp 0.28s ease-out",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: tokens.textPrimary }}>
            温习模式
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* [NEW] 模糊线索按钮 */}
            {stage < 2 && record.pedagogicalClue && (
              <button
                onClick={() => setShowClue(!showClue)}
                style={{
                  background: showClue ? tokens.goldSoft : "none",
                  border: `1px solid ${tokens.gold}55`,
                  borderRadius: 6,
                  padding: "4px 9px",
                  fontSize: 11,
                  color: tokens.gold,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                  transition: "background 0.15s",
                }}
              >
                💡 {showClue ? "收起线索" : "获取模糊线索"}
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textSecondary, cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Two-stage progress indicators */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
          {["第一关 · 纠正原句", "第二关 · 新场景重测"].map((label, idx) => (
            <React.Fragment key={idx}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: stepDone(idx) ? tokens.gold : stage === idx ? tokens.tealSoft : "#ffffff10",
                    border: stage === idx ? `1.5px solid ${tokens.teal}` : "none",
                    color: stepDone(idx) ? "#181410" : tokens.textSecondary,
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  {stepDone(idx) ? <Check size={13} /> : idx + 1}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: stage === idx ? tokens.textPrimary : tokens.textSecondary, textAlign: "center", width: 74 }}>
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
              {stage === 0 ? "纠正这句话：" : "新场景 · 请用正确表达回答："}
            </div>

            {/* Error sentence / scenario card */}
            <div style={{ background: tokens.surfaceCard, borderRadius: 10, padding: "14px 16px", marginBottom: stage === 0 ? 4 : 14, fontSize: 15, color: tokens.coral, fontFamily: "Inter, sans-serif" }}>
              {stage === 0 ? record.original : record.reviewScenario}
            </div>

            {/* [NEW] 对话背景还原 — 第一关显示，告知学习者当初说这句话时的场景 */}
            {stage === 0 && record.dialogueContext && (
              <div style={{
                fontSize: 11,
                color: tokens.textSecondary,
                display: "flex",
                alignItems: "flex-start",
                gap: 5,
                padding: "6px 2px 14px",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>💬</span>
                <span>你是在 <strong style={{ fontStyle: "normal", color: tokens.teal, fontWeight: 500 }}>{record.dialogueContext}</strong> 说了这句话</span>
              </div>
            )}

            {/* [NEW] 模糊线索展开面板 */}
            {showClue && record.pedagogicalClue && (
              <div
                style={{
                  background: "#C9A15D12",
                  border: `1px solid ${tokens.gold}40`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                  fontSize: 12,
                  color: tokens.textPrimary,
                  lineHeight: 1.6,
                  animation: "slideUp 0.18s ease-out",
                }}
              >
                <span style={{ color: tokens.gold, fontWeight: 600, marginRight: 6 }}>💡 启发线索</span>
                {record.pedagogicalClue}
              </div>
            )}

            {/* 语法提示（第一关常驻显示） */}
            {stage === 0 && (
              <div
                style={{
                  background: tokens.tealSoft,
                  border: `1px solid ${tokens.teal}33`,
                  borderRadius: 8, padding: "10px 12px", marginBottom: 14,
                  fontSize: 12, color: tokens.textSecondary, lineHeight: 1.6,
                }}
              >
                <span style={{ color: tokens.teal, fontWeight: 600, marginRight: 4 }}>语法提示</span>
                {record.explanation}
              </div>
            )}

            {/* [FIX] 真实可交互的输入框（原来是静态 <div>，现在改为 <textarea>） */}
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={stage === 0 ? "输入你纠正后的正确英文句子..." : "输入新场景下的英文回答..."}
              style={{
                width: "100%",
                height: 72,
                background: tokens.surfaceCard,
                border: `1px solid ${tokens.divider}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
                color: tokens.textPrimary,
                fontSize: 14,
                fontFamily: "Inter, sans-serif",
                resize: "none",
                outline: "none",
                display: "block",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={handleSubmit}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: tokens.gold, color: "#181410",
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              {stage === 0 ? "提交，进入第二关" : "提交，完成消灭"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: tokens.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Check size={24} color={tokens.gold} />
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: tokens.textPrimary, marginBottom: 6 }}>已消灭</div>
            <div style={{ fontSize: 13, color: tokens.textSecondary, marginBottom: 20 }}>这个错误已从两个不同场景中验证掌握</div>
            {/* [FIX] 成功页面的「返回错题本」按钮，绑定 onClose 使其正常关闭弹窗 */}
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: `1px solid ${tokens.divider}`,
                background: "transparent", color: tokens.textPrimary,
                fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
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
    <div style={{ background: tokens.surfaceCard, borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: `1px solid ${tokens.divider}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "#ffffff10", color: tokens.textSecondary }}>
            {record.category}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "2px 7px", borderRadius: 5, background: tokens.goldSoft, color: tokens.gold }}>
            {record.cefrLevel}
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: tokens.textSecondary }}>{record.date}</span>
      </div>

      <div style={{ fontSize: 14, color: tokens.coral, textDecoration: "line-through", marginBottom: 3, opacity: 0.85 }}>{record.original}</div>
      <div style={{ fontSize: 14, color: tokens.textPrimary, marginBottom: 8 }}>{record.fixed}</div>

      <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55, marginBottom: 12, borderLeft: `2px solid ${tokens.divider}`, paddingLeft: 8 }}>
        {record.explanation}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: info.color, fontFamily: "'JetBrains Mono', monospace" }}>● {info.label}</span>
        {record.stage < 2 && (
          <button onClick={onReview} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, color: tokens.teal, fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: "pointer" }}>
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
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [tab, setTab] = useState("all");
  const [reviewing, setReviewing] = useState(null);

  const pendingCount = records.filter((r) => r.stage < 2).length;
  const clearedThisWeek = records.filter((r) => r.stage === 2).length;
  const focusGroups = buildFocusGroups(records);

  const handleComplete = (id) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, stage: 2 } : r)));
  };

  return (
    <div
      style={{
        width: "100%", maxWidth: 430, height: 780, margin: "0 auto",
        background: tokens.bgGradient, borderRadius: 28, overflow: "hidden",
        display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif",
        boxShadow: "0 20px 60px #00000055", position: "relative",
      }}
    >
      <style>{fontImport}</style>
      <style>{`
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #8A93A6; }
        textarea:focus { border-color: #6FA8B5 !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: tokens.textPrimary, marginBottom: 14 }}>错题本</div>

        {/* Stats row */}
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: tokens.surfaceCard, borderRadius: 10, padding: 4, marginBottom: 14 }}>
          {[{ key: "all", label: "全部错题" }, { key: "focus", label: "专项训练" }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: tab === t.key ? tokens.gold : "transparent", color: tab === t.key ? "#181410" : tokens.textSecondary, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
        {tab === "all" ? (
          records.map((r) => <ErrorCard key={r.id} record={r} onReview={() => setReviewing(r)} />)
        ) : focusGroups.length > 0 ? (
          focusGroups.map((g, i) => (
            <div
              key={i}
              style={{ background: tokens.surfaceCard, borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: `1px solid ${tokens.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${g.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={15} color={g.color} />
                </div>
                <div>
                  <div style={{ fontSize: 14, color: tokens.textPrimary, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: tokens.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{g.count} 条待强化</div>
                </div>
              </div>
              <button style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: tokens.gold, color: "#181410", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: "pointer" }}>
                开始特训
              </button>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: tokens.textSecondary, fontSize: 14 }}>
            🎉 所有错题已消灭，暂无待强化专项
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          record={reviewing}
          onClose={() => setReviewing(null)}
          onComplete={(id) => { handleComplete(id); setReviewing(null); }}
        />
      )}
    </div>
  );
}
