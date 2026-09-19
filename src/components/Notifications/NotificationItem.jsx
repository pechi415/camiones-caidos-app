import React from 'react';
import { Truck, Clock, CalendarBlank, Wrench, CheckCircle, Warning } from '@phosphor-icons/react';

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

const formatTimeFromIso = (isoStr) => {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function NotificationItem({ notification, onSelect }) {
  if (!notification) return null;

  const isUnread = !notification.is_read;
  const eventType = notification.event_type || 'shift_alert';
  const isOperational = eventType === 'new_report' || eventType === 'status_change';

  const shiftText = notification.shift ? `Turno ${notification.shift}` : 'Turno Operativo';
  const groupText = notification.group_name || 'Grupo';
  const dateFormatted = formatDisplayDate(notification.operational_date || (notification.created_at ? notification.created_at.split('T')[0] : ''));
  const timeFormatted = isOperational
    ? formatTimeFromIso(notification.created_at)
    : (notification.evaluation_moment || '06:30');

  // Datos para shift_alert
  const truckCount = notification.truck_count || 0;
  const truckSummaryText = `${truckCount} ${truckCount === 1 ? 'camión DOWN en campo' : 'camiones DOWN en campo'}`;

  // Datos para operational
  const metadata = notification.metadata || {};
  const truckId = metadata.truck_id || (notification.truck_ids && notification.truck_ids[0]) || '';
  const newStatus = metadata.new_status || '';

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
          {notification.title || (isOperational ? 'Novedad operacional' : `Cambio de turno — ${notification.mine}`)}
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

      {/* Contenido según tipo de evento */}
      {!isOperational ? (
        /* shift_alert */
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
      ) : eventType === 'new_report' ? (
        /* new_report */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          fontSize: '0.8rem',
          color: '#FFFFFF',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '6px 10px',
          borderRadius: '6px',
          borderLeft: '3px solid var(--brand-red, #E52E2E)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Wrench size={14} weight="duotone" color="var(--brand-red, #E52E2E)" />
            <span>Camión {truckId}</span>
          </div>
          {notification.message && (
            <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.75)', whiteSpace: 'pre-line' }}>
              {notification.message}
            </div>
          )}
        </div>
      ) : (
        /* status_change */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          borderRadius: '6px',
          background: newStatus === 'OPERATIVO' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: newStatus === 'OPERATIVO' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: newStatus === 'OPERATIVO' ? '#10B981' : '#F87171',
          fontSize: '0.78rem',
          fontWeight: 600,
          width: 'fit-content',
          marginTop: '2px'
        }}>
          {newStatus === 'OPERATIVO' ? (
            <CheckCircle size={14} weight="bold" />
          ) : (
            <Warning size={14} weight="bold" />
          )}
          <span>{notification.message || `Camión ${truckId} · ${newStatus}`}</span>
        </div>
      )}

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
