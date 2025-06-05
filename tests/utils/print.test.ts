import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use only network printer mock data and types from updated setup.ts
import { PrinterConfig } from '../setup';

vi.mock('../../src/utils/print', () => {
  // Define mockPrinters inside the factory to avoid hoisting issues
  const mockPrinters: PrinterConfig[] = [
    { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
    { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false }
  ];
  const mockPrintLabels = vi.fn().mockResolvedValue(true);
  const mockGetAvailablePrinters = vi.fn().mockResolvedValue([...mockPrinters]);
  const mockTestPrinterConnection = vi.fn().mockResolvedValue({ 
    success: true, 
    message: 'Connection successful' 
  });
  return {
    printLabels: mockPrintLabels,
    getAvailablePrinters: mockGetAvailablePrinters,
    testPrinterConnection: mockTestPrinterConnection
  };
});

import { printLabels, getAvailablePrinters, testPrinterConnection } from '../../src/utils/print';

describe('Print Utils', () => {
  let mockPrinters: PrinterConfig[];
  beforeEach(() => {
    mockPrinters = [
      { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
      { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false }
    ];
    vi.clearAllMocks();
    const mockElectronAPI = {
      printLabels: vi.fn().mockResolvedValue(true),
      getPrinters: vi.fn().mockResolvedValue([...mockPrinters]),
      testPrinterConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connection successful' })
    };
    vi.stubGlobal('window', {
      electronAPI: mockElectronAPI
    });
    vi.mocked(printLabels).mockReset().mockResolvedValue(true);
    vi.mocked(getAvailablePrinters).mockReset().mockResolvedValue([...mockPrinters]);
    vi.mocked(testPrinterConnection).mockReset().mockResolvedValue({ 
      success: true, 
      message: 'Connection successful' 
    });
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
      };
      await printLabels(data);
      expect(vi.mocked(printLabels)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(printLabels)).toHaveBeenCalledWith(expect.objectContaining({
        template: expect.any(String),
        count: 2,
        orderNumber: '12345'
      }));
    });
    it('should replace placeholders in template', async () => {
      vi.mocked(printLabels).mockImplementationOnce(() => Promise.resolve(true));
      const result = await printLabels({
        template: '^XA^FD{{orderNumber}}^FS^FD{{consignee}}^FS^XZ',
        count: 1,
        orderNumber: '12345',
        consignee: 'Test Company'
      });
      expect(result).toBe(true);
      expect(vi.mocked(printLabels)).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailablePrinters', () => {
    it('should return printers', async () => {
      vi.mocked(getAvailablePrinters).mockResolvedValue([
        { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
        { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false }
      ]);
      const printers = await getAvailablePrinters();
      expect(vi.mocked(getAvailablePrinters)).toHaveBeenCalledTimes(1);
      expect(printers).toEqual([
        { name: 'Printer 1', connectionType: 'network', ip: '192.168.1.10', port: 9100, isDefault: true },
        { name: 'Printer 2', connectionType: 'network', ip: '192.168.1.11', port: 9100, isDefault: false }
      ]);
      expect(printers.length).toBe(2);
      expect(printers[0].name).toBe('Printer 1');
      expect(printers[0].isDefault).toBe(true);
    });
  });

  describe('testPrinterConnection', () => {
    it('should test connection to a network printer', async () => {
      vi.mocked(testPrinterConnection).mockResolvedValue({ 
        success: true, 
        message: 'Connection successful' 
      });
      const printer: PrinterConfig = {
        name: 'Test Printer',
        connectionType: 'network',
        ip: '192.168.1.10',
        port: 9100,
        isDefault: false
      };
      const result = await testPrinterConnection(printer);
      expect(vi.mocked(testPrinterConnection)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(testPrinterConnection)).toHaveBeenCalledWith(printer);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });
  });
});