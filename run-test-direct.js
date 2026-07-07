const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Validation Test...\n');

// Try to find vitest
const vitestPath = path.join(__dirname, 'node_modules', '.bin', 'vitest.cmd');

const child = spawn(vitestPath, ['--run', 'tests/validation.test.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`\nTest exited with code ${code}`);
  process.exit(code);
});
