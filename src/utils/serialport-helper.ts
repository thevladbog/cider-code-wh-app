// Вспомогательные функции для работы с последовательными портами

// Интерфейс для конфигурации принтера
export interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb' | 'serial';
  ip?: string;
  port?: number;
  usbPath?: string;
  serialPath?: string;
  baudRate?: number; // Скорость последовательного порта
  isDefault: boolean;
}

// Типы для SerialPort
interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
}

/**
 * Получение списка доступных последовательных портов
 */
export async function getSerialPorts(): Promise<SerialPortInfo[]> {
  try {
    // Пытаемся загрузить SerialPort через require (лучше для нативных модулей в Electron)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let SerialPort: any;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serialportModule = require('serialport');
      SerialPort = serialportModule.SerialPort;
      console.log('[SERIAL] SerialPort модуль загружен через require');
    } catch (requireError) {
      console.warn('[SERIAL] Ошибка при загрузке через require, пробуем динамический import:', requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
      
      // Fallback к динамическому импорту
      const serialportModule = await import('serialport');
      SerialPort = serialportModule.SerialPort;
      console.log('[SERIAL] SerialPort модуль загружен через динамический import');
    }
    
    if (!SerialPort) {
      throw new Error('SerialPort не загружен');
    }
    
    const ports = await SerialPort.list();
    console.log(`[SERIAL] Найдено ${ports.length} последовательных портов:`, ports);
    return ports;
  } catch (error) {
    console.error('[SERIAL] Ошибка при получении списка последовательных портов:', error);
    return [];
  }
}

/**
 * Псевдоним для функции getSerialPorts для совместимости с PrinterSettings.tsx
 */
export const getAvailableSerialPorts = getSerialPorts;

/**
 * Тестирование подключения к принтеру через последовательный порт
 * @param printer Конфигурация принтера
 * @returns Промис с результатом проверки
 */
export async function testSerialPort(printer: PrinterConfig): Promise<{ success: boolean, message: string }> {
  if (!printer.serialPath) {
    return { 
      success: false, 
      message: 'Не указан путь к последовательному порту' 
    };
  }

  try {
    // Получаем список доступных портов
    const ports = await getSerialPorts();
    const portExists = ports.some(port => port.path === printer.serialPath);
    
    if (!portExists) {
      return { 
        success: false, 
        message: `Порт ${printer.serialPath} не найден в системе` 
      };    }

    // Пробуем открыть порт с fallback механизмом загрузки
    return new Promise<{ success: boolean, message: string }>((resolve) => {
      // Функция для тестирования порта с загруженным SerialPort
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testWithSerialPort = (SerialPort: any) => {
        try {
          const port = new SerialPort({
            path: printer.serialPath as string, // Мы уже проверили это на null выше
            baudRate: printer.baudRate || 9600, // Используем указанный baudRate или 9600 по умолчанию
            autoOpen: false
          });
          
          port.open((err: Error | null) => {
            if (err) {
              console.error(`[SERIAL] Ошибка при открытии порта ${printer.serialPath}:`, err);
              resolve({ 
                success: false, 
                message: `Не удалось открыть порт ${printer.serialPath}: ${err.message}` 
              });
              return;
            }
            
            console.log(`[SERIAL] Порт ${printer.serialPath} успешно открыт`);
            
            // Закрываем порт
            port.close((closeErr: Error | null) => {
              if (closeErr) {
                console.warn(`[SERIAL] Предупреждение при закрытии порта ${printer.serialPath}:`, closeErr);
              }
              
              resolve({ 
                success: true, 
                message: `Последовательный порт ${printer.serialPath} доступен и готов к использованию` 
              });
            });
          });
        } catch (error) {
          console.error(`[SERIAL] Исключение при проверке порта ${printer.serialPath}:`, error);
          resolve({ 
            success: false, 
            message: `Ошибка при проверке порта ${printer.serialPath}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}` 
          });
        }
      };
      
      // Сначала пробуем require
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serialportModule = require('serialport');
        const SerialPort = serialportModule.SerialPort;
        console.log('[SERIAL] SerialPort загружен через require для тестирования');
        testWithSerialPort(SerialPort);
      } catch (requireError) {
        console.warn('[SERIAL] Ошибка require, пробуем import:', requireError instanceof Error ? requireError.message : 'Неизвестная ошибка');
          // Fallback к динамическому импорту
        import('serialport').then(({ SerialPort }) => {
          console.log('[SERIAL] SerialPort загружен через import для тестирования');
          testWithSerialPort(SerialPort);
        }).catch((importError) => {
          console.error(`[SERIAL] Ошибка при загрузке библиотеки serialport: ${importError.message}`);
          resolve({ 
            success: false, 
            message: `Ошибка при загрузке библиотеки serialport: ${importError.message}` 
          });
        });
      }
    });
  } catch (error) {
    console.error('[SERIAL] Ошибка:', error);
    return { 
      success: false, 
      message: `Ошибка: ${error instanceof Error ? error.message : 'неизвестная ошибка при проверке порта'}` 
    };
  }
}

/**
 * Получение списка всех доступных серийных портов с расширенной информацией 
 */
export async function getEnhancedSerialPortInfo() {
  try {
    const ports = await getSerialPorts();
    
    // Обрабатываем и улучшаем информацию о портах
    return ports.map(port => {
      // Определяем тип устройства на основе информации о производителе
      let deviceType = 'Серийный порт';
      let isLikelyPrinter = false;
      
      const vendorIdLower = port.vendorId?.toLowerCase() || '';
      const productIdLower = port.productId?.toLowerCase() || '';
      const manufacturerLower = port.manufacturer?.toLowerCase() || '';      
      // Ключевые слова для определения принтеров
      const printerKeywords = ['print', 'zebra', 'epson', 'brother', 'dymo', 'thermal', 'этикетк', 'чек'];
      
      // Известные ID производителей принтеров
      const printerVendorIds = ['04b8', '04f9', '0482', '04e8', '03f0', '047f', '05ca', '04e6', '05e0', '0a5f', '0dd4'];
      
      // Известные ID продуктов принтеров
      const printerProductIds = ['0002', '00a0', '0112', '5720', '3020', '2015', '001a', '0020'];
      
      if (printerVendorIds.includes(vendorIdLower) ||
          printerProductIds.includes(productIdLower) ||
          printerKeywords.some(kw => manufacturerLower.includes(kw))) {
        deviceType = 'Принтер';
        isLikelyPrinter = true;
      }
      // Серийные адаптеры часто используются для подключения принтеров
      else if (manufacturerLower.includes('serial') || 
              manufacturerLower.includes('uart') || 
              manufacturerLower.includes('com') || 
              manufacturerLower.includes('prolific') ||
              manufacturerLower.includes('ftdi')) {
        deviceType = 'Серийный адаптер';
        isLikelyPrinter = true;
      }
      
      return {
        ...port,
        deviceType,
        isLikelyPrinter,
        displayName: port.manufacturer ? 
          `${port.path} - ${port.manufacturer}` : 
          port.path
      };
    });
  } catch (error) {
    console.error('[SERIAL] Ошибка при получении информации о последовательных портах:', error);
    return [];
  }
}
