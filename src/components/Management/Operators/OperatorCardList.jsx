import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

export default function OperatorCardList({
  operators,
  onEdit,
  onDelete
}) {
  return (
    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '16px' }}>
      {operators.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          No se encontraron operadores registrados.
        </div>
      ) : (
        operators.map(op => (
          <div
            key={op.id}
            className="glass-card"
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="operator-card-content" style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
              <div className="operator-card-name" style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {op.name}
              </div>
              <div className="operator-card-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'nowrap', marginTop: '2px' }}>
                <span className="badge-mine" style={{ background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  📍 {op.mine === 'Pribbenow' ? 'PB' : op.mine === 'El Descanso' ? 'ED' : op.mine}
                </span>
                <span className="badge-group" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF', border: 'var(--glass-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  👥 {op.group ? op.group.replace('Grupo ', 'G') : 'G1'}
                </span>
              </div>
            </div>

            {/* Acciones Móvil (Solo Iconos) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => onEdit(op)}
                title="Editar Operador"
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
                onClick={() => onDelete(op)}
                title="Eliminar Operador"
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
          </div>
        ))
      )}
    </div>
  );
}
