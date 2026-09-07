import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
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

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: 'var(--glass-border)', paddingBottom: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
            Editar Usuario
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <UserFormFields
            formData={formData}
            setFormData={setFormData}
            isEditing={true}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn-glass">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

