// Настройки и типы для тестов
import { vi, afterEach } from 'vitest';

// Подключаем кастомные jest-dom матчеры для Vitest
import './utils/jest-dom';

// Configure React 18 for better test compatibility
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

// Fix JSDOM instanceof issues
// JSDOM в test environment не всегда правильно имплементирует instanceof для DOM элементов
// Это исправляет ошибку "Right-hand side of 'instanceof' is not an object"
Object.defineProperty(window, 'HTMLElement', {
  value: window.HTMLElement,
  writable: true,
  configurable: true
});

Object.defineProperty(window, 'Element', {
  value: window.Element,
  writable: true,
  configurable: true
});

Object.defineProperty(window, 'Node', {
  value: window.Node,
  writable: true,
  configurable: true
});

// Убеждаемся что window объекты правильно настроены
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.constructor = window.HTMLElement;
}

// Замените этот импорт, если установите testing-library/jest-dom:
// import '@testing-library/jest-dom/extend-expect';

// Типы для тестирования, должны быть совместимыми с реальными типами из приложения
export interface PrinterConfig {
  name: string;
  connectionType: 'network';
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
      { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
      { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false }
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

// Мокаем IntersectionObserver глобально
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));
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

// Мокаем ResizeObserver для HeadlessUI/DOM
class ResizeObserverMock {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);