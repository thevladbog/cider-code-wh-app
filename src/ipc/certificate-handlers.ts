/**
 * IPC методы для управления сертификатами
 */

import { ipcMain , app } from 'electron';

import path from 'node:path';
import fs from 'node:fs';
import { 
  validateCertificate, 
  checkAndUpdateCertificates, 
  startCertificateMonitoring,
  updateCertificates,
  CertificateInfo
} from '../utils/cert-manager';
import { getCertsPaths } from '../config/tls.config';

// Интерфейсы для работы с сертификатами через IPC
interface UploadCertificateOptions {
  certData: string;
  keyData: string;
  caData?: string;
}

/**
 * Регистрация IPC методов для работы с сертификатами
 */
export function registerCertificateIPCHandlers() {
  // Получение информации о текущем сертификате
  ipcMain.handle('certificate:info', async () => {
    const { certFile } = getCertsPaths();
    return validateCertificate(certFile);
  });

  // Проверка и обновление сертификата
  ipcMain.handle('certificate:check-and-update', async (_, updateSource?: string) => {
    if (updateSource) {
      return await checkAndUpdateCertificates(true, updateSource);
    }
    return await checkAndUpdateCertificates(false);
  });

  // Загрузка сертификатов из файлов или строковых данных
  ipcMain.handle('certificate:upload', async (_, options: UploadCertificateOptions) => {
    try {
      const { certsDir, certFile, keyFile, caFile } = getCertsPaths();

      // Создаем директорию для сертификатов, если она не существует
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      // Записываем данные сертификатов в файлы
      fs.writeFileSync(certFile, options.certData);
      fs.writeFileSync(keyFile, options.keyData);

      // Если есть CA сертификат, тоже записываем
      if (options.caData) {
        fs.writeFileSync(caFile, options.caData);
      }

      // Проверяем валидность загруженных сертификатов
      const certInfo = validateCertificate(certFile);
      if (!certInfo.valid) {
        throw new Error('Загруженный сертификат недействителен');
      }

      // Перезагружаем HTTPS агент
      await updateCertificates(certsDir, true);

      return {
        success: true,
        certInfo
      };
    } catch (error) {
      console.error('[IPC] Ошибка загрузки сертификатов:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  });

  // Запуск мониторинга сертификатов
  ipcMain.handle('certificate:start-monitoring', async (_, intervalMs?: number, updateSource?: string) => {
    try {
      const interval = intervalMs || 24 * 60 * 60 * 1000; // По умолчанию 24 часа
      startCertificateMonitoring(interval, !!updateSource, updateSource);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Ошибка запуска мониторинга сертификатов:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  });
}
