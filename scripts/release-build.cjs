#!/usr/bin/env node

/**
 * Автоматизированный скрипт сборки и публикации релиза
 * 
 * Этот скрипт выполняет полный цикл:
 * 1. Сборка приложения
 * 2. Копирование артефактов в папку updates
 * 3. Обновление метаданных latest.json
 * 4. Создание GitHub Release template
 * 
 * Использование:
 * node scripts/release-build.cjs [version]
 * 
 * Примеры:
 * node scripts/release-build.cjs           # Использует версию из package.json
 * node scripts/release-build.cjs 1.0.3     # Использует указанную версию
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const UPDATES_DIR = path.join(PROJECT_ROOT, 'updates');
const OUT_DIR = path.join(PROJECT_ROOT, 'out', 'make');

/**
 * Выводит сообщение с emoji
 */
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

/**
 * Выполняет команду и выводит результат
 */
function execCommand(command, description) {
  log('⚡', `${description}...`);
  try {
    const result = execSync(command, { 
      cwd: PROJECT_ROOT, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    log('✅', `${description} завершено`);
    return result;
  } catch (error) {
    log('❌', `Ошибка при выполнении: ${description}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Читает версию из package.json
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
  log('📝', `Версия обновлена до ${newVersion}`);
}

/**
 * Находит артефакты сборки
 */
function findBuildArtifacts(version) {
  const artifacts = {};
  
  // Windows Squirrel
  const windowsDir = path.join(OUT_DIR, 'squirrel.windows', 'x64');
  const windowsSetup = path.join(windowsDir, `bottle-code-wh-app-${version}-setup.exe`);
  const windowsNupkg = path.join(windowsDir, `bottle_code_wh_app-${version}-full.nupkg`);
  
  if (fs.existsSync(windowsSetup)) {
    artifacts.windows = {
      setup: windowsSetup,
      nupkg: windowsNupkg,
      releases: path.join(windowsDir, 'RELEASES')
    };
  }

  // ZIP файлы (если есть)
  const zipDir = path.join(OUT_DIR, 'zip');
  if (fs.existsSync(zipDir)) {
    const zipFiles = fs.readdirSync(zipDir).filter(f => f.endsWith('.zip'));
    if (zipFiles.length > 0) {
      artifacts.zip = zipFiles.map(f => path.join(zipDir, f));
    }
  }

  return artifacts;
}

/**
 * Копирует артефакты в папку updates
 */
function copyArtifactsToUpdates(artifacts, version) {
  // Создаем папку updates если её нет
  if (!fs.existsSync(UPDATES_DIR)) {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
  }

  const copiedFiles = [];

  // Копируем Windows setup
  if (artifacts.windows && artifacts.windows.setup) {
    const destPath = path.join(UPDATES_DIR, `bottle-code-wh-app-${version}-setup.exe`);
    fs.copyFileSync(artifacts.windows.setup, destPath);
    copiedFiles.push(destPath);
    log('📁', `Скопирован: ${path.basename(destPath)}`);
  }

  // Копируем ZIP файлы
  if (artifacts.zip) {
    artifacts.zip.forEach(zipFile => {
      const destPath = path.join(UPDATES_DIR, path.basename(zipFile));
      fs.copyFileSync(zipFile, destPath);
      copiedFiles.push(destPath);
      log('📁', `Скопирован: ${path.basename(destPath)}`);
    });
  }

  return copiedFiles;
}

/**
 * Создает GitHub Release template
 */
function createGitHubReleaseTemplate(version, artifacts) {
  const template = {
    tag_name: `v${version}`,
    name: `Release v${version}`,
    body: `## Что нового в версии ${version}

### 🚀 Новые возможности
- Добавьте описание новых функций

### 🐛 Исправления ошибок
- Добавьте описание исправленных ошибок

### 🔧 Улучшения
- Добавьте описание улучшений

### 📦 Артефакты сборки
${artifacts.windows ? `- 🖥️ Windows: \`bottle-code-wh-app-${version}-setup.exe\`` : ''}
${artifacts.zip ? `- 📦 ZIP архивы: \`${artifacts.zip.length} файлов\`` : ''}

### 🔄 Автообновление
Приложение автоматически проверит наличие обновлений при следующем запуске.`,
    draft: true,
    prerelease: version.includes('beta') || version.includes('alpha'),
    assets: []
  };

  // Добавляем информацию о файлах для загрузки
  if (artifacts.windows) {
    template.assets.push({
      name: `bottle-code-wh-app-${version}-setup.exe`,
      path: artifacts.windows.setup,
      content_type: 'application/octet-stream'
    });
  }

  if (artifacts.zip) {
    artifacts.zip.forEach(zipFile => {
      template.assets.push({
        name: path.basename(zipFile),
        path: zipFile,
        content_type: 'application/zip'
      });
    });
  }

  const templatePath = path.join(UPDATES_DIR, `github-release-v${version}.json`);
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  log('📋', `GitHub Release template создан: ${templatePath}`);
  
  return templatePath;
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  let targetVersion = args[0];
  
  log('🚀', 'Запуск автоматизированной сборки релиза');
  
  // Определяем версию
  const currentVersion = getCurrentVersion();
  if (!targetVersion) {
    targetVersion = currentVersion;
    log('ℹ️', `Используется текущая версия: ${targetVersion}`);
  } else if (targetVersion !== currentVersion) {
    log('ℹ️', `Обновление версии с ${currentVersion} на ${targetVersion}`);
    updateVersion(targetVersion);
  }

  // Проверяем окружение
  execCommand('node scripts/check-env.cjs', 'Проверка окружения');

  // Сборка приложения
  execCommand('npm run build', 'Сборка приложения');

  // Поиск артефактов
  log('🔍', 'Поиск артефактов сборки...');
  const artifacts = findBuildArtifacts(targetVersion);
  
  if (Object.keys(artifacts).length === 0) {
    log('❌', 'Не найдено артефактов сборки');
    process.exit(1);
  }

  log('📦', 'Найденные артефакты:');
  if (artifacts.windows) {
    log('   ', `🖥️ Windows: ${path.basename(artifacts.windows.setup)}`);
  }
  if (artifacts.zip) {
    log('   ', `📦 ZIP: ${artifacts.zip.length} файлов`);
  }

  // Копирование артефактов
  log('📁', 'Копирование артефактов в папку updates...');
  const copiedFiles = copyArtifactsToUpdates(artifacts, targetVersion);
  // Обновление метаданных
  execCommand('node scripts/update-latest-json.cjs', 'Обновление метаданных latest.json');

  // Генерация latest.yml для electron-updater
  execCommand('node scripts/generate-latest-yml.cjs', 'Генерация latest.yml для electron-updater');

  // Создание GitHub Release template
  const templatePath = createGitHubReleaseTemplate(targetVersion, artifacts);

  // Итоговый отчет
  log('✅', 'Релиз успешно подготовлен!');
  log('📊', 'Сводка:');
  log('   ', `📦 Версия: ${targetVersion}`);
  log('   ', `📁 Артефакты: ${copiedFiles.length} файлов`);
  log('   ', `📋 Template: ${path.basename(templatePath)}`);
  log('   ', `🌐 Updates: ${UPDATES_DIR}`);
  
  log('🔄', 'Следующие шаги:');
  log('   ', '1. Запустите сервер обновлений: npm run update-server');
  log('   ', '2. Протестируйте обновление: npm start');
  log('   ', '3. Создайте GitHub Release используя template');
  log('   ', '4. Опубликуйте релиз в продакшене');
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = {
  main,
  getCurrentVersion,
  updateVersion,
  findBuildArtifacts,
  copyArtifactsToUpdates,
  createGitHubReleaseTemplate
};
