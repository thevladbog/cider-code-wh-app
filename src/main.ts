import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import net from 'node:net';
import { exec } from 'child_process';

// Отображение ошибок в главном процессе
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Main Process:', error);
});

// Интерфейсы для работы с принтерами
interface PrinterConfig {
  name: string;
  connectionType: 'network';
  ip?: string;
  port?: number;
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

// Получение списка системных принтеров (Windows, через PowerShell)
ipcMain.handle('get-system-printers', async () => {
  return new Promise<{ name: string; portName: string; isDefault: boolean }[]>((resolve) => {
    exec(
      'Get-WmiObject Win32_Printer | Select-Object Name,PortName,Default | ConvertTo-Json',
      { shell: 'powershell.exe' },
      (err, stdout) => {
        if (err) {
          resolve([]);
          return;
        }
        try {
          const printers = JSON.parse(stdout);
          const arr = Array.isArray(printers) ? printers : [printers];
          resolve(
            arr.map((p) => ({
              name: p.Name as string,
              portName: p.PortName as string,
              isDefault: !!p.Default,
            }))
          );
        } catch {
          resolve([]);
        }
      }
    );
  });
});

// RAW печать на выбранный принтер (Windows, через lpr)
ipcMain.handle('print-raw-to-printer', async (_event, printerName: string, rawData: string) => {
  return new Promise<{ success: boolean; message: string }>((resolve) => {
    try {
      const tmpPath = path.join(app.getPath('temp'), `raw_${Date.now()}.zpl`);
      fs.writeFileSync(tmpPath, rawData, 'utf8');
      // lpr должен быть установлен в системе (Windows Feature: Print and Document Services > LPR Port Monitor)
      const cmd = `lpr -S localhost -P "${printerName}" "${tmpPath}" && del "${tmpPath}"`;
      exec(cmd, { shell: 'cmd.exe' }, (err) => {
        if (err) {
          resolve({ success: false, message: 'Ошибка печати: ' + err.message });
        } else {
          resolve({ success: true, message: 'Печать отправлена' });
        }
      });
    } catch (e) {
      resolve({ success: false, message: 'Ошибка печати: ' + (e instanceof Error ? e.message : String(e)) });
    }
  });
});

// Универсальная функция печати
async function printLabelSmart(options: { labels: string[]; printerName?: string }): Promise<{ success: boolean; message: string }> {
  const { labels, printerName } = options;
  const printers = loadPrinterConfig();
  let target: PrinterConfig | undefined = undefined;
  if (printerName) {
    target = printers.find(p => p.name === printerName);
  } else {
    target = printers.find(p => p.isDefault);
  }
  if (!target) {
    return { success: false, message: 'Принтер не найден в конфиге' };
  }
  const rawData = labels.join('\n');
  // Сетевой принтер (RAW TCP/IP)
  if (target.connectionType === 'network' && target.ip && target.port) {
    return await new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(target.port, target.ip, () => {
        client.write(rawData, () => {
          client.end();
          resolve({ success: true, message: 'Печать отправлена на сетевой принтер' });
        });
      });
      client.on('error', (err) => {
        resolve({ success: false, message: 'Ошибка печати (TCP/IP): ' + err.message });
      });
    });
  }
  // Fallback: lpr (Windows очередь)
  return await new Promise((resolve) => {
    try {
      const tmpPath = path.join(app.getPath('temp'), `raw_${Date.now()}.zpl`);
      fs.writeFileSync(tmpPath, rawData, 'utf8');
      const cmd = `lpr -S localhost -P "${printerName || ''}" "${tmpPath}" && del "${tmpPath}"`;
      exec(cmd, { shell: 'cmd.exe' }, (err) => {
        if (err) {
          resolve({ success: false, message: 'Ошибка печати (lpr): ' + err.message });
        } else {
          resolve({ success: true, message: 'Печать отправлена через lpr' });
        }
      });
    } catch (e) {
      resolve({ success: false, message: 'Ошибка печати (lpr): ' + (e instanceof Error ? e.message : String(e)) });
    }
  });
}

// --- ADD THIS HANDLER FOR print-labels ---
ipcMain.handle('print-labels', async (_event, options: { labels: string[]; printerName?: string }) => {
  try {
    if (!options.labels || !Array.isArray(options.labels) || options.labels.length === 0) {
      return { success: false, message: 'Нет данных для печати' };
    }
    return await printLabelSmart(options);
  } catch (error) {
    return { success: false, message: 'Ошибка при печати: ' + (error instanceof Error ? error.message : String(error)) };
  }
});

// Функция проверки доступности принтера
const testPrinterConnection = (printer: PrinterConfig): Promise<{ success: boolean, message: string }> => {
  return new Promise((resolve) => {
    if (printer.connectionType === 'network') {
      testNetworkPrinterConnection(printer, resolve);
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

// === ОКНО ELECTRON ===
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  console.log('[MAIN] Создание окна Electron...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('[MAIN] Окно готово к отображению.');
  });

  // Определяем URL для загрузки (dev или prod)
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/';
  const prodUrl = `file://${path.join(__dirname, '../renderer/index.html')}`;

  if (isDev) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    console.log('[MAIN] Загружен dev-сервер:', devUrl);
  } else {
    mainWindow.loadURL(prodUrl);
    console.log('[MAIN] Загружен production build:', prodUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    console.log('[MAIN] Окно закрыто.');
  });
}

app.whenReady().then(() => {
  console.log('[MAIN] app.whenReady() — старт приложения');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-printer-config', async (_event, config: PrinterConfig[]) => {
  const success = savePrinterConfig(config);
  if (success) {
    return { success: true, message: 'Конфигурация принтеров сохранена' };
  } else {
    return { success: false, message: 'Ошибка при сохранении конфигурации принтеров' };
  }
});

ipcMain.handle('test-printer-connection', async (_event, printer: PrinterConfig) => {
  try {
    const result = await testPrinterConnection(printer);
    return result;
  } catch (error) {
    return { success: false, message: 'Ошибка при проверке подключения: ' + (error instanceof Error ? error.message : String(error)) };
  }
});

// Получить список принтеров (конфиг приложения)
ipcMain.handle('get-printers', async () => {
  try {
    const printers = loadPrinterConfig();
    return printers;
  } catch (error) {
    console.error('[IPC] Ошибка при получении списка принтеров:', error);
    return [];
  }
});
