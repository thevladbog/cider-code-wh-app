import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../../src/store';
import { Order } from '../../src/models/orders';

// Mock window.electronAPI
const mockElectronAPI = {
  fetchOrders: vi.fn(),
  getTlsStatus: vi.fn(),
  archiveOrder: vi.fn(),
  updateOrderStatus: vi.fn()
};

describe('Store', () => {
  beforeEach(() => {
    // Сбрасываем моки и состояние хранилища перед каждым тестом
    vi.clearAllMocks();
    
    // Setup window.electronAPI mock
    vi.stubGlobal('window', {
      electronAPI: mockElectronAPI
    });
    
    useStore.setState({
      orders: [],
      archivedOrders: [],
      selectedOrder: null,
      showArchive: false,
      isLoading: false,
      error: null,
      tlsStatus: null,
      tlsStatusLoading: false,
      tlsStatusError: null
    });
  });

  describe('fetchOrders', () => {
    it('should load orders and update store state', async () => {
      const mockActiveOrders = [
        { id: '1', orderNumber: '12345', status: 'NEW', deliveryDate: '2023-01-01', consignee: 'Test Company', address: 'Test Address', template: 'template' }
      ];
      const mockArchivedOrders = [
        { id: '2', orderNumber: '12346', status: 'ARCHIVE', deliveryDate: '2023-01-02', consignee: 'Test Company 2', address: 'Test Address 2', template: 'template' }
      ];      // Настраиваем моки electronAPI
      mockElectronAPI.fetchOrders.mockImplementation((status) => {
        if (status === 'NEW') {
          return Promise.resolve({ success: true, data: mockActiveOrders });
        } else {
          return Promise.resolve({ success: true, data: mockArchivedOrders });
        }
      });

      mockElectronAPI.getTlsStatus.mockResolvedValue({
        isConnected: true,
        lastChecked: new Date().toISOString()
      });

      // Вызываем метод из store
      const store = useStore.getState();
      await store.fetchOrders();

      // Проверяем, что electronAPI был вызван
      expect(mockElectronAPI.fetchOrders).toHaveBeenCalledWith('NEW');
      expect(mockElectronAPI.fetchOrders).toHaveBeenCalledWith('ARCHIVE');

      // Проверяем обновление состояния
      const updatedStore = useStore.getState();
      expect(updatedStore.orders).toEqual(mockActiveOrders);
      expect(updatedStore.archivedOrders).toEqual(mockArchivedOrders);
      expect(updatedStore.isLoading).toBe(false);
      expect(updatedStore.error).toBeNull();
    });    it('should handle API errors', async () => {
      const errorMessage = 'Failed to fetch active orders';
      
      // Настраиваем мок electronAPI с ошибкой
      mockElectronAPI.fetchOrders.mockResolvedValue({
        success: false,
        error: errorMessage
      });

      // Вызываем метод из store
      const store = useStore.getState();
      await store.fetchOrders();

      // Проверяем обработку ошибки
      const updatedStore = useStore.getState();
      expect(updatedStore.isLoading).toBe(false);
      expect(updatedStore.error).toBe(errorMessage);
    });
  });

  describe('archiveOrder', () => {
    it('should archive an order and update store state', async () => {
      // Подготавливаем начальное состояние
      const mockOrder = {
        id: '1', 
        orderNumber: '12345', 
        status: 'NEW' as Order['status'], 
        deliveryDate: '2023-01-01', 
        consignee: 'Test Company', 
        address: 'Test Address', 
        template: 'template'
      };
      
      useStore.setState({
        orders: [mockOrder],
        archivedOrders: []
      });      // Настраиваем мок electronAPI
      mockElectronAPI.archiveOrder.mockResolvedValue({ success: true });

      // Вызываем метод из store
      const store = useStore.getState();
      await store.archiveOrder('1');

      // Проверяем, что electronAPI был вызван
      expect(mockElectronAPI.archiveOrder).toHaveBeenCalledWith('1');

      // Проверяем обновление состояния
      const updatedStore = useStore.getState();
      expect(updatedStore.orders).toEqual([]);
      expect(updatedStore.archivedOrders).toHaveLength(1);
      expect(updatedStore.archivedOrders[0].id).toBe('1');
      expect(updatedStore.archivedOrders[0].status).toBe('ARCHIVE');
    });    it('should handle API errors during archiving', async () => {
      const errorMessage = 'Failed to archive order';
      
      // Настраиваем мок electronAPI с ошибкой
      mockElectronAPI.archiveOrder.mockResolvedValue({
        success: false,
        error: errorMessage
      });

      // Вызываем метод из store
      const store = useStore.getState();
      await store.archiveOrder('1');

      // Проверяем обработку ошибки
      const updatedStore = useStore.getState();
      expect(updatedStore.isLoading).toBe(false);
      expect(updatedStore.error).toBe(errorMessage);
    });
  });

  describe('toggleArchiveView', () => {
    it('should toggle archive view state', () => {
      const store = useStore.getState();
      
      // Изначально showArchive = false
      expect(store.showArchive).toBe(false);
      
      // Переключаем
      store.toggleArchiveView();
      expect(useStore.getState().showArchive).toBe(true);
      
      // Переключаем обратно
      store.toggleArchiveView();
      expect(useStore.getState().showArchive).toBe(false);
    });
  });

  describe('setSelectedOrder', () => {
    it('should set selected order', () => {
      const store = useStore.getState();
      const mockOrder = {
        id: '1', 
        orderNumber: '12345', 
        status: 'NEW' as Order['status'], 
        deliveryDate: '2023-01-01', 
        consignee: 'Test Company', 
        address: 'Test Address', 
        template: 'template'
      };
      
      // Устанавливаем выбранный заказ
      store.setSelectedOrder(mockOrder);
      expect(useStore.getState().selectedOrder).toEqual(mockOrder);
      
      // Сбрасываем выбранный заказ
      store.setSelectedOrder(null);
      expect(useStore.getState().selectedOrder).toBeNull();
    });
  });
});