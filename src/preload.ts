// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Интерфейсы
interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb';
  ip?: string;
  port?: number;
  usbPath?: string;
  baudRate?: number; // Скорость последовательного порта
  isDefault: boolean;
}

interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

// Тип для информации о последовательном порте (дублируем для preload)
interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
}

// Экспортируем безопасное API для рендерера
contextBridge.exposeInMainWorld('electronAPI', {
  // Функция для печати этикеток
  printLabels: (options: PrintLabelsOptions): Promise<boolean> => {
    return ipcRenderer.invoke('print-labels', options);
  },

  // Функция для получения списка принтеров
  getPrinters: (): Promise<PrinterConfig[]> => {
    return ipcRenderer.invoke('get-printers');
  },
  // Функция для получения списка USB устройств
  getUSBDevices: (): Promise<{
    success: boolean;
    devices: {
      path: string;
      description: string;
      vendorId?: string;
      productId?: string;
      vendorName?: string;
      deviceInfo?: string;
      matchReason?: string;
    }[];
    message: string;
  }> => {
    return ipcRenderer.invoke('get-usb-devices');
  },

  // Функция для сохранения конфигурации принтера
  savePrinterConfig: (
    config: PrinterConfig[]
  ): Promise<{
    success: boolean;
    message: string;
    loadedConfig?: PrinterConfig[];
  }> => {
    return ipcRenderer.invoke('save-printer-config', config);
  },

  // Функция для проверки подключения к принтеру
  testPrinterConnection: (
    printerConfig: PrinterConfig
  ): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('test-printer-connection', printerConfig);
  },

  // Получить системные принтеры
  getSystemPrinters: () => ipcRenderer.invoke('get-system-printers'),

  // Печать сырого текста на принтере
  printRawToPrinter: (printerName: string, rawData: string) =>
    ipcRenderer.invoke('print-raw-to-printer', printerName, rawData),

  // Получить список последовательных портов
  getSerialPorts: (): Promise<SerialPortInfo[]> => {
    return ipcRenderer.invoke('get-serial-ports');
  },

  // Тестировать последовательный порт
  testSerialPort: (
    printerConfig: PrinterConfig
  ): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('test-serial-port', printerConfig);
  },

  // Получить расширенную информацию о последовательных портах
  getEnhancedSerialPortInfo: (): Promise<SerialPortInfo[]> => {
    return ipcRenderer.invoke('get-enhanced-serial-port-info');
  },

  // Получить информацию о статусе TLS соединения
  getTlsStatus: () => {
    return ipcRenderer.invoke('get-tls-status');
  },
  // API методы (обход CORS)
  fetchOrders: (
    status?: string
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
  }> => {
    return ipcRenderer.invoke('fetch-orders', status);
  },

  archiveOrder: (
    id: string
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
  }> => {
    return ipcRenderer.invoke('archive-order', id);
  },

  updateOrderStatus: (
    id: string,
    status: string
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
  }> => {
    return ipcRenderer.invoke('update-order-status', id, status);
  },

  // Certificate management methods
  getCertificateInfo: async () => {
    return await ipcRenderer.invoke('certificate:info');
  },

  checkAndUpdateCertificates: async (autoUpdate = false, updateSource = 'auto') => {
    return await ipcRenderer.invoke('certificate:check-and-update', autoUpdate, updateSource);
  },

  uploadCertificate: async (certificatePath: string, keyPath: string) => {
    return await ipcRenderer.invoke('certificate:upload', certificatePath, keyPath);
  },

  startCertificateMonitoring: async () => {
    return await ipcRenderer.invoke('certificate:start-monitoring');
  },

  // Методы для управления окном
  windowToggleFullscreen: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:toggle-fullscreen');
  },

  windowEnterKioskMode: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:enter-kiosk-mode');
  },

  windowExitKioskMode: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:exit-kiosk-mode');
  },

  windowIsFullscreen: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:is-fullscreen');
  },

  windowIsKiosk: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:is-kiosk');
  },

  appQuit: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:quit');
  },

  windowMinimize: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:minimize');
  },

  windowMaximize: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:maximize');
  },

  // API для автоматического обновления
  checkForUpdates: (): Promise<unknown> => {
    return ipcRenderer.invoke('check-for-updates');
  },

  getCurrentVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-current-version');
  },

  downloadUpdate: (): Promise<void> => {
    return ipcRenderer.invoke('download-update');
  },

  quitAndInstall: (): Promise<void> => {
    return ipcRenderer.invoke('quit-and-install');
  },

  // Подписка на события обновления
  onUpdateStatus: (callback: (event: unknown, arg: unknown) => void) => {
    const listener = (_event: unknown, arg: unknown) => callback(_event, arg);
    ipcRenderer.on('update-status', listener);
    return () => {
      ipcRenderer.removeListener('update-status', listener);
    };
  },
});
