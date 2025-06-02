/* eslint-disable @typescript-eslint/no-var-requires */
// Скрипт для автоматического обновления версии
const fs = require('fs');
const { execSync } = require('child_process');

// Получаем текущую ветку
const getCurrentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.error('Не удалось определить текущую ветку:', error);
    return 'unknown';
  }
};

// Получаем последний коммит
const getLastCommitMessage = () => {
  try {
    return execSync('git log -1 --pretty=%B').toString().trim();
  } catch (error) {
    console.error('Не удалось получить сообщение последнего коммита:', error);
    return '';
  }
};

// Определяем тип релиза по ветке
const getReleaseType = (branch) => {
  if (branch === 'release-stable') {
    return 'stable';
  } else if (branch === 'release-beta') {
    return 'beta';
  }
  return 'development';
};

// Определяем тип обновления версии на основе сообщения коммита
const getVersionBumpType = (message) => {
  if (message.includes('(MAJOR)')) {
    return 'major';
  } else if (message.includes('(MINOR)')) {
    return 'minor';
  }
  return 'patch';
};

// Обновляем версию в package.json
const updateVersion = () => {
  const branch = getCurrentBranch();
  const commitMsg = getLastCommitMessage();
  const releaseType = getReleaseType(branch);
  const bumpType = getVersionBumpType(commitMsg);
  
  // Читаем текущий package.json
  const packageJsonPath = './package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  // Парсим текущую версию
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Вычисляем новую версию
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
  
  // Формируем новую версию
  let newVersion = `${newMajor}.${newMinor}.${newPatch}`;
  
  // Добавляем суффикс для бета версий
  if (releaseType === 'beta') {
    // Получаем текущую дату в формате YYYYMMDD
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    newVersion += `-beta.${date}`;
  }
  
  // Обновляем package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log(`Версия обновлена до ${newVersion} (${releaseType})`);
  
  // Возвращаем новую версию и тип релиза
  return { version: newVersion, releaseType };
};

// Если скрипт запущен напрямую
if (require.main === module) {
  updateVersion();
}

// Экспортируем функции для использования в других скриптах
module.exports = {
  getCurrentBranch,
  getLastCommitMessage,
  getReleaseType,
  getVersionBumpType,
  updateVersion
};