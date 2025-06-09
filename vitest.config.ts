import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    // Добавляем поддержку JSX
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Дополнительная настройка для работы с React Testing Library
    css: true,
    reporters: ['default', 'verbose'],
    // Увеличиваем timeout для асинхронных тестов
    testTimeout: 10000,
    // Настройки для работы с mocks
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    // Fix for React 18 concurrent features in tests
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'v8', // используем новый провайдер для более точного покрытия
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**']
    }
  },
});