'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LeftNav } from './LeftNav';
import { useSessionStore } from '@/store/session-store';
import { FirstVisitGuide } from '@/components/ui/FirstVisitGuide';

// Lazy-load Three.js — only downloads when 3D background actually renders
const ThreeBackground = dynamic(() => import('./ThreeBackground'), {
  ssr: false,
  loading: () => null,
});

function AmbientFallback() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-accent/8 rounded-full blur-[120px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '20s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-hint/8 rounded-full blur-[100px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '25s', animationDelay: '-5s' }} />
    </div>
  );
}

function SafeBackground({ eventSource }: { eventSource: any }) {
  const [hasError, setHasError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isLiteMode } = useSessionStore();

  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  if (hasError || isLiteMode) {
    return <AmbientFallback />;
  }

  return <ThreeBackground eventSource={eventSource} isMobile={isMobile} />;
}

export function LiteModeToggle() {
  const { isLiteMode, setLiteMode } = useSessionStore();

  return (
    <button
      onClick={() => setLiteMode(!isLiteMode)}
      title={isLiteMode ? '开启粒子特效背景' : '关闭粒子特效，节省资源'}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono tracking-wider transition-all duration-500 backdrop-blur-md border pointer-events-auto ${
        isLiteMode
          ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent shadow-[0_0_20px_rgba(0,255,157,0.25)] animate-pulse'
          : 'bg-[#0A0A0A]/80 border-[#1A1A1A] text-[#666666] hover:text-[#999999] hover:border-[#333333]'
      }`}
    >
      <span className={`transition-transform duration-300 ${isLiteMode ? 'scale-110' : ''}`}>
        {isLiteMode ? '✨' : '🍃'}
      </span>
      <span className="hidden sm:inline">
        {isLiteMode ? '开启粒子特效' : '轻松模式'}
      </span>
    </button>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const mainRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={mainRef} className="relative w-full h-dvh bg-app-bg text-text-primary font-sans selection:bg-brand-accent/30 overflow-hidden">

      {/* HTML Ambient Flowing Media Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-accent/10 rounded-full blur-[120px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-hint/10 rounded-full blur-[100px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '25s', animationDelay: '-5s' }}></div>

        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <LeftNav />

      <SafeBackground eventSource={mainRef} />

      <FirstVisitGuide />

      <div className="absolute inset-0 z-10 overflow-hidden" style={{ transform: 'translate3d(0, 0, 0)' }}>
        {children}
      </div>
    </div>
  );
}

