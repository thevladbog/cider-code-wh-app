import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  // Проверяем сохраненные настройки или системные предпочтения
  const getInitialTheme = (): Theme => {
    // Если есть сохраненная тема в localStorage, используем её
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
    }

    // Проверяем системные настройки
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }

    // По умолчанию используем светлую тему
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Функция для переключения темы
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Применяем тему к документу при изменении
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Удаляем предыдущий класс и добавляем новый
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return { theme, toggleTheme };
};
