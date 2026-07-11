'use client'

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '@/components/Experience';
import { useSessionStore } from '@/store/session-store';

function BackgroundCanvas({ eventSource, isMobile }: { eventSource: any; isMobile: boolean }) {
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
      dpr={isMobile ? [1, 1] : [1, 1.5]}
      eventSource={eventSource}
      eventPrefix="client"
      camera={{ position: [0, 0, 6], fov: 45 }}
      className="absolute inset-0"
      style={{ pointerEvents: is3DMode ? 'auto' : 'none', zIndex: 0 }}
    >
      <Suspense fallback={null}>
        <Experience pathname={mappedPath} isMobile={isMobile} />
      </Suspense>
    </Canvas>
  );
}

export default function ThreeBackground({ eventSource, isMobile }: { eventSource: any; isMobile: boolean }) {
  return <BackgroundCanvas eventSource={eventSource} isMobile={isMobile} />;
}
