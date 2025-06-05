import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store';
import { CalendarIcon, ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useWindowSize } from '../hooks/useWindowSize';
import ModalOrderSearch from './ModalOrderSearch';

const MainScreen: React.FC = () => {
  const { 
    orders, 
    archivedOrders,
    setSelectedOrder, 
    showArchive, 
    toggleArchiveView,
    fetchOrders
  } = useStore();

  // Используем хук для определения размера экрана
  const { isMobile, isTablet } = useWindowSize();
  
  // Используем TanStack Query для управления запросами
  const { isLoading, error, refetch } = useQuery(['orders'], fetchOrders, {
    refetchOnWindowFocus: false,
    // Убеждаемся, что useQuery всегда получает данные, даже в случае ошибки
    onError: (err) => {
      console.error('Ошибка при запросе заказов:', err);
    }
  });

  // Загружаем заказы при монтировании компонента
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const displayedOrders = showArchive ? archivedOrders : orders;
  
  const [showOrderSearch, setShowOrderSearch] = React.useState(false);
  const [orderToReprint, setOrderToReprint] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (orderToReprint) {
      const found = archivedOrders.find(o => o.id === orderToReprint);
      if (found) setSelectedOrder(found);
      setOrderToReprint(null);
    }
  }, [orderToReprint, archivedOrders, setSelectedOrder]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors dark:bg-fixed">
      {/* Заголовок */}
      <header className="bg-blue-500 dark:bg-blue-700 text-white p-4 shadow-md transition-colors">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Заказы на складе</h1>
          <div className="flex space-x-3">
            <button 
              onClick={toggleArchiveView}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 p-3 rounded-lg text-white shadow-md flex items-center touch-manipulation"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {showArchive ? (
                <>
                  <ArrowPathIcon className="h-6 w-6 mr-1" />
                  <span className="hidden sm:inline">Новые</span>
                </>
              ) : (
                <>
                  <ArchiveBoxIcon className="h-6 w-6 mr-1" />
                  <span className="hidden sm:inline">Архив</span>
                </>
              )}
            </button>
            <button 
              onClick={() => refetch()}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 p-3 rounded-lg text-white shadow-md flex items-center touch-manipulation"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ArrowPathIcon className="h-6 w-6 mr-1" />
              <span className="hidden sm:inline">Обновить</span>
            </button>
            {showArchive && (
              <button
                onClick={() => setShowOrderSearch(true)}
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 p-3 rounded-lg text-white shadow-md flex items-center touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <span className="font-bold text-lg mr-2">Печать по №</span>
                <span className="hidden sm:inline">🔍</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-sm mt-2">
          {showArchive ? 'Архив заказов' : 'Активные заказы'}
        </p>
      </header>

      {/* Основной контент */}
      <main className="flex-grow p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">
            Ошибка загрузки заказов
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 p-4">
            {showArchive ? 'Архив пуст' : 'Нет активных заказов'}
          </div>
        ) : (
          <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-1' : 
              isTablet ? 'grid-cols-2' : 
              'grid-cols-3'
            }`}>
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                className={`
                  p-4 rounded-xl shadow-md border-2 relative overflow-hidden
                  ${!showArchive ? 'cursor-pointer active:bg-blue-50 dark:active:bg-blue-900 touch-manipulation' : ''} 
                  ${!showArchive 
                    ? 'hover:border-blue-500 hover:shadow-lg dark:hover:border-blue-500 dark:hover:shadow-dark-card-hover dark:hover:scale-[1.01]' 
                    : 'border-gray-200 dark:border-blue-900'} 
                  transition-all duration-300 bg-white dark:bg-opacity-10 dark:bg-gray-800 dark:backdrop-blur-sm dark:shadow-dark-card
                `}
                onClick={() => !showArchive && setSelectedOrder(order)}
                style={{ minHeight: '120px' }}
              >
                {/* Декоративный элемент для темной темы */}
                <div className="hidden dark:block absolute top-0 left-0 w-2 h-full bg-blue-500 bg-gradient-to-b from-blue-400 to-blue-600"></div>
                <div className="dark:pl-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold dark:text-white dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">Заказ #{order.orderNumber}</h3>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      order.status === 'NEW' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 dark:ring-1 dark:ring-green-500' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:ring-1 dark:ring-gray-500'
                    }`}>
                      {order.status === 'NEW' ? 'Новый' : 'В архиве'}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 text-gray-600 dark:text-gray-300">
                    <CalendarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Дата доставки: {new Date(order.deliveryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-gray-600 dark:text-gray-300">
                    <p className="truncate text-sm">Получатель: {order.consignee}</p>
                    <p className="truncate text-sm">Адрес: {order.address}</p>
                  </div>
                  {!showArchive && (
                    <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center">
                      <span className="inline-flex items-center">
                        Нажмите для печати этикеток
                        <span className="ml-1 inline-block animate-pulse dark:text-blue-300">→</span>
                      </span>
                    </div>
                  )}
                </div>
                {showArchive && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedOrder(order); // Открыть модалку с вводом количества
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-sm font-medium"
                  >
                    Распечатать повторно
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ModalOrderSearch
        isOpen={showOrderSearch}
        onClose={() => setShowOrderSearch(false)}
        onOrderSelect={id => setOrderToReprint(id)}
      />
    </div>
  );
};

export default MainScreen;
