'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiteModeToggle } from '@/components/layout/ClientLayout';

const BEFORE_AFTER = [
  {
    id: 'before',
    label: '用之前',
    labelColor: 'text-text-secondary/60',
    text: '背了很多单词和语法规则，\n一开口还是不敢说、说不顺。',
    textColor: 'text-text-secondary',
  },
  {
    id: 'after',
    label: '用之后',
    labelColor: 'text-brand-accent/80',
    text: '不用刻意想语法，\n英语自然脱口而出。',
    textColor: 'text-text-primary',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
} as const;

export function HomeSection({ onStartChat: _onStartChat }: { onStartChat: () => void }) {
  const [baIndex, setBaIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBaIndex((prev) => (prev + 1) % BEFORE_AFTER.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const current = BEFORE_AFTER[baIndex];
  return (
    <div className="w-full h-full overflow-y-auto overscroll-contain pb-safe">
      {/* Hero (full viewport) */}
      <div className="min-h-[100dvh] flex flex-col justify-center px-6 md:px-12 max-w-7xl mx-auto pointer-events-auto items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(40px)', rotateX: -25, y: 80 }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', rotateX: 0, y: 0 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mt-12"
          style={{ transformPerspective: 1200 }}
        >
          {/* Hero headline */}
          <h1 className="text-5xl md:text-7xl font-display font-semibold leading-[1.15] mb-6 text-text-primary drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            用对话练英语<br />
            <span className="italic font-normal text-brand-accent drop-shadow-[0_0_15px_rgba(0,255,157,0.4)]">越说越自信</span>
          </h1>

          {/* One-line value proposition */}
          <p className="text-lg md:text-xl text-text-secondary font-light leading-relaxed max-w-xl mx-auto mb-10">
            AI 不给标准答案，而是用<span className="text-brand-hint font-medium">启发式提问</span>引导你自己发现语法规律——
            <br className="hidden md:block" />
            像和朋友聊天一样，把英语变成你的<span className="text-brand-accent font-medium">直觉</span>。
          </p>
        </motion.div>

        {/* Before → After (below fold, scroll to reveal), crossfade between two states */}
        <motion.div
          {...fadeUp}
          className="w-full max-w-lg p-6 md:p-8"
        >
          <div className="flex flex-col items-center gap-2 min-h-[5rem] justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="flex flex-col items-center"
              >
                <div className={`text-[10px] font-mono uppercase tracking-widest mb-2 ${current.labelColor}`}>
                  {current.label}
                </div>
                <p className={`text-sm leading-relaxed text-center ${current.textColor}`}>
                  {current.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {BEFORE_AFTER.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === baIndex ? 'bg-brand-accent w-3' : 'bg-text-secondary/30'
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* Scroll hint */}
        <div className="mt-12 flex flex-col items-center gap-2 text-[10px] text-text-secondary/50 font-mono tracking-widest uppercase">
          <div className="w-6 h-6 rounded-full border border-divider/60 grid place-items-center animate-bounce">↓</div>
          <div>Scroll for details</div>
        </div>

        {/* Particle toggle — sits within the page, not fixed floating */}
        <div className="mt-8 flex justify-center">
          <LiteModeToggle />
        </div>
      </div>

      {/* Project intro (scroll into view) */}
      <div className="px-6 md:px-12 max-w-5xl mx-auto pb-24">
        <motion.div {...fadeUp} className="text-left">
          <div className="text-[10px] text-text-secondary/60 font-mono uppercase tracking-widest mb-3">项目介绍</div>
          <h2 className="text-2xl md:text-3xl font-display font-semibold text-text-primary leading-tight">
            不是背答案，而是把“会说”练出来
          </h2>
          <p className="mt-4 text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Learniny 的核心是：让你在真实表达里暴露问题、马上纠正、再带回到新的语境里复用。
            你练到的不是句子，而是一套可迁移的表达直觉。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div {...fadeUp} className="bg-surface-card/55 backdrop-blur-xl border border-divider/40 rounded-2xl p-6">
            <div className="text-[10px] text-text-secondary/60 font-mono uppercase tracking-widest mb-2">Practice</div>
            <div className="text-lg font-medium text-text-primary mb-2">像聊天一样开口</div>
            <p className="text-sm text-text-secondary leading-relaxed">
              你说一句，AI 回一句，并用问题把你引到更自然的表达上。
              重点是“继续说下去”，而不是一次说对。
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="bg-surface-card/55 backdrop-blur-xl border border-divider/40 rounded-2xl p-6">
            <div className="text-[10px] text-text-secondary/60 font-mono uppercase tracking-widest mb-2">Feedback</div>
            <div className="text-lg font-medium text-text-primary mb-2">纠错只抓关键点</div>
            <p className="text-sm text-text-secondary leading-relaxed">
              不把你淹没在规则里：只指出当前最影响表达的错误，并给出可替换的自然说法。
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="bg-surface-card/55 backdrop-blur-xl border border-divider/40 rounded-2xl p-6">
            <div className="text-[10px] text-text-secondary/60 font-mono uppercase tracking-widest mb-2">Review</div>
            <div className="text-lg font-medium text-text-primary mb-2">错题本两步强化</div>
            <p className="text-sm text-text-secondary leading-relaxed">
              先把句子纠正到位，再用新的场景让你把正确表达说出来。
              这一步是“变成你的”。
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="bg-surface-card/55 backdrop-blur-xl border border-divider/40 rounded-2xl p-6">
            <div className="text-[10px] text-text-secondary/60 font-mono uppercase tracking-widest mb-2">Discovery</div>
            <div className="text-lg font-medium text-text-primary mb-2">知识星图可视化成长</div>
            <p className="text-sm text-text-secondary leading-relaxed">
              把你常犯的问题聚合成主题节点：你在练什么、卡在哪里，一眼就能看见。
            </p>
          </motion.div>
        </div>

        <motion.div
          {...fadeUp}
          className="mt-10 bg-brand-accent/6 border border-brand-accent/20 rounded-2xl p-6 text-left"
        >
          <div className="text-[10px] text-brand-accent/80 font-mono uppercase tracking-widest mb-2">How it flows</div>
          <div className="text-sm md:text-base text-text-primary leading-relaxed">
            练习 → 自动捕捉错误 → 温习强化 → 带回对话继续用
            <span className="text-text-secondary">（循环越多，表达越稳）</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
