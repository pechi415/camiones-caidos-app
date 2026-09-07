import React from 'react';
import { MapPin, Lock } from 'lucide-react';

export default function NavMineFilter({
  variant = 'desktop',
  activeMine,
  setActiveMine,
  canSelectPribbenow,
  canSelectElDescanso,
  userMine
}) {
  const isMobile = variant === 'mobile';

  const pbTitle = isMobile
    ? 'Pribbenow (PB)'
    : (!canSelectPribbenow ? `Restringido por Rol: Su sede asignada es ${userMine}` : 'Mina Pribbenow (PB)');

  const edTitle = isMobile
    ? 'El Descanso (ED)'
    : (!canSelectElDescanso ? `Restringido por Rol: Su sede asignada es ${userMine}` : 'Mina El Descanso (ED)');

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      padding: '3px',
      borderRadius: isMobile ? '10px' : '12px',
      border: 'var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0
    }}>
      {/* Botón Pribbenow */}
      <button
        onClick={() => canSelectPribbenow && setActiveMine('Pribbenow')}
        disabled={!canSelectPribbenow}
        title={pbTitle}
        style={{
          background: activeMine === 'Pribbenow' ? 'var(--brand-red)' : 'transparent',
          color: canSelectPribbenow ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          border: 'none',
          padding: isMobile ? '4px 10px' : '5px 9px',
          borderRadius: isMobile ? '7px' : '8px',
          fontWeight: isMobile ? 800 : 700,
          fontSize: '0.78rem',
          cursor: canSelectPribbenow ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: isMobile ? undefined : 'all 0.2s ease',
          opacity: isMobile ? undefined : (canSelectPribbenow ? 1 : 0.4),
          boxShadow: (!isMobile && activeMine === 'Pribbenow') ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none',
          whiteSpace: 'nowrap'
        }}
      >
        {canSelectPribbenow ? <MapPin size={isMobile ? 12 : 13} /> : <Lock size={12} />}
        {isMobile ? (
          ' PB'
        ) : (
          <>
            <span className="nav-filter-text"> Pribbenow</span>
            <span className="nav-filter-short"> PB</span>
          </>
        )}
      </button>

      {/* Botón El Descanso */}
      <button
        onClick={() => canSelectElDescanso && setActiveMine('El Descanso')}
        disabled={!canSelectElDescanso}
        title={edTitle}
        style={{
          background: activeMine === 'El Descanso' ? 'var(--brand-red)' : 'transparent',
          color: canSelectElDescanso ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          border: 'none',
          padding: isMobile ? '4px 10px' : '5px 9px',
          borderRadius: isMobile ? '7px' : '8px',
          fontWeight: isMobile ? 800 : 700,
          fontSize: '0.78rem',
          cursor: canSelectElDescanso ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: isMobile ? undefined : 'all 0.2s ease',
          opacity: isMobile ? undefined : (canSelectElDescanso ? 1 : 0.4),
          boxShadow: (!isMobile && activeMine === 'El Descanso') ? '0 0 12px rgba(229, 46, 46, 0.4)' : 'none',
          whiteSpace: 'nowrap'
        }}
      >
        {canSelectElDescanso ? <MapPin size={isMobile ? 12 : 13} /> : <Lock size={12} />}
        {isMobile ? (
          ' ED'
        ) : (
          <>
            <span className="nav-filter-text"> El Descanso</span>
            <span className="nav-filter-short"> ED</span>
          </>
        )}
      </button>
    </div>
  );
}
