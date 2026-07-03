# Learniny — 信息架构图

> 核心设计原则：**把复杂系统藏在极简对话界面背后，复杂度只在用户主动要看时才展开。**

---

## 1. 整体分层架构

```mermaid
graph TB
    subgraph 表现层["🎨 表现层 — 用户看到的"]
        NAV["底部导航 × 4"]
        PAGES["页面 & 组件"]
        VISUAL["视觉语言系统"]
    end

    subgraph 交互层["⚡ 交互层 — 用户操作的"]
        CHAT_FLOW["对话交互流"]
        REVIEW_FLOW["错题闯关流"]
        EXPLORE_FLOW["星图探索流"]
    end

    subgraph 引擎层["🧠 引擎层 — 用户感知不到的"]
        ZPD["ZPD 最近发展区"]
        COG["认知负荷控制"]
        RECAST["Recast 纠错策略"]
        META["元语言提示策略"]
        EMO["情感感知引擎"]
        SPACED["间隔重复引擎"]
    end

    表现层 --> 交互层
    交互层 --> 引擎层

    style 表现层 fill:#1a1a2e,stroke:#7dd3fc,color:#e0e0e0
    style 交互层 fill:#16213e,stroke:#7dd3fc,color:#e0e0e0
    style 引擎层 fill:#0f3460,stroke:#ff5e97,color:#e0e0e0
```

> [!IMPORTANT]
> 六大教学理论模块（ZPD、认知负荷、纠错策略等）全部作为**后台引擎**运行。用户永远感知不到"系统在计算"，只感知到"AI 好像懂我，难度刚刚好"。

---

## 2. 底部导航 & 页面结构

```mermaid
graph TD
    APP["Learniny App"]

    APP --> TAB1["💬 对话<br/>主界面 · 90% 时间"]
    APP --> TAB2["✨ 星图<br/>知识树 · 进度总览"]
    APP --> TAB3["📝 错题本<br/>温习 · 专项训练"]
    APP --> TAB4["👤 我的<br/>CEFR画像 · 统计"]

    TAB1 --> C1["iMessage 式气泡"]
    TAB1 --> C2["对比卡（长按展开）"]
    TAB1 --> C3["元语言提示气泡"]

    TAB2 --> S1["2D/SVG 树状图<br/>（默认主视图）"]
    TAB2 --> S2["3D 星空探索<br/>（成就展示入口）"]

    TAB3 --> R1["阶段一：纠正原句"]
    TAB3 --> R2["阶段二：新场景重测"]

    TAB4 --> P1["CEFR 等级画像"]
    TAB4 --> P2["学习统计数据"]
    TAB4 --> P3["设置"]

    style TAB1 fill:#7dd3fc,stroke:#1a1a2e,color:#1a1a2e
    style TAB2 fill:#c084fc,stroke:#1a1a2e,color:#1a1a2e
    style TAB3 fill:#fbbf24,stroke:#1a1a2e,color:#1a1a2e
    style TAB4 fill:#94a3b8,stroke:#1a1a2e,color:#1a1a2e
```

---

## 3. 对话界面 — 交互流程

对话界面是产品核心，占用户 **90% 使用时间**。设计原则：**像聊天，不像学习软件**。

