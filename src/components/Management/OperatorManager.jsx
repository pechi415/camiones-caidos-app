import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useReports } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, UserPlus, Search, Save, X, Sparkles } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import OperatorTable from './Operators/OperatorTable';
import OperatorCardList from './Operators/OperatorCardList';
import OperatorFilters from './Operators/OperatorFilters';
import OperatorDeleteModal from './Operators/OperatorDeleteModal';
import OperatorAddForm from './Operators/OperatorAddForm';
import { supabase } from '../../lib/supabase';

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

  const filteredOperators = operators.filter(op => {
    const matchSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (op.group && op.group.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        op.mine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMine = mineFilter === 'ALL' || op.mine === mineFilter;
    const matchGroup = groupFilter === 'ALL' || op.group === groupFilter;

    return matchSearch && matchMine && matchGroup;
  });

  const handleAddSubmit = async (opData) => {
    if (!opData?.name?.trim()) return;
    const cleanName = autoCapitalizeName(opData.name);
    const opId = `OP-${Math.floor(500 + Math.random() * 400)}-${Date.now().toString().slice(-4)}`;
    const opPayload = {
      id: opId,
      name: cleanName,
      mine: opData.mine,
      group: opData.group || 'Grupo 1',
      status: 'Activo'
    };

    try {
      await supabase.from('operators').upsert([{
        id: opId,
        name: cleanName,
        mine: opPayload.mine,
        group_name: opPayload.group,
        status: 'Activo'
      }]);
    } catch (err) {
      console.warn('Error persistiendo operador en Supabase:', err);
    }

    addOperator(opPayload);
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
        <OperatorAddForm
          onAddOperator={handleAddSubmit}
          defaultMine={user?.mine || 'Pribbenow'}
        />
      )}

      {/* Controles de Búsqueda y Filtros Responsivos */}
      <OperatorFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        mineFilter={mineFilter}
        onMineFilterChange={setMineFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        isAdmin={isAdmin}
      />

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
      <OperatorDeleteModal
        operator={deleteConfirmOp}
        onClose={() => setDeleteConfirmOp(null)}
        onConfirm={() => {
          deleteOperator(deleteConfirmOp.id);
          setDeleteConfirmOp(null);
        }}
      />
    </div>
  );
}
