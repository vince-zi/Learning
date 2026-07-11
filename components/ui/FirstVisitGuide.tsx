'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEEN_KEY = 'learniny_tour_v2';

const STEPS = [
  {
    // Spotlight on right-side nav bar
    spotlight: { top: '50%', left: 'calc(100% - 48px)' },
    arrow: 'right-[110px] top-1/2 -translate-y-1/2',
    label: '右侧上下滑动',
    sub: '切换 5 个页面',
  },
  {
    // Spotlight on the lite mode toggle button
    spotlight: { top: 'calc(100% - 96px)', left: '50%' },
    arrow: 'bottom-36 left-1/2 -translate-x-1/2',
    label: '✨ 开启粒子特效',
    sub: '手机用户建议保持关闭',
  },
];

export function FirstVisitGuide() {
  const [step, setStep] = useState(-1); // -1 = hidden

  useEffect(() => {
    // Delay slightly so the page renders first
    const show = setTimeout(() => {
      if (typeof window !== 'undefined' && !localStorage.getItem(SEEN_KEY)) {
        setStep(0);
      }
    }, 800);
    return () => clearTimeout(show);
  }, []);

  const dismiss = () => {
    setStep(-1);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEEN_KEY, '1');
    }
  };

  if (step < 0) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] pointer-events-auto"
        onClick={() => {
          if (step < STEPS.length - 1) {
            setStep(step + 1);
          } else {
            dismiss();
          }
        }}
      >
        {/* Dark overlay with spotlight hole */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 80px at ${current.spotlight.left} ${current.spotlight.top}, transparent 0%, rgba(0,0,0,0.75) 100%)`,
          }}
        />

        {/* Arrow + text hint */}
        <div className={`absolute ${current.arrow} flex flex-col items-center gap-1 text-center pointer-events-none`}>
          <span className="text-brand-accent text-lg animate-bounce">
            {step === 0 ? '→' : '↓'}
          </span>
          <span className="text-xs font-mono tracking-widest text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
            {current.label}
          </span>
          <span className="text-[10px] font-mono tracking-wider text-white/60">
            {current.sub}
          </span>
        </div>

        {/* Skip / progress dots */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/30 tracking-wider">
            点击任意处继续
          </span>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-2 h-2 bg-brand-accent' : 'w-1.5 h-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
