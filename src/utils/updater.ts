import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { is } from '../utils/environment';

// Типы для обновлений
export enum UpdateStatus {
  Checking = 'checking-for-update',
  Available = 'update-available',
  NotAvailable = 'update-not-available',
  Error = 'error',
  Downloaded = 'update-downloaded',
  Progress = 'download-progress'
}

// Интерфейс для сообщений об обновлении
export interface UpdateMessage {
  status: UpdateStatus;
  info?: UpdateInfo;
  error?: string;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
  };
}

/**
 * Настройка автоматического обновления
 * @param mainWindow Основное окно приложения
 */
export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Логирование и отладка
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;  // Устанавливаем URL сервера обновлений для GitHub Releases
  autoUpdater.setFeedURL({ 
    provider: 'github', 
    owner: 'thevladbog', 
    repo: 'cider-code-wh-app' 
  });
  
  // Для локального тестирования закомментируйте выше и используйте scripts/setup-update-server.cjs

  // Проверка обновлений только в продакшн
  if (is.production) {
    // Проверять обновления при запуске
    setTimeout(() => {
      checkForUpdates();
    }, 3000);

    // Проверять обновления каждые 4 часа
    setInterval(() => {
      checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  // Обработчики событий обновления
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.Checking
    });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.Available,
      info
    });

    // Показать диалог подтверждения загрузки
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: `Доступна новая версия: ${info.version}`,
        detail: 'Хотите загрузить обновление сейчас?',
        buttons: ['Загрузить', 'Позже'],
        defaultId: 0
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      })
      .catch(err => console.error('Ошибка диалога обновления:', err));
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.NotAvailable,
      info
    });
  });

  autoUpdater.on('error', (err: Error) => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.Error,
      error: err.message
    });
    console.error('Ошибка автообновления:', err);
  });

  autoUpdater.on('download-progress', progress => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.Progress,
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred
      }
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendStatusToWindow(mainWindow, {
      status: UpdateStatus.Downloaded,
      info
    });

    // Показать диалог для установки обновления
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: `Обновление до версии ${info.version} загружено`,
        detail: 'Приложение будет перезапущено для установки обновления.',
        buttons: ['Установить сейчас', 'Установить позже'],
        defaultId: 0
      })
      .then(({ response }) => {
        if (response === 0) {
          // Применить обновление и перезапустить приложение
          autoUpdater.quitAndInstall(true, true);
        }
      })
      .catch(err => console.error('Ошибка диалога установки:', err));
  });

  // Регистрация IPC обработчиков
  ipcMain.handle('check-for-updates', checkForUpdates);
  ipcMain.handle('download-update', () => autoUpdater.downloadUpdate());
  ipcMain.handle('quit-and-install', () => autoUpdater.quitAndInstall(true, true));
  ipcMain.handle('get-current-version', () => app.getVersion());
}

/**
 * Проверка наличия обновлений
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    return await autoUpdater.checkForUpdates().then(result => result?.updateInfo || null);
  } catch (error) {
    console.error('Ошибка при проверке обновлений:', error);
    return null;
  }
}

/**
 * Отправка статуса обновления в окно рендерера
 * @param window Окно рендерера
 * @param message Информация об обновлении
 */
function sendStatusToWindow(window: BrowserWindow, message: UpdateMessage) {
  if (window && !window.isDestroyed()) {
    window.webContents.send('update-status', message);
  }
}
