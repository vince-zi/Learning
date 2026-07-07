#!/usr/bin/env node

/**
 * Validation Test Runner
 * Runs the complete validation test and generates HTML report
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Learniny System Validation Test...\n');

// Run the vitest command
const vitest = spawn('npx', ['vitest', '--run', 'tests/validation.test.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  console.log(`\n✅ Test completed with exit code ${code}`);
  
  if (code === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above for details.');
  }
  
  process.exit(code);
});

vitest.on('error', (error) => {
  console.error('\n❌ Failed to run tests:', error);
  process.exit(1);
});
