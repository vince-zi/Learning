# 🚀 快速测试指南

> 3 个命令，30 秒，完整验证 Learniny 系统核心流程

## ⚡ 快速开始

### 1️⃣ 检查环境

```bash
npm run test:check
```

应该看到所有 ✅。如果有 ❌，按提示修复。

### 2️⃣ 启动服务（终端 1）

```bash
npm run dev
```

等待 `✓ Ready` 消息。

### 3️⃣ 运行测试（终端 2）

```bash
npm run test:validation
```

## 📊 预期结果

```
🚀 Starting Core Flow Validation Test

✓ Practice & Diagnosis Mode (9 tests)
✓ Review & Elimination Mode (4 tests)

📊 Test Summary
✅ Passed: 12
❌ Failed: 1
📈 Total: 13
📊 Pass Rate: 92%
```

## ❓ 遇到问题？

| 问题 | 解决方案 |
|------|---------|
| ❌ Server not running | 运行 `npm run dev` |
| ❌ Missing env vars | 检查 `.env.local` |
| ❌ Connection refused | 确保 `http://localhost:3000` 可访问 |
| ❌ Module not found | 运行 `npm install` |

## 📚 详细文档

需要更多信息？查看:

- 📖 [完整执行指南](./RUN-TESTS.md)
- 📖 [详细使用手册](./VALIDATION-GUIDE.md)
- 📖 [技术文档](./tests/README.md)
- 📖 [项目总结](./TESTING-SUMMARY.md)
- 📖 [完成报告](./TEST-AUTOMATION-COMPLETE.md)

## 🎯 测试覆盖

### Practice Mode (在线 LLM)
- ✅ 用户设置
- ✅ CEFR 配置
- ✅ 会话创建
- ✅ 对话初始化
- ✅ 错误检测
- ✅ 数据库记录
- ✅ 噪音过滤
- ✅ 发现卡片
- ✅ 会话归档

### Review Mode (本地离线)
- ✅ 复习会话
- ⚠️ 即时响应 (已知问题)
- ✅ 错误展示
- ✅ 改写验证
- ✅ 数据库更新
- ✅ 防止污染

## ⚠️ 已知问题

**Review Mode 延迟:** 响应时间 ~2259ms，预期 <150ms  
**状态:** 功能正常，但需要性能优化  
**影响:** 测试通过率 92% (12/13)

## 🛠️ 高级用法

```bash
# 监视模式（文件变化自动重测）
npm run test:watch

# UI 界面（浏览器可视化）
npm run test:ui

# 仅运行验证测试
npm run test:validation
```

## 💡 提示

- 测试会创建临时用户（`test_user_flow_val_*`）
- 每次运行使用新的时间戳
- 旧数据会自然过期
- 测试完全自动化，无需手动操作

---

**准备好了？运行 `npm run test:validation` 开始测试！** 🎉
