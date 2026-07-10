import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// 注册 GSAP 插件
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function GsapDashboardDemo() {
  const welcomeRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // 1. 欢迎区域淡入入场
    gsap.to(welcomeRef.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power4.out',
    });

    // 2. 统计卡片交错弹性入场
    if (cardsRef.current) {
      const cards = cardsRef.current.children;
      gsap.from(cards, {
        opacity: 0,
        y: 40,
        scale: 0.95,
        stagger: 0.15,
        duration: 1.2,
        ease: 'elastic.out(1, 0.75)',
        delay: 0.2,
        onComplete: () => {
          // 卡片入场后启动数字增加和进度条动画
          animateCounters();
          animateProgressBar();
        }
      });
    }

    // 数字增长动效
    const animateCounters = () => {
      counterRefs.current.forEach((span) => {
        if (!span) return;
        const target = parseInt(span.getAttribute('data-target') || '0', 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => {
            span.innerText = String(Math.ceil(obj.val));
          }
        });
      });
    };

    // 进度条拉伸动效
    const animateProgressBar = () => {
      if (progressFillRef.current) {
        gsap.to(progressFillRef.current, {
          width: '76%',
          duration: 2,
          ease: 'power4.out',
        });
      }
    };

    // 3. 滚动视差：卡片滚动淡入 (ScrollTrigger)
    gsap.from('.course-card-demo', {
      scrollTrigger: {
        trigger: '#course-section-demo',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      opacity: 0,
      y: 50,
      stagger: 0.2,
      duration: 1,
      ease: 'power3.out',
    });

    // 4. 勋章轻微自转
    if (badgeRef.current) {
      gsap.to(badgeRef.current, {
        rotationY: 360,
        repeat: -1,
        duration: 8,
        ease: 'none',
      });
    }
  }, []);

  // 点击勋章触发弹性缩放和物理晃动
  const handleBadgeClick = () => {
    if (badgeRef.current) {
      gsap.fromTo(
        badgeRef.current,
        { scale: 1 },
        {
          scale: 1.2,
          duration: 0.6,
          ease: 'elastic.out(1.2, 0.3)',
          yoyo: true,
          repeat: 1,
        }
      );
      createConfetti();
    }
  };

  // 生成粒子纸屑
  const createConfetti = () => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + window.scrollX;
    const centerY = rect.top + rect.height / 2 + window.scrollY;

    const emojis = ['✨', '🎉', '🔥', '🏆', '⭐'];

    for (let i = 0; i < 15; i++) {
      const el = document.createElement('div');
      el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.position = 'absolute';
      el.style.left = `${centerX}px`;
      el.style.top = `${centerY}px`;
      el.style.fontSize = '24px';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '9999';
      document.body.appendChild(el);

      gsap.to(el, {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200 - 80,
        opacity: 0,
        scale: 0.5,
        duration: 1 + Math.random(),
        ease: 'power2.out',
        onComplete: () => el.remove(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#E2E8F0] p-8 font-sans overflow-hidden">
      {/* 顶部导航栏 */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#12131C]/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
            L
          </div>
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Learniny System
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-amber-500 font-semibold bg-white/5 px-3 py-1 rounded-full text-xs border border-white/10">
            🔥 连续 7 天打卡
          </span>
        </div>
      </nav>

      {/* 主面板内容 */}
      <main className="max-w-6xl mx-auto pt-24 space-y-12">
        {/* 欢迎语 */}
        <header ref={welcomeRef} className="opacity-0 translate-y-6">
          <h1 className="text-3xl font-extrabold text-white">
            下午好，Alex <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-gray-400 mt-1">今天又是充满期待的一天，开启你的 GSAP 交互动效学习之旅吧！</p>
        </header>

        {/* 统计卡片组 */}
        <section ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 卡片 1 */}
          <div className="bg-[#12131C] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">今日学习时长</span>
              <h2 className="text-3xl font-bold text-white mt-2">
                <span ref={(el) => { counterRefs.current[0] = el; }} data-target="120">0</span> 分钟
              </h2>
            </div>
            <div className="text-xs text-emerald-400 mt-2">▲ 较昨日提升 20%</div>
          </div>

          {/* 卡片 2 */}
          <div className="bg-[#12131C] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">知识点掌握进度</span>
              <h2 className="text-3xl font-bold text-white mt-2">
                <span ref={(el) => { counterRefs.current[1] = el; }} data-target="76">0</span>%
              </h2>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-4">
              <div ref={progressFillRef} className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-0 rounded-full"></div>
            </div>
          </div>

          {/* 卡片 3 */}
          <div className="bg-[#12131C] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">已获成就勋章</span>
              <h2 className="text-3xl font-bold text-white mt-2">
                <span ref={(el) => { counterRefs.current[2] = el; }} data-target="12">0</span> 个
              </h2>
            </div>
            <div className="text-xs text-amber-400 mt-2">🏆 即将解锁新勋章</div>
          </div>
        </section>

        {/* 课程区域 */}
        <section id="course-section-demo" className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
            <span>继续学习</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="course-card-demo bg-[#12131C] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-all">
              <div>
                <span className="px-2.5 py-1 text-xs bg-indigo-500/20 text-indigo-400 rounded-md">TypeScript</span>
                <h4 className="text-lg font-bold text-white mt-4">掌握 TS 装饰器与依赖注入核心机制</h4>
                <p className="text-sm text-gray-400 mt-2">深入底层机制，学会用元数据反射机制优雅搭建依赖注入容器。</p>
              </div>
              <button className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition">
                进入课堂
              </button>
            </div>

            <div className="course-card-demo bg-[#12131C] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-all">
              <div>
                <span className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md">前端动效</span>
                <h4 className="text-lg font-bold text-white mt-4">GSAP 视差滚动与高级动效实战</h4>
                <p className="text-sm text-gray-400 mt-2">本章带你通过 ScrollTrigger 插件在 Next.js 里打造丝滑的故事化长图网页。</p>
              </div>
              <button className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition">
                进入课堂
              </button>
            </div>
          </div>
        </section>

        {/* 游戏化互动面板 */}
        <section className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-4 max-w-lg">
            <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
              ⚡ 互动挑战
            </span>
            <h3 className="text-2xl font-extrabold text-white">解锁你的“动效先驱”限定 3D 徽章</h3>
            <p className="text-gray-400 text-sm">
              连续完成 5 节课并通过考核，即可获得该链上数字徽章。轻戳右侧的徽章，测试它的动效弹性反馈！
            </p>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div
              ref={badgeRef}
              onClick={handleBadgeClick}
              className="w-28 h-28 bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-300 rounded-full shadow-2xl flex items-center justify-center text-5xl cursor-pointer border-4 border-white/10 select-none"
            >
              🏆
            </div>
            <span className="text-xs text-gray-500">点击徽章触发物理撞击效果</span>
          </div>
        </section>
      </main>
    </div>
  );
}
