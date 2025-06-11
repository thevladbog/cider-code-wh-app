#!/usr/bin/env node

/**
 * Проверка корректности конфигурации Forge для macOS DMG
 */

const fs = require('fs');
const path = require('path');

// Функция для динамического получения версии (такая же как в forge.config.ts)
function getAppVersion() {
  // Сначала пробуем взять версию из переменной окружения (приоритет для CI/CD)
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  
  // Иначе читаем из package.json
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.warn('Warning: Could not read package.json, using default version');
    return '1.0.0';
  }
}

// Получаем версию приложения
const appVersion = getAppVersion();

// Проверяем длину имени DMG
const dmgName = `bottle-c-wh-${appVersion}`;
const maxLength = 27;

console.log('🔍 Проверка конфигурации macOS DMG');
console.log('=====================================');
console.log(`📦 Версия приложения: ${appVersion}`);
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
