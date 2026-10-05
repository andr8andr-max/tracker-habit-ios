import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface UIState {
  toasts: Toast[];
  sidebarOpen: boolean;
  confirm: ConfirmOptions | null;
  toast: (type: ToastType, message: string) => void;
  dismissToast: (id: number) => void;
  setSidebarOpen: (open: boolean) => void;
  openConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

let toastId = 0;

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  sidebarOpen: false,
  confirm: null,
  toast: (type, message) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    window.setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openConfirm: (options) => set({ confirm: options }),
  closeConfirm: () => set({ confirm: null }),
}));
