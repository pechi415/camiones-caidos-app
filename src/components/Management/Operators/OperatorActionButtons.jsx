import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

export default function OperatorActionButtons({
  operator,
  onEdit,
  onDelete,
  showText = false,
  style = {}
}) {
  if (!operator) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showText ? '8px' : '6px',
        ...style
      }}
    >
      <button
        type="button"
        onClick={() => onEdit && onEdit(operator)}
        title="Editar Operador"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'var(--glass-border)',
          color: '#FFFFFF',
          padding: showText ? '7px 10px' : '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          ...(showText ? {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem'
          } : {})
        }}
      >
        <Edit size={showText ? 14 : 15} />
        {showText && ' Editar'}
      </button>

      <button
        type="button"
        onClick={() => onDelete && onDelete(operator)}
        title="Eliminar Operador"
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          padding: showText ? '7px 10px' : '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          ...(showText ? {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem'
          } : {})
        }}
      >
        <Trash2 size={showText ? 14 : 15} />
        {showText && ' Eliminar'}
      </button>
    </div>
  );
}
