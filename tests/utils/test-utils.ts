import { afterEach } from 'vitest';

// Функция для очистки хранилища Zustand после тестов
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanupZustandStore(store: any) {
  afterEach(() => {
    store.setState({
      orders: [],
      archivedOrders: [],
      selectedOrder: null,
      showArchive: false,
      isLoading: false,
      error: null
    });
  });
}

// Генератор случайного ID для использования в тестах
export function generateTestId() {
  return Math.random().toString(36).substring(2, 15);
}

// Утилита для ожидания определенного времени
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Генератор тестовых заказов
export function generateTestOrder(overrides = {}) {
  return {
    id: generateTestId(),
    orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
    deliveryDate: new Date().toISOString().split('T')[0],
    status: 'NEW' as const,
    consignee: `Test Consignee ${Math.floor(Math.random() * 100)}`,
    address: `Test Address ${Math.floor(Math.random() * 100)}`,
    template: 'Test template',
    ...overrides
  };
}