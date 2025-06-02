/* eslint-disable @typescript-eslint/no-var-requires */
// Тесты для версии скрипта в формате CommonJS
import { describe, it, expect, vi } from 'vitest';

// Импортируем модуль с использованием динамического импорта
const versionCjs = await import('../../scripts/version.cjs');

// Мокаем необходимые модули
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(JSON.stringify({ version: '1.0.0' })),
  writeFileSync: vi.fn()
}));

vi.mock('child_process', () => ({
  execSync: vi.fn().mockReturnValue('main')
}));

describe('Version CJS Module', () => {
  describe('getReleaseType', () => {
    it('should return stable for release-stable branch', () => {
      expect(versionCjs.getReleaseType('release-stable')).toBe('stable');
    });

    it('should return beta for release-beta branch', () => {
      expect(versionCjs.getReleaseType('release-beta')).toBe('beta');
    });

    it('should return development for other branches', () => {
      expect(versionCjs.getReleaseType('develop')).toBe('development');
      expect(versionCjs.getReleaseType('feature/new-feature')).toBe('development');
      expect(versionCjs.getReleaseType('main')).toBe('development');
    });
  });

  describe('getVersionBumpType', () => {
    it('should return major for commit messages with (MAJOR)', () => {
      expect(versionCjs.getVersionBumpType('Add new feature (MAJOR)')).toBe('major');
      expect(versionCjs.getVersionBumpType('BREAKING CHANGE (MAJOR): Refactored API')).toBe('major');
    });

    it('should return minor for commit messages with (MINOR)', () => {
      expect(versionCjs.getVersionBumpType('Add new feature (MINOR)')).toBe('minor');
      expect(versionCjs.getVersionBumpType('Feature (MINOR): Added new button')).toBe('minor');
    });

    it('should return patch for regular commit messages', () => {
      expect(versionCjs.getVersionBumpType('Fix bug in login form')).toBe('patch');
      expect(versionCjs.getVersionBumpType('Update dependencies')).toBe('patch');
      expect(versionCjs.getVersionBumpType('')).toBe('patch');
    });
  });
});