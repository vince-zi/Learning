'use client'

import React, { useRef } from 'react';
import { useSessionStore } from '@/store/session-store';

const SECTIONS = ['home', 'practice', 'discovery', 'review', 'profile'] as const;
type SectionType = typeof SECTIONS[number];

export function LeftNav() {
  const { activeSection, setActiveSection } = useSessionStore();
  const lastScrollTime = useRef(0);
  const touchStartY = useRef(0);

  const tabs = [
    { name: 'home' as const, id: 'section-home', label: '主页' },
    { name: 'practice' as const, id: 'section-practice', label: '对话' },
    { name: 'discovery' as const, id: 'section-discovery', label: '星图' },
    { name: 'review' as const, id: 'section-review', label: '温习' },
    { name: 'profile' as const, id: 'section-profile', label: '能力' },
  ];

  const handleNav = (id: string) => {
    const sectionName = id.replace('section-', '') as SectionType;
    setActiveSection(sectionName);
  };

  const handleScroll = (direction: 'up' | 'down') => {
    const now = Date.now();
    if (now - lastScrollTime.current < 750) return; // rate limit page transitions to match transition duration
    lastScrollTime.current = now;

    const currentIndex = SECTIONS.indexOf(activeSection as any);
    let nextIndex = currentIndex;

    if (direction === 'down') {
      nextIndex = (currentIndex + 1) % SECTIONS.length;
    } else {
      nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length;
    }

    setActiveSection(SECTIONS[nextIndex]);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > 10) {
      handleScroll(e.deltaY > 0 ? 'down' : 'up');
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    if (Math.abs(deltaY) > 40) {
      handleScroll(deltaY > 0 ? 'down' : 'up');
    }
  };

  return (
    <div 
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed right-0 top-0 w-24 h-full z-50 flex items-center justify-center bg-transparent pointer-events-auto group/strip cursor-ns-resize"
    >
      {/* Visual Dot Ticks bar */}
      <div className="flex flex-col gap-5 items-center opacity-70 md:opacity-30 md:group-hover/strip:opacity-100 transition-opacity duration-300">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => handleNav(tab.id)}
              className="group/dot relative flex items-center justify-center w-6 h-6 rounded-full cursor-pointer focus:outline-none transition-transform duration-300 hover:scale-125"
              title={tab.label}
            >
              {/* Active pulsing ring */}
              {isActive && (
                <span className="absolute w-3.5 h-3.5 rounded-full border border-brand-accent/40 animate-ping" />
              )}
              
              {/* Minimal Dot indicator */}
              <span 
                className={`rounded-full transition-all duration-300 
                  ${isActive 
                    ? 'w-2.5 h-2.5 bg-brand-accent shadow-[0_0_10px_rgba(0,255,157,0.85)]' 
                    : 'w-1.5 h-1.5 bg-text-secondary/40 group-hover/dot:bg-text-primary group-hover/dot:w-2 group-hover/dot:h-2'
                  }`} 
              />

              {/* Subtle text label shown only on dot hover */}
              <span className="absolute right-8 px-2 py-1 rounded bg-[#0A0A0A]/95 border border-divider text-[10px] text-text-secondary font-mono tracking-widest uppercase opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
