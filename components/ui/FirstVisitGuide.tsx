'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEEN_KEY = 'learniny_tour_v2';

const SPOTLIGHT = {
  spotlight: { top: '50%', left: 'calc(100% - 48px)' },
  arrow: 'right-[110px] top-1/2 -translate-y-1/2',
  label: '右侧上下滑动',
  sub: '切换 5 个页面',
};

export function FirstVisitGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => {
      if (typeof window !== 'undefined' && !localStorage.getItem(SEEN_KEY)) {
        setVisible(true);
      }
    }, 800);
    return () => clearTimeout(show);
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEEN_KEY, '1');
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] pointer-events-auto"
        onClick={dismiss}
      >
        {/* Dark overlay with spotlight hole */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 80px at ${SPOTLIGHT.spotlight.left} ${SPOTLIGHT.spotlight.top}, transparent 0%, rgba(0,0,0,0.75) 100%)`,
          }}
        />

        {/* Arrow + text hint */}
        <div className={`absolute ${SPOTLIGHT.arrow} flex flex-col items-center gap-1 text-center pointer-events-none`}>
          <span className="text-brand-accent text-lg animate-bounce">→</span>
          <span className="text-xs font-mono tracking-widest text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
            {SPOTLIGHT.label}
          </span>
          <span className="text-[10px] font-mono tracking-wider text-white/60">
            {SPOTLIGHT.sub}
          </span>
        </div>

        {/* Dismiss hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-mono text-white/30 tracking-wider">
            点击任意处继续
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
