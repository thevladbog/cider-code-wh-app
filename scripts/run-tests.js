/**
 * Скрипт для запуска определенных тестов или тестов в определенных файлах
 * Пример использования:
 * - node scripts/run-tests.js api    # запуск всех тестов API
 * - node scripts/run-tests.js print  # запуск тестов модуля печати
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Параметры командной строки
const args = process.argv.slice(2);
const testFile = args[0];
const debug = args.includes('--debug');
const watch = args.includes('--watch');

// Директория с тестами
const testDirs = {
  'api': 'tests/services',
  'components': 'tests/components', 
  'integration': 'tests/integration',
  'models': 'tests/models',
  'scripts': 'tests/scripts',
  'store': 'tests/store',
  'utils': 'tests/utils',
};

/**
 * Поиск файлов тестов, соответствующих шаблону
 */
function findTestFiles(pattern) {
  const files = [];
  
  // Если шаблон - это ярлык директории
  if (testDirs[pattern]) {
    return [`${testDirs[pattern]}/*.test.*`];
  }
  
  // Поиск конкретных файлов
  for (const dir of Object.values(testDirs)) {
    const dirPath = path.resolve(dir);
    
    try {
      if (fs.existsSync(dirPath)) {
        const dirFiles = fs.readdirSync(dirPath);
        
        for (const file of dirFiles) {
          if (file.includes(pattern) && file.includes('.test.')) {
            files.push(path.join(dir, file));
          }
        }
      }
    } catch (err) {
      console.error(`Ошибка при чтении директории ${dirPath}:`, err);
    }
  }
  
  return files;
}

/**
 * Запуск тестов с vitest
 */
function runTests() {
  try {
    const files = testFile ? findTestFiles(testFile) : [];
    
    // Формирование команды
    let cmd = 'npx vitest';
    if (!watch) cmd += ' run';
    if (debug) cmd += ' --reporter=verbose';
    if (files.length > 0) {
      cmd += ' ' + files.join(' ');
    }
    
    console.log(`Запуск: ${cmd}`);
    
    // Выполнение команды тестирования
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    // Ошибки тестов ожидаемы, просто выводим результат
    process.exit(1);
  }
}

// Выполнение
runTests();