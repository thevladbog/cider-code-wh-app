// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Интерфейсы
interface PrinterConfig {
  name: string;
  ip: string;
  port: number;
  isDefault: boolean;
}

interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
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

  // Функция для сохранения конфигурации принтера
  savePrinterConfig: (config: PrinterConfig[]): Promise<{
    success: boolean;
    message: string;
    loadedConfig?: PrinterConfig[];
  }> => {
    return ipcRenderer.invoke('save-printer-config', config);
  },
  
  // Функция для проверки подключения к принтеру
  testPrinterConnection: (printerConfig: PrinterConfig): Promise<{ success: boolean, message: string }> => {
    return ipcRenderer.invoke('test-printer-connection', printerConfig);
  }
});
