# Layer 5: DATA - 壁垒数据结构设计

## 1. 核心行为捕获 (Key Behavior Tracking)
* 我们需要收集哪些代表用户行为的特异性数据（并非聊天记录本身）？
  * ❌ **错误范例**：仅仅保存对话文本。
  *  **正确范例**：保存用户的提问耗时、重拍率、AI 采纳率、核心摄影规律的分类标签。

## 2. 成功/失败因果归因 (Outcome Attribution)
* 系统如何感知并记录：
  * 用户**成功**掌握该规律的判断条件与数据库记录？
  * 用户**失败/中途流失**的节点与记录？

## 3. 核心数据表/Schema 结构 (Core Schema Definition)
* 使用 SQL、JSON 或 TypeScript 定义底层记录行为与因果的数据结构。

```typescript
// 示例：用户学习成效追踪
interface LearnerOutcome {
  id: string;
  userId: string;
  topicId: string;
  difficultyRating: number;      // 用户自我评估的困难度
  attemptsCount: number;         // 练习重拍次数
  completedAt: string;
  outcomeAttribution: {          // 成功/失败的原因提炼
    successKeywords: string[];    
    failureReasons: string[];
  }
}
```
