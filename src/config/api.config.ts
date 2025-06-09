import { getEnvironment } from './environment';

// API configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

/**
 * Получение текущей конфигурации API
 */
export function getApiConfig(): ApiConfig {
  const env = getEnvironment();

  return {
    baseUrl: env.apiBaseUrl,
    timeout: 30000, // 30 seconds
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Добавляем заголовки для поддержки TLS
      'X-TLS-Verify': '1',
      'X-Client-Cert-Present': '1',
    },
  };
}

// Экспортируем конфигурацию для текущей среды
export const apiConfig: ApiConfig = getApiConfig();

// Константы для эндпоинтов API
export const API_ENDPOINTS = {
  orders: '/saby/order/delivery',
  archive: '/saby/order/delivery/archive',
  // Добавьте другие эндпоинты по необходимости
};
