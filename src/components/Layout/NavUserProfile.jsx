import React, { useState, useRef } from 'react';
import { User, ChevronDown, LogOut, Camera, MapPin } from 'lucide-react';
import { getShortName } from '../../utils/aiCorrector';
import { compressImage } from '../../utils/imageUtils';

export default function NavUserProfile({ user, logout, updateUserAvatar }) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const avatarInputRef = useRef(null);

  const handleSelfAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (user && user.id && updateUserAvatar) {
        updateUserAvatar(user.id, compressed);
      }
    } catch (err) {
      console.error('Error al procesar avatar:', err);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Input Oculto para Cargar Foto de Perfil del Usuario Logeado */}
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleSelfAvatarUpload}
      />

      {/* Usuario y Selector de Rol */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div
          onClick={() => avatarInputRef.current?.click()}
          title="Haz clic para cambiar tu foto de perfil"
          style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--brand-red)' }}
            />
          ) : (
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <User size={18} />
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
            border: '1px solid #000'
          }}>
            <Camera size={8} color="#FFFFFF" />
          </div>
        </div>

        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            border: 'var(--glass-border-light)',
            padding: '5px 10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            color: '#FFFFFF'
          }}
        >
          <div style={{ textAlign: 'left', minWidth: 0 }} className="user-profile-info">
            <div className="user-name-full" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
              {user.name}
            </div>
            <div className="user-name-short" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {getShortName(user.name)}
            </div>
            {/* Muestra Mina y Grupo en lugar del Rol */}
            <div style={{ fontSize: '0.68rem', color: 'var(--brand-beige)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <MapPin size={10} style={{ flexShrink: 0 }} /> {user?.mine || 'Pribbenow'} - {user?.group || 'Grupo 1'}
            </div>
          </div>
          <ChevronDown size={15} color="rgba(255,255,255,0.7)" />
        </button>

        {/* Dropdown menú de perfil y simulación de rol */}
        {showRoleMenu && (
          <div style={{
            position: 'absolute',
            top: '115%',
            right: 0,
            width: '240px',
            background: 'var(--bg-surface-elevated)',
            backdropFilter: 'blur(20px)',
            border: 'var(--glass-border-light)',
            borderRadius: '14px',
            boxShadow: 'var(--glass-shadow-lg)',
            padding: '8px',
            zIndex: 200
          }}>
            {/* Opción Directa de Cambiar Foto de Perfil */}
            <button
              onClick={() => {
                setShowRoleMenu(false);
                avatarInputRef.current?.click();
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'rgba(243, 235, 221, 0.1)',
                border: 'var(--glass-border-beige)',
                padding: '8px 10px',
                borderRadius: '10px',
                color: 'var(--brand-beige)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '4px',
                fontSize: '0.82rem',
                fontWeight: 700
              }}
            >
              <Camera size={16} color="var(--brand-beige)" /> Cambiar Foto de Perfil
            </button>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '6px', paddingTop: '6px' }}>
              <button
                onClick={() => {
                  setShowRoleMenu(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  color: '#EF4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
