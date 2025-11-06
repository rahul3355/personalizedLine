import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast as ToastType } from './types';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const Icon = toast.icon ? null : iconMap[toast.type];

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const duration = toast.duration;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        onDismiss(toast.id);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [toast.id, toast.duration, onDismiss, isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative min-w-[320px] max-w-[500px] bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden"
      role="alert"
      aria-live="polite"
      style={{ fontFamily: 'Aeonik Pro, sans-serif' }}
    >
      {/* Droplet animations at both ends */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: [0, 1, 0], y: [0, 8, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute left-4 top-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: '#4f55f1' }}
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: [0, 1, 0], y: [0, 8, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="absolute right-4 top-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: '#4f55f1' }}
      />

      {/* Main content */}
      <div className="relative px-4 py-3 flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {toast.icon ? (
            <div style={{ color: '#4f55f1' }}>{toast.icon}</div>
          ) : Icon ? (
            <Icon size={20} style={{ color: '#4f55f1' }} />
          ) : null}
        </div>

        {/* Message */}
        <div className="flex-1 text-sm font-medium text-gray-900 pr-6">
          {toast.message}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="absolute top-3 right-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar at bottom */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-full"
          style={{
            backgroundColor: '#4f55f1',
            width: `${progress}%`,
            transition: isPaused ? 'none' : 'width 16ms linear'
          }}
        />
      </div>
    </motion.div>
  );
}
