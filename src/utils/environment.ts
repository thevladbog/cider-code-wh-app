import { app } from 'electron';

// Определение окружения для использования в разных частях приложения
export const is = {
  development: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test',
  windows: process.platform === 'win32',
  mac: process.platform === 'darwin',
  linux: process.platform === 'linux',
};

/**
 * Получить версию приложения
 * @returns Текущая версия из package.json
 */
export function getAppVersion(): string {
  return app.getVersion();
}

/**
 * Возвращает информацию о платформе и версии приложения
 * @returns Объект с информацией о платформе и версии
 */
export function getEnvironmentInfo() {
  return {
    version: getAppVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    electronVersion: process.versions.electron,
    isDevelopment: is.development,
    isProduction: is.production,
  };
}
