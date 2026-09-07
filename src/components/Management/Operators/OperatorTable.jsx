import React from 'react';
import { MapPin } from 'lucide-react';
import OperatorActionButtons from './OperatorActionButtons';

export default function OperatorTable({
  operators,
  onEdit,
  onDelete
}) {
  return (
    <div className="hidden-mobile" style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
        <thead>
          <tr style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px' }}>Nombre del Operador</th>
            <th style={{ padding: '12px 16px' }}>Sede / Mina</th>
            <th style={{ padding: '12px 16px' }}>Grupo</th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {operators.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                No se encontraron operadores registrados con los criterios seleccionados.
              </td>
            </tr>
          ) : (
            operators.map(op => (
              <tr
                key={op.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.2s ease',
                  borderRadius: '10px'
                }}
                className="table-row-hover"
              >
                {/* Nombre */}
                <td style={{ padding: '14px 16px', borderRadius: '10px 0 0 10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                    {op.name}
                  </div>
                </td>

                {/* Sede / Mina */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--brand-beige)', background: 'rgba(243, 235, 221, 0.1)', padding: '4px 10px', borderRadius: '6px', border: 'var(--glass-border-beige)' }}>
                    <MapPin size={14} color="var(--brand-beige)" />
                    {op.mine}
                  </div>
                </td>

                {/* Grupo */}
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'var(--glass-border)',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-white)'
                  }}>
                    {op.group || 'Grupo 1'}
                  </span>
                </td>

                {/* Acciones (Editar & Eliminar) */}
                <td style={{ padding: '14px 16px', borderRadius: '0 10px 10px 0', textAlign: 'right' }}>
                  <OperatorActionButtons
                    operator={op}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    showText={true}
                    style={{ justifyContent: 'flex-end' }}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
