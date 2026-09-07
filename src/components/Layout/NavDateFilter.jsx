import React from 'react';
import { Calendar } from 'lucide-react';

export default function NavDateFilter({
  variant = 'desktop',
  selectedDate,
  setSelectedDate,
  getTodayISO
}) {
  const isMobile = variant === 'mobile';

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '3px 8px',
        borderRadius: isMobile ? '10px' : '12px',
        border: 'var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '4px' : '5px',
        flexShrink: 0
      }}
      title={isMobile ? undefined : 'Filtrar reporte por fecha de turno'}
    >
      <Calendar size={isMobile ? 13 : 14} color="var(--brand-beige)" />
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className={isMobile ? undefined : 'nav-date-input'}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#FFFFFF',
          fontSize: isMobile ? '0.75rem' : '0.78rem',
          fontWeight: 600,
          outline: 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
          width: isMobile ? '110px' : undefined
        }}
      />
      {selectedDate !== getTodayISO() && (
        <button
          onClick={() => setSelectedDate(getTodayISO())}
          title={isMobile ? undefined : 'Restablecer a la fecha de hoy'}
          style={{
            background: 'rgba(229, 46, 46, 0.25)',
            border: '1px solid rgba(229, 46, 46, 0.4)',
            color: '#FF6B6B',
            fontSize: isMobile ? '0.68rem' : '0.70rem',
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
  );
}
