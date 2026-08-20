import React, { useState } from 'react';
import { useReports } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, UserPlus, Search, Trash2, Edit, Save, X, Users, MapPin, Sparkles } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';

export default function OperatorManager() {
  const { operators, addOperator, editOperator, deleteOperator } = useReports();
  const { user, isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState(() => (!isAdmin && user?.mine ? user.mine : 'ALL'));
  const [groupFilter, setGroupFilter] = useState('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOp, setEditingOp] = useState(null);

  const [newOpData, setNewOpData] = useState({
    name: '',
    mine: user?.mine || 'Pribbenow',
    group: 'Grupo 1'
  });

  const filteredOperators = operators.filter(op => {
    const matchSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (op.group && op.group.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        op.mine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMine = mineFilter === 'ALL' || op.mine === mineFilter;
    const matchGroup = groupFilter === 'ALL' || op.group === groupFilter;

    return matchSearch && matchMine && matchGroup;
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newOpData.name.trim()) return;
    addOperator({
      name: autoCapitalizeName(newOpData.name),
      mine: newOpData.mine,
      group: newOpData.group || 'Grupo 1'
    });
    setNewOpData({ name: '', mine: 'Pribbenow', group: 'Grupo 1' });
    setShowAddForm(false);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!editingOp || !editingOp.name.trim()) return;
    editOperator(editingOp.id, {
      name: autoCapitalizeName(editingOp.name),
      mine: editingOp.mine,
      group: editingOp.group
    });
    setEditingOp(null);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck color="var(--brand-red)" size={24} /> Gestión de Operadores
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Listado general de operadores de transporte de acarreo en minas Pribbenow y El Descanso
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingOp(null);
          }}
          className="btn-primary"
          style={{ fontSize: '0.85rem' }}
        >
          <UserPlus size={16} /> {showAddForm ? 'Cancelar' : 'Registrar Nuevo Operador'}
        </button>
      </div>

      {/* Formulario Agregar Nuevo Operador */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(229, 46, 46, 0.05)', border: 'var(--glass-border-red)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--brand-red)" /> Registrar Nuevo Operador
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '14px', alignItems: 'end' }}>
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
              <Save size={16} /> Guardar
            </button>
          </div>
        </form>
      )}

      {/* Controles de Búsqueda y Filtros Responsivos */}
      <div className="user-filters-container">
        <div className="user-filters-search">
          <AnimatedSearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholderText="📢 Buscar por nombre del operador, sede o grupo asignado..."
          />
        </div>

        <div className="user-filters-selects">
          {/* Filtro Sede */}
          <select
            className="glass-input"
            value={mineFilter}
            disabled={!isAdmin}
            onChange={(e) => setMineFilter(e.target.value)}
            style={{
              height: '40px',
              fontSize: '0.85rem',
              opacity: !isAdmin ? 0.7 : 1,
              cursor: !isAdmin ? 'not-allowed' : 'pointer'
            }}
          >
            {isAdmin && <option value="ALL">Todas las Sedes</option>}
            <option value="Pribbenow">PB (Pribbenow)</option>
            <option value="El Descanso">ED (El Descanso)</option>
          </select>

          {/* Filtro Grupo */}
          <select
            className="glass-input"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{ height: '40px', fontSize: '0.85rem' }}
          >
            <option value="ALL">Todos los Grupos</option>
            <option value="Grupo 1">G1</option>
            <option value="Grupo 2">G2</option>
            <option value="Grupo 3">G3</option>
          </select>
        </div>
      </div>

      {/* Vista Móvil: Tarjetas Compactas de Operadores */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '16px' }}>
        {filteredOperators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            No se encontraron operadores registrados.
          </div>
        ) : (
          filteredOperators.map(op => (
            <div
              key={op.id}
              className="glass-card"
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div className="operator-card-content" style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                <div className="operator-card-name" style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.name}
                </div>
                <div className="operator-card-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'nowrap' }}>
                  <span className="badge-mine" style={{ background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    📍 {op.mine === 'Pribbenow' ? 'PB' : op.mine === 'El Descanso' ? 'ED' : op.mine}
                  </span>
                  <span className="badge-group" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF', border: 'var(--glass-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    👥 {op.group ? op.group.replace('Grupo ', 'G') : 'G1'}
                  </span>
                </div>
              </div>

              {/* Acciones Móvil (Solo Iconos) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setEditingOp(op)}
                  title="Editar Operador"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'var(--glass-border)',
                    color: '#FFFFFF',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Edit size={15} />
                </button>

                <button
                  onClick={() => deleteOperator(op.id)}
                  title="Eliminar Operador"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vista Escritorio: Tabla Completa */}
      <div className="hidden-mobile" style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Nombre del Operador</th>
              <th style={{ padding: '12px 16px' }}>Sede / Mina</th>
              <th style={{ padding: '12px 16px' }}>Grupo</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOperators.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                  No se encontraron operadores registrados con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredOperators.map(op => (
                <tr
                  key={op.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    transition: 'all 0.2s ease',
                    borderRadius: '10px'
                  }}
                  className="table-row-hover"
                >
                  {/* Nombre */}
                  <td style={{ padding: '14px 16px', borderRadius: '10px 0 0 10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                      {op.name}
                    </div>
                  </td>

                  {/* Sede / Mina */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--brand-beige)', background: 'rgba(243, 235, 221, 0.1)', padding: '4px 10px', borderRadius: '6px', border: 'var(--glass-border-beige)' }}>
                      <MapPin size={14} color="var(--brand-beige)" />
                      {op.mine}
                    </div>
                  </td>

                  {/* Grupo */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'var(--glass-border)',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--brand-white)'
                    }}>
                      {op.group || 'Grupo 1'}
                    </span>
                  </td>

                  {/* Acciones (Editar & Eliminar) */}
                  <td style={{ padding: '14px 16px', borderRadius: '0 10px 10px 0', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => setEditingOp(op)}
                        title="Editar Operador"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: 'var(--glass-border)',
                          color: '#FFFFFF',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem'
                        }}
                      >
                        <Edit size={14} /> Editar
                      </button>

                      <button
                        onClick={() => deleteOperator(op.id)}
                        title="Eliminar Operador"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem'
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Operador */}
      {editingOp && (
        <div className="modal-overlay" onClick={() => setEditingOp(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: 'var(--glass-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                Editar Datos de Operador
              </h3>
              <button onClick={() => setEditingOp(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  className="glass-input"
                  value={editingOp.name}
                  onChange={(e) => setEditingOp({ ...editingOp, name: e.target.value })}
                  onBlur={(e) => setEditingOp({ ...editingOp, name: autoCapitalizeName(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                  Sede / Mina
                </label>
                <select
                  className="glass-input"
                  value={editingOp.mine}
                  onChange={(e) => setEditingOp({ ...editingOp, mine: e.target.value })}
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
                  value={editingOp.group || 'Grupo 1'}
                  onChange={(e) => setEditingOp({ ...editingOp, group: e.target.value })}
                >
                  <option value="Grupo 1">Grupo 1</option>
                  <option value="Grupo 2">Grupo 2</option>
                  <option value="Grupo 3">Grupo 3</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingOp(null)} className="btn-glass">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
