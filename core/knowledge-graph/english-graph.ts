// ============================================================
// Core Layer: English Learning Knowledge Graph
// 英语习惯技能知识图谱 — 四层结构
// Layer 1: 基础表达 → Layer 2: 场景对话
// → Layer 3: 观点表达 → Layer 4: 抽象思维
//
// 每个节点是一个"发现路径"而非"知识点罗列"
// 基于 CEFR 框架：A1 → A2 → B1 → B2 → C1
// ============================================================

import type { KnowledgeNode, DependencyEdge, LayerInfo, KnowledgeGraph } from './graph-types'

// ============================================================
// Layer 1: 基础表达 (Week 1-2) — CEFR A1-A2
// ============================================================

const node1_1: KnowledgeNode = {
  id: 'self-intro',
  layer: 1,
  name: '自我介绍与个人信息',
  nameEn: 'Self-Introduction & Personal Info',
  description: '学会用英语自然地介绍自己和表达个人背景',
  difficulty: 1,
  prerequisiteIds: [],
  bloomTarget: 'apply',
  tags: ['自我介绍', '个人信息', '基础词汇', 'A1'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '了解用户当前的自我表达能力',
        questions: [
          {
            id: 'si-q1',
            type: 'clarification',
            template: 'Can you tell me a little about yourself — what do you do, and what are you interested in?',
            variables: [],
            purpose: '评估用户的基础表达能力和词汇量'
          },
          {
            id: 'si-q2',
            type: 'evidence',
            template: 'When you introduce yourself in English, what parts feel most natural? What parts do you struggle to express?',
            variables: [],
            purpose: '让用户意识到自己的强弱项'
          }
        ],
        exitCondition: '用户能用简单句完成自我介绍，识别自己的表达障碍'
      },
      {
        name: '聚焦观察',
        purpose: '扩展表达丰富度',
        questions: [
          {
            id: 'si-q3',
            type: 'assumption',
            template: 'If you had to describe your job or hobby to someone who knows nothing about it, how would you simplify it?',
            variables: [],
            purpose: '引导用户学会解释和简化复杂概念',
            expectedInsight: '用简单英语解释复杂事物需要抓住核心'
          }
        ],
        exitCondition: '用户能用简单句解释自己的专业或爱好'
      },
      {
        name: '规律发现',
        purpose: '发现英语自我介绍的常见结构',
        questions: [
          {
            id: 'si-q4',
            type: 'implication',
            template: 'Do you notice a pattern in how English speakers introduce themselves? What comes first, second, and last?',
            variables: [],
            purpose: '引导用户发现英语介绍的结构化模式',
            expectedInsight: '英语自我介绍遵循一定的结构模式'
          }
        ],
        exitCondition: '用户能识别并运用自我介绍的基本结构'
      },
      {
        name: '应用验证',
        purpose: '在不同场景中灵活自我介绍',
        questions: [
          {
            id: 'si-q5',
            type: 'meta',
            template: 'How would you introduce yourself differently to a new friend vs. a potential employer? What words change and why?',
            variables: [],
            purpose: '验证用户能根据场景调整表达'
          }
        ],
        exitCondition: '用户能根据场景调整自我介绍的风格和内容'
      }
    ]
  },
  practiceTask: {
    instruction: 'Write a 5-sentence self-introduction for two different scenarios: meeting a new friend, and introducing yourself in a study group.',
    description: '练习在不同场景下调整自我介绍的语气和内容',
    difficulty: 1,
    expectedDuration: '5min',
    scaffoldingHints: [
      { level: 1, hint: 'Start with your name and one thing you like.' },
      { level: 2, hint: 'For a friend: use casual words. For study group: mention what you want to learn.' },
      { level: 3, hint: 'Friend: "Hey, I\'m ___. I\'m really into ___." Study: "Hi everyone, I\'m ___. I joined because I want to improve my ___."' }
    ]
  }
}

