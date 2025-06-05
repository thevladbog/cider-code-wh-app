import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import PrinterSettings from '../../src/components/PrinterSettings';

// Мокаем getSystemPrinters и testPrinterConnection
const mockSystemPrinters = [
  { name: 'Zebra ZT411', portName: 'USB001', isDefault: true },
  { name: 'Brother QL-800', portName: 'USB002', isDefault: false },
];
const mockTestResult = { success: true, message: 'Connection successful' };

vi.mock('../../src/utils/print', () => ({
  getSystemPrinters: () => Promise.resolve(mockSystemPrinters),
  testPrinterConnection: () => Promise.resolve(mockTestResult),
}));
vi.mock('../../src/utils/serialport-helper', () => ({
  getAvailableSerialPorts: () => Promise.resolve([]),
}));

describe('PrinterSettings Component (network printers)', () => {
  it('shows test result after clicking test button', async () => {
    render(<PrinterSettings isOpen={true} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText('Добавить новый принтер'));
    });
    const nameInput = await screen.findByPlaceholderText('Название принтера');
    const networkRadio = await screen.findByLabelText('Сеть');
    const ipInput = await screen.findByPlaceholderText('IP адрес');
    await act(async () => {
      await user.type(nameInput, 'Test Network Printer');
      await user.click(networkRadio);
      await user.type(ipInput, '192.168.1.123');
      await user.click(screen.getByText('Добавить'));
    });
    // Ждём появления нового принтера в списке (форма добавления скрыта)
    await waitFor(() => expect(screen.getByDisplayValue('Test Network Printer')).toBeInTheDocument());
    // Теперь ищем кнопку "Тест" по роли и имени
    const testButtons = screen.getAllByRole('button', { name: /тест/i });
    const lastTestButton = testButtons[testButtons.length - 1];
    expect(lastTestButton).toBeTruthy();
    await act(async () => {
      await user.click(lastTestButton);
    });
    await waitFor(async () => {
      expect(await screen.findByText('Connection successful')).toBeInTheDocument();
    });
  });

  it('can add a new network printer and set as default', async () => {
    render(<PrinterSettings isOpen={true} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText('Добавить новый принтер'));
    });
    const nameInput = await screen.findByPlaceholderText('Название принтера');
    const networkRadio = await screen.findByLabelText('Сеть');
    const ipInput = await screen.findByPlaceholderText('IP адрес');
    await act(async () => {
      await user.type(nameInput, 'Test Network Printer');
      await user.click(networkRadio);
      await user.type(ipInput, '192.168.1.123');
      await user.click(screen.getByText('Добавить'));
    });
    // Новый принтер появляется в списке
    await waitFor(() => expect(screen.getByDisplayValue('Test Network Printer')).toBeInTheDocument());
  });
});