import React, { useState } from 'react';
import { Users, Save } from 'lucide-react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';

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
        <Users size={18} color="var(--brand-red)" /> Registrar Nuevo Operador
      </h4>

      <div className="management-form-grid">
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Nombre del Operador *
          </label>
          <input
            type="text"
            className="glass-input"
            placeholder="Ej: Carlos Ramírez"
            value={newOpData.name}
            onChange={(e) => setNewOpData({ ...newOpData, name: e.target.value })}
            onBlur={(e) => setNewOpData({ ...newOpData, name: autoCapitalizeName(e.target.value) })}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
            Sede / Mina *
          </label>
          <select
            className="glass-input"
            value={newOpData.mine}
            onChange={(e) => setNewOpData({ ...newOpData, mine: e.target.value })}
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
            value={newOpData.group}
            onChange={(e) => setNewOpData({ ...newOpData, group: e.target.value })}
          >
            <option value="Grupo 1">Grupo 1</option>
            <option value="Grupo 2">Grupo 2</option>
            <option value="Grupo 3">Grupo 3</option>
          </select>
        </div>

        <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 22px' }}>
          <Save size={16} /> Guardar Operador
        </button>
      </div>
    </form>
  );
}
