/**
 * Упрощенные тесты для скрипта generate-version.cjs
 * Тестируем основную логику без зависимости от git
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('generate-version basic functionality', () => {
  const testDir = path.join(process.cwd(), 'temp-version-test-simple');
  const testPackageJsonPath = path.join(testDir, 'package.json');
  let originalCwd;
  let generateVersionModule;

  beforeEach(async () => {
    // Сохраняем текущую рабочую директорию
    originalCwd = process.cwd();
    
    // Создаем временную директорию для тестов
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Создаем тестовый package.json
    const testPackage = {
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package'
    };
    fs.writeFileSync(testPackageJsonPath, JSON.stringify(testPackage, null, 2));
    
    // Меняем рабочую директорию на тестовую
    process.chdir(testDir);
    
    // Динамически импортируем модуль
    generateVersionModule = await import('../../scripts/generate-version.cjs');
  });

  afterEach(() => {
    // Возвращаем рабочую директорию
    process.chdir(originalCwd);
    
    // Удаляем тестовую директорию
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateNextVersion', () => {
    it('should generate next minor version', () => {
      const result = generateVersionModule.generateNextVersion('stable', 'minor');
      expect(result).toBe('1.1.0');
    });

    it('should generate next major version', () => {
      const result = generateVersionModule.generateNextVersion('stable', 'major');
      expect(result).toBe('2.0.0');
    });

    it('should generate beta version correctly', () => {
      const result = generateVersionModule.generateNextVersion('beta', 'patch');
      expect(result).toBe('1.0.1-beta.1');
    });

    it('should handle missing package.json', () => {
      fs.unlinkSync('package.json');
      
      const result = generateVersionModule.generateNextVersion('stable', 'patch');
      expect(result).toBeNull();
    });

    it('should generate beta version for minor bump', () => {
      const result = generateVersionModule.generateNextVersion('beta', 'minor');
      expect(result).toBe('1.1.0-beta.1');
    });

    it('should generate beta version for major bump', () => {
      const result = generateVersionModule.generateNextVersion('beta', 'major');
      expect(result).toBe('2.0.0-beta.1');
    });
  });

  describe('basic version parsing', () => {
    it('should read current version from package.json', () => {
      // Тестируем что функция может прочитать версию
      const result = generateVersionModule.generateNextVersion('stable', 'minor');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should handle different bump types', () => {
      const patchResult = generateVersionModule.generateNextVersion('stable', 'patch');
      const minorResult = generateVersionModule.generateNextVersion('stable', 'minor');  
      const majorResult = generateVersionModule.generateNextVersion('stable', 'major');
      
      expect(patchResult).toMatch(/^1\.0\.\d+$/);
      expect(minorResult).toMatch(/^1\.\d+\.0$/);
      expect(majorResult).toMatch(/^\d+\.0\.0$/);
    });
  });
});
