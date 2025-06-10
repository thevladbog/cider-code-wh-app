#!/usr/bin/env node

/**
 * Скрипт для создания GitHub релиза с автоматической публикацией
 * Использование: node scripts/create-github-release.cjs [version]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function error(message) {
  log('❌', message, colors.red);
  process.exit(1);
}

function success(message) {
  log('✅', message, colors.green);
}

function info(message) {
  log('ℹ️', message, colors.blue);
}

function warning(message) {
  log('⚠️', message, colors.yellow);
}

/**
 * Проверяет, что мы находимся в git репозитории
 */
function checkGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Получает текущую версию из package.json
 */
function getCurrentVersion() {
  const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  return packageData.version;
}

/**
 * Обновляет версию в package.json
 */
function updateVersion(newVersion) {
  const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  packageData.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageData, null, 2));
  success(`Версия обновлена до ${newVersion}`);
}

/**
 * Проверяет, что рабочая директория чистая
 */
function checkWorkingDirectory() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim() === '';
  } catch {
    return false;
  }
}

/**
 * Создает git тег и пушит его
 */
function createAndPushTag(version) {
  const tagName = `v${version}`;
  
  try {
    // Создаем коммит с новой версией
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    
    // Создаем тег
    execSync(`git tag -a ${tagName} -m "Release ${version}"`, { stdio: 'inherit' });
    
    // Пушим изменения и тег
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git push origin ${tagName}`, { stdio: 'inherit' });
    
    success(`Тег ${tagName} создан и запушен`);
    return tagName;
  } catch (error) {
    error(`Ошибка при создании тега: ${error.message}`);
  }
}

/**
 * Собирает приложение
 */
function buildApplication() {
  info('Сборка приложения...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    success('Сборка завершена успешно');
  } catch (error) {
    error(`Ошибка сборки: ${error.message}`);
  }
}

/**
 * Проверяет наличие собранных файлов
 */
function checkBuildArtifacts() {
  const artifactsPath = path.join(__dirname, '..', 'out', 'make', 'squirrel.windows', 'x64');
  
  if (!fs.existsSync(artifactsPath)) {
    error('Директория с артефактами не найдена. Запустите сборку.');
  }
  
  const files = fs.readdirSync(artifactsPath);
  const setupFile = files.find(file => file.endsWith('-setup.exe'));
  
  if (!setupFile) {
    error('Установочный файл не найден в артефактах сборки.');
  }
  
  success(`Найден установочный файл: ${setupFile}`);
  return artifactsPath;
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  const newVersion = args[0];
  
  log('🚀', 'Создание GitHub релиза...', colors.cyan);
  
  // Проверки
  if (!checkGitRepository()) {
    error('Не найден git репозиторий');
  }
  
  if (!checkWorkingDirectory()) {
    error('Рабочая директория не чистая. Закоммитьте изменения перед созданием релиза.');
  }
  
  // Определяем версию
  const currentVersion = getCurrentVersion();
  const targetVersion = newVersion || currentVersion;
  
  info(`Текущая версия: ${currentVersion}`);
  info(`Целевая версия: ${targetVersion}`);
  
  // Обновляем версию если нужно
  if (newVersion && newVersion !== currentVersion) {
    updateVersion(newVersion);
  }
  
  // Собираем приложение
  buildApplication();
  
  // Проверяем артефакты
  const artifactsPath = checkBuildArtifacts();
  
  // Создаем тег (это запустит GitHub Actions)
  const tagName = createAndPushTag(targetVersion);
  
  success('🎉 Релиз создан успешно!');
  info(`GitHub Actions автоматически создаст релиз для тега ${tagName}`);
  info('Проверьте: https://github.com/thevladbog/cider-code-wh-app/actions');
  info('Релизы: https://github.com/thevladbog/cider-code-wh-app/releases');
}

// Запуск
if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  updateVersion,
  createAndPushTag,
  buildApplication,
  checkBuildArtifacts
};
