import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Truck,
  Sun,
  Moon,
  Users,
  Clock,
  WarningCircle,
  ArrowSquareOut,
  Wrench,
  CheckCircle,
  Warning
} from '@phosphor-icons/react';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatDetailDate = (dateStr) => {
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

export default function NotificationDetail({
  notification,
  isOpen,
  onClose,
  onNavigateToDashboard
}) {
  // Manejo de scroll de fondo y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !notification) return null;

  const eventType = notification.event_type || 'shift_alert';
  const isShiftAlert = eventType === 'shift_alert';
  const isNewReport = eventType === 'new_report';
  const isStatusChange = eventType === 'status_change';

  const metadata = notification.metadata || {};
  const truckCount = notification.truck_count || 0;
  const truckList = Array.isArray(notification.truck_ids) ? notification.truck_ids : [];
  const primaryTruckId = metadata.truck_id || truckList[0] || '';
  const shift = notification.shift || 'Diurno';
  const group = notification.group_name || 'Grupo';
  const dateFormatted = formatDetailDate(notification.operational_date || (notification.created_at ? notification.created_at.split('T')[0] : ''));
  const timeFormatted = !isShiftAlert
    ? formatTimeFromIso(notification.created_at)
    : (notification.evaluation_moment || '06:30');
  const isDiurno = shift === 'Diurno';

  // Subtítulo superior de categoría
  let categoryLabel = 'Alerta de Cambio de Turno';
  let categoryColor = 'var(--brand-red, #E52E2E)';
  if (isNewReport) {
    categoryLabel = 'Nuevo Reporte de Camión';
    categoryColor = '#F59E0B';
  } else if (isStatusChange) {
    categoryLabel = 'Cambio de Estado de Camión';
    categoryColor = metadata.new_status === 'OPERATIVO' ? '#10B981' : 'var(--brand-red, #E52E2E)';
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-detail-title"
    >
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative'
        }}
      >
        {/* Cabecera del Modal */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}>
          <div>
            <span style={{
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: categoryColor,
              fontWeight: 800
            }}>
              {categoryLabel}
            </span>
            <h3
              id="notification-detail-title"
              style={{
                margin: '4px 0 0 0',
                fontFamily: 'var(--font-heading, sans-serif)',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#FFFFFF'
              }}
            >
              {notification.title || `Notificación — ${notification.mine}`}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de notificación"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; }}
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Insignias de Turno y Grupo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: isDiurno ? 'rgba(245, 158, 11, 0.12)' : 'rgba(96, 165, 250, 0.12)',
            border: isDiurno ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(96, 165, 250, 0.3)',
            color: isDiurno ? '#FBBF24' : '#93C5FD',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            {isDiurno ? (
              <Sun size={16} weight="duotone" />
            ) : (
              <Moon size={16} weight="duotone" />
            )}
            <span>Turno {shift}</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            <Users size={16} weight="duotone" />
            <span>{group}</span>
          </div>

          {primaryTruckId && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              <Truck size={16} weight="duotone" color="var(--brand-red, #E52E2E)" />
              <span>Camión {primaryTruckId}</span>
            </div>
          )}
        </div>

        {/* Bloque Central según Tipo de Evento */}
        {isShiftAlert ? (
          /* shift_alert: Banner y lista de camiones */
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 59, 48, 0.12)',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              color: '#FF6B6B'
            }}>
              <WarningCircle size={24} weight="fill" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {truckCount} {truckCount === 1 ? 'camión DOWN en campo' : 'camiones DOWN en campo'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '2px' }}>
                  Reportados en estado DOWN al corte del cambio de turno.
                </div>
              </div>
            </div>

            {truckList.length > 0 && (
              <div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Camiones identificados:
                </span>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}>
                  {truckList.map((id) => (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: '#FFFFFF'
                      }}
                    >
                      <Truck size={16} weight="duotone" color="var(--brand-red, #E52E2E)" />
                      <span>{id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : isNewReport ? (
          /* new_report: Detalle estructurado de registro */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', fontWeight: 700, fontSize: '0.92rem' }}>
              <Wrench size={18} weight="duotone" />
              <span>Reporte de Falla Operativa</span>
            </div>
            {notification.message && (
              <div style={{
                fontSize: '0.88rem',
                color: '#FFFFFF',
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '10px 12px',
                borderRadius: '8px',
                borderLeft: '3px solid #F59E0B'
              }}>
                {notification.message}
              </div>
            )}
            {metadata.actor_name && (
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Registrado por: <strong style={{ color: '#FFFFFF' }}>{metadata.actor_name}</strong>
              </div>
            )}
          </div>
        ) : (
          /* status_change: Detalle de transición de estado */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: metadata.new_status === 'OPERATIVO' ? '#10B981' : '#F87171',
              fontWeight: 700,
              fontSize: '0.92rem'
            }}>
              {metadata.new_status === 'OPERATIVO' ? (
                <CheckCircle size={18} weight="fill" />
              ) : (
                <Warning size={18} weight="fill" />
              )}
              <span>Transición a estado {metadata.new_status || 'actualizado'}</span>
            </div>
            {notification.message && (
              <div style={{
                fontSize: '0.88rem',
                color: '#FFFFFF',
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '10px 12px',
                borderRadius: '8px',
                borderLeft: metadata.new_status === 'OPERATIVO' ? '3px solid #10B981' : '3px solid #EF4444'
              }}>
                {notification.message}
              </div>
            )}
            {metadata.actor_name && (
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Acción ejecutada por: <strong style={{ color: '#FFFFFF' }}>{metadata.actor_name}</strong>
              </div>
            )}
          </div>
        )}

        {/* Momento y Nota */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.76rem',
          color: 'rgba(255, 255, 255, 0.55)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} weight="regular" />
            <span>{isShiftAlert ? 'Evaluación' : 'Registro'}: {timeFormatted} COT · {dateFormatted}</span>
          </div>
          <div style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.45)' }}>
            {isShiftAlert
              ? '* Esta notificación refleja el corte automático al inicio del turno. Consulte el Dashboard para el estado operativo en vivo.'
              : '* Evento operacional registrado en tiempo real.'}
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          marginTop: '6px'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={() => onNavigateToDashboard(notification)}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowSquareOut size={16} weight="bold" />
            <span>{isShiftAlert ? 'Ver camiones en Dashboard' : 'Ver camión en Dashboard'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
