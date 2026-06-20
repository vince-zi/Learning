// ============================================================
// Core Layer: Photography Knowledge Graph
// 摄影技能知识图谱 — 四层结构
// Layer 1: 视觉语言基础 → Layer 2: 光线与曝光
// → Layer 3: 色彩与情绪 → Layer 4: 叙事与表达
//
// 每个节点是一个"发现路径"而非"知识点罗列"
// ============================================================

import type { KnowledgeNode, DependencyEdge, LayerInfo, KnowledgeGraph } from './graph-types'

// ============================================================
// Layer 1: 视觉语言基础 (Week 1-2)
// ============================================================

const node1_1: KnowledgeNode = {
  id: 'visual-focus',
  layer: 1,
  name: '视觉重心与注意力引导',
  nameEn: 'Visual Focus & Attention',
  description: '理解观众的注意力如何被引导，学会控制视觉重心',
  difficulty: 2,
  prerequisiteIds: [],
  bloomTarget: 'apply',
  tags: ['构图', '注意力', '视觉重心'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '收集用户对视觉重心的初步认知',
        questions: [
          {
            id: 'vf-q1',
            type: 'clarification',
            template: '你拍这张照片时，最希望别人先注意到什么？',
            variables: [],
            purpose: '引导用户表达拍摄意图'
          },
          {
            id: 'vf-q2',
            type: 'evidence',
            template: '你现在看这张照片，视线先落在哪里？',
            variables: [],
            purpose: '引导用户观察实际视觉焦点'
          }
        ],
        exitCondition: '用户能描述意图和实际焦点的差异'
      },
      {
        name: '聚焦观察',
        purpose: '引导用户理解注意力引导的因素',
        questions: [
          {
            id: 'vf-q3',
            type: 'assumption',
            template: '你觉得这两者一致吗？如果不一致，你觉得可能是什么原因？',
            variables: [],
            purpose: '让用户自己发现意图-结果的错位',
            expectedInsight: '构图位置影响注意力'
          }
        ],
        exitCondition: '用户能指出影响注意力的视觉元素'
      },
      {
        name: '规律发现',
        purpose: '通过对比实践发现规律',
        questions: [
          {
            id: 'vf-q4',
            type: 'implication',
            template: '如果把主体放在照片的左边或右边，你觉得观众的注意力会有什么不同？',
            variables: [],
            purpose: '引导用户思考位置与注意力的关系',
            expectedInsight: '位置变化改变视觉重心'
          }
        ],
        exitCondition: '用户能表达"位置→注意力"的规律'
      },
      {
        name: '应用验证',
        purpose: '在新情境中验证发现',
        questions: [
          {
            id: 'vf-q5',
            type: 'meta',
            template: '你在新照片中如何应用这个发现？这个发现对你之前的理解有什么改变？',
            variables: [],
            purpose: '验证用户能否迁移应用'
          }
        ],
        exitCondition: '用户能在新照片中主动应用视觉重心控制'
      }
    ]
  },
  practiceTask: {
    instruction: '请再拍两张：一张把主体放左边，一张放右边。然后告诉我你的观察。',
    description: '通过改变主体位置，观察注意力的流动变化',
    difficulty: 1,
    expectedDuration: '3min',
    scaffoldingHints: [
      { level: 1, hint: '试试改变拍摄角度' },
      { level: 2, hint: '把主体从中间移到左边或右边' },
      { level: 3, hint: '拍摄时将主体放在画面左侧1/3处，观察与居中构图的区别' }
    ]
  }
}

