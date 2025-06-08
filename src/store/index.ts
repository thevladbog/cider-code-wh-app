import { create } from 'zustand';
import { Order } from '../models/orders';

interface Store {
  selectedOrder: Order | null;
  showArchive: boolean;
  orders: Order[];
  archivedOrders: Order[];
  isLoading: boolean;
  error: string | null;
  setSelectedOrder: (order: Order | null) => void;
  toggleArchiveView: () => void;
  fetchOrders: () => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  selectedOrder: null,
  showArchive: false,
  orders: [],
  archivedOrders: [],
  isLoading: false,
  error: null,

  setSelectedOrder: order => set({ selectedOrder: order }),
  toggleArchiveView: () => set(state => ({ showArchive: !state.showArchive })),

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Здесь должен быть вызов API для получения заказов
      // Это заглушка для исправления типов
      const orders: Order[] = [];
      const archivedOrders: Order[] = [];
      set({ orders, archivedOrders, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  },

  archiveOrder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Здесь должен быть вызов API для архивирования заказа
      // Это заглушка для исправления типов
      const { orders, archivedOrders } = get();
      const orderToArchive = orders.find(order => order.id === id);

      if (orderToArchive) {
        const updatedOrder = { ...orderToArchive, status: 'ARCHIVE' };
        set({
          orders: orders.filter(order => order.id !== id),
          archivedOrders: [...archivedOrders, updatedOrder as Order],
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  },

  updateOrderStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      // Здесь должен быть вызов API для обновления статуса заказа
      // Это заглушка для исправления типов
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  },
}));
