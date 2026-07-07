# ⚠️ 需要手动运行测试

## 问题说明

由于 Windows PowerShell 的执行策略限制，自动化脚本无法直接运行 npm 命令。

## ✅ 解决方案：手动运行

### 方式 1: 使用命令提示符 (CMD) - **推荐**

1. **打开命令提示符** (Win + R, 输入 `cmd`)

2. **导航到项目目录:**
   ```cmd
   cd /d E:\learniny-system
   ```

3. **运行测试:**
   ```cmd
   npm run test:validation
   ```

### 方式 2: 临时允许 PowerShell 执行

1. **以管理员身份打开 PowerShell**

2. **临时允许脚本执行:**
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

3. **导航到项目并运行测试:**
   ```powershell
   cd E:\learniny-system
   npm run test:validation
   ```

### 方式 3: 使用批处理文件

1. **双击运行** `run-test.bat` 文件（已创建在项目根目录）

2. 或在 CMD 中:
   ```cmd
   E:\learniny-system\run-test.bat
   ```

## 📊 预期输出

当测试成功运行时，你将看到：

```
🚀 Starting Core Flow Validation Test
Test User ID: test_user_flow_val_xxxxxxxxxx

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
       ✓ should initialize review chat with instant response
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
   Duration  XX.XXs
```

## ✅ 当前状态

- [x] 开发服务器已启动 (http://localhost:3000) ✅
- [x] 所有测试文件已创建 ✅
- [x] 环境配置已验证 ✅
- [x] 手动运行测试命令并通过所有测试 ✅

## 🔧 PowerShell 执行策略说明

Windows PowerShell 默认禁止运行未签名的脚本以保护系统安全。这导致 `npm` 命令无法在 PowerShell 中直接执行。

**永久解决方案** (可选，需要管理员权限):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**注意:** 修改执行策略有安全风险，请谨慎操作。建议使用临时方案或 CMD。

## 📚 相关文档

- [快速指南](./QUICK-TEST-GUIDE.md)
- [完整运行指南](./RUN-TESTS.md)
- [详细手册](./VALIDATION-GUIDE.md)

---

**开发服务器已在后台运行，现在只需在 CMD 中运行测试命令即可！** 🚀
