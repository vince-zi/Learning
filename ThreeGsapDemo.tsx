import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ThreeGsapDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- 1. 初始化 Three.js 场景 ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    // 相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    // 渲染器 (带 Alpha 通道支持网页背景透过来)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- 2. 创建 3D 几何体 (以一个酷炫的科技粒子球和多面体为例) ---
    // 核心晶体几何体
    const geometry = new THREE.IcosahedronGeometry(1.5, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 外围漂浮粒子云
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 8;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.04,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // --- 3. 动画循环与尺寸自适应 ---
    let animationFrameId: number;
    const animate = () => {
      // 基础自转，作为没有滚动时的默认动态
      mesh.rotation.y += 0.002;
      particlesMesh.rotation.y -= 0.001;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- 4. GSAP + ScrollTrigger 联动 (魔法开始的地方) ---
    // 随着页面向下滚动，3D 物体会进行缩放、深度旋转、并改变其线框颜色与不透明度
    gsap.timeline({
      scrollTrigger: {
        trigger: ".three-trigger-section", // 触发滚动的区域
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // 丝滑跟手滚动效果
      }
    })
    .to(mesh.rotation, {
      x: Math.PI * 2,
      y: Math.PI * 4,
      ease: 'none'
    }, 0)
    .to(particlesMesh.rotation, {
      y: -Math.PI * 2,
      ease: 'none'
    }, 0)
    .to(mesh.scale, {
      x: 1.8,
      y: 1.8,
      z: 1.8,
      ease: 'power1.inOut'
    }, 0)
    .to(material, {
      opacity: 0.9,
      ease: 'none'
    }, 0)
    .to(camera.position, {
      z: 3, // 相机推近，造成裸眼 3D 飞跃感
      ease: 'power1.inOut'
    }, 0);

    // 文字交互动效
    gsap.to(textRef.current, {
      scrollTrigger: {
        trigger: ".three-trigger-section",
        start: "top 20%",
        end: "top -50%",
        scrub: 1
      },
      scale: 1.1,
      filter: "blur(4px)",
      opacity: 0,
      y: -50
    });

    // 清理函数
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full bg-[#030303] text-white">
      {/* 1. 全屏固定的 WebGL Canvas 背景 */}
      <div 
        ref={containerRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-10" 
      />

      {/* 2. 滚动的触发容器 (用于 ScrollTrigger 的拉长容器) */}
      <div className="three-trigger-section relative z-20 min-h-[300vh]">
        
        {/* 第一幕：引导介绍 */}
        <section className="h-screen flex flex-col justify-center items-center px-6">
          <div className="text-center max-w-2xl space-y-4">
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-900">
              WebGL 3D × GSAP 联动
            </span>
            <h1 ref={textRef} className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              往下滚动鼠标<br/>体验真正的 3D 视觉史诗
            </h1>
            <p className="text-gray-500 text-sm md:text-base">
              此时，GSAP 已经接管了 WebGL 相机坐标与三维网格物体的旋转角度。
            </p>
            <div className="text-indigo-400 text-xs animate-bounce pt-8">
              ↓ 往下滚动
            </div>
          </div>
        </section>

        {/* 第二幕：相机推进与形态重组 */}
        <section className="h-screen flex items-center justify-start px-12 md:px-24">
          <div className="max-w-md bg-black/60 border border-white/5 backdrop-blur-xl p-8 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-xl shadow-lg">🌀</div>
            <h2 className="text-2xl font-black text-white">空间透视拉伸 (Perspective)</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              当容器滚动到该区域，GSAP 会将 Three.js 的 `camera.position.z` 推进。
              你会发现几何体被急剧放大，粒子向四周飞散，产生了强烈的“穿越星际”视差体验。
            </p>
          </div>
        </section>

        {/* 第三幕：完全融合的现代 UI */}
        <section className="h-screen flex items-center justify-end px-12 md:px-24">
          <div className="max-w-md bg-black/60 border border-white/5 backdrop-blur-xl p-8 rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-xl shadow-lg">⚡</div>
            <h2 className="text-2xl font-black text-white">这才是酷炫的灵魂 🚀</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              结合你的 `learniny-system`。你可以将 3D 模型替换为**齿轮、知识魔方、或者代表学习进度的地球仪**。
              用户每完成一章，地球仪便由暗变亮，转动到下一个国家。这就是最顶级的视觉说服力。
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
