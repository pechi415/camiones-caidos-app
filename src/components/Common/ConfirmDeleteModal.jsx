import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteModal({
  isOpen = true,
  title = 'Eliminar',
  onClose,
  onConfirm,
  cancelText = 'Cancelar',
  confirmText = 'Sí, Eliminar',
  children
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '28px', maxWidth: '440px', textAlign: 'center' }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}
        >
          <Trash2 size={28} />
        </div>

        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: '8px'
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}
        >
          {children}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass"
            style={{ padding: '10px 20px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              fontWeight: 700
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
