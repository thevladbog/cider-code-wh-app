import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import net from 'node:net';

// Отображение ошибок в главном процессе
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Main Process:', error);
});

// Интерфейсы для работы с принтерами
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
          const validPrinters = parsedData.filter(p => 
            p && typeof p === 'object' && 
            typeof p.name === 'string' && p.name.trim() !== '' &&
            typeof p.ip === 'string' && p.ip.trim() !== '' &&
            typeof p.port === 'number' && p.port > 0
          );
          
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
    const validConfig = config.filter(p => 
      p && typeof p === 'object' && 
      typeof p.name === 'string' && p.name.trim() !== '' &&
      typeof p.ip === 'string' && p.ip.trim() !== '' &&
      typeof p.port === 'number' && p.port > 0
    );
    
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
const printToZebraPrinter = (printer: PrinterConfig, zplData: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    console.log(`[PRINT] Попытка подключения к принтеру ${printer.name} (${printer.ip}:${printer.port})...`);
    
    // Проверяем данные перед печатью
    if (!zplData || zplData.trim() === '') {
      console.error('[PRINT] Ошибка: Пустые данные для печати');
      reject(new Error('Пустые данные для печати'));
      return;
    }
    
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
    client.on('error', (error) => {
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
    });      try {
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
  });
};

// Функция проверки доступности принтера
const testPrinterConnection = (printer: PrinterConfig): Promise<{ success: boolean, message: string }> => {
  return new Promise((resolve) => {
    console.log(`[TEST] Проверка соединения с принтером ${printer.name} (${printer.ip}:${printer.port})...`);
    
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
      client.on('error', (error) => {
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
  });
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
    
    loadURL();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
      .catch((err) => {
        console.error('Failed to load index.html:', err);
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
      }

      console.log(`[IPC] Выбран принтер для печати: ${targetPrinter.name} (${targetPrinter.ip}:${targetPrinter.port})`);
      
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
            console.log(`[IPC] Печать этикетки ${i + 1}/${options.labels.length}`);
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
  });
  
  // Тестирование подключения к принтеру
  ipcMain.handle('test-printer-connection', async (_, printer: PrinterConfig) => {
    try {
      console.log(`[IPC] Получен запрос на проверку подключения к принтеру ${printer.name} (${printer.ip}:${printer.port})`);
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
