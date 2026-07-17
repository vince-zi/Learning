'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Info, Loader2 } from 'lucide-react';

interface SummaryModalProps {
  summaryData: {
    title?: string;
    summary?: string;
    insight?: string;
    tags?: string[];
    isNotice?: boolean;
    isLoading?: boolean;
  } | null;
  onClose: () => void;
}

export function SummaryModal({ summaryData, onClose }: SummaryModalProps) {
  if (!summaryData) return null;

  if (summaryData.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 md:p-8 pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-lg bg-[#0D0D0D] border border-brand-accent/20 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(0,255,157,0.15)] relative overflow-hidden"
        >
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] bg-brand-accent/10 pointer-events-none" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-accent text-xs font-mono tracking-widest uppercase">
              <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
              <span>今日学习发现报告</span>
            </div>
            <h3 className="text-xl font-display text-text-primary tracking-wide leading-snug">
              正在总结你的今日发现...
            </h3>
          </div>
          <div className="h-px bg-divider" />
          <div className="flex flex-col gap-4 py-4 items-center justify-center min-h-[160px]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-accent mb-4" />
            <p className="text-xs text-text-secondary animate-pulse tracking-wide">
              正在深入分析本轮对话记录，点亮学习星图...
            </p>
          </div>
          <div className="h-px bg-divider" />
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-brand-accent/10 border border-brand-accent/30 rounded-2xl text-xs font-medium text-brand-accent cursor-pointer hover:bg-brand-accent/20 transition-all duration-300"
            >
              在后台运行
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const { isNotice } = summaryData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 md:p-8 pointer-events-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full max-w-lg bg-[#0D0D0D] border rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden ${
          isNotice 
            ? 'border-brand-hint/20 shadow-[0_0_50px_rgba(0,229,255,0.08)]' 
            : 'border-brand-accent/20 shadow-[0_0_50px_rgba(0,255,157,0.15)]'
        }`}
      >
        {/* Ambient glowing background orb */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none ${
          isNotice ? 'bg-brand-hint/10' : 'bg-brand-accent/10'
        }`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none ${
          isNotice ? 'bg-brand-hint/5' : 'bg-brand-accent/5'
        }`} />

        <div className="flex flex-col gap-2">
          {isNotice ? (
            <div className="flex items-center gap-2 text-brand-hint text-xs font-mono tracking-widest uppercase">
              <Info className="w-4 h-4 text-brand-hint" />
              <span>对话提示</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-brand-accent text-xs font-mono tracking-widest uppercase">
              <Sparkles className="w-4 h-4 animate-pulse text-brand-accent" />
              <span>今日学习发现报告</span>
            </div>
          )}
          <h3 className="text-xl font-display text-text-primary tracking-wide leading-snug">
            {summaryData.title || (isNotice ? '对话未产生积累' : '探索新语法与语感表达')}
          </h3>
        </div>

        <div className="h-px bg-divider" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">
              {isNotice ? '提示详情' : '发现点核心解析'}
            </span>
            <p className="text-sm text-text-secondary leading-relaxed bg-[#121212] border border-divider rounded-2xl p-4">
              {summaryData.summary || (isNotice ? '你刚才的对话过短，系统无法评估出实质性的语法点。建议下次与 AI 多进行几轮英语交流哦～' : '')}
            </p>
          </div>

          {!isNotice && summaryData.insight && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">你的学习感悟</span>
              <p className="text-xs text-brand-accent/80 italic leading-relaxed bg-brand-accent/5 border border-brand-accent/25 rounded-2xl p-4">
                “ {summaryData.insight} ”
              </p>
            </div>
          )}

          {!isNotice && summaryData.tags && summaryData.tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider">星图技能标签</span>
              <div className="flex flex-wrap gap-2">
                {summaryData.tags.map((tag: string, idx: number) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-[10px] text-brand-accent tracking-wider font-medium"
                  >
                    # {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-divider" />

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className={`flex-1 px-6 py-3 text-[#000000] text-xs font-bold tracking-widest uppercase rounded-full hover:scale-105 transition-transform cursor-pointer text-center font-sans ${
              isNotice 
                ? 'bg-brand-hint shadow-[0_0_20px_rgba(0,229,255,0.1)]' 
                : 'bg-brand-accent shadow-[0_0_20px_rgba(0,255,157,0.1)]'
            }`}
          >
            {isNotice ? '我知道了' : '确认并返回主页'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
