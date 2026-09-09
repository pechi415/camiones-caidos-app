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
  const {
    user,
    isAdmin,
    usersList,
    setUsersList,
    adminCreateUser,
    resetUserPassword,
    deleteUser,
    adminUpdateUserProfile,
    updateUserAvatar
  } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetConfirmUser, setResetConfirmUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [resetMsg, setResetMsg] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useModalScrollLock(Boolean(editingUser || resetConfirmUser || deleteConfirmUser));

  const handlePhotoUpload = async (e, targetUserId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);

      if (targetUserId) {
        await updateUserAvatar(targetUserId, compressed);
        setUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, avatar: compressed } : u));
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

  const handleAddSubmit = async (userData) => {
    if (!userData.name.trim() || !userData.nationalId.trim() || createLoading) return;

    setCreateLoading(true);
    setCreateError('');

    try {
      const result = await adminCreateUser({
        name: autoCapitalizeName(userData.name),
        nationalId: userData.nationalId.trim(),
        mine: userData.mine,
        group: userData.group,
        role: userData.role,
        avatar: userData.avatar || ''
      });

      if (result.success) {
        setShowAddForm(false);
        setResetMsg(`✅ Usuario ${result.user.name} registrado exitosamente en el sistema.`);
        setTimeout(() => setResetMsg(''), 7000);
      } else {
        setCreateError(result.error || 'Error al registrar el usuario.');
      }
    } catch (err) {
      console.error('Error al invocar creación de usuario:', err);
      setCreateError('Error inesperado al intentar crear el usuario.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async (updatedUser) => {
    if (!updatedUser || !updatedUser.name.trim() || !updatedUser.nationalId.trim()) return;

    try {
      const cleanName = autoCapitalizeName(updatedUser.name);

      await adminUpdateUserProfile(updatedUser.id, {
        name: cleanName,
        mine: updatedUser.mine,
        group: updatedUser.group,
        role: updatedUser.role,
        ...(updatedUser.avatar !== undefined ? { avatar: updatedUser.avatar } : {})
      });

      setUsersList(prev => prev.map(u => (u.id === updatedUser.id ? {
        ...u,
        name: cleanName,
        mine: updatedUser.mine,
        group: updatedUser.group,
        role: updatedUser.role,
        avatar: updatedUser.avatar !== undefined ? updatedUser.avatar : u.avatar
      } : u)));

      setEditingUser(null);
      setResetMsg(`✅ Usuario ${cleanName} actualizado correctamente.`);
      setTimeout(() => setResetMsg(''), 7000);
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setDeleteError('No fue posible actualizar el perfil del usuario.');
      setTimeout(() => setDeleteError(''), 7000);
    }
  };

  const handleDeleteUser = (targetUser) => {
    if (deleteLoading) return;
    if (usersList.length <= 1) {
      setDeleteError('Debe permanecer al menos un usuario en el sistema.');
      setTimeout(() => setDeleteError(''), 7000);
      return;
    }
    setDeleteError('');
    setDeleteConfirmUser(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser || deleteLoading) return;
    if (usersList.length <= 1) {
      setDeleteError('Debe permanecer al menos un usuario en el sistema.');
      setTimeout(() => setDeleteError(''), 7000);
      setDeleteConfirmUser(null);
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      const result = await deleteUser(deleteConfirmUser.id);
      if (result.success) {
        const deletedName = deleteConfirmUser.name;
        setDeleteConfirmUser(null);
        setResetMsg(`✅ Usuario ${deletedName} eliminado exitosamente del sistema.`);
        setTimeout(() => setResetMsg(''), 7000);
      } else {
        setDeleteConfirmUser(null);
        setDeleteError(result.error || 'No fue posible eliminar el usuario.');
        setTimeout(() => setDeleteError(''), 7000);
      }
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      setDeleteConfirmUser(null);
      setDeleteError('Error inesperado al intentar eliminar el usuario.');
      setTimeout(() => setDeleteError(''), 7000);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetConfirmUser || resetLoading) return;

    setResetLoading(true);
    try {
      const result = await resetUserPassword(resetConfirmUser.id);
      if (result.success) {
        setResetMsg(`✅ Contraseña de ${resetConfirmUser.name} restablecida exitosamente a la clave temporal.`);
        setResetConfirmUser(null);
        setTimeout(() => setResetMsg(''), 7000);
      } else {
        alert(result.error || 'Error al restablecer la contraseña.');
      }
    } catch (err) {
      console.error('Error al restablecer contraseña:', err);
      alert('Error inesperado al restablecer la contraseña.');
    } finally {
      setResetLoading(false);
    }
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
            setCreateError('');
          }}
          className="btn-primary management-header-btn"
          style={{ fontSize: '0.85rem' }}
          disabled={createLoading}
        >
          <UserPlus size={16} /> {showAddForm ? 'Cancelar' : 'Crear Nuevo Usuario'}
        </button>
      </div>

      {/* Formulario Agregar Usuario */}
      {showAddForm && (
        <div style={{ marginBottom: '24px' }}>
          {createLoading && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60A5FA',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⏳ Creando usuario en Supabase Auth y sincronizando perfil...
            </div>
          )}
          {createError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ {createError}
            </div>
          )}
          <UserAddForm onAddUser={handleAddSubmit} />
        </div>
      )}

      {/* Mensaje de Confirmación de Restablecimiento / Eliminación */}
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

      {/* Mensaje de Error Visual en Eliminación */}
      {deleteError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#F87171',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ {deleteError}
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
        onClose={() => {
          if (!resetLoading) setResetConfirmUser(null);
        }}
        onConfirm={handleConfirmReset}
      />

      {/* Modal Eliminar Usuario */}
      <UserDeleteModal
        user={deleteConfirmUser}
        onClose={() => {
          if (!deleteLoading) setDeleteConfirmUser(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
