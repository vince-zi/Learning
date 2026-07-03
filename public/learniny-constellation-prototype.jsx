import React, { useState } from "react";
import { X, Sparkles, Lock, ChevronRight, Orbit } from "lucide-react";

/* ============================================================
   DESIGN TOKENS (matches conversation-interface prototype)
   ============================================================ */
const tokens = {
  bg: "#10141F",
  bgGradient: "radial-gradient(ellipse at 50% 0%, #1A2236 0%, #10141F 55%)",
  surfaceAI: "#1A2030",
  textPrimary: "#EDE9E1",
  textSecondary: "#8A93A6",
  textOnUser: "#191B1F",
  gold: "#C9A15D",
  goldSoft: "#C9A15D33",
  teal: "#6FA8B5",
  tealSoft: "#6FA8B522",
  coral: "#B5675A",
  sage: "#7FA37A",
  locked: "#3A4152",
  divider: "#2A3142",
};

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

/* ============================================================
   NODE GRAPH DATA — 4 layers, 9 nodes
   Layout is hand-placed on a 0-400 x 0-620 canvas.
   status: mastered | active | progress | locked
   ============================================================ */
const nodes = [
  { id: "n1", label: "自我介绍", layer: 1, x: 200, y: 560, status: "mastered", mastery: 100 },

  { id: "n2", label: "日常习惯", layer: 2, x: 120, y: 450, status: "mastered", mastery: 100 },
  { id: "n3", label: "喜好表达", layer: 2, x: 280, y: 450, status: "mastered", mastery: 86 },

  { id: "n4", label: "场景应对", layer: 3, x: 90, y: 330, status: "active", mastery: 54 },
  { id: "n5", label: "提问艺术", layer: 3, x: 210, y: 330, status: "progress", mastery: 22 },
  { id: "n6", label: "观点论证", layer: 3, x: 330, y: 330, status: "locked", mastery: 0 },

  { id: "n7", label: "比较讨论", layer: 4, x: 100, y: 190, status: "locked", mastery: 0 },
  { id: "n8", label: "叙事故事", layer: 4, x: 220, y: 190, status: "locked", mastery: 0 },
  { id: "n9", label: "抽象思维", layer: 4, x: 340, y: 190, status: "locked", mastery: 0 },
];

const edges = [
  ["n1", "n2"], ["n1", "n3"],
  ["n2", "n4"], ["n2", "n5"],
  ["n3", "n5"], ["n3", "n6"],
  ["n4", "n7"], ["n5", "n7"], ["n5", "n8"], ["n6", "n8"], ["n6", "n9"],
];

const statusColor = (status) => {
  if (status === "mastered") return tokens.gold;
  if (status === "active") return tokens.teal;
  if (status === "progress") return "#5A6478";
  return tokens.locked;
};

function nodeById(id) {
  return nodes.find((n) => n.id === id);
}

/* ============================================================
   STAR node
   ============================================================ */
