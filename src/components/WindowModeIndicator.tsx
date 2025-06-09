import React, { useState, useEffect } from 'react';
import { ComputerDesktopIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

const WindowModeIndicator: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKiosk, setIsKiosk] = useState(false);

  useEffect(() => {
    const checkWindowState = async () => {
      if (window.electronAPI) {
        try {
          const fullscreenState = await window.electronAPI.windowIsFullscreen();
          const kioskState = await window.electronAPI.windowIsKiosk();
          setIsFullscreen(fullscreenState);
          setIsKiosk(kioskState);
        } catch (error) {
          console.error('Ошибка проверки состояния окна:', error);
        }
      }
    };

    // Проверяем состояние при загрузке
    checkWindowState();

    // Проверяем состояние каждые 2 секунды
    const interval = setInterval(checkWindowState, 2000);

    // Слушатель клавиши Escape для выхода из полноэкранного режима
    const handleEscape = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (isFullscreen || isKiosk)) {
        try {
          if (isKiosk) {
            await window.electronAPI?.windowExitKioskMode();
          } else if (isFullscreen) {
            await window.electronAPI?.windowToggleFullscreen();
          }
        } catch (error) {
          console.error('Ошибка выхода из полноэкранного режима:', error);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen, isKiosk]);

  // Не показываем индикатор в обычном режиме
  if (!isFullscreen && !isKiosk) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-in fade-in duration-300">
      {isKiosk ? (
        <>
          <ComputerDesktopIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Режим киоска</span>
        </>
      ) : (
        <>
          <ArrowsPointingOutIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Полный экран</span>
        </>
      )}
      <span className="text-xs text-gray-300 ml-2">ESC для выхода</span>
    </div>
  );
};

export default WindowModeIndicator;
