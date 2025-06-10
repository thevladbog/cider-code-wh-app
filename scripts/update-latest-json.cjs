#!/usr/bin/env node
/**
 * Скрипт для автоматического создания latest.json файла с правильными именами файлов,
 * включающими версию приложения.
 * 
 * Использование:
 * node scripts/update-latest-json.cjs [version] [base-url]
 */

const fs = require('fs');
const path = require('path');

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const providedVersion = args[0];
const baseUrl = args[1] || 'http://localhost:3001/updates';

// Читаем версию из package.json, если не указана
const getVersionFromPackage = () => {
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error('Ошибка при чтении package.json:', error);
    return '1.0.0';
  }
};

const version = providedVersion || getVersionFromPackage();

// Функция для получения размера файла
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`Файл ${filePath} не найден, размер установлен в 0`);
    return 0;
  }
};

// Создаем объект latest.json
const createLatestJson = () => {
  const currentDate = new Date().toISOString();
  
  // Пути к файлам с версиями
  const updatesDir = path.join(__dirname, '../updates');
  const winFile = path.join(updatesDir, `bottle-code-wh-app-${version}-setup.exe`);
  const macFile = path.join(updatesDir, `bottle-code-wh-app-${version}.dmg`);
  const linuxFile = path.join(updatesDir, `bottle-code-wh-app-${version}.AppImage`);
  
  // Генерируем заметки к релизу на основе версии
  const generateReleaseNotes = (ver) => {
    const parts = ver.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);
    
    let notes = `## Что нового в версии ${ver}\\n`;
    
    if (ver.includes('beta')) {
      notes += '- Бета-версия с экспериментальными функциями\\n';
      notes += '- Исправления ошибок и улучшения стабильности\\n';
    } else if (patch > 0) {
      notes += '- Исправления ошибок\\n';
      notes += '- Улучшения производительности\\n';
      notes += '- Обновления безопасности\\n';
    } else if (minor > 0) {
      notes += '- Новые функции и возможности\\n';
      notes += '- Улучшения пользовательского интерфейса\\n';
      notes += '- Исправления ошибок\\n';
    } else {
      notes += '- Крупное обновление с новыми возможностями\\n';
      notes += '- Переработанный интерфейс\\n';
      notes += '- Улучшенная производительность\\n';
    }
    
    return notes;
  };
  
  const latestData = {
    version: version,
    notes: generateReleaseNotes(version),
    releaseDate: currentDate,
    platforms: {
      win32: {
        url: `${baseUrl}/bottle-code-wh-app-${version}-setup.exe`,
        signature: '', // Можно добавить позже при подписи файлов
        size: getFileSize(winFile)
      },
      darwin: {
        url: `${baseUrl}/bottle-code-wh-app-${version}.dmg`,
        signature: '',
        size: getFileSize(macFile)
      },
      linux: {
        url: `${baseUrl}/bottle-code-wh-app-${version}.AppImage`,
        signature: '',
        size: getFileSize(linuxFile)
      }
    }
  };
  
  return latestData;
};

// Функция для обновления latest.json
const updateLatestJson = () => {
  const latestData = createLatestJson();
  const outputPath = path.join(__dirname, '../updates/latest.json');
  
  try {
    // Создаем директорию updates, если она не существует
    const updatesDir = path.dirname(outputPath);
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
    
    // Записываем файл
    fs.writeFileSync(outputPath, JSON.stringify(latestData, null, 2));
    
    console.log('✅ latest.json успешно обновлен');
    console.log(`📦 Версия: ${version}`);
    console.log(`📁 Файл: ${outputPath}`);
    console.log('📋 Платформы:');
    console.log(`   Windows: bottle-code-wh-app-${version}-setup.exe`);
    console.log(`   macOS:   bottle-code-wh-app-${version}.dmg`);
    console.log(`   Linux:   bottle-code-wh-app-${version}.AppImage`);
    
  } catch (error) {
    console.error('❌ Ошибка при создании latest.json:', error);
    process.exit(1);
  }
};

// Функция для создания шаблона для GitHub Releases
const createGitHubReleaseTemplate = () => {
  const latestData = createLatestJson();
  
  const template = {
    tag_name: `v${version}`,
    target_commitish: 'main',
    name: `Release v${version}`,
    body: latestData.notes.replace(/\\n/g, '\n'),
    draft: true,
    prerelease: version.includes('beta') || version.includes('alpha'),
    generate_release_notes: false
  };
  
  const templatePath = path.join(__dirname, '../updates/github-release-template.json');
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  
  console.log('📝 Создан шаблон для GitHub Release:', templatePath);
};

// Если скрипт запущен напрямую
if (require.main === module) {
  console.log('🚀 Обновление latest.json...');
  updateLatestJson();
  createGitHubReleaseTemplate();
}

// Экспортируем функции
module.exports = {
  createLatestJson,
  updateLatestJson,
  createGitHubReleaseTemplate
};