const node1_2: KnowledgeNode = {
  id: 'visual-balance',
  layer: 1,
  name: '视觉平衡与重量',
  nameEn: 'Visual Balance & Weight',
  description: '理解视觉元素的"重量"概念，学会创造平衡感',
  difficulty: 3,
  prerequisiteIds: ['visual-focus'],
  bloomTarget: 'apply',
  tags: ['构图', '平衡', '视觉重量'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '建立"视觉重量"的直观概念',
        questions: [
          {
            id: 'vb-q1',
            type: 'clarification',
            template: '这张照片让你感觉"重"还是"轻"？是整体的感觉还是某个部分？',
            variables: [],
            purpose: '引导用户感受视觉重量'
          }
        ],
        exitCondition: '用户能描述照片的轻重感受'
      },
      {
        name: '聚焦观察',
        purpose: '识别影响视觉重量的元素',
        questions: [
          {
            id: 'vb-q2',
            type: 'evidence',
            template: '是什么元素让照片感觉"重"或"轻"？是大小、颜色、还是位置？',
            variables: [],
            purpose: '引导用户分解视觉重量因素'
          }
        ],
        exitCondition: '用户能指出影响重量的具体元素'
      },
      {
        name: '规律发现',
        purpose: '发现平衡规律',
        questions: [
          {
            id: 'vb-q3',
            type: 'implication',
            template: '如果左边有一个很大的深色物体，右边需要什么来让照片感觉平衡？',
            variables: [],
            purpose: '引导用户发现"平衡"是元素的相互作用',
            expectedInsight: '视觉元素像天平一样可以平衡'
          }
        ],
        exitCondition: '用户能表达视觉平衡的规律'
      },
      {
        name: '应用验证',
        purpose: '创造平衡与不平衡的作品',
        questions: [
          {
            id: 'vb-q4',
            type: 'meta',
            template: '看看你拍摄的"平衡"和"不平衡"两张照片，哪张让你感觉更舒适？为什么？',
            variables: [],
            purpose: '验证用户对平衡的审美判断'
          }
        ],
        exitCondition: '用户能有意识地创造平衡或不平衡效果'
      }
    ]
  },
  practiceTask: {
    instruction: '拍摄两张照片：一张让你感觉"平衡"，一张让你感觉"不平衡"。对比看看。',
    description: '用不同元素（大小、颜色、位置）创造平衡感与失衡感',
    difficulty: 2,
    expectedDuration: '5min',
    scaffoldingHints: [
      { level: 1, hint: '想想天平是怎么工作的' },
      { level: 2, hint: '尝试把一个大物体放在一边，几个小物体放在另一边' },
      { level: 3, hint: '左边放一个大的浅色物体，右边放一个小的深色物体，观察平衡感' }
    ]
  }
}

const node1_3: KnowledgeNode = {
  id: 'frame-boundary',
  layer: 1,
  name: '画面框架与边界',
  nameEn: 'Frame & Boundary',
  description: '理解取景框的选择本质，学会通过边界控制叙事',
  difficulty: 3,
  prerequisiteIds: ['visual-focus'],
  bloomTarget: 'understand',
  tags: ['构图', '取景', '画框'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '让用户意识到取景是一种选择',
        questions: [
          {
            id: 'fb-q1',
            type: 'clarification',
            template: '为什么你选择了这个画面边界？当时你在想什么？',
            variables: [],
            purpose: '揭示用户的取景决策过程'
          }
        ],
        exitCondition: '用户能反思自己的取景选择'
      },
      {
        name: '聚焦观察',
        purpose: '理解边界选择的影响',
        questions: [
          {
            id: 'fb-q2',
            type: 'implication',
            template: '如果扩大或缩小画框的边界，这张照片讲述的故事会有什么变化？',
            variables: [],
            purpose: '引导用户理解边界与叙事的关系'
          }
        ],
        exitCondition: '用户能描述边界变化对叙事的影响'
      },
      {
        name: '规律发现',
        purpose: '发现"画框=选择性陈述"',
        questions: [
          {
            id: 'fb-q3',
            type: 'assumption',
            template: '在这张照片中，什么被包含了？什么被排除了？这个选择在说什么？',
            variables: [],
            purpose: '引导用户发现取景的叙事本质',
            expectedInsight: '画框是摄影师对世界的选择性陈述'
          }
        ],
        exitCondition: '用户能表达取景的叙事意义'
      },
      {
        name: '应用验证',
        purpose: '用不同取景方式表达不同故事',
        questions: [
          {
            id: 'fb-q4',
            type: 'meta',
            template: '同一个人/物体，你用5种不同取景方式拍出了5个不同的故事。哪个最接近你想表达的？',
            variables: [],
            purpose: '验证用户能否用取景来表达'
          }
        ],
        exitCondition: '用户能有意识地用取景框表达不同叙事'
      }
    ]
  },
  practiceTask: {
    instruction: '拍摄同一个主题，试试5种不同的取景方式。看看每种取景讲述了怎样不同的故事。',
    description: '通过改变取景方式，探索画框的叙事能力',
    difficulty: 2,
    expectedDuration: '10min',
    scaffoldingHints: [
      { level: 1, hint: '改变你与被摄物体的距离' },
      { level: 2, hint: '尝试特写（只拍局部）、中景（包含环境）、全景（展示全貌）' },
      { level: 3, hint: '特写强调细节和质感；中景建立主体与环境的关系；全景讲述更完整的故事' }
    ]
  }
}

