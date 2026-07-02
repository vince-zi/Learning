'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, Zap } from 'lucide-react';

export function ProfileSection() {
  return (
    <div className="w-full h-full flex flex-col justify-center p-6 md:p-12 pointer-events-auto overflow-y-auto text-[#FFFFFF]">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-12">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.3 }}
          className="w-full md:w-1/3 flex flex-col gap-6"
        >
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-3xl p-8 shadow-sm relative">
            <h2 className="text-3xl font-display uppercase tracking-wider mb-2 text-[#FFFFFF]">能力评估</h2>
            <p className="text-sm text-[#888888] font-mono tracking-widest uppercase mb-8">隐式直觉</p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#888888] uppercase tracking-wider">发音与韵律</span>
                  <span className="font-mono text-[#00E5FF]">85%</span>
                </div>
                <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: '85%' }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-[#00E5FF]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#888888] uppercase tracking-wider">语法句法</span>
                  <span className="font-mono text-[#00FF9D]">72%</span>
                </div>
                <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: '72%' }} transition={{ duration: 1, delay: 0.4 }} className="h-full bg-[#00FF9D]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#888888] uppercase tracking-wider">词汇深度</span>
                  <span className="font-mono text-[#FFFFFF]">91%</span>
                </div>
                <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: '91%' }} transition={{ duration: 1, delay: 0.6 }} className="h-full bg-[#FFFFFF]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="w-full md:w-2/3 grid grid-cols-2 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
            <Target className="w-6 h-6 text-[#00E5FF] mb-3" />
            <span className="text-2xl font-mono mb-1 text-[#FFFFFF]">14</span>
            <span className="text-[10px] font-mono tracking-widest text-[#888888]">专注天数</span>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm">
            <Activity className="w-6 h-6 text-[#00FF9D] mb-3" />
            <span className="text-2xl font-mono mb-1 text-[#FFFFFF]">12.5k</span>
            <span className="text-[10px] font-mono tracking-widest text-[#888888]">词汇结晶</span>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-2 md:col-span-1 bg-[#0A0A0A] border border-[#00FF9D]/30 p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-[#00FF9D]/5" />
            <Zap className="w-6 h-6 text-[#00FF9D] mb-3 relative z-10" />
            <span className="text-2xl font-mono mb-1 text-[#FFFFFF] relative z-10">B2</span>
            <span className="text-[10px] font-mono tracking-widest text-[#00FF9D] relative z-10">CEFR 评级</span>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
