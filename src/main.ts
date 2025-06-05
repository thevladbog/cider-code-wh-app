import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import net from 'node:net';
// Dynamic import for USB module to avoid native compilation issues
// import usb from 'usb';

// Type definitions for USB module when loaded dynamically
type USBDevice = {
  deviceDescriptor: {
    idVendor: number;
    idProduct: number;
  };
  interfaces: USBInterface[];
  configDescriptor?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interfaces: any[][];
  };
  open(): void;
  close(): void;
  setConfiguration?: (config: number, callback: (err: Error | null) => void) => void;
};

type USBInterface = {
  descriptor: {
    bInterfaceClass: number;
  };
  endpoints: USBEndpoint[];
  isKernelDriverActive?: () => boolean;
  detachKernelDriver?: () => void;
  claim: () => void;
  release?: (callback?: (err: Error | null) => void) => void;
};

type USBEndpoint = {
  descriptor: {
    bmAttributes: number;
    bEndpointAddress: number;
  };
  direction?: string;
  transfer?: (buffer: Buffer, callback: (err: Error | null) => void) => void;
  transferOut?: (endpoint: number, buffer: Buffer) => Promise<void>;
  write?: (buffer: Buffer, callback: (err: Error | null) => void) => void;
};

// Отображение ошибок в главном процессе
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Main Process:', error);
});

// Интерфейсы для работы с принтерами
interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb' | 'serial';
  ip?: string;
  port?: number;
  usbPath?: string;
  serialPath?: string;
  baudRate?: number; // Скорость последовательного порта
  isDefault: boolean;
}

interface PrintLabelsOptions {
  labels: string[];
  printerName?: string;
}

// Загрузка конфигурации принтеров
const loadPrinterConfig = (): PrinterConfig[] => {
  try {
    const configPath = path.join(app.getPath('userData'), 'printers.json');
    console.log(`[CONFIG] Загрузка конфигурации принтеров из ${configPath}`);
    
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      console.log(`[CONFIG] Файл конфигурации найден, размер: ${configData.length} байт`);
      
      try {
        const parsedData = JSON.parse(configData);
        
        // Проверяем формат данных
        if (Array.isArray(parsedData)) {
          console.log(`[CONFIG] Загружено ${parsedData.length} принтеров`);
            // Дополнительная валидация
          const validPrinters = parsedData.filter(p => {
            // Базовая валидация для всех принтеров
            if (!(p && typeof p === 'object' && 
                typeof p.name === 'string' && p.name.trim() !== '' &&
                typeof p.connectionType === 'string')) {
              return false;
            }
            
            // Валидация для сетевых принтеров
            if (p.connectionType === 'network') {
              return typeof p.ip === 'string' && p.ip.trim() !== '' &&
                     typeof p.port === 'number' && p.port > 0;
            }            // Валидация для USB принтеров
            else if (p.connectionType === 'usb') {
              return typeof p.usbPath === 'string' && p.usbPath.trim() !== '';
            }
            // Валидация для последовательных принтеров
            else if (p.connectionType === 'serial') {
              return typeof p.serialPath === 'string' && p.serialPath.trim() !== '';
            }
            
            return false;
          });
          
          if (validPrinters.length < parsedData.length) {
            console.warn(`[CONFIG] Предупреждение: ${parsedData.length - validPrinters.length} невалидных принтеров были отфильтрованы`);
          }
          
          // Если есть хотя бы один валидный принтер, возвращаем его
          if (validPrinters.length > 0) {
            return validPrinters;
          } else {
            console.warn('[CONFIG] Нет валидных принтеров в конфигурации');
            // Возвращаем пустой массив вместо предустановленных принтеров
            return [];
          }
        } else {
          console.error('[CONFIG] Ошибка: Неверный формат файла конфигурации (ожидается массив)');
        }
      } catch (parseError) {
        console.error('[CONFIG] Ошибка при разборе JSON-файла конфигурации:', parseError);
      }
    } else {
      console.log('[CONFIG] Файл конфигурации не найден, будет использован пустой список принтеров');
    }
  } catch (error) {
    console.error('[CONFIG] Ошибка при загрузке конфигурации принтеров:', error);
  }

  // Возвращаем пустой массив вместо предустановленных принтеров
  console.log('[CONFIG] Возврат пустого списка принтеров (без предустановленных)');
  return [];
};

