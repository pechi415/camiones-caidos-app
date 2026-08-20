import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, KeyRound, Check, AlertCircle } from 'lucide-react';

export default function ChangePasswordModal({ isOpen }) {
  const { user, changePassword } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMsg('Por favor ingrese la nueva contraseña.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword === 'caidos1234') {
      setErrorMsg('Por razones de seguridad, su nueva contraseña no puede ser "caidos1234".');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifique.');
      return;
    }

    changePassword(user.id, newPassword);
    setSuccessMsg('Contraseña actualizada correctamente. ¡Bienvenido!');
    setTimeout(() => {
      setSuccessMsg('');
    }, 1200);
  };

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(16px)', zIndex: 9999 }}>
      <div className="modal-content glass-panel" style={{
        maxWidth: '420px',
        padding: '30px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(229, 46, 46, 0.3)'
      }}>
        {/* Encabezado del Modal */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(229, 46, 46, 0.2)',
            border: '1px solid rgba(229, 46, 46, 0.4)',
            marginBottom: '12px'
          }}>
            <ShieldAlert size={30} color="var(--brand-red)" />
          </div>

          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
            Cambio Obligatorio de Contraseña
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px' }}>
            Hola <b>{user.name}</b>, por seguridad al ingresar por primera vez debe asignar su contraseña personal.
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '10px 12px',
            borderRadius: '10px',
            color: '#FCA5A5',
            fontSize: '0.8rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '10px 12px',
            borderRadius: '10px',
            color: 'var(--status-operativo)',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} color="var(--status-operativo)" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Nueva Contraseña Personal *
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrorMsg('');
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              className="glass-input"
              placeholder="Repita la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrorMsg('');
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              height: '46px',
              fontSize: '0.9rem',
              fontWeight: 700,
              width: '100%',
              marginTop: '6px'
            }}
          >
            <KeyRound size={18} /> Guardar Contraseña y Continuar
          </button>
        </form>
      </div>
    </div>
  );
}
