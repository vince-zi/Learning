# Learning — AI 英语直觉学习系统

一个基于 Next.js 的个人学习应用，用苏格拉底式对话帮你建立英语直觉（语感），覆盖「对话 → 错误发现 → 温习 → 针对性训练」的完整学习闭环。

## 核心功能

- **AI 英语对话** — 和 AI 用英语聊天，实时语法错误检测与分类
- **黄点语法分析** — 对句子做快速语法拆解，用黄点标注需要注意的语法点
- **中英混合识别** — 支持中英文混排内容的智能识别与处理
- **全局温习** — 基于全量历史错题，扮演"过去的自己"进行重构改错训练
- **针对性训练** — 分析语法弱点（时态、冠词、介词等），生成专项填空/翻译练习
- **直觉错题本** — 所有错误自动入库，双关卡复习 + 间隔重复，消灭了才算过关
- **知识图谱** — 将学到的语法/词汇结构化关联，可视化成长路线
- **三级语言偏好系统** — 纯英语环境 / 平衡模式 / 中文大白话讲解，自由切换

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 16 + React 19 + TypeScript |
| 样式 | Tailwind CSS 4 + Framer Motion |
| 状态管理 | Zustand |
| 数据库 | Supabase (PostgreSQL + RLS) |
| AI | DeepSeek / Claude / OpenAI（可插拔） |
| 部署 | Netlify |

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看效果。

## 环境变量

复制 `.env.local.example` 为 `.env.local`，填入你的配置：

```bash
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx

# AI Provider（至少配一个，推荐 DeepSeek）
DEEPSEEK_API_KEY=sk-xxxxx
# 或 ANTHROPIC_API_KEY=sk-ant-xxxxx
# 或 OPENAI_API_KEY=sk-xxxxx
```

## 数据库初始化

在 Supabase SQL Editor 中依次执行 `supabase/migrations/` 下的 SQL 文件。

## 部署

项目已配置 Netlify，push 到 main 分支后自动部署。需在 Netlify 控制台设置上述环境变量。