const node1_2: KnowledgeNode = {
  id: 'daily-routine',
  layer: 1,
  name: '日常生活与习惯表达',
  nameEn: 'Daily Routine & Habits',
  description: '学会用英语描述日常生活、习惯和频率',
  difficulty: 2,
  prerequisiteIds: ['self-intro'],
  bloomTarget: 'apply',
  tags: ['日常生活', '时态', '频率', 'A1-A2'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '了解用户描述日常的能力',
        questions: [
          {
            id: 'dr-q1',
            type: 'clarification',
            template: 'What does a typical day look like for you? Walk me through it from morning to night.',
            variables: [],
            purpose: '评估用户描述时序事件的能力'
          }
        ],
        exitCondition: '用户能描述一天的基本流程'
      },
      {
        name: '聚焦观察',
        purpose: '识别用户时态使用模式',
        questions: [
          {
            id: 'dr-q2',
            type: 'evidence',
            template: 'I noticed something interesting in how you described your day. When you talk about things you do "every day" vs. "yesterday" — do the verbs change?',
            variables: [],
            purpose: '引导用户注意时态变化'
          }
        ],
        exitCondition: '用户能注意到动词形式的变化'
      },
      {
        name: '规律发现',
        purpose: '发现一般现在时 vs 过去时的使用规律',
        questions: [
          {
            id: 'dr-q3',
            type: 'implication',
            template: 'What happens to the verb when you talk about yesterday vs. every day? Can you find the pattern?',
            variables: [],
            purpose: '引导用户发现时态规律',
            expectedInsight: '英语中时间变化会导致动词形式变化'
          }
        ],
        exitCondition: '用户能主动区分现在和过去的动词形式'
      },
      {
        name: '应用验证',
        purpose: '有意识地使用时态',
        questions: [
          {
            id: 'dr-q4',
            type: 'meta',
            template: 'Tell me about yesterday. Now tell me about what you usually do. What did you change in your sentences?',
            variables: [],
            purpose: '验证用户能有意识地切换时态'
          }
        ],
        exitCondition: '用户能有意识地使用时态表达不同时间'
      }
    ]
  },
  practiceTask: {
    instruction: 'Write two short paragraphs: one about your typical weekday, another about what you did last weekend. Circle every verb and notice the difference.',
    description: '通过对比"平时"与"过去"，发现英语动词的变化规律',
    difficulty: 2,
    expectedDuration: '8min',
    scaffoldingHints: [
      { level: 1, hint: 'Think about what words like "usually" and "last weekend" do to your verbs.' },
      { level: 2, hint: '"Usually I wake up at 7..." vs. "Last weekend I woke up at 10..." — notice the verb change?' },
      { level: 3, hint: 'Present habits: base form or +s (I eat / she eats). Past events: verb+ed or irregular form (I ate / I went).' }
    ]
  }
}

const node1_3: KnowledgeNode = {
  id: 'likes-dislikes',
  layer: 1,
  name: '喜好与感受表达',
  nameEn: 'Likes, Dislikes & Feelings',
  description: '学会表达喜好、感受和原因，从简单陈述过渡到有理由的观点',
  difficulty: 2,
  prerequisiteIds: ['self-intro'],
  bloomTarget: 'understand',
  tags: ['喜好', '感受', '原因', 'A2'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估用户表达感受的能力',
        questions: [
          {
            id: 'ld-q1',
            type: 'clarification',
            template: 'What kinds of things do you really enjoy doing — and what do you not enjoy at all? Why?',
            variables: [],
            purpose: '评估用户能否表达喜好及原因'
          }
        ],
        exitCondition: '用户能表达喜好并给出简单原因'
      },
      {
        name: '聚焦观察',
        purpose: '扩展情绪表达词汇',
        questions: [
          {
            id: 'ld-q2',
            type: 'assumption',
            template: 'When you say you "like" something, what exactly does that mean? Is it interest, excitement, comfort, or something else?',
            variables: [],
            purpose: '引导用户区分不同层次的喜好',
            expectedInsight: '"Like"有不同的层次和精确表达'
          }
        ],
        exitCondition: '用户能用不同词汇区分喜好层次'
      },
      {
        name: '规律发现',
        purpose: '发现情感表达的丰富性',
        questions: [
          {
            id: 'ld-q3',
            type: 'implication',
            template: 'How would your sentence change if instead of "like," you used "love," "enjoy," "am fascinated by," or "can\'t stand"? What does each word say about your feeling?',
            variables: [],
            purpose: '引导用户发现词汇选择影响表达强度',
            expectedInsight: '不同的情感词汇传递不同的情感强度'
          }
        ],
        exitCondition: '用户能根据情感强度选择合适词汇'
      },
      {
        name: '应用验证',
        purpose: '精准表达情感',
        questions: [
          {
            id: 'ld-q4',
            type: 'meta',
            template: 'Think of three things you feel differently about. Can you express each one using a word that matches the exact strength of your feeling?',
            variables: [],
            purpose: '验证用户能精准匹配词汇与情感'
          }
        ],
        exitCondition: '用户能灵活运用不同强度的情感词汇'
      }
    ]
  },
  practiceTask: {
    instruction: 'Pick three things: one you love, one you like, and one you dislike. Write 2-3 sentences for each explaining exactly why — but don\'t use the same adjective twice.',
    description: '练习用不同词汇表达不同层次的情感',
    difficulty: 2,
    expectedDuration: '7min',
    scaffoldingHints: [
      { level: 1, hint: 'Instead of "like" — try "enjoy," "appreciate," "am keen on."' },
      { level: 2, hint: 'Love → adore, am passionate about. Dislike → am not fond of, can\'t stand.' },
      { level: 3, hint: 'Use because/so to explain: "I adore cooking because it\'s creative. It makes me feel calm after a busy day."' }
    ]
  }
}

