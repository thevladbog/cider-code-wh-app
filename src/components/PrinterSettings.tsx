import React, { useEffect, useState } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getAvailablePrinters, testPrinterConnection } from '../utils/print';

interface PrinterConfig {
  name: string;
  ip: string;
  port: number;
  isDefault: boolean;
}

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ isOpen, onClose }) => {  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
  const [newPrinter, setNewPrinter] = useState<Partial<PrinterConfig>>({
    name: '',
    ip: '',
    port: 9100,
    isDefault: false,
  });
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  // Загружаем список принтеров при открытии и устанавливаем фокус
  useEffect(() => {
    if (isOpen) {
      loadPrinters();
      
      // Устанавливаем фокус на модальном окне после короткой задержки
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    setIsLoading(true);
    try {
      const availablePrinters = await getAvailablePrinters();
      setPrinters(availablePrinters);
    } catch (error) {
      console.error('Failed to load printers:', error);
    } finally {
      setIsLoading(false);
    }
  };  // Сохранение настроек принтера через IPC
  const savePrinters = async () => {
    try {
      setIsLoading(true);
      
      // Проверяем наличие принтеров
      if (printers.length === 0) {
        console.warn('[CONFIG] Предупреждение: попытка сохранить пустой список принтеров');
      }
      
      // Глубокая проверка всех принтеров на валидность
      const invalidPrinters = printers.filter(printer => 
        !printer || typeof printer !== 'object' ||
        typeof printer.name !== 'string' || printer.name.trim() === '' ||
        typeof printer.ip !== 'string' || printer.ip.trim() === '' ||
        typeof printer.port !== 'number' || printer.port <= 0
      );
      
      if (invalidPrinters.length > 0) {
        console.error('[CONFIG] Обнаружены невалидные принтеры перед сохранением:', invalidPrinters);
        alert(`Обнаружены некорректные настройки принтеров (${invalidPrinters.length}). Пожалуйста, проверьте и исправьте данные.`);
        return;
      }
      
      // Проверяем, есть ли принтер по умолчанию
      const hasDefault = printers.some(printer => printer.isDefault);
      
      // Если нет принтера по умолчанию, но есть хоть один принтер, устанавливаем первый как принтер по умолчанию
      if (!hasDefault && printers.length > 0) {
        const updatedPrinters = [...printers];
        updatedPrinters[0].isDefault = true;
        setPrinters(updatedPrinters);
        console.log('[CONFIG] Установлен первый принтер как принтер по умолчанию');
      }      if (window.electronAPI) {
        console.log('[CONFIG] Сохранение конфигурации принтеров через electronAPI:', printers);
        
        // Предотвращаем сохранение дублирующихся принтеров с одинаковыми именами
        const uniquePrinters = [];
        const seenNames = new Set();
        
        for (const printer of printers) {
          if (!seenNames.has(printer.name)) {
            seenNames.add(printer.name);
            uniquePrinters.push(printer);
          } else {
            console.warn(`[CONFIG] Предупреждение: Дублирующийся принтер с именем "${printer.name}" будет пропущен`);
          }
        }
        
        if (uniquePrinters.length !== printers.length) {
          console.warn(`[CONFIG] Обнаружены дубликаты: из ${printers.length} принтеров сохранено будет ${uniquePrinters.length}`);
        }
        
        try {          // Убеждаемся, что API для сохранения принтеров доступно
          if (!window.electronAPI || typeof window.electronAPI.savePrinterConfig !== 'function') {
            throw new Error('API для сохранения настроек принтеров недоступно');
          }
          
          console.log('[CONFIG] Вызов API для сохранения принтеров...');
          const result = await window.electronAPI.savePrinterConfig(uniquePrinters);
          console.log('[CONFIG] Получен результат сохранения:', result);
          
          if (result && result.success) {
            console.log('[CONFIG] Принтеры успешно сохранены:', result.loadedConfig || uniquePrinters);
            
            // Проверяем, что настройки действительно сохранились, перезагружая их
            const savedPrinters = await getAvailablePrinters();
            console.log('[CONFIG] Проверка сохраненных настроек:', savedPrinters);
            
            if (savedPrinters.length === uniquePrinters.length) {
              alert('Настройки принтеров сохранены успешно');
              onClose();
            } else {
              console.error('[CONFIG] Количество сохраненных принтеров не совпадает!', {
                saved: savedPrinters.length,
                expected: uniquePrinters.length
              });
              alert('Внимание! Настройки принтеров могли сохраниться не полностью. Проверьте настройки после закрытия окна.');
            }
          } else if (result) {
            console.error('[CONFIG] Ошибка при сохранении:', result.message);
            alert(`Ошибка при сохранении настроек: ${result.message}`);
          } else {
            console.error('[CONFIG] Неожиданный результат сохранения:', result);
            alert('Ошибка при сохранении настроек: неожиданный результат операции');
          }
        } catch (apiError) {
          console.error('[CONFIG] Ошибка при вызове API для сохранения:', apiError);
          alert(`Ошибка при обработке запроса: ${apiError instanceof Error ? apiError.message : 'Неизвестная ошибка API'}`);
        }
      } else {
        console.log('[CONFIG] Режим разработки: имитация сохранения принтеров:', printers);
        alert('Режим разработки: настройки принтеров сохранены в консоль');
        onClose();
      }    } catch (error) {
      console.error('[CONFIG] Ошибка при сохранении настроек принтера:', error);
      const errorMessage = error instanceof Error ? error.message : 
                         (typeof error === 'string' ? error : 
                         (error === undefined ? 'Неопределенная ошибка' : 
                         (error === null ? 'Ошибка null' : 'Неизвестная ошибка: ' + JSON.stringify(error))));
      
      console.log(`[CONFIG] Тип ошибки: ${typeof error}, содержимое:`, error);
      alert(`Не удалось сохранить настройки: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Установка принтера по умолчанию
  const setDefaultPrinter = (index: number) => {
    setPrinters(printers.map((printer, i) => ({
      ...printer,
      isDefault: i === index
    })));
  };

  // Удаление принтера из списка
  const removePrinter = (index: number) => {
    const updatedPrinters = [...printers];
    updatedPrinters.splice(index, 1);
    setPrinters(updatedPrinters);
  };

  // Добавление нового принтера
  const addNewPrinter = () => {
    if (!newPrinter.name || !newPrinter.ip) return;
    
    const printerToAdd = {
      name: newPrinter.name,
      ip: newPrinter.ip,
      port: newPrinter.port || 9100,
      isDefault: newPrinter.isDefault || (printers.length === 0) // Если это первый принтер, делаем его по умолчанию
    };
    
    // Если новый принтер установлен по умолчанию, сбрасываем флаг у других принтеров
    let updatedPrinters = [...printers];
    if (printerToAdd.isDefault) {
      updatedPrinters = updatedPrinters.map(p => ({ ...p, isDefault: false }));
    }
    
    setPrinters([...updatedPrinters, printerToAdd as PrinterConfig]);
    setNewPrinter({ name: '', ip: '', port: 9100, isDefault: false });
    setIsAddingNew(false);
  };  // Обработка нажатия клавиши Escape
  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      onClose();
    }
  };

  // Тестирование подключения к принтеру
  const handleTestPrinter = async (printer: PrinterConfig) => {
    try {
      setTestingPrinter(printer.name);
      setTestResult(null);
      
      console.log(`Тестирование подключения к принтеру ${printer.name} (${printer.ip}:${printer.port})...`);
      const result = await testPrinterConnection(printer);
      
      console.log(`Результат тестирования:`, result);
      setTestResult(result);
    } catch (error) {
      console.error('Ошибка при тестировании принтера:', error);
      setTestResult({ 
        success: false, 
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка при проверке принтера'}`
      });
    } finally {
      // Сбрасываем статус тестирования через 5 секунд
      setTimeout(() => {
        setTestingPrinter(null);
        setTestResult(null);
    }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.stopPropagation()}>      <div 
        ref={modalRef}
        className="modal dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
        onClick={(e) => e.stopPropagation()} 
        onKeyDown={handleKeyDown}
        tabIndex={0} // Позволяет элементу получать фокус и события клавиатуры
        style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Настройки принтеров</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Список принтеров */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Доступные принтеры</h3>
              {printers.length === 0 ? (              <p className="text-gray-500 dark:text-gray-400 italic">Принтеры не настроены</p>
              ) : (
                <ul className="space-y-3">                  {printers.map((printer, index) => (
                    <li key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg transition-colors">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium dark:text-white">{printer.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">{printer.ip}:{printer.port}</div>
                          </div>
                          <div className="flex space-x-2">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="defaultPrinter"
                                checked={printer.isDefault}
                                onChange={() => setDefaultPrinter(index)}
                                className="mr-2"
                              />
                              По умолчанию
                            </label>
                            <button
                              onClick={() => removePrinter(index)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                        
                        {/* Область тестирования принтера */}                        <div className="mt-2 flex justify-between items-center">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleTestPrinter(printer)} 
                              className={`text-sm px-3 py-1 rounded-md ${
                                testingPrinter === printer.name ? 
                                  'bg-gray-300 cursor-wait' : 
                                  'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-300'
                              }`}
                              disabled={testingPrinter === printer.name}
                            >
                              {testingPrinter === printer.name ? 'Проверка...' : 'Проверить подключение'}
                            </button>
                          </div>
                          
                          {testingPrinter === printer.name && testResult && (
                            <div className={`text-sm px-3 py-1 rounded-md ml-2 flex items-center ${
                              testResult.success ? 
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {testResult.success ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </>
                              )}
                              {testResult.message}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
              {/* Добавление нового принтера */}
            {isAddingNew ? (              <div 
                className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-medium mb-3 dark:text-white">Добавить новый принтер</h3>
                <div className="space-y-3">
                  <div>                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Название</label>
                    <input
                      type="text"
                      value={newPrinter.name}
                      onChange={(e) => setNewPrinter({...newPrinter, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      placeholder="Zebra ZT410"
                    />
                  </div>
                  <div>                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">IP-адрес</label>
                    <input
                      type="text"
                      value={newPrinter.ip}
                      onChange={(e) => setNewPrinter({...newPrinter, ip: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Порт</label>
                    <input
                      type="number"
                      value={newPrinter.port}
                      onChange={(e) => setNewPrinter({...newPrinter, port: parseInt(e.target.value) || 9100})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newPrinter.isDefault}
                      onChange={(e) => setNewPrinter({...newPrinter, isDefault: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="isDefault">По умолчанию</label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">                    <button
                      onClick={() => setIsAddingNew(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={addNewPrinter}
                      disabled={!newPrinter.name || !newPrinter.ip}
                      className={`px-4 py-2 rounded-lg text-white transition-colors ${
                        !newPrinter.name || !newPrinter.ip 
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                      }`}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              </div>
            ) : (              <button
                onClick={() => setIsAddingNew(true)}
                className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Добавить принтер
              </button>
            )}
            
            <div className="flex justify-end">              <button
                onClick={savePrinters}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Сохранить настройки
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrinterSettings;
