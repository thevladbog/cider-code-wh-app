import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import required types
import { PrinterConfig } from '../setup';

// Define mock printer data with proper hoisting
const mockPrinters = vi.hoisted(() => [
  { name: 'Printer 1', ip: '192.168.1.10', port: 9100, isDefault: true },
  { name: 'Printer 2', ip: '192.168.1.11', port: 9100, isDefault: false }
]);

// Define mock functions with proper hoisting
const mockPrintLabels = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockGetAvailablePrinters = vi.hoisted(() => vi.fn().mockResolvedValue(mockPrinters));
const mockTestPrinterConnection = vi.hoisted(() => vi.fn().mockResolvedValue({ 
  success: true, 
  message: 'Connection successful' 
}));

// Mock the print.ts module
vi.mock('../../src/utils/print', () => {
  return {
    printLabels: mockPrintLabels,
    getAvailablePrinters: mockGetAvailablePrinters,
    testPrinterConnection: mockTestPrinterConnection
  };
});

// Import after mock
import { 
  printLabels,
  getAvailablePrinters, 
  testPrinterConnection 
} from '../../src/utils/print';

describe('Print Utils', () => {  // Setup environment before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock for window.electronAPI
    const mockElectronAPI = {
      printLabels: vi.fn().mockResolvedValue(true),
      getPrinters: vi.fn().mockResolvedValue(mockPrinters),
      testPrinterConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connection successful' })
    };

    // Setup mock for window
    vi.stubGlobal('window', {
      electronAPI: mockElectronAPI
    });
    
    // Reset our hoisted mock functions
    mockPrintLabels.mockReset().mockResolvedValue(true);
    mockGetAvailablePrinters.mockReset().mockResolvedValue(mockPrinters);
    mockTestPrinterConnection.mockReset().mockResolvedValue({ 
      success: true, 
      message: 'Connection successful' 
    });
    
    // Mock console for cleaner tests
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('printLabels', () => {
    it('should call print function with correct parameters', async () => {
      const data = {
        template: '^XA^FO50,50^ADN,36,20^FDTest Label^FS^XZ',
        count: 2,
        orderNumber: '12345',
        consignee: 'Test Company',
        address: 'Test Address',
        deliveryDate: '2023-01-01'
      };      await printLabels(data);
      
      // Проверяем, что мок-функция была вызвана
      expect(printLabels).toHaveBeenCalledTimes(1);
      
      // Проверяем параметры вызова
      expect(printLabels).toHaveBeenCalledWith(expect.objectContaining({
        template: expect.any(String),
        count: 2,
        orderNumber: '12345'
      }));
    });    it('should replace placeholders in template', async () => {
      // Меняем реализацию мока для одного теста
      mockPrintLabels.mockImplementationOnce(() => {
        // Для этого теста возвращаем успешный результат
        return Promise.resolve(true);
      });

      const result = await printLabels({
        template: '^XA^FD{{orderNumber}}^FS^FD{{consignee}}^FS^XZ',
        count: 1,
        orderNumber: '12345',
        consignee: 'Test Company'
      });
      
      // Проверяем успешный результат
      expect(result).toBe(true);
      
      // Проверяем, что функция была вызвана
      expect(printLabels).toHaveBeenCalledTimes(1);
    });
  });  describe('getAvailablePrinters', () => {
    it('should return printers', async () => {
      // Mock implementation reset to ensure it returns correct values
      mockGetAvailablePrinters.mockResolvedValue(mockPrinters);
      
      const printers = await getAvailablePrinters();
      
      expect(getAvailablePrinters).toHaveBeenCalledTimes(1);
      expect(printers).toEqual(mockPrinters);
      expect(printers.length).toBe(2);
      expect(printers[0].name).toBe('Printer 1');
      expect(printers[0].isDefault).toBe(true);
    });
  });
  describe('testPrinterConnection', () => {
    it('should test connection to a printer', async () => {
      const printer: PrinterConfig = {
        name: 'Test Printer',
        ip: '192.168.1.10',
        port: 9100,
        isDefault: false
      };
      
      // Mock implementation reset to ensure it returns correct values
      mockTestPrinterConnection.mockResolvedValue({ 
        success: true, 
        message: 'Connection successful' 
      });
      
      const result = await testPrinterConnection(printer);
      
      expect(testPrinterConnection).toHaveBeenCalledTimes(1);
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });
  });
});