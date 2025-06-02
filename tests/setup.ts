// Настройки и типы для тестов
import { afterEach, vi } from 'vitest';

// Замените этот импорт, если установите testing-library/jest-dom:
// import '@testing-library/jest-dom/extend-expect';

// Типы для тестирования, должны быть совместимыми с реальными типами из приложения
export interface PrinterConfig {
  name: string;
  ip: string;
  port: number;
  isDefault: boolean;
}

export interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

// Удаляем глобальное определение интерфейса Window, чтобы избежать конфликтов
// Вместо этого, будем явно указывать типы там, где это необходимо

// Функция для настройки окружения тестирования принтеров
export function setupPrinterTests() {
  const mockElectronAPI = {
    printLabels: vi.fn().mockResolvedValue(true),
    getPrinters: vi.fn().mockResolvedValue([
      { name: 'Printer 1', ip: '192.168.1.10', port: 9100, isDefault: true },
      { name: 'Printer 2', ip: '192.168.1.11', port: 9100, isDefault: false }
    ]),
    testPrinterConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connection successful' }),
    savePrinterConfig: vi.fn().mockResolvedValue({ success: true, message: 'Config saved' })
  };

  // Создаем мок для window.electronAPI
  vi.stubGlobal('window', {
    electronAPI: mockElectronAPI,
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
  });

  return mockElectronAPI;
}

// Повторно используемые моки для API
export const apiMocks = {
  fetchOrders: vi.fn(),
  archiveOrder: vi.fn()
};

// После каждого теста сбрасываем все моки
afterEach(() => {
  vi.clearAllMocks();
});

// Настройка для тестирования React-компонентов
export function setupReactTesting() {
  // Настраиваем дополнительные утилиты для тестирования React
  const IntersectionObserverMock = vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    takeRecords: vi.fn(),
    unobserve: vi.fn(),
  }));
  
  // Мокаем IntersectionObserver глобально
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  
  // Мокаем другие необходимые API браузера
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }));
}