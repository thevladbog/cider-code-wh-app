// Этот файл содержит типы, используемые только в тестах,
// чтобы избежать конфликтов с реальными типами приложения

// Тип для принтера в тестах
export interface TestPrinterConfig {
  name: string;
  connectionType: 'network' | 'usb' | 'serial';
  ip?: string;
  port?: number;
  usbPath?: string;
  serialPath?: string;
  baudRate?: number;
  isDefault: boolean;
}

// Тип для опций печати этикеток в тестах
export interface TestPrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

// Тип для данных печати в тестах
export interface TestPrintData {
  template: string;
  count: number; // сделаем обязательным для совместимости с PrintData
  orderNumber?: string;
  consignee?: string;
  address?: string;
  deliveryDate?: string;
  printerName?: string;
}

import { Mock } from 'vitest';

// Тип для моков API в тестах
export interface TestApiMocks {
  fetchOrders: Mock;
  archiveOrder: Mock;
}

// Интерфейс для моков ElectronAPI в тестах
export interface TestElectronAPI {
  printLabels: Mock;
  getPrinters: Mock;
  testPrinterConnection: Mock;
  savePrinterConfig: Mock;
}

// Вспомогательные типы для типизации аргументов в тестах
export type PrintLabelsMockParams = {
  labels: string[];
  printerName?: string;
};

// Тип ответа от testPrinterConnection
export type TestPrinterConnectionResponse = { 
  success: boolean; 
  message: string; 
};