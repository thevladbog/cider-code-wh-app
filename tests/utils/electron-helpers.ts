/**
 * Вспомогательные функции для тестирования Electron API
 */
import { vi } from 'vitest';
import { PrinterConfig } from '../setup';

/**
 * Настраивает мок Electron API для тестов печати
 */
export function setupElectronPrintMocks() {  const mockElectronAPI = {
    printLabels: vi.fn().mockResolvedValue(true),    getPrinters: vi.fn().mockImplementation(() => {
      return Promise.resolve([
        { name: 'Test Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
        { name: 'Test Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false },
        { name: 'Test USB Printer', connectionType: 'usb', usbPath: 'usb://zebra/zt411', isDefault: false },
        { name: 'Test Serial Printer', connectionType: 'serial', serialPath: '/dev/ttyS0', baudRate: 9600, isDefault: false }
      ]);
    }),
    getUSBDevices: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        success: true,
        devices: [
          { 
            path: 'usb://04b8/0e15',
            description: 'Epson TM-T88V Printer',
            vendorId: '04b8',
            productId: '0e15',
            vendorName: 'Epson',
            deviceInfo: 'TM-T88V Receipt Printer'
          },
          { 
            path: 'usb://0a5f/00a0',
            description: 'Zebra GK420d Printer',
            vendorId: '0a5f',
            productId: '00a0',
            vendorName: 'Zebra',
            deviceInfo: 'GK420d Label Printer'
          }
        ],
        message: 'Найдено 2 USB устройств'
      });
    }),testPrinterConnection: vi.fn().mockImplementation((printer: PrinterConfig) => {
      // Симулируем ошибку для принтеров с определенным IP, USB путем или последовательным портом
      if ((printer.connectionType === 'network' && printer.ip === '192.168.1.99') || 
          (printer.connectionType === 'usb' && printer.usbPath === 'usb://bad/device') ||
          (printer.connectionType === 'serial' && printer.serialPath === '/dev/bad-port')) {
        return Promise.resolve({
          success: false,
          message: 'Could not connect to printer'
        });
      }
      
      let connectionType = 'Unknown';
      if (printer.connectionType === 'network') {
        connectionType = 'Network';
      } else if (printer.connectionType === 'usb') {
        connectionType = 'USB';
      } else if (printer.connectionType === 'serial') {
        connectionType = 'Serial';
      }
      
      return Promise.resolve({
        success: true,
        message: `${connectionType} connection successful`
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