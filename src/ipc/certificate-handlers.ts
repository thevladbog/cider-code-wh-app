/**
 * IPC методы для управления сертификатами
 */

import { ipcMain } from 'electron';

import fs from 'node:fs';
import {
  validateCertificate,
  checkAndUpdateCertificates,
  startCertificateMonitoring,
  updateCertificates,
} from '../utils/cert-manager';
import { getCertsPaths } from '../config/tls.config';
import path from 'node:path';

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
      console.log('[IPC] Начало загрузки сертификатов');
      const { certsDir, certFile, keyFile, caFile } = getCertsPaths();
      console.log(`[IPC] Пути к сертификатам: ${certFile}, ${keyFile}`);

      // Базовые проверки входных данных
      if (!options.certData || options.certData.trim() === '') {
        console.error('[IPC] Отсутствуют данные сертификата');
        throw new Error('Данные сертификата отсутствуют или пусты');
      }

      if (!options.keyData || options.keyData.trim() === '') {
        console.error('[IPC] Отсутствуют данные приватного ключа');
        throw new Error('Данные приватного ключа отсутствуют или пусты');
      }

      // Проверка формата сертификата
      if (!options.certData.includes('-----BEGIN CERTIFICATE-----')) {
        console.error(
          '[IPC] Неверный формат данных сертификата - отсутствует маркер BEGIN CERTIFICATE'
        );
        throw new Error('Неверный формат файла сертификата');
      }

      // Проверка формата приватного ключа
      if (
        !(
          options.keyData.includes('-----BEGIN PRIVATE KEY-----') ||
          options.keyData.includes('-----BEGIN RSA PRIVATE KEY-----')
        )
      ) {
        console.error(
          '[IPC] Неверный формат данных приватного ключа - отсутствует маркер BEGIN PRIVATE KEY'
        );
        throw new Error('Неверный формат файла приватного ключа');
      }

      // Создаем директорию для сертификатов, если она не существует
      if (!fs.existsSync(certsDir)) {
        console.log(`[IPC] Создание директории для сертификатов: ${certsDir}`);
        fs.mkdirSync(certsDir, { recursive: true });
      }

      // Записываем данные сертификатов в файлы
      console.log('[IPC] Запись данных сертификата в файл');
      fs.writeFileSync(certFile, options.certData);
      console.log('[IPC] Запись данных приватного ключа в файл');
      fs.writeFileSync(keyFile, options.keyData);

      // Если есть CA сертификат, тоже записываем
      if (options.caData) {
        console.log('[IPC] Запись данных CA сертификата в файл');
        if (!options.caData.includes('-----BEGIN CERTIFICATE-----')) {
          console.warn(
            '[IPC] CA сертификат не содержит маркер BEGIN CERTIFICATE. Проверьте формат.'
          );
        }
        fs.writeFileSync(caFile, options.caData);
      }

      // Проверяем валидность загруженных сертификатов
      console.log('[IPC] Валидация загруженного сертификата');
      const certInfo = validateCertificate(certFile);

      console.log('[IPC] Результат валидации:', certInfo.valid ? 'Действителен' : 'Недействителен');

      // Детальное логирование выявленных проблем
      console.log('[IPC] Информация о сертификате:', {
        valid: certInfo.valid,
        domain: certInfo.domain,
        issuer: certInfo.issuer,
        notBefore: certInfo.notBefore,
        notAfter: certInfo.notAfter,
      });

      if (!certInfo.valid) {
        // Подробная информация о причине недействительности
        let reason = 'Загруженный сертификат недействителен';

        if (!certInfo.domain) {
          reason += ': отсутствует информация о домене (CN или альтернативные поля)';
          console.error(
            '[IPC] Отсутствует информация о домене. Попробуйте использовать сертификат с указанным CN или SAN полями.'
          );
        } else if (!certInfo.issuer) {
          reason += ': отсутствует информация о издателе';
        } else if (certInfo.notBefore && new Date() < certInfo.notBefore) {
          reason += ': сертификат еще не действителен';
        } else if (certInfo.notAfter && new Date() > certInfo.notAfter) {
          reason += ': срок действия сертификата истек';
        }

        throw new Error(reason);
      }

      // Проверяем, что приватный ключ соответствует сертификату
      try {
        // Используем встроенный модуль child_process
        const { execFile } = await import('child_process');
        const script = path.join(process.cwd(), 'scripts', 'verify-cert-key-pair.cjs');

        console.log('[IPC] Проверка соответствия сертификата и приватного ключа');

        // Выполняем скрипт проверки асинхронно
        const verifyPromise = new Promise<boolean>((resolve, reject) => {
          execFile(
            'node',
            [script, certFile, keyFile],
            (error: Error | null, stdout: string, stderr: string) => {
              if (error) {
                console.error('[IPC] Ошибка при проверке пары сертификат/ключ:', error);
                console.error(stderr);
                reject(new Error('Сертификат и приватный ключ не соответствуют друг другу'));
              } else {
                console.log('[IPC] Результат проверки пары сертификат/ключ:');
                console.log(stdout);
                resolve(true);
              }
            }
          );
        });

        // Ожидаем результат с таймаутом 5 секунд
        await Promise.race([
          verifyPromise,
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('Тайм-аут при проверке сертификата')), 5000)
          ),
        ]);
      } catch (verifyError) {
        console.error('[IPC] Ошибка при проверке сертификата и ключа:', verifyError);
        // Продолжаем выполнение даже при ошибке, но логируем предупреждение
        console.warn('[IPC] Продолжение процесса несмотря на ошибку проверки');
      }

      // Перезагружаем HTTPS агент
      console.log('[IPC] Обновление сертификатов');
      await updateCertificates(certsDir, true);

      console.log('[IPC] Сертификаты успешно загружены и активированы');
      return {
        success: true,
        certInfo,
      };
    } catch (error) {
      console.error('[IPC] Ошибка загрузки сертификатов:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка',
      };
    }
  });

  // Запуск мониторинга сертификатов
  ipcMain.handle(
    'certificate:start-monitoring',
    async (_, intervalMs?: number, updateSource?: string) => {
      try {
        const interval = intervalMs || 24 * 60 * 60 * 1000; // По умолчанию 24 часа
        startCertificateMonitoring(interval, !!updateSource, updateSource);
        return { success: true };
      } catch (error) {
        console.error('[IPC] Ошибка запуска мониторинга сертификатов:', error);
        return {
          success: false,
          error: error.message || 'Неизвестная ошибка',
        };
      }
    }
  );
}
