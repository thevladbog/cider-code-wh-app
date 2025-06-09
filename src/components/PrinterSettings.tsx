import React, { useEffect, useState } from 'react';
import { XMarkIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { testPrinterConnection, PrinterConfig } from '../utils/print';

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewPrinter {
  name: string;
  connectionType: 'network';
  ip: string;
  port: number;
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
    isDefault: false,
  });
  const [testResults, setTestResults] = useState<Record<number, TestResult | null>>({});
  const [testingPrinter, setTestingPrinter] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getPrinters) {
        const printersFromFile = await window.electronAPI.getPrinters();
        setPrinters(
          (printersFromFile || [])
            .filter(p => p.connectionType === 'network' && p.ip && p.port)
            .map(
              (p): PrinterConfig => ({
                name: p.name,
                connectionType: 'network' as const,
                ip: p.ip || '',
                port: p.port || 9100,
                isDefault: p.isDefault,
              })
            )
        );
      } else {
        const storedPrinters = localStorage.getItem('printers');
        if (storedPrinters) {
          const parsedPrinters = JSON.parse(storedPrinters)
            .filter(
              (p: { connectionType: string; ip?: string; port?: number }) =>
                p.connectionType === 'network' && p.ip && p.port
            )
            .map(
              (p: {
                name: string;
                ip: string;
                port: number;
                isDefault?: boolean;
              }): PrinterConfig => ({
                name: p.name,
                connectionType: 'network' as const,
                ip: p.ip,
                port: p.port,
                isDefault: p.isDefault ?? false,
              })
            );
          setPrinters(parsedPrinters);
        }
      }
    } catch (error) {
      console.error('[CONFIG] Ошибка при загрузке принтеров:', error);
    }
  };

  const validatePrinter = (printer: PrinterConfig): boolean => {
    if (
      !printer ||
      typeof printer !== 'object' ||
      typeof printer.name !== 'string' ||
      printer.name.trim() === '' ||
      printer.connectionType !== 'network'
    ) {
      return false;
    }
    return (
      typeof printer.ip === 'string' &&
      printer.ip.trim() !== '' &&
      typeof printer.port === 'number' &&
      printer.port > 0
    );
  };

  const savePrinters = async () => {
    try {
      const invalidPrinters = printers.filter(printer => !validatePrinter(printer));
      if (invalidPrinters.length > 0) {
        alert(
          `Обнаружены некорректные настройки принтеров (${invalidPrinters.length}). Пожалуйста, проверьте и исправьте данные.`
        );
        return;
      }
      if (window.electronAPI && window.electronAPI.savePrinterConfig) {
        const result = await window.electronAPI.savePrinterConfig(printers);
        if (result.success) {
          onClose();
        } else {
          alert('Ошибка при сохранении настроек принтеров: ' + result.message);
        }
      } else {
        localStorage.setItem('printers', JSON.stringify(printers));
        onClose();
      }
    } catch (error) {
      alert('Ошибка при сохранении настроек принтеров');
    }
  };

  const updatePrinter = (index: number, field: string, value: string | number | boolean) => {
    setPrinters(
      printers.map((printer, i) => ({
        ...printer,
        ...(i === index ? { [field]: value } : {}),
      }))
    );
  };

  const removePrinter = (index: number) => {
    const updatedPrinters = [...printers];
    updatedPrinters.splice(index, 1);
    setPrinters(updatedPrinters);
  };

  const addNewPrinter = () => {
    if (!newPrinter.name || !newPrinter.ip) return;
    const printerToAdd: PrinterConfig = {
      name: newPrinter.name,
      connectionType: 'network',
      ip: newPrinter.ip,
      port: newPrinter.port,
      isDefault: newPrinter.isDefault || printers.length === 0,
    };
    let updatedPrinters = [...printers];
    if (printerToAdd.isDefault) {
      updatedPrinters = updatedPrinters.map(p => ({ ...p, isDefault: false }));
    }
    setPrinters([...updatedPrinters, printerToAdd]);
    setNewPrinter({ name: '', connectionType: 'network', ip: '', port: 9100, isDefault: false });
    setIsAddingNew(false);
  };

  const testPrinter = async (printer: PrinterConfig, idx: number) => {
    setTestingPrinter(idx);
    setTestResults(prev => ({ ...prev, [idx]: null }));
    try {
      const result = await testPrinterConnection(printer);
      setTestResults(prev => ({ ...prev, [idx]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [idx]: { success: false, message: `Ошибка при тестировании: ${error}` },
      }));
    } finally {
      setTestingPrinter(null);
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [idx]: null }));
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 sm:p-8 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Настройки принтеров
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Список существующих принтеров */}
              {printers.map((printer, index) => (
                <div
                  key={index}
                  className="relative bg-white dark:bg-gray-700 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-600 group hover:shadow-lg transition-shadow"
                >
                  {/* Удалён абсолютный блок с кнопками Тест и Удалить */}
                  {/* Результат тестирования только для этого принтера */}
                  {testResults[index] && (
                    <div
                      className={`mb-2 p-2 rounded text-xs ${testResults[index]?.success ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}
                    >
                      {testResults[index]?.message}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="min-w-0 md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 truncate">
                        Название
                      </label>
                      <input
                        type="text"
                        value={printer.name}
                        onChange={e => updatePrinter(index, 'name', e.target.value)}
                        className="text-base border-gray-300 dark:border-gray-500 rounded-md w-full focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="Название принтера"
                      />
                    </div>
                    <div className="min-w-0 md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 truncate">
                        Тип подключения
                      </label>
                      <div className="flex gap-4 items-center flex-wrap">
                        <label className="inline-flex items-center text-xs min-w-fit dark:text-gray-200">
                          <input
                            type="radio"
                            value="network"
                            checked={printer.connectionType === 'network'}
                            readOnly
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span className="ml-1">Сеть</span>
                        </label>
                      </div>
                    </div>
                    <div className="min-w-0 md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 truncate">
                        IP и порт
                      </label>
                      <div className="flex gap-2 items-start flex-wrap">
                        <input
                          type="text"
                          value={printer.ip}
                          onChange={e => updatePrinter(index, 'ip', e.target.value)}
                          className="w-28 md:w-full min-w-0 border-gray-300 dark:border-gray-500 rounded-md focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="IP адрес"
                        />
                        <input
                          type="number"
                          value={printer.port}
                          onChange={e =>
                            updatePrinter(index, 'port', parseInt(e.target.value) || 9100)
                          }
                          className="w-20 md:w-full min-w-0 border-gray-300 dark:border-gray-500 rounded-md focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="Порт"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 mt-4 md:mt-0 md:col-span-1 md:items-start">
                      <div className="flex gap-2">
                        <button
                          onClick={() => testPrinter(printer, index)}
                          disabled={testingPrinter === index}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-500 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                          {testingPrinter === index ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                          )}
                          Тест
                        </button>
                        <button
                          onClick={() => removePrinter(index)}
                          className="text-red-500 hover:text-red-700 bg-white dark:bg-gray-800 rounded-full p-1 border border-transparent hover:border-red-200 dark:hover:border-red-400 transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="inline-flex items-center text-xs dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={printer.isDefault || false}
                        onChange={e => {
                          if (e.target.checked) {
                            setPrinters(printers.map((p, i) => ({ ...p, isDefault: i === index })));
                          } else {
                            updatePrinter(index, 'isDefault', false);
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">
                        Принтер по умолчанию
                      </span>
                    </label>
                  </div>
                </div>
              ))}

              {/* Форма добавления нового принтера */}
              {isAddingNew && (
                <div className="border-2 border-dashed border-blue-200 dark:border-blue-400 rounded-lg p-5 bg-blue-50/40 dark:bg-gray-700 mt-2">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-base">
                    Добавить новый принтер
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">
                        Название
                      </label>
                      <input
                        type="text"
                        value={newPrinter.name}
                        onChange={e => setNewPrinter({ ...newPrinter, name: e.target.value })}
                        className="border-gray-300 dark:border-gray-500 rounded-md w-full focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="Название принтера"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">
                        Тип подключения
                      </label>
                      <div className="flex gap-4 items-center">
                        <label className="inline-flex items-center text-xs dark:text-gray-200">
                          <input
                            type="radio"
                            value="network"
                            checked={newPrinter.connectionType === 'network'}
                            readOnly
                            className="form-radio h-4 w-4 text-blue-600"
                          />
                          <span className="ml-1">Сеть</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPrinter.ip}
                          onChange={e => setNewPrinter({ ...newPrinter, ip: e.target.value })}
                          className="w-1/2 border-gray-300 dark:border-gray-500 rounded-md focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="IP адрес"
                        />
                        <input
                          type="number"
                          value={newPrinter.port}
                          onChange={e =>
                            setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) || 9100 })
                          }
                          className="w-1/2 border-gray-300 dark:border-gray-500 rounded-md focus:ring-blue-500 focus:border-blue-500 px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          placeholder="Порт"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <label className="inline-flex items-center text-xs dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={newPrinter.isDefault}
                        onChange={e =>
                          setNewPrinter({ ...newPrinter, isDefault: e.target.checked })
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-200">
                        Принтер по умолчанию
                      </span>
                    </label>
                    <button
                      onClick={addNewPrinter}
                      className="ml-auto inline-flex items-center px-4 py-2 border border-blue-500 shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Добавить
                    </button>
                  </div>
                </div>
              )}

              {/* Кнопка добавить принтер */}
              {!isAddingNew && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 dark:border-blue-400 rounded-lg bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" /> Добавить новый принтер
                </button>
              )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end gap-2 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={savePrinters}
              className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;
