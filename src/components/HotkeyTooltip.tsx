import React, { useEffect } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface HotkeyTooltipProps {
  isVisible: boolean;
  onClose: () => void;
}

const HotkeyTooltip: React.FC<HotkeyTooltipProps> = ({ isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Автоматически скрываем через 5 секунд

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right duration-300">
      <div className="flex items-start space-x-3">
        <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Горячие клавиши</h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <div>
              <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">F11</kbd> -
              Полный экран
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                Ctrl+Shift+K
              </kbd>{' '}
              - Режим киоска
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl+Q</kbd>{' '}
              - Закрыть приложение
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl+M</kbd>{' '}
              - Свернуть
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                Ctrl+Shift+M
              </kbd>{' '}
              - Развернуть
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default HotkeyTooltip;
