'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LiteModeToggle } from '@/components/layout/ClientLayout';

const fadeUp = {
  initial: { opacity: 0, y: 35 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
} as const;

const cascadeItem = {
  initial: { opacity: 0, y: 25 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
};

const textRevealContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    }
  }
};

const textWord = {
  hidden: { opacity: 0, y: 35 },
  show: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
};

// ----------------------------------------------------------------------
// Spotlight Card Component (Doppelrand with Interactive Mouse Spotlight)
// ----------------------------------------------------------------------
interface SpotlightCardProps {
  children: React.ReactNode;
  outerClassName?: string;
  innerClassName?: string;
  emoji: string;
  number: string;
  title: string;
  conceptColor: string;
}

function SpotlightCard({
  children,
  outerClassName = '',
  innerClassName = '',
  emoji,
  number,
  title,
  conceptColor,
}: SpotlightCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative bg-white/[0.015] border border-white/[0.04] rounded-[1.8rem] p-1.5 shadow-sm overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${outerClassName}`}
      style={{
        ...({
          '--mouse-x': `${coords.x}px`,
          '--mouse-y': `${coords.y}px`,
        } as React.CSSProperties),
      }}
    >
      {/* Background Spotlight layer */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(150px circle at var(--mouse-x) var(--mouse-y), rgba(0, 255, 157, 0.08), transparent 80%)`,
        }}
      />
      
      {/* Border Spotlight highlight layer */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-[1.8rem] border border-brand-accent/20 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          maskImage: `radial-gradient(150px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
          WebkitMaskImage: `radial-gradient(150px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
        }}
      />
      
      {/* Inner Card Container */}
      <div className={`relative bg-[#080808]/90 border border-white/[0.01] rounded-[calc(1.8rem-0.375rem)] p-6 space-y-4 h-full flex flex-col justify-between z-10 ${innerClassName}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-300 ${isHovered ? 'text-brand-accent' : 'text-text-secondary/40'}`}>
              {number}
            </span>
            <span className={`text-lg transition-transform duration-500 ${isHovered ? 'scale-125 rotate-6' : ''}`}>
              {emoji}
            </span>
          </div>
          <h4 className="text-base font-medium text-text-primary transition-colors duration-300 group-hover:text-brand-accent">
            {title}
          </h4>
          <div className="text-xs text-text-secondary leading-relaxed font-light">
            {children}
          </div>
        </div>
        
        {/* Underline concept line */}
        <div className="w-full h-[1px] bg-white/[0.02] relative overflow-hidden mt-2">
          <div 
            className="absolute top-0 bottom-0 left-0 w-0 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              width: isHovered ? '100%' : '0%',
              backgroundColor: conceptColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main HomeSection
