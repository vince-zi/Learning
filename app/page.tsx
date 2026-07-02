'use client';

import React, { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';
import { HomeSection } from '@/components/sections/HomeSection';
import { PracticeSection } from '@/components/sections/PracticeSection';
import { DiscoverySection } from '@/components/sections/DiscoverySection';
import { ReviewSection } from '@/components/sections/ReviewSection';
import { ProfileSection } from '@/components/sections/ProfileSection';

const SECTIONS = ['home', 'practice', 'discovery', 'review', 'profile'] as const;

export default function SPAHome() {
  const { activeSection, setActiveSection } = useSessionStore();

  const sections = [
    { name: 'home' as const, id: 'section-home', comp: <HomeSection onStartChat={() => setActiveSection('practice')} /> },
    { name: 'practice' as const, id: 'section-practice', comp: <PracticeSection /> },
    { name: 'discovery' as const, id: 'section-discovery', comp: <DiscoverySection /> },
    { name: 'review' as const, id: 'section-review', comp: <ReviewSection /> },
    { name: 'profile' as const, id: 'section-profile', comp: <ProfileSection /> },
  ];

  const activeIndex = SECTIONS.indexOf(activeSection as any);

  // Sync hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && SECTIONS.includes(hash as any)) {
      setActiveSection(hash as any);
    }
  }, [setActiveSection]);

  // Sync URL hash on activeSection change without page jump
  useEffect(() => {
    if (window.location.hash !== `#${activeSection}`) {
      history.replaceState(null, '', `#${activeSection}`);
    }
  }, [activeSection]);

  return (
    <div className="w-full h-full overflow-hidden bg-transparent">
      {/* Hardware-accelerated sliding deck container */}
      <div 
        className="w-full h-full flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateY(-${activeIndex * 100}%)` }}
      >
        {sections.map((sec) => (
          <section 
            key={sec.id} 
            id={sec.id} 
            className="w-full h-screen flex-shrink-0 relative overflow-hidden"
          >
            {sec.comp}
          </section>
        ))}
      </div>
    </div>
  );
}