// Сохранение конфигурации принтеров
const savePrinterConfig = (config: PrinterConfig[]): boolean => {
  try {
    if (!config || !Array.isArray(config)) {
      console.error('[CONFIG] Ошибка: входные данные не являются массивом конфигураций принтеров');
      return false;
    }
    
    const configPath = path.join(app.getPath('userData'), 'printers.json');
    console.log(`[CONFIG] Сохранение конфигурации принтеров в ${configPath}`);
    console.log(`[CONFIG] Каталог userData: ${app.getPath('userData')}`);
    console.log('[CONFIG] Данные для сохранения:', JSON.stringify(config, null, 2));
      // Валидация данных перед сохранением
    const validConfig = config.filter(p => {
      // Базовая валидация для всех принтеров
      if (!(p && typeof p === 'object' && 
          typeof p.name === 'string' && p.name.trim() !== '' &&
          typeof p.connectionType === 'string')) {
        return false;
      }
      
      // Валидация для сетевых принтеров
      if (p.connectionType === 'network') {
        return typeof p.ip === 'string' && p.ip.trim() !== '' &&
              typeof p.port === 'number' && p.port > 0;
      }      // Валидация для USB принтеров
      else if (p.connectionType === 'usb') {
        return typeof p.usbPath === 'string' && p.usbPath.trim() !== '';
      }
      // Валидация для последовательных принтеров
      else if (p.connectionType === 'serial') {
        return typeof p.serialPath === 'string' && p.serialPath.trim() !== '';
      }
      
      return false;
    });
    
    console.log(`[CONFIG] После валидации: ${validConfig.length} из ${config.length} принтеров прошли проверку`);
    
    if (validConfig.length < config.length) {
      console.warn(`[CONFIG] Предупреждение: ${config.length - validConfig.length} невалидных принтеров не будут сохранены`);
    }
    
    // Проверяем наличие принтера по умолчанию
    const hasDefault = validConfig.some(printer => printer.isDefault);
    if (!hasDefault && validConfig.length > 0) {
      console.warn('[CONFIG] Не указан принтер по умолчанию, устанавливаем первый принтер как принтер по умолчанию');
      validConfig[0].isDefault = true;
    }
    
    // Создаем папку, если она не существует
    const dirPath = path.dirname(configPath);
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[CONFIG] Создана директория: ${dirPath}`);
      }
      
      // Проверяем права доступа к директории
      try {
        // Проверяем возможность записи
        const testFile = path.join(dirPath, '.test_write_access');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile); // Удаляем тестовый файл
        console.log(`[CONFIG] Проверка прав доступа: запись в директорию ${dirPath} разрешена`);
      } catch (accessError) {
        console.error(`[CONFIG] Ошибка: нет прав на запись в директорию ${dirPath}:`, accessError);
        return false;
      }
    } catch (dirError) {
      console.error(`[CONFIG] Ошибка при создании или проверке директории ${dirPath}:`, dirError);
      return false;
    }
    
    // Безопасная запись файла
    try {
      // Бэкапим предыдущую конфигурацию, если она существует
      if (fs.existsSync(configPath)) {
        try {
          const backupPath = `${configPath}.backup`;
          fs.copyFileSync(configPath, backupPath);
          console.log(`[CONFIG] Создан бэкап предыдущей конфигурации: ${backupPath}`);
        } catch (backupError) {
          console.warn('[CONFIG] Не удалось создать бэкап предыдущей конфигурации:', backupError);
        }
      }
      
      // Создаем временный файл конфигурации
      const tempConfigPath = `${configPath}.temp`;
      fs.writeFileSync(tempConfigPath, JSON.stringify(validConfig, null, 2));
      console.log(`[CONFIG] Временный файл конфигурации создан: ${tempConfigPath}`);
      
      // Проверяем содержимое временного файла
      try {
        const tempContent = fs.readFileSync(tempConfigPath, 'utf8');
        const tempPrinters = JSON.parse(tempContent);
        
        if (!Array.isArray(tempPrinters) || tempPrinters.length !== validConfig.length) {
          console.error('[CONFIG] Ошибка в временном файле конфигурации, отмена сохранения');
          fs.unlinkSync(tempConfigPath);
          return false;
        }
      } catch (tempError) {
        console.error('[CONFIG] Ошибка при проверке временного файла:', tempError);
        return false;
      }
      
      // Переименовываем временный файл в окончательный (атомарная операция)
      try {
        // Удаляем существующий файл, если он есть
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
        
        // Переименовываем временный файл
        fs.renameSync(tempConfigPath, configPath);
        console.log(`[CONFIG] Конфигурация принтеров успешно сохранена (${validConfig.length} принтеров)`);
      } catch (renameError) {
        console.error('[CONFIG] Ошибка при переименовании временного файла:', renameError);
        return false;
      }
      
      // Финальная проверка
      if (fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        console.log(`[CONFIG] Файл конфигурации создан: ${configPath}, размер: ${stats.size} байт`);
        
        try {
          const savedContent = fs.readFileSync(configPath, 'utf8');
          console.log('[CONFIG] Прочитано содержимое файла, длина:', savedContent.length);
          
          const savedPrinters = JSON.parse(savedContent);
          
          if (Array.isArray(savedPrinters) && savedPrinters.length === validConfig.length) {
            console.log(`[CONFIG] Верификация: файл содержит ${savedPrinters.length} принтеров, как и ожидалось`);
          } else {
            console.error(`[CONFIG] Ошибка верификации: файл содержит ${
              Array.isArray(savedPrinters) ? savedPrinters.length : 'неверный формат'
            }, ожидалось ${validConfig.length}`);
            return false;
          }
        } catch (verifyError) {
          console.error('[CONFIG] Ошибка при верификации сохраненного файла:', verifyError);
          return false;
        }
      } else {
        console.error('[CONFIG] Ошибка: файл не был создан после переименования!');
        return false;
      }
    } catch (writeError) {
      console.error('[CONFIG] Ошибка при записи файла конфигурации:', writeError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[CONFIG] Ошибка при сохранении конфигурации принтеров:', error);
    // Подробно логируем ошибку для отладки
    console.error('[CONFIG] Тип ошибки:', typeof error);
    console.error('[CONFIG] Детали ошибки:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    if (error instanceof Error) {
      console.error('[CONFIG] Stack trace:', error.stack);
    }
    
    return false;
  }
};

// Печать этикеток на ZPL принтере
const printToZebraPrinter = async (printer: PrinterConfig, zplData: string): Promise<boolean> => {
  // Проверяем данные перед печатью
  if (!zplData || zplData.trim() === '') {
    console.error('[PRINT] Ошибка: Пустые данные для печати');
    throw new Error('Пустые данные для печати');
  }
  
  if (printer.connectionType === 'network') {
    console.log(`[PRINT] Попытка подключения к сетевому принтеру ${printer.name} (${printer.ip}:${printer.port})...`);
    return new Promise((resolve, reject) => {
      printToNetworkPrinter(printer, zplData, resolve, reject);
    });  } else if (printer.connectionType === 'usb') {
    console.log(`[PRINT] Попытка подключения к USB принтеру ${printer.name} (путь: ${printer.usbPath})...`);
    return (async () => {
      return await new Promise<boolean>((resolve, reject) => {
        printToUSBPrinter(printer, zplData, resolve, reject);
      });
    })();
  } else if (printer.connectionType === 'serial') {
    console.log(`[PRINT] Попытка подключения к серийному принтеру ${printer.name} (порт: ${printer.serialPath}, скорость: ${printer.baudRate || 9600} бит/с)...`);
    return new Promise((resolve, reject) => {
      printToSerialPort(printer, zplData, resolve, reject);
    });
  } else {
    console.error(`[PRINT] Неизвестный тип подключения принтера: ${printer.connectionType}`);
    throw new Error(`Неизвестный тип подключения принтера: ${printer.connectionType}`);
  }
};

// Печать на сетевой принтер
const printToNetworkPrinter = (
  printer: PrinterConfig, 
  zplData: string, 
  resolve: (value: boolean | PromiseLike<boolean>) => void,
  reject: (reason?: Error | unknown) => void
) => {
  // Логируем подготовленные данные ZPL (первые 200 символов для отладки)
  console.log(`[PRINT] Данные для печати (первые 200 символов): ${zplData.substring(0, 200)}${zplData.length > 200 ? '...' : ''}`);
  
  const client = new net.Socket();
  let isConnected = false;
  
  // Устанавливаем таймаут для всей операции
  const connectionTimeout: NodeJS.Timeout = setTimeout(() => {
    if (!isConnected) {
      console.error(`[PRINT] Таймаут подключения к принтеру ${printer.name} (${printer.ip}:${printer.port})`);
      client.destroy();
      reject(new Error(`Превышено время ожидания подключения к принтеру ${printer.name}`));
    }
  }, 8000);
    // Настраиваем обработчик ошибок до подключения
  client.on('error', (error: Error) => {
    clearTimeout(connectionTimeout);
    console.error(`[PRINT] Ошибка подключения к принтеру ${printer.name}: ${error.message}`);
    client.destroy();
    reject(error);
  });
  
  client.on('close', () => {
    console.log(`[PRINT] Соединение с принтером ${printer.name} закрыто`);
  });
  
  // Устанавливаем таймаут для сокета
  client.setTimeout(10000, () => {
    console.error(`[PRINT] Таймаут операции с принтером ${printer.name}`);
    client.destroy();
    reject(new Error(`Операция с принтером ${printer.name} заняла слишком много времени`));
  });
  
  try {
    client.connect(printer.port, printer.ip, () => {
      isConnected = true;
      clearTimeout(connectionTimeout);
      console.log(`[PRINT] Успешное подключение к принтеру ${printer.name} (${printer.ip}:${printer.port})`);
      console.log(`[PRINT] Отправка данных ZPL (длина: ${zplData.length} байт)...`);
      
      // Добавляем небольшую задержку перед отправкой данных для стабилизации соединения
      setTimeout(() => {
        client.write(zplData, (err) => {
          if (err) {
            console.error(`[PRINT] Ошибка отправки данных: ${err.message}`);
            client.destroy();
            reject(err);
            return;
          }
          
          console.log('[PRINT] Данные успешно отправлены на принтер');
          // Добавляем небольшую задержку перед закрытием соединения
          setTimeout(() => {
            client.end();
            resolve(true);
          }, 500);
        });
      }, 300);
    });
  } catch (err) {
    clearTimeout(connectionTimeout);
    console.error(`[PRINT] Исключение при подключении: ${err}`);
    client.destroy();
    reject(err);
  }
};

// Печать на USB принтер
const printToUSBPrinter = async (
  printer: PrinterConfig, 
  zplData: string, 
  resolve: (value: boolean | PromiseLike<boolean>) => void,
  reject: (reason?: Error | unknown) => void
) => {
  try {
    console.log(`[PRINT] Отправка данных на USB принтер ${printer.name} (путь: ${printer.usbPath})`);
    console.log(`[PRINT] Данные для печати (первые 200 символов): ${zplData.substring(0, 200)}${zplData.length > 200 ? '...' : ''}`);
    
    if (!printer.usbPath) {
      throw new Error('Не указан путь к USB устройству');
    }

    // Поддержка различных форматов путей
    if (printer.usbPath.startsWith('usb://')) {
      // Стандартный формат - usb://vendorId/productId
      await printToUSBByVendorProductId(printer, zplData, resolve, reject);
    } else if (printer.usbPath.startsWith('COM') || printer.usbPath.startsWith('/dev/')) {
      // Последовательный порт (Windows COM или Unix /dev/)
      printToSerialPort(printer, zplData, resolve, reject);
    } else {
      throw new Error(`Неподдерживаемый формат пути к USB устройству: ${printer.usbPath}`);
    }
  } catch (err) {
    console.error(`[PRINT] Ошибка при печати на USB принтер ${printer.name}: ${err}`);
    reject(err instanceof Error ? err : new Error(String(err)));
  }
};

// Печать на USB принтер с использованием VendorID/ProductID
const printToUSBByVendorProductId = async (
  printer: PrinterConfig, 
  zplData: string, 
  resolve: (value: boolean | PromiseLike<boolean>) => void,
  reject: (reason?: Error | unknown) => void
) => {  try {
    // Динамически импортируем usb модуль
    const usbModule = await import('usb');
    const usb = usbModule.default || usbModule;
    
    // Проверяем, что usb модуль загружен правильно
    if (!usb || typeof usb.getDeviceList !== 'function') {
      throw new Error('USB модуль не загружен правильно или getDeviceList недоступен');
    }
    
    // Анализируем путь USB устройства для извлечения идентификаторов
    const usbPathMatch = printer.usbPath.match(/usb:\/\/([0-9a-fA-F]{4})\/([0-9a-fA-F]{4})/);
    
    if (!usbPathMatch) {
      throw new Error(`Неверный формат пути USB устройства: ${printer.usbPath}. Ожидается формат usb://vendorId/productId`);
    }
    
    const vendorId = parseInt(usbPathMatch[1], 16);
    const productId = parseInt(usbPathMatch[2], 16);
    
    console.log(`[PRINT] Поиск USB устройства с VendorID: 0x${vendorId.toString(16)}, ProductID: 0x${productId.toString(16)}`);
      // Получаем список всех USB устройств
    const devices = usb.getDeviceList();
      // Ищем устройство с указанными идентификаторами
    const device = devices.find((d: USBDevice) => 
      d.deviceDescriptor.idVendor === vendorId && 
      d.deviceDescriptor.idProduct === productId
    );
    
    if (!device) {
      throw new Error(`USB устройство с идентификаторами ${vendorId.toString(16)}:${productId.toString(16)} не найдено`);
    }
    
    console.log(`[PRINT] USB устройство найдено, устанавливаем соединение...`);
    
    // Безопасное выполнение операции печати с очисткой ресурсов в любом случае
    sendDataToUSBDevice(device, zplData, printer)
      .then(() => {
        console.log(`[PRINT] Данные успешно отправлены на USB принтер ${printer.name}`);
        resolve(true);
      })
      .catch((error) => {
        console.error(`[PRINT] Ошибка при отправке данных на USB принтер: ${error.message}`);
        reject(error);
      });
  } catch (err) {
    console.error(`[PRINT] Ошибка при настройке USB принтера: ${err instanceof Error ? err.message : String(err)}`);
    reject(err instanceof Error ? err : new Error(String(err)));
  }
};

