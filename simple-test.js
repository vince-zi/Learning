// Simple test to verify environment
console.log('✅ Node.js is working');
console.log('📁 Current directory:', __dirname);
console.log('📝 Checking files...');

const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'tests', 'validation.test.ts');
if (fs.existsSync(testFile)) {
  console.log('✅ Test file exists:', testFile);
} else {
  console.log('❌ Test file not found');
}

// Try to load vitest
try {
  const vitestPath = require.resolve('vitest');
  console.log('✅ Vitest found at:', vitestPath);
} catch (e) {
  console.log('❌ Vitest not found:', e.message);
}

// Try to check server
const http = require('http');
http.get('http://localhost:3000', (res) => {
  console.log('✅ Server is running, status:', res.statusCode);
}).on('error', (e) => {
  console.log('❌ Server not accessible:', e.message);
});
