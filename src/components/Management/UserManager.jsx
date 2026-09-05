import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Shield, MapPin, UserPlus, Search, Edit, Trash2, Save, X, IdCard, Sparkles, KeyRound, RotateCcw, Camera } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';

export default function UserManager() {
  const { user, isAdmin, usersList, setUsersList, resetUserPassword, deleteUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState(() => (!isAdmin && user?.mine ? user.mine : 'ALL'));
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetConfirmUser, setResetConfirmUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    if (editingUser || resetConfirmUser || deleteConfirmUser) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [editingUser, resetConfirmUser, deleteConfirmUser]);

  const [newUserData, setNewUserData] = useState({
    name: '',
    nationalId: '',
    mine: 'Pribbenow',
    group: 'Grupo 1',
    role: 'Encargado',
    avatar: ''
  });

  const saveUsersToStorage = (updatedList) => {
    setUsersList(updatedList);
  };

  const handlePhotoUpload = (e, isEdit = false, targetUserId = null) => {
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

        if (targetUserId) {
          const updatedList = usersList.map(u => u.id === targetUserId ? { ...u, avatar: compressed } : u);
          saveUsersToStorage(updatedList);
        } else if (isEdit) {
          setEditingUser(prev => ({ ...prev, avatar: compressed }));
        } else {
          setNewUserData(prev => ({ ...prev, avatar: compressed }));
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.nationalId.trim()) return;

    const newUser = {
      id: `u-${Date.now()}`,
      name: autoCapitalizeName(newUserData.name),
      nationalId: newUserData.nationalId.trim(),
      mine: newUserData.mine,
      group: newUserData.group,
      role: newUserData.role,
      password: 'caidos1234',
      mustChangePassword: true,
      avatar: newUserData.avatar || ''
    };

    saveUsersToStorage([...usersList, newUser]);
    setNewUserData({ name: '', nationalId: '', mine: 'Pribbenow', group: 'Grupo 1', role: 'Encargado', avatar: '' });
    setShowAddForm(false);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim() || !editingUser.nationalId.trim()) return;

    const updatedList = usersList.map(u => (u.id === editingUser.id ? {
      ...u,
      name: autoCapitalizeName(editingUser.name),
      nationalId: editingUser.nationalId.trim(),
      mine: editingUser.mine,
      group: editingUser.group,
      role: editingUser.role,
      avatar: editingUser.avatar !== undefined ? editingUser.avatar : u.avatar
    } : u));

    saveUsersToStorage(updatedList);
    setEditingUser(null);
  };

  const handleDeleteUser = (targetUser) => {
    if (usersList.length <= 1) {
      alert('Debe permanecer al menos un usuario en el sistema.');
      return;
    }
    setDeleteConfirmUser(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    if (usersList.length <= 1) {
      alert('Debe permanecer al menos un usuario en el sistema.');
      setDeleteConfirmUser(null);
      return;
    }
    await deleteUser(deleteConfirmUser.id);
    setDeleteConfirmUser(null);
  };

  const filteredUsers = usersList.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.nationalId && u.nationalId.includes(searchTerm)) ||
                        (u.group && u.group.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchMine = mineFilter === 'ALL' || u.mine === mineFilter;
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchGroup = groupFilter === 'ALL' || u.group === groupFilter;

    return matchSearch && matchMine && matchRole && matchGroup;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div className="management-header-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="var(--brand-red)" size={24} /> Gestión de Usuarios
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Administración de cuentas, identificaciones, roles y sedes de la plataforma
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingUser(null);
          }}
          className="btn-primary management-header-btn"
          style={{ fontSize: '0.85rem' }}
        >
          <UserPlus size={16} /> {showAddForm ? 'Cancelar' : 'Crear Nuevo Usuario'}
        </button>
      </div>

      {/* Formulario Agregar Usuario */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card management-add-form" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(229, 46, 46, 0.05)', border: 'var(--glass-border-red)' }}>
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
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                onBlur={(e) => setNewUserData({ ...newUserData, name: autoCapitalizeName(e.target.value) })}
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
                value={newUserData.nationalId}
                onChange={(e) => setNewUserData({ ...newUserData, nationalId: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '4px', display: 'block' }}>
                Mina / Sede *
              </label>
              <select
                className="glass-input"
                value={newUserData.mine}
                onChange={(e) => setNewUserData({ ...newUserData, mine: e.target.value })}
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
                value={newUserData.group}
                onChange={(e) => setNewUserData({ ...newUserData, group: e.target.value })}
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
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
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
                onChange={(e) => handlePhotoUpload(e, false)}
                style={{ padding: '6px', fontSize: '0.78rem' }}
              />
            </div>

            <button type="submit" className="btn-beige" style={{ height: '42px', padding: '0 20px' }}>
              <Save size={16} /> Guardar Usuario
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
            placeholderText="📢 Buscar por nombre de usuario, cédula o grupo asignado..."
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
            {isAdmin && <option value="ALL">Sedes</option>}
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
            <option value="ALL">Grupos</option>
            <option value="Grupo 1">G1</option>
            <option value="Grupo 2">G2</option>
            <option value="Grupo 3">G3</option>
          </select>

          {/* Filtro Rol */}
          <select
            className="glass-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '40px', fontSize: '0.85rem' }}
          >
            <option value="ALL">Roles</option>
            <option value="Administrador">Admin</option>
            <option value="Encargado">Encargado</option>
            <option value="Digitador">Digitador</option>
          </select>
        </div>
      </div>

      {/* Mensaje de Confirmación de Restablecimiento */}
      {resetMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#4ADE80',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          {resetMsg}
        </div>
      )}

      {/* Vista Móvil: Tarjetas Compactas Abreviadas */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '16px' }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            No se encontraron usuarios con los criterios seleccionados.
          </div>
        ) : (
          filteredUsers.map(u => (
            <div
              key={u.id}
              className="glass-card user-card-mobile"
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div className="user-card-content" style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                <div className="user-card-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => handlePhotoUpload(e, false, u.id);
                      input.click();
                    }}
                    title="Haz clic para cambiar la foto de perfil"
                    style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)', flexShrink: 0 }} />
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
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <IdCard size={12} color="var(--brand-beige)" /> {u.nationalId || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="user-card-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', flexWrap: 'nowrap' }}>
                  <span className="badge-mine" style={{ background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    📍 {u.mine === 'Pribbenow' ? 'PB' : u.mine === 'El Descanso' ? 'ED' : u.mine}
                  </span>

                  <span className="badge-group" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF', border: 'var(--glass-border)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    👥 {u.group ? u.group.replace('Grupo ', 'G') : 'G1'}
                  </span>

                  <span className="badge-role" style={{
                    background: u.role === 'Administrador' ? 'rgba(229, 46, 46, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: u.role === 'Administrador' ? '#E52E2E' : 'var(--brand-beige)',
                    border: u.role === 'Administrador' ? '1px solid rgba(229, 46, 46, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <Shield size={12} />
                    {u.role === 'Administrador' ? 'Admin' : u.role === 'Encargado' ? 'Enc.' : u.role === 'Digitador' ? 'Dig.' : u.role}
                  </span>
                </div>
              </div>

              {/* Acciones Móvil (Solo Iconos) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => setEditingUser(u)}
                  title="Editar Usuario"
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
                  onClick={() => setResetConfirmUser(u)}
                  title="Restablecer Contraseña"
                  style={{
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    color: '#FACC15',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <KeyRound size={15} />
                </button>

                <button
                  onClick={() => handleDeleteUser(u)}
                  title="Eliminar Usuario"
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
              <th style={{ padding: '12px 16px' }}>Nombre</th>
              <th style={{ padding: '12px 16px' }}>Identificación</th>
              <th style={{ padding: '12px 16px' }}>Mina / Sede</th>
              <th style={{ padding: '12px 16px' }}>Grupo</th>
              <th style={{ padding: '12px 16px' }}>Rol</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                  No se encontraron usuarios registrados con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr
                  key={u.id}
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
                          input.onchange = (e) => handlePhotoUpload(e, false, u.id);
                          input.click();
                        }}
                        title="Haz clic para cambiar la foto de perfil"
                        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)' }} />
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
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                        {u.name}
                      </div>
                    </div>
                  </td>

                  {/* Identificación */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      <IdCard size={15} color="var(--brand-beige)" />
                      {u.nationalId || '10654321'}
                    </div>
                  </td>

                  {/* Mina / Sede */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--brand-beige)', background: 'rgba(243, 235, 221, 0.1)', padding: '4px 10px', borderRadius: '6px', border: 'var(--glass-border-beige)' }}>
                      <MapPin size={14} color="var(--brand-beige)" />
                      {u.mine}
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
                      color: 'var(--brand-white)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {u.group || 'Grupo 1'}
                    </span>
                  </td>

                  {/* Rol */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: u.role === 'Administrador' ? 'rgba(229, 46, 46, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: u.role === 'Administrador' ? '#E52E2E' : 'var(--brand-beige)',
                      border: u.role === 'Administrador' ? '1px solid rgba(229, 46, 46, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <Shield size={12} />
                      {u.role}
                    </span>
                  </td>

                  {/* Acciones (Solo Iconos) */}
                  <td style={{ padding: '14px 16px', borderRadius: '0 10px 10px 0', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => setEditingUser(u)}
                        title="Editar Usuario"
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
                        onClick={() => setResetConfirmUser(u)}
                        title="Restablecer Contraseña"
                        style={{
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          color: '#FACC15',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <KeyRound size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        title="Eliminar Usuario"
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Editar Usuario */}
      {editingUser && createPortal(
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: 'var(--glass-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                Editar Usuario
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  className="glass-input"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  onBlur={(e) => setEditingUser({ ...editingUser, name: autoCapitalizeName(e.target.value) })}
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
                  value={editingUser.nationalId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nationalId: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                  Mina / Sede *
                </label>
                <select
                  className="glass-input"
                  value={editingUser.mine}
                  onChange={(e) => setEditingUser({ ...editingUser, mine: e.target.value })}
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
                  value={editingUser.group || 'Grupo 1'}
                  onChange={(e) => setEditingUser({ ...editingUser, group: e.target.value })}
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
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
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
                  {editingUser.avatar && (
                    <img
                      src={editingUser.avatar}
                      alt="Preview"
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--brand-red)' }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="glass-input"
                    onChange={(e) => handlePhotoUpload(e, true)}
                    style={{ padding: '6px', fontSize: '0.8rem', flex: 1 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-glass">
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

      {/* Modal Restablecer Contraseña */}
      {resetConfirmUser && createPortal(
        <div className="modal-overlay" onClick={() => setResetConfirmUser(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '450px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#FACC15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <KeyRound size={28} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Restablecer Contraseña
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: '1.5' }}>
              ¿Está seguro de restablecer la clave para <strong style={{ color: '#FFFFFF' }}>{resetConfirmUser.name}</strong>?
              <br />
              <span style={{ fontSize: '0.82rem', color: 'var(--brand-beige)', display: 'block', marginTop: '10px' }}>
                🔑 La clave asignada será <strong>caidos1234</strong> y el usuario deberá cambiarla al ingresar.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setResetConfirmUser(null)}
                className="btn-glass"
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetUserPassword(resetConfirmUser.id);
                  setResetMsg(`✅ Contraseña de ${resetConfirmUser.name} restablecida exitosamente a "caidos1234".`);
                  setResetConfirmUser(null);
                  setTimeout(() => setResetMsg(''), 7000);
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)', color: '#000000', fontWeight: 700 }}
              >
                Sí, Restablecer Clave
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Eliminar Usuario */}
      {deleteConfirmUser && createPortal(
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
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
              Eliminar Usuario
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: '1.5' }}>
              ¿Está seguro de eliminar al usuario <strong style={{ color: '#FFFFFF' }}>{deleteConfirmUser.name}</strong>?
              <br />
              Esta acción no se puede deshacer.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="btn-glass"
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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