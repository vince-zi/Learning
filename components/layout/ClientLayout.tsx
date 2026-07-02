'use client'

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '@/components/Experience';
import { LeftNav } from './LeftNav';
import { useSessionStore } from '@/store/session-store';

function BackgroundCanvas({ eventSource }: { eventSource: any }) {
  const { activeSection, is3DMode } = useSessionStore();
  
  const sectionPathMap: Record<string, string> = {
    home: '/',
    practice: '/practice',
    discovery: '/discovery',
    review: '/progress',
    profile: '/profile',
  };
  const mappedPath = sectionPathMap[activeSection] || '/';

  return (
    <Canvas 
      dpr={[1, 1.5]} 
      eventSource={eventSource} 
      eventPrefix="client" 
      camera={{ position: [0, 0, 6], fov: 45 }} 
      className={`absolute inset-0 z-10 w-full h-full ${is3DMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <Suspense fallback={null}>
        <Experience pathname={mappedPath} />
      </Suspense>
    </Canvas>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const mainRef = React.useRef<HTMLDivElement>(null);
  
  return (
    <div ref={mainRef} className="relative w-full h-screen bg-app-bg text-text-primary font-sans selection:bg-brand-accent/30 overflow-hidden">
      
      {/* HTML Ambient Flowing Media Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-accent/10 rounded-full blur-[120px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-hint/10 rounded-full blur-[100px] mix-blend-screen animate-ambient-flow" style={{ animationDuration: '25s', animationDelay: '-5s' }}></div>
        
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <LeftNav />

      {/* Global SPA Wrapper */}
      <div className="w-full h-full absolute inset-0 z-20 overflow-hidden">
        {children}
      </div>

      {/* Global 3D Background Canvas */}
      <BackgroundCanvas eventSource={mainRef} />
    </div>
  );
}
