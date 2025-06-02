// Вспомогательный модуль для импорта ES и CommonJS модулей в тестах
import { vi } from 'vitest';

// Функция для импорта и мокирования встроенных модулей
export async function setupImportProxy() {
  // Настраиваем моки для fs и child_process
  vi.mock('fs', () => ({
    default: {
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({ version: '1.0.0' })),
      writeFileSync: vi.fn()
    },
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ version: '1.0.0' })),
    writeFileSync: vi.fn()
  }));

  vi.mock('child_process', () => ({
    default: {
      execSync: vi.fn().mockReturnValue('main')
    },
    execSync: vi.fn().mockReturnValue('main')
  }));

  return {
    fs: await vi.importActual('fs'),
    childProcess: await vi.importActual('child_process')
  };
}