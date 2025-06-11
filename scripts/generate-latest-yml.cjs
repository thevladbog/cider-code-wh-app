#!/usr/bin/env node

/**
 * Генератор latest.yml файла для electron-updater и GitHub Releases
 * 
 * Этот скрипт создает файл latest.yml, который electron-updater ожидает найти
 * в GitHub Releases для проверки обновлений. GitHub Releases не создает этот файл
 * автоматически, поэтому нам нужно генерировать его вручную.
 * 
 * Использование:
 * node scripts/generate-latest-yml.cjs [version]
 * 
 * Примеры:
 * node scripts/generate-latest-yml.cjs           # Использует версию из package.json
 * node scripts/generate-latest-yml.cjs 1.0.3     # Использует указанную версию
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const providedVersion = args[0];

// Читаем версию из package.json или переменной окружения
function getVersion() {
  // Приоритет: CLI аргумент > переменная окружения > package.json
  if (providedVersion) {
    return providedVersion;
  }
  
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error('Ошибка при чтении package.json:', error.message);
    return '1.0.0';
  }
}

// Получаем информацию о Git репозитории
function getRepoInfo() {
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Извлекаем информацию о репозитории из package.json
    if (packageData.repository && packageData.repository.url) {
      const repoUrl = packageData.repository.url;
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
    }
    
    // Fallback значения
    return {
      owner: 'thevladbog',
      repo: 'cider-code-wh-app'
    };
  } catch (error) {
    console.error('Ошибка при получении информации о репозитории:', error.message);
    return {
      owner: 'thevladbog',
      repo: 'cider-code-wh-app'
    };
  }
}

// Вычисляет SHA512 хэш файла
function calculateSHA512(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Файл не найден для хэширования: ${filePath}`);
      return null;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha512');
    hashSum.update(fileBuffer);
    return hashSum.digest('base64');
  } catch (error) {
    console.warn(`⚠️ Ошибка при вычислении хэша для ${filePath}:`, error.message);
    return null;
  }
}

// Получает размер файла
function getFileSize(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Файл не найден: ${filePath}`);
      return 0;
    }
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.warn(`⚠️ Ошибка при получении размера файла ${filePath}:`, error.message);
    return 0;
  }
}

// Находит артефакты сборки
function findBuildArtifacts(version) {
  const artifactsBase = path.join(__dirname, '../out/make');
  const artifacts = {};
  
  // Windows artifacts (Squirrel)
  const windowsPath = path.join(artifactsBase, 'squirrel.windows/x64');
  if (fs.existsSync(windowsPath)) {
    const files = fs.readdirSync(windowsPath);
    
    // Ищем setup.exe файл
    const setupFile = files.find(file => file.endsWith('-setup.exe'));
    if (setupFile) {
      artifacts.setupExe = {
        name: setupFile,
        path: path.join(windowsPath, setupFile)
      };
    }
    
    // Ищем .nupkg файл
    const nupkgFile = files.find(file => file.endsWith('.nupkg'));
    if (nupkgFile) {
      artifacts.nupkg = {
        name: nupkgFile,
        path: path.join(windowsPath, nupkgFile)
      };
    }
    
    // Ищем RELEASES файл
    const releasesFile = path.join(windowsPath, 'RELEASES');
    if (fs.existsSync(releasesFile)) {
      artifacts.releases = {
        name: 'RELEASES',
        path: releasesFile
      };
    }
  }
  
  return artifacts;
}

// Генерирует содержимое latest.yml
function generateLatestYml(version, repoInfo, artifacts) {
  const isPrerelease = version.includes('beta') || version.includes('alpha') || version.includes('rc');
  const releaseDate = new Date().toISOString();
  
  // Базовый URL для GitHub Releases
  const baseUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/releases/download/v${version}`;
  
  const latestYml = {
    version: version,
    releaseDate: releaseDate,
    githubArtifactName: null,
    path: null,
    sha512: null,
    size: null
  };
  
  // Если есть setup.exe файл, используем его как основной артефакт
  if (artifacts.setupExe) {
    const setupPath = artifacts.setupExe.path;
    const setupName = artifacts.setupExe.name;
    
    latestYml.path = setupName;
    latestYml.sha512 = calculateSHA512(setupPath);
    latestYml.size = getFileSize(setupPath);
    
    console.log(`📦 Основной артефакт: ${setupName}`);
    console.log(`📏 Размер: ${latestYml.size} байт`);
    console.log(`🔒 SHA512: ${latestYml.sha512 ? 'вычислен' : 'не удалось вычислить'}`);
  } else {
    console.warn('⚠️ Setup.exe файл не найден в артефактах сборки');
    
    // Пытаемся использовать .nupkg как fallback
    if (artifacts.nupkg) {
      const nupkgPath = artifacts.nupkg.path;
      const nupkgName = artifacts.nupkg.name;
      
      latestYml.path = nupkgName;
      latestYml.sha512 = calculateSHA512(nupkgPath);
      latestYml.size = getFileSize(nupkgPath);
      
      console.log(`📦 Fallback артефакт: ${nupkgName}`);
    } else {
      console.warn('⚠️ Артефакты сборки не найдены. Создается шаблон latest.yml');
      
      // Создаем шаблон с ожидаемыми именами файлов
      latestYml.path = `bottle-code-wh-app-${version}-setup.exe`;
      latestYml.sha512 = '';
      latestYml.size = 0;
    }
  }
  
  return latestYml;
}

// Конвертирует объект в YAML формат
function objectToYaml(obj, indent = 0) {
  const indentStr = ' '.repeat(indent);
  let yaml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      yaml += `${indentStr}${key}: null\n`;
    } else if (typeof value === 'string') {
      yaml += `${indentStr}${key}: ${value}\n`;
    } else if (typeof value === 'number') {
      yaml += `${indentStr}${key}: ${value}\n`;
    } else if (typeof value === 'object') {
      yaml += `${indentStr}${key}:\n`;
      yaml += objectToYaml(value, indent + 2);
    }
  }
  
  return yaml;
}

// Основная функция генерации
function generateLatestYmlFile() {
  const version = getVersion();
  const repoInfo = getRepoInfo();
  
  console.log('🚀 Генерация latest.yml для electron-updater...');
  console.log(`📦 Версия: ${version}`);
  console.log(`📂 Репозиторий: ${repoInfo.owner}/${repoInfo.repo}`);
  
  // Ищем артефакты сборки
  const artifacts = findBuildArtifacts(version);
  console.log(`🔍 Найдено артефактов: ${Object.keys(artifacts).length}`);
  
  // Генерируем latest.yml
  const latestYmlData = generateLatestYml(version, repoInfo, artifacts);
  
  // Конвертируем в YAML
  const yamlContent = objectToYaml(latestYmlData);
  
  // Создаем директории если нужно
  const outputDir = path.join(__dirname, '../updates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Записываем файл
  const outputPath = path.join(outputDir, 'latest.yml');
  fs.writeFileSync(outputPath, yamlContent);
  
  console.log('✅ latest.yml успешно создан');
  console.log(`📁 Путь: ${outputPath}`);
  
  // Выводим содержимое для проверки
  console.log('\n📋 Содержимое latest.yml:');
  console.log('─'.repeat(50));
  console.log(yamlContent);
  console.log('─'.repeat(50));
  
  // Также создаем копию для GitHub Actions
  const githubOutputPath = path.join(outputDir, `latest-v${version}.yml`);
  fs.writeFileSync(githubOutputPath, yamlContent);
  console.log(`📄 Версионированная копия: ${githubOutputPath}`);
  
  return {
    outputPath,
    githubOutputPath,
    data: latestYmlData
  };
}

// Если скрипт запущен напрямую
if (require.main === module) {
  try {
    generateLatestYmlFile();
  } catch (error) {
    console.error('❌ Ошибка при генерации latest.yml:', error.message);
    process.exit(1);
  }
}

// Экспортируем функции
module.exports = {
  generateLatestYmlFile,
  getVersion,
  getRepoInfo,
  findBuildArtifacts,
  generateLatestYml
};
