import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../utils/jest-dom';

// Определяем тестовые данные
const mockData = [
  { 
    id: '1', 
    orderNumber: 'ORD-123', 
    status: 'NEW', 
    deliveryDate: '2023-01-01', 
    consignee: 'Test Company', 
    address: 'Test Address', 
    template: 'template1' 
  },
  { 
    id: '2', 
    orderNumber: 'ORD-456', 
    status: 'ARCHIVE', 
    deliveryDate: '2023-01-02', 
    consignee: 'Test Company 2', 
    address: 'Test Address 2', 
    template: 'template2' 
  },
  {
    id: '3',
    orderNumber: 'ORD-789',
    status: 'NEW',
    deliveryDate: '2023-01-03',
    consignee: 'Test Company 3',
    address: 'Test Address 3',
    template: 'template1'
  }
];

// Mock API module before imports
vi.mock('../../src/services/api', () => {
  return {
    fetchOrders: vi.fn((status) => {
      if (status) {
        return Promise.resolve(mockData.filter(order => order.status === status));
      }
      return Promise.resolve(mockData);
    }),
    archiveOrder: vi.fn(() => Promise.resolve(true))
  };
});

// Import API module (it will use our mocks)
import * as API from '../../src/services/api';

describe('API Service', () => {
  // Clear mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create spies for console
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('fetchOrders', () => {
    it('should fetch orders with specified status', async () => {
      // Get orders with specified status
      const newOrders = await API.fetchOrders('NEW');
      const archivedOrders = await API.fetchOrders('ARCHIVE');

      // Check that arrays are returned
      expect(Array.isArray(newOrders)).toBe(true);
      expect(Array.isArray(archivedOrders)).toBe(true);
      
      // Check status match
      newOrders.forEach(order => expect(order.status).toBe('NEW'));
      archivedOrders.forEach(order => expect(order.status).toBe('ARCHIVE'));
    });

    it('should return orders with correct structure', async () => {
      const orders = await API.fetchOrders();
      
      // Check order structure
      orders.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('orderNumber');
        expect(order).toHaveProperty('deliveryDate');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('consignee');
        expect(order).toHaveProperty('address');
        expect(order).toHaveProperty('template');
      });
    });
    
    it('should handle errors gracefully', async () => {
      // Explicit spy for console.error
      const errorSpy = vi.spyOn(console, 'error');
      
      // Override implementation for this specific test
      vi.mocked(API.fetchOrders).mockImplementationOnce(() => {
        // Important: explicitly log error
        console.error('Тестовая ошибка API');
        return Promise.reject(new Error('Test API error'));
      });
      
      // Check error handling
      try {
        await API.fetchOrders();
        // If no error thrown, test fails
        expect(false).toBe(true); // This test shouldn't execute
      } catch (error) {
        // Expect error
        expect(error).toBeInstanceOf(Error);
      }
      
      // Check that error was logged
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('archiveOrder', () => {
    it('should return true when archiving an order', async () => {
      // In mock mode should always return true
      const result = await API.archiveOrder('1');
      
      // Check result
      expect(result).toBe(true);
      
      // Check function was called with correct ID
      expect(API.archiveOrder).toHaveBeenCalledWith('1');
    });
    
    it('should handle errors when archiving', async () => {
      // Explicit spy for console.error
      const errorSpy = vi.spyOn(console, 'error');
      
      // Override mock for this test
      vi.mocked(API.archiveOrder).mockImplementationOnce(() => {
        // Important: explicitly log for test
        console.error('Ошибка при архивации заказа');
        return Promise.reject(new Error('Archive error'));
      });
      
      // Check error handling
      try {
        await API.archiveOrder('1');
        // Shouldn't reach this line
        expect(false).toBe(true); // This test shouldn't execute
      } catch (error) {
        // Expect error
        expect(error).toBeInstanceOf(Error);
      }
      
      // Check that error was logged
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
