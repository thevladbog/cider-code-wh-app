import { useEffect } from 'react';
import { useStore } from '../store';
import { getEnvironment } from '../config/environment';

/**
 * Хук для инициализации API и периодического обновления статуса TLS
 * Используйте этот хук в корневом компоненте приложения
 * @param intervalMs Интервал проверки TLS статуса в миллисекундах (по умолчанию 60 секунд)
 */
export function useApiInitialization(intervalMs = 60000) {
  const { fetchTlsStatus } = useStore();

  // Инициализируем API и TLS при запуске приложения
  useEffect(() => {
    // Получаем начальный статус TLS
    fetchTlsStatus();

    // Настраиваем периодическую проверку
    const intervalId = setInterval(() => {
      fetchTlsStatus();
    }, intervalMs);

    // Очищаем интервал при размонтировании
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchTlsStatus, intervalMs]);
}

/**
 * Проверяет, доступен ли Electron API
 */
export function isElectronApiAvailable(): boolean {
  return Boolean(window?.electronAPI);
}

/**
 * Проверяет, использует ли приложение HTTPS для API
 */
export function isApiSecure(): boolean {
  try {
    // Получаем API URL из конфигурации окружения
    const env = getEnvironment();
    return env.apiBaseUrl.startsWith('https:');
  } catch (e) {
    console.error('Error checking API security:', e);
    return false;
  }
}
