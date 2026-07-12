'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiteModeToggle } from '@/components/layout/ClientLayout';

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
      <div className={`relative bg-[#080808]/90 border border-white/[0.01] rounded-[calc(1.8rem-0.375rem)] p-5 space-y-3 h-full flex flex-col justify-between z-10 ${innerClassName}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-300 ${isHovered ? 'text-brand-accent' : 'text-text-secondary/40'}`}>
              {number}
            </span>
            <span className={`text-base transition-transform duration-500 ${isHovered ? 'scale-125 rotate-6' : ''}`}>
              {emoji}
            </span>
          </div>
          <h4 className="text-sm md:text-base font-medium text-text-primary transition-colors duration-300">
            {title}
          </h4>
          <div className="text-[11px] md:text-xs text-text-secondary leading-relaxed font-light">
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
// Main HomeSection (Gesture-Controlled Frame Transition Panels)
// ----------------------------------------------------------------------
export function HomeSection({ onStartChat }: { onStartChat: () => void }) {
  const [activeFrame, setActiveFrame] = useState(1);
  const lastTransitionTime = useRef(0);
  const touchStartY = useRef(0);

  const transitionTo = (nextFrame: number) => {
    const now = Date.now();
    if (now - lastTransitionTime.current < 750) return; // rate limit frame switching to match transition duration
    if (nextFrame < 1 || nextFrame > 4) return;
    setActiveFrame(nextFrame);
    lastTransitionTime.current = now;
  };

  // Capture desktop mouse wheel scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 15) return;
    if (e.deltaY > 0) {
      transitionTo(activeFrame + 1);
    } else {
      transitionTo(activeFrame - 1);
    }
  };

  // Capture mobile touch swipes
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    if (Math.abs(deltaY) > 40) {
      if (deltaY > 0) {
        transitionTo(activeFrame + 1);
      } else {
        transitionTo(activeFrame - 1);
      }
    }
  };

  // Framer Motion panel exit/enter transitions
  const panelVariants = {
    hiddenEnter: {
      opacity: 0,
      scale: 1.02,
      y: 40,
      pointerEvents: 'none' as const,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      pointerEvents: 'auto' as const,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }
    },
    hiddenExit: {
      opacity: 0,
      scale: 0.96,
      y: -40,
      pointerEvents: 'none' as const,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }
    }
  };

  const getPanelState = (index: number) => {
    if (activeFrame === index) return 'visible';
    if (activeFrame > index) return 'hiddenExit';
    return 'hiddenEnter';
  };

  return (
    <div 
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full text-[#FFFFFF] relative overflow-hidden select-none"
    >
      {/* Scene 1: Conceptual Spatial Hero (Frame 1) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(1)}
        className="absolute inset-0 w-full h-full flex flex-col justify-center items-center"
        style={{ pointerEvents: activeFrame === 1 ? 'auto' : 'none' }}
      >
        {/* Desktop Layout: corners layout */}
        <div className="hidden md:flex absolute inset-0 w-full h-full max-w-7xl mx-auto px-6 md:px-12 py-12 flex-col justify-between pointer-events-none">
          {/* Top row */}
          <div className="w-full flex justify-between items-center pointer-events-auto">
            <div className="text-[10px] font-mono tracking-[0.25em] text-text-secondary/40 uppercase">
              LEARNINY // CONCEPT 01
            </div>
            <div className="text-[9px] text-[#00E5FF]/60 font-mono tracking-[0.25em] uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
              ALPHA ACTIVE
            </div>
          </div>

          {/* Center concept word */}
          <div className="flex flex-col items-center justify-center pointer-events-auto py-12">
            <h1 className="text-7xl md:text-9xl font-display font-light tracking-[0.3em] text-white/95 uppercase drop-shadow-[0_0_35px_rgba(255,255,255,0.04)] pl-[0.3em] leading-none">
              INTUITION
            </h1>
            <div className="text-xs md:text-sm lg:text-base font-mono tracking-[0.4em] text-text-secondary/80 uppercase mt-6 pl-[0.4em]">
              在对话中重建英语直觉
            </div>
          </div>

          {/* Bottom row */}
          <div className="w-full flex flex-col md:flex-row justify-between items-end gap-8 pointer-events-auto">
            {/* Bottom Left: Poetic caption */}
            <div className="text-xs md:text-sm lg:text-base text-text-secondary/80 leading-relaxed font-light tracking-wide max-w-sm text-left">
              不背单词，不记词典里死板的条框。<br />
              AI 在自然的交流中进行启发式引导，<br />
              在潜移默化中，将英语内化为你大脑的表达本能。
            </div>

            {/* Bottom Right: Monospace Action link */}
            <div className="flex flex-col items-end gap-4">
              <button
                onClick={onStartChat}
                className="group relative inline-flex items-center gap-3 text-xs font-mono tracking-widest text-brand-accent font-bold cursor-pointer transition-all duration-300"
              >
                <span>[ START CHAT // 立即开启 ]</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
              </button>
              <div className="text-[8px] text-text-secondary/20 font-mono uppercase tracking-widest mt-1">
                SCROLL DOWN TO LEARN MORE
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout: Stacked Editorial Cover */}
        <div className="flex md:hidden flex-col items-center justify-between w-full h-full px-6 py-12 text-center pointer-events-auto">
          {/* Top row */}
          <div className="text-[9px] text-[#00E5FF]/60 font-mono tracking-[0.2em] uppercase flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            LEARNINY // CONCEPT 01
          </div>

          {/* Center */}
          <div className="flex flex-col items-center justify-center py-6">
            <h1 className="text-5xl font-display font-light tracking-[0.22em] text-white/95 uppercase pl-[0.22em] leading-none">
              INTUITION
            </h1>
            <div className="text-[10px] font-mono tracking-[0.3em] text-text-secondary/80 uppercase mt-4 pl-[0.3em]">
              在对话中重建英语直觉
            </div>
          </div>

          {/* Bottom info */}
          <div className="space-y-8 w-full flex flex-col items-center mb-4">
            <div className="text-xs text-text-secondary/80 leading-relaxed font-light tracking-wide max-w-xs">
              不背单词，不记词典里死板的条框。<br />
              AI 在自然的交流中进行启发式引导，<br />
              在潜移默化中，将英语内化为你大脑的表达本能。
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onStartChat}
                className="group relative inline-flex items-center gap-3 text-xs font-mono tracking-widest text-brand-accent font-bold cursor-pointer transition-all duration-300"
              >
                <span>[ START CHAT // 立即开启 ]</span>
                <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-brand-accent transition-all duration-500 group-hover:w-full" />
              </button>
              <span className="text-[8px] text-text-secondary/30 font-mono tracking-widest uppercase animate-pulse mt-2">
                向上滑动探索更多 ↓
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scene 2: Split Flowing Timeline (Frame 2) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(2)}
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{ pointerEvents: activeFrame === 2 ? 'auto' : 'none' }}
      >
        <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Left Header info */}
          <div className="w-full md:w-5/12 text-left space-y-4">
            <div className="text-[9px] text-[#00E5FF] font-mono tracking-[0.25em] uppercase">转变过程 / THE TRANSITION</div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold text-text-primary leading-tight">
              跳过语法转换器<br />
              直接以直觉表达
            </h2>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-light">
              英语不应该是数学公式。我们摒弃在大脑中“词汇组合+时态校验”的传统滞后思维模式，用最自然的方式把语言磨练成本能。
            </p>
          </div>

          {/* Right Flowing Timeline */}
          <div className="w-full md:w-6/12 relative pl-8 border-l border-white/5 py-4 text-left">
            {/* Dynamic scaleY timeline path */}
            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-white/5 overflow-hidden">
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: activeFrame === 2 ? 1 : 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full bg-gradient-to-b from-brand-accent/50 via-[#00E5FF]/30 to-transparent origin-top"
              />
            </div>

            {/* Flowing Pulse gradient */}
            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-transparent overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-brand-accent to-transparent animate-flow-line" />
            </div>
            
            <div className="space-y-12">
              {/* Node Before */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: activeFrame === 2 ? 1 : 0, y: activeFrame === 2 ? 0 : 15 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-white/10 bg-app-bg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-text-secondary/40 mb-1">使用之前 / TRADITIONAL</div>
                <h3 className="text-sm md:text-base font-medium text-text-secondary mb-1">生硬死记单词语法，一开口卡顿难受</h3>
                <p className="text-[11px] text-text-secondary/60 leading-relaxed font-light">
                  试图在脑海中对每一个单词 and 结构进行规则映射，越想对越不敢说，彻底失去口语流利度。
                </p>
              </motion.div>

              {/* Node After */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: activeFrame === 2 ? 1 : 0, y: activeFrame === 2 ? 0 : 15 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-brand-accent/40 bg-app-bg flex items-center justify-center shadow-[0_0_10px_rgba(0,255,157,0.25)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                </div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-brand-accent/60 mb-1">使用之后 / INTUITIVE</div>
                <h3 className="text-sm md:text-base font-medium text-text-primary mb-1">英语在大脑中内化，脱口即可表达</h3>
                <p className="text-[11px] text-text-secondary/80 leading-relaxed font-light">
                  AI 引导在错误场景中自我纠偏，形成肌肉记忆。无需二次语法校验，说英语就像说话一样自然。
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scene 3: 2x2 Bento Features Grid (Frame 3) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(3)}
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{ pointerEvents: activeFrame === 3 ? 'auto' : 'none' }}
      >
        <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col justify-center gap-8">
          {/* Header info */}
          <div className="text-left max-w-xl">
            <div className="text-[9px] text-[#00FF9D] font-mono tracking-[0.25em] uppercase mb-2">学习矩阵 / METHODOLOGY</div>
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-text-primary leading-tight">
              系统化打造你的二语习得循环
            </h2>
          </div>

          {/* Bento Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Card 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="01 / PRACTICE"
                emoji="💬"
                title="像聊天一样开口"
                conceptColor="#00E5FF"
              >
                你说一句，AI 回一句，并用启发式问题引导你深入对话。重点是“持续输出”，在真实心流中训练表达。
              </SpotlightCard>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="02 / FEEDBACK"
                emoji="⚡"
                title="纠错只抓关键点"
                conceptColor="#00FF9D"
              >
                拒绝繁琐语法教条：只挑出影响交流的语法盲区或中式英语，提供原地替换的极简自然口语表达。
              </SpotlightCard>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="03 / REVIEW"
                emoji="🔄"
                title="错题本两步强化"
                conceptColor="#FFFFFF"
              >
                先把偏差句改写正确，再在系统随机模拟的全新生活场景中输出该表达。彻底打通遗忘曲线。
              </SpotlightCard>
            </motion.div>

            {/* Card 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="04 / DISCOVERY"
                emoji="🌌"
                title="星图可视化成长"
                conceptColor="#C9A15D"
              >
                将你的核心薄弱项 and 已掌握句型，在 3D 旋转星系中连点成线展示，学习进度和盲区一目了然。
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scene 4: Clean Typographic Ending (Frame 4) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(4)}
        className="absolute inset-0 w-full h-full flex flex-col justify-center items-center"
        style={{ pointerEvents: activeFrame === 4 ? 'auto' : 'none' }}
      >
        {/* The Loop Typography */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: activeFrame === 4 ? 1 : 0, y: activeFrame === 4 ? 0 : 25 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 max-w-3xl px-6 md:px-12 text-center"
        >
          <div className="text-[9px] text-[#C9A15D] font-mono tracking-[0.25em] uppercase">成长闭环 / THE CORE CYCLE</div>
          <h2 className="text-2xl md:text-5xl font-display font-semibold leading-tight text-text-primary tracking-tight">
            练习 → 自动捕捉错误 → 温习强化 → 带回对话继续用
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-light max-w-2xl mx-auto">
            Learniny 不是简单的刷题册，而是一套自我进化学习的精密闭环。您说出的每一句话都是画像的养料，在“对话-诊断-纠错-复用”的闭环中周而复始，英语直觉螺旋上升。
          </p>
        </motion.div>

        {/* Ending CTA Link Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: activeFrame === 4 ? 1 : 0, scale: activeFrame === 4 ? 1 : 0.95 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 lg:mt-16 flex flex-col items-center gap-6"
        >
          <button
            onClick={onStartChat}
            className="group relative inline-flex items-center gap-3.5 text-sm md:text-base font-mono tracking-wider text-brand-accent font-bold cursor-pointer transition-all duration-300 pointer-events-auto"
          >
            <span>立即开启对话 / START CHAT</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-brand-accent group-hover:text-black">
              <span className="text-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:scale-110">→</span>
            </span>
            <span className="absolute bottom-[-6px] left-0 w-0 h-[1.5px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
          </button>

          {/* Mobile and Desktop integrated particle warning */}
          <div className="opacity-50 hover:opacity-100 transition-opacity flex flex-col items-center gap-2 pointer-events-auto">
            <LiteModeToggle />
            <span className="text-[9px] text-text-secondary/40 font-mono text-center">
              提示：手机端为降低能耗，建议不要开启粒子特效
            </span>
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
