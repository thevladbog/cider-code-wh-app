import React, { useEffect, useState } from 'react';
import { XMarkIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { testPrinterConnection, getAvailableUSBDevices, USBDeviceInfo } from '../utils/print';
import { getAvailableSerialPorts } from '../utils/serialport-helper';

interface PrinterConfig {
  name: string;
  connectionType: 'network' | 'usb' | 'serial';
  ip?: string;
  port?: number;
  usbPath?: string;
  serialPath?: string;
  baudRate?: number;
  isDefault?: boolean;
}

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewPrinter {
  name: string;
  connectionType: 'network' | 'usb' | 'serial';
  ip: string;
  port: number;
  usbPath: string;
  serialPath: string;
  baudRate: number;
  isDefault: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ isOpen, onClose }) => {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPrinter, setNewPrinter] = useState<NewPrinter>({
    name: '',
    connectionType: 'network',
    ip: '',
    port: 9100,
    usbPath: '',
    serialPath: '',
    baudRate: 9600,
    isDefault: false  });
  
  const [availableUSBDevices, setAvailableUSBDevices] = useState<USBDeviceInfo[]>([]);
  const [availableSerialPorts, setAvailableSerialPorts] = useState<string[]>([]);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
      loadAvailableDevices();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    try {
      const storedPrinters = localStorage.getItem('printers');
      if (storedPrinters) {
        const parsedPrinters = JSON.parse(storedPrinters);
        console.log('[CONFIG] Загруженные принтеры из localStorage:', parsedPrinters);
        setPrinters(parsedPrinters);
      }
    } catch (error) {
      console.error('[CONFIG] Ошибка при загрузке принтеров:', error);
    }
  };
  const loadAvailableDevices = async () => {
    try {
      // Загрузка USB устройств
      const usbDevices = await getAvailableUSBDevices();
      setAvailableUSBDevices(usbDevices);      // Загрузка последовательных портов
      const serialPorts = await getAvailableSerialPorts();
      setAvailableSerialPorts(serialPorts.map(port => port.path));
    } catch (error) {
      console.error('[DEVICE] Ошибка при загрузке доступных устройств:', error);
    }
  };

  const validatePrinter = (printer: PrinterConfig): boolean => {
    if (!printer || typeof printer !== 'object' ||
        typeof printer.name !== 'string' || printer.name.trim() === '' ||
        !printer.connectionType ||
        (printer.connectionType !== 'network' && printer.connectionType !== 'usb' && printer.connectionType !== 'serial')) {
      return false;
    }

    if (printer.connectionType === 'network') {
      return typeof printer.ip === 'string' && printer.ip.trim() !== '' &&
             typeof printer.port === 'number' && printer.port > 0;
    }
    if (printer.connectionType === 'usb') {
      return typeof printer.usbPath === 'string' && printer.usbPath.trim() !== '';
    }
    if (printer.connectionType === 'serial') {
      return typeof printer.serialPath === 'string' && printer.serialPath.trim() !== '';
    }
    return false;
  };

  const savePrinters = () => {
    try {
      const invalidPrinters = printers.filter(printer => !validatePrinter(printer));
      
      if (invalidPrinters.length > 0) {
        console.error('[CONFIG] Обнаружены невалидные принтеры перед сохранением:', invalidPrinters);
        alert(`Обнаружены некорректные настройки принтеров (${invalidPrinters.length}). Пожалуйста, проверьте и исправьте данные.`);
        return;
      }

      console.log('[CONFIG] Сохранение принтеров в localStorage:', printers);
      localStorage.setItem('printers', JSON.stringify(printers));
      onClose();
    } catch (error) {
      console.error('[CONFIG] Ошибка при сохранении принтеров:', error);
      alert('Ошибка при сохранении настроек принтеров');
    }
  };

  const updatePrinter = (index: number, field: string, value: string | number | boolean) => {
    setPrinters(printers.map((printer, i) => ({
      ...printer,
      ...(i === index ? { [field]: value } : {})
    })));
  };

  const removePrinter = (index: number) => {
    const updatedPrinters = [...printers];
    updatedPrinters.splice(index, 1);
    setPrinters(updatedPrinters);
  };

  const addNewPrinter = () => {
    if (!newPrinter.name) return;
    if (newPrinter.connectionType === 'network' && !newPrinter.ip) return;
    if (newPrinter.connectionType === 'usb' && !newPrinter.usbPath) return;
    if (newPrinter.connectionType === 'serial' && !newPrinter.serialPath) return;

    const printerToAdd = {
      name: newPrinter.name,
      connectionType: newPrinter.connectionType || 'network',
      ...(newPrinter.connectionType === 'network' ? {
        ip: newPrinter.ip || '',
        port: newPrinter.port || 9100
      } : newPrinter.connectionType === 'serial' ? {
        serialPath: newPrinter.serialPath || '',
        baudRate: newPrinter.baudRate || 9600
      } : {
        usbPath: newPrinter.usbPath || ''
      }),
      isDefault: newPrinter.isDefault || (printers.length === 0)
    };

    let updatedPrinters = [...printers];
    
    if (printerToAdd.isDefault) {
      updatedPrinters = updatedPrinters.map(p => ({ ...p, isDefault: false }));
    }

    setPrinters([...updatedPrinters, printerToAdd as PrinterConfig]);
    
    setNewPrinter({
      name: '',
      connectionType: 'network',
      ip: '',
      port: 9100,
      usbPath: '',
      serialPath: '',
      baudRate: 9600,
      isDefault: false
    });
    
    setIsAddingNew(false);
  };

  const testPrinter = async (printer: PrinterConfig) => {
    try {
      setTestingPrinter(printer.name);
      setTestResult(null);

      const result = await testPrinterConnection(printer);
      setTestResult(result);
    } catch (error) {
      console.error('[TEST] Ошибка при тестировании принтера:', error);
      setTestResult({
        success: false,
        message: `Ошибка при тестировании: ${error}`
      });
    } finally {
      setTestingPrinter(null);
      
      setTimeout(() => {
        setTestResult(null);
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Настройки принтеров</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Список существующих принтеров */}
              {printers.map((printer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={printer.name}
                      onChange={(e) => updatePrinter(index, 'name', e.target.value)}
                      className="text-lg font-medium border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                      placeholder="Название принтера"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testPrinter(printer)}
                        disabled={testingPrinter === printer.name}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {testingPrinter === printer.name ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                        )}
                        Тест
                      </button>
                      <button
                        onClick={() => removePrinter(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Результат тестирования */}
                  {testResult && testingPrinter === null && (
                    <div className={`mb-3 p-2 rounded ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {testResult.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Тип подключения */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Тип подключения
                      </label>
                      <div className="space-y-2">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="network"
                            checked={printer.connectionType === 'network'}
                            onChange={(e) => updatePrinter(index, 'connectionType', e.target.value)}
                            className="form-radio"
                          />
                          <span className="ml-2">Сеть</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="usb"
                            checked={printer.connectionType === 'usb'}
                            onChange={(e) => updatePrinter(index, 'connectionType', e.target.value)}
                            className="form-radio"
                          />
                          <span className="ml-2">USB</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="serial"
                            checked={printer.connectionType === 'serial'}
                            onChange={(e) => updatePrinter(index, 'connectionType', e.target.value)}
                            className="form-radio"
                          />
                          <span className="ml-2">Последовательный порт</span>
                        </label>
                      </div>
                    </div>

                    {/* Настройки подключения */}
                    <div>
                      {printer.connectionType === 'network' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">IP адрес</label>
                            <input
                              type="text"
                              value={printer.ip || ''}
                              onChange={(e) => updatePrinter(index, 'ip', e.target.value)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="192.168.1.100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Порт</label>
                            <input
                              type="number"
                              value={printer.port || 9100}
                              onChange={(e) => updatePrinter(index, 'port', parseInt(e.target.value) || 9100)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="9100"
                            />
                          </div>
                        </div>
                      )}

                      {printer.connectionType === 'usb' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">USB устройство</label>                          <select
                            value={printer.usbPath || ''}
                            onChange={(e) => updatePrinter(index, 'usbPath', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Выберите USB устройство</option>
                            {availableUSBDevices.map((device, idx) => (
                              <option key={idx} value={device.path}>
                                {device.name || device.description} ({device.path})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {printer.connectionType === 'serial' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Последовательный порт</label>
                            <select
                              value={printer.serialPath || ''}
                              onChange={(e) => updatePrinter(index, 'serialPath', e.target.value)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Выберите порт</option>
                              {availableSerialPorts.map((port, idx) => (
                                <option key={idx} value={port}>
                                  {port}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Скорость передачи (baud rate)</label>
                            <select
                              value={printer.baudRate || 9600}
                              onChange={(e) => updatePrinter(index, 'baudRate', parseInt(e.target.value))}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value={9600}>9600</option>
                              <option value={19200}>19200</option>
                              <option value={38400}>38400</option>
                              <option value={57600}>57600</option>
                              <option value={115200}>115200</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={printer.isDefault || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPrinters(printers.map((p, i) => ({
                              ...p,
                              isDefault: i === index
                            })));
                          } else {
                            updatePrinter(index, 'isDefault', false);
                          }
                        }}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-700">Принтер по умолчанию</span>
                    </label>
                  </div>
                </div>
              ))}

              {/* Форма добавления нового принтера */}
              {isAddingNew && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Добавить новый принтер</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Название</label>
                      <input
                        type="text"
                        value={newPrinter.name}
                        onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Название принтера"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Тип подключения
                      </label>
                      <div className="space-y-2">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="network"
                            checked={newPrinter.connectionType === 'network'}
                            onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value as 'network' | 'usb' | 'serial' })}
                            className="form-radio"
                          />
                          <span className="ml-2">Сеть</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="usb"
                            checked={newPrinter.connectionType === 'usb'}
                            onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value as 'network' | 'usb' | 'serial' })}
                            className="form-radio"
                          />
                          <span className="ml-2">USB</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="serial"
                            checked={newPrinter.connectionType === 'serial'}
                            onChange={(e) => setNewPrinter({ ...newPrinter, connectionType: e.target.value as 'network' | 'usb' | 'serial' })}
                            className="form-radio"
                          />
                          <span className="ml-2">Последовательный порт</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Специфичные настройки */}
                  <div className="mt-4">
                    {newPrinter.connectionType === 'network' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">IP адрес</label>
                          <input
                            type="text"
                            value={newPrinter.ip}
                            onChange={(e) => setNewPrinter({ ...newPrinter, ip: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="192.168.1.100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Порт</label>
                          <input
                            type="number"
                            value={newPrinter.port}
                            onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) || 9100 })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="9100"
                          />
                        </div>
                      </div>
                    )}

                    {newPrinter.connectionType === 'usb' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">USB устройство</label>                        <select
                          value={newPrinter.usbPath}
                          onChange={(e) => setNewPrinter({ ...newPrinter, usbPath: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Выберите USB устройство</option>
                          {availableUSBDevices.map((device, idx) => (
                            <option key={idx} value={device.path}>
                              {device.name || device.description} ({device.path})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {newPrinter.connectionType === 'serial' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Последовательный порт</label>
                          <select
                            value={newPrinter.serialPath}
                            onChange={(e) => setNewPrinter({ ...newPrinter, serialPath: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Выберите порт</option>
                            {availableSerialPorts.map((port, idx) => (
                              <option key={idx} value={port}>
                                {port}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Скорость передачи (baud rate)</label>
                          <select
                            value={newPrinter.baudRate}
                            onChange={(e) => setNewPrinter({ ...newPrinter, baudRate: parseInt(e.target.value) })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={9600}>9600</option>
                            <option value={19200}>19200</option>
                            <option value={38400}>38400</option>
                            <option value={57600}>57600</option>
                            <option value={115200}>115200</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newPrinter.isDefault}
                        onChange={(e) => setNewPrinter({ ...newPrinter, isDefault: e.target.checked })}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-sm text-gray-700">Принтер по умолчанию</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setIsAddingNew(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={addNewPrinter}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}

              {/* Кнопка добавления нового принтера */}
              {!isAddingNew && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Добавить принтер
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={savePrinters}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Сохранить
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;
