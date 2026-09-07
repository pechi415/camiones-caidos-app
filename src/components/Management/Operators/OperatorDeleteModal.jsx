import React from 'react';
import ConfirmDeleteModal from '../../Common/ConfirmDeleteModal';

export default function OperatorDeleteModal({ operator, onClose, onConfirm }) {
  if (!operator) return null;

  return (
    <ConfirmDeleteModal
      isOpen={!!operator}
      title="Eliminar Operador"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      ¿Está seguro de eliminar al operador <strong style={{ color: '#FFFFFF' }}>{operator.name}</strong>?
      <br />
      <span style={{ fontSize: '0.82rem', color: 'var(--brand-beige)', display: 'block', marginTop: '8px' }}>
        📍 {operator.mine} • {operator.group || 'Grupo 1'}
      </span>
    </ConfirmDeleteModal>
  );
}