// ============================================================
// Layer 2: 光线与曝光 (Week 2-3)
// ============================================================

const node2_1: KnowledgeNode = {
  id: 'light-direction',
  layer: 2,
  name: '光线的方向与质感',
  nameEn: 'Light Direction & Quality',
  description: '理解光线方向对被摄体的影响，学会观察和利用光线',
  difficulty: 4,
  prerequisiteIds: ['visual-focus'],
  bloomTarget: 'apply',
  tags: ['光线', '质感', '方向'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '识别光线方向',
        questions: [
          {
            id: 'ld-q1',
            type: 'evidence',
            template: '这张照片的光线是从哪个方向来的？你是怎么判断的？',
            variables: [],
            purpose: '引导用户观察光线方向'
          }
        ],
        exitCondition: '用户能通过视觉证据判断光源方向'
      },
      {
        name: '聚焦观察',
        purpose: '理解光线方向对质感的影响',
        questions: [
          {
            id: 'ld-q2',
            type: 'clarification',
            template: '这个方向的光线让主体呈现什么质感？是柔和还是强烈？是立体还是平面？',
            variables: [],
            purpose: '引导用户感受光线质感'
          }
        ],
        exitCondition: '用户能描述光线的质感特征'
      },
      {
        name: '规律发现',
        purpose: '发现光线方向与情绪的关系',
        questions: [
          {
            id: 'ld-q3',
            type: 'implication',
            template: '如果改变光线方向——从正面移到侧面，或者从上方移到下方——主体的感觉会怎么变化？',
            variables: [],
            purpose: '引导用户发现光线方向决定形态和情绪',
            expectedInsight: '光线方向决定形态呈现和情绪表达'
          }
        ],
        exitCondition: '用户能预言不同光线方向的效果'
      },
      {
        name: '应用验证',
        purpose: '主动选择光线方向来表达',
        questions: [
          {
            id: 'ld-q4',
            type: 'meta',
            template: '这次你选择了什么光线方向？为什么这个方向适合你想表达的感觉？',
            variables: [],
            purpose: '验证用户是否有意识地选择光线'
          }
        ],
        exitCondition: '用户能有意识地选择光线方向来表达意图'
      }
    ]
  },
  practiceTask: {
    instruction: '找到一扇窗户，拍摄同一个物体在顺光、侧光、逆光三种光线下的效果。',
    description: '通过改变拍摄位置（而非灯光），体验不同光线方向',
    difficulty: 3,
    expectedDuration: '10min',
    scaffoldingHints: [
      { level: 1, hint: '想想太阳/窗户在你的哪个方向' },
      { level: 2, hint: '顺光=光源在你身后；侧光=光源在你侧面；逆光=光源在被摄体后面' },
      { level: 3, hint: '顺光最清晰但缺乏立体感；侧光产生阴影和纹理；逆光创造轮廓和戏剧感' }
    ]
  }
}

