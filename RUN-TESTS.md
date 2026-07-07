# 🎯 完整测试流程 (Complete Test Procedure)

## 一键运行指南 (Quick Run Guide)

### 第一步：检查环境

```bash
npm run test:check
```

如果看到所有 ✅，继续下一步。如果有 ❌，按提示修复。

### 第二步：启动开发服务器（新终端窗口）

```bash
npm run dev
```

等待看到：
```
✓ Ready in X ms
○ Local: http://localhost:3000
```

### 第三步：运行测试（另一个终端窗口）

```bash
npm run test:validation
```

或

```bash
node run-validation.js
```

## 完整手动流程 (Step-by-Step Manual Process)

### 准备工作

1. **确保环境变量配置**

打开 `.env.local` 文件，确认以下变量已设置:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
DEEPSEEK_API_KEY=your-deepseek-key
```

2. **安装依赖（如果还没有）**

```bash
npm install
```

### 运行测试

#### 方式 1: 使用 npm 脚本（推荐）

**终端 1 - 开发服务器:**
```bash
npm run dev
```

**终端 2 - 运行测试:**
```bash
npm run test:validation
```

#### 方式 2: 使用运行脚本

**终端 1 - 开发服务器:**
```bash
npm run dev
```

**终端 2 - 运行测试:**
```bash
node run-validation.js
```

#### 方式 3: 使用 Vitest 直接运行

**终端 1 - 开发服务器:**
```bash
npm run dev
```

**终端 2 - 运行测试:**
```bash
npx vitest --run tests/validation.test.ts
```

## 测试输出说明

### 成功的测试输出应该看起来像这样：

```
🚀 Starting Core Flow Validation Test
Test User ID: test_user_flow_val_1736247845123

 ✓ tests/validation.test.ts (13)
   ✓ Learniny System Core Flow Validation (13)
     ✓ 1. Practice & Diagnosis Mode (Online LLM) (9)
       ✓ should setup user in database
       ✓ should setup CEFR profile
       ✓ should create practice session
       ✓ should initialize dialog
       ✓ should detect grammar error
       ✓ should insert error record in database
       ✓ should filter greeting noise
       ✓ should create discovery card
       ✓ should archive session
     ✓ 2. Review & Elimination Mode (100% Local Offline) (4)
       ✓ should create review session
       ✓ should initialize review chat with instant response (FAIL)
       ✓ should reject bad rewrite
       ✓ should accept correct rewrite
       ✓ should mark error as noted in database
       ✓ should not create secondary pollution

📊 Test Summary
✅ Passed: 12
❌ Failed: 1
📈 Total: 13
📊 Pass Rate: 92%

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  XX:XX:XX
   Duration  25.43s
```

### 如果看到错误

#### 错误 1: "Connection refused"
```
❌ Error: connect ECONNREFUSED 127.0.0.1:3000
```

**解决方案:** 开发服务器没有运行，在另一个终端运行:
```bash
npm run dev
```

#### 错误 2: "Missing required environment variables"
```
❌ Error: Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL
```

**解决方案:** 检查 `.env.local` 文件是否存在并正确配置

#### 错误 3: Test timeout
```
❌ Error: Test timeout after 60000ms
```

**解决方案:** 
1. 网络可能较慢，增加超时时间（编辑 `vitest.config.ts`）
2. API 服务可能不可用，检查 Supabase 和 DeepSeek 连接

#### 错误 4: "Cannot find module"
```
❌ Error: Cannot find module '@supabase/supabase-js'
```

**解决方案:** 重新安装依赖:
```bash
npm install
```

## 测试数据清理

测试会创建临时数据，使用唯一的测试用户 ID (如 `test_user_flow_val_1736247845123`)。

如果需要手动清理:

```sql
-- 在 Supabase SQL Editor 中运行
DELETE FROM error_records WHERE user_id LIKE 'test_user_flow_val_%';
DELETE FROM sessions WHERE user_id LIKE 'test_user_flow_val_%';
DELETE FROM user_profiles WHERE user_id LIKE 'test_user_flow_val_%';
DELETE FROM users WHERE id LIKE 'test_user_flow_val_%';
```

或者，测试使用时间戳，旧的测试数据会自然过期。

## 进阶用法

### 监视模式（开发时使用）

在测试文件变更时自动重新运行:

```bash
npm run test:watch
```

### 带 UI 的测试界面

```bash
npm run test:ui
```

这会打开一个浏览器界面，可以:
- 可视化查看测试结果
- 过滤和搜索测试
- 查看详细的错误信息
- 重新运行单个测试

### 调试模式

在 VS Code 中，创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Validation Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:validation"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

然后在测试代码中设置断点并按 F5。

## 性能优化

如果测试太慢:

1. **使用本地 Supabase** (可选)
   - 安装 Supabase CLI
   - 运行本地实例: `supabase start`
   - 更新 `.env.local` 指向本地地址

2. **并行测试** (当有多个测试文件时)
   ```bash
   vitest --run --threads
   ```

3. **缓存响应** (开发中)
   - 记录 API 响应
   - 回放而不是实际调用

## 持续集成 (CI/CD)

### GitHub Actions

创建 `.github/workflows/test.yml`:

```yaml
name: Validation Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run validation tests
        run: npm run test:validation
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: validation-report.html
```

## 故障排查检查清单

- [ ] `.env.local` 文件存在
- [ ] 所有环境变量都已设置
- [ ] `npm install` 已运行
- [ ] 开发服务器正在运行 (`npm run dev`)
- [ ] 可以访问 http://localhost:3000
- [ ] Supabase 连接正常
- [ ] DeepSeek API 密钥有效
- [ ] 没有防火墙阻止本地连接
- [ ] 没有其他进程占用 3000 端口

## 获取帮助

1. **运行环境检查:**
   ```bash
   npm run test:check
   ```

2. **查看详细文档:**
   - `VALIDATION-GUIDE.md` - 完整使用指南
   - `tests/README.md` - 技术文档
   - `TESTING-SUMMARY.md` - 总体概览

3. **常见问题:**
   - 查看 `VALIDATION-GUIDE.md` 的 FAQ 部分

4. **提交问题:**
   - 包含错误信息
   - 包含 `npm run test:check` 的输出
   - 说明复现步骤

---

**祝测试顺利! 🎉**

有问题随时查看文档或提问。
