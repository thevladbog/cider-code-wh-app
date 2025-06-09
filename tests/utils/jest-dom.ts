/**
 * Этот файл предназначен для создания кастомных матчеров в стиле Jest DOM,
 * которые можно использовать в тестах Vitest.
 * 
 * Для полной поддержки нужно установить:
 * npm install --save-dev @testing-library/jest-dom
 */
import { expect } from 'vitest';

// Расширяем интерфейс Assertion для добавления матчеров в стиле Jest DOM
declare module 'vitest' {
  interface Assertion {
    // Проверяет, что элемент присутствует в DOM
    toBeInTheDocument(): void;
    // Проверяет, что элемент содержит указанный класс
    toHaveClass(className: string): void;
    // Проверяет, что элемент содержит указанный текст
    toHaveTextContent(text: string): void;
    // Проверяет атрибут элемента
    toHaveAttribute(attr: string, value?: string): void;
  }
}

// Реализация матчера toBeInTheDocument
expect.extend({
  toBeInTheDocument(received: HTMLElement) {
    const pass = received !== null && received !== undefined && 
                 received instanceof HTMLElement && 
                 document.contains(received);
    
    return {
      pass,
      message: () => 
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`
    };
  },
  
  toHaveClass(received: HTMLElement, className: string) {
    const pass = received && received.classList && 
                 received.classList.contains(className);
    
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have class "${className}"`
          : `expected element to have class "${className}"`
    };
  },
  
  toHaveTextContent(received: HTMLElement, text: string) {
    const textContent = received && received.textContent;
    const pass = textContent !== null && textContent !== undefined &&
                 textContent.includes(text);
    
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to contain text "${text}"`
          : `expected element to contain text "${text}"`
    };
  },
  
  toHaveAttribute(received: HTMLElement, attr: string, value?: string) {
    const hasAttr = received && received.hasAttribute(attr);
    const pass = hasAttr && 
                 (value === undefined || received.getAttribute(attr) === value);
    
    return {
      pass,
      message: () => {
        if (!hasAttr) {
          return `expected element to have attribute "${attr}"`;
        }
        if (value !== undefined) {
          return `expected element to have attribute "${attr}" with value "${value}"`;
        }
        return `expected element not to have attribute "${attr}"`;
      }
    };
  }
});