const node2_2: KnowledgeNode = {
  id: 'exposure-triangle',
  layer: 2,
  name: '曝光三要素的发现',
  nameEn: 'Exposure Triangle Discovery',
  description: '通过实验发现光圈、快门、ISO各自的作用和相互关系',
  difficulty: 6,
  prerequisiteIds: ['visual-focus'],
  bloomTarget: 'analyze',
  tags: ['曝光', '光圈', '快门', 'ISO'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '建立"曝光可控制"的认知',
        questions: [
          {
            id: 'et-q1',
            type: 'clarification',
            template: '这张照片和你眼睛看到的相比，是更亮还是更暗？你觉得是什么原因？',
            variables: [],
            purpose: '建立对曝光的初步意识'
          }
        ],
        exitCondition: '用户能识别曝光偏差'
      },
      {
        name: '聚焦观察',
        purpose: '分别发现三要素的作用',
        questions: [
          {
            id: 'et-q2',
            type: 'evidence',
            template: '你调节了哪个参数让照片变亮的？调大这个参数后，照片除了亮度还有什么变化？',
            variables: [],
            purpose: '引导用户发现每个参数有"副作用"'
          }
        ],
        exitCondition: '用户能描述至少一个参数的额外效果'
      },
      {
        name: '规律发现',
        purpose: '发现三要素的权衡关系',
        questions: [
          {
            id: 'et-q3',
            type: 'implication',
            template: '你想让照片更亮，但不想改变景深。你该怎么办？',
            variables: [],
            purpose: '引导用户理解参数间的取舍',
            expectedInsight: '曝光是参数组合的艺术，各有取舍'
          }
        ],
        exitCondition: '用户能提出至少一种替代方案'
      },
      {
        name: '应用验证',
        purpose: '在实践中灵活组合参数',
        questions: [
          {
            id: 'et-q4',
            type: 'meta',
            template: '你用三种不同的参数组合达到了相同的曝光。哪种组合最适合这张照片的表达？为什么？',
            variables: [],
            purpose: '验证用户能根据表达需要选择参数组合'
          }
        ],
        exitCondition: '用户能根据创作意图选择参数组合'
      }
    ]
  },
  practiceTask: {
    instruction: '在一个固定场景中，用3种不同的参数组合拍出亮度相同的照片。观察每组的景深和动态模糊有何不同。',
    description: '实验性地探索曝光三角的权衡关系',
    difficulty: 5,
    expectedDuration: '15min',
    scaffoldingHints: [
      { level: 1, hint: '改变一个参数的同时，反方向改变另一个参数' },
      { level: 2, hint: '例如：光圈从f/2.8调到f/8（进光减少），同时把快门从1/500调到1/60（进光增加）' },
      { level: 3, hint: '光圈↑ + 快门↓ = 曝光不变但景深变深 + 动态模糊增加\n光圈↓ + ISO↓ = 曝光不变但景深变浅 + 噪点减少' }
    ]
  }
}

// ============================================================
// Layer 3: 色彩与情绪 (Week 3-4)
// ============================================================

const node3_1: KnowledgeNode = {
  id: 'color-temperature',
  layer: 3,
  name: '色彩的冷暖与情绪',
  nameEn: 'Color Temperature & Emotion',
  description: '理解色温对照片情绪的影响，学会用白平衡表达情感',
  difficulty: 4,
  prerequisiteIds: ['light-direction'],
  bloomTarget: 'apply',
  tags: ['色彩', '色温', '情绪'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '建立色彩与情绪的连接',
        questions: [
          {
            id: 'ct-q1',
            type: 'clarification',
            template: '这张照片给你什么情绪感受？是温暖、冷静、还是别样的？',
            variables: [],
            purpose: '引导用户感受色彩情绪'
          }
        ],
        exitCondition: '用户能将照片与情绪词语关联'
      },
      {
        name: '聚焦观察',
        purpose: '识别制造情绪的色彩元素',
        questions: [
          {
            id: 'ct-q2',
            type: 'evidence',
            template: '是哪些色彩元素创造了这种情绪？是整体的色调，还是某个特定颜色？',
            variables: [],
            purpose: '引导用户分析色彩构成'
          }
        ],
        exitCondition: '用户能指出影响情绪的具体色彩'
      },
      {
        name: '规律发现',
        purpose: '发现色温与情绪的关系',
        questions: [
          {
            id: 'ct-q3',
            type: 'implication',
            template: '如果改变色温——让暖色的照片变冷，或让冷色的照片变暖——情绪会怎么变化？',
            variables: [],
            purpose: '引导用户发现色温是情绪的调节器',
            expectedInsight: '色彩是情绪的直接语言'
          }
        ],
        exitCondition: '用户能预言色温变化对情绪的影响'
      },
      {
        name: '应用验证',
        purpose: '用色温主动表达情绪',
        questions: [
          {
            id: 'ct-q4',
            type: 'meta',
            template: '你这次选择了什么色温？为什么这个色温适合你想表达的情绪？',
            variables: [],
            purpose: '验证用户能有意识地用色温表达'
          }
        ],
        exitCondition: '用户能有意识地用色温控制情绪表达'
      }
    ]
  },
  practiceTask: {
    instruction: '拍摄同一个场景，分别用暖色调和冷色调的白平衡设置。观察情绪差异。',
    description: '通过改变白平衡，体验色温对情绪的戏剧性影响',
    difficulty: 2,
    expectedDuration: '5min',
    scaffoldingHints: [
      { level: 1, hint: '找你相机的"白平衡"设置' },
      { level: 2, hint: '试试"日光"（暖）和"钨丝灯"（冷）两种模式' },
      { level: 3, hint: '暖色(=高色温K值)让人感觉温暖、怀旧、亲密；冷色(=低色温K值)让人感觉冷静、孤独、科技感' }
    ]
  }
}

