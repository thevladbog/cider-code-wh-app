import { describe, it, expect } from 'vitest';
import { mockOrders } from '../../src/models/orders';

describe('Order Model', () => {
  describe('Order Interface', () => {
    it('should have correct properties', () => {
      const order = mockOrders[0];
      
      // Проверяем, что объект соответствует интерфейсу Order
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('orderNumber');
      expect(order).toHaveProperty('deliveryDate');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('consignee');
      expect(order).toHaveProperty('address');
      expect(order).toHaveProperty('template');
      
      // Проверяем типы данных
      expect(typeof order.id).toBe('string');
      expect(typeof order.orderNumber).toBe('string');
      expect(typeof order.deliveryDate).toBe('string');
      expect(['NEW', 'ARCHIVE']).toContain(order.status);
      expect(typeof order.consignee).toBe('string');
      expect(typeof order.address).toBe('string');
      expect(typeof order.template).toBe('string');
    });
  });

  describe('mockOrders', () => {
    it('should contain valid orders', () => {
      expect(mockOrders.length).toBeGreaterThan(0);
      
      mockOrders.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('orderNumber');
        expect(order).toHaveProperty('deliveryDate');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('consignee');
        expect(order).toHaveProperty('address');
        expect(order).toHaveProperty('template');
      });
    });
    
    it('should have different ids for each order', () => {
      const ids = mockOrders.map(order => order.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(mockOrders.length);
    });
  });
});