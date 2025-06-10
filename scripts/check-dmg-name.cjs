#!/usr/bin/env node

/**
 * Проверка корректности конфигурации Forge для macOS DMG
 */

const fs = require('fs');
const path = require('path');

// Загружаем package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Проверяем длину имени DMG
const dmgName = `bottle-c-wh-${packageData.version}`;
const maxLength = 27;

console.log('🔍 Проверка конфигурации macOS DMG');
console.log('=====================================');
console.log(`📦 Версия приложения: ${packageData.version}`);
console.log(`📁 Имя DMG: "${dmgName}"`);
console.log(`📏 Длина имени: ${dmgName.length} символов`);
console.log(`🎯 Максимальная длина: ${maxLength} символов`);

if (dmgName.length <= maxLength) {
  console.log('✅ Имя DMG соответствует требованиям macOS');
  console.log(`🚀 Запас: ${maxLength - dmgName.length} символов`);
  process.exit(0);
} else {
  console.log('❌ Имя DMG превышает лимит macOS');
  console.log(`🚨 Превышение: ${dmgName.length - maxLength} символов`);
  console.log('💡 Необходимо сократить имя в forge.config.ts');
  process.exit(1);
}