// ============================================================
// Layer 2: 场景对话 (Week 2-3) — CEFR A2-B1
// ============================================================

const node2_1: KnowledgeNode = {
  id: 'everyday-situations',
  layer: 2,
  name: '日常场景应对',
  nameEn: 'Everyday Situations',
  description: '学会在点餐、问路、购物等真实场景中用英语沟通',
  difficulty: 3,
  prerequisiteIds: ['daily-routine'],
  bloomTarget: 'apply',
  tags: ['场景', '实用', '对话', 'A2-B1'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '了解用户在真实场景中的英语使用经验',
        questions: [
          {
            id: 'es-q1',
            type: 'clarification',
            template: 'Have you ever had to use English in a real situation — like ordering food, asking for directions, or shopping? How did it go?',
            variables: [],
            purpose: '评估用户的真实场景经验'
          }
        ],
        exitCondition: '用户能描述真实场景中的体验和困难'
      },
      {
        name: '聚焦观察',
        purpose: '识别场景对话的关键要素',
        questions: [
          {
            id: 'es-q2',
            type: 'evidence',
            template: 'In a conversation like ordering at a restaurant, what do you think the other person expects you to say first? What usually comes next?',
            variables: [],
            purpose: '引导用户发现对话的结构化模式'
          }
        ],
        exitCondition: '用户能识别对话的基本结构'
      },
      {
        name: '规律发现',
        purpose: '发现英语对话的语用规律',
        questions: [
          {
            id: 'es-q3',
            type: 'implication',
            template: 'How would you ask for the same thing in a fancy restaurant vs. a food truck? Which words change — and why?',
            variables: [],
            purpose: '引导用户发现语气和礼貌程度随场景变化',
            expectedInsight: '语域（register）随场景的正式程度变化'
          }
        ],
        exitCondition: '用户能根据场景调整语气'
      },
      {
        name: '应用验证',
        purpose: '在模拟场景中自然应对',
        questions: [
          {
            id: 'es-q4',
            type: 'meta',
            template: 'Let\'s role-play. Imagine you\'re at a café. I\'m the barista. Order a coffee — but be as natural as you can.',
            variables: [],
            purpose: '验证用户能在模拟场景中自然表达'
          }
        ],
        exitCondition: '用户能在角色扮演中自然、流畅地应对'
      }
    ]
  },
  practiceTask: {
    instruction: 'Write a short dialogue for two scenarios: (1) ordering food at a casual restaurant, (2) asking a stranger for directions. Pay attention to how your tone and words change between scenarios.',
    description: '通过写两个不同正式程度的对话，体验语域的变化',
    difficulty: 3,
    expectedDuration: '10min',
    scaffoldingHints: [
      { level: 1, hint: 'Casual: use "Can I...?" or "I\'ll have..." Formal: use "May I...?" or "I would like..."' },
      { level: 2, hint: 'For directions: "Excuse me, could you tell me how to get to...?" is polite and clear.' },
      { level: 3, hint: 'Key phrases — Ordering: "I\'d like the... please." / "Could I get...?" Directions: "Is it far from here?" / "Which way is...?"' }
    ]
  }
}

