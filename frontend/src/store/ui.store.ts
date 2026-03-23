import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  drawerOpen: boolean;
  drawerSignalId: number | null;
  toggleSidebar: () => void;
  openDrawer: (signalId: number) => void;
  closeDrawer: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  drawerOpen: false,
  drawerSignalId: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openDrawer: (signalId) => set({ drawerOpen: true, drawerSignalId: signalId }),
  closeDrawer: () => set({ drawerOpen: false, drawerSignalId: null }),
}));