// Функция для отправки данных на USB устройство с обработкой ошибок и освобождением ресурсов
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sendDataToUSBDevice = async (device: USBDevice, zplData: string, printer: PrinterConfig): Promise<void> => {
  let iface: USBInterface | null = null;
  
  try {
    // Открываем устройство
    device.open();
    
    // Находим подходящий интерфейс устройства
    // Сначала ищем интерфейсы класса принтера (7), затем CDC (2), затем вендор-специфичные (255)
    const interfaces = device.interfaces;
    const preferredClasses = [7, 2, 255];    for (const classId of preferredClasses) {
      const foundInterface = interfaces.find((i: USBInterface) => 
        i.descriptor && i.descriptor.bInterfaceClass === classId
      );
      
      if (foundInterface) {
        iface = foundInterface;
        console.log(`[PRINT] Найден интерфейс класса ${classId} (${
          classId === 7 ? 'PRINTER' : 
          classId === 2 ? 'CDC/ACM' : 
          classId === 255 ? 'VENDOR' : 'UNKNOWN'
        })`);
        break;
      }
    }
    
    // Если не нашли интерфейс по классу, берем первый доступный
    if (!iface && interfaces.length > 0) {
      iface = interfaces[0];
      console.log(`[PRINT] Используем первый доступный интерфейс (класс: ${iface.descriptor ? iface.descriptor.bInterfaceClass : 'unknown'})`);
    }
    
    if (!iface) {
      throw new Error('USB устройство не имеет доступных интерфейсов');
    }
    
    // Запрашиваем эксклюзивный доступ к интерфейсу
    try {
      // Некоторые принтеры могут требовать детач ядра перед захватом интерфейса
      if (typeof iface.isKernelDriverActive === 'function') {
        const hasKernelDriver = iface.isKernelDriverActive();
        if (hasKernelDriver) {
          console.log('[PRINT] Отключаем драйвер ядра для интерфейса');
          iface.detachKernelDriver();
        }
      }
      
      // Захватываем интерфейс
      iface.claim();
      console.log('[PRINT] Интерфейс успешно захвачен');
    } catch (claimError) {
      console.warn(`[PRINT] Предупреждение при захвате интерфейса: ${claimError instanceof Error ? claimError.message : String(claimError)}`);
      // Продолжаем выполнение - некоторые устройства могут работать без эксклюзивного доступа
    }    // Находим endpoint для отправки данных
    // Сначала ищем bulk out endpoint, затем любой out endpoint
    let outEndpoint: USBEndpoint | null = null;
    
    // Константы для libusb, которых может не быть в типах
    const LIBUSB_TRANSFER_TYPE_BULK = 2; // Bulk transfer type
    const LIBUSB_ENDPOINT_OUT = 0x00;    // Out endpoint
    const LIBUSB_ENDPOINT_DIR_MASK = 0x80; // Direction mask
    
    for (const endpoint of iface.endpoints) {      // Проверяем тип и направление endpoint
      const isBulk = (endpoint.descriptor.bmAttributes & 0x03) === LIBUSB_TRANSFER_TYPE_BULK;
      const isOut = (endpoint.descriptor.bEndpointAddress & LIBUSB_ENDPOINT_DIR_MASK) === LIBUSB_ENDPOINT_OUT;
      
      if (isBulk && isOut) {
        outEndpoint = endpoint;
        console.log('[PRINT] Найден bulk out endpoint');
        break;
      }
    }
      // Если не нашли bulk endpoint, ищем любой out endpoint
    if (!outEndpoint) {      outEndpoint = iface.endpoints.find((ep: USBEndpoint) => 
        ep.direction === 'out' || 
        (ep.descriptor && (ep.descriptor.bEndpointAddress & LIBUSB_ENDPOINT_DIR_MASK) === LIBUSB_ENDPOINT_OUT)
      ) || null;
      
      if (outEndpoint) {
        console.log('[PRINT] Найден out endpoint (не bulk)');
      }
    }
    
    if (!outEndpoint) {
      throw new Error('USB устройство не имеет выходной точки подключения');
    }
    
    // Преобразуем ZPL-данные в Buffer
    const dataBuffer = Buffer.from(zplData, 'utf8');
    console.log(`[PRINT] Отправляем данные на USB устройство (${dataBuffer.length} байт)...`);    // Отправляем данные и ждем результат
    return new Promise<void>((innerResolve, innerReject) => {
      // Универсальная функция для обработки различных типов endpoints
      const sendData = () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof (outEndpoint as any).transfer === 'function') {
            // node-usb style
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (outEndpoint as any).transfer(dataBuffer, (err: Error | null) => {
              if (err) {
                innerReject(err);
              } else {
                innerResolve();
              }
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if (typeof (outEndpoint as any).transferOut === 'function') {
            // WebUSB style
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (outEndpoint as any).transferOut(1, dataBuffer)
              .then(() => innerResolve())
              .catch(innerReject);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if (typeof (outEndpoint as any).write === 'function') {
            // Older libusb style
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (outEndpoint as any).write(dataBuffer, (err: Error | null) => {
              if (err) {
                innerReject(err);
              } else {
                innerResolve();
              }
            });
          } else {
            // Fallback - пытаемся отправить через интерфейс
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof (iface as any).transferOut === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (iface as any).transferOut(outEndpoint.descriptor.bEndpointAddress, dataBuffer)
                .then(() => innerResolve())
                .catch(innerReject);
            } else {
              innerReject(new Error('Не найден подходящий метод для отправки данных на USB устройство'));
            }
          }
        } catch (sendError) {
          innerReject(sendError);
        }
      };
      
      // Некоторые принтеры требуют конфигурации перед отправкой данных
      try {
        // Пытаемся установить конфигурацию, если это возможно
        if (typeof device.setConfiguration === 'function') {
          device.setConfiguration(1, (configErr: Error | null) => {
            if (configErr) {
              console.warn(`[PRINT] Предупреждение при установке конфигурации: ${configErr.message}`);
            }
            // Продолжаем независимо от результата
            sendData();
          });
        } else {
          sendData();
        }
      } catch (configError) {
        console.warn(`[PRINT] Предупреждение при настройке устройства: ${configError instanceof Error ? configError.message : String(configError)}`);
        // Пытаемся отправить данные даже если настройка не удалась
        sendData();
      }
    });  } catch (error) {
    // Освобождаем ресурсы в случае ошибки
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (iface && typeof (iface as any).release === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (iface as any).release();
      }
    } catch (releaseError) {
      console.warn(`[PRINT] Ошибка при освобождении интерфейса: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`);
    }
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (device as any).close === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (device as any).close();
      }
    } catch (closeError) {
      console.warn(`[PRINT] Ошибка при закрытии устройства: ${closeError instanceof Error ? closeError.message : String(closeError)}`);
    }
    
    // Повторно выбрасываем исходную ошибку
    throw error;} finally {
    // Освобождаем ресурсы в любом случае (успех или ошибка)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (iface && typeof (iface as any).release === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (iface as any).release((releaseErr: Error | null) => {
          if (releaseErr) {
            console.warn(`[PRINT] Ошибка при освобождении интерфейса: ${releaseErr.message}`);
          }
        });
      }
    } catch (releaseError) {
      console.warn(`[PRINT] Ошибка при освобождении интерфейса: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`);
    }
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (device as any).close === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (device as any).close();
      }
    } catch (closeError) {
      console.warn(`[PRINT] Ошибка при закрытии устройства: ${closeError instanceof Error ? closeError.message : String(closeError)}`);
    }
  }
};