```mermaid
flowchart TD
    USER_INPUT["👤 用户发送消息"]
    ENGINE["🧠 后台引擎处理"]

    ENGINE --> CHECK_EMO{"情感状态？"}

    CHECK_EMO -->|正常| ANALYZE["分析语法/词汇错误"]
    CHECK_EMO -->|沮丧/焦虑| PAUSE_CORRECT["暂停纠错<br/>语气变鼓励、用词简短"]

    ANALYZE --> HAS_ERROR{"有错误？"}

    HAS_ERROR -->|无| NORMAL_REPLY["正常对话回复"]
    HAS_ERROR -->|有| ERROR_TYPE{"错误类型？"}

    ERROR_TYPE -->|轻微| RECAST_REPLY["Recast 策略<br/>修正融入下一句<br/>⚠️ 无视觉标记"]
    ERROR_TYPE -->|规律性| META_REPLY["元语言提示<br/>AI气泡 + 小图标<br/>浅色底纹区分"]

    RECAST_REPLY --> SAVE["存入错题本"]
    META_REPLY --> SAVE
    PAUSE_CORRECT --> NORMAL_REPLY

    USER_INPUT --> ENGINE

    SAVE --> USER_MSG["用户消息<br/>长按可展开对比卡"]
    USER_MSG --> DIFF["原句 vs 修正版<br/>高亮改动词（diff）"]

    style USER_INPUT fill:#7dd3fc,stroke:#1a1a2e,color:#1a1a2e
    style RECAST_REPLY fill:#22c55e,stroke:#1a1a2e,color:#1a1a2e
    style META_REPLY fill:#c084fc,stroke:#1a1a2e,color:#1a1a2e
    style PAUSE_CORRECT fill:#ff5e97,stroke:#1a1a2e,color:#1a1a2e
```

> [!TIP]
> **Recast（重述纠错）**是设计上最难也最关键的部分 — 纠正必须听起来自然，用户不应察觉"这是纠错"。零视觉标记，纯靠语言融入。

---

## 4. 错题本 — 两阶段闯关流程

```mermaid
flowchart LR
    ENTRY["📝 错题本入口"]
    LIST["错题列表<br/>按时间/类型筛选"]

    STAGE1["🔵 阶段一<br/>纠正原句"]
    CHECK1{"通过？"}

    STAGE2["🟡 阶段二<br/>新场景重测"]
    CHECK2{"通过？"}

    DONE["✅ 掌握<br/>星图亮星"]
    RETRY["🔄 回到队列<br/>间隔重复"]

    ENTRY --> LIST --> STAGE1
    STAGE1 --> CHECK1
    CHECK1 -->|是| STAGE2
    CHECK1 -->|否| RETRY
    STAGE2 --> CHECK2
    CHECK2 -->|是| DONE
    CHECK2 -->|否| RETRY

    RETRY -.->|间隔后| STAGE1

    style STAGE1 fill:#3b82f6,stroke:#1a1a2e,color:#fff
    style STAGE2 fill:#eab308,stroke:#1a1a2e,color:#1a1a2e
    style DONE fill:#22c55e,stroke:#1a1a2e,color:#fff
    style RETRY fill:#ef4444,stroke:#1a1a2e,color:#fff
```

> [!NOTE]
> 视觉风格对标 **Notion / Linear** — 简洁专业的进度条和关卡样式，避免多邻国式的卡通萌宠风格。目标用户是职场人士和创业者。

---

## 5. 星图 — 双模式知识树

```mermaid
flowchart TD
    STAR_ENTRY["✨ 星图入口"]

    DEFAULT["📊 默认：2D/SVG 树状图"]
    EXPLORE["🌌 探索：3D 星空模式"]

    DEFAULT --> NODES["知识节点"]
    NODES --> GOLD["🟡 金色 = 已掌握"]
    NODES --> BLUE["🔵 蓝色 = 学习中"]
    NODES --> GRAY["⚪ 灰色 = 未解锁"]

    EXPLORE --> CRYSTAL["粒子结晶动效"]
    EXPLORE --> ACHIEVE["成就展示"]

    STAR_ENTRY --> DEFAULT
    STAR_ENTRY -.->|"切换模式"| EXPLORE

    style DEFAULT fill:#3b82f6,stroke:#1a1a2e,color:#fff
    style EXPLORE fill:#8b5cf6,stroke:#1a1a2e,color:#fff
    style GOLD fill:#eab308,stroke:#1a1a2e,color:#1a1a2e
    style BLUE fill:#7dd3fc,stroke:#1a1a2e,color:#1a1a2e
    style GRAY fill:#64748b,stroke:#1a1a2e,color:#fff
```

> [!IMPORTANT]
> 星图定位为**"周回顾"场景** — 每周打开一次，看看又亮了几颗星。制造仪式感和成就感，不是日常必经页面。

