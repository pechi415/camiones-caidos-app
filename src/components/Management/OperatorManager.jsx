import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useReports } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, UserPlus, Search, Trash2, Save, X, Users, Sparkles } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';
import OperatorTable from './Operators/OperatorTable';
import OperatorCardList from './Operators/OperatorCardList';

export default function OperatorManager() {
  const { operators, addOperator, editOperator, deleteOperator } = useReports();
  const { user, isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState(() => (!isAdmin && user?.mine ? user.mine : 'ALL'));
  const [groupFilter, setGroupFilter] = useState('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOp, setEditingOp] = useState(null);
  const [deleteConfirmOp, setDeleteConfirmOp] = useState(null);

  useEffect(() => {
    if (editingOp || deleteConfirmOp) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [editingOp, deleteConfirmOp]);

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
      <div className="management-header-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
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
          className="btn-primary management-header-btn"
          style={{ fontSize: '0.85rem' }}
        >
          <UserPlus size={16} /> {showAddForm ? 'Cancelar' : 'Registrar Nuevo Operador'}
        </button>
      </div>

      {/* Formulario Agregar Nuevo Operador */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card management-add-form" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(229, 46, 46, 0.05)', border: 'var(--glass-border-red)' }}>
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
      <OperatorCardList
        operators={filteredOperators}
        onEdit={setEditingOp}
        onDelete={setDeleteConfirmOp}
      />

      {/* Vista Escritorio: Tabla Completa */}
      <OperatorTable
        operators={filteredOperators}
        onEdit={setEditingOp}
        onDelete={setDeleteConfirmOp}
      />

      {/* Modal Editar Operador */}
      {editingOp && createPortal(
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
        </div>,
        document.body
      )}

      {/* Modal Confirmación de Eliminación de Operador */}
      {deleteConfirmOp && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteConfirmOp(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '440px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Eliminar Operador
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: '1.5' }}>
              ¿Está seguro de eliminar al operador <strong style={{ color: '#FFFFFF' }}>{deleteConfirmOp.name}</strong>?
              <br />
              <span style={{ fontSize: '0.82rem', color: 'var(--brand-beige)', display: 'block', marginTop: '8px' }}>
                📍 {deleteConfirmOp.mine} • {deleteConfirmOp.group || 'Grupo 1'}
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmOp(null)}
                className="btn-glass"
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOperator(deleteConfirmOp.id);
                  setDeleteConfirmOp(null);
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', fontWeight: 700 }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
