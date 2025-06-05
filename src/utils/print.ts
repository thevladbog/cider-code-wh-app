// We use a safe approach to access electron features
// Интерфейс для параметров печати через Electron API
interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      printLabels: (options: PrintLabelsOptions) => Promise<boolean>;
      getPrinters: () => Promise<PrinterConfig[]>;
      savePrinterConfig: (config: PrinterConfig[]) => Promise<{
        success: boolean;
        message: string;
        loadedConfig?: PrinterConfig[];
      }>;
      getUSBDevices: () => Promise<{
        success: boolean;
        devices: USBDeviceInfo[];
        message: string;
      }>;
      testPrinterConnection?: (printerConfig: PrinterConfig) => Promise<{ success: boolean, message: string }>;
      getSystemPrinters?: () => Promise<{ name: string; portName: string; isDefault: boolean }[]>;
      printRawToPrinter?: (printerName: string, rawData: string) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export interface PrintOptions {
  template: string;
  count: number;
  printerName?: string;
}

export interface USBDeviceInfo {
  path: string;
  description: string;
  name?: string;
  vendorId?: string;
  productId?: string;
  vendorName?: string;
  deviceInfo?: string;
  matchReason?: string;
}

// Remove all serial/usb logic and types, only support network printers
export interface PrinterConfig {
  name: string;
  connectionType: 'network';
  ip: string;
  port: number;
  isDefault?: boolean;
}

export interface PrintData extends PrintOptions {
  orderNumber?: string;
  consignee?: string;
  address?: string;
  deliveryDate?: string;
}

