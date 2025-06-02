/**
 * Вспомогательные функции для тестирования Electron API
 */
import { vi } from 'vitest';
import { PrinterConfig } from '../setup';

/**
 * Настраивает мок Electron API для тестов печати
 */
export function setupElectronPrintMocks() {
  const mockElectronAPI = {
    printLabels: vi.fn().mockResolvedValue(true),
    getPrinters: vi.fn().mockImplementation(() => {
      return Promise.resolve([
        { name: 'Test Printer 1', ip: '192.168.1.10', port: 9100, isDefault: true },
        { name: 'Test Printer 2', ip: '192.168.1.11', port: 9100, isDefault: false }
      ]);
    }),
    testPrinterConnection: vi.fn().mockImplementation((printer: PrinterConfig) => {
      // Симулируем ошибку для принтеров с определенным IP
      if (printer.ip === '192.168.1.99') {
        return Promise.resolve({
          success: false,
          message: 'Could not connect to printer'
        });
      }
      return Promise.resolve({
        success: true,
        message: 'Connection successful'
      });
    }),
    savePrinterConfig: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        success: true,
        message: 'Config saved successfully'
      });
    })
  };

  // Определяем глобальный объект window с electronAPI
  // @ts-expect-error - игнорируем ошибку типов для тестов
  global.window = {
    ...global.window,
    electronAPI: mockElectronAPI
  };

  return mockElectronAPI;
}

/**
 * Очищает мок Electron API после тестов
 */
export function cleanupElectronMocks() {

  if (global.window && global.window.electronAPI) {

    delete global.window.electronAPI;
  }
}

/**
 * Имитирует ошибку соединения с принтером
 */
export function simulatePrinterConnectionError() {

  if (global.window && global.window.electronAPI) {
    // @ts-expect-error - игнорируем ошибку типов для тестов
    global.window.electronAPI.testPrinterConnection.mockRejectedValueOnce(
      new Error('Network error')
    );
  }
}