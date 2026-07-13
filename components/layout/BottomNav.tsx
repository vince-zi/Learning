'use client'
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Network, BookOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: '主页', href: '/', icon: Home, exact: true },
    { name: '对话', href: '/practice', icon: MessageSquare },
    { name: '星图', href: '/discovery', icon: Network },
    { name: '足迹', href: '/review', icon: BookOpen },
    { name: '我的', href: '/profile', icon: User },
  ];

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <nav className="flex items-center justify-between bg-surface-card/85 backdrop-blur-xl border border-divider rounded-full px-2 py-1.5 shadow-2xl">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-full transition-all duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 bg-surface-ai rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 transition-colors duration-300 ${isActive ? 'text-brand-accent' : 'text-text-secondary hover:text-text-primary'}`} />
                <span className={`text-[9px] relative z-10 transition-colors duration-300 ${isActive ? 'text-brand-accent font-semibold' : 'text-text-secondary hover:text-text-primary font-light'}`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
}