// Функция для печати этикеток
export const printLabels = (options: PrintData): Promise<boolean> => {
  const { template, count, printerName, orderNumber, consignee, address, deliveryDate } = options;

  return new Promise((resolve, reject) => {
    try {
      console.log('[PRINT] Начало процесса печати');
      console.log('[PRINT] Параметры:', { 
        count, 
        printerName: printerName || 'не указан (будет использован принтер по умолчанию)',
        hasTemplate: !!template,
        templateLength: template ? template.length : 0,
        hasOrderNumber: !!orderNumber,
        hasConsignee: !!consignee,
        hasAddress: !!address,
        hasDeliveryDate: !!deliveryDate
      });
      
      // Проверка наличия и валидности шаблона
      if (!template || template.trim() === '') {
        console.error('[PRINT] Ошибка: Пустой шаблон ZPL');
        reject(new Error('Шаблон этикетки не задан'));
        return;
      }
        // Проверка количества
      if (count <= 0) {
        console.error('[PRINT] Ошибка: Некорректное количество этикеток:', count);
        reject(new Error('Некорректное количество этикеток'));
        return;
      }
      
      // Массив для хранения всех этикеток
      const labels: string[] = [];
        // Генерируем содержимое для каждой этикетки
      for (let i = 1; i <= count; i++) {
        console.log(`[PRINT] Генерация этикетки ${i}/${count}`);
          // Заменяем плейсхолдеры в шаблоне ZPL
        let labelContent = template
          .replace(/{{currentLabel}}/g, i.toString())
          .replace(/{{totalLabels}}/g, count.toString());
          
        // Добавляем поля из заказа, если они указаны
        if (orderNumber) labelContent = labelContent.replace(/{{orderNumber}}/g, orderNumber);        if (consignee) labelContent = labelContent.replace(/{{consignee}}/g, consignee);
        if (address) labelContent = labelContent.replace(/{{address}}/g, address);
        if (deliveryDate) labelContent = labelContent.replace(/{{deliveryDate}}/g, deliveryDate);
        
        // Add Swiss721 font selection command if not already present
        // Insert ^A@ command after ^XA if not already added
        if (!labelContent.includes('^A@') && labelContent.includes('^XA')) {
          labelContent = labelContent.replace(/\^XA/g, '^XA\n^A@');
          console.log(`[PRINT] Added ^A@ command for Swiss721 font`);
        }
        
        // Проверяем, остались ли незамененные плейсхолдеры
        const remainingPlaceholders = labelContent.match(/{{[^}]+}}/g);
        if (remainingPlaceholders) {
          console.warn('[PRINT] Предупреждение: Незамененные плейсхолдеры в шаблоне:', remainingPlaceholders);
        }
        
        labels.push(labelContent);
      }
      
      // В режиме разработки или без доступа к Electron API просто выводим в консоль
      if (!window.electronAPI) {
        console.log(`[PRINT] (Режим разработки) Печать ${count} этикеток с шаблоном:`);
        labels.forEach((label, index) => {
          console.log(`[PRINT] Этикетка ${index + 1}/${count} (первые 200 символов):`);
          console.log(label.substring(0, 200) + (label.length > 200 ? '...' : ''));
        });
        console.log('[PRINT] (Режим разработки) Имитация успешной печати');
        setTimeout(() => resolve(true), 1000);
        return;
      }
        // Используем безопасный API из preload-скрипта
      if (window.electronAPI) {
        console.log('[PRINT] Используем electronAPI для печати этикеток');
        console.log('[PRINT] Настройки печати:', { 
          printerName: printerName || 'не указано (будет использован принтер по умолчанию)', 
          labelCount: labels.length 
        });

        console.log({labels})
        
        // Получим список доступных принтеров, чтобы определить способ подключения
        getAvailablePrinters().then(availablePrinters => {
          // Находим выбранный принтер или принтер по умолчанию
          const targetPrinter = printerName 
            ? availablePrinters.find(p => p.name === printerName) 
            : availablePrinters.find(p => p.isDefault);
            
          if (targetPrinter) {
            console.log(`[PRINT] Печать на принтер ${targetPrinter.name} через ${
              targetPrinter.connectionType === 'network' ? 'сеть' : 'USB'
            }`);
          }
          
          // Печатаем с использованием API
          return window.electronAPI.printLabels({
            labels,
            printerName
          });
        })
        .then((result) => {
          console.log('[PRINT] Результат печати через IPC:', result ? 'Успешно' : 'Ошибка');
          resolve(result);
        }).catch((error) => {
          console.error('[PRINT] Ошибка при печати через IPC:', error);
          reject(new Error(`Ошибка печати: ${error instanceof Error ? error.message : String(error)}`));
        });
      } else {
        console.warn('[PRINT] electronAPI недоступен, используем заглушку для печати');
        console.log('[PRINT] В режиме разработки печать имитируется');
        setTimeout(() => resolve(true), 1000);
      }
    } catch (error) {
      console.error('[PRINT] Необработанная ошибка при подготовке этикеток:', error);
      reject(new Error(`Ошибка при подготовке этикеток: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

// Функция для получения списка доступных принтеров
export const getAvailablePrinters = (): Promise<PrinterConfig[]> => {
  return new Promise((resolve) => {
    // Используем безопасный API из preload-скрипта
    if (window.electronAPI) {
      console.log('[CONFIG] Запрос списка принтеров через IPC...');
      window.electronAPI.getPrinters()
        .then((printers: PrinterConfig[]) => {
          console.log('[CONFIG] Получены принтеры:', printers);
          resolve(printers);
        })
        .catch((error: Error) => {
          console.error('[CONFIG] Ошибка при получении списка принтеров:', error);
          resolve([]);
        });
    } else {
      // Только в режиме разработки без доступа к Electron API используем пустой массив
      console.warn('[CONFIG] electronAPI недоступен, возвращаем пустой список принтеров');
      resolve([]);
    }
  });
};

// Функция для получения доступных USB устройств
export const getAvailableUSBDevices = async (): Promise<USBDeviceInfo[]> => {
  // Проверяем доступность Electron API
  if (!window.electronAPI || !window.electronAPI.getUSBDevices) {
    console.warn('[USB] electronAPI недоступен или метод getUSBDevices отсутствует');
    console.log('[USB] Режим разработки - возвращаем тестовые USB устройства');
    
    // В режиме разработки возвращаем тестовые данные с задержкой
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      { 
        path: 'usb://04b8/0e15', 
        description: 'Epson TM-T88V Receipt Printer',
        vendorId: '04b8',
        productId: '0e15',
        vendorName: 'Epson',
        deviceInfo: 'TM-T88V Receipt Printer',
        matchReason: 'известный производитель принтеров'
      },
      { 
        path: 'usb://0a5f/00a0', 
        description: 'Zebra GK420d Label Printer',
        vendorId: '0a5f',
        productId: '00a0',
        vendorName: 'Zebra',
        deviceInfo: 'GK420d Label Printer',
        matchReason: 'известный производитель принтеров, класс устройства соответствует принтеру'
      },
      { 
        path: 'usb://067b/2303', 
        description: 'Prolific USB-Serial Adapter',
        vendorId: '067b',
        productId: '2303',
        vendorName: 'Prolific',
        deviceInfo: 'USB-Serial Adapter',
        matchReason: 'USB-Serial адаптер, часто используемый для принтеров'
      }
    ];
  }
  
  try {
    console.log('[USB] Запрос списка USB устройств через IPC...');
    const response = await window.electronAPI.getUSBDevices();
    
    if (!response.success) {
      console.error('[USB] Ошибка при получении списка USB устройств:', response.message);
      return [];
    }
    
    console.log(`[USB] Получено ${response.devices.length} USB устройств:`, response.devices);
    return response.devices;
  } catch (error) {
    console.error('[USB] Ошибка при получении списка USB устройств:', error);
    return [];
  }
};

// Функция для тестирования подключения к принтеру
export const testPrinterConnection = async (printer: PrinterConfig): Promise<{ success: boolean, message: string }> => {
  // Проверяем доступность Electron API
  if (!window.electronAPI || !window.electronAPI.testPrinterConnection) {
    console.log('[TEST] Режим разработки или отсутствует API - имитация проверки подключения к принтеру:', printer);
    // В режиме разработки возвращаем успех с задержкой
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Имитируем более реалистичный ответ в зависимости от типа подключения
    if (printer.connectionType === 'network') {
      return { 
        success: true, 
        message: `Режим разработки: Имитация подключения к сетевому принтеру ${printer.name} успешна!` 
      };
    } else {
      return { 
        success: true, 
        message: 'Режим разработки: Имитация подключения к принтеру успешна!' 
      };
    }
  }
  
  // Используем безопасный API из preload-скрипта, если он доступен
  if (window.electronAPI && window.electronAPI.testPrinterConnection) {
    try {
      // Логируем проверку подключения с учетом типа соединения
      if (printer.connectionType === 'network') {
        console.log(`[TEST] Проверка подключения к сетевому принтеру: ${printer.name} (${printer.ip}:${printer.port})`);
      } else {
        console.log('[TEST] Проверка подключения к принтеру:', printer);
      }
      
      const result = await window.electronAPI.testPrinterConnection(printer);
      
      // Дополнительное логирование результата
      if (result.success) {
        console.log(`[TEST] Успешное подключение к принтеру ${printer.name}: ${result.message}`);
      } else {
        console.error(`[TEST] Не удалось подключиться к принтеру ${printer.name}: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      console.error('[TEST] Ошибка при проверке подключения к принтеру:', error);
      return { 
        success: false, 
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка при проверке принтера'}` 
      };
    }
  }
  
  // Если API недоступен
  console.warn('[TEST] API для проверки принтера недоступен');
  return { 
    success: false, 
    message: 'Функция проверки принтера недоступна в текущем окружении' 
  };
};

// Получение списка системных принтеров (Windows, через PowerShell)
export async function getSystemPrinters(): Promise<{ name: string; portName: string; isDefault: boolean }[]> {
  if (window.electronAPI && window.electronAPI.getSystemPrinters) {
    return window.electronAPI.getSystemPrinters();
  }
  // fallback: пустой список
  return [];
}

// RAW печать на выбранный принтер (Windows, через lpr)
export async function printRawToPrinter(printerName: string, rawData: string): Promise<{ success: boolean; message: string }> {
  if (window.electronAPI && window.electronAPI.printRawToPrinter) {
    return window.electronAPI.printRawToPrinter(printerName, rawData);
  }
  return { success: false, message: 'Electron API недоступен' };
}
