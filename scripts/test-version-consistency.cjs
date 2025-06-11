#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки согласованности версий
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Тестирование согласованности версий');
console.log('=====================================\n');

// Test 1: Проверяем что forge.config.ts использует APP_VERSION
console.log('📋 Test 1: Checking forge.config.ts version consistency');

const forgeConfig = fs.readFileSync('forge.config.ts', 'utf8');

if (forgeConfig.includes('getAppVersion()') && forgeConfig.includes('appVersion')) {
  console.log('✅ forge.config.ts uses dynamic appVersion');
} else {
  console.log('❌ forge.config.ts does NOT use dynamic appVersion');
}

if (forgeConfig.includes('prerelease: appVersion.includes(\'beta\')')) {
  console.log('✅ forge.config.ts prerelease uses appVersion');
} else {
  console.log('❌ forge.config.ts prerelease does NOT use appVersion');
}

// Test 2: Проверяем что Vite configs передают APP_VERSION
console.log('\n📋 Test 2: Checking Vite configs pass APP_VERSION');

const viteMainConfig = fs.readFileSync('vite.main.config.ts', 'utf8');
const vitePreloadConfig = fs.readFileSync('vite.preload.config.ts', 'utf8');
const viteRendererConfig = fs.readFileSync('vite.renderer.config.ts', 'utf8');

if (viteMainConfig.includes("'process.env.APP_VERSION'")) {
  console.log('✅ vite.main.config.ts passes APP_VERSION');
} else {
  console.log('❌ vite.main.config.ts does NOT pass APP_VERSION');
}

if (vitePreloadConfig.includes("'process.env.APP_VERSION'")) {
  console.log('✅ vite.preload.config.ts passes APP_VERSION');
} else {
  console.log('❌ vite.preload.config.ts does NOT pass APP_VERSION');
}

if (viteRendererConfig.includes("'process.env.APP_VERSION'")) {
  console.log('✅ vite.renderer.config.ts passes APP_VERSION');
} else {
  console.log('❌ vite.renderer.config.ts does NOT pass APP_VERSION');
}

// Test 3: Проверяем environment.ts использует APP_VERSION приоритетно
console.log('\n📋 Test 3: Checking environment.ts uses APP_VERSION priority');

const environmentFile = fs.readFileSync('src/utils/environment.ts', 'utf8');

if (environmentFile.includes('process.env.APP_VERSION')) {
  console.log('✅ environment.ts checks APP_VERSION');
} else {
  console.log('❌ environment.ts does NOT check APP_VERSION');
}

// Test 4: Проверяем package.json version (текущее значение)
console.log('\n📋 Test 4: Current package.json version');

const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Current package.json version: ${packageData.version}`);

// Test 5: Симуляция с переменной окружения
console.log('\n📋 Test 5: Simulation with APP_VERSION environment variable');

const testVersion = '1.0.55';
process.env.APP_VERSION = testVersion;

try {
  // Проверяем DMG name script
  console.log('Testing check-dmg-name.cjs with APP_VERSION...');
  const result = execSync('node scripts/check-dmg-name.cjs', { 
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, APP_VERSION: testVersion }
  });
  
  if (result.includes(testVersion)) {
    console.log(`✅ check-dmg-name.cjs uses APP_VERSION: ${testVersion}`);
  } else {
    console.log(`❌ check-dmg-name.cjs does NOT use APP_VERSION: ${testVersion}`);
  }
} catch (error) {
  console.log('❌ Error testing check-dmg-name.cjs:', error.message);
}

console.log('\n🎯 Expected Results:');
console.log('   • All makers should use same version from APP_VERSION');
console.log('   • Application should show version from APP_VERSION when set');
console.log('   • No more version inconsistencies between artifacts');
console.log('   • Linux RPM/DEB should have same version as Windows setup.exe');

console.log('\n📋 For GitHub Actions, ensure APP_VERSION is set in all build steps:');
console.log('   env:');
console.log('     APP_VERSION: ${{ needs.version.outputs.new_version }}');
