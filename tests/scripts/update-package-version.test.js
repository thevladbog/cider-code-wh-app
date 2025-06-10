/**
 * Тесты для скрипта update-package-version.cjs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Импортируем функции из CommonJS модуля
const { updatePackageVersion, isValidVersion } = require('../../scripts/update-package-version.cjs');

describe('update-package-version', () => {
  const testDir = path.join(__dirname, 'temp-test');
  const testPackageJsonPath = path.join(testDir, 'package.json');
  const originalPackageJson = {
    name: 'test-package',
    version: '1.0.0',
    description: 'Test package'
  };
  
  let originalCwd;

  beforeEach(() => {
    // Сохраняем текущую рабочую директорию
    originalCwd = process.cwd();
    
    // Создаем временную директорию для тестов
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Создаем тестовый package.json
    fs.writeFileSync(testPackageJsonPath, JSON.stringify(originalPackageJson, null, 2));
    
    // Меняем рабочую директорию на тестовую
    process.chdir(testDir);
  });

  afterEach(() => {
    // Возвращаем рабочую директорию
    process.chdir(originalCwd);
    
    // Удаляем тестовую директорию
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('isValidVersion', () => {
    it('should validate correct semver versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('1.2.3')).toBe(true);
      expect(isValidVersion('10.20.30')).toBe(true);
    });    it('should validate beta versions', () => {
      expect(isValidVersion('1.0.0-beta.1')).toBe(true);
      expect(isValidVersion('1.2.3-beta.5')).toBe(true);
      expect(isValidVersion('1.0.0-alpha.1')).toBe(true);
      expect(isValidVersion('1.0.0-beta.10')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('1')).toBe(false);
      expect(isValidVersion('1.0.0.0')).toBe(false);
      expect(isValidVersion('v1.0.0')).toBe(false);
      expect(isValidVersion('')).toBe(false);
      expect(isValidVersion('invalid')).toBe(false);
    });
  });

  describe('updatePackageVersion', () => {    it('should update version in package.json', () => {
      const result = updatePackageVersion('2.1.0');
      expect(result).toBe(true);

      const updatedPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(updatedPackage.version).toBe('2.1.0');
      expect(updatedPackage.name).toBe('test-package'); // Другие поля должны остаться
    });

    it('should update beta version in package.json', () => {
      const betaVersion = '2.1.0-beta.1';
      const result = updatePackageVersion(betaVersion);
      expect(result).toBe(true);

      const updatedPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(updatedPackage.version).toBe(betaVersion);
    });

    it('should preserve JSON formatting', () => {
      updatePackageVersion('2.1.0');
      
      const content = fs.readFileSync('package.json', 'utf8');
      
      // Проверяем, что JSON отформатирован с отступами
      expect(content).toContain('  "name": "test-package"');
      expect(content).toContain('  "version": "2.1.0"');
      
      // Проверяем, что файл заканчивается переносом строки
      expect(content.endsWith('\n')).toBe(true);
    });

    it('should return false for non-existent package.json', () => {
      fs.unlinkSync('package.json');
      
      const result = updatePackageVersion('2.1.0');
      expect(result).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      fs.writeFileSync('package.json', '{ invalid json }');
      
      const result = updatePackageVersion('2.1.0');
      expect(result).toBe(false);
    });
  });
});
