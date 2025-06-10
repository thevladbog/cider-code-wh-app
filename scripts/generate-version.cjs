#!/usr/bin/env node

/**
 * Продвинутый скрипт для генерации версий с правильным форматом бета-версий
 * Учитывает существующие git теги для правильного инкремента
 */

const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Получаем список существующих тегов для определенной базовой версии
 * @param {string} baseVersion - Базовая версия (например, "1.0.3")
 * @param {string} type - Тип версии ("beta" или "stable")
 * @returns {number[]} - Массив номеров существующих версий
 */
function getExistingVersionNumbers(baseVersion, type) {
  try {
    let pattern;
    if (type === 'beta') {
      pattern = `v${baseVersion}-beta.*`;
    } else {
      pattern = `v${baseVersion}`;
    }
    
    const existingTags = execSync(`git tag -l "${pattern}"`).toString().trim();
    
    if (!existingTags) {
      return [];
    }
    
    const tags = existingTags.split('\n').filter(tag => tag.trim());
    
    if (type === 'beta') {
      return tags.map(tag => {
        const match = tag.match(/v\d+\.\d+\.\d+-beta\.(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }).filter(num => num > 0);
    } else {
      // Для стабильных версий просто проверяем существование
      return tags.length > 0 ? [1] : [];
    }
  } catch (error) {
    console.log(`⚠️ Не удалось получить git теги: ${error.message}`);
    console.log('🔄 Будет использована версия по умолчанию');
    return [];
  }
}

/**
 * Получаем следующий номер бета-версии
 * @param {string} baseVersion - Базовая версия
 * @returns {number} - Следующий номер бета-версии
 */
function getNextBetaNumber(baseVersion) {
  const existingNumbers = getExistingVersionNumbers(baseVersion, 'beta');
  
  if (existingNumbers.length === 0) {
    return 1; // Первая бета версия
  }
  
  return Math.max(...existingNumbers) + 1;
}

/**
 * Генерирует правильную бета-версию
 * @param {string} major - Major версия
 * @param {string} minor - Minor версия  
 * @param {string} patch - Patch версия
 * @returns {string} - Полная бета-версия
 */
function generateBetaVersion(major, minor, patch) {
  const baseVersion = `${major}.${minor}.${patch}`;
  const betaNumber = getNextBetaNumber(baseVersion);
  
  return `${baseVersion}-beta.${betaNumber}`;
}

/**
 * Проверяет, существует ли уже стабильная версия
 * @param {string} version - Версия для проверки
 * @returns {boolean} - true если версия уже существует
 */
function stableVersionExists(version) {
  const existing = getExistingVersionNumbers(version, 'stable');
  return existing.length > 0;
}

/**
 * Основная функция для генерации версии
 * @param {string} releaseType - Тип релиза ('stable' или 'beta')
 * @param {string} bumpType - Тип обновления ('major', 'minor', 'patch')
 * @returns {string|null} - Новая версия или null в случае ошибки
 */
function generateNextVersion(releaseType = 'stable', bumpType = 'patch') {
  try {
    // Читаем текущую версию из package.json
    const packageJsonPath = './package.json';
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json не найден в текущей директории');
      return null;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    
    console.log(`📋 Текущая версия: ${currentVersion}`);
    
    // Парсим текущую версию
    const [major, minor, patch] = currentVersion.split(/[.-]/).map(Number);
    
    // Вычисляем новую базовую версию
    let newMajor = major;
    let newMinor = minor; 
    let newPatch = patch;
    
    if (bumpType === 'major') {
      newMajor++;
      newMinor = 0;
      newPatch = 0;
    } else if (bumpType === 'minor') {
      newMinor++;
      newPatch = 0;
    } else {
      newPatch++;
    }
    
    // Генерируем версию в зависимости от типа релиза
    let newVersion;
    if (releaseType === 'beta') {
      newVersion = generateBetaVersion(newMajor, newMinor, newPatch);
    } else {
      newVersion = `${newMajor}.${newMinor}.${newPatch}`;
      
      // Проверяем, не существует ли уже такая стабильная версия
      if (stableVersionExists(newVersion)) {
        console.log(`⚠️ Версия ${newVersion} уже существует, увеличиваем patch`);
        newPatch++;
        newVersion = `${newMajor}.${newMinor}.${newPatch}`;
      }
    }
    
    console.log(`✨ Новая версия: ${newVersion}`);
    return newVersion;
    
  } catch (error) {
    console.error(`❌ Ошибка генерации версии: ${error.message}`);
    return null;
  }
}

// Экспортируем функции для использования в других скриптах
module.exports = {
  generateNextVersion,
  generateBetaVersion,
  getNextBetaNumber,
  getExistingVersionNumbers,
  stableVersionExists
};

// Если скрипт запущен напрямую
if (require.main === module) {
  const args = process.argv.slice(2);
  const releaseType = args[0] || 'stable';
  const bumpType = args[1] || 'patch';
  
  console.log('🔧 === Генератор версий с правильным форматом бета-версий ===');
  console.log(`🎯 Тип релиза: ${releaseType}`);
  console.log(`📈 Тип обновления: ${bumpType}`);
  console.log('');
  
  const newVersion = generateNextVersion(releaseType, bumpType);
  
  if (newVersion) {
    console.log('');
    console.log('📋 Для применения версии выполните:');
    console.log(`   npm run version:update ${newVersion}`);
    console.log('');
    console.log('📂 Или создайте git тег:');
    console.log(`   git tag v${newVersion}`);
    console.log(`   git push origin v${newVersion}`);
  } else {
    process.exit(1);
  }
}
