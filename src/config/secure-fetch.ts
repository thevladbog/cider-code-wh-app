import https from 'node:https';
import { getEnvironment } from './environment';
import { createHttpsAgent } from './tls.config';
import { recordSuccessfulConnection, recordFailedConnection } from './tls-status';

/**
 * Безопасный HTTP/HTTPS клиент для запросов к API
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const isHttps = url.startsWith('https:');

  // Создаем опции запроса с HTTPS агентом для TLS
  const fetchOptions: RequestInit & { agent?: https.Agent } = {
    ...options,
  };

  // Если это HTTPS запрос, добавляем HTTPS агент
  if (isHttps) {
    fetchOptions.agent = createHttpsAgent();
  }
  // Используем стандартный fetch с нашими опциями
  // Примечание: в Node.js версии меньше 18 нужно использовать node-fetch
  try {
    const response = await fetch(url, fetchOptions);

    // Если запрос успешен, записываем успешное соединение
    if (isHttps) {
      recordSuccessfulConnection();
    }

    return response;
  } catch (error) {
    // Если запрос неуспешен, записываем неудачное соединение
    if (isHttps) {
      recordFailedConnection(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }

    throw error;
  }
}

/**
 * Получение конфигурации для запросов с учетом TLS
 */
export function getSecureRequestConfig() {
  const env = getEnvironment();

  return {
    baseUrl: env.apiBaseUrl,
    httpsAgent: createHttpsAgent(),
    timeout: 30000, // 30 секунд
  };
}
