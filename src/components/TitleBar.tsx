import React, { CSSProperties, useState } from 'react';
import WindowControls from './WindowControls';
import WindowContextMenu from './WindowContextMenu';

interface TitleBarProps {
  title: string;
  children?: React.ReactNode;
}

const TitleBar: React.FC<TitleBarProps> = ({ title, children }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const handleDoubleClick = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.windowMaximize();
      } catch (error) {
        console.error('Ошибка максимизации окна:', error);
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };
  return (
    <>
      <header
        className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 select-none"
        style={
          {
            WebkitAppRegion: 'drag' as const,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            appRegion: 'drag',
          } as CSSProperties
        }
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white pointer-events-none">
            {title}
          </h1>
          <div
            className="flex items-center space-x-3"
            style={
              {
                WebkitAppRegion: 'no-drag' as const,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                appRegion: 'no-drag',
              } as CSSProperties
            }
          >
            {children}

            {/* Элементы управления окном */}
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <WindowControls />
            </div>
          </div>
        </div>
      </header>

      {/* Контекстное меню */}
      <WindowContextMenu
        isVisible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
      />
    </>
  );
};

export default TitleBar;
