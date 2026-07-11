'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Activity, Zap, Clipboard, Check, Sparkles, AlertCircle, MessageSquare, Send, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/db/supabase-client';
import { useSessionStore } from '@/store/session-store';
import { getUserId } from '@/lib/user-id';

function getFriendlyErrorName(type: string): string {
  const names: Record<string, string> = {
    'grammar-tense': '动词时态',
    'grammar-article': '冠词使用',
    'grammar-preposition': '介词搭配',
    'grammar-word-order': '语序结构',
    'grammar-agreement': '主谓一致',
    'vocabulary-choice': '词汇搭配',
    'expression-chinglish': '地道英语表达',
    'expression-incomplete': '句子完整性',
    '时态 / 助动词': '时态与助动词',
    '介词搭配': '介词搭配',
    '时态错误': '时态错误',
    '冠词错误': '冠词错误',
    '中式英语': '中式英语',
  };
  return names[type] || type || '语法表达';
}

export function ProfileSection() {
  const { activeSection } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [focusDays, setFocusDays] = useState(0);
  const [grammarPoints, setGrammarPoints] = useState<string[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeSection !== 'profile') return;

    let mounted = true;
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const userId = getUserId();
        
        // 1. 获取 profile
        const { data: profileData } = await supabase
          .from('english_learner_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        // 2. 获取 sessions 统计专注天数
        const { data: sessionsData } = await supabase
          .from('learning_sessions')
          .select('created_at')
          .eq('user_id', userId);

        // 3. 获取过去 7 天的 error_records 统计语法点
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const { data: weekErrors } = await supabase
          .from('error_records')
          .select('error_type, created_at')
          .eq('user_id', userId)
          .gte('created_at', oneWeekAgo.toISOString());

        let pointsList: string[] = [];
        if (mounted) {
          if (weekErrors && weekErrors.length > 0) {
            pointsList = Array.from(new Set(weekErrors.map(e => getFriendlyErrorName(e.error_type))));
          } else {
            // 兜底：所有历史错误
            const { data: allErrors } = await supabase
              .from('error_records')
              .select('error_type')
              .eq('user_id', userId)
              .limit(30);
            if (allErrors && allErrors.length > 0) {
              pointsList = Array.from(new Set(allErrors.map(e => getFriendlyErrorName(e.error_type))));
            }
          }
          setGrammarPoints(pointsList);
        }

        // 4. 获取未解决的错误以作为薄弱环节兜底
        let weaknessesList = profileData?.weaknesses || [];
        if (weaknessesList.length === 0) {
          const { data: activeErrors } = await supabase
            .from('error_records')
            .select('error_type')
            .eq('user_id', userId)
            .eq('noted_by_user', false);
          
          if (activeErrors && activeErrors.length > 0) {
            const counts: Record<string, number> = {};
            activeErrors.forEach(e => {
              counts[e.error_type] = (counts[e.error_type] || 0) + 1;
            });
            weaknessesList = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([type]) => `练习中经常出现「${getFriendlyErrorName(type)}」类语法错误`);
          } else {
            weaknessesList = ['暂无明显薄弱环节，继续加油！'];
          }
        }

        // 5. 获取优势兜底
        let strengthsList = profileData?.strengths || [];
        if (strengthsList.length === 0) {
          const { data: solvedErrors } = await supabase
            .from('error_records')
            .select('error_type')
            .eq('user_id', userId)
            .eq('noted_by_user', true);
          if (solvedErrors && solvedErrors.length > 0) {
            const solvedTypes = Array.from(new Set(solvedErrors.map(e => getFriendlyErrorName(e.error_type))));
            strengthsList = solvedTypes.slice(0, 2).map(type => `成功掌握「${type}」的语法运用`);
          } else {
            strengthsList = ['具备基础英语交流和句型表达能力'];
          }
        }

        if (mounted) {
          // 整理最终的 profile
          setProfile({
            cefr_level: profileData?.cefr_level || 'A1',
            known_vocabulary_size: profileData?.known_vocabulary_size || 500,
            strengths: strengthsList,
            weaknesses: weaknessesList,
          });

          // 计算专注天数
          const days = new Set(
            (sessionsData || []).map(s => new Date(s.created_at).toDateString())
          ).size;
          setFocusDays(days || 1); // 兜底至少 1 天

          setGrammarPoints(pointsList.length > 0 ? pointsList : ['基础语法表达']);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        if (mounted) {
          // 兜底数据
          setProfile({
            cefr_level: 'A2',
            known_vocabulary_size: 800,
            strengths: ['具备基础英语交流和句型表达能力'],
            weaknesses: ['时态转换不够熟练，容易遗漏过去式'],
          });
          setFocusDays(1);
          setGrammarPoints(['基础语法表达']);
          setLoading(false);
        }
      }
    };

    loadProfileData();
    return () => { mounted = false; };
  }, [activeSection]);

  const cefr = profile?.cefr_level || 'A1';
  
  // 1. 表达流利度：根据 CEFR 固定基准分 (项目为纯文本，故以流利度替代发音)
  const fluencyBase: Record<string, number> = {
    'A1': 55, 'A2': 65, 'B1': 75, 'B2': 85, 'C1': 92, 'C2': 96
  };
  const fluencyScore = fluencyBase[cefr] || 60;

  // 2. 语法句法：根据 CEFR 水平计算
  const grammarBase: Record<string, number> = {
    'A1': 50, 'A2': 62, 'B1': 72, 'B2': 82, 'C1': 90, 'C2': 95
  };
  const grammarScore = grammarBase[cefr] || 60;

  // 3. 词汇深度：根据 CEFR 基准进行评估，避免 A1 级别用户出现 80%+ 词汇深度的逻辑自相矛盾 Bug
  const vocabSize = profile?.known_vocabulary_size || 500;
  const vocabularyBase: Record<string, number> = {
    'A1': 52, 'A2': 64, 'B1': 74, 'B2': 84, 'C1': 91, 'C2': 96
  };
  const baseVocabScore = vocabularyBase[cefr] || 60;
  
  // 根据真实词汇量进行微调 (期望词汇量: A1: 500, A2: 1500, B1: 3000, B2: 6000, C1: 10000)
  const expectedVocab: Record<string, number> = {
    'A1': 500, 'A2': 1500, 'B1': 3000, 'B2': 6000, 'C1': 10000, 'C2': 15000
  };
  const expected = expectedVocab[cefr] || 1000;
  const ratio = vocabSize / expected;
  const adjustment = Math.min(4, Math.max(-4, Math.round((ratio - 1) * 3)));
  const vocabularyScore = Math.min(98, Math.max(45, baseVocabScore + adjustment));

  const formatVocabularySize = (size: number) => {
    if (size >= 1000) {
      return (size / 1000).toFixed(1) + 'k';
    }
    return size.toString();
  };

  const generateReportText = () => {
    if (!profile) return '';
    const pointsStr = grammarPoints.join('、');
    const weaknessesStr = profile.weaknesses.map((w: string, i: number) => `  ${i + 1}. ${w}`).join('\n');
    
    return `这是我的英语水平和练习记录，接下来请根据这个跟我练习口语：

- 英语水平 (CEFR)：${profile.cefr_level} (预估词汇量: ${profile.known_vocabulary_size})
- 本周练习语法点：${pointsStr}
- 薄弱环节：
${weaknessesStr}`;
  };

  const handleCopy = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      const userId = getUserId() || 'anonymous';
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: feedbackText.trim(), page: 'profile' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }
      setFeedbackDone(true);
      setFeedbackText('');
      setTimeout(() => {
        setFeedbackDone(false);
        setFeedbackOpen(false);
      }, 3000);
    } catch (err: any) {
      setFeedbackError(err.message || '提交失败，请稍后重试');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center pointer-events-none text-[#FFFFFF]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FF9D]" />
        <span className="mt-4 text-xs font-mono tracking-widest text-[#888888]">LACING DYNAMICS...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-start pt-16 md:justify-center md:pt-0 p-6 md:p-12 pointer-events-auto overflow-y-auto text-[#FFFFFF]">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-stretch gap-6 md:gap-12">
        
        {/* 左侧：能力评估 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.3 }}
          className="w-full md:w-1/3 flex flex-col"
        >
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-3xl p-8 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-display uppercase tracking-wider mb-2 text-[#FFFFFF]">能力评估</h2>
              <p className="text-xs md:text-sm text-[#888888] font-mono tracking-widest uppercase mb-6 md:mb-8">隐式直觉</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#888888] uppercase tracking-wider">表达流利度</span>
                    <span className="font-mono text-[#00E5FF]">{fluencyScore}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      whileInView={{ width: `${fluencyScore}%` }} 
                      transition={{ duration: 1, delay: 0.2 }} 
                      className="h-full bg-[#00E5FF]" 
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#888888] uppercase tracking-wider">语法句法</span>
                    <span className="font-mono text-[#00FF9D]">{grammarScore}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      whileInView={{ width: `${grammarScore}%` }} 
                      transition={{ duration: 1, delay: 0.4 }} 
                      className="h-full bg-[#00FF9D]" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#888888] uppercase tracking-wider">词汇深度</span>
                    <span className="font-mono text-[#FFFFFF]">{vocabularyScore}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      whileInView={{ width: `${vocabularyScore}%` }} 
                      transition={{ duration: 1, delay: 0.6 }} 
                      className="h-full bg-[#FFFFFF]" 
                    />
                  </div>
                </div>
              </div>

              {profile?.strengths && profile.strengths.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
                  <h4 className="text-[10px] font-mono tracking-widest text-[#00FF9D] uppercase mb-3">我的强项 / Strengths</h4>
                  <ul className="space-y-2.5 text-xs text-[#888888] font-normal leading-relaxed">
                    {profile.strengths.slice(0, 3).map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#00FF9D] font-bold mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#888888] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] leading-normal text-[#666666]">
                  基于你在 Learniny 的口语实战对话和语法纠错记录实时计算。多开启对话可以提高评估精度。
                </p>
              </div>
              <div className="mt-3 text-center">
                <span className="text-[9px] font-mono text-[#333333] select-all">{getUserId() || '...'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 右侧：统计卡片 + 学习画像报告卡片 */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          
          {/* 三个统计网格卡片 */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }} 
              className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm"
            >
              <Target className="w-6 h-6 text-[#00E5FF] mb-3" />
              <span className="text-2xl font-mono mb-1 text-[#FFFFFF] font-bold">{focusDays}</span>
              <span className="text-[10px] font-mono tracking-widest text-[#888888] uppercase">专注天数</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }} 
              className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm"
            >
              <Activity className="w-6 h-6 text-[#00FF9D] mb-3" />
              <span className="text-2xl font-mono mb-1 text-[#FFFFFF] font-bold">{formatVocabularySize(vocabSize)}</span>
              <span className="text-[10px] font-mono tracking-widest text-[#888888] uppercase">词汇结晶</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }} 
              className="bg-[#0A0A0A] border border-[#00FF9D]/30 p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#00FF9D]/5" />
              <Zap className="w-6 h-6 text-[#00FF9D] mb-3 relative z-10" />
              <span className="text-2xl font-mono mb-1 text-[#FFFFFF] font-bold relative z-10">{profile?.cefr_level || 'A1'}</span>
              <span className="text-[10px] font-mono tracking-widest text-[#00FF9D] relative z-10 uppercase">CEFR 评级</span>
            </motion.div>
          </div>

          {/* 学习画像报告大卡片 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 md:p-8 rounded-3xl flex flex-col shadow-sm relative overflow-hidden flex-1"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00FF9D]" />
                  <h3 className="text-lg font-display text-[#FFFFFF]">智能学习画像报告</h3>
                </div>
                <p className="text-xs text-[#888888] mt-1">一键复制并作为口语助手（如豆包）的定制化练习开场白</p>
              </div>
              
              <button
                onClick={handleCopy}
                className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 pointer-events-auto border ${
                  copied 
                    ? 'bg-[#00FF9D]/10 border-[#00FF9D] text-[#00FF9D] scale-[0.98]' 
                    : 'bg-[#FFFFFF] border-transparent text-[#000000] hover:bg-transparent hover:border-[#1A1A1A] hover:text-[#FFFFFF]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    已复制到剪贴板
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" />
                    复制画像报告
                  </>
                )}
              </button>
            </div>

            {/* 报告文本预览框 */}
            <div className="bg-[#060606] border border-[#141414] rounded-2xl p-5 font-mono text-xs leading-relaxed text-[#A0A0A0] flex-1 whitespace-pre-wrap select-all relative group">
              <div className="absolute top-3 right-3 text-[10px] text-[#444444] group-hover:text-[#888888] transition-colors uppercase font-mono pointer-events-none">
                PREVIEW
              </div>
              {generateReportText()}
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
              <span className="text-[10px] font-mono text-[#666666]">
                建议将此段文本发送至对话机器人，引导其根据你的真实水平定制对话演练。
              </span>
            </div>
          </motion.div>

          {/* 用户建议提交面板 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={() => setFeedbackOpen(!feedbackOpen)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#333333] transition-all duration-300 group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-sm text-[#CCCCCC] font-medium">有建议想说？</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#666666] transition-transform duration-300 ${feedbackOpen ? 'rotate-180' : ''}`} />
            </button>

            {feedbackOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-5 overflow-hidden"
              >
                {feedbackDone ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-10 h-10 rounded-full bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#00FF9D]" />
                    </div>
                    <span className="text-sm text-[#00FF9D] font-medium">感谢你的建议！</span>
                    <span className="text-xs text-[#666666]">我们会认真阅读每一条反馈</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value.slice(0, 500))}
                      placeholder="告诉我们你的想法、建议或遇到的问题..."
                      rows={3}
                      className="w-full bg-[#060606] border border-[#1A1A1A] rounded-xl p-3 text-sm text-[#CCCCCC] placeholder:text-[#444444] focus:outline-none focus:border-[#00E5FF]/40 resize-none font-sans transition-colors duration-200"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-[#444444] font-mono">{feedbackText.length}/500</span>
                      <div className="flex items-center gap-3">
                        {feedbackError && (
                          <span className="text-xs text-[#FF3366]">{feedbackError}</span>
                        )}
                        <button
                          onClick={handleFeedbackSubmit}
                          disabled={!feedbackText.trim() || feedbackSubmitting}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 border ${
                            feedbackSubmitting
                              ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#666666] cursor-wait'
                              : feedbackText.trim()
                                ? 'bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/20 hover:border-[#00E5FF]/60'
                                : 'bg-[#0A0A0A] border-[#1A1A1A] text-[#444444] cursor-not-allowed'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          {feedbackSubmitting ? '提交中...' : '提交建议'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>

        </div>

      </div>
    </div>
  );
}
