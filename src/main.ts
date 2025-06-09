import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Handle squirrel events properly - only exit during actual installation events
const handleSquirrelEvents = () => {
  if (process.platform !== 'win32') return false;

  const cmd = process.argv[1];
  if (!cmd) return false;

  // Only handle actual Squirrel installer events, not normal app launch
  if (
    cmd.includes('--squirrel-install') ||
    cmd.includes('--squirrel-updated') ||
    cmd.includes('--squirrel-uninstall') ||
    cmd.includes('--squirrel-obsolete')
  ) {
    console.log('Squirrel installer event detected:', cmd);
    app.quit();
    return true;
  }

  return false;
};

// Only exit if we're actually handling a Squirrel installer event
if (handleSquirrelEvents()) {
  // App will quit, no need to continue
}
import net from 'node:net';
// import { exec } from 'child_process'; // Commented out - not used
import { initEnvironment } from './config/environment';

// Импорт функций для получения конфигурации API
import { getApiConfig, API_ENDPOINTS } from './config/api.config';

// Импорт функций для TLS
import { setupCertificateVerification } from './config/tls.config';
import { secureFetch } from './config/secure-fetch';
import { getTlsStatus } from './config/tls-status';
import { registerCertificateIPCHandlers } from './ipc/certificate-handlers';
import { startCertificateMonitoring } from './utils/cert-manager';

// Windows-specific optimizations
if (process.platform === 'win32') {
  // Increase memory limit for Windows
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
  // Disable GPU sandbox for better compatibility
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// Инициализация окружения
try {
  initEnvironment();
  console.log('Environment initialized successfully');
} catch (error) {
  console.error('Failed to initialize environment:', error);
}

// Настройка TLS сертификатов при запуске приложения
try {
  setupCertificateVerification();
  console.log('Certificate verification setup completed');
} catch (error) {
  console.error('Failed to setup certificate verification:', error);
}

// Регистрация IPC обработчиков для работы с сертификатами
try {
  registerCertificateIPCHandlers();
  console.log('Certificate IPC handlers registered');
} catch (error) {
  console.error('Failed to register certificate IPC handlers:', error);
}

// Запуск мониторинга сертификатов (проверка каждые 24 часа)
try {
  startCertificateMonitoring();
  console.log('Certificate monitoring started');
} catch (error) {
  console.error('Failed to start certificate monitoring:', error);
}

// Отображение ошибок в главном процессе
process.on('uncaughtException', error => {
  console.error('Uncaught Exception in Main Process:', error);
  // В production не завершаем процесс сразу, даем время для восстановления
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Squirrel events are already handled above

// Интерфейсы для работы с API
interface ApiRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}

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
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('[CONFIG] Ошибка загрузки конфигурации принтеров:', error);
  }

  // Возвращаем пустой массив, если не удалось загрузить конфигурацию
  return [];
};

