
import { Order } from '../../src/models/orders';

// Тип для имитации store Zustand в тестах
export interface TestStore {
  orders: Order[];
  archivedOrders: Order[];
  selectedOrder: Order | null;
  showArchive: boolean;
  isLoading: boolean;
  error: string | null;
  setSelectedOrder: (order: Order | null) => void;
  archiveOrder: (id: string) => Promise<void>;
  toggleArchiveView: () => void;
  fetchOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
}

// Функция для очистки хранилища Zustand после тестов
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
export function generateTestOrder(overrides = {}): Order {
  return {
    id: generateTestId(),
    orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
    status: 'NEW',
    deliveryDate: new Date().toISOString().split('T')[0],
    consignee: 'Test Company',
    address: 'Test Address',
    template: 'default',
    ...overrides
  };
}

function afterEach(arg0: () => void) {
  throw new Error('Function not implemented.');
}
