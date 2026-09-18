import React from 'react';
import { Truck, Clock, CalendarBlank } from '@phosphor-icons/react';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const month = MONTH_NAMES[monthIndex] || parts[1];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
};

export default function NotificationItem({ notification, onSelect }) {
  if (!notification) return null;

  const isUnread = !notification.is_read;
  const truckCount = notification.truck_count || 0;
  const truckSummaryText = `${truckCount} ${truckCount === 1 ? 'camión DOWN en campo' : 'camiones DOWN en campo'}`;
  const shiftText = notification.shift ? `Turno ${notification.shift}` : 'Turno Operativo';
  const groupText = notification.group_name || 'Grupo';
  const dateFormatted = formatDisplayDate(notification.operational_date);
  const timeFormatted = notification.evaluation_moment || '06:30';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(notification);
        }
      }}
      className="glass-card"
      style={{
        padding: '12px 14px',
        marginBottom: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isUnread ? 'rgba(229, 46, 46, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: isUnread ? '1px solid rgba(229, 46, 46, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
        borderLeft: isUnread ? '3px solid var(--brand-red, #E52E2E)' : '1px solid rgba(255, 255, 255, 0.06)'
      }}
    >
      {/* Cabecera de la Tarjeta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--font-heading, sans-serif)',
          fontSize: '0.88rem',
          fontWeight: 700,
          color: isUnread ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)'
        }}>
          {notification.title || `Cambio de turno — ${notification.mine}`}
        </span>

        {isUnread && (
          <span
            title="No leída"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-red, #E52E2E)',
              boxShadow: '0 0 8px rgba(229, 46, 46, 0.8)',
              flexShrink: 0
            }}
          />
        )}
      </div>

      {/* Turno y Grupo */}
      <div style={{
        fontSize: '0.78rem',
        color: 'rgba(255, 255, 255, 0.65)',
        fontWeight: 500
      }}>
        {shiftText} · {groupText}
      </div>

      {/* Resumen de Camiones DOWN en campo */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '6px',
        background: 'rgba(255, 59, 48, 0.12)',
        border: '1px solid rgba(255, 59, 48, 0.25)',
        color: '#FF6B6B',
        fontSize: '0.78rem',
        fontWeight: 600,
        width: 'fit-content',
        marginTop: '2px'
      }}>
        <Truck size={14} weight="bold" />
        <span>{truckSummaryText}</span>
      </div>

      {/* Pie con Hora y Fecha */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'rgba(255, 255, 255, 0.45)',
        marginTop: '2px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} weight="regular" />
          {timeFormatted}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CalendarBlank size={12} weight="regular" />
          {dateFormatted}
        </span>
      </div>
    </div>
  );
}
