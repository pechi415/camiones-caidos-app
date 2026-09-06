import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, UserPlus, Save, X, KeyRound, Trash2 } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import { compressImage } from '../../utils/imageUtils';
import UserFilters from './Users/UserFilters';
import UserTable from './Users/UserTable';
import UserCardList from './Users/UserCardList';

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

  const handlePhotoUpload = async (e, isEdit = false, targetUserId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);

      if (targetUserId) {
        const updatedList = usersList.map(u => u.id === targetUserId ? { ...u, avatar: compressed } : u);
        saveUsersToStorage(updatedList);
      } else if (isEdit) {
        setEditingUser(prev => ({ ...prev, avatar: compressed }));
      } else {
        setNewUserData(prev => ({ ...prev, avatar: compressed }));
      }
    } catch (err) {
      console.error('Error al procesar foto de usuario:', err);
    }
  };

  const handleAvatarChange = (userId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handlePhotoUpload(e, false, userId);
    input.click();
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
      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        mineFilter={mineFilter}
        onMineFilterChange={setMineFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        isAdmin={isAdmin}
      />

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
      <UserCardList
        users={filteredUsers}
        onEdit={setEditingUser}
        onResetPassword={setResetConfirmUser}
        onDelete={handleDeleteUser}
        onAvatarChange={handleAvatarChange}
      />

      {/* Vista Escritorio: Tabla Completa */}
      <UserTable
        users={filteredUsers}
        onEdit={setEditingUser}
        onResetPassword={setResetConfirmUser}
        onDelete={handleDeleteUser}
        onAvatarChange={handleAvatarChange}
      />

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