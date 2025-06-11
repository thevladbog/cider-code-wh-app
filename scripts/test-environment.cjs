#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки правильности настройки переменных окружения
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing environment configuration...');

// Test 1: Stable release environment
console.log('\n📋 Test 1: Stable release environment');
process.env.GITHUB_REF = 'refs/heads/release-stable';
process.env.NODE_ENV = 'production';

console.log('Setting environment variables:');
console.log(`  GITHUB_REF: ${process.env.GITHUB_REF}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);

// Run check-env script
console.log('\nRunning check-env script...');
try {
  const result = execSync('node scripts/check-env.cjs', { 
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env }
  });
  console.log('✅ check-env output:', result);
} catch (error) {
  console.error('❌ check-env error:', error.stdout || error.message);
}

// Test 2: Beta release environment  
console.log('\n📋 Test 2: Beta release environment');
process.env.GITHUB_REF = 'refs/heads/release-beta';
process.env.NODE_ENV = 'development';

console.log('Setting environment variables:');
console.log(`  GITHUB_REF: ${process.env.GITHUB_REF}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);

console.log('\nRunning check-env script...');
try {
  const result = execSync('node scripts/check-env.cjs', { 
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env }
  });
  console.log('✅ check-env output:', result);
} catch (error) {
  console.error('❌ check-env error:', error.stdout || error.message);
}

// Test 3: Check Vite configuration 
console.log('\n📋 Test 3: Checking Vite configuration for NODE_ENV passing...');

const viteMainConfig = fs.readFileSync('vite.main.config.ts', 'utf8');
const vitePreloadConfig = fs.readFileSync('vite.preload.config.ts', 'utf8');

if (viteMainConfig.includes("'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV")) {
  console.log('✅ vite.main.config.ts correctly passes NODE_ENV');
} else {
  console.log('❌ vite.main.config.ts does NOT pass NODE_ENV');
}

if (vitePreloadConfig.includes("'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV")) {
  console.log('✅ vite.preload.config.ts correctly passes NODE_ENV');
} else {
  console.log('❌ vite.preload.config.ts does NOT pass NODE_ENV');
}

// Test 4: Check environment.ts logic
console.log('\n📋 Test 4: Checking environment.ts API URL logic...');

const envFile = fs.readFileSync('src/config/environment.ts', 'utf8');

if (envFile.includes("nodeEnv === 'production'") && 
    envFile.includes("'https://api.bottlecode.app'") &&
    envFile.includes("'https://beta.api.bottlecode.app'")) {
  console.log('✅ environment.ts has correct API URL logic');
} else {
  console.log('❌ environment.ts API URL logic may be incorrect');
}

console.log('\n🎉 Environment configuration test completed!');
console.log('\n💡 Key points:');
console.log('   • GitHub workflow sets NODE_ENV=production for stable releases');
console.log('   • GitHub workflow sets NODE_ENV=development for beta releases');
console.log('   • Vite configs now pass NODE_ENV to runtime');
console.log('   • environment.ts uses NODE_ENV to determine API URL');
console.log('   • Production builds should connect to https://api.bottlecode.app');
console.log('   • Beta builds should connect to https://beta.api.bottlecode.app');
