/* eslint-disable @typescript-eslint/no-explicit-any */
// Global Vite environment variables for Electron Forge
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Global type augmentation for window.electronAPI

// PrinterConfig interface definition
interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb';
  ip?: string;
  port?: number;
  usbPath?: string;
  baudRate?: number;
  isDefault: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      // API-related methods with TLS support
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

      // TLS status info
      getTlsStatus: () => Promise<{
        lastConnection: Date | null;
        lastError: string | null;
        certificateInfo: {
          valid: boolean;
          expiration: Date | null;
          issuer: string | null;
          domain: string | null;
        };
        connections: {
          total: number;
          successful: number;
          failed: number;
        };
      }>;

      // Certificate management methods
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };

      // Certificate methods shortcuts
      getCertificateInfo: () => Promise<{
        valid: boolean;
        expiration: Date | null;
        issuer: string | null;
        domain: string | null;
        notBefore?: Date | null;
        notAfter?: Date | null;
        serialNumber?: string | null;
        subjectAltName?: string[] | null;
      }>;

      checkAndUpdateCertificates: (
        autoUpdate?: boolean,
        updateSource?: string
      ) => Promise<{
        valid: boolean;
        expiration: Date | null;
        issuer: string | null;
        domain: string | null;
      }>;

      uploadCertificate: (options: {
        certData: string;
        keyData: string;
        caData?: string;
      }) => Promise<{
        success: boolean;
        certInfo?: {
          valid: boolean;
          expiration: Date | null;
          issuer: string | null;
          domain: string | null;
        };
        error?: string;
      }>;

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

      // Window management methods
      windowToggleFullscreen: () => Promise<boolean>;
      windowEnterKioskMode: () => Promise<boolean>;
      windowExitKioskMode: () => Promise<boolean>;
      windowIsFullscreen: () => Promise<boolean>;
      windowIsKiosk: () => Promise<boolean>;
      appQuit: () => Promise<boolean>;
      windowMinimize: () => Promise<boolean>;
      windowMaximize: () => Promise<boolean>;
    };
  }
}

export {};
