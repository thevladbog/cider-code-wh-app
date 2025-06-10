/**
 * Тесты для скрипта generate-version.cjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Мокаем child_process для тестов
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

const { 
  generateNextVersion, 
  generateBetaVersion, 
  getNextBetaNumber,
  getExistingVersionNumbers,
  stableVersionExists 
} = await import('../../scripts/generate-version.cjs');

describe('generate-version', () => {
  const testDir = path.join(__dirname, 'temp-version-test');
  const testPackageJsonPath = path.join(testDir, 'package.json');
  let originalCwd;

  beforeEach(() => {
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
    
    // Очищаем моки
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Возвращаем рабочую директорию
    process.chdir(originalCwd);
    
    // Удаляем тестовую директорию
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getExistingVersionNumbers', () => {
    it('should return empty array when no tags exist', () => {
      execSync.mockReturnValue('');
      
      const result = getExistingVersionNumbers('1.0.1', 'beta');
      expect(result).toEqual([]);
    });

    it('should parse beta version numbers correctly', () => {
      const mockOutput = 'v1.0.1-beta.1\nv1.0.1-beta.3\nv1.0.1-beta.2';
      execSync.mockReturnValue(mockOutput);
      
      const result = getExistingVersionNumbers('1.0.1', 'beta');
      expect(result).toEqual([1, 3, 2]);
    });

    it('should handle git command errors gracefully', () => {
      execSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });
      
      const result = getExistingVersionNumbers('1.0.1', 'beta');
      expect(result).toEqual([]);
    });
  });

  describe('getNextBetaNumber', () => {
    it('should return 1 for first beta version', () => {
      execSync.mockReturnValue('');
      
      const result = getNextBetaNumber('1.0.1');
      expect(result).toBe(1);
    });

    it('should increment from highest existing beta number', () => {
      const mockOutput = 'v1.0.1-beta.1\nv1.0.1-beta.5\nv1.0.1-beta.3';
      execSync.mockReturnValue(mockOutput);
      
      const result = getNextBetaNumber('1.0.1');
      expect(result).toBe(6); // max(1,5,3) + 1
    });
  });

  describe('generateBetaVersion', () => {
    it('should generate first beta version correctly', () => {
      execSync.mockReturnValue('');
      
      const result = generateBetaVersion('1', '0', '1');
      expect(result).toBe('1.0.1-beta.1');
    });

    it('should increment beta number when versions exist', () => {
      const mockOutput = 'v1.2.3-beta.1\nv1.2.3-beta.2';
      execSync.mockReturnValue(mockOutput);
      
      const result = generateBetaVersion('1', '2', '3');
      expect(result).toBe('1.2.3-beta.3');
    });
  });

  describe('stableVersionExists', () => {
    it('should return false when no stable version exists', () => {
      execSync.mockReturnValue('');
      
      const result = stableVersionExists('1.0.1');
      expect(result).toBe(false);
    });

    it('should return true when stable version exists', () => {
      execSync.mockReturnValue('v1.0.1');
      
      const result = stableVersionExists('1.0.1');
      expect(result).toBe(true);
    });
  });

  describe('generateNextVersion', () => {
    it('should generate next patch version for stable release', () => {
      execSync.mockReturnValue(''); // No existing tags
      
      const result = generateNextVersion('stable', 'patch');
      expect(result).toBe('1.0.1');
    });

    it('should generate next minor version', () => {
      execSync.mockReturnValue('');
      
      const result = generateNextVersion('stable', 'minor');
      expect(result).toBe('1.1.0');
    });

    it('should generate next major version', () => {
      execSync.mockReturnValue('');
      
      const result = generateNextVersion('stable', 'major');
      expect(result).toBe('2.0.0');
    });

    it('should generate beta version correctly', () => {
      execSync.mockReturnValue('');
      
      const result = generateNextVersion('beta', 'patch');
      expect(result).toBe('1.0.1-beta.1');
    });

    it('should handle missing package.json', () => {
      fs.unlinkSync('package.json');
      
      const result = generateNextVersion('stable', 'patch');
      expect(result).toBeNull();
    });

    it('should increment patch when stable version exists', () => {
      // Мокаем что версия 1.0.1 уже существует
      execSync.mockReturnValueOnce('v1.0.1'); // для stableVersionExists
      execSync.mockReturnValueOnce(''); // для следующей проверки
      
      const result = generateNextVersion('stable', 'patch');
      expect(result).toBe('1.0.2');
    });
  });
});
