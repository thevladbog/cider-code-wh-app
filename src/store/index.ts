import { create } from 'zustand';
import { Order } from '../models/orders';
import * as API from '../services/api';

interface Store {
  orders: Order[];
  archivedOrders: Order[];
  selectedOrder: Order | null;
  showArchive: boolean;
  isLoading: boolean;
  error: string | null;
  setSelectedOrder: (order: Order | null) => void;
  archiveOrder: (id: string) => Promise<void>;
  toggleArchiveView: () => void;
  fetchOrders: () => Promise<Order[]>; // Возвращает массив заказов
  refreshOrders: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  orders: [],
  archivedOrders: [],
  selectedOrder: null,
  showArchive: false,
  isLoading: false,
  error: null,
  
  setSelectedOrder: (order) => set({ selectedOrder: order }),
    archiveOrder: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      // Вызов API для архивации заказа
      const success = await API.archiveOrder(id);
      
      if (success) {
        set((state) => {
          const orderToArchive = state.orders.find(order => order.id === id);
          if (!orderToArchive) return state;
          
          const updatedOrder = { ...orderToArchive, status: 'ARCHIVE' as const };
          return {
            orders: state.orders.filter(order => order.id !== id),
            archivedOrders: [...state.archivedOrders, updatedOrder],
            isLoading: false
          };
        });
      }
    } catch (error) {
      console.error('Failed to archive order:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Ошибка при архивации заказа',
        isLoading: false
      });
    }
  },
  
  toggleArchiveView: () => set((state) => ({ showArchive: !state.showArchive })),
  fetchOrders: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Получаем активные заказы
      const activeOrders = await API.fetchOrders('NEW');
      // Получаем архивные заказы
      const archivedOrders = await API.fetchOrders('ARCHIVE');
      
      set({ 
        orders: activeOrders,
        archivedOrders: archivedOrders,
        isLoading: false
      });
      
      // Возвращаем данные для React Query
      return activeOrders;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Ошибка при загрузке заказов',
        isLoading: false
      });
      
      // Возвращаем пустой массив вместо undefined при ошибке
      return [];
    }
  },
    // Добавляем функцию обновления для кнопки обновления
  refreshOrders: async () => {
    await get().fetchOrders();
    return; // Явно возвращаем void
  }
}));
