import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { Truck, Sun, Moon, Shield, MapPin, User, ChevronDown, LogOut, Lock, Calendar, Camera, RefreshCw, Download } from 'lucide-react';

export default function Navbar({ onOpenNewReport, activeTab, setActiveTab }) {
  const { user, isAdmin, logout, switchUser, preseededUsers, activeMine, setActiveMine, activeShift, setActiveShift, selectedDate, setSelectedDate, getTodayISO, updateUserAvatar } = useAuth();
  const { dbStatus, refreshData } = useReports();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const avatarInputRef = useRef(null);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      alert('📱 Para instalar "Camiones Caídos" en tu dispositivo:\n\n1. En Android (Chrome/Edge): Presiona el menú (⋮) y selecciona "Agregar a la pantalla principal" o "Instalar aplicación".\n\n2. En iPhone/iPad (Safari): Toca el botón Compartir (⎋) y selecciona "Agregar a inicio".');
    }
  };

  const canSelectPribbenow = isAdmin || user?.mine === 'Pribbenow';
  const canSelectElDescanso = isAdmin || user?.mine === 'El Descanso';

  const handleSelfAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('La imagen seleccionada no debe superar los 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (user && user.id && updateUserAvatar) {
        updateUserAvatar(user.id, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="glass-panel navbar-floating" style={{
      margin: '12px 16px 0 16px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: '0',
      zIndex: 1000,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}>
      {/* Fila Principal Superior (Logo, Filtros Desktop, Perfil) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #E52E2E 0%, #991B1B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(229, 46, 46, 0.4)'
          }}>
            <Truck size={24} color="#FFFFFF" style={{ animation: 'bounce 2s infinite' }} />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFFFFF'
            }}>
              CAMIONES CAÍDOS
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                Control de Flota en Campo
              </p>
              <button
                onClick={() => refreshData && refreshData()}
                title={dbStatus === 'online' ? 'Base de datos Supabase sincronizada en tiempo real' : 'Reintentar conexión con la nube'}
                style={{
                  background: dbStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: dbStatus === 'online' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: dbStatus === 'online' ? '#34D399' : '#F87171',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className={dbStatus === 'online' ? 'pulse-dot-green' : 'pulse-dot-red'} style={{ width: '6px', height: '6px' }}></span>
                {dbStatus === 'online' ? 'Nube Conectada' : 'Reconectar Nube'}
                <RefreshCw size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* Selectores de Mina, Turno y Fecha (Desktop) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="hidden-mobile">
          {/* Switcher de Mina */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <button
              onClick={() => canSelectPribbenow && setActiveMine('Pribbenow')}
              disabled={!canSelectPribbenow}
              title={!canSelectPribbenow ? `Restringido por Rol: Su sede asignada es ${user?.mine}` : 'Ver flota de Pribbenow'}
              style={{
                background: activeMine === 'Pribbenow' ? 'var(--brand-red)' : 'transparent',
                color: canSelectPribbenow ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: canSelectPribbenow ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                opacity: canSelectPribbenow ? 1 : 0.4,
                boxShadow: activeMine === 'Pribbenow' ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none'
              }}
            >
              {canSelectPribbenow ? <MapPin size={14} /> : <Lock size={13} />} Pribbenow
            </button>

            <button
              onClick={() => canSelectElDescanso && setActiveMine('El Descanso')}
              disabled={!canSelectElDescanso}
              title={!canSelectElDescanso ? `Restringido por Rol: Su sede asignada es ${user?.mine}` : 'Ver flota de El Descanso'}
              style={{
                background: activeMine === 'El Descanso' ? 'var(--brand-red)' : 'transparent',
                color: canSelectElDescanso ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: canSelectElDescanso ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                opacity: canSelectElDescanso ? 1 : 0.4,
                boxShadow: activeMine === 'El Descanso' ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none'
              }}
            >
              {canSelectElDescanso ? <MapPin size={14} /> : <Lock size={13} />} El Descanso
            </button>
          </div>

          {/* Switcher de Turno */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setActiveShift('Diurno')}
              style={{
                background: activeShift === 'Diurno' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: activeShift === 'Diurno' ? '#FBBF24' : 'rgba(255, 255, 255, 0.7)',
                border: activeShift === 'Diurno' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sun size={14} /> Diurno
            </button>
            <button
              onClick={() => setActiveShift('Nocturno')}
              style={{
                background: activeShift === 'Nocturno' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: activeShift === 'Nocturno' ? '#818CF8' : 'rgba(255, 255, 255, 0.7)',
                border: activeShift === 'Nocturno' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Moon size={14} /> Nocturno
            </button>
          </div>

          {/* Selector de Fecha */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }} title="Filtrar reporte por fecha de turno">
            <Calendar size={15} color="var(--brand-beige)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            />
            {selectedDate !== getTodayISO() && (
              <button
                onClick={() => setSelectedDate(getTodayISO())}
                title="Restablecer a la fecha de hoy"
                style={{
                  background: 'rgba(229, 46, 46, 0.25)',
                  border: '1px solid rgba(229, 46, 46, 0.4)',
                  color: '#FF6B6B',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {/* Input Oculto para Cargar Foto de Perfil del Usuario Logeado */}
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleSelfAvatarUpload}
        />

        {/* Usuario, Botón Instalar PWA y Selector de Rol */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isInstallable && (
            <button
              onClick={handleInstallPWA}
              title="Instalar aplicación en la pantalla de inicio"
              style={{
                background: 'linear-gradient(135deg, rgba(229, 46, 46, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)',
                border: '1px solid rgba(229, 46, 46, 0.5)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 12px rgba(229, 46, 46, 0.2)'
              }}
            >
              <Download size={14} color="#FBBF24" /> Instalar App
            </button>
          )}

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
              padding: '6px 12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#FFFFFF'
            }}
          >
            <div style={{ textAlign: 'left' }} className="hidden-mobile">
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--brand-beige)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={10} /> {user.role}
              </div>
            </div>
            <ChevronDown size={16} color="rgba(255,255,255,0.7)" />
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
                  marginBottom: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                <Camera size={16} color="var(--brand-beige)" /> Cambiar Foto de Perfil
              </button>

              <div style={{ padding: '4px 10px 8px 10px', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                Cambiar Rol / Usuario
              </div>
              {preseededUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchUser(u.id);
                    setShowRoleMenu(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: user && user.id === u.id ? 'rgba(229, 46, 46, 0.2)' : 'transparent',
                    border: user && user.id === u.id ? '1px solid rgba(229, 46, 46, 0.4)' : 'none',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '4px'
                  }}
                >
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} color="#FFFFFF" />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--brand-beige)' }}>{u.role} - {u.mine}</div>
                  </div>
                </button>
              ))}

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
      </div>

      {/* Tira de Filtros Móvil (Mina, Turno, Fecha) - Solo visible en el Dashboard principal */}
      {activeTab === 'dashboard' && (
        <div
          className="mobile-only"
          style={{
            width: '100%',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
        {/* Switcher de Mina (Abreviado: PB / ED) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: '10px',
          border: 'var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button
            onClick={() => canSelectPribbenow && setActiveMine('Pribbenow')}
            disabled={!canSelectPribbenow}
            title="Pribbenow (PB)"
            style={{
              background: activeMine === 'Pribbenow' ? 'var(--brand-red)' : 'transparent',
              color: canSelectPribbenow ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: canSelectPribbenow ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {canSelectPribbenow ? <MapPin size={12} /> : <Lock size={12} />} PB
          </button>
          <button
            onClick={() => canSelectElDescanso && setActiveMine('El Descanso')}
            disabled={!canSelectElDescanso}
            title="El Descanso (ED)"
            style={{
              background: activeMine === 'El Descanso' ? 'var(--brand-red)' : 'transparent',
              color: canSelectElDescanso ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: canSelectElDescanso ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {canSelectElDescanso ? <MapPin size={12} /> : <Lock size={12} />} ED
          </button>
        </div>

        {/* Switcher de Turno (Abreviado: D / N) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: '10px',
          border: 'var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveShift('Diurno')}
            title="Turno Diurno (06:00 - 17:59)"
            style={{
              background: activeShift === 'Diurno' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
              color: activeShift === 'Diurno' ? '#FBBF24' : 'rgba(255, 255, 255, 0.7)',
              border: activeShift === 'Diurno' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
              padding: '4px 8px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sun size={12} /> D
          </button>
          <button
            onClick={() => setActiveShift('Nocturno')}
            title="Turno Nocturno (18:00 - 05:59)"
            style={{
              background: activeShift === 'Nocturno' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeShift === 'Nocturno' ? '#818CF8' : 'rgba(255, 255, 255, 0.7)',
              border: activeShift === 'Nocturno' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
              padding: '4px 8px',
              borderRadius: '7px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Moon size={12} /> N
          </button>
        </div>

        {/* Selector de Fecha */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px 8px',
          borderRadius: '10px',
          border: 'var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0
        }}>
          <Calendar size={13} color="var(--brand-beige)" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
              width: '110px'
            }}
          />
          {selectedDate !== getTodayISO() && (
            <button
              onClick={() => setSelectedDate(getTodayISO())}
              style={{
                background: 'rgba(229, 46, 46, 0.25)',
                border: '1px solid rgba(229, 46, 46, 0.4)',
                color: '#FF6B6B',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>
    )}
  </header>
  );
}
