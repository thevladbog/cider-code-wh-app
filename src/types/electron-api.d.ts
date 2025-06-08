// Global type augmentation for window.electronAPI
import type { PrinterConfig } from '../utils/serialport-helper';

declare global {
  interface Window {
    electronAPI?: {
      // Printer-related methods
      printLabels: (options: import('../utils/print').PrintLabelsOptions) => Promise<boolean>;
      getPrinters: () => Promise<PrinterConfig[]>;
      savePrinterConfig: (
        config: PrinterConfig[]
      ) => Promise<{ success: boolean; message: string; loadedConfig?: PrinterConfig[] }>;
      testPrinterConnection: (
        printerConfig: PrinterConfig
      ) => Promise<{ success: boolean; message: string }>;
      getSystemPrinters: () => Promise<{ name: string; portName: string; isDefault: boolean }[]>;
      printRawToPrinter: (
        printerName: string,
        rawData: string
      ) => Promise<{ success: boolean; message: string }>;

      // API methods to bypass CORS
      fetchOrders: (status?: string) => Promise<{
        success: boolean;
        data?: unknown;
        error?: string;
        status?: number;
      }>;

      archiveOrder: (id: string) => Promise<{
        success: boolean;
        data?: unknown;
        error?: string;
        status?: number;
      }>;

      updateOrderStatus: (
        id: string,
        status: string
      ) => Promise<{
        success: boolean;
        data?: unknown;
        error?: string;
        status?: number;
      }>;
    };
  }
}

export {};
