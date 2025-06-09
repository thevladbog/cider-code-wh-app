import React, { useState, useEffect } from 'react';

interface WindowState {
  isFullscreen: boolean;
  isKiosk: boolean;
  isMaximized: boolean;
}

const WindowTestPage: React.FC = () => {
  const [windowState, setWindowState] = useState<WindowState>({
    isFullscreen: false,
    isKiosk: false,
    isMaximized: false,
  });
  const [testLog, setTestLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkWindowState = async () => {
    if (!window.electronAPI) {
      addToLog('❌ electronAPI недоступен');
      return;
    }

    try {
      const fullscreen = await window.electronAPI.windowIsFullscreen();
      const kiosk = await window.electronAPI.windowIsKiosk();

      setWindowState({
        isFullscreen: fullscreen,
        isKiosk: kiosk,
        isMaximized: false, // TODO: добавить проверку максимизации если нужно
      });

      addToLog(`📊 Состояние окна: Полный экран: ${fullscreen}, Киоск: ${kiosk}`);
    } catch (error) {
      addToLog(`❌ Ошибка проверки состояния: ${error}`);
    }
  };

  useEffect(() => {
    checkWindowState();
  }, []);

  const testFunction = async (action: string) => {
    if (!window.electronAPI) {
      addToLog('❌ electronAPI недоступен');
      return;
    }

    try {
      addToLog(`🔄 Выполняется: ${action}`);

      switch (action) {
        case 'fullscreen': {
          const newFullscreenState = await window.electronAPI.windowToggleFullscreen();
          addToLog(`✅ Полноэкранный режим: ${newFullscreenState ? 'ВКЛ' : 'ВЫКЛ'}`);
          break;
        }

        case 'kiosk-enter':
          await window.electronAPI.windowEnterKioskMode();
          addToLog('✅ Вход в режим киоска');
          break;

        case 'kiosk-exit':
          await window.electronAPI.windowExitKioskMode();
          addToLog('✅ Выход из режима киоска');
          break;

        case 'minimize':
          await window.electronAPI.windowMinimize();
          addToLog('✅ Окно свернуто');
          break;

        case 'maximize':
          await window.electronAPI.windowMaximize();
          addToLog('✅ Окно развернуто/восстановлено');
          break;

        case 'quit':
          addToLog('🚪 Попытка закрытия приложения...');
          await window.electronAPI.appQuit();
          break;

        default:
          addToLog(`❌ Неизвестное действие: ${action}`);
      }

      // Обновляем состояние после действия
      setTimeout(checkWindowState, 500);
    } catch (error) {
      addToLog(`❌ Ошибка выполнения ${action}: ${error}`);
    }
  };

  const clearLog = () => {
    setTestLog([]);
    addToLog('🧹 Лог очищен');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">🪟 Тестирование управления окном</h1>

      {/* Текущее состояние */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <h2 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
          📊 Текущее состояние
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-3 rounded-lg ${windowState.isFullscreen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
          >
            <span className="font-medium">Полноэкранный режим:</span>
            <span className="ml-2">{windowState.isFullscreen ? '✅ ВКЛ' : '❌ ВЫКЛ'}</span>
          </div>
          <div
            className={`p-3 rounded-lg ${windowState.isKiosk ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}
          >
            <span className="font-medium">Режим киоска:</span>
            <span className="ml-2">{windowState.isKiosk ? '✅ ВКЛ' : '❌ ВЫКЛ'}</span>
          </div>
        </div>
        <button
          onClick={checkWindowState}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          🔄 Обновить состояние
        </button>
      </div>

      {/* Кнопки управления */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">🎮 Управление окном</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => testFunction('fullscreen')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            ⛶ Полный экран
          </button>

          <button
            onClick={() => testFunction('kiosk-enter')}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            disabled={windowState.isKiosk}
          >
            🖥️ Войти в киоск
          </button>

          <button
            onClick={() => testFunction('kiosk-exit')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            disabled={!windowState.isKiosk}
          >
            🚪 Выйти из киоска
          </button>

          <button
            onClick={() => testFunction('minimize')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            🗕 Свернуть
          </button>

          <button
            onClick={() => testFunction('maximize')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            🗖 Развернуть
          </button>

          <button
            onClick={() => testFunction('quit')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            ✕ Закрыть приложение
          </button>
        </div>
      </div>

      {/* Информация о горячих клавишах */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
        <h2 className="text-lg font-semibold mb-3 text-yellow-900 dark:text-yellow-100">
          ⌨️ Горячие клавиши
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">F11</kbd> - Полный экран
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+Shift+K</kbd> - Киоск
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+Q</kbd> - Закрыть
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+M</kbd> - Свернуть
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+Shift+M</kbd> - Развернуть
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-200 rounded">Escape</kbd> - Выход из режима
          </div>
        </div>
      </div>

      {/* Лог тестирования */}
      <div className="p-4 bg-black text-green-400 rounded-lg font-mono text-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">📝 Лог тестирования</h2>
          <button
            onClick={clearLog}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
          >
            Очистить
          </button>
        </div>
        <div className="h-64 overflow-y-auto space-y-1">
          {testLog.length === 0 ? (
            <div className="text-gray-500">Лог пуст...</div>
          ) : (
            testLog.map((entry, index) => <div key={index}>{entry}</div>)
          )}
        </div>
      </div>

      {/* Важное предупреждение */}
      <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
        <h3 className="text-lg font-semibold mb-2 text-red-900 dark:text-red-100">
          ⚠️ Важно для тестирования
        </h3>
        <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
          <li>• В режиме киоска системное закрытие (Alt+F4) должно быть заблокировано</li>
          <li>• Кнопка "Закрыть приложение" должна работать в любом режиме</li>
          <li>• Горячие клавиши должны функционировать во всех режимах</li>
          <li>• При выходе из киоска все блокировки должны сниматься</li>
        </ul>
      </div>
    </div>
  );
};

export default WindowTestPage;
