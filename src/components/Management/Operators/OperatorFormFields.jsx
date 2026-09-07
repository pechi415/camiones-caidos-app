import React from 'react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';

export default function OperatorFormFields({
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

  return (
    <>
      {/* Campo: Nombre del Operador */}
      <div>
        <label style={labelStyle}>
          {isEditing ? 'Nombre Completo' : 'Nombre del Operador *'}
        </label>
        <input
          type="text"
          className="glass-input"
          placeholder={isEditing ? undefined : 'Ej: Carlos Ramírez'}
          value={formData.name || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          onBlur={(e) => setFormData(prev => ({ ...prev, name: autoCapitalizeName(e.target.value) }))}
          required
        />
      </div>

      {/* Campo: Sede / Mina */}
      <div>
        <label style={labelStyle}>
          {isEditing ? 'Sede / Mina' : 'Sede / Mina *'}
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
          {isEditing ? 'Grupo' : 'Grupo *'}
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
    </>
  );
}
