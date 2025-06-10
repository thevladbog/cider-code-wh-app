// Скрипт для проверки переменных окружения перед сборкой
const fs = require('fs');
const path = require('path');

// Получаем текущую ветку и тип релиза
function getReleaseBranch() {
  try {
    const branch = process.env.GITHUB_REF || '';
    if (branch.includes('release-stable')) {
      return 'stable';
    } else if (branch.includes('release-beta')) {
      return 'beta';
    } else {
      return 'development';
    }
  } catch (error) {
    console.warn('⚠️ Не удалось определить ветку релиза:', error);
    return 'development';
  }
}

// Проверяем и устанавливаем переменные окружения
function checkAndSetEnvironment() {
  const releaseType = getReleaseBranch();
  console.log(`🔍 Определен тип релиза: ${releaseType}`);

  // Проверяем, установлено ли NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  console.log(`📊 Текущее значение NODE_ENV: ${nodeEnv || 'не установлено'}`);

  // Устанавливаем NODE_ENV в зависимости от типа релиза
  if (releaseType === 'stable' && nodeEnv !== 'production') {
    console.log('⚠️ NODE_ENV не установлено в production для стабильного релиза!');
    console.log('🔧 Устанавливаем NODE_ENV=production...');
    process.env.NODE_ENV = 'production';  } else if (releaseType !== 'stable' && nodeEnv === 'production') {
    console.log('⚠️ NODE_ENV=production для нестабильного релиза!');
    console.log('🔧 Устанавливаем NODE_ENV=development...');
    process.env.NODE_ENV = 'development';
  } else if (!nodeEnv || nodeEnv === 'local') {
    // Если NODE_ENV не установлено или равно "local", устанавливаем в зависимости от типа релиза
    const targetEnv = releaseType === 'stable' ? 'production' : 'development';
    console.log(`🔧 Устанавливаем NODE_ENV=${targetEnv}...`);
    process.env.NODE_ENV = targetEnv;
  }

  // Выводим итоговое значение
  console.log(`✅ NODE_ENV установлено в: ${process.env.NODE_ENV}`);
  console.log(`✅ API URL будет: ${process.env.NODE_ENV === 'production' ? 'https://api.bottlecode.app' : 'https://beta.api.bottlecode.app'}`);

  return process.env.NODE_ENV;
}

// Запускаем проверку, если скрипт запущен напрямую
if (require.main === module) {
  checkAndSetEnvironment();
}

module.exports = { checkAndSetEnvironment, getReleaseBranch };
