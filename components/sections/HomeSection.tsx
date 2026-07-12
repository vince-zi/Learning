'use client';

import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
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
// Main HomeSection (Scroll-Linked Frame-by-Frame Stacking Panels)
// ----------------------------------------------------------------------
export function HomeSection({ onStartChat }: { onStartChat: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Single useScroll scroller on the container
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  const [activeSection, setActiveSection] = useState(1);
  
  // Handle layout index and pointer events dynamically based on scroll timeline
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.22) {
      if (activeSection !== 1) setActiveSection(1);
    } else if (latest < 0.52) {
      if (activeSection !== 2) setActiveSection(2);
    } else if (latest < 0.78) {
      if (activeSection !== 3) setActiveSection(3);
    } else {
      if (activeSection !== 4) setActiveSection(4);
    }
  });

  // ----------------------------------------------------------------------
  // SCENE 1: Centered Hero Screen (0.0 -> 0.22 Timeline)
  // ----------------------------------------------------------------------
  const s1Opacity = useTransform(scrollYProgress, [0.0, 0.18, 0.22], [1, 1, 0]);
  const s1Scale = useTransform(scrollYProgress, [0.0, 0.22], [1, 0.94]);
  const s1Y = useTransform(scrollYProgress, [0.0, 0.22], [0, -50]);

  // ----------------------------------------------------------------------
  // SCENE 2: Split Flowing Timeline (0.22 -> 0.52 Timeline)
  // ----------------------------------------------------------------------
  const s2Opacity = useTransform(scrollYProgress, [0.18, 0.22, 0.48, 0.52], [0, 1, 1, 0]);
  const s2Scale = useTransform(scrollYProgress, [0.18, 0.22, 0.48, 0.52], [0.96, 1, 1, 0.96]);
  const s2Y = useTransform(scrollYProgress, [0.18, 0.22, 0.48, 0.52], [40, 0, 0, -40]);
  const s2LineScaleY = useTransform(scrollYProgress, [0.22, 0.42], [0, 1]);
  const s2BeforeOpacity = useTransform(scrollYProgress, [0.24, 0.35], [0, 1]);
  const s2AfterOpacity = useTransform(scrollYProgress, [0.35, 0.46], [0, 1]);

  // ----------------------------------------------------------------------
  // SCENE 3: 2x2 Bento Features Grid (0.52 -> 0.78 Timeline)
  // ----------------------------------------------------------------------
  const s3Opacity = useTransform(scrollYProgress, [0.48, 0.52, 0.74, 0.78], [0, 1, 1, 0]);
  const s3Scale = useTransform(scrollYProgress, [0.48, 0.52, 0.74, 0.78], [0.96, 1, 1, 0.96]);
  const s3Y = useTransform(scrollYProgress, [0.48, 0.52, 0.74, 0.78], [40, 0, 0, -40]);
  const s3Card12Opacity = useTransform(scrollYProgress, [0.53, 0.62], [0, 1]);
  const s3Card34Opacity = useTransform(scrollYProgress, [0.62, 0.71], [0, 1]);
  const s3Card12Y = useTransform(scrollYProgress, [0.53, 0.62], [50, 0]);
  const s3Card34Y = useTransform(scrollYProgress, [0.62, 0.71], [50, 0]);

  // ----------------------------------------------------------------------
  // SCENE 4: Clean Typographic Ending (0.78 -> 1.0 Timeline)
  // ----------------------------------------------------------------------
  const s4Opacity = useTransform(scrollYProgress, [0.74, 0.78], [0, 1]);
  const s4Scale = useTransform(scrollYProgress, [0.74, 0.78], [0.96, 1]);
  const s4Y = useTransform(scrollYProgress, [0.74, 0.78], [40, 0]);
  const s4LoopOpacity = useTransform(scrollYProgress, [0.78, 0.88], [0, 1]);
  const s4LoopY = useTransform(scrollYProgress, [0.78, 0.88], [30, 0]);
  const s4CtaOpacity = useTransform(scrollYProgress, [0.86, 0.94], [0, 1]);
  const s4CtaScale = useTransform(scrollYProgress, [0.86, 0.94], [0.95, 1]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-y-auto overscroll-contain pb-safe scrollbar-none text-[#FFFFFF] relative"
    >
      {/* Global Scroll Track Height */}
      <div className="h-[450vh] relative w-full">
        
        {/* Unified Sticky Viewport Layer */}
        <div className="sticky top-0 h-dvh w-full overflow-hidden pointer-events-none">
          
          {/* -------------------------------------------------- */}
          {/* SCENE 1: Centered Hero Screen (0.0 -> 0.22 Scroll) */}
          {/* -------------------------------------------------- */}
          <motion.div
            style={{ 
              opacity: s1Opacity, 
              scale: s1Scale, 
              y: s1Y,
              pointerEvents: activeSection === 1 ? 'auto' : 'none'
            }}
            className="absolute inset-0 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 md:px-12 text-center"
          >
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-brand-accent/10 border border-brand-accent/30 text-[9px] uppercase tracking-[0.2em] font-mono text-brand-accent mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
              Learniny Alpha
            </div>
            
            {/* Massive Bold Cinematic Headline */}
            <h1 className="text-5xl md:text-8xl xl:text-9xl font-display font-extrabold tracking-tighter leading-[1.05] text-text-primary mb-2">
              用真实的对话<br />
              <span className="bg-gradient-to-r from-brand-accent via-brand-accent to-[#00E5FF] bg-clip-text text-transparent italic font-normal drop-shadow-[0_0_15px_rgba(0,255,157,0.2)]">找回英语直觉</span>
            </h1>

            {/* Value Proposition copy with strict whitespace-nowrap highlights */}
            <p className="mt-8 text-base md:text-xl text-text-secondary font-light leading-relaxed max-w-2xl mx-auto">
              不背单词，不记死记硬背的规则。AI 会在自然的交流中进行<span className="text-text-primary font-semibold whitespace-nowrap">启发式引导</span>，在潜移默化中将英语内化为你大脑的<span className="text-brand-accent font-semibold whitespace-nowrap">表达直觉</span>。
            </p>

            <div className="mt-12">
              <span className="text-[10px] text-text-secondary/30 font-mono tracking-widest uppercase animate-pulse">
                往下滚动开启学习之旅 ↓
              </span>
            </div>
          </motion.div>

          {/* -------------------------------------------------- */}
          {/* SCENE 2: Split Flowing Timeline (0.22 -> 0.52 Scroll) */}
          {/* -------------------------------------------------- */}
          <motion.div
            style={{ 
              opacity: s2Opacity, 
              scale: s2Scale, 
              y: s2Y,
              pointerEvents: activeSection === 2 ? 'auto' : 'none'
            }}
            className="absolute inset-0 flex flex-col md:flex-row items-center justify-between w-full max-w-5xl mx-auto px-6 md:px-12 gap-12 lg:gap-20"
          >
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
              {/* Dynamic scroll-linked neon line path */}
              <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-white/5 overflow-hidden">
                <motion.div 
                  style={{ scaleY: s2LineScaleY }} 
                  className="w-full h-full bg-gradient-to-b from-brand-accent/50 via-[#00E5FF]/30 to-transparent origin-top"
                />
              </div>

              {/* Flowing Pulse gradient */}
              <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-transparent overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-brand-accent to-transparent animate-flow-line" />
              </div>
              
              <div className="space-y-12">
                {/* Node Before */}
                <motion.div style={{ opacity: s2BeforeOpacity }} className="relative group">
                  <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-white/10 bg-app-bg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-text-secondary/40 mb-1">使用之前 / TRADITIONAL</div>
                  <h3 className="text-sm md:text-base font-medium text-text-secondary mb-1">生硬死记单词语法，一开口卡顿难受</h3>
                  <p className="text-[11px] text-text-secondary/60 leading-relaxed font-light">
                    试图在脑海中对每一个单词和结构进行规则映射，越想对越不敢说，彻底失去口语流利度。
                  </p>
                </motion.div>

                {/* Node After */}
                <motion.div style={{ opacity: s2AfterOpacity }} className="relative group">
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
          </motion.div>

          {/* -------------------------------------------------- */}
          {/* SCENE 3: 2x2 Bento Features Grid (0.52 -> 0.78 Scroll) */}
          {/* -------------------------------------------------- */}
          <motion.div
            style={{ 
              opacity: s3Opacity, 
              scale: s3Scale, 
              y: s3Y,
              pointerEvents: activeSection === 3 ? 'auto' : 'none'
            }}
            className="absolute inset-0 flex flex-col justify-center w-full max-w-5xl mx-auto px-6 md:px-12 gap-8"
          >
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
              <motion.div style={{ opacity: s3Card12Opacity, y: s3Card12Y }}>
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
              <motion.div style={{ opacity: s3Card12Opacity, y: s3Card12Y }}>
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
              <motion.div style={{ opacity: s3Card34Opacity, y: s3Card34Y }}>
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
              <motion.div style={{ opacity: s3Card34Opacity, y: s3Card34Y }}>
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
          </motion.div>

          {/* -------------------------------------------------- */}
          {/* SCENE 4: Clean Typographic Ending (0.78 -> 1.0 Scroll) */}
          {/* -------------------------------------------------- */}
          <motion.div
            style={{ 
              opacity: s4Opacity, 
              scale: s4Scale, 
              y: s4Y,
              pointerEvents: activeSection === 4 ? 'auto' : 'none'
            }}
            className="absolute inset-0 flex flex-col justify-center items-center text-center w-full max-w-4xl mx-auto px-6 md:px-12"
          >
            {/* The Loop Typography */}
            <motion.div 
              style={{ opacity: s4LoopOpacity, y: s4LoopY }}
              className="space-y-6 max-w-3xl"
            >
              <div className="text-[9px] text-[#C9A15D] font-mono tracking-[0.25em] uppercase">成长闭环 / THE CORE CYCLE</div>
              <h2 className="text-3xl md:text-5xl font-display font-semibold leading-tight text-text-primary tracking-tight">
                练习 → 自动捕捉错误 → 温习强化 → 带回对话继续用
              </h2>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-light max-w-2xl mx-auto">
                Learniny 不是简单的刷题册，而是一套自我进化学习的精密闭环。您说出的每一句话都是画像的养料，在“对话-诊断-纠错-复用”的闭环中周而复始，英语直觉螺旋上升。
              </p>
            </motion.div>

            {/* Ending CTA Link Button */}
            <motion.div 
              style={{ opacity: s4CtaOpacity, scale: s4CtaScale }}
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
      </div>
    </div>
  );
}
