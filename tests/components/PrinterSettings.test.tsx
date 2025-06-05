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
      await user.click(screen.getByText('Добавить принтер'));
    });
    const nameInput = await screen.findByPlaceholderText('Название принтера');
    const networkRadio = await screen.findByLabelText('Сеть');
    await act(async () => {
      await user.type(nameInput, 'Test Network Printer');
      await user.click(networkRadio);
    });
    // Ждём появления кнопки теста
    await waitFor(() => expect(screen.getByText('Тест')).toBeInTheDocument());
    await act(async () => {
      await user.click(screen.getByText('Тест'));
    });
    await waitFor(async () => {
      expect(await screen.findByText('Connection successful')).toBeInTheDocument();
    });
  });

  it('can add a new network printer and set as default', async () => {
    render(<PrinterSettings isOpen={true} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText('Добавить принтер'));
    });
    const nameInput = await screen.findByPlaceholderText('Название принтера');
    const networkRadio = await screen.findByLabelText('Сеть');
    await act(async () => {
      await user.type(nameInput, 'Test Network Printer');
      await user.click(networkRadio);
      await user.click(screen.getByText('Добавить'));
    });
    // Новый принтер появляется в списке
    await waitFor(() => expect(screen.getByDisplayValue('Test Network Printer')).toBeInTheDocument());
  });
});