const node3_2: KnowledgeNode = {
  id: 'color-contrast',
  layer: 3,
  name: '色彩对比与和谐',
  nameEn: 'Color Contrast & Harmony',
  description: '理解色彩关系（互补色、类似色）的情感力量',
  difficulty: 5,
  prerequisiteIds: ['color-temperature'],
  bloomTarget: 'apply',
  tags: ['色彩', '对比', '和谐', '互补色'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '发现色彩关系',
        questions: [
          {
            id: 'cc-q1',
            type: 'evidence',
            template: '这张照片中最吸引你的色彩关系是什么？是两种颜色的对比（冲突），还是统一的氛围（和谐）？',
            variables: [],
            purpose: '引导用户识别色彩关系类型'
          }
        ],
        exitCondition: '用户能区分对比与和谐'
      },
      {
        name: '聚焦观察',
        purpose: '理解色彩关系的情感效果',
        questions: [
          {
            id: 'cc-q2',
            type: 'clarification',
            template: '这种色彩关系给你什么感觉？是对比带来的张力，还是和谐带来的舒适？',
            variables: [],
            purpose: '引导用户连接色彩关系与情感'
          }
        ],
        exitCondition: '用户能描述色彩关系的情感特质'
      },
      {
        name: '规律发现',
        purpose: '发现如何增强/减弱色彩关系',
        questions: [
          {
            id: 'cc-q3',
            type: 'implication',
            template: '如果你想增强这种色彩关系（更强烈的对比或更统一的和谐），可以怎么调整？',
            variables: [],
            purpose: '引导用户发现色彩关系的调控手段',
            expectedInsight: '色彩关系是画面的情感基础，可被主动调控'
          }
        ],
        exitCondition: '用户能提出调控色彩关系的方法'
      },
      {
        name: '应用验证',
        purpose: '有意识地创造色彩关系',
        questions: [
          {
            id: 'cc-q4',
            type: 'meta',
            template: '你在这张照片中创造了怎样的色彩关系？它如何支持你想表达的情感？',
            variables: [],
            purpose: '验证用户能否有意识地构建色彩关系'
          }
        ],
        exitCondition: '用户能有意识地创造色彩关系来表达情感'
      }
    ]
  },
  practiceTask: {
    instruction: '寻找并拍摄一组互补色对比（如红配绿、蓝配橙）和一组类似色和谐（如同一色系深浅变化）。',
    description: '通过有目的的寻找，训练色彩敏感度',
    difficulty: 4,
    expectedDuration: '15min',
    scaffoldingHints: [
      { level: 1, hint: '看色轮：对面的颜色是互补色，相邻的颜色是类似色' },
      { level: 2, hint: '互补色例子：蓝天空+橙色夕阳；红苹果+绿叶；紫色花+黄色花蕊' },
      { level: 3, hint: '互补色=强烈对比、有活力、吸引注意力；类似色=柔和、优雅、营造氛围' }
    ]
  }
}

// ============================================================
// Layer 4: 叙事与表达 (Week 4+)
// ============================================================

