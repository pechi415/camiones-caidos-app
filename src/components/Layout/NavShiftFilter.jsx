import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function NavShiftFilter({
  variant = 'desktop',
  activeShift,
  setActiveShift
}) {
  const isMobile = variant === 'mobile';

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
      {/* Turno Diurno */}
      <button
        onClick={() => setActiveShift('Diurno')}
        title={isMobile ? 'Turno Diurno (06:00 - 17:59)' : 'Turno Diurno (D)'}
        style={{
          background: activeShift === 'Diurno' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
          color: activeShift === 'Diurno' ? '#FBBF24' : 'rgba(255, 255, 255, 0.7)',
          border: activeShift === 'Diurno' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
          padding: isMobile ? '4px 8px' : '5px 9px',
          borderRadius: isMobile ? '7px' : '8px',
          fontWeight: isMobile ? 800 : 600,
          fontSize: '0.78rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        <Sun size={isMobile ? 12 : 14} />
        {isMobile ? ' D' : <span className="nav-filter-text"> Diurno</span>}
      </button>

      {/* Turno Nocturno */}
      <button
        onClick={() => setActiveShift('Nocturno')}
        title={isMobile ? 'Turno Nocturno (18:00 - 05:59)' : 'Turno Nocturno (N)'}
        style={{
          background: activeShift === 'Nocturno' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
          color: activeShift === 'Nocturno' ? '#818CF8' : 'rgba(255, 255, 255, 0.7)',
          border: activeShift === 'Nocturno' ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
          padding: isMobile ? '4px 8px' : '5px 9px',
          borderRadius: isMobile ? '7px' : '8px',
          fontWeight: isMobile ? 800 : 600,
          fontSize: '0.78rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        <Moon size={isMobile ? 12 : 14} />
        {isMobile ? ' N' : <span className="nav-filter-text"> Nocturno</span>}
      </button>
    </div>
  );
}