function Star({ node, onSelect, isSelected }) {
  const color = statusColor(node.status);
  const isDim = node.status === "locked";
  const r = node.status === "mastered" ? 9 : node.status === "active" ? 8 : 6;

  return (
    <g
      onClick={() => onSelect(node)}
      style={{ cursor: "pointer" }}
      opacity={isDim ? 0.55 : 1}
    >
      {node.status === "active" && (
        <circle cx={node.x} cy={node.y} r={r + 10} fill="none" stroke={tokens.teal} strokeWidth={1}>
          <animate attributeName="r" values={`${r + 6};${r + 16};${r + 6}`} dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      {node.status === "mastered" && (
        <circle cx={node.x} cy={node.y} r={r + 7} fill={color} opacity={0.18} />
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        fill={isDim ? "none" : color}
        stroke={isDim ? tokens.locked : "none"}
        strokeWidth={isDim ? 1.5 : 0}
      />
      {isSelected && (
        <circle cx={node.x} cy={node.y} r={r + 5} fill="none" stroke={tokens.textPrimary} strokeWidth={1.2} />
      )}
      {isDim && (
        <Lock x={node.x - 4} y={node.y - 4} width={8} height={8} color={tokens.textSecondary} />
      )}
      <text
        x={node.x}
        y={node.y + r + 16}
        textAnchor="middle"
        fill={isDim ? tokens.textSecondary : tokens.textPrimary}
        fontFamily="Inter, sans-serif"
        fontSize="11"
        fontWeight={node.status === "active" ? 600 : 400}
      >
        {node.label}
      </text>
    </g>
  );
}

/* ============================================================
   BOTTOM SHEET — node detail
   ============================================================ */
function NodeSheet({ node, onClose }) {
  const color = statusColor(node.status);
  const statusLabel = {
    mastered: "已掌握",
    active: "学习进行中",
    progress: "学习进行中",
    locked: "未解锁",
  }[node.status];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#00000066",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: tokens.surfaceAI,
          clipPath: "polygon(0% 14px, 6% 0%, 94% 0%, 100% 14px, 100% 100%, 0% 100%)",
          padding: "22px 20px 26px",
          animation: "slideUp 0.28s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: tokens.textPrimary }}>
              {node.label}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color,
                marginTop: 4,
              }}
            >
              {statusLabel} {node.status !== "locked" && `· ${node.mastery}%`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: tokens.textSecondary, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {node.status !== "locked" ? (
          <>
            <div style={{ height: 6, borderRadius: 4, background: "#ffffff10", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ width: `${node.mastery}%`, height: "100%", background: color, borderRadius: 4 }} />
            </div>
            <button
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              继续这个节点 <ChevronRight size={15} />
            </button>
          </>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: tokens.textSecondary,
              lineHeight: 1.6,
              padding: "12px 14px",
              background: "#ffffff08",
              borderRadius: 10,
              borderLeft: `2px solid ${tokens.locked}`,
            }}
          >
            先完成前置节点，解锁后即可开始学习。
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN
   ============================================================ */
export default function LearninyConstellation() {
  const [selected, setSelected] = useState(null);

  const masteredCount = nodes.filter((n) => n.status === "mastered").length;

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
      <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${tokens.divider}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: tokens.textPrimary }}>
              英语直觉网络
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: tokens.textSecondary,
                marginTop: 4,
              }}
            >
              {masteredCount} / {nodes.length} 已点亮 · B1 → B2 进行中
            </div>
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: tokens.tealSoft,
              border: `1px solid ${tokens.teal}44`,
              borderRadius: 8,
              padding: "6px 10px",
              color: tokens.teal,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
            }}
          >
            <Orbit size={13} /> 探索模式
          </button>
        </div>
      </div>

      {/* constellation canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <svg viewBox="0 0 400 620" width="100%" height="100%" style={{ display: "block" }}>
          {/* ambient scattered background stars */}
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={`bg-${i}`}
              cx={(i * 53) % 400}
              cy={(i * 97) % 620}
              r={Math.random() * 0.8 + 0.3}
              fill="#8A93A6"
              opacity={0.35}
            />
          ))}

          {/* edges */}
          {edges.map(([a, b], i) => {
            const na = nodeById(a);
            const nb = nodeById(b);
            const bothLit = na.status !== "locked" && nb.status !== "locked";
            return (
              <line
                key={i}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke={bothLit ? tokens.gold : tokens.divider}
                strokeWidth={bothLit ? 1.2 : 1}
                opacity={bothLit ? 0.5 : 0.4}
                strokeDasharray={bothLit ? "0" : "3,4"}
              />
            );
          })}

          {/* nodes */}
          {nodes.map((n) => (
            <Star key={n.id} node={n} onSelect={setSelected} isSelected={selected?.id === n.id} />
          ))}
        </svg>

        {/* legend */}
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 20,
            display: "flex",
            gap: 14,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: tokens.textSecondary,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.gold, display: "inline-block" }} /> 已掌握
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.teal, display: "inline-block" }} /> 进行中
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1px solid ${tokens.locked}`, display: "inline-block" }} /> 未解锁
          </span>
        </div>
      </div>

      {selected && <NodeSheet node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
