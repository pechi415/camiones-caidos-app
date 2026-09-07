import React, { useState, useEffect } from 'react';
import FormModal from '../../Common/FormModal';
import UserFormFields from './UserFormFields';

export default function UserEditModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState(() => ({
    id: user?.id,
    name: user?.name || '',
    nationalId: user?.nationalId || '',
    mine: user?.mine || 'Pribbenow',
    group: user?.group || 'Grupo 1',
    role: user?.role || 'Encargado',
    avatar: user?.avatar || ''
  }));

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name || '',
        nationalId: user.nationalId || '',
        mine: user.mine || 'Pribbenow',
        group: user.group || 'Grupo 1',
        role: user.role || 'Encargado',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nationalId.trim()) return;
    onSave(formData);
  };

  return (
    <FormModal
      isOpen={!!user}
      title="Editar Usuario"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <UserFormFields
        formData={formData}
        setFormData={setFormData}
        isEditing={true}
      />
    </FormModal>
  );
}