// Сохранение конфигурации принтеров
const savePrinterConfig = (config: PrinterConfig[]): boolean => {
  try {
    const configPath = path.join(app.getPath('userData'), 'printers.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[CONFIG] Конфигурация принтеров сохранена в ${configPath}`);
    return true;
  } catch (error) {
    console.error('[CONFIG] Ошибка сохранения конфигурации принтеров:', error);
    return false;
  }
};

// Глобальная переменная для хранения принтеров
let printersList: PrinterConfig[] = [];

// Загрузка конфигурации принтеров при запуске приложения
printersList = loadPrinterConfig();

// Переменная для хранения ссылки на окно приложения
let mainWindow: BrowserWindow | null = null;

// Функция для создания основного окна приложения
const createWindow = (): void => {
  console.log('Creating main window...');
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    minHeight: 600,
    minWidth: 900,
    show: false, // Не показываем окно сразу
    frame: false, // Убираем нативную рамку для полного контроля
    titleBarStyle: 'hidden', // Скрываем заголовок окна
    backgroundColor: '#ffffff', // Фоновый цвет для избежания белого экрана
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Показываем окно только когда оно готово
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    if (mainWindow) {
      mainWindow.show();

      // Фокусируем окно на Windows
      if (process.platform === 'win32') {
        mainWindow.focus();
      }
    }
  });

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorCode, errorDescription);
  });

  // Дополнительные обработчики событий для окна
  mainWindow.on('enter-full-screen', () => {
    console.log('Entered fullscreen mode');
  });

  mainWindow.on('leave-full-screen', () => {
    console.log('Left fullscreen mode');
  });

  mainWindow.on('maximize', () => {
    console.log('Window maximized');
  });

  mainWindow.on('unmaximize', () => {
    console.log('Window unmaximized');
  });

  mainWindow.on('minimize', () => {
    console.log('Window minimized');
  });

  mainWindow.on('restore', () => {
    console.log('Window restored');
  });
  // Предотвращаем закрытие окна через системные команды в режиме киоска
  // НО разрешаем закрытие через наш API
  let forceClose = false;

  mainWindow.on('close', event => {
    if (mainWindow?.isKiosk() && !forceClose) {
      console.log('Close prevented in kiosk mode - use app:quit to force close');
      event.preventDefault();
      return false;
    }
  });
  // Сохраняем ссылку на функцию принудительного закрытия
  (mainWindow as BrowserWindow & { forceClose?: () => void }).forceClose = () => {
    forceClose = true;
  };

  // Load the app content - dev server in development, static files in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment && typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined') {
    console.log('Loading dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // Try multiple possible paths for the index.html file
    const possiblePaths = [
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      path.join(__dirname, '../renderer/index.html'),
      path.join(__dirname, '../index.html'),
      path.join(__dirname, '.vite/renderer/index.html'),
    ];

    let indexPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      console.log('Checking path:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        indexPath = possiblePath;
        console.log('Found index.html at:', indexPath);
        break;
      }
    }

    if (indexPath) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('No valid index.html found in any of the expected paths');
      // Last resort - try to load from renderer directory directly
      const fallbackPath = path.join(
        process.resourcesPath,
        'app',
        '.vite',
        'renderer',
        'index.html'
      );
      console.log('Trying fallback path:', fallbackPath);
      if (fs.existsSync(fallbackPath)) {
        mainWindow.loadFile(fallbackPath);
      } else {
        console.error('Fallback path also failed. Cannot load application.');
      }
    }
  }

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('Electron app is ready');
  createWindow();

  // На macOS нужно создать окно заново при активации
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Обработка before-quit для правильного завершения
app.on('before-quit', () => {
  console.log('App is about to quit');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Функция для выполнения запросов к API через основной процесс (обходит CORS)
async function makeApiRequest(options: ApiRequestOptions) {
  try {
    console.log(`[API] ${options.method || 'GET'} ${options.endpoint}`);

    const apiConfig = getApiConfig();
    let url = `${apiConfig.baseUrl}${options.endpoint}`;

    // Добавляем параметры запроса, если они есть
    if (options.params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        queryParams.append(key, value);
      }
      url += `?${queryParams.toString()}`;
    }

    // Вместо стандартного fetch используем наш безопасный fetch с поддержкой TLS
    const response = await secureFetch(url, {
      method: options.method || 'GET',
      headers: apiConfig.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Проверяем успешность запроса
    if (!response.ok) {
      const errorStatus = response.status;
      let errorText = '';

      try {
        // Пробуем прочитать ошибку как JSON
        const errorData = await response.json();
        errorText = errorData.message || `${response.statusText}`;
      } catch {
        // Если не удалось прочитать как JSON, получаем текст
        errorText = await response.text().catch(() => 'Unknown error');
      }

      console.error(`[API] HTTP error: ${errorStatus} - ${errorText}`);
      return { success: false, error: errorText, status: errorStatus };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[API] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

// IPC обработчики для API
ipcMain.handle('fetch-orders', async (_event, status?: string) => {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }

  return await makeApiRequest({
    endpoint: API_ENDPOINTS.orders,
    params,
  });
});

ipcMain.handle('archive-order', async (_event, id: string) => {
  return await makeApiRequest({
    endpoint: `${API_ENDPOINTS.archive}/${id}`,
    method: 'PATCH',
  });
});

ipcMain.handle('update-order-status', async (_event, id: string, status: string) => {
  return await makeApiRequest({
    endpoint: `${API_ENDPOINTS.orders}/${id}`,
    method: 'PATCH',
    body: { status },
  });
});

// Обработчик для получения информации о статусе TLS
ipcMain.handle('get-tls-status', async () => {
  return getTlsStatus();
});

// IPC обработчики для принтеров
ipcMain.handle('get-printers', async () => {
  console.log('[IPC] Получение списка принтеров');
  try {
    return printersList;
  } catch (error) {
    console.error('[IPC] Ошибка получения списка принтеров:', error);
    return [];
  }
});

ipcMain.handle('print-labels', async (_event, options: PrintLabelsOptions) => {
  console.log('[IPC] Печать этикеток:', options);
  try {
    // Определяем принтер для печати
    let printerName = options.printerName;
    if (!printerName) {
      // Используем принтер по умолчанию
      const defaultPrinter = printersList.find(p => p.isDefault);
      printerName = defaultPrinter?.name;
    }

    if (!printerName) {
      console.error('[IPC] Принтер не найден');
      return false;
    }

    console.log(`[IPC] Печать на принтере: ${printerName}`);

    // Обрабатываем этикетки в главном процессе
    const result = await printLabelsMain(options.labels, printerName);
    console.log(`[IPC] Результат печати: ${result}`);
    return result;
  } catch (error) {
    console.error('[IPC] Ошибка печати этикеток:', error);
    return false;
  }
});

// Функция печати этикеток в главном процессе
async function printLabelsMain(labels: string[], printerName: string): Promise<boolean> {
  try {
    console.log(`[PRINT-MAIN] Начало печати ${labels.length} этикеток на принтере: ${printerName}`);

    // Находим конфигурацию принтера
    const printerConfig = printersList.find(p => p.name === printerName);
    if (!printerConfig) {
      console.error(`[PRINT-MAIN] Принтер "${printerName}" не найден в конфигурации`);
      return false;
    }

    // Объединяем все этикетки в один файл ZPL
    const allLabelsContent = labels.join('\n');
    console.log(`[PRINT-MAIN] Подготовлен ZPL контент, размер: ${allLabelsContent.length} байт`);

    // Для ZPL принтеров используем прямую TCP отправку
    if (printerConfig.connectionType === 'network' && printerConfig.ip && printerConfig.port) {
      console.log(
        `[PRINT-MAIN] Отправка ZPL данных на сетевой принтер ${printerConfig.ip}:${printerConfig.port}`
      );
      return await sendZplToNetworkPrinter(printerConfig.ip, printerConfig.port, allLabelsContent);
    }

    console.error(`[PRINT-MAIN] Неподдерживаемый тип принтера: ${printerConfig.connectionType}`);
    return false;
  } catch (error) {
    console.error('[PRINT-MAIN] Общая ошибка при печати:', error);
    return false;
  }
}

// Функция для отправки ZPL данных на сетевой принтер
async function sendZplToNetworkPrinter(
  ip: string,
  port: number,
  zplData: string
): Promise<boolean> {
  return new Promise(resolve => {
    try {
      console.log(`[PRINT-MAIN] Подключение к ZPL принтеру ${ip}:${port}`);

      const client = new net.Socket();
      let connected = false;

      // Обработчик успешного подключения
      client.connect(port, ip, () => {
        connected = true;
        console.log(`[PRINT-MAIN] Подключился к принтеру ${ip}:${port}`);
        console.log(`[PRINT-MAIN] Отправка ZPL данных (${zplData.length} байт)`);

        // Отправляем ZPL данные
        client.write(zplData, 'utf8', error => {
          if (error) {
            console.error('[PRINT-MAIN] Ошибка отправки ZPL данных:', error);
            client.destroy();
            resolve(false);
          } else {
            console.log('[PRINT-MAIN] ZPL данные успешно отправлены');
            client.end();
          }
        });
      });

      // Обработчик закрытия соединения
      client.on('close', () => {
        console.log(`[PRINT-MAIN] Соединение с принтером ${ip}:${port} закрыто`);
        if (connected) {
          resolve(true);
        }
      });

      // Обработчик ошибок
      client.on('error', err => {
        console.error(`[PRINT-MAIN] Ошибка TCP соединения с ${ip}:${port}:`, err.message);
        client.destroy();
        resolve(false);
      });

      // Таймаут на подключение (10 секунд)
      setTimeout(() => {
        if (!connected) {
          client.destroy();
          console.error(`[PRINT-MAIN] Таймаут подключения к ${ip}:${port}`);
          resolve(false);
        }
      }, 10000);
    } catch (error) {
      console.error('[PRINT-MAIN] Ошибка при отправке ZPL:', error);
      resolve(false);
    }
  });
}

// IPC обработчик для сохранения конфигурации принтеров
ipcMain.handle('save-printer-config', async (_event, config: PrinterConfig[]) => {
  console.log('[IPC] Сохранение конфигурации принтеров');
  try {
    const success = savePrinterConfig(config);
    if (success) {
      printersList = config; // Обновляем глобальную переменную
      return {
        success: true,
        message: 'Конфигурация принтеров сохранена успешно',
        loadedConfig: config,
      };
    } else {
      return {
        success: false,
        message: 'Не удалось сохранить конфигурацию принтеров',
      };
    }
  } catch (error) {
    console.error('[IPC] Ошибка сохранения конфигурации принтеров:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка при сохранении',
    };
  }
});

// IPC обработчик для тестирования подключения к принтеру
ipcMain.handle('test-printer-connection', async (_event, printerConfig: PrinterConfig) => {
  console.log('[IPC] Тестирование подключения к принтеру:', printerConfig.name);
  try {
    if (printerConfig.connectionType === 'network' && printerConfig.ip && printerConfig.port) {
      const result = await testNetworkPrinter(printerConfig.ip, printerConfig.port);
      return {
        success: result.success,
        message: result.success ? 'Подключение успешно' : result.error || 'Ошибка подключения',
      };
    }
    return {
      success: false,
      message: 'Неподдерживаемый тип подключения или отсутствуют параметры',
    };
  } catch (error) {
    console.error('[IPC] Ошибка тестирования принтера:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка при тестировании',
    };
  }
});

// Функция для тестирования сетевого принтера
function testNetworkPrinter(
  ip: string,
  port: number
): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const timeout = 5000; // 5 секунд

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, error: 'Timeout: принтер не отвечает' });
    }, timeout);

    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: true });
    });

    socket.on('error', error => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: false, error: error.message });
    });
  });
}

