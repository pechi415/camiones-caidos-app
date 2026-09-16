import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

export default function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const triggerClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    // Tiempo para permitir que se ejecute la animación de salida en CSS
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  }, [isExiting, onRemove, toast.id]);

  const startTimer = useCallback(() => {
    if (remainingRef.current <= 0) {
      triggerClose();
      return;
    }
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      triggerClose();
    }, remainingRef.current);
  }, [triggerClose]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTimer]);

  const handleMouseEnter = () => {
    pauseTimer();
  };

  const handleMouseLeave = () => {
    startTimer();
  };

  const IconComponent = ICONS[toast.type] || Info;
  const isAssertive = toast.type === 'error';

  return (
    <div
      className={`toast-item toast-item--${toast.type} ${isExiting ? 'toast-item--exiting' : ''}`}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="toast-icon-wrapper" aria-hidden="true">
        <IconComponent size={20} className="toast-icon" />
      </div>

      <div className="toast-message">
        {toast.message}
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={triggerClose}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
