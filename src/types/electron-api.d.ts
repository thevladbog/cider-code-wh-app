// Global type augmentation for window.electronAPI
import type { PrinterConfig } from '../utils/serialport-helper';

declare global {
  interface Window {
    electronAPI?: {
      printLabels?: (options: any) => Promise<boolean>;
      getPrinters?: () => Promise<PrinterConfig[]>;
      savePrinterConfig?: (config: PrinterConfig[]) => Promise<{ success: boolean; message: string; loadedConfig?: PrinterConfig[] }>;
      testPrinterConnection?: (printerConfig: PrinterConfig) => Promise<{ success: boolean, message: string }>;
      getSystemPrinters?: () => Promise<{ name: string; portName: string; isDefault: boolean }[]>;
      printRawToPrinter?: (printerName: string, rawData: string) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};
