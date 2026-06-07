import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setActiveToast({ id, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-[72px] lg:top-16 left-0 right-0 z-[9999] pointer-events-none w-full">
        <AnimatePresence mode="wait">
          {activeToast && (
            <ToastBanner key={activeToast.id} toast={activeToast} onClose={closeToast} />
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastBanner: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  // Custom styles for each toast type
  const labelColorClass = isError
    ? 'text-rose-600 dark:text-rose-400'
    : isSuccess
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-blue-600 dark:text-blue-400';

  const iconBgClass = isError
    ? 'bg-rose-500/10 text-rose-500'
    : isSuccess
    ? 'bg-emerald-500/10 text-emerald-500'
    : 'bg-blue-500/10 text-blue-500';

  const progressBgClass = isError
    ? 'bg-rose-500'
    : isSuccess
    ? 'bg-emerald-500'
    : 'bg-blue-500';

  const title = isError ? 'Error' : isSuccess ? 'Success' : 'Notice';

  return (
    <motion.div
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -64, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="pointer-events-auto w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-md relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center rounded-lg ${iconBgClass} p-1.5 shrink-0`}>
            {isError ? (
              <AlertTriangle className="h-4 w-4" />
            ) : isSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </div>
          <div className="flex items-baseline gap-2 truncate">
            <span className={`text-[10px] font-black uppercase tracking-wider ${labelColorClass} shrink-0`}>
              {title}
            </span>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {toast.message}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Horizontal reducing progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[3px] ${progressBgClass}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  );
};
