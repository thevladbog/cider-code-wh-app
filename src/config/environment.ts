// Типы для окружения
export interface Environment {
  apiBaseUrl: string;
  mode: 'development' | 'production';
}

// Настройки окружения по умолчанию
const defaultEnvironment: Environment = {
  apiBaseUrl: 'https://beta.api.bottlecode.app',
  mode: 'development',
};

// Текущее окружение
let currentEnvironment = { ...defaultEnvironment };

/**
 * Получение текущего окружения
 */
export function getEnvironment(): Environment {
  return currentEnvironment;
}

/**
 * Инициализация окружения
 */
export function initEnvironment(): void {
  // Определяем текущую среду выполнения
  const nodeEnv = process.env.NODE_ENV;
  
  console.log(`[ENV] Current NODE_ENV: ${nodeEnv}`);

  // Устанавливаем базовый URL API в зависимости от среды
  if (nodeEnv === 'production') {
    currentEnvironment.apiBaseUrl = 'https://api.bottlecode.app';
    currentEnvironment.mode = 'production';
  } else {
    currentEnvironment.apiBaseUrl = 'https://beta.api.bottlecode.app';
    currentEnvironment.mode = 'development';
  }

  console.log(`[ENV] Initialized environment: ${currentEnvironment.mode}`);
  console.log(`[ENV] API Base URL: ${currentEnvironment.apiBaseUrl}`);
}

// Экспортируем функцию для обновления окружения (полезно для тестов)
export function updateEnvironment(partialEnv: Partial<Environment>): void {
  currentEnvironment = { ...currentEnvironment, ...partialEnv };
  console.log('[ENV] Environment updated:', currentEnvironment);
}