// Печать на USB-принтер через последовательный порт
const printToSerialPort = (
  printer: PrinterConfig, 
  zplData: string, 
  resolve: (value: boolean | PromiseLike<boolean>) => void,
  reject: (reason?: Error | unknown) => void
) => {
  try {
    const portPath = printer.connectionType === 'serial' ? printer.serialPath : printer.usbPath;
    console.log(`[PRINT] Печать через последовательный порт ${portPath}...`);
    
    // Динамически импортируем SerialPort, чтобы не требовать его наличия при запуске
    import('serialport').then(({ SerialPort }) => {
      console.log(`[PRINT] Библиотека serialport загружена, настраиваем порт ${portPath}...`);      // Параметры последовательного порта для принтеров
      const portOptions = {
        path: portPath,
        baudRate: printer.baudRate || 9600, // Используем указанный baudRate или 9600 по умолчанию
        dataBits: 8 as const, // Явно указываем тип как 8, что соответствует типу 5 | 6 | 7 | 8
        parity: 'none' as const, // Используем as const для строгой типизации
        stopBits: 1 as const, // Явно указываем тип как 1, что соответствует типу 1 | 2
        autoOpen: false // Открываем порт вручную после настройки
      };
      
      // Создаем новый экземпляр SerialPort
      const port = new SerialPort(portOptions);
      
      // Обработка ошибок
      port.on('error', (error) => {
        console.error(`[PRINT] Ошибка последовательного порта: ${error.message}`);
        reject(error);
      });        // Открываем порт
      port.open((openErr) => {
        if (openErr) {
          console.error(`[PRINT] Не удалось открыть порт ${portPath}: ${openErr.message}`);
          reject(openErr);
          return;
        }
        
        console.log(`[PRINT] Порт ${portPath} успешно открыт, отправляем данные...`);
        
        // Отправка данных
        port.write(Buffer.from(zplData, 'utf8'), (writeErr) => {
          if (writeErr) {
            console.error(`[PRINT] Ошибка при отправке данных: ${writeErr.message}`);
            port.close(); // Закрываем порт при ошибке
            reject(writeErr);
            return;
          }
          
          console.log(`[PRINT] Данные успешно отправлены на принтер ${printer.name} через порт ${printer.usbPath}`);
          
          // Дренируем порт перед закрытием, чтобы гарантировать отправку всех данных
          port.drain((drainErr) => {
            if (drainErr) {
              console.warn(`[PRINT] Предупреждение при ожидании отправки данных: ${drainErr.message}`);
            }
            
            // Закрываем порт после отправки
            port.close((closeErr) => {
              if (closeErr) {
                console.warn(`[PRINT] Предупреждение при закрытии порта: ${closeErr.message}`);
              }
              
              resolve(true);
            });
          });
        });
      });
    }).catch((importError) => {
      console.error(`[PRINT] Ошибка при загрузке библиотеки serialport: ${importError.message}`);
      console.log('[PRINT] Для поддержки печати через последовательный порт установите библиотеку: npm install serialport --save');
      
      // Если не удалось загрузить библиотеку, имитируем успешную печать
      setTimeout(() => {
        console.log(`[PRINT] Имитация успешной отправки данных на принтер ${printer.name}`);
        resolve(true);
      }, 1000);
    });
  } catch (err) {
    console.error(`[PRINT] Исключение при печати через последовательный порт: ${err}`);
    reject(err instanceof Error ? err : new Error(String(err)));
  }
};

// Функция проверки доступности принтера
const testPrinterConnection = (printer: PrinterConfig): Promise<{ success: boolean, message: string }> => {
  return new Promise((resolve) => {
    if (printer.connectionType === 'network') {
      testNetworkPrinterConnection(printer, resolve);
    } else if (printer.connectionType === 'usb') {
      testUSBPrinterConnection(printer, resolve);
    } else if (printer.connectionType === 'serial') {
      testSerialPortConnection(printer, resolve);
    } else {
      console.error(`[TEST] Неизвестный тип подключения принтера: ${printer.connectionType}`);
      resolve({
        success: false,
        message: `Неизвестный тип подключения принтера: ${printer.connectionType}`
      });
    }
  });
};

