import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';
import { compressImage } from '../../../utils/imageUtils';

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, avatar: compressed }));
    } catch (err) {
      console.error('Error al procesar foto de usuario:', err);
    }
  };

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
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Nombre Completo *
            </label>
            <input
              type="text"
              className="glass-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, name: autoCapitalizeName(e.target.value) })}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Identificación *
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="glass-input"
              value={formData.nationalId || ''}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Mina / Sede *
            </label>
            <select
              className="glass-input"
              value={formData.mine}
              onChange={(e) => setFormData({ ...formData, mine: e.target.value })}
            >
              <option value="Pribbenow">Pribbenow</option>
              <option value="El Descanso">El Descanso</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Grupo *
            </label>
            <select
              className="glass-input"
              value={formData.group || 'Grupo 1'}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
            >
              <option value="Grupo 1">Grupo 1</option>
              <option value="Grupo 2">Grupo 2</option>
              <option value="Grupo 3">Grupo 3</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Rol *
            </label>
            <select
              className="glass-input"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="Administrador">Administrador</option>
              <option value="Encargado">Encargado</option>
              <option value="Digitador">Digitador</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Foto de Perfil
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {formData.avatar && (
                <img
                  src={formData.avatar}
                  alt="Preview"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)' }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                className="glass-input"
                onChange={handlePhotoUpload}
                style={{ padding: '6px', fontSize: '0.8rem', flex: 1 }}
              />
            </div>
          </div>

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
