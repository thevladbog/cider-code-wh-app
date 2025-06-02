import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockOrders } from '../../src/models/orders';
import * as API from '../../src/services/api';
import { useStore } from '../../src/store';

// Мокаем API для интеграционных тестов
vi.mock('../../src/services/api', () => ({
  fetchOrders: vi.fn(async (status) => {
    if (status === 'ARCHIVE') {
      return Promise.resolve(mockOrders.filter(order => order.status === 'ARCHIVE'));
    }
    return Promise.resolve(mockOrders.filter(order => order.status === 'NEW'));
  }),
  archiveOrder: vi.fn(async () => {
    return Promise.resolve(true);
  })
}));

describe('Orders Integration', () => {
  // Настраиваем состояние перед каждым тестом
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Сбрасываем состояние хранилища Zustand
    useStore.setState({
      orders: [],
      archivedOrders: [],
      selectedOrder: null,
      showArchive: false,
      isLoading: false,
      error: null
    });
  });

  it('should fetch orders and update store state', async () => {
    // Вызываем метод из хранилища
    await useStore.getState().fetchOrders();
    
    // Проверяем, что API был вызван
    expect(API.fetchOrders).toHaveBeenCalledWith('NEW');
    expect(API.fetchOrders).toHaveBeenCalledWith('ARCHIVE');
    
    // Проверяем обновление хранилища
    const store = useStore.getState();
    expect(store.orders.length).toBeGreaterThan(0);
    expect(store.archivedOrders.length).toBeGreaterThan(0);
    expect(store.orders[0].status).toBe('NEW');
    expect(store.archivedOrders[0].status).toBe('ARCHIVE');
  });
  
  it('should archive an order', async () => {
    // Сначала загружаем данные
    await useStore.getState().fetchOrders();
    
    // Сохраняем начальное состояние
    const initialState = useStore.getState();
    const initialActiveCount = initialState.orders.length;
    const initialArchivedCount = initialState.archivedOrders.length;
    const orderToArchive = initialState.orders[0];
    
    // Архивируем заказ
    await initialState.archiveOrder(orderToArchive.id);
    
    // Проверяем, что API был вызван
    expect(API.archiveOrder).toHaveBeenCalledWith(orderToArchive.id);
    
    // Проверяем состояние хранилища
    const updatedState = useStore.getState();
    expect(updatedState.orders.length).toBe(initialActiveCount - 1);
    expect(updatedState.archivedOrders.length).toBe(initialArchivedCount + 1);
  });
  
  it('should toggle archive view', () => {
    const store = useStore.getState();
    expect(store.showArchive).toBe(false);
    
    store.toggleArchiveView();
    expect(useStore.getState().showArchive).toBe(true);
    
    store.toggleArchiveView();
    expect(useStore.getState().showArchive).toBe(false);
  });
  
  it('should set selected order', () => {
    const store = useStore.getState();
    const testOrder = mockOrders[0];
    
    store.setSelectedOrder(testOrder);
    expect(useStore.getState().selectedOrder).toBe(testOrder);
    
    store.setSelectedOrder(null);
    expect(useStore.getState().selectedOrder).toBeNull();
  });
});