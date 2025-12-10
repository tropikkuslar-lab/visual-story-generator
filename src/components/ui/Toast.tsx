/**
 * Toast Notification System
 * Animasyonlu bildirim sistemi
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{
  toast: Toast;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const colors = {
    success: 'border-green-500/30 bg-green-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    info: 'border-blue-500/30 bg-blue-500/10'
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  useEffect(() => {
    const duration = toast.duration || 5000;
    const interval = 50;
    const step = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleRemove();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        w-80 rounded-lg border backdrop-blur-sm
        shadow-lg shadow-black/20
        transform transition-all duration-300 ease-out
        ${colors[toast.type]}
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[toast.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{toast.title}</p>
            {toast.message && (
              <p className="text-sm text-gray-400 mt-1">{toast.message}</p>
            )}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  handleRemove();
                }}
                className="mt-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
        <div
          className={`h-full transition-all duration-100 ${progressColors[toast.type]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              transitionDelay: `${index * 50}ms`
            }}
          >
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Shorthand functions
export const toast = {
  success: (title: string, message?: string) => ({ type: 'success' as const, title, message }),
  error: (title: string, message?: string) => ({ type: 'error' as const, title, message }),
  warning: (title: string, message?: string) => ({ type: 'warning' as const, title, message }),
  info: (title: string, message?: string) => ({ type: 'info' as const, title, message })
};

export default ToastProvider;