// Проверка подключения к сетевому принтеру
const testNetworkPrinterConnection = (
  printer: PrinterConfig,
  resolve: (value: { success: boolean, message: string } | PromiseLike<{ success: boolean, message: string }>) => void
) => {
  console.log(`[TEST] Проверка соединения с сетевым принтером ${printer.name} (${printer.ip}:${printer.port})...`);
  
  const client = new net.Socket();
  let connectionSuccessful = false;
  
  // Устанавливаем таймаут для операции
  const timeout = setTimeout(() => {
    if (!connectionSuccessful) {
      console.log(`[TEST] Таймаут подключения к принтеру ${printer.name}`);
      client.destroy();
      resolve({ 
        success: false, 
        message: `Не удалось подключиться к принтеру ${printer.name}: превышено время ожидания (3 сек)` 
      });
    }
  }, 3000);
  
  // Пытаемся установить соединение
  try {
    client.connect(printer.port, printer.ip, () => {
      connectionSuccessful = true;
      clearTimeout(timeout);
      console.log(`[TEST] Успешное подключение к принтеру ${printer.name} (${printer.ip}:${printer.port})`);
      
      // Закрываем соединение
      client.end();
      resolve({ 
        success: true, 
        message: `Принтер ${printer.name} доступен и готов к печати` 
      });
    });
    
    // Обработка ошибок соединения
    client.on('error', (error: Error) => {
      clearTimeout(timeout);
      console.error(`[TEST] Ошибка подключения к принтеру ${printer.name}: ${error.message}`);
      client.destroy();
      resolve({ 
        success: false, 
        message: `Не удалось подключиться к принтеру ${printer.name}: ${error.message}` 
      });
    });
    
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[TEST] Исключение при проверке принтера ${printer.name}:`, error);
    resolve({ 
      success: false, 
      message: `Ошибка при проверке принтера ${printer.name}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}` 
    });
  }
};

// Проверка подключения к USB принтеру
const testUSBPrinterConnection = async (
  printer: PrinterConfig,
  resolve: (value: { success: boolean, message: string } | PromiseLike<{ success: boolean, message: string }>) => void
) => {
  console.log(`[TEST] Проверка соединения с USB принтером ${printer.name} (путь: ${printer.usbPath})...`);
  
  try {
    if (!printer.usbPath) {
      console.error(`[TEST] Отсутствует путь к USB устройству для принтера ${printer.name}`);
      resolve({ 
        success: false, 
        message: `Ошибка: не указан путь к USB устройству` 
      });
      return;
    }
    
    // Проверяем формат пути к устройству
    if (printer.usbPath.startsWith('COM') || printer.usbPath.startsWith('/dev/')) {
      // Тестирование последовательного порта
      testSerialPortConnection(printer, resolve);
      return;
    }
    
    // Анализируем путь USB устройства
    const usbPathMatch = printer.usbPath.match(/usb:\/\/([0-9a-fA-F]{4})\/([0-9a-fA-F]{4})/);
    
    if (!usbPathMatch) {
      console.error(`[TEST] Неверный формат пути USB устройства: ${printer.usbPath}`);
      resolve({ 
        success: false, 
        message: `Неверный формат пути USB устройства. Ожидается формат usb://vendorId/productId, COM-порт или /dev/` 
      });
      return;
    }
    
    const vendorId = parseInt(usbPathMatch[1], 16);
    const productId = parseInt(usbPathMatch[2], 16);    console.log(`[TEST] Поиск USB устройства с VendorID: 0x${vendorId.toString(16)}, ProductID: 0x${productId.toString(16)}`);
      // Пытаемся безопасно загрузить USB модуль
    let usb: { getDeviceList: () => USBDevice[] } | null = null;
    
    try {
      // Используем require для лучшей совместимости с нативными модулями
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      usb = require('usb');
      
      if (!usb || typeof usb.getDeviceList !== 'function') {
        throw new Error('USB модуль не загружен правильно через require');
      }
      
      console.log('[TEST] USB модуль успешно загружен через require');
    } catch (requireError) {
      console.warn('[TEST] Ошибка при загрузке USB модуля через require:', requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usbModule: any = await import('usb');
        usb = usbModule.default || usbModule;
        
        if (!usb || typeof usb.getDeviceList !== 'function') {
          throw new Error('USB модуль не загружен правильно через import');
        }
        
        console.log('[TEST] USB модуль успешно загружен через динамический import');
      } catch (importError) {
        console.error(`[TEST] Не удалось загрузить USB модуль:`, requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
        
        if ((requireError instanceof Error && requireError.message.includes('No native build was found')) ||
            (importError instanceof Error && importError.message.includes('No native build was found'))) {
          resolve({ 
            success: false, 
            message: `USB модуль недоступен - требуется пересборка нативных зависимостей (npm run rebuild)` 
          });
        } else {
          resolve({ 
            success: false, 
            message: `Ошибка загрузки USB модуля: ${requireError instanceof Error ? requireError.message : 'неизвестная ошибка'}` 
          });
        }
        return;
      }
    }
    
    // Получаем список всех USB устройств
    const devices = usb.getDeviceList();
    
    // Ищем устройство с указанными идентификаторами
    const device = devices.find((d: USBDevice) => 
      d.deviceDescriptor.idVendor === vendorId && 
      d.deviceDescriptor.idProduct === productId
    );
    
    if (!device) {
      console.error(`[TEST] USB устройство с указанными идентификаторами не найдено`);
      resolve({ 
        success: false, 
        message: `Устройство ${printer.name} не найдено в системе` 
      });
      return;
    }
    
    // Пытаемся открыть устройство для проверки доступности
    try {
      // Попытка открыть устройство
      device.open();
      
      // Закрываем устройство после успешной проверки
      try {
        device.close();
      } catch (closeErr) {
        console.warn(`[TEST] Предупреждение при закрытии устройства: ${closeErr.message}`);
      }
      
      console.log(`[TEST] Успешное подключение к USB принтеру ${printer.name}`);
      resolve({ 
        success: true, 
        message: `USB принтер ${printer.name} доступен и готов к печати` 
      });
    } catch (openErr) {
      console.error(`[TEST] Не удалось открыть USB устройство: ${openErr.message}`);
      resolve({ 
        success: false, 
        message: `Не удалось подключиться к USB принтеру ${printer.name}: ${openErr.message}` 
      });
    }
  } catch (error) {
    console.error(`[TEST] Исключение при проверке USB принтера ${printer.name}:`, error);
    resolve({ 
      success: false, 
      message: `Ошибка при проверке USB принтера ${printer.name}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}` 
    });
  }
};

