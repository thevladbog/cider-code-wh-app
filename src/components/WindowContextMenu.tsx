import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  onClose: () => void;
}

const WindowContextMenu: React.FC<ContextMenuProps> = ({ isVisible, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  const handleAction = async (action: string) => {
    if (!window.electronAPI) return;

    try {
      switch (action) {
        case 'fullscreen':
          await window.electronAPI.windowToggleFullscreen();
          break;
        case 'kiosk': {
          const isKiosk = await window.electronAPI.windowIsKiosk();
          if (isKiosk) {
            await window.electronAPI.windowExitKioskMode();
          } else {
            await window.electronAPI.windowEnterKioskMode();
          }
          break;
        }
        case 'minimize':
          await window.electronAPI.windowMinimize();
          break;
        case 'maximize':
          await window.electronAPI.windowMaximize();
          break;
        case 'close':
          await window.electronAPI.appQuit();
          break;
      }
    } catch (error) {
      console.error(`Ошибка выполнения действия ${action}:`, error);
    }

    onClose();
  };

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 min-w-48"
      style={{
        left: x,
        top: y,
      }}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => handleAction('minimize')}
      >
        🗕 Свернуть
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => handleAction('maximize')}
      >
        🗖 Развернуть/Восстановить
      </button>
      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => handleAction('fullscreen')}
      >
        ⛶ Полноэкранный режим
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => handleAction('kiosk')}
      >
        🖥️ Режим киоска
      </button>
      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
      <button
        className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
        onClick={() => handleAction('close')}
      >
        ✕ Закрыть приложение
      </button>
    </div>
  );
};

export default WindowContextMenu;
