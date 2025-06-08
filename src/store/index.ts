import { create } from 'zustand';
import { Order } from '../models/orders';

interface Store {
  selectedOrder: Order | null;
  showArchive: boolean;
  setSelectedOrder: (order: Order | null) => void;
  toggleArchiveView: () => void;
}

export const useStore = create<Store>(set => ({
  selectedOrder: null,
  showArchive: false,

  setSelectedOrder: order => set({ selectedOrder: order }),
  toggleArchiveView: () => set(state => ({ showArchive: !state.showArchive })),
}));
