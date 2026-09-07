import React from 'react';
import { Users, Camera, IdCard, MapPin, Shield } from 'lucide-react';
import UserActionButtons from './UserActionButtons';

export default function UserTable({
  users,
  onEdit,
  onResetPassword,
  onDelete,
  onAvatarChange
}) {
  return (
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
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                No se encontraron usuarios registrados con los criterios seleccionados.
              </td>
            </tr>
          ) : (
            users.map(u => (
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
                      onClick={() => onAvatarChange && onAvatarChange(u.id)}
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
                  <UserActionButtons
                    user={u}
                    onEdit={onEdit}
                    onResetPassword={onResetPassword}
                    onDelete={onDelete}
                    style={{ justifyContent: 'flex-end' }}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
