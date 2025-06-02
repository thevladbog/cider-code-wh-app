import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupElectronPrintMocks, cleanupElectronMocks, simulatePrinterConnectionError } from './electron-helpers';
import { TestPrintData } from '../types/test-types';

// Импортируем реальные модули
import { printLabels, getAvailablePrinters, testPrinterConnection } from '../../src/utils/print';

// Мокируем консоль
vi.spyOn(console, 'log').mockImplementation(() => undefined);
vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('Advanced Print Utils Testing', () => {
  // Подготавливаем моки перед каждым тестом
  let electronMocks: ReturnType<typeof setupElectronPrintMocks>;

  beforeEach(() => {
    // Настраиваем моки Electron API
    electronMocks = setupElectronPrintMocks();
    
    // Сбрасываем все моки и шпионы
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Очищаем моки Electron API
    cleanupElectronMocks();
  });

  describe('printLabels', () => {
    it('should handle missing template gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      // @ts-expect-error - намеренно пропускаем обязательное поле для проверки обработки ошибок
      await expect(printLabels({})).rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
    });    it('should handle errors from Electron API', async () => {
      // Настраиваем мок, чтобы он бросал ошибку
      electronMocks.printLabels.mockRejectedValueOnce(new Error('Printer error'));
      
      const printData = {
        template: '^XA^FO50,50^FDTest Label^FS^XZ',
        count: 1
      } as TestPrintData;
      
      // Проверяем, что функция правильно обрабатывает ошибку
      await expect(printLabels(printData)).rejects.toThrow('Printer error');
    });    it('should replace multiple placeholders correctly', async () => {
      const printData = {
        template: '^XA^FO50,50^FD{{orderNumber}}^FS^FO50,100^FD{{consignee}}^FS^FO50,150^FD{{address}}^FS^FO50,200^FD{{deliveryDate}}^FS^XZ',
        count: 1,
        orderNumber: 'ORD-123',
        consignee: 'ACME Corp',
        address: '123 Main St, City',
        deliveryDate: '2023-01-01'
      } as TestPrintData;
      
      await printLabels(printData);
      
      // Проверяем, что функция printLabels в Electron API была вызвана с правильными параметрами
      expect(electronMocks.printLabels).toHaveBeenCalledTimes(1);
      const calledArgs = electronMocks.printLabels.mock.calls[0][0];
      
      // Проверяем, что плейсхолдеры были заменены
      const labelContent = calledArgs.labels[0];
      expect(labelContent).toContain('ORD-123');
      expect(labelContent).toContain('ACME Corp');
      expect(labelContent).toContain('123 Main St, City');
      expect(labelContent).toContain('2023-01-01');
    });
  });

  describe('getAvailablePrinters', () => {
    it('should return printers from Electron API', async () => {
      const printers = await getAvailablePrinters();
      
      expect(electronMocks.getPrinters).toHaveBeenCalledTimes(1);
      expect(printers).toHaveLength(2);
      expect(printers[0].name).toBe('Test Printer 1');
      expect(printers[0].isDefault).toBe(true);
    });
    
    it('should handle errors from Electron API', async () => {
      // Устанавливаем мок, который бросает ошибку
      electronMocks.getPrinters.mockRejectedValueOnce(new Error('Failed to get printers'));
      
      // Проверяем возвращаемый результат при ошибке
      const printers = await getAvailablePrinters();
      expect(printers).toEqual([]);
    });
  });

  describe('testPrinterConnection', () => {
    it('should handle network errors', async () => {
      // Имитируем ошибку сети
      simulatePrinterConnectionError();
      
      const result = await testPrinterConnection({
        name: 'Test Printer',
        ip: '192.168.1.10',
        port: 9100,
        isDefault: false
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });
    
    it('should return connection status for valid printer', async () => {
      const result = await testPrinterConnection({
        name: 'Test Printer',
        ip: '192.168.1.10',
        port: 9100,
        isDefault: false
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });
    
    it('should detect unavailable printer', async () => {
      const result = await testPrinterConnection({
        name: 'Unavailable Printer',
        ip: '192.168.1.99', // IP, для которого мы настроили ошибку в мок
        port: 9100,
        isDefault: false
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Could not connect to printer');
    });
  });
});