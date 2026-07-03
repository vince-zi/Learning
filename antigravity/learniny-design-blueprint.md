# Learniny 三阶段前端设计方案

> 状态：Phase 1 已完成 | Phase 2-3 待开发

---

## 项目定位

**Learniny** — AI 英语学习思考伙伴。通过苏格拉底式启发对话、隐性纠错、直觉语感构建，让用户在真实对话中掌握英语。

### 品牌视觉参数

| 角色 | 色值 | 用途 |
|------|------|------|
| 背景深色 | `#0E0D0C` | 全局底盘 |
| 品牌琥珀金 | `#E5A93C` | 强调色、CTA 按钮、光晕 |
| 品牌激光蓝 | `#0088FF` | 次级强调、渐变终点 |
| 文字主色 | `#F3EFEA` | 标题、正文 |
| 文字次色 | `rgba(243,239,234,0.5)` | 描述文字 |
| 玻璃面板 | `rgba(20,18,17,0.75)` | 卡片背景 |

### 字体

| 用途 | 字体 |
|------|------|
| 标题 | Playfair Display（衬线）|
| 正文/UI | Geist（Geist Sans）|

### 技术栈

- **Next.js 16.2.9** (webpack 模式)
- **Three.js 0.185** + @react-three/fiber + @react-three/drei
- **GSAP 3.15** + @gsap/react + ScrollTrigger
- **simplex-noise** (3D 几何体顶点变形)
- **Tailwind CSS v4**

### 页面路由

```
/           — 品牌着陆页 (Phase 1 ✅)
/discovery  — 知识星座图 (Phase 2 ⏳)
/practice   — 沉浸式练习舱 (Phase 3 ⏳)
/progress   — 学习进度页 (已有)
```

---

## Phase 1 — 品牌着陆页 `/` ✅ 已完成

### 设计目标

替换原有的 3D CSS 翻书首页，做成品牌宣发级别的着陆体验。用户滚动时，3D 几何体随进度变化，文字段落 fade-in 入场，每个章节有 AI 生成的品牌图片做背景。

### 页面结构

```
Navbar (fixed)
├─ Section 1 / Hero (100vh)    — 品牌口号 + CTA
├─ Section 2 / 核心理念 (100vh)  — 苏格拉底式对话
├─ Section 3 / 对话模式 (100vh)  — 三种风格卡片
├─ Section 4 / CTA (100vh)       — 开始使用
└─ Footer
```

### 技术实现

| 层 | 技术 | 说明 |
|----|------|------|
| 3D 背景 | Three.js TorusKnot + R3F | 环面结随 scroll 旋转/形变/变色 |
| 滚动驱动 | GSAP ScrollTrigger `scrub: 1` | 进度映射到 3D 旋转、scale、顶点 morph |
| 入场动效 | GSAP `.from()` + stagger | 每个 section 文字 fade-in 入场 |
| React 集成 | `useGSAP` hook | 自动 scope + cleanup |
| 品牌图片 | yunwu.ai GPT-image-2 | 每个 section 背景由 AI 生成 |

### 3D 动画映射

| 滚动位置 | 3D 物体状态 |
|----------|-------------|
| 0-8% | 从 0.3 缩放到 1.0，暖金色 |
| 8-25% | 旋转加速，颜色向蓝色偏移 |
| 25-75% | 线框叠加层渐入/出，顶点变形峰值 |
| 75-85% | 线框和变形消退 |
| 85-100% | 缩放回 1.0，稳定结束 |

### 品牌图片

| 文件 | 场景 | 尺寸 |
|------|------|------|
| `brand-hero.jpg` | 暖光笔记本桌面 + 蓝色粒子 | 1792×1024 |
| `brand-philosophy.jpg` | 苏格拉底对话氛围 + 书桌 | 1024×1024 |
| `brand-modes.jpg` | 三色光球悬浮 | 1024×1024 |

### 生成命令

```bash
# 通过 yunwu.ai API + gpt-image-2 模型
# 使用 .hermes/skills/creative/yunwu-image-gen/scripts/gen-image.py

YUNWU_API_KEY=$(python3 -c "print(bytes.fromhex(open('~/.yunwu_key.hex').read().strip()).decode())")

# Hero image
curl -s --max-time 180 https://yunwu.ai/v1/images/generations \
  -H "Authorization: Bearer $YUNWU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-image-2","prompt":"...","n":1,"size":"1792x1024","quality":"standard","response_format":"url"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['url'])" \
  | xargs -I{} curl -sL -o public/brand-hero.jpg "{}"
```

---

## Phase 2 — 知识星座图 `/discovery` ⏳ 待开发

### 设计目标

用 Three.js 做一个 3D **知识星座图谱**，展示英语学习的知识节点网络。

### 核心概念

