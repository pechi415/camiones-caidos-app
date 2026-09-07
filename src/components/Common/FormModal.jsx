import React from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';

export default function FormModal({
  isOpen = true,
  title,
  onClose,
  onSubmit,
  cancelText = 'Cancelar',
  submitText = 'Guardar Cambios',
  submitIcon = <Save size={16} />,
  maxWidth = '500px',
  children
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '24px', maxWidth }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            borderBottom: 'var(--glass-border)',
            paddingBottom: '12px'
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#FFFFFF'
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {children}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '10px'
            }}
          >
            <button type="button" onClick={onClose} className="btn-glass">
              {cancelText}
            </button>
            <button type="submit" className="btn-primary">
              {submitIcon} {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