const node4_1: KnowledgeNode = {
  id: 'time-visualization',
  layer: 4,
  name: '照片中的时间感',
  nameEn: 'Time Visualization',
  description: '理解快门速度如何视觉化时间，学会用时间感叙事',
  difficulty: 5,
  prerequisiteIds: ['exposure-triangle'],
  bloomTarget: 'analyze',
  tags: ['时间', '快门', '叙事', '动态模糊'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '建立时间感的意识',
        questions: [
          {
            id: 'tv-q1',
            type: 'clarification',
            template: '这张照片捕捉的是"瞬间"还是"过程"？你是怎么判断的？',
            variables: [],
            purpose: '引导用户区分瞬间与过程'
          }
        ],
        exitCondition: '用户能判断照片的时间特性'
      },
      {
        name: '聚焦观察',
        purpose: '发现控制时间感的参数',
        questions: [
          {
            id: 'tv-q2',
            type: 'evidence',
            template: '是什么让这张照片看起来像是"冻结了时间"（或"记录了时间的流逝"）？',
            variables: [],
            purpose: '引导用户寻找时间感的视觉证据'
          }
        ],
        exitCondition: '用户能识别凝固或流动的视觉特征'
      },
      {
        name: '规律发现',
        purpose: '发现快门速度与时间感的关系',
        questions: [
          {
            id: 'tv-q3',
            type: 'implication',
            template: '快快门（1/1000秒）和慢快门（1秒）分别适合讲述什么类型的故事？',
            variables: [],
            purpose: '引导用户发现快门速度是时间的视觉化工具',
            expectedInsight: '快门速度决定了时间在照片中的形态'
          }
        ],
        exitCondition: '用户能根据叙事需求选择快门速度'
      },
      {
        name: '应用验证',
        purpose: '用时间感讲故事',
        questions: [
          {
            id: 'tv-q4',
            type: 'meta',
            template: '你选择这个快门速度是为了表达什么？是凝固某个决定性瞬间，还是展现时间的流动？',
            variables: [],
            purpose: '验证用户能主动用时间感服务叙事'
          }
        ],
        exitCondition: '用户能有意识地用快门速度表达时间叙事'
      }
    ]
  },
  practiceTask: {
    instruction: '找一个运动中的物体（行人、流水、车辆），分别用快快门（1/500以上）和慢快门（1/15以下）拍摄。',
    description: '通过快门速度的极端对比，体验时间视觉化的效果',
    difficulty: 4,
    expectedDuration: '15min',
    scaffoldingHints: [
      { level: 1, hint: '切换到"快门优先"模式（Tv或S）' },
      { level: 2, hint: '快快门=凝固瞬间（飞溅的水滴、跳跃的人）；慢快门=记录过程（丝绸般的水流、光影拖尾）' },
      { level: 3, hint: '慢快门需要稳定相机（三脚架或靠墙）。如果照片过亮，降低ISO或缩小光圈来补偿。' }
    ]
  }
}

