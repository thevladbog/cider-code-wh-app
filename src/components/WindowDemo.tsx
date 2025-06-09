import React, { useState, useEffect } from 'react';

const WindowDemo: React.FC = () => {
  const [windowState, setWindowState] = useState({
    isFullscreen: false,
    isKiosk: false,
    isMaximized: false,
  });

  useEffect(() => {
    const checkWindowState = async () => {
      if (window.electronAPI) {
        try {
          const fullscreen = await window.electronAPI.windowIsFullscreen();
          const kiosk = await window.electronAPI.windowIsKiosk();
          setWindowState({
            isFullscreen: fullscreen,
            isKiosk: kiosk,
            isMaximized: false, // Нет прямого API для проверки максимизации
          });
        } catch (error) {
          console.error('Ошибка проверки состояния окна:', error);
        }
      }
    };

    checkWindowState();
    const interval = setInterval(checkWindowState, 1000);

    return () => clearInterval(interval);
  }, []);

  const testFunction = async (action: string) => {
    if (!window.electronAPI) {
      alert('electronAPI недоступен');
      return;
    }

    try {
      switch (action) {
        case 'fullscreen':
          await window.electronAPI.windowToggleFullscreen();
          break;
        case 'kiosk':
          if (windowState.isKiosk) {
            await window.electronAPI.windowExitKioskMode();
          } else {
            await window.electronAPI.windowEnterKioskMode();
          }
          break;
        case 'minimize':
          await window.electronAPI.windowMinimize();
          break;
        case 'maximize':
          await window.electronAPI.windowMaximize();
          break;
      }
    } catch (error) {
      console.error(`Ошибка выполнения ${action}:`, error);
    }
  };

  return (
    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
        🪟 Демонстрация управления окном
      </h3>

      <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
        <h4 className="font-medium mb-2">Текущее состояние:</h4>
        <div className="text-sm space-y-1">
          <div className={windowState.isFullscreen ? 'text-green-600' : 'text-gray-500'}>
            {windowState.isFullscreen ? '✅' : '❌'} Полноэкранный режим
          </div>
          <div className={windowState.isKiosk ? 'text-orange-600' : 'text-gray-500'}>
            {windowState.isKiosk ? '✅' : '❌'} Режим киоска
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => testFunction('fullscreen')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {windowState.isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
        </button>

        <button
          onClick={() => testFunction('kiosk')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          {windowState.isKiosk ? 'Выйти из киоска' : 'Режим киоска'}
        </button>

        <button
          onClick={() => testFunction('minimize')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Свернуть
        </button>

        <button
          onClick={() => testFunction('maximize')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Развернуть
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
        <p>
          <strong>Горячие клавиши:</strong>
        </p>
        <p>F11 - полный экран, Ctrl+Shift+K - киоск, Ctrl+Q - закрыть</p>
        <p>Правый клик по заголовку для контекстного меню</p>
      </div>
    </div>
  );
};

export default WindowDemo;
