import { useState, useEffect } from 'react';

// Интерфейс для размеров экрана
interface WindowSize {
  width: number | undefined;
  height: number | undefined;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Пороговые значения для определения типа устройства
const MOBILE_BREAKPOINT = 640; // Мобильные устройства до 640px
const TABLET_BREAKPOINT = 1024; // Планшеты от 640px до 1024px

/**
 * Хук для отслеживания размера экрана и адаптации интерфейса
 */
const useWindowSize = (): WindowSize => {
  // Инициализируем с неопределенными размерами
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    // Функция для обработки изменения размера окна
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({
        width,
        height,
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
      });
    };

    // Добавляем прослушиватель событий
    window.addEventListener('resize', handleResize);

    // Вызываем функцию на монтирование компонента
    handleResize();

    // Очистка при размонтировании
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

export { useWindowSize };
