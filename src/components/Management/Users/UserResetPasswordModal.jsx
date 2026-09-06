import React from 'react';
import { createPortal } from 'react-dom';
import { KeyRound } from 'lucide-react';

export default function UserResetPasswordModal({ user, onClose, onConfirm }) {
  if (!user) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '450px', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(234, 179, 8, 0.15)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          color: '#FACC15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <KeyRound size={28} />
        </div>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
          Restablecer Contraseña
        </h3>

        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: '1.5' }}>
          ¿Está seguro de restablecer la clave para <strong style={{ color: '#FFFFFF' }}>{user.name}</strong>?
          <br />
          <span style={{ fontSize: '0.82rem', color: 'var(--brand-beige)', display: 'block', marginTop: '10px' }}>
            🔑 La clave asignada será <strong>caidos1234</strong> y el usuario deberá cambiarla al ingresar.
          </span>
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass"
            style={{ padding: '10px 20px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)', color: '#000000', fontWeight: 700 }}
          >
            Sí, Restablecer Clave
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
