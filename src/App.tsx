import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainScreen from './components/MainScreen';
import Modal from './components/Modal';
import PrinterSettings from './components/PrinterSettings';
import ThemeToggle from './components/ThemeToggle';
import ConnectionStatus from './components/ConnectionStatus';
import TitleBar from './components/TitleBar';
import WindowModeIndicator from './components/WindowModeIndicator';
import WindowTestPage from './components/WindowTestPage';
import { PrinterIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { useApiInitialization } from './utils/api-helpers';
import { useWindowHotkeys } from './hooks/useWindowHotkeys';

// Создаем клиент для управления запросами
const queryClient = new QueryClient();

const App: React.FC = () => {
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [isTestPageOpen, setIsTestPageOpen] = useState(false);

  // Инициализируем API и TLS при запуске приложения
  useApiInitialization();

  // Инициализируем горячие клавиши для управления окном
  useWindowHotkeys();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app min-h-screen transition-colors dark:bg-gray-900 dark:text-white flex flex-col">
        {/* Шапка приложения с элементами управления окном */}
        <TitleBar title="Система управления заказами">
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

          {/* Кнопка тестирования окна */}
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            <button
              onClick={() => setIsTestPageOpen(!isTestPageOpen)}
              className={`p-2 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 ${
                isTestPageOpen ? 'bg-yellow-200 dark:bg-yellow-700' : ''
              }`}
              aria-label="Тестирование управления окном"
            >
              <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </button>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            <ThemeToggle />
          </div>
        </TitleBar>

        {/* Основной контент */}
        <div className="pt-0 flex-1 overflow-hidden">
          {isTestPageOpen ? <WindowTestPage /> : <MainScreen />}
        </div>

        {/* Модальные окна и компоненты */}
        <Modal />
        <PrinterSettings
          isOpen={isPrinterSettingsOpen}
          onClose={() => setIsPrinterSettingsOpen(false)}
        />

        {/* Индикатор режима окна */}
        <WindowModeIndicator />
      </div>
    </QueryClientProvider>
  );
};

export default App;