---

## 6. 后台引擎 → 前端体感映射

| 后台引擎 | 用户感知 | 前端表现 |
|---------|---------|---------|
| **ZPD 最近发展区** | "难度刚刚好" | AI 自动调整话题复杂度和词汇量 |
| **认知负荷控制** | "不觉得累" | 控制单次对话纠错频率，避免信息过载 |
| **Recast 纠错** | "AI 自然地说了正确说法" | 零标记，修正融入 AI 下一句话 |
| **元语言提示** | "AI 偶尔会点拨规律" | 气泡加小图标 + 浅色底纹 |
| **情感感知** | "AI 能看出我不开心" | 语气变鼓励、暂停纠错、更简短 |
| **间隔重复** | "忘了的东西又出现了" | 错题本定时推送 + 闯关复测 |

---

## 7. 视觉语言分区

```mermaid
graph LR
    subgraph 重视觉区["🎆 重视觉 — 深色 + 粒子/流体渐变"]
        LP["首页/落地页"]
        STAR["星图 3D 模式"]
        ACH["成就页"]
    end

    subgraph 轻视觉区["📝 轻视觉 — 克制 · 留白 · 专注"]
        CHAT["对话界面"]
        ERR["错题本"]
        PROFILE["个人中心"]
    end

    style 重视觉区 fill:#0f3460,stroke:#7dd3fc,color:#e0e0e0
    style 轻视觉区 fill:#1e293b,stroke:#94a3b8,color:#e0e0e0
```

> [!TIP]
> **对话界面必须克制** — 用户在对话时需要专注思考英语表达，不需要被粒子动效分心。重视觉效果只保留在非核心学习页面。

---

## 8. 完整信息架构总览

```mermaid
graph TD
    ROOT["🏠 Learniny"]

    ROOT --> LANDING["落地页<br/>三阶段叙事<br/>Chaos → MindWeave → Flow"]

    LANDING -->|登录/注册| MAIN["主应用"]

    MAIN --> NAV["底部导航栏"]

    NAV --> T1["💬 对话"]
    NAV --> T2["✨ 星图"]
    NAV --> T3["📝 错题本"]
    NAV --> T4["👤 我的"]

    T1 --> T1_1["对话列表 / 新对话"]
    T1_1 --> T1_2["对话详情<br/>iMessage 气泡"]
    T1_2 --> T1_3["长按消息<br/>→ 对比卡 diff"]

    T2 --> T2_1["2D 知识树<br/>金/蓝/灰节点"]
    T2 --> T2_2["3D 探索模式<br/>粒子结晶"]

    T3 --> T3_1["错题列表<br/>按时间/类型"]
    T3_1 --> T3_2["阶段一：纠正原句"]
    T3_2 --> T3_3["阶段二：新场景重测"]
    T3_3 --> T3_4["掌握 → 星图亮星"]

    T4 --> T4_1["CEFR 等级"]
    T4 --> T4_2["学习统计"]
    T4 --> T4_3["设置"]

    subgraph ENGINES["🧠 后台引擎（不可见）"]
        E1["ZPD"]
        E2["认知负荷"]
        E3["Recast"]
        E4["元语言提示"]
        E5["情感感知"]
        E6["间隔重复"]
    end

    T1_2 -.-> E1
    T1_2 -.-> E2
    T1_2 -.-> E3
    T1_2 -.-> E4
    T1_2 -.-> E5
    T3_2 -.-> E6

    style ROOT fill:#7dd3fc,stroke:#1a1a2e,color:#1a1a2e
    style ENGINES fill:#0f3460,stroke:#ff5e97,color:#e0e0e0
    style T1 fill:#7dd3fc,stroke:#1a1a2e,color:#1a1a2e
    style T2 fill:#c084fc,stroke:#1a1a2e,color:#1a1a2e
    style T3 fill:#fbbf24,stroke:#1a1a2e,color:#1a1a2e
    style T4 fill:#94a3b8,stroke:#1a1a2e,color:#1a1a2e
```
