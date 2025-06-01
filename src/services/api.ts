import { Order } from '../models/orders';

// Модуль для работы с моковыми данными вместо реального API

/**
 * Получение списка заказов
 * @param status - опциональный фильтр по статусу заказа
 * @returns Promise с массивом заказов
 */
export const fetchOrders = async (status?: string): Promise<Order[]> => {
  try {
    console.log('Используем Mock-данные для заказов');
    // Всегда возвращаем моковые данные
    const { mockOrders } = await import('../models/orders');
    
    // Если указан статус, фильтруем заказы
    if (status) {
      return mockOrders.filter(order => order.status === status);
    }
    
    // В противном случае возвращаем все заказы
    return mockOrders;
  } catch (error) {
    console.error('Ошибка при загрузке моковых данных:', error);
    throw error;
  }
};

/**
 * Архивация заказа
 * @param id - ID заказа для архивации
 * @returns Promise с результатом операции
 */
export const archiveOrder = async (id: string): Promise<boolean> => {
  console.log(`Архивирование заказа ${id} (Mock-режим)`);
  // Всегда возвращаем успех
  return true;
};