const node4_2: KnowledgeNode = {
  id: 'perspective-narrative',
  layer: 4,
  name: '视角与叙事立场',
  nameEn: 'Perspective & Narrative Stance',
  description: '理解拍摄视角如何暗示观看关系和叙事立场',
  difficulty: 4,
  prerequisiteIds: ['visual-focus', 'frame-boundary'],
  bloomTarget: 'analyze',
  tags: ['视角', '叙事', '立场', '构图'],
  discoveryPath: {
    phases: [
      {
        name: '开放探索',
        purpose: '意识到视角的存在',
        questions: [
          {
            id: 'pn-q1',
            type: 'clarification',
            template: '你拍摄时的物理位置是哪里？是站着拍的、蹲着拍的，还是别的？',
            variables: [],
            purpose: '引导用户意识自己的拍摄位置'
          }
        ],
        exitCondition: '用户能描述拍摄时的物理位置'
      },
      {
        name: '聚焦观察',
        purpose: '理解视角暗示的观看关系',
        questions: [
          {
            id: 'pn-q2',
            type: 'assumption',
            template: '这个拍摄位置让观众以什么身份看被摄体？是平等的、俯视的、还是仰视的？',
            variables: [],
            purpose: '引导用户理解视角的叙事意味'
          }
        ],
        exitCondition: '用户能识别视角暗示的权力/关系'
      },
      {
        name: '规律发现',
        purpose: '发现视角是叙事立场',
        questions: [
          {
            id: 'pn-q3',
            type: 'implication',
            template: '如果改为俯视（或仰视、平视），这个故事会怎么变化？被摄体给人的感觉会有什么不同？',
            variables: [],
            purpose: '引导用户发现视角=叙事立场',
            expectedInsight: '视角是摄影师的叙事立场，决定观众与被摄体的关系'
          }
        ],
        exitCondition: '用户能预言不同视角的叙事效果'
      },
      {
        name: '应用验证',
        purpose: '有意识地选择视角来表达',
        questions: [
          {
            id: 'pn-q4',
            type: 'meta',
            template: '为什么选择这个视角？你想让观众以什么关系看待被摄体？',
            variables: [],
            purpose: '验证用户能否有意识地用视角表达立场'
          }
        ],
        exitCondition: '用户能根据叙事目的选择视角'
      }
    ]
  },
  practiceTask: {
    instruction: '拍摄同一个主题，分别从俯视、平视、仰视三个角度。观察每种视角讲述的"故事"有何不同。',
    description: '通过改变拍摄高度，体验视角对叙事的影响',
    difficulty: 3,
    expectedDuration: '10min',
    scaffoldingHints: [
      { level: 1, hint: '改变你的拍摄高度：站起来、蹲下去、甚至放在地上' },
      { level: 2, hint: '俯视=让被摄体显得小/脆弱；平视=平等的关系；仰视=让被摄体显得强大/重要' },
      { level: 3, hint: '拍人时：俯视=保护和同情；平视=亲近和平等；仰视=尊敬和崇拜。拍建筑也是同样的逻辑。' }
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
  { from: 'visual-focus', to: 'visual-balance', type: 'requires', description: '先理解注意力引导，才能理解视觉平衡' },
  { from: 'visual-focus', to: 'frame-boundary', type: 'recommends', description: '视觉重心认知有助于理解取景选择' },
  { from: 'visual-focus', to: 'light-direction', type: 'recommends', description: '先理解视觉注意力，再学习光线引导注意力' },
  { from: 'visual-focus', to: 'exposure-triangle', type: 'recommends', description: '技术参数服务于视觉表达' },
  { from: 'visual-focus', to: 'perspective-narrative', type: 'recommends', description: '视觉语言基础是叙事表达的前提' },
  { from: 'frame-boundary', to: 'perspective-narrative', type: 'requires', description: '取景概念是视角选择的基础' },
  { from: 'light-direction', to: 'color-temperature', type: 'requires', description: '先理解光线方向，才能理解色温控制' },
  { from: 'light-direction', to: 'exposure-triangle', type: 'recommends', description: '光线意识有助于理解曝光参数' },
  { from: 'exposure-triangle', to: 'time-visualization', type: 'requires', description: '掌握曝光三角后才能理解快门速度的创意应用' },
  { from: 'color-temperature', to: 'color-contrast', type: 'requires', description: '先理解单一色温的情绪，再学习色彩组合' },
]

const layers: LayerInfo[] = [
  {
    layer: 1,
    name: '视觉语言基础',
    description: '建立观察习惯，理解视觉语言的基本元素',
    durationWeeks: 2,
    nodes: ['visual-focus', 'visual-balance', 'frame-boundary']
  },
  {
    layer: 2,
    name: '光线与曝光',
    description: '建立技术理解，掌握曝光控制',
    durationWeeks: 2,
    nodes: ['light-direction', 'exposure-triangle']
  },
  {
    layer: 3,
    name: '色彩与情绪',
    description: '建立情感表达，掌握色彩运用',
    durationWeeks: 2,
    nodes: ['color-temperature', 'color-contrast']
  },
  {
    layer: 4,
    name: '叙事与表达',
    description: '建立个人风格，整合所有技术',
    durationWeeks: 2,
    nodes: ['time-visualization', 'perspective-narrative']
  },
]

const photographyKnowledgeGraph: KnowledgeGraph = {
  nodes: new Map(nodes.map(n => [n.id, n])),
  edges,
  layers,
}

export { photographyKnowledgeGraph, nodes, edges, layers }
export type { KnowledgeNode, DependencyEdge, LayerInfo }
