import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainScreen from './components/MainScreen';
import Modal from './components/Modal';
import PrinterSettings from './components/PrinterSettings';
import ThemeToggle from './components/ThemeToggle';
import ConnectionStatus from './components/ConnectionStatus';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useApiInitialization } from './utils/api-helpers';

// Создаем клиент для управления запросами
const queryClient = new QueryClient();

const App: React.FC = () => {
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  
  // Инициализируем API и TLS при запуске приложения
  useApiInitialization();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app min-h-screen transition-colors dark:bg-gray-900 dark:text-white">
        {/* Шапка приложения */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Система управления заказами
            </h1>
            <div className="flex items-center space-x-3">
              <ConnectionStatus />
              
              {/* Кнопка настроек принтера */}
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                <button
                  onClick={() => setIsPrinterSettingsOpen(true)}
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95"
                  aria-label="Настройки принтера"
                >
                  <PrinterIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Основной контент */}
        <div className="pt-0">
          <MainScreen />
        </div>
        
        <Modal />
        <PrinterSettings
          isOpen={isPrinterSettingsOpen}
          onClose={() => setIsPrinterSettingsOpen(false)}
        />
      </div>
    </QueryClientProvider>
  );
};

export default App;
