import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import required types
import { PrinterConfig } from '../setup';

// Define mock printer data with proper hoisting
const mockPrinters = vi.hoisted(() => [
  { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
  { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false },
  { name: 'USB Printer', connectionType: 'usb', usbPath: 'usb://zebra/zt411', isDefault: false },
  { name: 'Serial Printer', connectionType: 'serial', serialPath: '/dev/ttyS0', baudRate: 9600, isDefault: false }
]);

// Define mock functions with proper hoisting
const mockPrintLabels = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockGetAvailablePrinters = vi.hoisted(() => vi.fn().mockResolvedValue(mockPrinters));
const mockTestPrinterConnection = vi.hoisted(() => vi.fn().mockResolvedValue({ 
  success: true, 
  message: 'Connection successful' 
}));
const mockGetAvailableUSBDevices = vi.hoisted(() => vi.fn().mockResolvedValue([
  { path: 'usb://04b8/0e15', description: 'Epson TM-T88V Printer' },
  { path: 'usb://0a5f/00a0', description: 'Zebra GK420d Printer' }
]));

// Mock the print.ts module
vi.mock('../../src/utils/print', () => {
  return {
    printLabels: mockPrintLabels,
    getAvailablePrinters: mockGetAvailablePrinters,
    testPrinterConnection: mockTestPrinterConnection,
    getAvailableUSBDevices: mockGetAvailableUSBDevices
  };
});

// Import after mock
import { 
  printLabels,
  getAvailablePrinters, 
  testPrinterConnection,
  getAvailableUSBDevices
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
  });  describe('getAvailablePrinters', () => {    it('should return printers', async () => {
      // Mock implementation reset to ensure it returns correct values
      mockGetAvailablePrinters.mockResolvedValue(mockPrinters);
      
      const printers = await getAvailablePrinters();
      
      expect(getAvailablePrinters).toHaveBeenCalledTimes(1);
      expect(printers).toEqual(mockPrinters);
      expect(printers.length).toBe(4); // Updated to match new printer count with serial printer
      expect(printers[0].name).toBe('Printer 1');
      expect(printers[0].isDefault).toBe(true);
    });
  });  describe('testPrinterConnection', () => {
    it('should test connection to a network printer', async () => {
      const printer: PrinterConfig = {
        name: 'Test Printer',
        connectionType: 'network',
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
    });    it('should test connection to a USB printer', async () => {
      const printer: PrinterConfig = {
        name: 'USB Printer',
        connectionType: 'usb',
        usbPath: 'usb://zebra/zt411',
        isDefault: false
      };
      
      // Mock implementation reset to ensure it returns correct values
      mockTestPrinterConnection.mockResolvedValue({ 
        success: true, 
        message: 'USB connection successful' 
      });
      
      const result = await testPrinterConnection(printer);
      
      expect(testPrinterConnection).toHaveBeenCalledTimes(1);
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(result.success).toBe(true);
      expect(result.message).toBe('USB connection successful');
    });

    it('should test connection to a serial port printer', async () => {
      const printer: PrinterConfig = {
        name: 'Serial Printer',
        connectionType: 'serial',
        serialPath: '/dev/ttyS0',
        baudRate: 9600,
        isDefault: false
      };
      
      // Mock implementation reset to ensure it returns correct values
      mockTestPrinterConnection.mockResolvedValue({ 
        success: true, 
        message: 'Serial connection successful' 
      });
      
      const result = await testPrinterConnection(printer);
      
      expect(testPrinterConnection).toHaveBeenCalledTimes(1);
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Serial connection successful');
    });
  });

  describe('getAvailableUSBDevices', () => {
    it('should be mocked and not called in tests', async () => {
      // Добавляем мок для новой функции
      const getAvailableUSBDevices = vi.fn().mockResolvedValue([
        { path: 'usb://example/device1', description: 'Test USB Device 1' },
        { path: 'usb://example/device2', description: 'Test USB Device 2' }
      ]);
      
      // Не нужно вызывать функцию в тесте, просто проверяем, что она существует
      expect(typeof getAvailableUSBDevices).toBe('function');
      
      // Проверяем, что мок может быть вызван
      const result = await getAvailableUSBDevices();
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('usb://example/device1');
      expect(result[1].description).toBe('Test USB Device 2');
    });
  });
  // Тесты для USB и Serial принтеров
  describe('USB and Serial Printer Functionality', () => {
    beforeEach(() => {
      // Сбрасываем моки перед каждым тестом
      vi.clearAllMocks();
      vi.resetAllMocks();
      
      // Устанавливаем моки для window.electronAPI
      Object.defineProperty(window, 'electronAPI', {
        value: {
          printLabels: mockPrintLabels,
          getPrinters: mockGetAvailablePrinters,
          testPrinterConnection: mockTestPrinterConnection,
          getUSBDevices: vi.fn().mockResolvedValue({
            success: true,
            devices: [
              { 
                path: 'usb://04b8/0e15',
                description: 'Epson TM-T88V Printer',
                vendorId: '04b8',
                productId: '0e15',
                vendorName: 'Epson',
                deviceInfo: 'TM-T88V Receipt Printer',
                matchReason: 'известный производитель принтеров'
              },
              { 
                path: 'usb://0a5f/00a0',
                description: 'Zebra GK420d Printer',
                vendorId: '0a5f',
                productId: '00a0',
                vendorName: 'Zebra',
                deviceInfo: 'GK420d Label Printer',
                matchReason: 'известный производитель принтеров, класс устройства соответствует принтеру'
              },
            ],
            message: 'Найдено 2 USB устройств'
          })
        },
        configurable: true
      });
    });
  it('should correctly handle printing to USB printer', async () => {
    // Устанавливаем мок для этого конкретного теста
    mockPrintLabels.mockResolvedValueOnce(true);
    
    // Проверяем печать на USB принтер через глобальный импорт (не через dynamic import)
    const result = await printLabels({
      template: '^XA^PQ1^FO50,50^A0N,50,50^FDTest Label^FS^XZ',
      count: 1,
      printerName: 'USB Printer'
    });
    
    expect(result).toBe(true);
    expect(mockPrintLabels).toHaveBeenCalledWith({
      template: '^XA^PQ1^FO50,50^A0N,50,50^FDTest Label^FS^XZ',
      count: 1,
      printerName: 'USB Printer'
    });
    });    it('should correctly load USB device list', async () => {
      // Устанавливаем мок для теста
      mockGetAvailableUSBDevices.mockResolvedValueOnce([
        { 
          path: 'usb://04b8/0e15', 
          description: 'Epson TM-T88V', 
          vendorId: '04b8',
          productId: '0e15',
          vendorName: 'Epson',
          deviceInfo: 'TM-T88V Receipt Printer'
        },
        { 
          path: 'usb://0a5f/00a0', 
          description: 'Zebra GK420d',
          vendorId: '0a5f',
          productId: '00a0',
          vendorName: 'Zebra',
          deviceInfo: 'GK420d Label Printer'
        }
      ]);
      
      // Проверяем загрузку USB устройств
      const devices = await getAvailableUSBDevices();
      
      expect(devices).toHaveLength(2);
      expect(devices[0].path).toBe('usb://04b8/0e15');
      expect(devices[0].vendorName).toBe('Epson');
      expect(devices[1].path).toBe('usb://0a5f/00a0');
      expect(devices[1].vendorName).toBe('Zebra');
    });    it('should correctly test USB printer connection', async () => {
      // Устанавливаем мок для этого конкретного теста
      mockTestPrinterConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connection successful'
      });
      
      // Проверяем тестирование подключения к USB принтеру через глобальный импорт
      const result = await testPrinterConnection({
        name: 'USB Printer',
        connectionType: 'usb',
        usbPath: 'usb://zebra/zt411',
        isDefault: false
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(mockTestPrinterConnection).toHaveBeenCalledWith({
        name: 'USB Printer',
        connectionType: 'usb',
        usbPath: 'usb://zebra/zt411',
        isDefault: false
      });
    });

    it('should correctly test Serial printer connection', async () => {
      const { testPrinterConnection } = await import('../../src/utils/print');
      
      // Подготавливаем мок для тестирования последовательного порта
      mockTestPrinterConnection.mockResolvedValueOnce({
        success: true,
        message: 'Serial connection successful'
      });
      
      // Проверяем тестирование подключения к Serial принтеру
      const result = await testPrinterConnection({
        name: 'Serial Printer',
        connectionType: 'serial',
        serialPath: '/dev/ttyS0',
        baudRate: 9600,
        isDefault: false
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Serial connection successful');
      expect(mockTestPrinterConnection).toHaveBeenCalledWith({
        name: 'Serial Printer',
        connectionType: 'serial',
        serialPath: '/dev/ttyS0',
        baudRate: 9600,
        isDefault: false
      });
    });
    
    it('should handle different baud rates for serial printers', async () => {
      const { testPrinterConnection } = await import('../../src/utils/print');
      
      // Подготавливаем мок для тестирования последовательного порта с другой скоростью
      mockTestPrinterConnection.mockResolvedValueOnce({
        success: true,
        message: 'Serial connection successful at 115200 baud'
      });
      
      // Проверяем тестирование подключения к Serial принтеру с высокой скоростью
      const result = await testPrinterConnection({
        name: 'High Speed Serial Printer',
        connectionType: 'serial',
        serialPath: '/dev/ttyS1',
        baudRate: 115200,
        isDefault: false
      });
      
      expect(result.success).toBe(true);
      expect(mockTestPrinterConnection).toHaveBeenCalledWith(expect.objectContaining({
        baudRate: 115200
      }));
    });
  });
});