const node2_2: KnowledgeNode = {
  id: 'question-asking',
  layer: 2,
  name: '提问的艺术',
  nameEn: 'Mastering Questions',
  description: '学会用不同类型的英语问句获取信息、澄清和延续对话',
  difficulty: 4,
  prerequisiteIds: ['daily-routine'],
  bloomTarget: 'apply',
  tags: ['提问', '疑问句', '对话延续', 'B1'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估用户的提问能力',
        questions: [
          {
            id: 'qa-q1',
            type: 'clarification',
            template: 'When you\'re talking with someone in English and don\'t understand something they said, what do you usually do?',
            variables: [],
            purpose: '评估用户的信息澄清策略'
          }
        ],
        exitCondition: '用户能描述当前的提问和澄清策略'
      },
      {
        name: '聚焦观察',
        purpose: '识别不同类型问句的功能',
        questions: [
          {
            id: 'qa-q2',
            type: 'evidence',
            template: 'Look at these two questions: "Do you like coffee?" and "What kind of coffee do you prefer?" — what different kinds of answers do they invite?',
            variables: [],
            purpose: '引导用户区分 Yes/No 问题和开放式问题'
          }
        ],
        exitCondition: '用户能区分不同类型问句的功能'
      },
      {
        name: '规律发现',
        purpose: '发现追问的策略',
        questions: [
          {
            id: 'qa-q3',
            type: 'implication',
            template: 'If someone answers your question with just one word, how can you keep the conversation going? What questions open up more talk?',
            variables: [],
            purpose: '引导用户发现开放式问题的重要性',
            expectedInsight: '开放式问题（What/How/Why）比封闭式问题更能推动对话'
          }
        ],
        exitCondition: '用户能运用开放式问题延续对话'
      },
      {
        name: '应用验证',
        purpose: '在对话中灵活提问',
        questions: [
          {
            id: 'qa-q4',
            type: 'meta',
            template: 'I\'m going to tell you about my weekend. Your job is to keep asking me questions that make me talk more. Ready?',
            variables: [],
            purpose: '验证用户能用提问技巧推动真实对话'
          }
        ],
        exitCondition: '用户能自然地在对话中穿插不同类型的问题'
      }
    ]
  },
  practiceTask: {
    instruction: 'Think of a topic you\'re curious about. Write 5 questions about it — but make sure each one is a different type (yes/no, what, how, why, and a follow-up question).',
    description: '练习不同类型的问句，学会用提问推动对话',
    difficulty: 3,
    expectedDuration: '8min',
    scaffoldingHints: [
      { level: 1, hint: 'Start with a yes/no question to open, then use what/how/why to go deeper.' },
      { level: 2, hint: 'Yes/no: "Do you...?" → What: "What do you...?" → How: "How do you...?" → Why: "Why do you...?" → Follow-up: "Can you tell me more about...?"' },
      { level: 3, hint: 'Good follow-ups keep the talker talking: "That\'s interesting — what happened next?" / "How did that make you feel?"' }
    ]
  }
}

// ============================================================
// Layer 3: 观点表达 (Week 3-4) — CEFR B1-B2
// ============================================================

const node3_1: KnowledgeNode = {
  id: 'opinion-expression',
  layer: 3,
  name: '观点表达与论证',
  nameEn: 'Opinion Expression & Argumentation',
  description: '学会清晰地表达观点、给出理由和组织论证结构',
  difficulty: 5,
  prerequisiteIds: ['likes-dislikes'],
  bloomTarget: 'analyze',
  tags: ['观点', '论证', '连接词', 'B1-B2'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估用户的观点表达能力',
        questions: [
          {
            id: 'oe-q1',
            type: 'clarification',
            template: 'What\'s something you have a strong opinion about? Try to explain your view in English.',
            variables: [],
            purpose: '评估用户表达观点的能力'
          }
        ],
        exitCondition: '用户能表达一个观点并给出至少一个理由'
      },
      {
        name: '聚焦观察',
        purpose: '识别论证结构',
        questions: [
          {
            id: 'oe-q2',
            type: 'evidence',
            template: 'When someone gives a really convincing argument in English, what do you notice about how they organize their thoughts?',
            variables: [],
            purpose: '引导用户观察论证的结构化模式'
          }
        ],
        exitCondition: '用户能识别观点-理由-例子的基本结构'
      },
      {
        name: '规律发现',
        purpose: '发现连接词的力量',
        questions: [
          {
            id: 'oe-q3',
            type: 'implication',
            template: 'What happens to your argument if you add words like "because," "for example," "however," or "therefore"? How do they change the flow?',
            variables: [],
            purpose: '引导用户发现连接词的逻辑作用',
            expectedInsight: '连接词是论证的逻辑骨架'
          }
        ],
        exitCondition: '用户能运用连接词组织论证'
      },
      {
        name: '应用验证',
        purpose: '构建完整论证',
        questions: [
          {
            id: 'oe-q4',
            type: 'meta',
            template: 'Now let\'s rebuild your argument using this structure: Opinion → Reason 1 → Example → Reason 2 → Counter-argument → Conclusion. Try it.',
            variables: [],
            purpose: '验证用户能用完整结构组织论证'
          }
        ],
        exitCondition: '用户能按结构组织一个完整的论证'
      }
    ]
  },
  practiceTask: {
    instruction: 'Pick a debate topic (e.g., "Should students have homework?"). Write one paragraph arguing FOR and one arguing AGAINST. Use at least 3 different connectors in each.',
    description: '练习正反论证，学习用连接词组织逻辑',
    difficulty: 5,
    expectedDuration: '15min',
    scaffoldingHints: [
      { level: 1, hint: 'Start with "I believe that..." or "In my opinion..."' },
      { level: 2, hint: 'Structure: opinion → because/reason → for example/evidence → therefore/conclusion.' },
      { level: 3, hint: 'FOR: I believe that... because... For example... Therefore... / AGAINST: However, some argue that... since... For instance... As a result...' }
    ]
  }
}

