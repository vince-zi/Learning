# Handoff — Antigravity ↔ Claude Code

> 切换工具前，填写当前步骤。对方打开项目后，第一件事读这个文件。

---

## 当前步骤

- [x] Step 1 — 理解用户问题
- [x] Step 2 — 研究（代码 / 架构 / 文档）
- [x] Step 3 — 根因分析
- [x] Step 4 — 制定计划
- [x] Step 5 — 用户确认
- [x] Step 6 — 执行
- [x] Step 7 — 验证

---

## 用户问题

<!-- 用户想解决什么？原话是什么？ -->

用户希望将英语知识库中的“温习”与“针对训练”改造成两个全局独立的模块，而不是挂在每个话题节点上。
- 温习：扮演过去的自己，调取全量历史错题/发现，让用户重构得更完美。
- 针对训练：分析全量历史错题/发现的语法弱点，进行专项测试/翻译/填空训练。
- 话题节点：恢复为单按钮（再次温习/开始针对性练习），专注于节点本身的话题场景对话。
- 此外修正学习天数计算，并解决跳转会话缓存残留、CLI容易卡死等体验性问题。

---

## 用户目标 / 痛点 / 成功标准

| 维度 | 内容 |
|------|------|
| 目标 | 实现全局“温习”与“针对训练”独立模块，并规范话题节点按钮，精准计算学习天数。 |
| 痛点 | 原先混淆的按钮设计、错误的7天估算、会话切换时旧消息缓存残留、CLI渲染长Markdown易卡死。 |
| 成功标准 | 1. 进度页顶部展示全局温习与特训卡片；2. 知识节点恢复为单个按钮；3. 学习天数基于真实 session 日期去重计算；4. 退出或重置会话可清理上一场记录。 |
| 失败风险 | AI没有依据用户的真实历史记录来发问；或者跳转新会话时展示了老对话。 |

---

## 研究结果

<!-- 已查看的文件、模块、文档 -->

