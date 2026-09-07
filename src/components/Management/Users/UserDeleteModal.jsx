import React from 'react';
import ConfirmDeleteModal from '../../Common/ConfirmDeleteModal';

export default function UserDeleteModal({ user, onClose, onConfirm }) {
  if (!user) return null;

  return (
    <ConfirmDeleteModal
      isOpen={!!user}
      title="Eliminar Usuario"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      ¿Está seguro de eliminar al usuario <strong style={{ color: '#FFFFFF' }}>{user.name}</strong>?
      <br />
      Esta acción no se puede deshacer.
    </ConfirmDeleteModal>
  );
}
