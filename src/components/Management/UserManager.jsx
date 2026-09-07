import React, { useState } from 'react';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import { useAuth } from '../../context/AuthContext';
import { Users, UserPlus } from 'lucide-react';
import { autoCapitalizeName } from '../../utils/aiCorrector';
import { compressImage } from '../../utils/imageUtils';
import UserAddForm from './Users/UserAddForm';
import UserDirectory from './Users/UserDirectory';
import UserResetPasswordModal from './Users/UserResetPasswordModal';
import UserDeleteModal from './Users/UserDeleteModal';
import UserEditModal from './Users/UserEditModal';

export default function UserManager() {
  const { user, isAdmin, usersList, setUsersList, resetUserPassword, deleteUser } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetConfirmUser, setResetConfirmUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [resetMsg, setResetMsg] = useState('');

  useModalScrollLock(Boolean(editingUser || resetConfirmUser || deleteConfirmUser));

  const saveUsersToStorage = (updatedList) => {
    setUsersList(updatedList);
  };

  const handlePhotoUpload = async (e, targetUserId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);

      if (targetUserId) {
        const updatedList = usersList.map(u => u.id === targetUserId ? { ...u, avatar: compressed } : u);
        saveUsersToStorage(updatedList);
      }
    } catch (err) {
      console.error('Error al procesar foto de usuario:', err);
    }
  };

  const handleAvatarChange = (userId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handlePhotoUpload(e, userId);
    input.click();
  };

  const handleAddSubmit = (userData) => {
    if (!userData.name.trim() || !userData.nationalId.trim()) return;

    const newUser = {
      id: `u-${Date.now()}`,
      name: autoCapitalizeName(userData.name),
      nationalId: userData.nationalId.trim(),
      mine: userData.mine,
      group: userData.group,
      role: userData.role,
      password: 'caidos1234',
      mustChangePassword: true,
      avatar: userData.avatar || ''
    };

    saveUsersToStorage([...usersList, newUser]);
    setShowAddForm(false);
  };

  const handleEditSave = (updatedUser) => {
    if (!updatedUser || !updatedUser.name.trim() || !updatedUser.nationalId.trim()) return;

    const updatedList = usersList.map(u => (u.id === updatedUser.id ? {
      ...u,
      name: autoCapitalizeName(updatedUser.name),
      nationalId: updatedUser.nationalId.trim(),
      mine: updatedUser.mine,
      group: updatedUser.group,
      role: updatedUser.role,
      avatar: updatedUser.avatar !== undefined ? updatedUser.avatar : u.avatar
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

  const handleConfirmReset = () => {
    if (!resetConfirmUser) return;

    resetUserPassword(resetConfirmUser.id);
    setResetMsg(`✅ Contraseña de ${resetConfirmUser.name} restablecida exitosamente a "caidos1234".`);
    setResetConfirmUser(null);
    setTimeout(() => setResetMsg(''), 7000);
  };

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
        <UserAddForm onAddUser={handleAddSubmit} />
      )}

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

      {/* Directorio de Usuarios: Filtros, Vista Móvil y Tabla Escritorio */}
      <UserDirectory
        users={usersList}
        onEdit={setEditingUser}
        onResetPassword={setResetConfirmUser}
        onDelete={handleDeleteUser}
        onAvatarChange={handleAvatarChange}
        isAdmin={isAdmin}
        userMine={user?.mine}
      />

      {/* Modal Editar Usuario */}
      <UserEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleEditSave}
      />

      {/* Modal Restablecer Contraseña */}
      <UserResetPasswordModal
        user={resetConfirmUser}
        onClose={() => setResetConfirmUser(null)}
        onConfirm={handleConfirmReset}
      />

      {/* Modal Eliminar Usuario */}
      <UserDeleteModal
        user={deleteConfirmUser}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
