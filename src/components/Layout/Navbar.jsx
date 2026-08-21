import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { Truck, Sun, Moon, MapPin, User, ChevronDown, LogOut, Lock, Calendar, Camera, RefreshCw } from 'lucide-react';

export default function Navbar({ onOpenNewReport, activeTab, setActiveTab }) {
  const { user, isAdmin, logout, activeMine, setActiveMine, activeShift, setActiveShift, selectedDate, setSelectedDate, getTodayISO, updateUserAvatar } = useAuth();
  const { dbStatus, refreshData } = useReports();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const avatarInputRef = useRef(null);

  const canSelectPribbenow = isAdmin || user?.mine === 'Pribbenow';
  const canSelectElDescanso = isAdmin || user?.mine === 'El Descanso';

  const handleSelfAvatarUpload = (e) => {
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
        if (user && user.id && updateUserAvatar) {
          updateUserAvatar(user.id, compressed);
        }
      };
      img.src = event.target.result;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
        {/* Brand Identity (Lado Izquierdo) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #E52E2E 0%, #991B1B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px rgba(229, 46, 46, 0.4)',
            flexShrink: 0
          }}>
            <Truck size={22} color="#FFFFFF" style={{ animation: 'bounce 2s infinite' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.12rem',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.15
            }}>
              CAMIONES CAÍDOS
            </h1>
            <p style={{ fontSize: '0.70rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: '1px' }}>
              Control de Flota en Campo
            </p>
            {/* Botón de Nube Conectada DEBAJO del Subtítulo (Solo Admin) */}
            {isAdmin && (
              <div style={{ marginTop: '3px' }}>
                <button
                  onClick={() => refreshData && refreshData()}
                  title={dbStatus === 'online' ? 'Base de datos Supabase sincronizada en tiempo real' : 'Reintentar conexión con la nube'}
                  style={{
                    background: dbStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: dbStatus === 'online' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: dbStatus === 'online' ? '#34D399' : '#F87171',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className={dbStatus === 'online' ? 'pulse-dot-green' : 'pulse-dot-red'} style={{ width: '5px', height: '5px' }}></span>
                  {dbStatus === 'online' ? 'Nube Conectada' : 'Reconectar Nube'}
                  <RefreshCw size={9} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selectores de Mina, Turno y Fecha (Desktop y Tablet - Centrados en 1 sola fila) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'nowrap', flex: 1 }} className="hidden-mobile nav-center-filters">
          {/* Switcher de Mina */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <button
              onClick={() => canSelectPribbenow && setActiveMine('Pribbenow')}
              disabled={!canSelectPribbenow}
              title={!canSelectPribbenow ? `Restringido por Rol: Su sede asignada es ${user?.mine}` : 'Mina Pribbenow (PB)'}
              style={{
                background: activeMine === 'Pribbenow' ? 'var(--brand-red)' : 'transparent',
                color: canSelectPribbenow ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: '5px 9px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: canSelectPribbenow ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                opacity: canSelectPribbenow ? 1 : 0.4,
                boxShadow: activeMine === 'Pribbenow' ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {canSelectPribbenow ? <MapPin size={13} /> : <Lock size={12} />}
              <span className="nav-filter-text"> Pribbenow</span>
              <span className="nav-filter-short"> PB</span>
            </button>

            <button
              onClick={() => canSelectElDescanso && setActiveMine('El Descanso')}
              disabled={!canSelectElDescanso}
              title={!canSelectElDescanso ? `Restringido por Rol: Su sede asignada es ${user?.mine}` : 'Mina El Descanso (ED)'}
              style={{
                background: activeMine === 'El Descanso' ? 'var(--brand-red)' : 'transparent',
                color: canSelectElDescanso ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                border: 'none',
                padding: '5px 9px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: canSelectElDescanso ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                opacity: canSelectElDescanso ? 1 : 0.4,
                boxShadow: activeMine === 'El Descanso' ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {canSelectElDescanso ? <MapPin size={13} /> : <Lock size={12} />}
              <span className="nav-filter-text"> El Descanso</span>
              <span className="nav-filter-short"> ED</span>
            </button>
          </div>

          {/* Switcher de Turno */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <button
              onClick={() => setActiveShift('Diurno')}
              title="Turno Diurno (D)"
              style={{
                background: activeShift === 'Diurno' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: activeShift === 'Diurno' ? '#FBBF24' : 'rgba(255, 255, 255, 0.7)',
                border: activeShift === 'Diurno' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                padding: '5px 9px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <Sun size={14} />
              <span className="nav-filter-text"> Diurno</span>
            </button>
            <button
              onClick={() => setActiveShift('Nocturno')}
              title="Turno Nocturno (N)"
              style={{
                background: activeShift === 'Nocturno' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: activeShift === 'Nocturno' ? '#818CF8' : 'rgba(255, 255, 255, 0.7)',
                border: activeShift === 'Nocturno' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                padding: '5px 9px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <Moon size={14} />
              <span className="nav-filter-text"> Nocturno</span>
            </button>
          </div>

          {/* Selector de Fecha */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px 8px',
            borderRadius: '12px',
            border: 'var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flexShrink: 0
          }} title="Filtrar reporte por fecha de turno">
            <Calendar size={14} color="var(--brand-beige)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="nav-date-input"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.78rem',
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
                  fontSize: '0.70rem',
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
            <div style={{ textAlign: 'left' }} className="user-profile-info">
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>{user.name}</div>
              {/* Muestra Mina y Grupo en lugar del Rol */}
              <div style={{ fontSize: '0.68rem', color: 'var(--brand-beige)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={10} /> {user?.mine || 'Pribbenow'} - {user?.group || 'Grupo 1'}
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
      </div>

      {/* Tira de Filtros Móvil (Mina, Turno, Fecha) - Solo visible en teléfonos móviles */}
      {activeTab === 'dashboard' && (
        <div
          className="mobile-only"
          style={{
            width: '100%',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
