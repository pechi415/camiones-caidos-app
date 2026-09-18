import React, { useEffect, useRef } from 'react';
import { Bell, BellSlash, Checks, X, WarningCircle } from '@phosphor-icons/react';
import NotificationItem from './NotificationItem';

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  error,
  onMarkAllAsRead,
  onSelectNotification,
  onRetry
}) {
  const panelRef = useRef(null);

  // Cierre al presionar tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cierre al hacer clic fuera del panel
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Ignorar clics en el botón de la campana (para evitar parpadeo toggle)
        const bellBtn = document.getElementById('notification-bell-btn');
        if (bellBtn && bellBtn.contains(e.target)) {
          return;
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="glass-panel notification-panel-dropdown"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface-elevated, rgba(24, 28, 40, 0.96))',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: 'var(--glass-border, 1px solid rgba(255, 255, 255, 0.1))',
        borderRadius: '16px',
        boxShadow: 'var(--glass-shadow-lg, 0 16px 48px 0 rgba(0, 0, 0, 0.6))',
        overflow: 'hidden',
        animation: 'panelSlideDown 150ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <style>{`
        @keyframes panelSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .notification-panel-dropdown {
          width: 380px;
          max-height: 480px;
        }
        @media (max-width: 767px) {
          .notification-panel-dropdown {
            position: fixed !important;
            top: 68px !important;
            left: 16px !important;
            right: 16px !important;
            width: calc(100vw - 32px) !important;
            max-height: 60vh !important;
            margin: 0 auto !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .notification-panel-dropdown {
            animation: none !important;
          }
        }
      `}</style>

      {/* Cabecera del Panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} weight="duotone" color="var(--brand-red, #E52E2E)" />
          <h3 style={{
            margin: 0,
            fontFamily: 'var(--font-heading, sans-serif)',
            fontSize: '0.98rem',
            fontWeight: 700,
            color: '#FFFFFF'
          }}>
            Notificaciones
          </h3>
          {unreadCount > 0 && (
            <span style={{
              background: 'rgba(229, 46, 46, 0.2)',
              color: 'var(--brand-red, #E52E2E)',
              border: '1px solid rgba(229, 46, 46, 0.4)',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '10px'
            }}>
              {unreadCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              title="Marcar todas como leídas"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.65)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Checks size={16} weight="bold" />
              <span>Marcar leídas</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de notificaciones"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.55)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)'; }}
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Contenido / Lista de Notificaciones */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        overscrollBehavior: 'contain'
      }}>
        {loading && notifications.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.84rem'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: 'var(--brand-red, #E52E2E)',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '10px'
            }} />
            <span>Cargando notificaciones...</span>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px 16px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <WarningCircle size={32} weight="duotone" color="#F59E0B" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.82rem', margin: '0 0 10px 0' }}>No fue posible cargar las notificaciones.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-glass"
                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
              >
                Reintentar
              </button>
            )}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            textAlign: 'center'
          }}>
            <BellSlash size={36} weight="duotone" color="rgba(255, 255, 255, 0.3)" style={{ marginBottom: '10px' }} />
            <span style={{
              fontFamily: 'var(--font-heading, sans-serif)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.85)',
              marginBottom: '4px'
            }}>
              No tienes notificaciones
            </span>
            <p style={{
              fontSize: '0.76rem',
              color: 'rgba(255, 255, 255, 0.45)',
              margin: 0,
              maxWidth: '240px',
              lineHeight: 1.3
            }}>
              Las alertas de cambio de turno aparecerán aquí.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onSelect={onSelectNotification}
            />
          ))
        )}
      </div>

      {/* Pie informativo sutil */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.70rem',
        color: 'rgba(255, 255, 255, 0.35)',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        Alertas automáticas de cambio de turno · 06:30 y 18:30 COT
      </div>
    </div>
  );
}
