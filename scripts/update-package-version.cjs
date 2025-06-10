#!/usr/bin/env node

/**
 * Скрипт для обновления версии в package.json на основе переданной версии
 * Используется в GitHub Actions для синхронизации версий
 */

const fs = require('fs');
const path = require('path');

/**
 * Обновляет версию в package.json
 * @param {string} newVersion - Новая версия для установки
 * @returns {boolean} - true если успешно, false если ошибка
 */
function updatePackageVersion(newVersion) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    // Проверяем существование файла
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json не найден в корне проекта');
      return false;
    }
    
    // Читаем текущий package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;
    
    // Обновляем версию
    packageJson.version = newVersion;
    
    // Записываем обновленный package.json с красивым форматированием
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Версия в package.json обновлена: ${oldVersion} → ${newVersion}`);
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении версии в package.json:', error.message);
    return false;
  }
}

/**
 * Валидация версии (базовая проверка semver)
 * @param {string} version - Версия для проверки
 * @returns {boolean} - true если версия валидна
 */
function isValidVersion(version) {
  // Простая проверка формата semver (включая бета версии)
  const semverRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
  return semverRegex.test(version);
}

// Основная логика скрипта
function main() {
  const args = process.argv.slice(2);
  
  // Проверяем аргументы
  if (args.length === 0) {
    console.error('❌ Не указана новая версия');
    console.log('Использование: node update-package-version.cjs <новая_версия>');
    console.log('Пример: node update-package-version.cjs 1.2.3');
    console.log('Пример: node update-package-version.cjs 1.2.3-beta.1');
    process.exit(1);
  }
  
  const newVersion = args[0];
  
  // Проверяем формат версии
  if (!isValidVersion(newVersion)) {
    console.error('❌ Неверный формат версии:', newVersion);
    console.log('Версия должна соответствовать формату semver (например: 1.2.3 или 1.2.3-beta.1)');
    process.exit(1);
  }
  
  console.log(`🔄 Обновление версии в package.json до ${newVersion}...`);
  
  // Обновляем версию
  const success = updatePackageVersion(newVersion);
  
  if (!success) {
    process.exit(1);
  }
  
  console.log('🎉 Версия успешно обновлена!');
}

// Запускаем скрипт только если он вызван напрямую
if (require.main === module) {
  main();
}

// Экспортируем функции для использования в других скриптах
module.exports = {
  updatePackageVersion,
  isValidVersion
};
