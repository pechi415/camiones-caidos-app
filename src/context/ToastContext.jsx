import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import ToastContainer from '../components/Common/ToastContainer';

const ToastContext = createContext(null);

const DEFAULT_DURATIONS = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((type, message, customDuration) => {
    if (!message) return;

    const normalizedType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
    const duration = typeof customDuration === 'number' && customDuration > 0
      ? customDuration
      : DEFAULT_DURATIONS[normalizedType];

    const newToast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: normalizedType,
      message,
      duration
    };

    setToasts((prev) => {
      const next = [...prev, newToast];
      // Máximo 3 simultáneos: si llega un cuarto, descartar el más antiguo (FIFO)
      if (next.length > 3) {
        return next.slice(next.length - 3);
      }
      return next;
    });

    return newToast.id;
  }, []);

  const toast = useMemo(() => ({
    success: (msg, dur) => showToast('success', msg, dur),
    error: (msg, dur) => showToast('error', msg, dur),
    warning: (msg, dur) => showToast('warning', msg, dur),
    info: (msg, dur) => showToast('info', msg, dur),
    show: showToast,
    remove: removeToast
  }), [showToast, removeToast]);

  const contextValue = useMemo(() => ({
    ...toast,
    toast,
    showToast,
    removeToast,
    toasts
  }), [toast, showToast, removeToast, toasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}
