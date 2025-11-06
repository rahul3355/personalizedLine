export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  message: string;
  icon?: React.ReactNode;
  duration?: number; // in milliseconds, default 4000
}

export interface Toast extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
}

export interface ToastContextType {
  toasts: Toast[];
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
