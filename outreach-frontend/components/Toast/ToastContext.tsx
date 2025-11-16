import { createContext, useState, useCallback, useMemo, ReactNode } from 'react';
import ToastContainer from './ToastContainer';
import { Toast, ToastOptions, ToastContextType } from './types';

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      type: options.type || 'info',
      message: options.message,
      icon: options.icon,
      duration: options.duration || 2000,
    };

    setToasts((prev) => {
      // Limit to 3 toasts at a time
      if (prev.length >= 3) {
        return [...prev.slice(1), newToast];
      }
      return [...prev, newToast];
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({ toasts, toast, dismiss, dismissAll }),
    [toasts, toast, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
