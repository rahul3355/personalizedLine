import { AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import { Toast as ToastType } from './types';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none"
      style={{ maxWidth: '90vw' }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
