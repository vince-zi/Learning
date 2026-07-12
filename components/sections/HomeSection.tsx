'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LiteModeToggle } from '@/components/layout/ClientLayout';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
} as const;

const cascadeItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
};

export function HomeSection({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="w-full h-full overflow-y-auto overscroll-contain pb-safe scrollbar-none text-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-32 flex flex-col md:flex-row items-start gap-16 lg:gap-24 pointer-events-auto">
        
        {/* 左侧：固定文案与行动导向区 */}
        <div className="w-full md:w-5/12 md:sticky md:top-24 flex flex-col items-start text-left">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-brand-accent/10 border border-brand-accent/30 text-[9px] uppercase tracking-[0.2em] font-mono text-brand-accent mb-6"
          >
            <span className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
            Learniny Alpha
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl lg:text-6xl font-display font-semibold leading-[1.1] text-text-primary tracking-tight"
          >
            用对话练英语<br />
            <span className="bg-gradient-to-r from-brand-accent via-brand-accent to-[#00E5FF] bg-clip-text text-transparent italic font-normal drop-shadow-[0_0_15px_rgba(0,255,157,0.2)]">越说越自信</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-sm lg:text-base text-text-secondary font-light leading-relaxed max-w-md"
          >
            AI 不给标准答案，而是用<span className="text-brand-hint font-medium">启发式提问</span>引导你自己发现语法规律。像和朋友聊天一样，在真实语境中把英语磨练成你的<span className="text-brand-accent font-medium">第二直觉</span>。
          </motion.p>

          {/* Minimalist Action Link */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 lg:mt-10"
          >
            <button
              onClick={onStartChat}
              className="group relative inline-flex items-center gap-2 text-sm font-mono tracking-wider text-brand-accent font-bold cursor-pointer"
            >
              <span>立即开启对话 / START CHAT</span>
              <span className="text-xs transition-transform duration-300 group-hover:translate-x-1">→</span>
              <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
            </button>
          </motion.div>

          {/* Particle Toggle under left panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1.5, delay: 0.6 }}
            className="mt-20 hidden md:flex flex-col items-start gap-1.5 hover:opacity-100 transition-opacity"
          >
            <LiteModeToggle />
            <span className="text-[9px] text-text-secondary/40 font-mono">提示：手机端为降低能耗，建议不要开启粒子特效</span>
          </motion.div>
        </div>

        {/* 右侧：滚动详情流 */}
        <div className="w-full md:w-7/12 flex flex-col gap-20 lg:gap-28">
          
          {/* 时轴对比区 */}
          <motion.div {...fadeUp} className="flex flex-col text-left">
            <div className="text-[10px] text-text-secondary/50 font-mono uppercase tracking-[0.2em] mb-8">时轴对比 / PROGRESSION</div>
            <div className="relative pl-8 border-l border-white/5 space-y-12">
              {/* 流光动画线 */}
              <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-brand-accent/40 via-[#00E5FF]/20 to-transparent" />
              
              {/* Before Node */}
              <motion.div {...cascadeItem} className="relative group">
                {/* Node dot */}
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-white/10 bg-app-bg flex items-center justify-center transition-all duration-500 group-hover:border-white/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-secondary/40 mb-1.5">使用之前 / TRADITIONAL LEARNING</div>
                <h3 className="text-base md:text-lg font-medium text-text-secondary leading-snug mb-2">背了很多单词和语法规则，一开口还是不敢说、说不顺</h3>
                <p className="text-xs text-text-secondary/60 leading-relaxed">
                  传统学习侧重于生硬记忆标准答案。在实际沟通中需要在大脑中进行中英翻译与规则校验，导致表达严重卡顿和挫败感。
                </p>
              </motion.div>

              {/* After Node */}
              <motion.div {...cascadeItem} className="relative group">
                {/* Node dot with glow */}
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-brand-accent/40 bg-app-bg flex items-center justify-center shadow-[0_0_10px_rgba(0,255,157,0.25)] transition-all duration-500 group-hover:border-brand-accent">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-brand-accent/60 mb-1.5">使用之后 / INTUITIVE ACQUISITION</div>
                <h3 className="text-base md:text-lg font-medium text-text-primary leading-snug mb-2">不用刻意想语法，英语自然脱口而出</h3>
                <p className="text-xs text-text-secondary/80 leading-relaxed">
                  基于克拉申的输入假说，通过 ZPD（最近发展区）启发式对话将错误即时纠正，并在下一个场景中立即应用，从而内化成直接的母语般表达直觉。
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* 项目介绍与卡片网格 */}
          <motion.div {...fadeUp} className="text-left space-y-8">
            <div>
              <div className="text-[10px] text-text-secondary/50 font-mono uppercase tracking-[0.2em] mb-2">项目介绍 / PHILOSOPHY</div>
              <h2 className="text-2xl md:text-3xl font-display font-semibold text-text-primary leading-tight">
                不是背答案，而是把“会说”练出来
              </h2>
              <p className="mt-4 text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
                Learniny 的核心是：让你在真实表达里暴露问题、马上纠正、再带回到新的语境里复用。你练到的不是孤立的句子，而是一套可迁移的表达直觉。
              </p>
            </div>
            
            {/* Features Double-Bezel Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Practice */}
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-[1.5rem] p-1.5 shadow-sm">
                <div className="bg-[#080808] border border-white/[0.02] rounded-[calc(1.5rem-0.375rem)] p-5 space-y-3 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#00E5FF] font-mono tracking-widest uppercase">01 / PRACTICE</span>
                      <span className="text-sm">💬</span>
                    </div>
                    <h4 className="text-base font-medium text-text-primary">像聊天一样开口</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      你说一句，AI 回一句，并用启发式问题引导你深入对话。重点是“持续输出”，在真实心流中训练表达。
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-[1.5rem] p-1.5 shadow-sm">
                <div className="bg-[#080808] border border-white/[0.02] rounded-[calc(1.5rem-0.375rem)] p-5 space-y-3 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#00FF9D] font-mono tracking-widest uppercase">02 / FEEDBACK</span>
                      <span className="text-sm">⚡</span>
                    </div>
                    <h4 className="text-base font-medium text-text-primary">纠错只抓关键点</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      拒绝繁琐语法教条：只挑出影响交流的语法盲区或中式英语，提供原地替换的极简自然口语表达。
                    </p>
                  </div>
                </div>
              </div>

              {/* Review */}
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-[1.5rem] p-1.5 shadow-sm">
                <div className="bg-[#080808] border border-white/[0.02] rounded-[calc(1.5rem-0.375rem)] p-5 space-y-3 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#FFFFFF] font-mono tracking-widest uppercase">03 / REVIEW</span>
                      <span className="text-sm">🔄</span>
                    </div>
                    <h4 className="text-base font-medium text-text-primary">错题本两步强化</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      先把偏差句改写正确，再在系统随机模拟的全新生活场景中输出该表达。彻底打通遗忘曲线。
                    </p>
                  </div>
                </div>
              </div>

              {/* Discovery */}
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-[1.5rem] p-1.5 shadow-sm">
                <div className="bg-[#080808] border border-white/[0.02] rounded-[calc(1.5rem-0.375rem)] p-5 space-y-3 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-brand-hint font-mono tracking-widest uppercase">04 / DISCOVERY</span>
                      <span className="text-sm">🌌</span>
                    </div>
                    <h4 className="text-base font-medium text-text-primary">星图可视化成长</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      将你的核心薄弱项和已掌握句型，在 3D 旋转星系中连点成线展示，学习进度和盲区一目了然。
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* THE LOOP 双层框线大卡片 */}
          <motion.div {...fadeUp} className="bg-white/[0.01] border border-white/[0.03] rounded-[1.8rem] p-1.5 shadow-sm text-left">
            <div className="bg-[#050505] border border-white/[0.015] rounded-[calc(1.8rem-0.375rem)] p-6 space-y-3">
              <div className="text-[9px] text-brand-accent/70 font-mono uppercase tracking-[0.2em]">成长闭环 / THE CYCLE</div>
              <h3 className="text-base md:text-lg font-medium text-text-primary">练习 → 自动捕捉错误 → 温习强化 → 带回对话继续用</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Learniny 绝非简单的背题库，而是一套自我进化学习的精密闭环。您说的每一句话都是精心画像的材料，在“对话-感知-矫正-再次对话”的闭环中周而复始，英语直觉螺旋上升。
              </p>
            </div>
          </motion.div>

          {/* Particle Toggle for Mobile only */}
          <div className="mt-4 flex md:hidden flex-col items-center gap-1.5 opacity-60">
            <LiteModeToggle />
            <span className="text-[9px] text-text-secondary/40 font-mono text-center">提示：手机端为降低能耗，建议不要开启粒子特效</span>
          </div>

        </div>

      </div>
    </div>
  );
}
