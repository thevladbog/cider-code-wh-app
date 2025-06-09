import { useEffect } from 'react';

export const useWindowHotkeys = () => {
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Проверяем что есть доступ к electronAPI
      if (!window.electronAPI) return;

      // F11 - переключение полноэкранного режима
      if (event.key === 'F11') {
        event.preventDefault();
        try {
          await window.electronAPI.windowToggleFullscreen();
        } catch (error) {
          console.error('Ошибка переключения полноэкранного режима:', error);
        }
      }

      // Ctrl+Shift+K - режим киоска
      if (event.ctrlKey && event.shiftKey && event.key === 'K') {
        event.preventDefault();
        try {
          const isKiosk = await window.electronAPI.windowIsKiosk();
          if (isKiosk) {
            await window.electronAPI.windowExitKioskMode();
          } else {
            await window.electronAPI.windowEnterKioskMode();
          }
        } catch (error) {
          console.error('Ошибка переключения режима киоска:', error);
        }
      }

      // Ctrl+Q - закрытие приложения
      if (event.ctrlKey && event.key === 'q') {
        event.preventDefault();
        try {
          await window.electronAPI.appQuit();
        } catch (error) {
          console.error('Ошибка закрытия приложения:', error);
        }
      }

      // Ctrl+M - минимизация окна
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        try {
          await window.electronAPI.windowMinimize();
        } catch (error) {
          console.error('Ошибка минимизации окна:', error);
        }
      }

      // Ctrl+Shift+M - максимизация/восстановление окна
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        try {
          await window.electronAPI.windowMaximize();
        } catch (error) {
          console.error('Ошибка максимизации окна:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

export default useWindowHotkeys;
