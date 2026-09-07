import React from 'react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';
import { compressImage } from '../../../utils/imageUtils';

export default function UserFormFields({
  formData,
  setFormData,
  isEditing = false
}) {
  const labelStyle = {
    fontSize: isEditing ? '0.8rem' : '0.78rem',
    fontWeight: 600,
    color: 'var(--brand-beige)',
    marginBottom: isEditing ? '6px' : '4px',
    display: 'block'
  };

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

  return (
    <>
      {/* Campo: Nombre */}
      <div>
        <label style={labelStyle}>
          {isEditing ? 'Nombre Completo *' : 'Nombre *'}
        </label>
        <input
          type="text"
          className="glass-input"
          placeholder={isEditing ? undefined : 'Nombre completo'}
          value={formData.name || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          onBlur={(e) => setFormData(prev => ({ ...prev, name: autoCapitalizeName(e.target.value) }))}
          required
        />
      </div>

      {/* Campo: Identificación */}
      <div>
        <label style={labelStyle}>
          Identificación *
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="glass-input"
          placeholder={isEditing ? undefined : 'Número Cédula / Ficha'}
          value={formData.nationalId || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, nationalId: e.target.value }))}
          required
        />
      </div>

      {/* Campo: Mina / Sede */}
      <div>
        <label style={labelStyle}>
          Mina / Sede *
        </label>
        <select
          className="glass-input"
          value={formData.mine || 'Pribbenow'}
          onChange={(e) => setFormData(prev => ({ ...prev, mine: e.target.value }))}
        >
          <option value="Pribbenow">Pribbenow</option>
          <option value="El Descanso">El Descanso</option>
        </select>
      </div>

      {/* Campo: Grupo */}
      <div>
        <label style={labelStyle}>
          Grupo *
        </label>
        <select
          className="glass-input"
          value={formData.group || 'Grupo 1'}
          onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
        >
          <option value="Grupo 1">Grupo 1</option>
          <option value="Grupo 2">Grupo 2</option>
          <option value="Grupo 3">Grupo 3</option>
        </select>
      </div>

      {/* Campo: Rol */}
      <div>
        <label style={labelStyle}>
          Rol *
        </label>
        <select
          className="glass-input"
          value={formData.role || 'Encargado'}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
        >
          <option value="Administrador">Administrador</option>
          <option value="Encargado">Encargado</option>
          <option value="Digitador">Digitador</option>
        </select>
      </div>

      {/* Campo: Foto de Perfil (Avatar) */}
      <div>
        <label style={labelStyle}>
          {isEditing ? 'Foto de Perfil' : 'Foto de Perfil (Avatar)'}
        </label>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {formData.avatar && (
              <img
                src={formData.avatar}
                alt="Preview"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid var(--brand-red)'
                }}
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
        ) : (
          <input
            type="file"
            accept="image/*"
            className="glass-input"
            onChange={handlePhotoUpload}
            style={{ padding: '6px', fontSize: '0.78rem' }}
          />
        )}
      </div>
    </>
  );
}
