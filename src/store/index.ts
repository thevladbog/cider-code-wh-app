// filepath: v:\Projects\Personal\RA\cider-code\cider-code-wh-app\src\store\index.ts
import { create } from 'zustand';
import { Order } from '../models/orders';
import { TlsStatus } from '../config/tls-status';

interface Store {
  selectedOrder: Order | null;
  showArchive: boolean;
  orders: Order[];
  archivedOrders: Order[];
  isLoading: boolean;
  error: string | null;
  
  // TLS status
  tlsStatus: TlsStatus | null;
  tlsStatusLoading: boolean;
  tlsStatusError: string | null;
  
  setSelectedOrder: (order: Order | null) => void;
  toggleArchiveView: () => void;
  fetchOrders: () => Promise<void>;
  fetchTlsStatus: () => Promise<void>;
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
  
  // TLS status initial state
  tlsStatus: null,
  tlsStatusLoading: false,
  tlsStatusError: null,

  setSelectedOrder: order => set({ selectedOrder: order }),
  toggleArchiveView: () => set(state => ({ showArchive: !state.showArchive })),
  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if window.electronAPI is available
      if (!window.electronAPI?.fetchOrders) {
        // Fall back to mock data if electronAPI is not available
        const orders: Order[] = [];
        const archivedOrders: Order[] = [];
        set({ orders, archivedOrders, isLoading: false });
        return;
      }

      // Fetch active orders
      const activeResponse = await window.electronAPI.fetchOrders('NEW');
      if (!activeResponse.success) {
        throw new Error(activeResponse.error || 'Failed to fetch active orders');
      }
      
      // Fetch archived orders
      const archiveResponse = await window.electronAPI.fetchOrders('ARCHIVE');
      if (!archiveResponse.success) {
        throw new Error(archiveResponse.error || 'Failed to fetch archived orders');
      }
      
      // Update state with retrieved orders
      set({ 
        orders: activeResponse.data as Order[], 
        archivedOrders: archiveResponse.data as Order[], 
        isLoading: false 
      });
      
      // After successful fetch, also update TLS status
      get().fetchTlsStatus();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching orders',
      });
    }
  },

  // Fetch TLS connection status
  fetchTlsStatus: async () => {
    set({ tlsStatusLoading: true, tlsStatusError: null });
    try {
      // Check if window.electronAPI is available
      if (!window.electronAPI) {
        // Skip if electronAPI is not available
        set({ tlsStatusLoading: false });
        return;
      }

      const status = await window.electronAPI.getTlsStatus();
      set({ tlsStatus: status, tlsStatusLoading: false });
    } catch (error) {
      set({
        tlsStatusLoading: false,
        tlsStatusError: error instanceof Error ? error.message : 'Unknown TLS status error',
      });
    }
  },

  archiveOrder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check if window.electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API is not available');
      }
      
      // Call the IPC method to archive order
      const response = await window.electronAPI.archiveOrder(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to archive order');
      }

      // Update local state after successful API call
      const { orders, archivedOrders } = get();
      const orderToArchive = orders.find(order => order.id === id);

      if (orderToArchive) {
        const updatedOrder = { ...orderToArchive, status: 'ARCHIVE' };
        set({
          orders: orders.filter(order => order.id !== id),
          archivedOrders: [...archivedOrders, updatedOrder as Order],
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      
      // Update TLS status after API operation
      get().fetchTlsStatus();
      
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error archiving order',
      });
    }
  },

  updateOrderStatus: async (id: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check if window.electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API is not available');
      }

      // Call the IPC method to update order status
      const response = await window.electronAPI.updateOrderStatus(id, status);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update order status');
      }

      // Update local state after successful API call
      const { orders } = get();
      const updatedOrders = orders.map(order => 
        order.id === id ? { ...order, status } as Order : order
      );
      
      set({ orders: updatedOrders, isLoading: false });
      
      // Update TLS status after API operation
      get().fetchTlsStatus();
      
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error updating order status',
      });
    }
  },
}));
