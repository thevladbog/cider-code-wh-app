import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { getEnvironment } from './environment';

// Интерфейс для состояния TLS
export interface TlsStatus {
  lastConnection: Date | null;
  lastError: string | null;
  certificateInfo: {
    valid: boolean;
    expiration: Date | null;
    issuer: string | null;
    domain: string | null;
  };
  connections: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Глобальное состояние TLS
const tlsStatus: TlsStatus = {
  lastConnection: null,
  lastError: null,
  certificateInfo: {
    valid: false,
    expiration: null,
    issuer: null,
    domain: null,
  },
  connections: {
    total: 0,
    successful: 0,
    failed: 0,
  },
};

/**
 * Получение статуса TLS
 */
export function getTlsStatus(): TlsStatus {
  return { ...tlsStatus };
}

/**
 * Записать успешное соединение
 */
export function recordSuccessfulConnection(): void {
  tlsStatus.lastConnection = new Date();
  tlsStatus.connections.total++;
  tlsStatus.connections.successful++;

  // Сохраняем состояние для аналитики
  saveTlsStatusToFile();
}

/**
 * Записать неудачное соединение
 */
export function recordFailedConnection(error: string): void {
  tlsStatus.lastConnection = new Date();
  tlsStatus.lastError = error;
  tlsStatus.connections.total++;
  tlsStatus.connections.failed++;

  // Сохраняем состояние для аналитики
  saveTlsStatusToFile();
}

/**
 * Обновить информацию о сертификате
 */
export function updateCertificateInfo(
  valid: boolean,
  expiration: Date | null,
  issuer: string | null,
  domain: string | null
): void {
  tlsStatus.certificateInfo = {
    valid,
    expiration,
    issuer,
    domain,
  };

  // Сохраняем состояние для аналитики
  saveTlsStatusToFile();
}

/**
 * Сохранить состояние TLS в файл
 */
function saveTlsStatusToFile(): void {
  try {
    const env = getEnvironment();

    // В режиме разработки сохраняем в текущем каталоге
    if (env.mode === 'development') {
      const filePath = path.join(process.cwd(), 'tls-status.json');
      fs.writeFileSync(filePath, JSON.stringify(tlsStatus, null, 2));
      return;
    }

    // В режиме продакшена сохраняем в каталоге данных приложения
    const filePath = path.join(app.getPath('userData'), 'tls-status.json');
    fs.writeFileSync(filePath, JSON.stringify(tlsStatus, null, 2));
  } catch (error) {
    console.error('[TLS Status] Ошибка сохранения состояния:', error);
  }
}
