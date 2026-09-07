import React from 'react';
import { Users, Camera, IdCard, Shield } from 'lucide-react';
import UserActionButtons from './UserActionButtons';

export default function UserCardList({
  users,
  onEdit,
  onResetPassword,
  onDelete,
  onAvatarChange
}) {
  return (
    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '16px' }}>
      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          No se encontraron usuarios con los criterios seleccionados.
        </div>
      ) : (
        users.map(u => (
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
                  onClick={() => onAvatarChange && onAvatarChange(u.id)}
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
            <UserActionButtons
              user={u}
              onEdit={onEdit}
              onResetPassword={onResetPassword}
              onDelete={onDelete}
              style={{ flexShrink: 0 }}
            />
          </div>
        ))
      )}
    </div>
  );
}
