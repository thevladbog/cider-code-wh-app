import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusIcon,
  RectangleStackIcon,
  ComputerDesktopIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import HotkeyTooltip from './HotkeyTooltip';

const WindowControls: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKiosk, setIsKiosk] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Проверяем текущее состояние окна при загрузке компонента
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

    checkWindowState();
  }, []);

  const handleToggleFullscreen = async () => {
    if (window.electronAPI) {
      try {
        const newState = await window.electronAPI.windowToggleFullscreen();
        setIsFullscreen(newState);
      } catch (error) {
        console.error('Ошибка переключения полноэкранного режима:', error);
      }
    }
  };

  const handleEnterKioskMode = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.windowEnterKioskMode();
        setIsKiosk(true);
      } catch (error) {
        console.error('Ошибка входа в режим киоска:', error);
      }
    }
  };

  const handleExitKioskMode = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.windowExitKioskMode();
        setIsKiosk(false);
      } catch (error) {
        console.error('Ошибка выхода из режима киоска:', error);
      }
    }
  };

  const handleMinimize = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.windowMinimize();
      } catch (error) {
        console.error('Ошибка сворачивания окна:', error);
      }
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.windowMaximize();
      } catch (error) {
        console.error('Ошибка разворачивания окна:', error);
      }
    }
  };

  const handleQuit = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.appQuit();
      } catch (error) {
        console.error('Ошибка закрытия приложения:', error);
      }
    }
  };
  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Кнопка помощи */}
        <button
          onClick={() => setShowTooltip(true)}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95"
          title="Показать горячие клавиши"
        >
          <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </button>
        {/* Кнопка минимизации */}
        <button
          onClick={handleMinimize}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95"
          title="Свернуть окно"
        >
          <MinusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        {/* Кнопка разворачивания/восстановления */}
        <button
          onClick={handleMaximize}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95"
          title="Развернуть/восстановить окно"
        >
          <RectangleStackIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        {/* Кнопка полноэкранного режима */}
        <button
          onClick={handleToggleFullscreen}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95"
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowsPointingOutIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </button>
        {/* Кнопка режима киоска */}
        {isKiosk ? (
          <button
            onClick={handleExitKioskMode}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/30 active:scale-95"
            title="Выйти из режима киоска"
          >
            <ComputerDesktopIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </button>
        ) : (
          <button
            onClick={handleEnterKioskMode}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/30 active:scale-95"
            title="Войти в режим киоска"
          >
            <ComputerDesktopIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </button>
        )}{' '}
        {/* Кнопка закрытия приложения */}
        <button
          onClick={handleQuit}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95"
          title="Закрыть приложение"
        >
          <XMarkIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </button>
      </div>

      {/* Tooltip с горячими клавишами */}
      <HotkeyTooltip isVisible={showTooltip} onClose={() => setShowTooltip(false)} />
    </>
  );
};

export default WindowControls;