const node3_2: KnowledgeNode = {
  id: 'comparing-discussing',
  layer: 3,
  name: '比较与讨论',
  nameEn: 'Comparing & Discussing',
  description: '学会比较不同观点、事物和方法，进行有深度的讨论',
  difficulty: 5,
  prerequisiteIds: ['opinion-expression'],
  bloomTarget: 'analyze',
  tags: ['比较', '讨论', '转折', 'B2'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估比较表达能力',
        questions: [
          {
            id: 'cd-q1',
            type: 'clarification',
            template: 'Compare two things you know well — maybe two cities, two hobbies, or two ways of learning. What makes them different? What\'s similar?',
            variables: [],
            purpose: '评估用户的比较表达能力'
          }
        ],
        exitCondition: '用户能描述两个事物的异同'
      },
      {
        name: '聚焦观察',
        purpose: '识别比较的语言工具',
        questions: [
          {
            id: 'cd-q2',
            type: 'evidence',
            template: 'In your comparison, did you use words like "more," "less," "better," "while," or "whereas"? What job does each word do?',
            variables: [],
            purpose: '引导用户注意比较级和对照词'
          }
        ],
        exitCondition: '用户能识别并运用比较结构'
      },
      {
        name: '规律发现',
        purpose: '发现讨论中的让步与转折',
        questions: [
          {
            id: 'cd-q3',
            type: 'implication',
            template: 'What happens when you say "On one hand... but on the other hand..." — how does this change the discussion from one-sided to balanced?',
            variables: [],
            purpose: '引导用户发现平衡讨论的语言结构',
            expectedInsight: '平衡讨论需要承认对立观点的合理性'
          }
        ],
        exitCondition: '用户能运用让步-转折结构进行平衡讨论'
      },
      {
        name: '应用验证',
        purpose: '进行深度讨论',
        questions: [
          {
            id: 'cd-q4',
            type: 'meta',
            template: 'Let\'s discuss a complex topic. Give me your view, acknowledge the other side, then explain why you still hold your position.',
            variables: [],
            purpose: '验证用户能进行多角度平衡讨论'
          }
        ],
        exitCondition: '用户能进行有深度的多角度讨论'
      }
    ]
  },
  practiceTask: {
    instruction: 'Compare two things you\'re passionate about. Write 3 paragraphs: (1) similarities, (2) differences, (3) which you prefer and why. Use at least 5 comparison expressions.',
    description: '练习使用比较语言表达复杂观点',
    difficulty: 4,
    expectedDuration: '12min',
    scaffoldingHints: [
      { level: 1, hint: 'Similar: "Both..." / "Similarly..." / "Like..." Different: "Unlike..." / "In contrast..." / "Whereas..."' },
      { level: 2, hint: 'For preference: "I prefer X to Y because..." / "X is more... than Y" / "While X is..., Y is more..."' },
      { level: 3, hint: 'Balanced view: "On one hand, X is... However, Y offers... Ultimately, I lean toward X because..."' }
    ]
  }
}

// ============================================================
// Layer 4: 抽象思维 (Week 4+) — CEFR B2-C1
// ============================================================

