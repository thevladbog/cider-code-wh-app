# Тесты для Cider Code Warehouse App

## Структура тестов

```
tests/
├── components/      # Тесты React-компонентов
├── integration/     # Интеграционные тесты (API + хранилище)
├── models/          # Тесты моделей данных
├── scripts/         # Тесты для скриптов версионирования и CI/CD
├── services/        # Тесты API-сервисов
├── store/           # Тесты хранилища Zustand
├── types/           # Типы для тестирования
├── utils/           # Тесты утилит и хелперы для тестирования
│   ├── electron-helpers.ts # Хелперы для тестирования Electron API
│   ├── jest-dom.ts        # Кастомные матчеры в стиле Jest DOM
│   └── test-utils.tsx     # Утилиты для тестирования React
└── setup.ts         # Общая настройка тестов
```

## Запуск тестов

```bash
# Запустить все тесты
npm test

# Запустить тесты в режиме отслеживания изменений
npm run test:watch

# Запустить тесты с отчетом о покрытии
npm run test:coverage

# Запустить тесты для определенной категории
npm run test:scripts    # Тесты для скриптов
npm run test:models     # Тесты для моделей данных
npm run test:store      # Тесты для хранилища состояния
npm run test:utils      # Тесты для утилит
npm run test:api        # Тесты для API-сервисов
npm run test:integration # Интеграционные тесты
npm run test:components # Тесты компонентов

# Запустить тесты с определенным фильтром
npm run test:filter print  # Запустить все тесты, связанные с печатью
```

## Особенности тестирования

### Настройка модулей

В тестах используется мокирование различных модулей:

```typescript
// Пример мокирования модуля
vi.mock('../../src/utils/print', () => ({
  printLabels: mockPrintLabels,
  getAvailablePrinters: mockGetPrinters,
  testPrinterConnection: mockTestPrinterConnection
}));
```

### Тестирование Electron API

Для тестирования функций, взаимодействующих с Electron API, используется `electron-helpers.ts`:

```typescript
import { setupElectronPrintMocks, cleanupElectronMocks } from '../utils/electron-helpers';

describe('Print Utils', () => {
  let electronMocks;
  
  beforeEach(() => {
    electronMocks = setupElectronPrintMocks();
  });
  
  afterEach(() => {
    cleanupElectronMocks();
  });
  
  it('should call Electron API', async () => {
    // Тест использующий электронные API
  });
});
```

### Тестирование React-компонентов

Для тестирования React-компонентов используется React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import '../utils/jest-dom'; // Кастомные матчеры

it('should render component', () => {
  render(<MyComponent />);
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Решение проблем с тестами

### Общие проблемы и их решения

1. **Ошибка "Cannot access X before initialization"**
   - Проблема связана с hoisting для `vi.mock`
   - Решение: перенести `vi.mock` в начало файла и использовать встроенные функции:
   ```js
   vi.mock('module', () => ({
     // Функции определяются прямо внутри
     func: vi.fn()
   }));
   ```

2. **Ошибки с моками и шпионами**
   - Убедитесь, что вы объявили шпиона *до* вызова тестируемой функции
   - Для проверки вызова функций используйте `expect(func).toHaveBeenCalled()`

3. **Асинхронные тесты не срабатывают**
   - Используйте `async/await` и `vi.waitFor()` для ожидания асинхронных операций
   - Не забудьте пометить тесты как `async` если используете `await`

4. **Проблемы с CommonJS и ES модулями**
   - Используйте `await import()` для загрузки CommonJS модулей в тестах

### Отладка тестов

Для запуска тестов с расширенным выводом используйте:

```bash
npm run test:filter utils -- --debug
```

## Полезные ссылки

- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)