import React from 'react';
import { Edit, KeyRound, Trash2 } from 'lucide-react';

export default function UserActionButtons({
  user,
  onEdit,
  onResetPassword,
  onDelete,
  style = {}
}) {
  if (!user) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...style
      }}
    >
      <button
        type="button"
        onClick={() => onEdit && onEdit(user)}
        title="Editar Usuario"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'var(--glass-border)',
          color: '#FFFFFF',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <Edit size={15} />
      </button>

      <button
        type="button"
        onClick={() => onResetPassword && onResetPassword(user)}
        title="Restablecer Contraseña"
        style={{
          background: 'rgba(234, 179, 8, 0.15)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          color: '#FACC15',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <KeyRound size={15} />
      </button>

      <button
        type="button"
        onClick={() => onDelete && onDelete(user)}
        title="Eliminar Usuario"
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
