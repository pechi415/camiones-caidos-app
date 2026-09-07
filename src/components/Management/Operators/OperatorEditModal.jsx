import React, { useState, useEffect } from 'react';
import FormModal from '../../Common/FormModal';
import { autoCapitalizeName } from '../../../utils/aiCorrector';
import OperatorFormFields from './OperatorFormFields';

export default function OperatorEditModal({ operator, onClose, onSave }) {
  const [formData, setFormData] = useState(() => ({
    id: operator?.id,
    name: operator?.name || '',
    mine: operator?.mine || 'Pribbenow',
    group: operator?.group || 'Grupo 1'
  }));

  useEffect(() => {
    if (operator) {
      setFormData({
        id: operator.id,
        name: operator.name || '',
        mine: operator.mine || 'Pribbenow',
        group: operator.group || 'Grupo 1'
      });
    }
  }, [operator]);

  if (!operator) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave({
      id: formData.id,
      name: autoCapitalizeName(formData.name),
      mine: formData.mine,
      group: formData.group || 'Grupo 1'
    });
  };

  return (
    <FormModal
      isOpen={!!operator}
      title="Editar Datos de Operador"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <OperatorFormFields
        formData={formData}
        setFormData={setFormData}
        isEditing={true}
      />
    </FormModal>
  );
}

