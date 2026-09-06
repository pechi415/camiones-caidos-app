import React, { useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';
import { compressImage } from '../../../utils/imageUtils';

export default function UserAddForm({ onAddUser }) {
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    mine: 'Pribbenow',
    group: 'Grupo 1',
    role: 'Encargado',
    avatar: ''
  });

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
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Nombre *
          </label>
          <input
            type="text"
            className="glass-input"
            placeholder="Nombre completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={(e) => setFormData({ ...formData, name: autoCapitalizeName(e.target.value) })}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Identificación *
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="glass-input"
            placeholder="Número Cédula / Ficha"
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
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
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Grupo *
          </label>
          <select
            className="glass-input"
            value={formData.group}
            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
          >
            <option value="Grupo 1">Grupo 1</option>
            <option value="Grupo 2">Grupo 2</option>
            <option value="Grupo 3">Grupo 3</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
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
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Foto de Perfil (Avatar)
          </label>
          <input
            type="file"
            accept="image/*"
            className="glass-input"
            onChange={handlePhotoUpload}
            style={{ padding: '6px', fontSize: '0.78rem' }}
          />
        </div>

        <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 20px' }}>
          <Save size={16} /> Guardar Usuario
        </button>
      </div>
    </form>
  );
}
