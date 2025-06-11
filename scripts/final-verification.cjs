#!/usr/bin/env node

/**
 * Финальная проверка всех исправлений GitHub Release Pipeline
 * Проверяет все компоненты перед тестированием релиза
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL VERIFICATION: GitHub Release Pipeline Fixes');
console.log('==================================================\n');

let allChecksPass = true;
const issues = [];

// Check 1: Release workflow configuration
console.log('📋 Check 1: Release Workflow Configuration');
try {
  const releaseYml = fs.readFileSync('.github/workflows/release.yml', 'utf8');
    // Check for duplicate APP_VERSION
  const appVersionMatches = releaseYml.match(/APP_VERSION: \$\{\{ needs\.version\.outputs\.new_version \}\}/g);
  // We expect exactly 4 instances: macOS check, production build, beta build, latest.yml generation
  if (appVersionMatches && appVersionMatches.length === 4) {
    console.log('✅ Correct number of APP_VERSION references in release.yml (4 expected)');
  } else {
    issues.push(`❌ Unexpected number of APP_VERSION references: ${appVersionMatches ? appVersionMatches.length : 0} (expected 4)`);
    allChecksPass = false;
  }
  
  // Check for duplicate latest.yml reference
  const latestYmlMatches = releaseYml.match(/windows-release-.*\/updates\/latest\.yml/g);
  if (latestYmlMatches && latestYmlMatches.length > 1) {
    issues.push('❌ Duplicate latest.yml reference found in release.yml');
    allChecksPass = false;
  } else {
    console.log('✅ No duplicate latest.yml reference in release.yml');
  }
  
  // Check NODE_ENV settings
  if (releaseYml.includes('NODE_ENV: production') && releaseYml.includes('NODE_ENV: development')) {
    console.log('✅ Correct NODE_ENV settings for stable/beta builds');
  } else {
    issues.push('❌ NODE_ENV settings missing or incorrect');
    allChecksPass = false;
  }
  
} catch (error) {
  issues.push('❌ Could not read release.yml workflow file');
  allChecksPass = false;
}

// Check 2: Vite configurations
console.log('\n📋 Check 2: Vite Configuration for NODE_ENV');
try {
  const viteMainConfig = fs.readFileSync('vite.main.config.ts', 'utf8');
  const vitePreloadConfig = fs.readFileSync('vite.preload.config.ts', 'utf8');
  
  if (viteMainConfig.includes("'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV")) {
    console.log('✅ vite.main.config.ts passes NODE_ENV to runtime');
  } else {
    issues.push('❌ vite.main.config.ts does not pass NODE_ENV');
    allChecksPass = false;
  }
  
  if (vitePreloadConfig.includes("'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV")) {
    console.log('✅ vite.preload.config.ts passes NODE_ENV to runtime');
  } else {
    issues.push('❌ vite.preload.config.ts does not pass NODE_ENV');
    allChecksPass = false;
  }
  
} catch (error) {
  issues.push('❌ Could not read Vite configuration files');
  allChecksPass = false;
}

// Check 3: Environment configuration
console.log('\n📋 Check 3: Environment Configuration Logic');
try {
  const envConfig = fs.readFileSync('src/config/environment.ts', 'utf8');
  
  if (envConfig.includes("nodeEnv === 'production'") && 
      envConfig.includes("'https://api.bottlecode.app'") &&
      envConfig.includes("'https://beta.api.bottlecode.app'")) {
    console.log('✅ Environment config has correct API URL logic');
  } else {
    issues.push('❌ Environment config API URL logic is incorrect');
    allChecksPass = false;
  }
  
} catch (error) {
  issues.push('❌ Could not read environment configuration');
  allChecksPass = false;
}

// Check 4: Scripts with version handling
console.log('\n📋 Check 4: Scripts Version Handling');
try {
  const secureCertsScript = fs.readFileSync('scripts/secure-certificates.cjs', 'utf8');
  
  if (secureCertsScript.includes('process.env.VERSION || process.env.APP_VERSION')) {
    console.log('✅ secure-certificates.cjs supports APP_VERSION fallback');
  } else {
    issues.push('❌ secure-certificates.cjs missing APP_VERSION support');
    allChecksPass = false;
  }
  
} catch (error) {
  issues.push('❌ Could not read secure-certificates.cjs');
  allChecksPass = false;
}

// Check 5: Documentation
console.log('\n📋 Check 5: Documentation Updates');
try {
  const docs = fs.readFileSync('docs/github-release-fix-completion.md', 'utf8');
  
  if (docs.includes('NODE_ENV Runtime Configuration') && 
      docs.includes('ALL ISSUES RESOLVED')) {
    console.log('✅ Documentation is complete and updated');
  } else {
    issues.push('❌ Documentation is incomplete');
    allChecksPass = false;
  }
  
} catch (error) {
  issues.push('❌ Could not read completion documentation');
  allChecksPass = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allChecksPass) {
  console.log('🎉 ALL CHECKS PASSED! ✅');
  console.log('\n🚀 Ready for testing:');
  console.log('   1. Push changes to release-stable branch');
  console.log('   2. Monitor GitHub Actions execution');
  console.log('   3. Verify stable release connects to production API');
  console.log('   4. Check artifact versions are consistent');
  console.log('   5. Confirm no duplicate files in release');
} else {
  console.log('⚠️  SOME CHECKS FAILED! ❌');
  console.log('\n🔧 Issues to fix:');
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log('\n📊 Summary of Applied Fixes:');
console.log('   ✅ Fixed duplicate APP_VERSION in release.yml');
console.log('   ✅ Removed duplicate latest.yml file reference');
console.log('   ✅ Added APP_VERSION support in secure-certificates.cjs');
console.log('   ✅ Fixed NODE_ENV runtime configuration in Vite');
console.log('   ✅ Created comprehensive documentation');

console.log('\n🎯 Expected Results:');
console.log('   • Stable releases → https://api.bottlecode.app');
console.log('   • Beta releases → https://beta.api.bottlecode.app');
console.log('   • Consistent version numbers across all artifacts');
console.log('   • Clean release artifacts without duplicates');

process.exit(allChecksPass ? 0 : 1);