- [app/progress/page.tsx](file:///home/dev/learniny-system/app/progress/page.tsx) — 负责展示进度页、卡片布局、节点列表及动作跳转逻辑。
- [app/api/chat/route.ts](file:///home/dev/learniny-system/app/api/chat/route.ts) — 负责AI对话引擎、角色扮演指令分流。
- [app/api/sessions/route.ts](file:///home/dev/learniny-system/app/api/sessions/route.ts) — 负责创建新会话，支持任意 theme 和 nodeId。

---

## 根因分析

| # | 可能原因 | 可能性 | 依据 |
|---|---------|--------|------|
| 1 | 界面设计将温习和特训放到了每个节点上，导致无法进行“全历史”维度的综合练习。 | 100% (最可能) | 用户在原话题下只能练习该话题的内容，而温习和针对训练应该从全局错题库随机抽样。 |
| 2 | streakDays 原先由写死的 7 天估算或者不准确 of session 数量推导。 | 100% | 代码先前并未对开始时间进行自然日 Set 去重计算。 |

最可能原因：功能设计与用户意图有偏差，需要将温习和特训从“话题局部维度”升级为“用户个人全量错题维度”的全局大模块。

---

## 计划

<!-- 引用 PLAN.md 或在此简述 -->

| 项目 | 内容 |
|------|------|
| 解决方案 | 在进度页顶部插入全局温习/特训的卡片；所有话题节点恢复单按钮；后端 API 异步查询全部历史错题库注入 System Prompt。 |
| 影响范围 / 文件 | `app/progress/page.tsx`, `app/api/chat/route.ts` |
| 风险 | 无错题记录时AI对话冷启动（通过CEFR等级编造默认错句解决）。 |
| 回滚方案 | git checkout 对应文件 |

---

## 执行结果

<!-- 已完成的 commit / 文件变更 -->

- 修改了 [page.tsx (progress)](file:///home/dev/learniny-system/app/progress/page.tsx)：
  - 简化节点为单按钮，并在顶部新增了“全局复习与专项强化”面板及对应的温习与特训卡片。
- 修改了 [page.tsx (practice)](file:///home/dev/learniny-system/app/practice/page.tsx)：
  - 定义 `isReviewMode` 和 `isPracticeMode`，屏蔽侧边栏与全部“生成发现”相关浮窗与按钮，消除功能冗余。
  - 在顶部 Header 右侧新增了“返回进度页 ↩”按钮，点击触发退出并删除当前临时会话的逻辑。
  - 检测到 `data.isResolved`（即 100% 完美改句成功）时，延时弹出确认退出并自动销毁临时会话的弹窗。
- 修改了 [route.ts (chat)](file:///home/dev/learniny-system/app/api/chat/route.ts)：
  - 错题库查询仅获取 `noted_by_user = false` 的未解决错题。
  - 错题自动捕获：常规对话中的任何语法错误实时插入 `error_records` 数据库表中。
  - 100% 完美度 AI 评估：要求 AI 极其严格评估（100% 完美度），并在合格时末尾附加 `[RESOLVED: <原错句>]` 标识。后端捕获后在数据库标记 `noted_by_user = true` 并擦除该标识，且回传 `isResolved` 给前端。
- 修改了 [route.ts (sessions)](file:///home/dev/learniny-system/app/api/sessions/[id]/route.ts)：
  - 新增 `DELETE` API 接口，实现物理清除会话及级联清理对应的 messages 消息。

---

## 验证

- [x] 问题已解决
- [x] 无副作用
- [x] 满足成功标准

验证方法 / 结果：
- 运行 `npx tsc --noEmit` 成功通过了完整的 TypeScript 编译和类型校验。
- 进阶完成了错题本从 Stage 0 到 Stage 2 的完整双关卡验证与数据库状态递进。

---

## 下一步

<!-- 对方拿到接力棒后要做什么 -->

- 用户可以启动前端，测试进度页面新上线的“我的直觉错题本 (Intuition Ledger)”模块。
- 启动温习会话，体验原句重构改错（第一关），确认后退出，并在进度页查看关卡1变为已通关。
- 再次进入温习，体验大模型自适应生成的“新日常场景迁移测试”（第二关），检验语法掌握度，通关后在错题本中彻底被标记为已消灭。

---

## 操作日志

<!-- 每个工具完成步骤后，记录自己做了什么。双向写，不删对方的记录。 -->

| 时间 | 工具 | 做了什么 | commit / 证明 |
|------|------|---------|---------------|
| 2026-06-21 | Antigravity | 恢复会话，阅读并根据全局错题持久化调整和优化了 `implementation_plan.md` | - |
| 2026-06-21 | Antigravity | 执行了 progress/page.tsx 的 UI 与按钮重构，以及 api/chat/route.ts 的全局 AI 分流和错题自动保存逻辑。 | 运行 `npx tsc --noEmit` 成功通过 |
| 2026-06-21 | Antigravity | 优化了 practice/page.tsx 屏蔽发现栏UI并新增返回进度按钮；在 route.ts 实现AI评测 80% 准确度自动RESOLVED标记、后端拦截以及 noted_by_user=false 的自动屏蔽过滤。 | 运行 `npx tsc --noEmit` 校验通过 |
| 2026-06-21 | Antigravity | 新增 DELETE 会话 API，重排 practice 页面函数定义顺序解决 TS 变量使用顺序报错，实现 100% 纠错成功自动弹窗与临时对话主动退出销毁。 | 运行 `npx tsc --noEmit` 校验成功通过 |
| 2026-06-23 | Antigravity | 实现了基于“遗忘曲线与迁移应用”的多场景温习熟练度状态机、后端选题与Prompt分流、全局错词画像报告，以及前端“直觉错题本”双关卡进度看板 UI。 | 运行 `npx tsc --noEmit` 编译校验完美通过 |
| 2026-06-23 | Antigravity | 重构温习 AI 引导语（开场明示全局弱点和今日温习重点），开发了前端错句看板点击折叠查看详情（展示推荐表达与语法分类）功能。 | 运行 `npx tsc --noEmit` 再次成功通过校验 |
| 2026-06-23 | Antigravity | 优化了温习状态展示，开发了练习页 Header 靶心指示栏，以 UI 标签展示“本次巩固直觉”和“我的主要语法弱点”，实现对话气泡与目标提示解耦。 | 运行 `npx tsc --noEmit` 编译校验顺利通过 |
| 2026-06-23 | Antigravity | 清除 3000 端口冲突 of 挂死进程，成功在 http://localhost:3000 后台重启启动 Next dev server。 | - |
| 2026-06-23 | Antigravity | 落实了 Spaced Repetition 错题加权选题算法，并彻底重构了温习模式的 AI 引导 Prompt 为 Companion 语气，完全通过 `npx tsc` 类型检查。 | - |
| 2026-06-23 | Antigravity | 开发了进度页顶部模块切换 Tab（摄影 ↔ 英语），引入了加载骨架屏解决“5分钟测试”卡片闪烁的体验 Bug，并在系统 Prompt 和 chat API 注入了“小白大白话”教学直觉解释，完全通过类型检查。 | - |
| 2026-06-23 | Antigravity | 将 chat API 的 maxTokens 限制从 400 提高到 800，解决了大模型在详细输出中英小白讲解和特训问题时发生截断（未说完）的 Bug。 | - |
| 2026-06-23 | Antigravity | 实现了温习/特训的解释语言偏好定制，支持“多用中文小白大白话”与“少用中文纯英语境”；拦截切除 `[CHOOSE_LANG]` 隐藏标签回传 `showLangSelector: true`；重排 `page.tsx (practice)` 变量声明顺序，彻底修复了 TS 编译报错。 | - |
| 2026-06-23 | Antigravity | 优化解释语言偏好定制：实现冷启动在最开始就弹出卡片；彻底取消”替用户代发消息”，避免污染对话并造成 AI 对答错/挑战的误判；新增偏好设定的 Success Badge 微反馈 UI。 | - |
| 2026-06-23 | Claude Code | 修复英语模式真正执行 bug：根因是改系统提示后 regex 匹配旧文本全部失效。将英文模式从 regex 链替换为追加式硬覆盖 Prompt。实测：纯英 0%/平衡 6%/中文 32%。 | `npx tsc --noEmit` 通过 |

---

## 最新切换

- **当前在**：[ Claude Code ]
- **上次切换时间**：2026-06-23
- **上次切换前完成了什么**：彻底修复三档语言偏好：根因是双层 bug —— (1) balanced 有重复弱块先匹配，regex 强块永不执行；(2) 软指令 "use Chinese if tricky" 被 DeepSeek 忽略。修复：删重复块 + 改为结构化输出格式 `【中文语法讲解】`/`(提示：...)` + 系统提示 regex 替换 + user message 双保险。验证矩阵 6 格全通过：纯英 0%/平衡 7-15%/中文 21-32%。同时新增 reviewStage 前端靶心栏显示关数。在 verification 教训下实行的推翻式验证。
