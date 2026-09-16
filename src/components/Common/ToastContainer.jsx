import React from 'react';
import { createPortal } from 'react-dom';
import ToastItem from './ToastItem';

export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return createPortal(
    <div
      className="toast-container"
      role="region"
      aria-label="Notificaciones del sistema"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}
