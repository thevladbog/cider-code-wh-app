import { describe, it, expect } from 'vitest';
import * as versionModule from '../../scripts/version.js';

// Получаем функции из модуля
const { getReleaseType, getVersionBumpType } = versionModule;

describe('Version script', () => {
  describe('getReleaseType', () => {
    it('should return stable for release-stable branch', () => {
      expect(getReleaseType('release-stable')).toBe('stable');
    });

    it('should return beta for release-beta branch', () => {
      expect(getReleaseType('release-beta')).toBe('beta');
    });

    it('should return development for other branches', () => {
      expect(getReleaseType('develop')).toBe('development');
      expect(getReleaseType('feature/new-feature')).toBe('development');
      expect(getReleaseType('main')).toBe('development');
    });
  });

  describe('getVersionBumpType', () => {
    it('should return major for commit messages with (MAJOR)', () => {
      expect(getVersionBumpType('Add new feature (MAJOR)')).toBe('major');
      expect(getVersionBumpType('BREAKING CHANGE (MAJOR): Refactored API')).toBe('major');
    });

    it('should return minor for commit messages with (MINOR)', () => {
      expect(getVersionBumpType('Add new feature (MINOR)')).toBe('minor');
      expect(getVersionBumpType('Feature (MINOR): Added new button')).toBe('minor');
    });

    it('should return patch for regular commit messages', () => {
      expect(getVersionBumpType('Fix bug in login form')).toBe('patch');
      expect(getVersionBumpType('Update dependencies')).toBe('patch');
      expect(getVersionBumpType('')).toBe('patch');
    });
  });
});