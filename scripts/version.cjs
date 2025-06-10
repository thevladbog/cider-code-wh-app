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
    // Используем номер инкремента для бета версий, начиная с 1
    // Проверяем существующие теги для определения следующего номера
    try {
      const existingTags = execSync(`git tag -l "v${newMajor}.${newMinor}.${newPatch}-beta.*"`).toString().trim();
      let betaNumber = 1;
      
      if (existingTags) {
        const tags = existingTags.split('\n').filter(tag => tag.trim());
        const betaNumbers = tags.map(tag => {
          const match = tag.match(/v\d+\.\d+\.\d+-beta\.(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
        betaNumber = Math.max(...betaNumbers) + 1;
      }
      
      newVersion += `-beta.${betaNumber}`;
    } catch (error) {
      // Если не удалось получить теги (например, в новом репозитории), начинаем с 1
      newVersion += `-beta.1`;
    }
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