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
      <div className="fixed top-24 right-0 sm:right-4 z-[9999] pointer-events-none flex flex-col items-end gap-3 w-full sm:max-w-sm px-4 sm:px-0">
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
    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/10'
    : isSuccess
    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
    : 'bg-blue-500/10 text-blue-500 border border-blue-500/10';

  const progressBgClass = isError
    ? 'bg-rose-500'
    : isSuccess
    ? 'bg-emerald-500'
    : 'bg-blue-500';

  const title = isError ? 'Error' : isSuccess ? 'Success' : 'Notice';

  return (
    <motion.div
      initial={{ x: 300, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 300, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="pointer-events-auto w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 shadow-lg rounded-xl overflow-hidden relative flex flex-col"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Status Icon */}
        <div className={`flex items-center justify-center rounded-lg ${iconBgClass} p-2 shrink-0 mt-0.5`}>
          {isError ? (
            <AlertTriangle className="h-4 w-4" />
          ) : isSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColorClass}`}>
            {title}
          </span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Horizontal reducing progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2.5px] ${progressBgClass}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  );
};
