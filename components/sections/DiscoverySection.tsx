'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Sparkles, Clock, Box } from 'lucide-react';
import { supabase } from '@/lib/db/supabase-client';
import { useSessionStore } from '@/store/session-store';
import { getUserId } from '@/lib/user-id';

export function DiscoverySection() {
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeSection, is3DMode, setIs3DMode, selectedNodeId, setSelectedNodeId } = useSessionStore();

  useEffect(() => {
    if (activeSection !== 'discovery') {
      setIs3DMode(false);
    }
  }, [activeSection, setIs3DMode]);

  useEffect(() => {
    if (activeSection !== 'discovery') return;

    const userId = getUserId();
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('discoveries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        setDiscoveries(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [activeSection]);

  const totalDiscoveries = discoveries.length;

  const KNOWLEDGE_NODES = [
    { id: 'self-intro', label: '自我介绍', cx: 400, cy: 420 },
    { id: 'daily-routine', label: '日常起居', cx: 240, cy: 310 },
    { id: 'likes-dislikes', label: '兴趣情感', cx: 560, cy: 310 },
    { id: 'everyday-situations', label: '日常口语', cx: 120, cy: 190 },
    { id: 'question-asking', label: '提问交流', cx: 340, cy: 190 },
    { id: 'opinion-expression', label: '观点表达', cx: 460, cy: 190 },
    { id: 'comparing-discussing', label: '对比讨论', cx: 680, cy: 190 },
    { id: 'storytelling', label: '故事叙事', cx: 220, cy: 80 },
    { id: 'abstract-thinking', label: '抽象思维', cx: 580, cy: 80 },
  ];

  const NODE_CONNECTIONS = [
    { from: 'self-intro', to: 'daily-routine' },
    { from: 'self-intro', to: 'likes-dislikes' },
    { from: 'daily-routine', to: 'everyday-situations' },
    { from: 'daily-routine', to: 'question-asking' },
    { from: 'likes-dislikes', to: 'opinion-expression' },
    { from: 'likes-dislikes', to: 'comparing-discussing' },
    { from: 'everyday-situations', to: 'storytelling' },
    { from: 'opinion-expression', to: 'abstract-thinking' },
    { from: 'comparing-discussing', to: 'abstract-thinking' },
  ];

  const getNodeStatus = (nodeId: string) => {
    const hasDiscovery = discoveries.some(d => d.knowledge_node_id === nodeId);
    if (hasDiscovery) return 'mastered';
    if (nodeId === 'self-intro') return 'learning';
    
    // Check if parent node is mastered
    const parentConns = NODE_CONNECTIONS.filter(c => c.to === nodeId);
    const parentMastered = parentConns.some(c => 
      discoveries.some(d => d.knowledge_node_id === c.from) || c.from === 'self-intro'
    );
    return parentMastered ? 'learning' : 'locked';
  };

  const getNodeColor = (status: 'mastered' | 'learning' | 'locked') => {
    if (status === 'mastered') return '#00FF9D'; // Neon Green
    if (status === 'learning') return '#00E5FF'; // Cyan
    return '#444444'; // Muted Gray
  };

  // Filter discoveries based on selected node, or show all if none selected
  const displayedDiscoveries = selectedNodeId 
    ? discoveries.filter(d => d.knowledge_node_id === selectedNodeId)
    : discoveries;

  const selectedNodeLabel = selectedNodeId 
    ? KNOWLEDGE_NODES.find(n => n.id === selectedNodeId)?.label 
    : null;

  return (
    <div className={`w-full h-full flex flex-col pt-24 pb-20 px-6 md:px-12 ${is3DMode ? 'pointer-events-none' : 'pointer-events-auto'} overflow-y-auto`}>
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 pointer-events-auto">
          <div>
            <h1 className="text-3xl font-display text-text-primary tracking-wide mb-2 uppercase">星图</h1>
            <p className="text-sm text-text-secondary font-mono tracking-widest uppercase">潜意识知识映射</p>
          </div>

          <div className="flex items-center bg-surface-card/85 backdrop-blur-xl p-1 rounded-full border border-divider shadow-lg">
            <button 
              onClick={() => setIs3DMode(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors cursor-pointer ${!is3DMode ? 'bg-surface-ai text-brand-accent' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Network className="w-4 h-4" />
              2D 概览
            </button>
            <button 
              onClick={() => setIs3DMode(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors cursor-pointer ${is3DMode ? 'bg-brand-accent text-[#000000] shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Box className="w-4 h-4" />
              3D 探索
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {!is3DMode ? (
              <motion.div 
                key="2d"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full min-h-[500px] flex flex-col lg:flex-row gap-6"
              >
                {/* 2D SVG Tree Representation */}
                <div className="flex-[2] bg-surface-card/80 backdrop-blur-xl border border-divider rounded-3xl p-6 md:p-8 relative flex items-center justify-center overflow-hidden min-h-[420px] shadow-2xl">
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <filter id="glow-accent" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Render connections */}
                    <g strokeWidth="2.5" fill="none">
                      {NODE_CONNECTIONS.map((conn, idx) => {
                        const fromNode = KNOWLEDGE_NODES.find(n => n.id === conn.from);
                        const toNode = KNOWLEDGE_NODES.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;

                        const toStatus = getNodeStatus(conn.to);
                        const color = toStatus === 'mastered' ? '#00FF9D' : toStatus === 'learning' ? '#00E5FF' : '#222222';
                        const opacity = toStatus === 'mastered' ? 0.7 : toStatus === 'learning' ? 0.5 : 0.25;
                        const isDashed = toStatus === 'locked';

                        return (
                          <path
                            key={idx}
                            d={`M ${fromNode.cx} ${fromNode.cy} C ${fromNode.cx} ${(fromNode.cy + toNode.cy)/2}, ${toNode.cx} ${(fromNode.cy + toNode.cy)/2}, ${toNode.cx} ${toNode.cy}`}
                            stroke={color}
                            opacity={opacity}
                            strokeDasharray={isDashed ? "4 4" : undefined}
                            className="transition-all duration-300"
                          />
                        );
                      })}
                    </g>
                    
                    {/* Render Nodes */}
                    <g>
                      {KNOWLEDGE_NODES.map((node) => {
                        const status = getNodeStatus(node.id);
                        const color = getNodeColor(status);
                        const isSelected = selectedNodeId === node.id;
                        
                        return (
                          <g 
                            key={node.id} 
                            onClick={() => setSelectedNodeId(isSelected ? null : node.id)} 
                            className="cursor-pointer group"
                          >
                            {/* Glow ring when selected or active */}
                            {status !== 'locked' && (
                              <circle 
                                cx={node.cx} 
                                cy={node.cy} 
                                r={isSelected ? 16 : 12} 
                                fill="none" 
                                stroke={color} 
                                strokeWidth="1" 
                                opacity="0.4"
                                className={status === 'learning' ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'}
                              />
                            )}
                            
                            <circle 
                              cx={node.cx} 
                              cy={node.cy} 
                              r={isSelected ? 9 : 7} 
                              fill={color} 
                              filter={status !== 'locked' ? 'url(#glow-accent)' : undefined}
                              className="transition-all duration-300 group-hover:r-9"
                            />
                            
                            <text 
                              x={node.cx} 
                              y={node.cy} 
                              dy={node.cy > 250 ? 25 : -16} 
                              fill={isSelected ? '#00FF9D' : status === 'locked' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'} 
                              fontSize="11" 
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              textAnchor="middle" 
                              fontFamily="var(--font-display)"
                              className="select-none transition-colors duration-300 group-hover:fill-brand-accent"
                            >
                              {node.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>

                  {/* Dynamic Instructions */}
                  <div className="absolute top-4 left-6 text-[10px] text-text-secondary/70 font-mono uppercase tracking-widest">
                    提示: 点击任何星座节点可筛选查看特定词汇的分析记录
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-6 right-6 bg-surface-card/90 backdrop-blur-xl border border-divider p-4 rounded-2xl flex flex-col gap-2.5 shadow-xl">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
                      <span className="text-text-primary font-mono text-[10px]">已建立神经连接 (已掌握)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-hint shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                      <span className="text-text-primary font-mono text-[10px]">正在拓扑中 (学习中)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#444444]" />
                      <span className="text-text-secondary font-mono text-[10px]">前沿未涉足 (未解锁)</span>
                    </div>
                  </div>
                </div>

                {/* Right: History & Stats */}
                <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
                  <div className="bg-surface-card/80 backdrop-blur-xl border border-divider rounded-3xl p-5 shadow-lg">
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="w-10 h-10 rounded-full bg-brand-hint/15 border border-brand-hint/30 flex items-center justify-center mb-2">
                        <Sparkles className="w-4 h-4 text-brand-hint" />
                      </div>
                      <span className="text-[10px] text-text-secondary font-mono uppercase tracking-wider mb-0.5">累积潜意识神经连接</span>
                      <span className="text-3xl font-display font-light text-text-primary">{isLoading ? '-' : totalDiscoveries}</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-surface-card/80 backdrop-blur-xl border border-divider rounded-3xl p-5 flex flex-col overflow-hidden max-h-[350px] shadow-lg">
                    <h3 className="text-xs text-brand-accent font-bold tracking-widest uppercase mb-3 flex items-center justify-between shrink-0 font-mono">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> 
                        {selectedNodeId ? `【${selectedNodeLabel}】解析` : '全部知识解析'}
                      </span>
                      {selectedNodeId && (
                        <button 
                          onClick={() => setSelectedNodeId(null)}
                          className="text-[10px] text-text-secondary hover:text-brand-accent normal-case underline cursor-pointer"
                        >
                          显示全部
                        </button>
                      )}
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-none">
                      {displayedDiscoveries.length === 0 ? (
                        <div className="text-center text-text-secondary/40 py-12 text-xs font-mono">
                          {selectedNodeId ? '此节点暂无掌握记录，继续练习吧！' : '暂无学习发现记录，快去对话练习吧！'}
                        </div>
                      ) : (
                        displayedDiscoveries.map((disc) => (
                          <div key={disc.id} className="p-3.5 rounded-2xl bg-surface-ai/60 border border-divider hover:border-brand-accent/30 transition-colors flex flex-col gap-2">
                            <div className="text-xs font-semibold text-text-primary tracking-wide">
                              {disc.title || '探索语法概念'}
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed bg-surface-card/45 p-2.5 rounded-xl border border-divider/50">
                              {disc.summary || '暂无详细分析内容'}
                            </p>
                            {disc.tags && disc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {disc.tags.map((t: string, i: number) => (
                                  <span key={i} className="text-[9px] font-mono text-brand-accent/80 bg-brand-accent/5 px-2 py-0.5 rounded-full border border-brand-accent/15">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full min-h-[500px] flex items-end justify-between"
              >
                <div className="mb-8 ml-0 bg-surface-card/85 backdrop-blur-xl border border-divider p-6 rounded-3xl max-w-sm shadow-2xl">
                  <h3 className="text-lg font-display mb-2 text-text-primary uppercase tracking-widest">星系漫游</h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    您的语言能力已经汇聚成一片星系。拖拽以旋转，滚动以缩放，探索您已掌握的宇宙。
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-mono text-brand-accent">1.2k</span>
                      <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest mt-1">发光星体</span>
                    </div>
                  </div>
                </div>

                <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
                  <button 
                    onClick={() => setIs3DMode(false)}
                    className="px-6 py-3 bg-surface-card/90 backdrop-blur-xl border border-divider rounded-full text-xs font-bold uppercase tracking-widest hover:text-brand-accent transition-colors shadow-2xl cursor-pointer"
                  >
                    退出探索模式
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
