'use client'

import React from 'react';
import { LeftNav } from './LeftNav';
import { FirstVisitGuide } from '@/components/ui/FirstVisitGuide';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const mainRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={mainRef} className="relative w-full h-dvh bg-app-bg text-text-primary font-sans selection:bg-brand-accent/30 overflow-hidden">

      {/* HTML Ambient Flowing Media Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-accent/10 rounded-full blur-[120px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-hint/10 rounded-full blur-[100px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '25s', animationDelay: '-5s' }}></div>

        {/* Subtle noise texture overlay - hidden on mobile for GPU optimization */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay hidden md:block" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <LeftNav />

      <FirstVisitGuide />

      <div className="absolute inset-0 z-10 overflow-hidden" style={{ transform: 'translate3d(0, 0, 0)' }}>
        {children}
      </div>
    </div>
  );
}

