# Learniny System Automated Validation Tests

## Overview

This test suite automates the complete validation flow for the Learniny System, comparing two core modes:

1. **Practice & Diagnosis Mode** - Powered by DeepSeek LLM (online)
2. **Review & Elimination Mode** - 100% local offline engine

## Test Coverage

The validation test covers the following flow:

### Practice Mode (Online LLM)
- ✅ User setup in database
- ✅ CEFR profile configuration (B1 level)
- ✅ Session creation
- ✅ Dialog initialization
- ✅ Grammar error detection ("I very like playing basketball")
- ✅ Error record insertion in database
- ✅ Greeting noise filtering
- ✅ Discovery card generation
- ✅ Session archival

### Review Mode (Local Offline)
- ✅ Review session creation
- ⚠️ Instant response validation (< 150ms expected)
- ✅ Wrong sentence display
- ✅ Bad rewrite rejection
- ✅ Correct rewrite acceptance
- ✅ Database update (noted_by_user flag)
- ✅ Secondary pollution prevention

## Setup

### Prerequisites

1. **Node.js** (v18+)
2. **Supabase** account with database setup
3. **Environment variables** configured in `.env.local`

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run validation test specifically
```bash
npm run test:validation
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with UI
```bash
npm run test:ui
```

## Test Output

The test suite generates:

1. **Console output** - Real-time test progress with colored indicators
2. **HTML report** - `validation-report.html` with detailed breakdown
3. **Assertion summary** - Pass/fail counts and percentage

### Example Output

```
🚀 Starting Core Flow Validation Test
Test User ID: test_user_flow_val_1736247845123

👤 Setting up user...
📝 Setting up CEFR profile...
🎯 Creating practice session...
Session ID: abc-123-def-456
💬 Initializing dialog...
Assistant: Hey! How's your day going so far?...

📊 Test Summary
✅ Passed: 12
❌ Failed: 1
📈 Total: 13
📊 Pass Rate: 92%
```

## Known Issues

### Review Mode Latency
The current implementation shows a latency of ~2259ms for review mode initialization, which exceeds the expected < 150ms threshold. This indicates that the local offline engine may not be fully optimized or is still making external API calls.

**Expected:** < 150ms  
**Actual:** ~2259ms  
**Status:** ❌ Failing assertion

## Test Architecture

```
tests/
├── validation.test.ts      # Main test suite
├── setup.ts                # Test environment setup
├── report-generator.ts     # HTML report generator
└── README.md               # This file
```

## Debugging

### Enable verbose logging
```bash
DEBUG=* npm run test:validation
```

### Check Supabase connection
```bash
node -e "require('./tests/setup.ts')"
```

### Verify API endpoints
```bash
curl http://localhost:3000/api/sessions
```

## Contributing

When adding new test cases:

1. Follow the existing assertion pattern
2. Add appropriate logging with emojis for visual clarity
3. Update the HTML report generator if needed
4. Document expected vs actual behavior
5. Add test case to this README

## CI/CD Integration

To integrate with GitHub Actions:

```yaml
name: Validation Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:validation
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## License

MIT
