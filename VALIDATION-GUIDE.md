# 🧪 Learniny System Validation Test Guide

## 快速开始 (Quick Start)

### 1. 确保环境准备就绪

检查 `.env.local` 文件是否存在并配置正确:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. 启动开发服务器

在一个终端窗口中运行:

```bash
npm run dev
```

等待服务器启动完成 (通常在 `http://localhost:3000`)

### 3. 运行验证测试

在另一个终端窗口中运行:

```bash
npm run test:validation
```

或者使用 Node.js 直接运行:

```bash
node run-validation.js
```

## 测试流程详解

### 阶段 1: 练习与诊断模式 (Practice Mode)

这个阶段测试基于 DeepSeek LLM 的在线诊断功能:

1. **用户设置** - 在数据库中创建测试用户
2. **CEFR 配置** - 设置用户英语水平为 B1
3. **会话创建** - 创建"自由对话"练习会话
4. **对话初始化** - 发送初始化消息，获取助手回复
5. **语法错误检测** - 提交包含错误的句子 "I very like playing basketball."
6. **错误记录** - 验证错误被正确记录到数据库
7. **噪音过滤** - 测试系统过滤无意义的招呼语 ("Hi")
8. **发现卡片** - 生成学习发现卡片
9. **会话归档** - 结束并归档会话

### 阶段 2: 温习与错题消灭模式 (Review Mode)

这个阶段测试 100% 本地离线的错题复习引擎:

1. **复习会话创建** - 基于之前的错误记录创建复习会话
2. **即时响应测试** ⚠️ - 验证本地引擎的响应速度 (期望 < 150ms)
3. **错误句子展示** - 显示之前犯错的句子
4. **错误改写拒绝** - 拒绝不正确的改写尝试
5. **正确改写接受** - 接受正确的改写 "I really like playing basketball."
6. **数据库更新** - 标记错误为"已掌握" (noted_by_user = true)
7. **二次污染检查** - 确保复习过程不会产生新的错误记录

## 测试输出解读

### 控制台输出

```
🚀 Starting Core Flow Validation Test
Test User ID: test_user_flow_val_1736247845123

👤 Setting up user...
✅ User Setup: PASS

📝 Setting up CEFR profile...
✅ CEFR Profile Setup: PASS

...

📊 Test Summary
✅ Passed: 12
❌ Failed: 1
📈 Total: 13
📊 Pass Rate: 92%
```

### HTML 报告

测试完成后会生成 `validation-report.html` 文件，包含:

- 📊 统计面板 (通过率、通过数、失败数、总数)
- 📝 详细日志 (每个步骤的请求/响应)
- ✅ 断言结果 (期望值 vs 实际值)
- 🎨 可视化展示 (彩色状态指示器)

## 常见问题 (FAQ)

### Q: 测试失败: "Missing required environment variables"

**A:** 检查 `.env.local` 文件:
```bash
# 确保文件存在
ls .env.local

# 检查内容
type .env.local
```

### Q: 测试失败: "Connection refused"

**A:** 确保开发服务器正在运行:
```bash
# 在另一个终端窗口
npm run dev
```

### Q: 测试超时

**A:** 测试默认超时时间为 60 秒。如果网络较慢或 API 响应慢，可以调整:

编辑 `vitest.config.ts`:
```typescript
test: {
  testTimeout: 120000, // 增加到 120 秒
}
```

### Q: Review Mode 延迟测试失败

**A:** 这是已知问题。当前实现的延迟约为 2259ms，远超期望的 150ms。这表明:

1. 本地离线引擎可能未完全优化
2. 可能仍在进行外部 API 调用
3. 需要进一步优化响应速度

**预期行为:** 复习模式应该使用本地 Jaccard 相似度算法，不依赖 LLM API

**实际行为:** 响应时间表明可能仍在调用外部服务

## 调试指南

### 启用详细日志

```bash
DEBUG=* npm run test:validation
```

### 测试单个步骤

修改 `tests/validation.test.ts`，使用 `it.only`:

```typescript
it.only('should detect grammar error', async () => {
  // 只运行这个测试
});
```

### 检查 Supabase 连接

```bash
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### 手动测试 API

```bash
# 创建会话
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","module":"english","theme":"Free Conversation"}'
```

## 性能基准

| 指标 | 期望值 | 当前值 | 状态 |
|------|--------|--------|------|
| 练习模式初始化 | < 5s | ~3s | ✅ |
| 错误检测响应 | < 5s | ~4s | ✅ |
| 复习模式初始化 | < 150ms | ~2259ms | ❌ |
| 改写验证 | < 100ms | ~2s | ⚠️ |
| 数据库写入 | < 200ms | ~150ms | ✅ |

## 下一步优化

1. **优化复习模式响应时间**
   - 实现完全本地化的相似度计算
   - 移除不必要的 API 调用
   - 使用缓存提升性能

2. **添加更多测试场景**
   - 不同类型的语法错误
   - 多轮对话流程
   - 边界情况测试

3. **集成 CI/CD**
   - GitHub Actions 自动化测试
   - 每次 PR 都运行验证
   - 生成测试报告工件

4. **性能监控**
   - 添加性能追踪
   - 记录响应时间趋势
   - 设置性能警报

## 贡献指南

### 添加新测试

1. 在 `tests/validation.test.ts` 中添加新的 `it()` 块
2. 使用 `assert()` 函数记录断言
3. 添加适当的日志输出 (带 emoji)
4. 更新本文档

### 代码规范

- 使用 TypeScript
- 遵循现有的命名约定
- 添加注释说明复杂逻辑
- 保持测试独立性 (不依赖其他测试)

## 联系支持

如果遇到问题:

1. 检查本指南的"常见问题"部分
2. 查看 `tests/README.md` 获取技术细节
3. 提交 GitHub Issue 并附上:
   - 错误信息
   - 环境配置
   - 复现步骤

---

**祝测试愉快! 🎉**
