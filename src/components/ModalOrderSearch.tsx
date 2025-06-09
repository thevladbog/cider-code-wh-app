import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWindowSize } from '../hooks/useWindowSize';
import { Order } from '../models/orders';

interface ModalOrderSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSelect: (orderId: string) => void;
  ordersToSearch?: Order[]; // Список заказов для поиска
  title?: string; // Опциональный заголовок модального окна
}

const ModalOrderSearch: React.FC<ModalOrderSearchProps> = ({
  isOpen,
  onClose,
  onOrderSelect,
  ordersToSearch = [], // Теперь можем передать массив снаружи
  title = 'Печать по № заказа',
}) => {
  const [input, setInput] = useState('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [notFound, setNotFound] = useState(false);
  const { isMobile } = useWindowSize();

  // Сброс состояния при открытии/закрытии модалки
  React.useEffect(() => {
    if (!isOpen) {
      setInput('');
      setSearchResults([]);
      setNotFound(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInput = (val: string) => {
    setInput(val);
    setNotFound(false);
  };

  const handleNumpad = (num: string) => {
    setInput(prev => (prev.length < 10 ? prev + num : prev));
    setNotFound(false);
  };

  const handleBackspace = () => {
    setInput(prev => prev.slice(0, -1));
    setNotFound(false);
  };

  const handleClear = () => {
    setInput('');
    setNotFound(false);
  };

  const handleSearch = () => {
    if (input.length === 0) return;

    const results = ordersToSearch.filter(
      order => order.orderNumber.includes(input) || order.id.includes(input)
    );

    setSearchResults(results);
    setNotFound(results.length === 0);

    if (results.length === 1) {
      onOrderSelect(results[0].id);
      onClose();
    }
  };

  const handleSelect = (id: string) => {
    onOrderSelect(id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={e => e.stopPropagation()}
        tabIndex={0}
        style={{ maxWidth: 400, width: '100%' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-2xl text-center font-mono mb-2"
            value={input}
            onChange={e => handleInput(e.target.value.replace(/\D/g, ''))}
            placeholder="Введите номер заказа"
            autoFocus
            maxLength={10}
            readOnly={isMobile}
          />
          {/* Numpad for touch */}
          <div className="grid grid-cols-3 gap-2 mb-2 select-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} className="numpad-button" onClick={() => handleNumpad(n.toString())}>
                {n}
              </button>
            ))}
            <button className="numpad-button bg-red-100 dark:bg-red-900" onClick={handleClear}>
              C
            </button>
            <button className="numpad-button" onClick={() => handleNumpad('0')}>
              0
            </button>
            <button className="numpad-button" onClick={handleBackspace}>
              ⌫
            </button>
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-2 text-lg"
            onClick={handleSearch}
            disabled={!input}
          >
            Поиск
          </button>
        </div>
        {notFound && (
          <div className="text-center text-red-500 font-semibold mt-2">Заказ не найден</div>
        )}
        {searchResults.length > 1 && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
              Найдено заказов: {searchResults.length}
            </div>
            <div className="max-h-40 overflow-y-auto">
              {searchResults.map(order => (
                <button
                  key={order.id}
                  className="w-full text-left p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 mb-1 border border-gray-200 dark:border-gray-700"
                  onClick={() => handleSelect(order.id)}
                >
                  № {order.orderNumber} — {order.consignee}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalOrderSearch;
