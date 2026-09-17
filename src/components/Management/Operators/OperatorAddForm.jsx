import React, { useState } from 'react';
import { Users, FloppyDisk } from '@phosphor-icons/react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';
import OperatorFormFields from './OperatorFormFields';

export default function OperatorAddForm({ onAddOperator, defaultMine = 'Pribbenow' }) {
  const [newOpData, setNewOpData] = useState({
    name: '',
    mine: defaultMine,
    group: 'Grupo 1'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newOpData.name.trim()) return;

    onAddOperator({
      name: autoCapitalizeName(newOpData.name),
      mine: newOpData.mine,
      group: newOpData.group || 'Grupo 1'
    });

    setNewOpData({
      name: '',
      mine: defaultMine,
      group: 'Grupo 1'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card management-add-form" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(229, 46, 46, 0.05)', border: 'var(--glass-border-red)' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={18} color="var(--brand-red)" weight="duotone" /> Registrar Nuevo Operador
      </h4>

      <div className="management-form-grid">
        <OperatorFormFields
          formData={newOpData}
          setFormData={setNewOpData}
          isEditing={false}
        />

        <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 22px' }}>
          <FloppyDisk size={16} weight="duotone" /> Guardar Operador
        </button>
      </div>
    </form>
  );
}

