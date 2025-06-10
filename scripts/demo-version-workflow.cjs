#!/usr/bin/env node

/**
 * Демонстрационный скрипт для тестирования процесса управления версиями
 * Симулирует работу GitHub Actions workflow в локальной среде
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Цвета для красивого вывода в консоль
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return packageJson.version;
  } catch (error) {
    log(`❌ Ошибка чтения package.json: ${error.message}`, colors.red);
    return null;
  }
}

function generateSemanticVersion(releaseType = 'stable') {
  // Простая симуляция semantic-version action
  const currentVersion = getCurrentVersion();
  if (!currentVersion) return null;
  
  const [major, minor, patch] = currentVersion.split(/[.-]/).map(Number);
  
  // Увеличиваем patch версию
  const newPatch = patch + 1;
  
  // Формируем новую версию
  let newVersion = `${major}.${minor}.${newPatch}`;
  
  if (releaseType === 'beta') {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    newVersion += `-beta.${timestamp}`;
  }
  
  return newVersion;
}

function main() {
  const args = process.argv.slice(2);
  const releaseType = args[0] || 'stable'; // stable или beta
  
  log('🎯 === Демонстрация процесса управления версиями ===', colors.bright);
  log('');
  
  // Шаг 1: Показываем текущую версию
  const currentVersion = getCurrentVersion();
  if (!currentVersion) {
    process.exit(1);
  }
  
  log(`📋 Текущая версия: ${currentVersion}`, colors.cyan);
  log(`🎯 Тип релиза: ${releaseType}`, colors.cyan);
  log('');
  
  // Шаг 2: Симулируем генерацию semantic version
  log('⚙️  Генерируем новую версию...', colors.yellow);
  const newVersion = generateSemanticVersion(releaseType);
  
  if (!newVersion) {
    log('❌ Не удалось сгенерировать новую версию', colors.red);
    process.exit(1);
  }
  
  log(`✨ Новая версия: ${newVersion}`, colors.green);
  log('');
  
  // Шаг 3: Обновляем package.json
  log('📝 Обновляем package.json...', colors.yellow);
  try {
    execSync(`node scripts/update-package-version.cjs ${newVersion}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    log(`❌ Ошибка обновления package.json: ${error.message}`, colors.red);
    process.exit(1);
  }
  
  log('');
  
  // Шаг 4: Показываем результат
  const updatedVersion = getCurrentVersion();
  log(`🎉 Версия обновлена в package.json: ${updatedVersion}`, colors.green);
  
  // Шаг 5: Симулируем git коммит (только показываем команды)
  log('');
  log('📂 Git команды для коммита изменений:', colors.magenta);
  log(`   git add package.json`, colors.cyan);
  log(`   git commit -m "chore: update version to ${newVersion} [skip ci]"`, colors.cyan);
  log(`   git push`, colors.cyan);
  log('');
  
  // Шаг 6: Информация о следующих шагах
  log('🚀 Следующие шаги в CI/CD:', colors.magenta);
  log('   1. Build приложения для всех платформ', colors.cyan);
  log('   2. Создание релиза в GitHub', colors.cyan);
  log('   3. Публикация артефактов', colors.cyan);
  log('   4. Отправка уведомлений в Telegram', colors.cyan);
  log('');
  
  log('✅ Демонстрация завершена успешно!', colors.green);
}

// Проверяем, что скрипт запущен из корня проекта
if (!fs.existsSync('package.json')) {
  log('❌ Этот скрипт должен запускаться из корня проекта (где находится package.json)', colors.red);
  process.exit(1);
}

if (require.main === module) {
  main();
}
