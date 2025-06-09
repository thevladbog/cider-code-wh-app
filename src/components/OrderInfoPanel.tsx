import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Order } from '../models/orders';

interface OrderInfoPanelProps {
  order: Order;
  onClose: () => void;
}

const OrderInfoPanel: React.FC<OrderInfoPanelProps> = ({ order, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Добавляем небольшую задержку перед анимацией появления
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  const handleClose = () => {
    setIsVisible(false);
    // Даем время для анимации закрытия, но сохраняем возможность отменить операцию
    const timer = setTimeout(onClose, 300);

    // Защита от случаев, когда компонент размонтируется до завершения таймера
    return () => clearTimeout(timer);
  };

  if (!order) return null;

  return (
    <>
      {/* Затемненный фон для мобильных устройств */}
      <div
        className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-[9800]"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        onClick={handleClose}
      />{' '}
      <div
        className="fixed right-0 top-0 h-full bg-white dark:bg-gray-800 shadow-xl w-full max-w-md z-[9900] overflow-y-auto show-scrollbar-on-hover p-6"
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
        onClick={e => e.stopPropagation()} // Предотвращаем всплытие события к modal-overlay
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">Информация о заказе</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Закрыть панель"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-bold mb-2 dark:text-white">Заказ #{order.orderNumber}</h3>
          <p className="text-sm mb-1">
            <span className="font-semibold">Статус:</span>{' '}
            <span
              className={
                order.status === 'NEW'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }
            >
              {order.status === 'NEW' ? 'Новый' : 'В архиве'}
            </span>
          </p>
          <p className="text-sm">
            <span className="font-semibold">Дата отгрузки:</span>{' '}
            {new Date(order.deliveryDate).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Получатель
            </h3>
            <p className="dark:text-white">{order.consignee}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Адрес доставки
            </h3>
            <p className="dark:text-white whitespace-pre-line">
              {order.address.replace(/,\s*/g, ',\n')}
            </p>
          </div>
          {order.template && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Шаблон этикеток
              </h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all dark:text-white">
                  {order.template.length > 200
                    ? order.template.substring(0, 200) + '...'
                    : order.template}
                </pre>
              </div>
            </div>
          )}{' '}
        </div>
      </div>
    </>
  );
};

export default OrderInfoPanel;
