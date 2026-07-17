'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ----------------------------------------------------------------------
// Character Cell: Independent hover decay state per letter
// ----------------------------------------------------------------------
const WORD_A = 'INTUITION';
const WORD_B = 'EVOLUTION';
const DECAY_MS = 900; // how long the orange letter lingers after mouse leaves

function CharCell({ charA, charB, onLitChange }: {
  charA: string;
  charB: string;
  onLitChange: (delta: 1 | -1) => void;
}) {
  const [lit, setLit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLitRef = useRef(false); // track without re-render to prevent double-counting

  const handleEnter = useCallback(() => {
    if (isLitRef.current) return; // already lit, mouse re-entered — don't double-count
    if (timerRef.current) clearTimeout(timerRef.current);
    isLitRef.current = true;
    setLit(true);
    onLitChange(1);
  }, [onLitChange]);

  const handleLeave = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (isLitRef.current) {
        isLitRef.current = false;
        setLit(false);
        onLitChange(-1);
      }
    }, DECAY_MS);
  }, [onLitChange]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex items-center justify-center overflow-hidden cursor-default"
      style={{ width: '1.05em', height: '1em' }}
    >
      {/* Layer A: white original letter */}
      <motion.span
        animate={{
          opacity: lit ? 0 : 1,
          y: lit ? -30 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center text-white/95 select-none"
      >
        {charA}
      </motion.span>

      {/* Layer B: orange evolved letter */}
      <motion.span
        animate={{
          opacity: lit ? 1 : 0,
          y: lit ? 0 : 30,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center text-[#C9A15D] drop-shadow-[0_0_20px_rgba(201,161,93,0.5)] select-none"
      >
        {charB}
      </motion.span>
    </div>
  );
}

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
      className={`relative bg-white/[0.015] border border-white/[0.04] rounded-[1.2rem] sm:rounded-[1.8rem] p-1 sm:p-1.5 shadow-sm overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${outerClassName}`}
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
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-[1.2rem] sm:rounded-[1.8rem] border border-brand-accent/20 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          maskImage: `radial-gradient(150px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
          WebkitMaskImage: `radial-gradient(150px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
        }}
      />
      
      {/* Inner Card Container */}
      <div className={`relative bg-[#080808]/90 border border-white/[0.01] rounded-[calc(1.2rem-0.25rem)] sm:rounded-[calc(1.8rem-0.375rem)] p-3 sm:p-5 space-y-1.5 sm:space-y-3 h-full flex flex-col justify-between z-10 ${innerClassName}`}>
        <div className="space-y-1.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[8px] sm:text-[10px] md:text-xs font-mono tracking-widest uppercase transition-colors duration-300 ${isHovered ? 'text-brand-accent' : 'text-text-secondary/40'}`}>
              {number}
            </span>
            <span className={`text-xs sm:text-sm md:text-base transition-transform duration-500 ${isHovered ? 'scale-125 rotate-6' : ''}`}>
              {emoji}
            </span>
          </div>
          <h4 className="text-[11px] sm:text-sm md:text-base font-medium text-text-primary transition-colors duration-300">
            {title}
          </h4>
          <div className="text-[9.5px] sm:text-xs md:text-[13px] lg:text-sm text-text-secondary leading-normal sm:leading-relaxed font-light">
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
  const [mobileWord, setMobileWord] = useState<'A' | 'B'>('A');
  const [showEvolvedSubtitle, setShowEvolvedSubtitle] = useState(false);
  const litCountRef = useRef(0);              // how many chars are currently lit
  const subtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTransitionTime = useRef(0);

  // Auto-cycle for mobile layout (4-second interval)
  useEffect(() => {
    const interval = setInterval(() => {
      setMobileWord((prev) => (prev === 'A' ? 'B' : 'A'));
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  const touchStartY = useRef(0);

  // Called by each CharCell with +1 (lit) or -1 (decayed back)
  const handleLitChange = useCallback((delta: 1 | -1) => {
    litCountRef.current = Math.max(0, litCountRef.current + delta);
    
    if (litCountRef.current > 0) {
      if (subtitleTimerRef.current) {
        clearTimeout(subtitleTimerRef.current);
        subtitleTimerRef.current = null;
      }
      setShowEvolvedSubtitle(true);
    } else {
      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
      subtitleTimerRef.current = setTimeout(() => {
        setShowEvolvedSubtitle(false);
      }, 1500); // 1.5 seconds delay decay for subtitle transition back
    }
  }, []);

  useEffect(() => () => {
    litCountRef.current = 0;
    if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
  }, []);

  const transitionTo = (nextFrame: number) => {
    const now = Date.now();
    if (now - lastTransitionTime.current < 750) return; // rate limit frame switching to match transition duration
    if (nextFrame < 1 || nextFrame > 5) return; // 5 frames bounds
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
      {/* Persistent CTA Button (Visible on Frames 1-4, fades out on Frame 5) */}
      {/* Positioned relative to max-w-7xl main content container to prevent moving off-screen */}
      <div className="absolute inset-0 w-full h-full max-w-7xl mx-auto px-6 md:px-12 py-12 pointer-events-none z-50">
        <AnimatePresence>
          {activeFrame < 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-12 right-6 md:right-12 pointer-events-auto flex flex-col items-end gap-2"
            >
              <button
                onClick={onStartChat}
                className="group relative inline-flex items-center gap-3 text-xs font-mono tracking-widest text-brand-accent font-bold cursor-pointer transition-all duration-300"
              >
                <span>[ START CHAT // 立即开启 ]</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                <span className="absolute bottom-[-4px] left-0 w-0 h-[1px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
              </button>
              <div className="text-[9px] md:text-[11px] text-text-secondary/40 font-mono uppercase tracking-widest mt-1">
                {activeFrame === 1 ? 'SCROLL DOWN TO LEARN MORE' : `FRAME 0${activeFrame} // 05`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scene 1: Conceptual Spatial Hero (Frame 1) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(1)}
        className="absolute inset-0 w-full h-full flex flex-col justify-center items-center"
        style={{ pointerEvents: activeFrame === 1 ? 'auto' : 'none' }}
      >
        {/* Ambient Background Layer (Spotlight + Star Orbit Rings + Radial Grid) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Pulsing center spotlight orb */}
          <motion.div
            animate={{
              scale: activeFrame === 1 ? (showEvolvedSubtitle || mobileWord === 'B' ? 1.15 : 1) : 0.8,
              opacity: activeFrame === 1 ? (showEvolvedSubtitle || mobileWord === 'B' ? 0.12 : 0.07) : 0,
              background: (showEvolvedSubtitle || mobileWord === 'B')
                ? 'radial-gradient(circle, rgba(201, 161, 93, 0.45) 0%, rgba(0, 0, 0, 0) 70%)'
                : 'radial-gradient(circle, rgba(0, 229, 255, 0.35) 0%, rgba(0, 0, 0, 0) 70%)'
            }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute w-[600px] h-[600px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
          />

          {/* Minimal grid lines pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"
            style={{ 
              maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 60%, transparent 100%)', 
              WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 60%, transparent 100%)' 
            }}
          />

          {/* Dynamic rotating celestial dashed rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
            className="absolute w-[280px] h-[280px] sm:w-[460px] sm:h-[460px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03] border-dashed"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            className="absolute w-[320px] h-[320px] sm:w-[520px] sm:h-[520px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.015]"
          />
        </div>

        {/* Desktop Layout: corners layout */}
        <div className="hidden md:flex absolute inset-0 w-full h-full max-w-7xl mx-auto px-6 md:px-12 py-12 flex-col justify-between pointer-events-none z-10">
          {/* Top row */}
          <div className="w-full flex justify-between items-center pointer-events-auto">
            <div className="text-[10px] md:text-xs lg:text-sm font-mono tracking-[0.25em] text-text-secondary/50 uppercase">
              LEARNINY // CONCEPT 01
            </div>
            <div className="text-[9px] md:text-[11px] lg:text-xs text-[#00E5FF]/60 font-mono tracking-[0.25em] uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
              ALPHA ACTIVE
            </div>
          </div>

          {/* Center concept word: character-cell decay state machine */}
          <div className="flex flex-col items-center justify-center pointer-events-auto py-12">
            <div
              className="flex items-center justify-center text-6xl md:text-9xl font-display font-light uppercase leading-none"
              style={{ letterSpacing: '0.3em', paddingLeft: '0.3em' }}
            >
              {WORD_A.split('').map((charA, i) => (
                <CharCell
                  key={i}
                  charA={charA}
                  charB={WORD_B[i]}
                  onLitChange={handleLitChange}
                />
              ))}
            </div>

            {/* Subtitle: switches instantly on hover, decays with a 1.5s delay */}
            <div className="relative h-6 mt-6 flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {showEvolvedSubtitle ? (
                  <motion.div
                    key="evolved"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-xs md:text-sm lg:text-base font-mono tracking-[0.4em] uppercase pl-[0.4em] text-[#C9A15D]"
                  >
                    在交流中习得语言本能
                  </motion.div>
                ) : (
                  <motion.div
                    key="intuition"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-xs md:text-sm lg:text-base font-mono tracking-[0.4em] uppercase pl-[0.4em] text-[#999999]"
                  >
                    在对话中重建英语直觉
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom row (Left side is blank, keeping Hero spatial clean) */}
          <div className="w-full flex justify-between items-end pointer-events-auto">
            <div className="w-10 h-10 opacity-0"></div>
            <div className="w-20 h-10 opacity-0"></div>
          </div>
        </div>

        {/* Mobile Layout: Stacked Editorial Cover (With Smooth Looping Morph) */}
        <div className="flex md:hidden flex-col items-center justify-between w-full h-full px-6 py-12 text-center pointer-events-auto z-10">
          {/* Top row */}
          <div className="text-[9px] text-[#00E5FF]/60 font-mono tracking-[0.2em] uppercase flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            LEARNINY // CONCEPT 01
          </div>

          {/* Center Morphing Content */}
          <div className="flex flex-col items-center justify-center py-6 w-full relative">
            <div className="relative h-20 w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {mobileWord === 'A' ? (
                  <motion.h1
                    key="wordA"
                    initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-5xl font-display font-light tracking-[0.22em] text-white/95 uppercase pl-[0.22em] leading-none absolute"
                  >
                    INTUITION
                  </motion.h1>
                ) : (
                  <motion.h1
                    key="wordB"
                    initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-5xl font-display font-light tracking-[0.22em] text-[#C9A15D] drop-shadow-[0_0_20px_rgba(201,161,93,0.5)] uppercase pl-[0.22em] leading-none absolute"
                  >
                    EVOLUTION
                  </motion.h1>
                )}
              </AnimatePresence>
            </div>

            {/* Subtitle Morph */}
            <div className="relative h-8 mt-6 w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {mobileWord === 'A' ? (
                  <motion.div
                    key="subA"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="text-[10px] font-mono tracking-[0.3em] text-text-secondary/80 uppercase pl-[0.3em] absolute"
                  >
                    在对话中重建英语直觉
                  </motion.div>
                ) : (
                  <motion.div
                    key="subB"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="text-[10px] font-mono tracking-[0.3em] text-[#C9A15D]/80 uppercase pl-[0.3em] absolute"
                  >
                    在交流中习得语言本能
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom info */}
          <div className="space-y-8 w-full flex flex-col items-center mb-16">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] text-text-secondary/30 font-mono tracking-widest uppercase animate-pulse mt-2">
                向上滑动探索更多 ↓
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scene 2: Timeless Memory & Companion (Frame 2 - Poetic Vertical Stack) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(2)}
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
        style={{ pointerEvents: activeFrame === 2 ? 'auto' : 'none' }}
      >
        {/* Memory nodes SVG background layer */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
          <svg className="w-[500px] h-[500px] text-brand-accent" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.3">
            <circle cx="20" cy="30" r="1" />
            <circle cx="50" cy="20" r="1.5" />
            <circle cx="80" cy="40" r="1" />
            <circle cx="35" cy="65" r="1.2" />
            <circle cx="68" cy="78" r="1" />
            <line x1="20" y1="30" x2="50" y2="20" />
            <line x1="50" y1="20" x2="80" y2="40" />
            <line x1="50" y1="20" x2="35" y2="65" />
            <line x1="35" y1="65" x2="68" y2="78" />
            <line x1="80" y1="40" x2="68" y2="78" />
            <motion.line 
              x1="20" y1="30" x2="50" y2="20" 
              strokeDasharray="3, 3" 
              animate={{ strokeDashoffset: [0, -6] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            <motion.line 
              x1="50" y1="20" x2="35" y2="65" 
              strokeDasharray="3, 3" 
              animate={{ strokeDashoffset: [0, -6] }} 
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />
            <motion.line 
              x1="80" y1="40" x2="68" y2="78" 
              strokeDasharray="3, 3" 
              animate={{ strokeDashoffset: [0, -6] }} 
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
            />
          </svg>
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 md:px-12 flex flex-col items-center justify-center text-center z-10 space-y-6 xs:space-y-8 md:space-y-16">
          {/* Header */}
          <div className="space-y-2 xs:space-y-4">
            <div className="text-[10px] md:text-xs lg:text-sm text-[#C9A15D] font-mono tracking-[0.25em] uppercase">
              二语习得 / SECOND NATURE
            </div>
            <h2 className="text-xl xs:text-3xl md:text-5xl font-display font-semibold leading-tight text-text-primary tracking-tight">
              Learniny 不是教你英语。
            </h2>
          </div>

          {/* Staggered Vertical Copywriting Reveal */}
          <div className="flex flex-col items-center justify-center space-y-4 xs:space-y-6 md:space-y-10 max-w-3xl">
            {/* Paragraph 1 */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: activeFrame === 2 ? 1 : 0, y: activeFrame === 2 ? 0 : 15 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs xs:text-sm md:text-lg lg:text-xl text-text-secondary/90 leading-relaxed font-light tracking-wide"
            >
              不灌输公式，不塞满字典里死记硬背的条框。<br />
              Learniny 是<span className="text-[#C9A15D] font-semibold mx-1 text-shadow-glow">「让英语慢慢成为你的第二天性」</span>。
            </motion.p>

            {/* Paragraph 2 */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: activeFrame === 2 ? 1 : 0, y: activeFrame === 2 ? 0 : 15 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs xs:text-sm md:text-lg lg:text-xl text-text-secondary/90 leading-relaxed font-light tracking-wide"
            >
              我们为你搭建无压力的沉浸语境，<br />
              通过长效记忆，默默记住你分享过的日常、纠结与微小的成长，
            </motion.p>

            {/* Paragraph 3 */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: activeFrame === 2 ? 1 : 0, y: activeFrame === 2 ? 0 : 15 }}
              transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs xs:text-sm md:text-lg lg:text-xl text-text-secondary/90 leading-relaxed font-light tracking-wide"
            >
              像一位随行的老友，在润物无声的互动中，<br />
              与你共同磨练出<span className="text-[#C9A15D] font-semibold mx-1 text-shadow-glow">「无可替代的交流默契」</span>。
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Scene 3: Split Flowing Timeline (Frame 3) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(3)}
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{ pointerEvents: activeFrame === 3 ? 'auto' : 'none' }}
      >
        <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 lg:gap-20">
          {/* Left Header info */}
          <div className="w-full md:w-5/12 text-left space-y-2 md:space-y-4">
            <div className="text-[10px] md:text-xs lg:text-sm text-[#00E5FF] font-mono tracking-[0.25em] uppercase">直觉跃迁 / THE TRANSITION</div>
            <h2 className="text-xl xs:text-2xl md:text-4xl font-display font-semibold text-text-primary leading-tight">
              最好的语言学习，<br />
              不是记住规则。
            </h2>
            <p className="text-xs md:text-sm lg:text-base text-text-secondary leading-relaxed font-light">
              而是有一天，<span className="text-[#00E5FF] font-medium">你忘记了规则，依然能够表达自己</span>。我们绕过繁琐的脑内语法翻译器，用最本能的交流重塑你的第一直觉。
            </p>
          </div>

          {/* Right Flowing Timeline */}
          <div className="w-full md:w-6/12 relative pl-8 border-l border-white/5 py-4 text-left">
            {/* Dynamic scaleY timeline path */}
            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-white/5 overflow-hidden">
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: activeFrame === 3 ? 1 : 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full bg-gradient-to-b from-brand-accent/50 via-[#00E5FF]/30 to-transparent origin-top"
              />
            </div>

            {/* Flowing Pulse gradient */}
            <div className="absolute left-[-1px] top-0 bottom-0 w-[2px] bg-transparent overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent via-brand-accent to-transparent animate-flow-line" />
            </div>
            
            <div className="space-y-6 md:space-y-12">
              {/* Node Before */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 15 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-white/10 bg-app-bg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-text-secondary/50 mb-1">使用之前 / TRADITIONAL</div>
                <h3 className="text-xs xs:text-sm md:text-base font-medium text-text-secondary mb-1">生硬死记单词语法，一开口卡顿难受</h3>
                <p className="text-[11px] md:text-xs lg:text-sm text-text-secondary/60 leading-relaxed font-light">
                  试图在脑海中对每一个单词 and 结构进行规则映射，越想对越不敢说，彻底失去口语流利度。
                </p>
              </motion.div>

              {/* Node After */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: activeFrame === 3 ? 1 : 0, y: activeFrame === 3 ? 0 : 15 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                <div className="absolute left-[-37px] top-1.5 w-4 h-4 rounded-full border border-brand-accent/40 bg-app-bg flex items-center justify-center shadow-[0_0_10px_rgba(0,255,157,0.25)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                </div>
                <div className="text-[10px] md:text-xs font-mono uppercase tracking-widest text-brand-accent/60 mb-1">使用之后 / INTUITIVE</div>
                <h3 className="text-xs xs:text-sm md:text-base font-medium text-text-primary mb-1">英语在大脑中内化，脱口即可表达</h3>
                <p className="text-[11px] md:text-xs lg:text-sm text-text-secondary/80 leading-relaxed font-light">
                  AI 引导在错误场景中自我纠偏，形成肌肉记忆。无需二次语法校验，说英语就像说话一样自然。
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scene 4: 2x2 Bento Features Grid (Frame 4) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(4)}
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{ pointerEvents: activeFrame === 4 ? 'auto' : 'none' }}
      >
        <div className="w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col justify-center gap-4 sm:gap-8">
          {/* Header info */}
          <div className="text-left max-w-xl">
            <div className="text-[10px] md:text-xs lg:text-sm text-[#00FF9D] font-mono tracking-[0.25em] uppercase mb-2">学习矩阵 / METHODOLOGY</div>
            <h2 className="text-xl xs:text-2xl md:text-3xl font-display font-semibold text-text-primary leading-tight">
              系统化打造你的二语习得循环
            </h2>
          </div>

          {/* Bento Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
            {/* Card 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 4 ? 1 : 0, y: activeFrame === 4 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="01 / PRACTICE"
                emoji="💬"
                title="像聊天一样自然表达"
                conceptColor="#00E5FF"
              >
                在轻松无压力的文字对话中，AI 用启发式问题逐层引导你输出。<span className="hidden sm:inline">不刻意背诵，在真实心流与交流中训练你的表达感官。</span>
              </SpotlightCard>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 4 ? 1 : 0, y: activeFrame === 4 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="02 / FEEDBACK"
                emoji="⚡"
                title="纠错只抓关键点"
                conceptColor="#00FF9D"
              >
                只挑选影响交流的语法盲区或中式语病，提供地道的原地改写建议。<span className="hidden sm:inline">拒绝枯燥公式与教条，让反馈更具针对性。</span>
              </SpotlightCard>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 4 ? 1 : 0, y: activeFrame === 4 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="03 / REVIEW"
                emoji="🔄"
                title="错题本两步强化"
                conceptColor="#FFFFFF"
              >
                先把偏差句改写正确，再在系统随机生成的全新场景中进行二次输出测试。<span className="hidden sm:inline">彻底打通遗忘曲线，内化语法。</span>
              </SpotlightCard>
            </motion.div>

            {/* Card 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: activeFrame === 4 ? 1 : 0, y: activeFrame === 4 ? 0 : 25 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard
                number="04 / DISCOVERY"
                emoji="🌌"
                title="星图可视化成长"
                conceptColor="#C9A15D"
              >
                将你的核心薄弱项与已掌握句型，在 3D 旋转星盘中连点成线展示。<span className="hidden sm:inline">学习进度、盲区和成长路径一目了然。</span>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scene 5: Clean Typographic Ending (Frame 5) */}
      <motion.div
        variants={panelVariants}
        initial="hiddenEnter"
        animate={getPanelState(5)}
        className="absolute inset-0 w-full h-full flex flex-col justify-center items-center"
        style={{ pointerEvents: activeFrame === 5 ? 'auto' : 'none' }}
      >
        {/* The Loop Typography */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: activeFrame === 5 ? 1 : 0, y: activeFrame === 5 ? 0 : 25 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 xs:space-y-6 max-w-3xl px-6 md:px-12 text-center"
        >
          <div className="text-[10px] md:text-xs lg:text-sm text-[#C9A15D] font-mono tracking-[0.25em] uppercase">核心使命 / THE MISSION</div>
          <h2 className="text-xl xs:text-2xl md:text-5xl font-display font-semibold leading-tight text-text-primary tracking-tight">
            让用户最终忘记自己正在学英语。
          </h2>
          <p className="text-xs md:text-sm lg:text-base text-text-secondary leading-relaxed font-light max-w-2xl mx-auto">
            最好的学习方式，是像呼吸一样无感。在“练习对话 → 智能捕获误区 → 场景温习强化”的螺旋上升闭环中，我们不希望你背负沉重的焦虑，而是让你在交流心流中，最终忘记“学习”本身。
          </p>
        </motion.div>

        {/* Ending CTA Link Button */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: activeFrame === 5 ? 1 : 0, scale: activeFrame === 5 ? 1 : 0.95 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 xs:mt-12 lg:mt-16 flex flex-col items-center gap-4 sm:gap-6"
        >
          <button
            onClick={onStartChat}
            className="group relative inline-flex items-center gap-3.5 text-xs xs:text-sm md:text-base font-mono tracking-wider text-brand-accent font-bold cursor-pointer transition-all duration-300 pointer-events-auto"
          >
            <span>立即开启对话 / START CHAT</span>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-brand-accent group-hover:text-black">
              <span className="text-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:scale-110">→</span>
            </span>
            <span className="absolute bottom-[-6px] left-0 w-0 h-[1.5px] bg-brand-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
          </button>
        </motion.div>
      </motion.div>

    </div>
  );
}
