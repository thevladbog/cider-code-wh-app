/**
 * Стандартизированные моки для API сервиса
 * Используйте этот файл для консистентного мокирования API во всех тестах
 */
import { vi } from 'vitest';
import { Order } from '../../src/models/orders';

// Моковые данные заказов для тестов
export const mockOrdersData: Order[] = [
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

// Мок для fetchOrders
export const mockFetchOrders = vi.fn(async (status?: string): Promise<Order[]> => {
  if (status) {
    return mockOrdersData.filter(o => o.status === status);
  }
  return mockOrdersData;
});

// Мок для archiveOrder
export const mockArchiveOrder = vi.fn(async (id: string): Promise<boolean> => {
  return true;
});

// Мок для обработки ошибок в fetchOrders
export const mockFetchOrdersWithError = vi.fn(async (): Promise<Order[]> => {
  console.error('Ошибка при загрузке заказов');
  throw new Error('API Error');
});

// Мок для обработки ошибок в archiveOrder
export const mockArchiveOrderWithError = vi.fn(async (): Promise<boolean> => {
  console.error('Ошибка при архивации заказа');
  throw new Error('Archive API Error');
});

// Настройка моков API
export function setupApiMocks(withErrors = false) {
  return {
    fetchOrders: withErrors ? mockFetchOrdersWithError : mockFetchOrders,
    archiveOrder: withErrors ? mockArchiveOrderWithError : mockArchiveOrder
  };
}

// Не используйте эту функцию - vi.mock не должен вызываться из других модулей
// Вместо этого, используйте setupApiMocks и создавайте vi.mock прямо в тест-файле
export function getApiMockImplementation(withErrors = false) {
  const apiMocks = setupApiMocks(withErrors);
  
  return {
    fetchOrders: apiMocks.fetchOrders,
    archiveOrder: apiMocks.archiveOrder
  };
}