import React from 'react';
import { useStore } from '../store';
import { CalendarIcon, ArchiveBoxIcon, ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useWindowSize } from '../hooks/useWindowSize';
import ModalOrderSearch from './ModalOrderSearch';
import { useOrders } from '../hooks/useOrdersApi';
import CertificateManager from './CertificateManager';

const MainScreen: React.FC = () => {
  const { setSelectedOrder, showArchive, toggleArchiveView } = useStore();

  // Используем хук для определения размера экрана
  const { isMobile, isTablet } = useWindowSize();

  // Используем TanStack Query для получения заказов с поллингом
  const {
    data: orders = [],
    isLoading: isLoadingActive,
    error: errorActive,
    refetch: refetchActive,
  } = useOrders('NEW');

  // Запрос для архивных заказов, с включением только при необходимости
  const {
    data: archivedOrders = [],
    isLoading: isLoadingArchive,
    error: errorArchive,
    refetch: refetchArchive,
  } = useOrders('ARCHIVE', 60000, showArchive);

  // Определяем текущее состояние загрузки и ошибок
  const isLoading = showArchive ? isLoadingArchive : isLoadingActive;
  const error = showArchive ? errorArchive : errorActive;

  // Состояние для переключения вкладок
  const [activeTab, setActiveTab] = React.useState<'orders' | 'certificates'>('orders');

  // Функция для обновления текущего списка
  const refetch = () => {
    if (showArchive) {
      refetchArchive();
    } else {
      refetchActive();
    }
  };
  const displayedOrders = showArchive ? archivedOrders : orders;

  const [showOrderSearch, setShowOrderSearch] = React.useState(false);
  const [showActiveOrderSearch, setShowActiveOrderSearch] = React.useState(false);
  const [orderToReprint, setOrderToReprint] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (orderToReprint) {
      // Сначала ищем в архивных заказах
      let found = archivedOrders.find(o => o.id === orderToReprint);

      // Если не найдено, ищем в активных заказах
      if (!found) {
        found = orders.find(o => o.id === orderToReprint);
      }

      if (found) setSelectedOrder(found);
      setOrderToReprint(null);
    }
  }, [orderToReprint, archivedOrders, orders, setSelectedOrder]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors dark:bg-fixed">
      {/* Заголовок с вкладками */}
      <header className="bg-blue-500 dark:bg-blue-700 text-white p-4 shadow-md transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Вкладки для навигации */}
            <div className="flex bg-blue-600 dark:bg-blue-800 rounded-lg overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 ${
                  activeTab === 'orders' 
                    ? 'bg-blue-800 dark:bg-blue-900 text-white font-medium' 
                    : 'text-white hover:bg-blue-700 dark:hover:bg-blue-850'
                } transition-colors flex items-center space-x-2`}
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                <span>Заказы</span>
              </button>
              <button 
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 ${
                  activeTab === 'certificates' 
                    ? 'bg-blue-800 dark:bg-blue-900 text-white font-medium' 
                    : 'text-white hover:bg-blue-700 dark:hover:bg-blue-850'
                } transition-colors flex items-center space-x-2`}
              >
                <ShieldCheckIcon className="h-5 w-5" />
                <span>Сертификаты</span>
              </button>
            </div>
          </div>
          
          {activeTab === 'orders' && (
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
              </button>{' '}
              <button
                onClick={() => refetch()}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 p-3 rounded-lg text-white shadow-md flex items-center touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <ArrowPathIcon className="h-6 w-6 mr-1" />
                <span className="hidden sm:inline">Обновить</span>
              </button>
              <button
                onClick={() =>
                  showArchive ? setShowOrderSearch(true) : setShowActiveOrderSearch(true)
                }
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 p-3 rounded-lg text-white shadow-md flex items-center touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <span className="font-bold text-lg mr-2">Печать по №</span>
                <span className="hidden sm:inline">🔍</span>
              </button>
            </div>
          )}
        </div>
        
        {activeTab === 'orders' && (
          <p className="text-sm mt-2">{showArchive ? 'Архив заказов' : 'Активные заказы'}</p>
        )}
      </header>
      
      {/* Основной контент */}
      <main className="flex-grow p-4 overflow-y-auto">
        {activeTab === 'orders' ? (
          // Контент для вкладки заказов
          isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">Ошибка загрузки заказов</div>
          ) : displayedOrders.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 p-4">
              {showArchive ? 'Архив пуст' : 'Нет активных заказов'}
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-3' : 'grid-cols-4'
              }`}
            >
            {displayedOrders.map(order => (
              <div
                key={order.id}
                className={`
                  p-4 rounded-xl shadow-md border-2 relative overflow-hidden
                  ${!showArchive ? 'cursor-pointer active:bg-blue-50 dark:active:bg-blue-900 touch-manipulation' : ''} 
                  ${
                    !showArchive
                      ? 'hover:border-blue-500 hover:shadow-lg dark:hover:border-blue-500 dark:hover:shadow-dark-card-hover dark:hover:scale-[1.01]'
                      : 'border-gray-200 dark:border-blue-900'
                  } 
                  transition-all duration-300 bg-white dark:bg-opacity-10 dark:bg-gray-800 dark:backdrop-blur-sm dark:shadow-dark-card
                `}
                onClick={() => !showArchive && setSelectedOrder(order)}
                style={{ minHeight: '120px' }}
              >
                {/* Декоративный элемент для темной темы */}
                <div className="hidden dark:block absolute top-0 left-0 w-2 h-full bg-blue-500 bg-gradient-to-b from-blue-400 to-blue-600"></div>
                <div className="dark:pl-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold dark:text-white dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
                      Заказ #{order.orderNumber}
                    </h3>
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${
                        order.status === 'NEW'
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 dark:ring-1 dark:ring-green-500'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:ring-1 dark:ring-gray-500'
                      }`}
                    >
                      {order.status === 'NEW' ? 'Новый' : 'В архиве'}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 text-gray-600 dark:text-gray-300">
                    <CalendarIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Дата отгрузки: {new Date(order.deliveryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-gray-600 dark:text-gray-300">
                    <p className="truncate text-sm">Получатель: {order.consignee}</p>
                    <p className="text-sm leading-tight" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      Адрес: {order.address.replace(/,\s*/g, ',\n')}
                    </p>
                  </div>
                  {!showArchive && (
                    <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center">
                      <span className="inline-flex items-center">
                        Нажмите для печати этикеток
                        <span className="ml-1 inline-block animate-pulse dark:text-blue-300">
                          →
                        </span>
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
        )
        ) : (
          // Компонент управления сертификатами
          <CertificateManager />
        )}
      </main>
      <ModalOrderSearch
        isOpen={showOrderSearch}
        onClose={() => setShowOrderSearch(false)}
        onOrderSelect={id => setOrderToReprint(id)}
        ordersToSearch={archivedOrders}
        title="Поиск в архиве заказов"
      />
      <ModalOrderSearch
        isOpen={showActiveOrderSearch}
        onClose={() => setShowActiveOrderSearch(false)}
        onOrderSelect={id => setOrderToReprint(id)}
        ordersToSearch={orders}
        title="Поиск активного заказа"
      />
    </div>
  );
};

export default MainScreen;
