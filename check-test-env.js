#!/usr/bin/env node

/**
 * Environment Check Script
 * Verifies that all prerequisites are met before running tests
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Checking test environment...\n');

let allChecksPassed = true;

// Check 1: .env.local file exists
console.log('1️⃣ Checking .env.local file...');
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env.local exists');
  
  // Parse env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
  
  // Check required variables
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let envCheckPassed = true;
  required.forEach(varName => {
    if (envVars[varName]) {
      console.log(`   ✅ ${varName} is set`);
    } else {
      console.log(`   ❌ ${varName} is missing`);
      envCheckPassed = false;
      allChecksPassed = false;
    }
  });
  
} else {
  console.log('   ❌ .env.local not found');
  console.log('   💡 Copy .env.local.example to .env.local and configure it');
  allChecksPassed = false;
}

// Check 2: Node modules installed
console.log('\n2️⃣ Checking node_modules...');
if (fs.existsSync(path.resolve(process.cwd(), 'node_modules'))) {
  console.log('   ✅ node_modules exists');
  
  // Check specific packages
  const packages = ['vitest', '@supabase/supabase-js', 'next'];
  packages.forEach(pkg => {
    const pkgPath = path.resolve(process.cwd(), 'node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
      console.log(`   ✅ ${pkg} installed`);
    } else {
      console.log(`   ❌ ${pkg} not installed`);
      allChecksPassed = false;
    }
  });
} else {
  console.log('   ❌ node_modules not found');
  console.log('   💡 Run: npm install');
  allChecksPassed = false;
}

// Check 3: Development server
console.log('\n3️⃣ Checking development server...');
const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        console.log('   ✅ Server is running on http://localhost:3000');
        resolve(true);
      } else {
        console.log(`   ⚠️ Server responded with status ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('   ❌ Server is not running');
      console.log('   💡 Run in another terminal: npm run dev');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      console.log('   ❌ Server connection timeout');
      resolve(false);
    });
  });
};

// Check 4: Test files
console.log('\n4️⃣ Checking test files...');
const testFiles = [
  'tests/validation.test.ts',
  'tests/setup.ts',
  'tests/report-generator.ts',
  'vitest.config.ts'
];

testFiles.forEach(file => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} not found`);
    allChecksPassed = false;
  }
});

// Run async checks
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    allChecksPassed = false;
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  if (allChecksPassed) {
    console.log('✅ All checks passed! Ready to run tests.');
    console.log('\n📝 Run tests with:');
    console.log('   npm run test:validation');
    console.log('   or');
    console.log('   node run-validation.js');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    console.log('\n📚 See VALIDATION-GUIDE.md for help');
    process.exit(1);
  }
})();
