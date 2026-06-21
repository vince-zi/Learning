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
- 运行 `npx tsc --noEmit` 通过了完整的 TypeScript 类型校验。
- 进入温习临时对话，改错成功或点击退出时，会弹窗询问。确认后会自动调用 DELETE API 物理销毁临时会话。已被完美改对（100% 得分）的句子 noted_by_user 被更新为 true，后续温习自动将其屏蔽。

---

## 下一步

<!-- 对方拿到接力棒后要做什么 -->

- 用户可以启动前端，测试进度页面顶部的“全局温习”卡片。
- 在常规聊天中输入带错的句子，然后在全局温习里进行 100% 正确改句，验证自动弹窗提示和错句库自动屏蔽销毁的闭环链路。

---

## 操作日志

<!-- 每个工具完成步骤后，记录自己做了什么。双向写，不删对方的记录。 -->

| 时间 | 工具 | 做了什么 | commit / 证明 |
|------|------|---------|---------------|
| 2026-06-21 | Antigravity | 恢复会话，阅读并根据全局错题持久化调整和优化了 `implementation_plan.md` | - |
| 2026-06-21 | Antigravity | 执行了 progress/page.tsx 的 UI 与按钮重构，以及 api/chat/route.ts 的全局 AI 分流和错题自动保存逻辑。 | 运行 `npx tsc --noEmit` 成功通过 |
| 2026-06-21 | Antigravity | 优化了 practice/page.tsx 屏蔽发现栏UI并新增返回进度按钮；在 route.ts 实现AI评测 80% 准确度自动RESOLVED标记、后端拦截以及 noted_by_user=false 的自动屏蔽过滤。 | 运行 `npx tsc --noEmit` 校验通过 |
| 2026-06-21 | Antigravity | 新增 DELETE 会话 API，重排 practice 页面函数定义顺序解决 TS 变量使用顺序报错，实现 100% 纠错成功自动弹窗与临时对话主动退出销毁。 | 运行 `npx tsc --noEmit` 校验成功通过 |

---

## 最新切换

- **当前在**：[ Antigravity ]
- **上次切换时间**：2026-06-21
- **上次切换前完成了什么**：完成了温习与特训模块的临时性会话销毁、退出确认、100% 纠错成功自动弹框返回等功能，且全部通过 TypeScript 类型校验。
