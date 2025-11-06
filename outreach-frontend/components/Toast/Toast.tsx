import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Toast as ToastType } from './types';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

// Solid icon components (Discord-style)
const SolidCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const SolidXCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const SolidExclamationTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const SolidInfo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const SolidX = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const iconMap = {
  success: SolidCheckCircle,
  error: SolidXCircle,
  warning: SolidExclamationTriangle,
  info: SolidInfo,
};

const colorMap = {
  success: '#3ba55d',
  error: '#ed4245',
  warning: '#faa81a',
  info: '#5865f2',
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);

  const Icon = toast.icon ? null : iconMap[toast.type];
  const color = colorMap[toast.type];

  useEffect(() => {
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
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0, x: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative min-w-[320px] max-w-[440px] rounded-full shadow-xl overflow-visible"
      role="alert"
      aria-live="polite"
      style={{
        fontFamily: 'Aeonik Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Lightning splash animations on both sides - outside the toast */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [0.5, 1.1, 0.9],
            opacity: [0, 0.85, 0],
            x: [-4, -10, -8],
          }}
          transition={{
            duration: 0.6,
            times: [0, 0.45, 1],
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
          className="w-6 h-8"
          style={{
            backgroundColor: '#4f55f1',
            clipPath:
              'polygon(55% 0%, 72% 0%, 63% 32%, 90% 32%, 42% 100%, 35% 60%, 8% 60%, 32% 24%)',
          }}
        />
      </div>

      <div className="absolute -right-3 top-1/2 -translate-y-1/2">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [0.5, 1.1, 0.9],
            opacity: [0, 0.85, 0],
            x: [4, 10, 8],
          }}
          transition={{
            duration: 0.6,
            times: [0, 0.45, 1],
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
          className="w-6 h-8"
          style={{
            backgroundColor: '#4f55f1',
            clipPath:
              'polygon(45% 0%, 28% 0%, 37% 32%, 10% 32%, 58% 100%, 65% 60%, 92% 60%, 68% 24%)',
          }}
        />
      </div>

      <div
        className="relative rounded-full overflow-hidden"
        style={{ backgroundColor: '#313338' }}
      >
        {/* Main content */}
        <div className="relative px-4 py-3 flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toast.icon ? (
              <div style={{ color }}>{toast.icon}</div>
            ) : Icon ? (
              <div style={{ color }}>
                <Icon />
              </div>
            ) : null}
          </div>

          {/* Message */}
          <div className="flex-1 text-sm font-medium pr-6" style={{ color: '#dbdee1' }}>
            {toast.message}
          </div>

          {/* Close button */}
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ color: '#b5bac1' }}
            aria-label="Close notification"
          >
            <SolidX />
          </button>
        </div>

        {/* Progress bar inside the toast */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: '#1e1f22' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: '#4f55f1',
              width: `${progress}%`,
              transition: 'width 16ms linear'
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
