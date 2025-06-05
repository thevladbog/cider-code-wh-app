import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalOrderSearch from '../../src/components/ModalOrderSearch';
import { useStore } from '../../src/store';
import React from 'react';

vi.mock('../../src/store', () => ({
  useStore: vi.fn(),
}));

describe('ModalOrderSearch', () => {
  const archivedOrders = [
    { id: '1', orderNumber: '12345', consignee: 'Test 1' },
    { id: '2', orderNumber: '54321', consignee: 'Test 2' },
    { id: '3', orderNumber: '12399', consignee: 'Test 3' },
  ];

  beforeEach(() => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({ archivedOrders }));
  });

  it('renders and closes correctly', () => {
    const onClose = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={onClose} onOrderSelect={vi.fn()} />);
    expect(screen.getByText('Печать по № заказа')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('searches by order number and selects single result', () => {
    const onOrderSelect = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={onOrderSelect} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(onOrderSelect).toHaveBeenCalledWith('1');
  });

  it('shows not found message for no results', () => {
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '00000' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(screen.getByText('Заказ не найден')).toBeInTheDocument();
  });

  it('shows list for multiple results and allows selection', () => {
    const onOrderSelect = vi.fn();
    render(<ModalOrderSearch isOpen={true} onClose={vi.fn()} onOrderSelect={onOrderSelect} />);
    const input = screen.getByPlaceholderText('Введите номер заказа');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByText('Поиск'));
    expect(screen.getByText('Найдено заказов: 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Test 1/));
    expect(onOrderSelect).toHaveBeenCalledWith('1');
  });
});
