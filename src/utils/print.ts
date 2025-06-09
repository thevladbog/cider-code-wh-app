// We use a safe approach to access electron features

import { format } from 'date-fns';

// Интерфейс для параметров печати через Electron API
export interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

export interface PrintOptions {
  template: string;
  count: number;
  printerName?: string;
}

// Remove all serial/usb logic and types, only support network printers
// Use the same interface as defined globally in electron-api.d.ts
export interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb';
  ip?: string;
  port?: number;
  usbPath?: string;
  baudRate?: number;
  isDefault: boolean;
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
        hasDeliveryDate: !!deliveryDate,
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

        // Проверяем и обрабатываем дату доставки
        let deliveryDateObj: Date | null = null;
        let deliveryDateBarcode = '';
        let formattedDeliveryDate = '';

        if (deliveryDate) {
          try {
            // Пытаемся создать объект Date из строки
            deliveryDateObj = new Date(deliveryDate);
            
            // Проверяем, что дата валидна
            if (!isNaN(deliveryDateObj.getTime())) {
              deliveryDateBarcode = format(deliveryDateObj, 'ddMMyy');
              formattedDeliveryDate = format(deliveryDateObj, 'dd.MM. yyyy г.');
            } else {
              console.warn('[PRINT] Предупреждение: Некорректная дата доставки:', deliveryDate);
              deliveryDateBarcode = 'NODATE';
              formattedDeliveryDate = 'Дата не указана';
            }
          } catch (error) {
            console.warn('[PRINT] Ошибка при парсинге даты доставки:', deliveryDate, error);
            deliveryDateBarcode = 'NODATE';
            formattedDeliveryDate = 'Дата не указана';
          }
        } else {
          deliveryDateBarcode = 'NODATE';
          formattedDeliveryDate = 'Дата не указана';
        }

        const pieceNumberBarcode = 'P' + i.toString().padStart(3, '0');
        const orderNumberBarcode =
          deliveryDateBarcode + (orderNumber ? `-${orderNumber}` : '') + pieceNumberBarcode;

        labelContent = labelContent.replace(/{{orderNumberBarcode}}/g, orderNumberBarcode);
        labelContent = labelContent.replace(/{{pieceNumberBarcode}}/g, pieceNumberBarcode);
        labelContent = labelContent.replace(/{{deliveryDateBarcode}}/g, deliveryDateBarcode);

        // Добавляем поля из заказа, если они указаны
        if (orderNumber) labelContent = labelContent.replace(/{{orderNumber}}/g, orderNumber);
        if (consignee) labelContent = labelContent.replace(/{{consignee}}/g, consignee);
        if (address) labelContent = labelContent.replace(/{{address}}/g, address);
        labelContent = labelContent.replace(/{{deliveryDate}}/g, formattedDeliveryDate);

        // Add Swiss721 font selection command if not already present
        // Insert ^A@ command after ^XA if not already added
        if (!labelContent.includes('^A@') && labelContent.includes('^XA')) {
          labelContent = labelContent.replace(/\^XA/g, '^XA\n^A@');
          console.log(`[PRINT] Added ^A@ command for Swiss721 font`);
        }

        // Проверяем, остались ли незамененные плейсхолдеры
        const remainingPlaceholders = labelContent.match(/{{[^}]+}}/g);
        if (remainingPlaceholders) {
          console.warn(
            '[PRINT] Предупреждение: Незамененные плейсхолдеры в шаблоне:',
            remainingPlaceholders
          );
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
          labelCount: labels.length,
        });

        console.log({ labels });

        // Получим список доступных принтеров, чтобы определить способ подключения
        getAvailablePrinters()
          .then(availablePrinters => {
            // Находим выбранный принтер или принтер по умолчанию
            const targetPrinter = printerName
              ? availablePrinters.find(p => p.name === printerName)
              : availablePrinters.find(p => p.isDefault);

            if (targetPrinter) {
              console.log(
                `[PRINT] Печать на принтер ${targetPrinter.name} через ${
                  targetPrinter.connectionType === 'network' ? 'сеть' : 'USB'
                }`
              );
            }

            // Печатаем с использованием API
            return window.electronAPI.printLabels({
              labels,
              printerName,
            });
          })
          .then(result => {
            console.log('[PRINT] Результат печати через IPC:', result ? 'Успешно' : 'Ошибка');
            resolve(result);
          })
          .catch(error => {
            console.error('[PRINT] Ошибка при печати через IPC:', error);
            reject(
              new Error(`Ошибка печати: ${error instanceof Error ? error.message : String(error)}`)
            );
          });
      } else {
        console.warn('[PRINT] electronAPI недоступен, используем заглушку для печати');
        console.log('[PRINT] В режиме разработки печать имитируется');
        setTimeout(() => resolve(true), 1000);
      }
    } catch (error) {
      console.error('[PRINT] Необработанная ошибка при подготовке этикеток:', error);
      reject(
        new Error(
          `Ошибка при подготовке этикеток: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  });
};

// Функция для получения списка доступных принтеров
export const getAvailablePrinters = (): Promise<PrinterConfig[]> => {
  return new Promise(resolve => {
    // Используем безопасный API из preload-скрипта
    if (window.electronAPI) {
      console.log('[CONFIG] Запрос списка принтеров через IPC...');
      window.electronAPI
        .getPrinters()
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

// Функция для тестирования подключения к принтеру
export const testPrinterConnection = async (
  printer: PrinterConfig
): Promise<{ success: boolean; message: string }> => {
  // Проверяем доступность Electron API
  if (!window.electronAPI || !window.electronAPI.testPrinterConnection) {
    console.log(
      '[TEST] Режим разработки или отсутствует API - имитация проверки подключения к принтеру:',
      printer
    );
    // В режиме разработки возвращаем успех с задержкой
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Имитируем более реалистичный ответ в зависимости от типа подключения
    if (printer.connectionType === 'network') {
      return {
        success: true,
        message: `Режим разработки: Имитация подключения к сетевому принтеру ${printer.name} успешна!`,
      };
    } else {
      return {
        success: true,
        message: 'Режим разработки: Имитация подключения к принтеру успешна!',
      };
    }
  }

  // Используем безопасный API из preload-скрипта, если он доступен
  if (window.electronAPI && window.electronAPI.testPrinterConnection) {
    try {
      // Логируем проверку подключения с учетом типа соединения
      if (printer.connectionType === 'network') {
        console.log(
          `[TEST] Проверка подключения к сетевому принтеру: ${printer.name} (${printer.ip}:${printer.port})`
        );
      } else {
        console.log('[TEST] Проверка подключения к принтеру:', printer);
      }

      const result = await window.electronAPI.testPrinterConnection(printer);

      // Дополнительное логирование результата
      if (result.success) {
        console.log(`[TEST] Успешное подключение к принтеру ${printer.name}: ${result.message}`);
      } else {
        console.error(
          `[TEST] Не удалось подключиться к принтеру ${printer.name}: ${result.message}`
        );
      }

      return result;
    } catch (error) {
      console.error('[TEST] Ошибка при проверке подключения к принтеру:', error);
      return {
        success: false,
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка при проверке принтера'}`,
      };
    }
  }

  // Если API недоступен
  console.warn('[TEST] API для проверки принтера недоступен');
  return {
    success: false,
    message: 'Функция проверки принтера недоступна в текущем окружении',
  };
};

// Получение списка системных принтеров (Windows, через PowerShell)
export async function getSystemPrinters(): Promise<
  { name: string; portName: string; isDefault: boolean }[]
> {
  if (window.electronAPI && window.electronAPI.getSystemPrinters) {
    return window.electronAPI.getSystemPrinters();
  }
  // fallback: пустой список
  return [];
}

// RAW печать на выбранный принтер (Windows, через lpr)
export async function printRawToPrinter(
  printerName: string,
  rawData: string
): Promise<{ success: boolean; message: string }> {
  if (window.electronAPI && window.electronAPI.printRawToPrinter) {
    return window.electronAPI.printRawToPrinter(printerName, rawData);
  }
  return { success: false, message: 'Electron API недоступен' };
}
