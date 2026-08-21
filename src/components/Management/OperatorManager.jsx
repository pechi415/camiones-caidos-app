import React, { useState } from 'react';
import { useReports } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, UserPlus, Search, Trash2, Edit, Save, X, Users, MapPin, Sparkles, Camera } from 'lucide-react';
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
  const [deleteConfirmOp, setDeleteConfirmOp] = useState(null);

  const [newOpData, setNewOpData] = useState({
    name: '',
    mine: user?.mine || 'Pribbenow',
    group: 'Grupo 1',
    avatar: ''
  });

  const handlePhotoUpload = (e, isEdit = false, targetOpId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.85);

        if (targetOpId) {
          editOperator(targetOpId, { avatar: compressed });
        } else if (isEdit) {
          setEditingOp(prev => ({ ...prev, avatar: compressed }));
        } else {
          setNewOpData(prev => ({ ...prev, avatar: compressed }));
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
      group: newOpData.group || 'Grupo 1',
      avatar: newOpData.avatar || ''
    });
    setNewOpData({ name: '', mine: 'Pribbenow', group: 'Grupo 1', avatar: '' });
    setShowAddForm(false);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!editingOp || !editingOp.name.trim()) return;
    editOperator(editingOp.id, {
      name: autoCapitalizeName(editingOp.name),
      mine: editingOp.mine,
      group: editingOp.group,
      avatar: editingOp.avatar !== undefined ? editingOp.avatar : ''
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

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
                Foto de Perfil (Opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                className="glass-input"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onChange={(e) => handlePhotoUpload(e, false)}
              />
            </div>

            <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 22px', marginTop: 'auto' }}>
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
              <div className="operator-card-content" style={{ flex: 1, minWidth: 0, paddingRight: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handlePhotoUpload(e, false, op.id);
                    input.click();
                  }}
                  title="Haz clic para cambiar la foto del operador"
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                >
                  {op.avatar ? (
                    <img src={op.avatar} alt={op.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={18} color="rgba(255, 255, 255, 0.6)" />
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: 'var(--brand-red)',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #1A1A1A'
                  }}>
                    <Camera size={8} color="#FFFFFF" />
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="operator-card-name" style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {op.name}
                  </div>
                  <div className="operator-card-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'nowrap', marginTop: '2px' }}>
                    <span className="badge-mine" style={{ background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      📍 {op.mine === 'Pribbenow' ? 'PB' : op.mine === 'El Descanso' ? 'ED' : op.mine}
                    </span>
                    <span className="badge-group" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF', border: 'var(--glass-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      👥 {op.group ? op.group.replace('Grupo ', 'G') : 'G1'}
                    </span>
                  </div>
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
                  onClick={() => setDeleteConfirmOp(op)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => handlePhotoUpload(e, false, op.id);
                          input.click();
                        }}
                        title="Haz clic para cambiar la foto del operador"
                        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {op.avatar ? (
                          <img src={op.avatar} alt={op.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)' }} />
                        ) : (
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={16} color="rgba(255, 255, 255, 0.6)" />
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: 'var(--brand-red)',
                          borderRadius: '50%',
                          width: '13px',
                          height: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #1A1A1A'
                        }}>
                          <Camera size={7} color="#FFFFFF" />
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                        {op.name}
                      </div>
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
                        onClick={() => setDeleteConfirmOp(op)}
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

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                  Foto de Perfil (Avatar)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {editingOp.avatar ? (
                    <img src={editingOp.avatar} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={22} color="rgba(255, 255, 255, 0.6)" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="glass-input"
                    style={{ padding: '8px 12px', fontSize: '0.82rem', flex: 1 }}
                    onChange={(e) => handlePhotoUpload(e, true)}
                  />
                </div>
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

      {/* Modal Confirmación de Eliminación de Operador */}
      {deleteConfirmOp && (
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
        </div>
      )}
    </div>
  );
}
