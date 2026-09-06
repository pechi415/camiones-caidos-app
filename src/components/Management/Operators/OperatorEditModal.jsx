import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { autoCapitalizeName } from '../../../utils/aiCorrector';

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

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: 'var(--glass-border)', paddingBottom: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
            Editar Datos de Operador
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Nombre Completo
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
              Sede / Mina
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
              Grupo
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