const node4_1: KnowledgeNode = {
  id: 'storytelling',
  layer: 4,
  name: '叙事与故事讲述',
  nameEn: 'Storytelling & Narrative',
  description: '学会用英语讲述完整的故事，控制节奏和细节',
  difficulty: 6,
  prerequisiteIds: ['daily-routine', 'opinion-expression'],
  bloomTarget: 'create',
  tags: ['叙事', '故事', '时态', 'B2-C1'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估故事讲述能力',
        questions: [
          {
            id: 'st-q1',
            type: 'clarification',
            template: 'Tell me about a memorable experience you had recently. What happened — from beginning to end?',
            variables: [],
            purpose: '评估用户的叙事结构和时态使用'
          }
        ],
        exitCondition: '用户能按时间顺序讲述一个经历'
      },
      {
        name: '聚焦观察',
        purpose: '识别好故事的要素',
        questions: [
          {
            id: 'st-q2',
            type: 'evidence',
            template: 'What makes a story in English interesting to listen to? Is it the facts, the details, the emotion, or the way it\'s told?',
            variables: [],
            purpose: '引导用户分析故事的吸引力来源'
          }
        ],
        exitCondition: '用户能识别故事的关键要素'
      },
      {
        name: '规律发现',
        purpose: '发现叙事的节奏控制',
        questions: [
          {
            id: 'st-q3',
            type: 'implication',
            template: 'How does changing the detail level affect your story? What happens if you describe one moment in detail vs. summarize a whole day?',
            variables: [],
            purpose: '引导用户发现叙事节奏的概念',
            expectedInsight: '通过控制细节密度来调节故事的节奏和张力'
          }
        ],
        exitCondition: '用户能通过细节密度控制叙事节奏'
      },
      {
        name: '应用验证',
        purpose: '讲述一个有起伏的故事',
        questions: [
          {
            id: 'st-q4',
            type: 'meta',
            template: 'Tell the same story again, but this time: build up to the most important moment slowly, then tell that moment in vivid detail.',
            variables: [],
            purpose: '验证用户能用节奏感讲述故事'
          }
        ],
        exitCondition: '用户能控制叙事节奏来增强故事的感染力'
      }
    ]
  },
  practiceTask: {
    instruction: 'Write a short story about something that happened to you (real or made-up). Focus on: (1) a clear beginning, middle, and end, (2) at least one moment described in rich detail, (3) varied sentence lengths to control pace.',
    description: '用英语写一个有节奏感的完整故事',
    difficulty: 6,
    expectedDuration: '20min',
    scaffoldingHints: [
      { level: 1, hint: 'Beginning: set the scene. Middle: the key event. End: what changed or what you learned.' },
      { level: 2, hint: 'Use short sentences for fast/tense moments. Use longer sentences for description and reflection.' },
      { level: 3, hint: 'Time markers: "It all started when..." / "Just as I was..." / "Suddenly..." / "Looking back, I realize..."' }
    ]
  }
}

