import React, { useState } from 'react';
import { useStore } from '../store';
import {
  XMarkIcon,
  PrinterIcon,
  ArchiveBoxIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { printLabels } from '../utils/print';
import { useUpdateOrderStatus } from '../hooks/useOrdersApi';
import OrderInfoPanel from './OrderInfoPanel';

const Modal: React.FC = () => {
  const { selectedOrder, setSelectedOrder } = useStore();
  const [transportUnits, setTransportUnits] = useState<number>(0);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  // Используем хук для обновления статуса заказа
  const { mutateAsync: updateStatus } = useUpdateOrderStatus();

  // Устанавливаем фокус на модальном окне при открытии
  React.useEffect(() => {
    if (selectedOrder && modalRef.current) {
      modalRef.current.focus();
    }
    // Сбрасываем значение transportUnits при открытии нового заказа
    setTransportUnits(0);
  }, [selectedOrder]);

  if (!selectedOrder) return null;
  const handlePrint = async () => {
    if (transportUnits <= 0) return;
    setIsPrinting(true);
    try {
      console.log('[UI] Отправка данных на печать...');
      console.log(
        '[UI] Шаблон (первые 200 символов):',
        selectedOrder.template
          ? selectedOrder.template.substring(0, 200) +
              (selectedOrder.template.length > 200 ? '...' : '')
          : 'Шаблон отсутствует'
      );
      console.log('[UI] Количество мест:', transportUnits);
      console.log('[UI] Данные заказа:', {
        orderNumber: selectedOrder.orderNumber,
        consignee: selectedOrder.consignee,
        address: selectedOrder.address,
        deliveryDate: selectedOrder.deliveryDate,
      });

      // Проверяем наличие шаблона перед печатью
      if (!selectedOrder.template || selectedOrder.template.trim() === '') {
        throw new Error('Шаблон печати отсутствует. Проверьте данные заказа.');
      }

      // Проверяем наличие основных данных для печати
      if (!selectedOrder.orderNumber) {
        console.warn('[UI] Предупреждение: Номер заказа отсутствует, но печать будет произведена');
      }

      const success = await printLabels({
        template: selectedOrder.template,
        count: transportUnits,
        orderNumber: selectedOrder.orderNumber,
        consignee: selectedOrder.consignee,
        address: selectedOrder.address,
        deliveryDate: selectedOrder.deliveryDate,
      });

      console.log('[UI] Результат печати:', success ? 'Успешно' : 'Ошибка');
      if (success) {
        if (selectedOrder.status === 'ARCHIVE') {
          setSelectedOrder(null);
        } else {
          await updateStatus({ id: selectedOrder.id, status: 'ARCHIVE' });
          setSelectedOrder(null);
        }
      } else {
        alert('Ошибка при печати этикеток. Проверьте настройки принтера и наличие бумаги.');
      }
    } catch (error) {
      console.error('[UI] Ошибка при печати этикеток:', error);

      // Показываем детальное сообщение об ошибке
      let errorMessage = 'Неизвестная ошибка при печати';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Анализируем типичные ошибки и даем рекомендации
        if (errorMessage.includes('ECONNREFUSED')) {
          errorMessage =
            'Не удалось подключиться к принтеру. Проверьте, включен ли принтер и правильно ли указан IP-адрес и порт.';
        } else if (errorMessage.includes('ETIMEDOUT')) {
          errorMessage =
            'Превышено время ожидания ответа от принтера. Проверьте сетевое подключение и доступность принтера.';
        } else if (errorMessage.includes('Принтер по умолчанию не настроен')) {
          errorMessage =
            'Не настроен принтер по умолчанию. Перейдите в настройки принтера и выберите принтер по умолчанию.';
        }
      }

      alert(`Не удалось выполнить печать: ${errorMessage}`);
    } finally {
      setIsPrinting(false);
    }
  }; // Обратная связь при нажатии на клавиши
  const provideFeedback = () => {
    // Вибрация для тактильной обратной связи
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // 50ms вибрации
    }

    // Звуковой отклик
    try {
      // Создаем простой звук нажатия клавиши
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 800; // Частота звука в Гц
      gainNode.gain.value = 0.1; // Громкость (от 0 до 1)

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      // Останавливаем звук через короткое время
      setTimeout(() => {
        oscillator.stop();
        // Освобождаем ресурсы
        setTimeout(() => {
          if (audioContext.state !== 'closed') {
            audioContext.close();
          }
        }, 100);
      }, 50);
    } catch (error) {
      console.warn('Не удалось воспроизвести звук:', error);
    }
  }; // Функция для добавления числа к текущему значению
  const addNumber = (num: number) => {
    provideFeedback(); // Тактильная и звуковая обратная связь

    if (num === -1) {
      // Backspace
      const strValue = transportUnits.toString();
      if (strValue.length <= 1) {
        setTransportUnits(0); // Разрешаем 0 для возможности очистки поля
      } else {
        setTransportUnits(Number(strValue.slice(0, -1)));
      }
    } else {
      // Для предотвращения ошибок парсинга и слишком больших чисел
      const newValue = transportUnits * 10 + num;
      if (newValue <= 999) {
        setTransportUnits(newValue);
      }
    }
  };

  const resetNumber = () => {
    provideFeedback(); // Тактильная и звуковая обратная связь
    setTransportUnits(0); // Очищаем поле ввода
  };
  // Функция для архивации без печати
  const handleArchiveWithoutPrint = async () => {
    try {
      console.log(`Архивация заказа ${selectedOrder.id} без печати...`);
      await updateStatus({ id: selectedOrder.id, status: 'ARCHIVE' });
      console.log(`Заказ ${selectedOrder.id} успешно архивирован`);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Ошибка при архивации заказа:', error);
      alert(
        `Не удалось архивировать заказ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      );
    }
  }; // Обработка нажатия клавиш
  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();

    // Если нажат ESC - закрываем модальное окно
    if (event.key === 'Escape') {
      setSelectedOrder(null);
      return;
    }

    // Если нажаты цифровые клавиши - добавляем к числу транспортных мест
    if (/^[0-9]$/.test(event.key)) {
      const num = parseInt(event.key);
      const newValue = transportUnits * 10 + num;
      if (newValue <= 999) {
        setTransportUnits(newValue);
      }
      return;
    }

    // Если нажат Backspace - удаляем последнюю цифру
    if (event.key === 'Backspace') {
      const strValue = transportUnits.toString();
      if (strValue.length <= 1) {
        setTransportUnits(0);
      } else {
        setTransportUnits(Number(strValue.slice(0, -1)));
      }
      return;
    }

    // Если нажат Enter и число транспортных мест > 0 - запускаем печать
    if (event.key === 'Enter' && transportUnits > 0 && !isPrinting) {
      handlePrint();
      return;
    }
  };

  return (
    <>
      {/* Основное модальное окно */}
      <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
        <div
          ref={modalRef}
          className="modal dark:bg-gray-800 dark:text-white bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          style={{
            maxHeight: 'calc(100vh - 4rem)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header with basic info */}
          <div className="flex justify-between items-center p-6 pb-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold dark:text-white">Печать этикеток</h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInfoPanel(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Показать информацию о заказе"
                title="Информация о заказе"
              >
                <InformationCircleIcon className="h-6 w-6" />
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Закрыть"
                title="Закрыть"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="px-6 py-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <h3 className="text-md font-bold dark:text-white">
                Заказ #{selectedOrder.orderNumber}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {new Date(selectedOrder.deliveryDate).toLocaleDateString()} •{' '}
                {selectedOrder.consignee}
              </p>
            </div>
          </div>

          {/* Main content - Transport units input */}
          <div
            className="px-6 flex-grow overflow-y-auto show-scrollbar-on-hover"
            style={{ minHeight: '200px' }}
          >
            <div className="mb-3 pt-2">
              <label className="block text-lg font-medium dark:text-gray-200">
                Количество транспортных мест:
              </label>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center text-3xl font-bold">
                {transportUnits || 'Не указано'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                <span className="inline-block bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded mr-1">
                  ⌨️
                </span>
                Можно вводить числа с клавиатуры, Enter для печати
              </p>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  className="numpad-button"
                  onClick={() => addNumber(num)}
                  aria-label={`Число ${num}`}
                >
                  {num}
                </button>
              ))}
              <button
                className="numpad-button bg-red-100 hover:bg-red-200 active:bg-red-300 dark:bg-red-900 dark:hover:bg-red-800 dark:active:bg-red-700 dark:text-white"
                onClick={resetNumber}
                aria-label="Очистить"
              >
                C
              </button>
              <button
                className="numpad-button dark:bg-gray-700 dark:text-white"
                onClick={() => addNumber(0)}
                aria-label="Число 0"
              >
                0
              </button>
              <button
                className="numpad-button bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 dark:active:bg-gray-400 dark:text-white"
                onClick={() => addNumber(-1)}
                aria-label="Удалить последнюю цифру"
              >
                ⌫
              </button>
            </div>
          </div>

          {/* Footer with buttons - fixed at the bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between space-x-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center justify-center bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 text-gray-800 dark:text-white font-bold py-3 px-4 rounded-lg shadow-sm touch-manipulation min-w-[80px] transition-colors"
                style={{ minHeight: '50px' }}
              >
                <span>Отмена</span>
              </button>

              <button
                onClick={handleArchiveWithoutPrint}
                className="flex items-center justify-center bg-amber-500 hover:bg-amber-600 active:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 dark:active:bg-amber-800 text-white font-bold py-3 px-4 rounded-lg shadow-sm touch-manipulation min-w-[130px] transition-colors"
                style={{ minHeight: '50px' }}
              >
                <ArchiveBoxIcon className="h-5 w-5 mr-2" />
                <span>Без печати</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={isPrinting || transportUnits <= 0}
                className={`flex items-center justify-center ${
                  isPrinting || transportUnits <= 0
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 dark:active:bg-blue-500'
                } text-white font-bold py-3 px-4 rounded-lg shadow-sm touch-manipulation min-w-[130px] transition-colors`}
                style={{ minHeight: '50px' }}
              >
                {isPrinting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Печать...
                  </span>
                ) : (
                  <>
                    <PrinterIcon className="h-5 w-5 mr-2" />
                    <span>Печать</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel for order details - moved outside modal-overlay to prevent event bubbling */}
      {selectedOrder && showInfoPanel && (
        <OrderInfoPanel order={selectedOrder} onClose={() => setShowInfoPanel(false)} />
      )}
    </>
  );
};

export default Modal;