// ----------------------------------------------------------------------
export function HomeSection({ onStartChat }: { onStartChat: () => void }) {
  const [coordsLoop, setCoordsLoop] = useState({ x: 0, y: 0 });
  const [isLoopHovered, setIsLoopHovered] = useState(false);

  const handleLoopMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoordsLoop({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
            Learniny Alpha
          </motion.div>
          
          {/* Kinetic Text Reveal Header */}
          <motion.h1
            variants={textRevealContainer}
            initial="hidden"
            animate="show"
            className="text-4xl lg:text-6xl font-display font-semibold leading-[1.1] text-text-primary tracking-tight"
          >
            <span className="block overflow-hidden py-0.5">
              <motion.span variants={textWord} className="block">用对话练英语</motion.span>
            </span>
            <span className="block overflow-hidden py-0.5 bg-gradient-to-r from-brand-accent via-brand-accent to-[#00E5FF] bg-clip-text text-transparent italic font-normal drop-shadow-[0_0_15px_rgba(0,255,157,0.2)]">
              <motion.span variants={textWord} className="block">越说越自信</motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-sm lg:text-base text-text-secondary font-light leading-relaxed max-w-md"
          >
            AI 不给标准答案，而是用<span className="text-brand-hint font-medium">启发式提问</span>引导你自己发现语法规律。像和朋友聊天一样，在真实语境中把英语磨练成你的<span className="text-brand-accent font-medium">第二直觉</span>。
          </motion.p>

          {/* Minimalist Action Link with custom circular arrow transition */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 lg:mt-10"
          >
            <button
              onClick={onStartChat}
              className="group relative inline-flex items-center gap-3 text-sm font-mono tracking-wider text-brand-accent font-bold cursor-pointer transition-all duration-300"
            >
              <span>立即开启对话 / START CHAT</span>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/10 border border-brand-accent/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-brand-accent group-hover:text-black">
                <span className="text-xs transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:scale-110">→</span>
              </span>
              <span className="absolute bottom-[-6px] left-0 w-0 h-[1.5px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
            </button>
          </motion.div>

          {/* Particle Toggle under left panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 1.5, delay: 0.7 }}
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
              
              {/* Flowing neon timeline line */}
              <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-white/5 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-brand-accent/60 to-transparent animate-flow-line" />
              </div>
              
              {/* Before Node */}
              <motion.div {...cascadeItem} className="relative group">
                {/* Node dot */}
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-white/10 bg-app-bg flex items-center justify-center transition-all duration-500 group-hover:border-white/30 z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-secondary/40 mb-1.5">使用之前 / TRADITIONAL LEARNING</div>
                <h3 className="text-base md:text-lg font-medium text-text-secondary leading-snug mb-2">背了很多单词和语法规则，一开口还是不敢说、说不顺</h3>
                <p className="text-xs text-text-secondary/60 leading-relaxed font-light">
                  传统学习侧重于生硬记忆标准答案。在实际沟通中需要在脑海中检索词库并套用语法结构，造成严重的思考滞后与表达卡顿。
                </p>
              </motion.div>

              {/* After Node */}
              <motion.div {...cascadeItem} className="relative group">
                {/* Node dot with glow */}
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-brand-accent/40 bg-app-bg flex items-center justify-center shadow-[0_0_10px_rgba(0,255,157,0.25)] transition-all duration-500 group-hover:border-brand-accent z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-brand-accent/60 mb-1.5">使用之后 / INTUITIVE ACQUISITION</div>
                <h3 className="text-base md:text-lg font-medium text-text-primary leading-snug mb-2">不用刻意想语法，英语自然脱口而出</h3>
                <p className="text-xs text-text-secondary/80 leading-relaxed font-light">
                  基于二语习得理念，通过启发式对话在真实上下文中主动探索。犯错会被即时诊断并引导改写，在不断的语境复用中固化为直接的表达直觉。
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
              <p className="mt-4 text-xs md:text-sm text-text-secondary leading-relaxed font-light max-w-xl">
                Learniny 的核心是：让你在真实表达里暴露问题、马上纠正、再带回到新的语境里复用。你练到的不是孤立的模板，而是一套可以自如迁移的口语直觉。
              </p>
            </div>
            
            {/* Features Double-Bezel Card Grid with Mouse Position Follower Spotlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Practice */}
              <SpotlightCard
                number="01 / PRACTICE"
                emoji="💬"
                title="像聊天一样开口"
                conceptColor="#00E5FF"
              >
                你说一句，AI 回一句，并用启发式问题引导你深入对话。重点是“持续输出”，在真实心流中训练表达。
              </SpotlightCard>

              {/* Feedback */}
              <SpotlightCard
                number="02 / FEEDBACK"
                emoji="⚡"
                title="纠错只抓关键点"
                conceptColor="#00FF9D"
              >
                拒绝繁琐语法教条：只挑出影响交流的语法盲区或中式英语，提供原地替换的极简自然口语表达。
              </SpotlightCard>

              {/* Review */}
              <SpotlightCard
                number="03 / REVIEW"
                emoji="🔄"
                title="错题本两步强化"
                conceptColor="#FFFFFF"
              >
                先把偏差句改写正确，再在系统随机模拟的全新生活场景中输出该表达。彻底打通遗忘曲线。
              </SpotlightCard>

              {/* Discovery */}
              <SpotlightCard
                number="04 / DISCOVERY"
                emoji="🌌"
                title="星图可视化成长"
                conceptColor="#C9A15D"
              >
                将你的核心薄弱项和已掌握句型，在 3D 旋转星系中连点成线展示，学习进度和盲区一目了然。
              </SpotlightCard>

            </div>
          </motion.div>

          {/* THE LOOP 聚光灯大卡片 */}
          <motion.div 
            {...fadeUp}
            onMouseMove={handleLoopMouseMove}
            onMouseEnter={() => setIsLoopHovered(true)}
            onMouseLeave={() => setIsLoopHovered(false)}
            className="relative bg-white/[0.01] border border-white/[0.03] rounded-[1.8rem] p-1.5 shadow-sm overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px] text-left"
            style={{
              ...({
                '--mouse-x': `${coordsLoop.x}px`,
                '--mouse-y': `${coordsLoop.y}px`,
              } as React.CSSProperties),
            }}
          >
            {/* Background Spotlight layer */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
              style={{
                opacity: isLoopHovered ? 1 : 0,
                background: `radial-gradient(250px circle at var(--mouse-x) var(--mouse-y), rgba(0, 229, 255, 0.06), transparent 80%)`,
              }}
            />
            
            {/* Border Spotlight highlight layer */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-[1.8rem] border border-brand-accent/20 z-0"
              style={{
                opacity: isLoopHovered ? 1 : 0,
                maskImage: `radial-gradient(250px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
                WebkitMaskImage: `radial-gradient(250px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
              }}
            />

            <div className="relative bg-[#050505]/95 border border-white/[0.015] rounded-[calc(1.8rem-0.375rem)] p-6 space-y-3 z-10">
              <div className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-300 ${isLoopHovered ? 'text-brand-accent' : 'text-text-secondary/40'}`}>
                成长闭环 / THE CYCLE
              </div>
              <h3 className="text-base md:text-lg font-medium text-text-primary">
                练习 → 自动捕捉错误 → 温习强化 → 带回对话继续用
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-light">
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