const node4_2: KnowledgeNode = {
  id: 'abstract-thinking',
  layer: 4,
  name: '抽象话题与假设思维',
  nameEn: 'Abstract & Hypothetical Thinking',
  description: '学会用英语讨论抽象概念、假设情境和复杂社会议题',
  difficulty: 7,
  prerequisiteIds: ['comparing-discussing'],
  bloomTarget: 'create',
  tags: ['抽象', '假设', '复杂议题', 'C1'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '评估抽象讨论能力',
        questions: [
          {
            id: 'at-q1',
            type: 'clarification',
            template: 'If you could change one thing about how people learn languages, what would it be — and why?',
            variables: [],
            purpose: '评估用户的假设性思维和表达'
          }
        ],
        exitCondition: '用户能用条件句表达假设性观点'
      },
      {
        name: '聚焦观察',
        purpose: '识别假设表达的语言工具',
        questions: [
          {
            id: 'at-q2',
            type: 'evidence',
            template: 'When you say "If I could..." vs "When I can..." — what\'s the difference in meaning? What does "if" do that "when" doesn\'t?',
            variables: [],
            purpose: '引导用户区分真实条件和假设条件'
          }
        ],
        exitCondition: '用户能区分真实条件与假设条件'
      },
      {
        name: '规律发现',
        purpose: '发现条件句的复杂度层级',
        questions: [
          {
            id: 'at-q3',
            type: 'implication',
            template: 'How does "If I had known..." feel different from "If I know..."? What does the grammar tell you about time and possibility?',
            variables: [],
            purpose: '引导用户发现条件句中时间与可能性的语法编码',
            expectedInsight: '英语条件句通过语法形式编码时间距离和可能性'
          }
        ],
        exitCondition: '用户能理解和运用不同类型的条件句'
      },
      {
        name: '应用验证',
        purpose: '进行抽象讨论',
        questions: [
          {
            id: 'at-q4',
            type: 'meta',
            template: 'Let\'s discuss: "Is technology making us more connected or more alone?" Give your view, consider the counter-argument, and use at least one hypothetical scenario.',
            variables: [],
            purpose: '验证用户能在抽象讨论中灵活运用条件思维'
          }
        ],
        exitCondition: '用户能就抽象议题进行多角度、假设性讨论'
      }
    ]
  },
  practiceTask: {
    instruction: 'Write a response to this prompt: "If you were the head of education for your country, what three things would you change and why?" Use at least 3 different conditional structures.',
    description: '练习使用不同类型条件句表达假设性观点',
    difficulty: 7,
    expectedDuration: '15min',
    scaffoldingHints: [
      { level: 1, hint: 'Start with "If I were..., I would..." to express your hypothetical role.' },
      { level: 2, hint: 'Mix conditionals: "If I changed X, students would..." / "If we had known Y earlier, we could have..."' },
      { level: 3, hint: 'Third conditional for past: "If we had started sooner, we would have seen..." Mixed: "If I had the power (now), I would have already changed (past)..."' }
    ]
  }
}

// ============================================================
// 组装知识图谱
// ============================================================

const nodes: KnowledgeNode[] = [
  // Layer 1
  node1_1, node1_2, node1_3,
  // Layer 2
  node2_1, node2_2,
  // Layer 3
  node3_1, node3_2,
  // Layer 4
  node4_1, node4_2,
]

const edges: DependencyEdge[] = [
  { from: 'self-intro', to: 'daily-routine', type: 'recommends', description: '先学会自我介绍，再扩展日常表达' },
  { from: 'self-intro', to: 'likes-dislikes', type: 'recommends', description: '自我表达是喜好表达的基础' },
  { from: 'daily-routine', to: 'everyday-situations', type: 'requires', description: '掌握日常表达后才能应对真实场景' },
  { from: 'daily-routine', to: 'question-asking', type: 'recommends', description: '日常表达为提问提供语言基础' },
  { from: 'daily-routine', to: 'storytelling', type: 'recommends', description: '日常时序表达是叙事的基础' },
  { from: 'likes-dislikes', to: 'opinion-expression', type: 'requires', description: '先学会表达喜好，再学习论证观点' },
  { from: 'opinion-expression', to: 'comparing-discussing', type: 'requires', description: '掌握观点表达后才能进行比较讨论' },
  { from: 'opinion-expression', to: 'storytelling', type: 'recommends', description: '观点组织能力有助于故事叙述' },
  { from: 'comparing-discussing', to: 'abstract-thinking', type: 'requires', description: '比较讨论是抽象思维的前提' },
]

const layers: LayerInfo[] = [
  {
    layer: 1,
    name: '基础表达',
    description: '建立基本表达能力，学会自我介绍、描述日常和表达感受',
    durationWeeks: 2,
    nodes: ['self-intro', 'daily-routine', 'likes-dislikes']
  },
  {
    layer: 2,
    name: '场景对话',
    description: '掌握真实场景中的对话技巧，学会提问和应对',
    durationWeeks: 2,
    nodes: ['everyday-situations', 'question-asking']
  },
  {
    layer: 3,
    name: '观点表达',
    description: '学会清晰表达观点、论证和进行深度讨论',
    durationWeeks: 2,
    nodes: ['opinion-expression', 'comparing-discussing']
  },
  {
    layer: 4,
    name: '抽象思维',
    description: '进阶到叙事、假设和复杂抽象议题的讨论',
    durationWeeks: 2,
    nodes: ['storytelling', 'abstract-thinking']
  },
]

export const englishKnowledgeGraph: KnowledgeGraph = {
  nodes: new Map(nodes.map(n => [n.id, n])),
  edges,
  layers,
}

export { nodes, edges, layers }
export type { KnowledgeNode, DependencyEdge, LayerInfo }