// IPC обработчик для получения USB устройств
ipcMain.handle('get-usb-devices', async () => {
  console.log('[IPC] Получение списка USB устройств');
  try {
    // Для демонстрации возвращаем пустой список
    // В реальном приложении здесь можно использовать библиотеку usb или аналогичную
    return {
      success: true,
      devices: [],
      message: 'USB устройства не поддерживаются в текущей версии',
    };
  } catch (error) {
    console.error('[IPC] Ошибка получения USB устройств:', error);
    return {
      success: false,
      devices: [],
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// IPC обработчик для получения системных принтеров
ipcMain.handle('get-system-printers', async () => {
  console.log('[IPC] Получение системных принтеров');
  try {
    // В Node.js нет встроенной поддержки получения системных принтеров
    // Можно использовать child_process для выполнения системных команд
    return [];
  } catch (error) {
    console.error('[IPC] Ошибка получения системных принтеров:', error);
    return [];
  }
});

// IPC обработчик для печати сырого текста
ipcMain.handle('print-raw-to-printer', async (_event, printerName: string, rawData: string) => {
  console.log(`[IPC] Печать сырого текста на принтере: ${printerName}`);
  try {
    // Найти принтер в конфигурации
    const printer = printersList.find(p => p.name === printerName);
    if (!printer) {
      console.error(`[IPC] Принтер "${printerName}" не найден в конфигурации`);
      return false;
    }

    if (printer.connectionType === 'network' && printer.ip && printer.port) {
      return await sendRawDataToNetworkPrinter(printer.ip, printer.port, rawData);
    }

    console.error(`[IPC] Неподдерживаемый тип подключения: ${printer.connectionType}`);
    return false;
  } catch (error) {
    console.error('[IPC] Ошибка печати сырого текста:', error);
    return false;
  }
});

// Функция для отправки сырых данных на сетевой принтер
function sendRawDataToNetworkPrinter(ip: string, port: number, data: string): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 секунд

    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.connect(port, ip, () => {
      socket.write(data, 'utf8', error => {
        clearTimeout(timer);
        if (error) {
          console.error('[PRINT] Ошибка отправки данных:', error);
          resolve(false);
        } else {
          console.log('[PRINT] Данные успешно отправлены на принтер');
          resolve(true);
        }
        socket.destroy();
      });
    });

    socket.on('error', error => {
      clearTimeout(timer);
      console.error('[PRINT] Ошибка подключения к принтеру:', error);
      socket.destroy();
      resolve(false);
    });
  });
}

// IPC обработчики для последовательных портов
ipcMain.handle('get-serial-ports', async () => {
  console.log('[IPC] Получение списка последовательных портов');
  try {
    // Для демонстрации возвращаем пустой список
    // В реальном приложении можно использовать библиотеку serialport
    return [];
  } catch (error) {
    console.error('[IPC] Ошибка получения последовательных портов:', error);
    return [];
  }
});

ipcMain.handle('test-serial-port', async () => {
  console.log('[IPC] Тестирование последовательного порта');
  try {
    // Заглушка для тестирования последовательного порта
    return {
      success: false,
      message: 'Последовательные порты не поддерживаются в текущей версии',
    };
  } catch (error) {
    console.error('[IPC] Ошибка тестирования последовательного порта:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

ipcMain.handle('get-enhanced-serial-port-info', async () => {
  console.log('[IPC] Получение расширенной информации о последовательных портах');
  try {
    // Заглушка для расширенной информации о портах
    return [];
  } catch (error) {
    console.error('[IPC] Ошибка получения расширенной информации о портах:', error);
    return [];
  }
});

// IPC обработчики для управления окном
ipcMain.handle('window:toggle-fullscreen', async () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

ipcMain.handle('window:enter-kiosk-mode', async () => {
  if (mainWindow) {
    mainWindow.setKiosk(true);
    return true;
  }
  return false;
});

ipcMain.handle('window:exit-kiosk-mode', async () => {
  if (mainWindow) {
    mainWindow.setKiosk(false);
    return true;
  }
  return false;
});

ipcMain.handle('window:is-fullscreen', async () => {
  if (mainWindow) {
    return mainWindow.isFullScreen();
  }
  return false;
});

ipcMain.handle('window:is-kiosk', async () => {
  if (mainWindow) {
    return mainWindow.isKiosk();
  }
  return false;
});

ipcMain.handle('app:quit', async () => {
  if (mainWindow) {
    // Устанавливаем флаг принудительного закрытия
    const forceCloseFn = (mainWindow as BrowserWindow & { forceClose?: () => void }).forceClose;
    if (forceCloseFn) {
      forceCloseFn();
    }
  }
  app.quit();
  return true;
});

ipcMain.handle('window:minimize', async () => {
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('window:maximize', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});