- 每个节点 = 一个知识点（语法点、表达方式、常见错误）
- 连接线 = 知识关联度
- 已掌握 → 金色发光节点
- 学习中 → 蓝色脉动节点
- 未发现 → 暗淡星点
- 用户可鼠标拖拽旋转/缩放探索

### 视觉效果

```
        ★ (完成)
       / \
      /   \
     ✦─────✦─────☆ (锁住)
    / \    / \
   ★   ✧  ✧   ◇
       / \
      ✦   ◇
```

- 深色背景 `#0E0D0C`
- 节点用 `SphereGeometry` + `MeshStandardMaterial` + 自发光
- 连接线用 `Line` / `LineBasicMaterial`（低透明度）
- GSAP 驱动节点入场动画（stagger 出现）
- 鼠标悬停节点时放大 + 显示知识点名称

### 技术要点

| 层 | 技术 |
|----|------|
| 3D 节点 | Three.js InstancedMesh（性能）或 R3F |
| 连接线 | `THREE.Line` 或 `LineSegments` |
| 交互 | Drei `OrbitControls` + 自定义 raycasting |
| 入场动画 | GSAP stagger + 节点从外向内飞入 |
| 数据 | 知识节点数据来自 API 或静态配置 |

### 数据接口（建议）

```typescript
interface KnowledgeNode {
  id: string
  label: string          // 如 "现在完成时"
  category: 'grammar' | 'expression' | 'error_fix'
  status: 'mastered' | 'learning' | 'locked'
  connections: string[]  // 关联节点 ID
  position: [number, number, number]  // 3D 坐标
}
```

### 风险

- 需要真实知识节点数据，如果 API 还没有，需要先做静态 mock
- 3D 文字标签（CSS2DOverlay 或 sprite）在移动端可读性差

---

## Phase 3 — 沉浸式练习舱 `/practice` ⏳ 待开发

### 设计目标

把练习对话界面升级为**围绕 3D 核心旋转的对话舱**，每次对话互动都有视觉反馈。

### 核心概念

- 中央一个发光的 3D 球体（品牌琥珀金色），缓慢旋转
- 用户发出一条消息 → 球体脉动一次 + 金色涟漪扩散
- 纠错反馈 → 蓝色波纹 + 球体微微放大
- 对话历史以半透明气泡漂浮在周围

### 视觉效果

```
    [昨天我说了什么...]
             \
              \      [AI 回复气泡]
               \    /
        ┌──────────────────┐
        │                  │
  [气泡]│    ～ 核心球体 ～  │[气泡]
        │    (旋转 + 脉冲)  │
        │                  │
        └──────────────────┘
              /      \
             /        \
    [气泡]  /          \  [气泡]
```

### 技术要点

| 层 | 技术 |
|----|------|
| 3D 核心 | R3F + `SphereGeometry` + `MeshPhysicalMaterial` |
| 脉动效果 | GSAP `scaleTo` + `opacity` on message send |
| 涟漪 | 透明环（`TorusGeometry`）由内向外扩散 |
| 对话 UI | 保留现有聊天组件，叠加在 3D 画布上 |

### 风险

- **最高风险**：`/practice` 有真实会话逻辑和状态管理，改动必须非常谨慎
- 不能破坏现有的会话创建/恢复/测评流程
- 3D 场景可能影响低端设备的对话性能
- **建议**：先做非破坏性改动——只加背景 3D 层，不动对话组件核心逻辑

---

## 实施顺序

```
Phase 1 (✅ 完成)            Phase 2 (下一步)         Phase 3 (最后)
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│  品牌着陆页  │ ──→       │  知识星座图  │ ──→       │  沉浸练习舱  │
│  /           │           │  /discovery  │           │  /practice   │
├─────────────┤           ├─────────────┤           ├─────────────┤
│ 独立页面     │           │ 独立页面     │           │ 高耦合页面   │
│ 低风险       │           │ 中风险       │           │ 高风险       │
└─────────────┘           └─────────────┘           └─────────────┘
```

---

## 通用技术模式（三阶段共享）

```tsx
// 1. 3D 背景用 fixed Canvas
<div className="fixed inset-0 z-0 pointer-events-none">
  <Canvas camera={{ fov: 50 }} ...>
    {/* 3D 场景 */}
  </Canvas>
</div>

// 2. GSAP ScrollTrigger 驱动 3D 进度
ScrollTrigger.create({
  trigger: '#sections',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  onUpdate: (self) => { threeVars.progress = self.progress }
})

// 3. 段落入场用 GSAP .from()
useGSAP(() => {
  gsap.from(el, {
    opacity: 0, y: 30, stagger: 0.08,
    scrollTrigger: { trigger: section }
  })
}, { scope: sectionRef })

// 4. 资源清理用 useGSAP 自动 revert
// 5. 品牌色镭射渐变文字
<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5A93C] to-[#0088FF]">
```

---

*文档版本：2026-06-30 | 来源：/home/dev/.claude/plans/rippling-humming-starlight.md*
