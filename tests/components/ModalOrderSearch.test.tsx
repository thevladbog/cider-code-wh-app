import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalOrderSearch from '../../src/components/ModalOrderSearch';
import React from 'react';

// Mock useWindowSize hook
vi.mock('../../src/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ isMobile: false }),
}));

describe('ModalOrderSearch', () => {
  const testOrders = [
    { 
      id: '1', 
      orderNumber: '12345', 
      consignee: 'Test 1',
      deliveryDate: '2025-01-01',
      status: 'NEW' as const,
      address: 'Test Address 1',
      template: 'test-template'
    },
    { 
      id: '2', 
      orderNumber: '54321', 
      consignee: 'Test 2',
      deliveryDate: '2025-01-02',
      status: 'NEW' as const,
      address: 'Test Address 2',
      template: 'test-template'
    },
    { 
      id: '3', 
      orderNumber: '12399', 
      consignee: 'Test 3',
      deliveryDate: '2025-01-03',
      status: 'NEW' as const,
      address: 'Test Address 3',
      template: 'test-template'
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders and closes correctly', () => {
    const onClose = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={onClose} onOrderSelect={vi.fn()} ordersToSearch={testOrders} />);
    expect(screen.getByText('Печать по № заказа')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalled();
  });
  it('searches by order number and selects single result', () => {
    const onOrderSelect = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={onOrderSelect} ordersToSearch={testOrders} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(onOrderSelect).toHaveBeenCalledWith('1');
  });

  it('shows not found message for no results', () => {
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={vi.fn()} ordersToSearch={testOrders} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '00000' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(screen.getByText('Заказ не найден')).toBeInTheDocument();
  });

  it('shows list for multiple results and allows selection', () => {
    const onOrderSelect = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={onOrderSelect} ordersToSearch={testOrders} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(screen.getByText('Найдено заказов: 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Test 1/));
    expect(onOrderSelect).toHaveBeenCalledWith('1');
  });
});
