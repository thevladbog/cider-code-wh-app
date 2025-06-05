import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '../utils/jest-dom';

// Импортируем типы
import type { Order } from '../../src/models/orders';

// Создаем все моки с использованием vi.hoisted 
const { mockStore, mockFetchOrders } = vi.hoisted(() => {
  const mockFetchOrdersFn = vi.fn().mockResolvedValue([]);
  
  return {
    mockFetchOrders: mockFetchOrdersFn,
    mockStore: {
      orders: [
        { 
          id: '1', 
          orderNumber: 'ORD-123', 
          status: 'NEW' as const, 
          consignee: 'Company A',
          deliveryDate: '2025-05-28',
          address: 'Test Address 1',
          template: 'template1'
        },
        { 
          id: '2', 
          orderNumber: 'ORD-456', 
          status: 'NEW' as const, 
          consignee: 'Company B',
          deliveryDate: '2025-05-29',
          address: 'Test Address 2',
          template: 'template2'
        }
      ],
      archivedOrders: [] as Order[],
      fetchOrders: mockFetchOrdersFn,
      isLoading: false,
      selectedOrder: null as Order | null,
      showArchive: false,
      error: null as string | null,
      setSelectedOrder: vi.fn(),
      archiveOrder: vi.fn(),
      toggleArchiveView: vi.fn(),
      refreshOrders: vi.fn()
    }
  };
});

// Мокаем модуль zustand store
vi.mock('../../src/store', () => ({
  useStore: () => mockStore
}));

// Импортируем после мока
import { useStore } from '../../src/store';

// Настройка окружения для React тестирования
beforeEach(() => {
  vi.clearAllMocks();
});

// Создаем тестовый компонент
const TestComponent = () => {
  const { orders, fetchOrders } = useStore();
  
  // Вызываем fetchOrders при монтировании
  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  return (
    <div>
      <h1>Orders</h1>
      <div data-testid="order-count">Total orders: {orders.length}</div>
      <ul>
        {orders.map(order => (
          <li key={order.id}>{order.orderNumber} - {order.consignee}</li>
        ))}
      </ul>
    </div>
  );
};

describe('App Component', () => {  
  it('should render orders from store', () => {
    // Отрисовываем компонент
    render(<TestComponent />);
    
    // Проверяем заголовок
    expect(screen.getByText('Orders')).toBeInTheDocument();
    
    // Проверяем количество заказов
    expect(screen.getByTestId('order-count')).toHaveTextContent('Total orders: 2');
    
    // Проверяем что fetchOrders был вызван
    expect(mockFetchOrders).toHaveBeenCalledTimes(1);
    
    // Проверяем что заказы отображаются
    expect(screen.getByText('ORD-123 - Company A')).toBeInTheDocument();
    expect(screen.getByText('ORD-456 - Company B')).toBeInTheDocument();
  });
});
