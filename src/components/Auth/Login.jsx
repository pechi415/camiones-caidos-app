import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, LogIn, Eye, EyeOff, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();

  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nationalId.trim()) {
      setErrorMsg('Por favor ingrese su número de identificación.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor ingrese su contraseña.');
      return;
    }

    const result = login(nationalId, password);
    if (!result.success) {
      setErrorMsg(result.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at 50% 20%, rgba(229, 46, 46, 0.15) 0%, rgba(10, 10, 15, 0.95) 70%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos Decorativos de Fondo */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(229, 46, 46, 0.2) 0%, rgba(0,0,0,0) 70%)',
        top: '-100px',
        right: '-100px',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(229, 213, 188, 0.1) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-150px',
        left: '-150px',
        pointerEvents: 'none'
      }} />

      {/* Tarjeta Glassmorphic de Login */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 30px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(229, 46, 46, 0.2)',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--brand-red) 0%, var(--brand-red-dark) 100%)',
            boxShadow: '0 8px 24px rgba(229, 46, 46, 0.4)',
            marginBottom: '16px'
          }}>
            <Truck size={34} color="#FFFFFF" />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.5px'
          }}>
            CAMIONES CAÍDOS
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px' }}>
            Sistema de Gestión de Flota y Cierre de Turno
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '12px 14px',
            borderRadius: '12px',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Número de Identificación (Cédula) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="glass-input"
              placeholder="Ej: 7574445"
              value={nationalId}
              onChange={(e) => {
                setNationalId(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              style={{ height: '46px', fontSize: '0.95rem' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
              Contraseña *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="glass-input"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                style={{ height: '46px', fontSize: '0.95rem', paddingRight: '42px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nota Informativa Primer Ingreso */}
          <div style={{
            background: 'rgba(229, 213, 188, 0.08)',
            border: '1px solid rgba(229, 213, 188, 0.2)',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '0.76rem',
            color: 'rgba(255, 255, 255, 0.75)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <KeyRound size={16} color="var(--brand-beige)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <b>Primer Ingreso:</b> Ingrese con su cédula y la contraseña inicial <b>caidos1234</b>. El sistema le pedirá crear una clave personal.
            </span>
          </div>

          {/* Botón Iniciar Sesión */}
          <button
            type="submit"
            className="btn-primary"
            style={{
              height: '48px',
              fontSize: '0.95rem',
              fontWeight: 700,
              width: '100%',
              marginTop: '4px',
              boxShadow: '0 8px 20px rgba(229, 46, 46, 0.4)'
            }}
          >
            <LogIn size={18} /> Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
