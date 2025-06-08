import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order } from '../models/orders';
import * as API from '../services/api';

// Ключи запросов для кэширования
export const QUERY_KEYS = {
  allOrders: ['orders'],
  ordersByStatus: (status: string) => ['orders', { status }],
  orderById: (id: string) => ['orders', { id }],
};

/**
 * Хук для получения заказов с автоматическим поллингом
 * @param status Опциональный фильтр по статусу
 * @param pollingInterval Интервал обновления в мс (по умолчанию 30 сек)
 * @param enabled Включить/отключить запрос
 */
export function useOrders(status?: 'NEW' | 'ARCHIVE', pollingInterval = 30000, enabled = true) {
  return useQuery(QUERY_KEYS.ordersByStatus(status || 'all'), () => API.fetchOrders(status), {
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled,
    staleTime: pollingInterval / 2, // Считаем данные устаревшими через половину интервала
  });
}

/**
 * Хук для изменения статуса заказа с оптимистичным UI обновлением
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, status }: { id: string; status: 'NEW' | 'ARCHIVE' }) =>
      API.updateOrderStatus(id, status),
    {
      // Оптимистичное обновление UI перед отправкой запроса
      onMutate: async ({ id, status }) => {
        // Отменяем исходящие запросы, чтобы они не перезаписали наше оптимистичное обновление
        await queryClient.cancelQueries(QUERY_KEYS.allOrders);

        // Сохраняем предыдущее состояние для отката в случае ошибки
        const previousOrders = queryClient.getQueryData<Order[]>(QUERY_KEYS.allOrders);
        const previousNewOrders = queryClient.getQueryData<Order[]>(
          QUERY_KEYS.ordersByStatus('NEW')
        );
        const previousArchiveOrders = queryClient.getQueryData<Order[]>(
          QUERY_KEYS.ordersByStatus('ARCHIVE')
        );

        // Оптимистично обновляем кэш
        if (previousNewOrders && status === 'ARCHIVE') {
          const order = previousNewOrders.find(order => order.id === id);
          if (order) {
            const updatedOrder = { ...order, status };
            // Обновляем кэши с разным статусом
            queryClient.setQueryData<Order[]>(QUERY_KEYS.ordersByStatus('NEW'), old =>
              old ? old.filter(o => o.id !== id) : []
            );

            queryClient.setQueryData<Order[]>(QUERY_KEYS.ordersByStatus('ARCHIVE'), old =>
              old ? [...old, updatedOrder] : [updatedOrder]
            );
          }
        } else if (previousArchiveOrders && status === 'NEW') {
          const order = previousArchiveOrders.find(order => order.id === id);
          if (order) {
            const updatedOrder = { ...order, status };
            // Обновляем кэши с разным статусом
            queryClient.setQueryData<Order[]>(QUERY_KEYS.ordersByStatus('ARCHIVE'), old =>
              old ? old.filter(o => o.id !== id) : []
            );

            queryClient.setQueryData<Order[]>(QUERY_KEYS.ordersByStatus('NEW'), old =>
              old ? [...old, updatedOrder] : [updatedOrder]
            );
          }
        }

        // Возвращаем контекст для использования в onError
        return { previousOrders, previousNewOrders, previousArchiveOrders };
      },

      // При ошибке возвращаем предыдущее состояние
      onError: (_err, _variables, context) => {
        if (context?.previousOrders) {
          queryClient.setQueryData(QUERY_KEYS.allOrders, context.previousOrders);
        }
        if (context?.previousNewOrders) {
          queryClient.setQueryData(QUERY_KEYS.ordersByStatus('NEW'), context.previousNewOrders);
        }
        if (context?.previousArchiveOrders) {
          queryClient.setQueryData(
            QUERY_KEYS.ordersByStatus('ARCHIVE'),
            context.previousArchiveOrders
          );
        }
      },

      // После успешной мутации инвалидируем запросы для обновления данных
      onSettled: () => {
        queryClient.invalidateQueries(QUERY_KEYS.allOrders);
        queryClient.invalidateQueries(QUERY_KEYS.ordersByStatus('NEW'));
        queryClient.invalidateQueries(QUERY_KEYS.ordersByStatus('ARCHIVE'));
      },
    }
  );
}