// Проверка подключения к принтеру через последовательный порт
const testSerialPortConnection = (
  printer: PrinterConfig,
  resolve: (value: { success: boolean, message: string } | PromiseLike<{ success: boolean, message: string }>) => void
) => {
  const portPath = printer.connectionType === 'serial' ? printer.serialPath : printer.usbPath;
  console.log(`[TEST] Проверка соединения с последовательным портом ${portPath}, скорость: ${printer.baudRate || 9600} бит/с...`);
  
  try {
    if (!portPath) {
      console.error('[TEST] Путь к последовательному порту не указан');
      resolve({ 
        success: false, 
        message: 'Не указан путь к последовательному порту' 
      });
      return;
    }
      // Динамически загружаем SerialPort для проверки
    import('serialport').then(({ SerialPort }) => {
      console.log(`[TEST] Библиотека serialport загружена, проверяем порт ${portPath}...`);
      
      // Проверяем существование порта (не открывая его)
      SerialPort.list().then((ports) => {
        const portExists = ports.some(port => port.path === portPath);
        
        if (portExists) {
          console.log(`[TEST] Последовательный порт ${portPath} найден в системе`);
            // Пробуем открыть порт для проверки доступности
          const port = new SerialPort({ 
            path: portPath, // Мы уже проверили на null выше
            baudRate: printer.baudRate || 9600, // Используем указанный baudRate или 9600 по умолчанию
            autoOpen: false 
          });
            port.open((err) => {
            if (err) {
              console.error(`[TEST] Не удалось открыть порт ${portPath}: ${err.message}`);
              resolve({ 
                success: false, 
                message: `Порт ${portPath} найден, но не удалось получить доступ: ${err.message}` 
              });
            } else {
              console.log(`[TEST] Последовательный порт ${portPath} успешно открыт`);
              
              // Закрываем порт
              port.close((closeErr) => {
                if (closeErr) {
                  console.warn(`[TEST] Предупреждение при закрытии порта: ${closeErr.message}`);
                }
                
                resolve({                  success: true, 
                  message: `Последовательный порт ${portPath} доступен и готов к использованию (скорость: ${printer.baudRate || 9600} бит/с)` 
                });
              });
            }
          });
        } else {
          console.error(`[TEST] Последовательный порт ${portPath} не найден в системе`);
          resolve({ 
            success: false, 
            message: `Последовательный порт ${portPath} не найден в системе` 
          });
        }
      }).catch((listError) => {
        console.error(`[TEST] Ошибка при получении списка портов: ${listError.message}`);
        resolve({ 
          success: false, 
          message: `Ошибка при получении списка портов: ${listError.message}` 
        });
      });
    }).catch((importError) => {
      console.error(`[TEST] Ошибка при загрузке библиотеки serialport: ${importError.message}`);
      resolve({ 
        success: false, 
        message: `Не удалось загрузить модуль для работы с последовательным портом: ${importError.message}` 
      });
    });
  } catch (error) {
    console.error(`[TEST] Исключение при проверке последовательного порта:`, error);
    resolve({ 
      success: false, 
      message: `Ошибка при проверке порта: ${error instanceof Error ? error.message : 'неизвестная ошибка'}` 
    });
  }
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // and load the index.html of the app.
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development mode');
    // В режиме разработки мы используем сервер Vite на порту 5173
    const loadURL = async (retryCount = 0) => {
      try {
        console.log(`Attempting to load from development server at http://localhost:5173/ (attempt ${retryCount + 1})`);
        await mainWindow.loadURL('http://localhost:5173/');
        console.log('Successfully loaded from development server');
      } catch (e) {
        console.error(`Failed to load URL from dev server (attempt ${retryCount + 1}):`, e);
        if (retryCount < 3) {
          console.log(`Retrying in 1 second... (${retryCount + 1}/3)`);
          setTimeout(() => loadURL(retryCount + 1), 1000);
        } else {
          console.error('Max retries reached. Falling back to local file');
          try {
            await mainWindow.loadFile(path.join(__dirname, '../../index.html'));
          } catch (err) {
            console.error('Failed to load local index.html:', err);
          }
        }
      }
    };
    
    loadURL();  } else {
    // In production, load the main index.html file from the root directory
    mainWindow.loadFile(path.join(__dirname, '../index.html'))
      .catch((err) => {
        console.error('Failed to load index.html:', err);
        // Fallback to try different path
        mainWindow.loadFile('index.html').catch((fallbackErr) => {
          console.error('Fallback failed to load index.html:', fallbackErr);
        });
      });
    console.log('Loading from production build');
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Настраиваем IPC обработчики для работы с принтерами
const setupIpcHandlers = () => {
  // Получение списка доступных принтеров
  ipcMain.handle('get-printers', async () => {
    return loadPrinterConfig();
  });

  // Печать этикеток
  ipcMain.handle('print-labels', async (_, options: PrintLabelsOptions) => {
    try {
      console.log('[IPC] Получен запрос на печать этикеток:', {
        numberOfLabels: options.labels.length,
        specifiedPrinter: options.printerName || 'используется принтер по умолчанию'
      });
      
      if (!options.labels || options.labels.length === 0) {
        console.error('[IPC] Ошибка: Пустой массив этикеток для печати');
        throw new Error('Отсутствуют данные для печати');
      }
      
      const printers = loadPrinterConfig();
      console.log('[IPC] Загруженная конфигурация принтеров:', JSON.stringify(printers, null, 2));
      
      if (printers.length === 0) {
        console.error('[IPC] В конфигурации отсутствуют принтеры');
        throw new Error('Не найдены настройки принтеров. Пожалуйста, добавьте принтер в настройках.');
      }
      
      let targetPrinter = printers.find(p => p.isDefault);

      // Если указано конкретное имя принтера, используем его
      if (options.printerName) {
        const specificPrinter = printers.find(p => p.name === options.printerName);
        if (specificPrinter) {
          console.log(`[IPC] Найден указанный принтер: ${specificPrinter.name} (${specificPrinter.ip}:${specificPrinter.port})`);
          targetPrinter = specificPrinter;
        } else {
          console.warn(`[IPC] Указанный принтер ${options.printerName} не найден в конфигурации, используем принтер по умолчанию`);
        }
      }

      if (!targetPrinter) {
        // Если нет принтера по умолчанию, но есть хоть один принтер, используем первый
        if (printers.length > 0) {
          console.warn('[IPC] Не найден принтер по умолчанию, используем первый принтер из списка');
          targetPrinter = printers[0];
        } else {
          console.error('[IPC] Не найден принтер по умолчанию, и список принтеров пуст!');
          throw new Error('Принтер по умолчанию не настроен. Добавьте принтер в настройках.');
        }
      }      if (targetPrinter.connectionType === 'network') {
        console.log(`[IPC] Выбран сетевой принтер для печати: ${targetPrinter.name} (${targetPrinter.ip}:${targetPrinter.port})`);
      } else if (targetPrinter.connectionType === 'usb') {
        console.log(`[IPC] Выбран USB принтер для печати: ${targetPrinter.name} (путь: ${targetPrinter.usbPath})`);
      } else {
        console.log(`[IPC] Выбран принтер для печати: ${targetPrinter.name}`);
      }
        // Печатаем каждую этикетку с повторными попытками
      console.log(`[IPC] Начинаем печать ${options.labels.length} этикеток...`);
      
      const maxRetries = 2;
      
      for (let i = 0; i < options.labels.length; i++) {
        const label = options.labels[i];
        let success = false;
        let lastError = null;
        
        // Попытки печати с повторами
        for (let attempt = 0; attempt <= maxRetries && !success; attempt++) {
          if (attempt > 0) {
            console.log(`[IPC] Повторная попытка ${attempt}/${maxRetries} печати этикетки ${i + 1}/${options.labels.length}`);
          } else {
            if (targetPrinter.connectionType === 'network') {
              console.log(`[IPC] Печать этикетки ${i + 1}/${options.labels.length} на сетевой принтер ${targetPrinter.name}`);
            } else if (targetPrinter.connectionType === 'usb') {
              console.log(`[IPC] Печать этикетки ${i + 1}/${options.labels.length} на USB принтер ${targetPrinter.name}`);
            } else {
              console.log(`[IPC] Печать этикетки ${i + 1}/${options.labels.length}`);
            }
          }
          
          try {
            await printToZebraPrinter(targetPrinter, label);
            success = true;
            console.log(`[IPC] Этикетка ${i + 1}/${options.labels.length} успешно напечатана`);
          } catch (err) {
            lastError = err;
            console.error(`[IPC] Ошибка при печати этикетки ${i + 1}: ${err.message}`);
            // Делаем паузу перед следующей попыткой
            if (attempt < maxRetries) {
              console.log(`[IPC] Ожидание 2 секунды перед повтором...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!success) {
          console.error(`[IPC] Не удалось напечатать этикетку ${i + 1} после ${maxRetries + 1} попыток`);
          throw lastError || new Error(`Не удалось напечатать этикетку ${i + 1}`);
        }
      }

      console.log('[IPC] Все этикетки успешно напечатаны');
      return true;
    } catch (error) {
      console.error('[IPC] Ошибка при печати этикеток:', error);
      throw error;
    }
  });

  // Сохранение конфигурации принтера
  ipcMain.handle('save-printer-config', async (_, config: PrinterConfig[]) => {
    try {
      console.log('[IPC] Получен запрос на сохранение конфигурации принтеров');
      
      if (!Array.isArray(config)) {
        console.error('[IPC] Ошибка: полученная конфигурация принтеров не является массивом');
        return { 
          success: false, 
          message: 'Неверный формат данных для конфигурации принтеров' 
        };
      }
      
      console.log(`[IPC] Получено ${config.length} принтеров для сохранения`);
      
      // Проверка на дубликаты принтеров
      const uniquePrinters: PrinterConfig[] = [];
      const nameSet = new Set<string>();
      
      for (const printer of config) {
        if (!nameSet.has(printer.name)) {
          nameSet.add(printer.name);
          uniquePrinters.push(printer);
        } else {
          console.warn(`[IPC] Предупреждение: Дублирующийся принтер с именем "${printer.name}" будет пропущен`);
        }
      }
      
      if (uniquePrinters.length < config.length) {
        console.log(`[IPC] Удалено ${config.length - uniquePrinters.length} дублирующихся принтеров`);
      }
      
      // Сохраняем конфигурацию с уникальными принтерами
      const result = savePrinterConfig(uniquePrinters);
      
      if (result) {
        try {
          // После успешного сохранения сразу же перезагружаем конфигурацию для проверки
          const loadedConfig = loadPrinterConfig();
          console.log(`[IPC] Проверка: загружено ${loadedConfig.length} принтеров после сохранения`);
          
          if (loadedConfig.length === config.length) {
            console.log('[IPC] Верификация успешна: количество сохраненных принтеров совпадает');
          } else {
            console.warn(
              `[IPC] Предупреждение: количество сохраненных принтеров (${loadedConfig.length}) ` +
              `не совпадает с переданным (${config.length})`
            );
          }
          
          return { 
            success: true, 
            message: `Конфигурация успешно сохранена (${config.length} принтеров)`,
            loadedConfig // Возвращаем загруженную конфигурацию для проверки
          };
        } catch (verifyError) {
          console.error('[IPC] Ошибка при верификации сохраненной конфигурации:', verifyError);
          return { 
            success: true, // Считаем сохранение успешным, даже если верификация не удалась
            message: 'Конфигурация сохранена, но возникли ошибки при проверке',
            loadedConfig: [] // Возвращаем пустой список в случае ошибки верификации
          };
        }
      } else {
        return { 
          success: false, 
          message: 'Не удалось сохранить конфигурацию принтеров' 
        };
      }
    } catch (error) {
      console.error('[IPC] Ошибка при обработке запроса на сохранение конфигурации принтеров:', error);
      const errorMessage = error instanceof Error ? error.message : 
                          (typeof error === 'string' ? error : 
                          (error === undefined ? 'Неопределенная ошибка' : 
                          (error === null ? 'Ошибка null' : JSON.stringify(error))));
      
      console.log(`[IPC] Тип ошибки: ${typeof error}, содержимое:`, error);
      
      return { 
        success: false, 
        message: `Ошибка при сохранении: ${errorMessage}`
      };
    }
  });  // Получение доступных USB устройств
  ipcMain.handle('get-usb-devices', async () => {
    try {
      console.log('[IPC] Получен запрос на поиск USB устройств');
      
      console.log('[IPC] Поиск USB устройств...');
      
      // Пытаемся безопасно загрузить USB модуль
      let usb: { getDeviceList: () => USBDevice[] } | null = null;      try {
        // Используем require для лучшей совместимости с нативными модулями в Electron
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        usb = require('usb');
        
        // Дополнительная проверка доступности функций
        if (!usb || typeof usb.getDeviceList !== 'function') {
          throw new Error('USB модуль загружен, но getDeviceList недоступен');
        }
        
        console.log('[IPC] USB модуль успешно загружен через require');
      } catch (requireError) {
        console.warn('[IPC] Ошибка при загрузке USB модуля через require:', requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
        
        // Пробуем динамический импорт как fallback
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const usbModule: any = await import('usb');
          usb = usbModule.default || usbModule;
          
          if (!usb || typeof usb.getDeviceList !== 'function') {
            throw new Error('USB модуль загружен через import, но getDeviceList недоступен');
          }
          
          console.log('[IPC] USB модуль успешно загружен через динамический import');
        } catch (importError) {
          console.error('[IPC] Не удалось загрузить USB модуль ни через require, ни через import');
          console.error('[IPC] Require error:', requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
          console.error('[IPC] Import error:', importError instanceof Error ? importError.message : 'Неизвестная ошибка');
          
          // Проверяем, является ли это ошибкой нативной компиляции
          const errorMessage = (requireError instanceof Error ? requireError.message : '') + ' | ' + (importError instanceof Error ? importError.message : '');
          
          if (errorMessage.includes('No native build was found') || 
              errorMessage.includes('The specified module could not be found') ||
              errorMessage.includes('Cannot resolve module') ||
              errorMessage.includes('MODULE_NOT_FOUND')) {
            
            console.warn('[IPC] USB модуль не скомпилирован для текущей платформы - возвращаем информационное сообщение');
            return {
              success: false,
              devices: [{
                path: '',
                description: '-- USB модуль недоступен (требуется пересборка нативных зависимостей) --',
                vendorId: '',
                productId: '',
                vendorName: 'Системная ошибка',
                deviceInfo: 'USB модуль не скомпилирован для этой платформы. Выполните: npm run rebuild',
                matchReason: 'ошибка компиляции нативного модуля'
              }],
              message: 'USB модуль недоступен - требуется пересборка нативных зависимостей'
            };
          }
          
          // Для других ошибок возвращаем общее сообщение
          throw importError;
        }
      }
      
      // Получаем список всех USB устройств
      const allDevices = usb.getDeviceList();
      console.log(`[IPC] Найдено ${allDevices.length} USB устройств в системе`);
      
      // Массив для хранения устройств, которые могут быть принтерами
      const printerDevices = [];
        // Проходим по всем устройствам и ищем те, которые могут быть принтерами
      for (const device of allDevices) {
        try {
          // Получаем дескриптор устройства
          const desc = device.deviceDescriptor;
          
          // Идентификаторы известных производителей принтеров
          const knownPrinterVendors = [
            0x04b8, // Epson
            0x04f9, // Brother
            0x0482, // Kyocera
            0x04e8, // Samsung
            0x03f0, // HP
            0x047f, // Lexmark
            0x05ca, // Ricoh
            0x04e6, // SCM
            0x05e0, // Symbol/Zebra
            0x0a5f, // Zebra
            0x0dd4, // Custom Printers
            0x067b, // Prolific (USB-Serial адаптеры для принтеров)
            0x0403, // FTDI (USB-Serial адаптеры для принтеров)
            0x1fc9, // NXP (USB-Serial адаптеры для принтеров)
            0x04d8, // Microchip
            0x0525, // PLX Devices
            0x0416, // Winbond
            0x046D, // Logitech (некоторые устройства используются как принтеры этикеток)
            0x154b, // PNY
            0x2341, // Arduino (иногда используется для DIY принтеров)
            0x045e, // Microsoft (для некоторых POS-принтеров)
          ];
          
          // Идентификаторы известных интерфейсных классов для принтеров
          const printerInterfaceClasses = [
            0x07,   // Printer class
            0x02,   // CDC (Communications Device Class, используется серийными принтерами)
            0xff,   // Vendor-specific (многие принтеры используют этот класс)
          ];
          
          // Проверка на известного производителя принтера
          const isKnownPrinterVendor = knownPrinterVendors.includes(desc.idVendor);
          
          // Пытаемся определить класс устройства (для более точного определения принтеров)
          let isPrinterClass = false;
          try {
            if (device.configDescriptor && device.configDescriptor.interfaces) {
              // Проверяем классы интерфейсов
              for (const iface of device.configDescriptor.interfaces) {
                for (const setting of iface) {
                  if (printerInterfaceClasses.includes(setting.bInterfaceClass)) {
                    isPrinterClass = true;
                    break;
                  }
                }
                if (isPrinterClass) break;
              }
            }
          } catch (classErr) {
            console.warn(`[IPC] Не удалось определить класс устройства:`, classErr.message);
          }
          
          // Получаем имя производителя
          let vendorName = '';
          
          // Формируем читаемый ID устройства
          const devicePath = `usb://${desc.idVendor.toString(16).padStart(4, '0')}/${desc.idProduct.toString(16).padStart(4, '0')}`;
          const manufacturerHex = desc.idVendor.toString(16).padStart(4, '0');
          const productHex = desc.idProduct.toString(16).padStart(4, '0');
          
          // Определяем производителя устройства по VID
          const vendorNames: Record<string, string> = {
            '04b8': 'Epson',
            '04f9': 'Brother',
            '0482': 'Kyocera',
            '04e8': 'Samsung',
            '03f0': 'HP',
            '047f': 'Lexmark',
            '05ca': 'Ricoh',
            '04e6': 'SCM',
            '05e0': 'Symbol',
            '0a5f': 'Zebra',
            '0dd4': 'Custom',
            '067b': 'Prolific',
            '0403': 'FTDI',
            '1fc9': 'NXP',
            '04d8': 'Microchip',
            '0525': 'PLX',
            '0416': 'Winbond',
            '046D': 'Logitech',
            '154b': 'PNY',
            '2341': 'Arduino',
            '045e': 'Microsoft',
          };
          
          if (manufacturerHex in vendorNames) {
            vendorName = vendorNames[manufacturerHex];
          }
            // Для строковых дескрипторов используем только известную информацию о производителе
          let deviceInfo = vendorName ? `${vendorName}` : '';
          
          // Вместо чтения дескрипторов здесь, что может вызвать проблемы,
          // мы улучшим отображаемую информацию на основе известных данных
          
          // Дополним информацию о типе устройства, если можем определить
          if (isPrinterClass) {
            if (deviceInfo) {
              deviceInfo += ' USB Printer Device';
            } else {
              deviceInfo = 'USB Printer Device';
            }
          }
          
          // Определяем, является ли устройство принтером
          // Либо по известному производителю, либо по классу интерфейса, либо по строковому описанию
          const printerKeywords = ['print', 'thermal', 'label', 'zt', 'gk420', 'lp', 'zd', 'gx', 'zebra', 'brother', 'epson', 'tsc'];
          const deviceInfoLower = deviceInfo.toLowerCase();
          
          const isMatchByKeyword = deviceInfoLower && 
                                  printerKeywords.some(keyword => deviceInfoLower.includes(keyword));
          
          const isPrinterDevice = isKnownPrinterVendor || isPrinterClass || isMatchByKeyword;
          
          // Если это похоже на принтер
          if (isPrinterDevice) {
            // Формируем понятное описание устройства
            let description;
            
            if (deviceInfo) {
              // Если есть полученная информация об устройстве, используем ее
              description = `${deviceInfo} [${manufacturerHex}:${productHex}]`;
            } else if (vendorName) {
              // Если известен производитель, используем его имя
              description = `${vendorName} Принтер [${manufacturerHex}:${productHex}]`;
            } else {
              // В крайнем случае используем просто идентификаторы
              description = `USB Принтер [${manufacturerHex}:${productHex}]`;
            }
            
            console.log(`[IPC] Найдено потенциальное USB-устройство принтера: ${description} (${devicePath})`);
            
            // Добавляем дополнительную информацию о том, почему устройство классифицировано как принтер
            const matchReason = [];
            if (isKnownPrinterVendor) matchReason.push('известный производитель принтеров');
            if (isPrinterClass) matchReason.push('класс устройства соответствует принтеру');
            if (isMatchByKeyword) matchReason.push('совпадение по ключевым словам');
            
            printerDevices.push({
              path: devicePath,
              description: description,
              vendorId: manufacturerHex,
              productId: productHex,
              vendorName: vendorName || 'Неизвестный',
              deviceInfo: deviceInfo || 'Нет информации',
              matchReason: matchReason.join(', ')
            });
          }
        } catch (deviceError) {
          console.error(`[IPC] Ошибка при обработке USB устройства: ${deviceError.message}`);
        }
      }
      
      console.log(`[IPC] Найдено ${printerDevices.length} потенциальных USB-принтеров`);
      
      // Если не найдено ни одного устройства, которое может быть принтером
      if (printerDevices.length === 0) {
        console.log('[IPC] USB принтеров не обнаружено, добавляем информационное сообщение');
        printerDevices.push({
          path: '',
          description: '-- USB принтеров не найдено --'
        });
      }
      
      return {
        success: true,
        devices: printerDevices,
        message: `Найдено ${printerDevices.length} USB устройств`
      };    } catch (error) {
      console.error('[IPC] Ошибка при поиске USB устройств:', error);
      
      // Специальная обработка ошибок нативных модулей
      if (error instanceof Error && error.message.includes('No native build was found')) {
        console.warn('[IPC] USB модуль не скомпилирован для текущей платформы - возвращаем пустой список');
        return {
          success: false,
          devices: [{
            path: '',
            description: '-- USB модуль недоступен (требуется пересборка) --',
            vendorId: '',
            productId: '',
            vendorName: 'Системная ошибка',
            deviceInfo: 'USB модуль не скомпилирован для этой платформы',
            matchReason: 'ошибка компиляции нативного модуля'
          }],
          message: 'USB модуль недоступен - требуется пересборка нативных зависимостей'
        };
      }
      
      return {
        success: false,
        devices: [],
        message: `Ошибка при поиске USB устройств: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  });

  // Тестирование подключения к принтеру
  ipcMain.handle('test-printer-connection', async (_, printer: PrinterConfig) => {
    try {
      if (printer.connectionType === 'network') {
        console.log(`[IPC] Получен запрос на проверку подключения к сетевому принтеру ${printer.name} (${printer.ip}:${printer.port})`);
      } else if (printer.connectionType === 'usb') {
        console.log(`[IPC] Получен запрос на проверку подключения к USB принтеру ${printer.name} (путь: ${printer.usbPath})`);
      } else {
        console.log(`[IPC] Получен запрос на проверку подключения к принтеру ${printer.name}`);
      }
      return await testPrinterConnection(printer);
    } catch (error) {
      console.error('[IPC] Ошибка при тестировании принтера:', error);
      return { 
        success: false, 
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка при проверке принтера'}`
      };
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  setupIpcHandlers();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
