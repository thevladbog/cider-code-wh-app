import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainScreen from './components/MainScreen';
import Modal from './components/Modal';
import PrinterSettings from './components/PrinterSettings';
import ThemeToggle from './components/ThemeToggle';
import { PrinterIcon } from '@heroicons/react/24/outline';

// Создаем клиент для управления запросами
const queryClient = new QueryClient();

const App: React.FC = () => {
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app min-h-screen transition-colors dark:bg-gray-900 dark:text-white">
        {/* Основной интерфейс */}
        <MainScreen />
        <Modal />
        <PrinterSettings isOpen={isPrinterSettingsOpen} onClose={() => setIsPrinterSettingsOpen(false)} />
        
        {/* Кнопка настроек принтера */}
        <button 
          onClick={() => setIsPrinterSettingsOpen(true)}
          className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-full shadow-md hover:shadow-lg transition-colors"
          aria-label="Настройки принтера"
        >
          <PrinterIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </button>

        {/* Кнопка переключения темы */}
        <div className="fixed bottom-4 left-4">
          <ThemeToggle />
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default App;
