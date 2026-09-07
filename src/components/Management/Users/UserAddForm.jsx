import React, { useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import UserFormFields from './UserFormFields';

export default function UserAddForm({ onAddUser }) {
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    mine: 'Pribbenow',
    group: 'Grupo 1',
    role: 'Encargado',
    avatar: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.nationalId.trim()) return;

    onAddUser(formData);
    setFormData({
      name: '',
      nationalId: '',
      mine: 'Pribbenow',
      group: 'Grupo 1',
      role: 'Encargado',
      avatar: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card management-add-form" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(229, 46, 46, 0.05)', border: 'var(--glass-border-red)' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UserPlus size={18} color="var(--brand-red)" /> Registrar Nuevo Usuario
      </h4>

      <div className="management-form-grid user-form-grid">
        <UserFormFields
          formData={formData}
          setFormData={setFormData}
          isEditing={false}
        />

        <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 20px' }}>
          <Save size={16} /> Guardar Usuario
        </button>
      </div>
    </form>
  );
}

