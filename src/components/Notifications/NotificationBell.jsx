import React from 'react';
import { Bell, BellRinging } from '@phosphor-icons/react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isPanelOpen,
    hasNewAlert,
    togglePanel,
    closePanel,
    markAllAsRead,
    openNotificationDetail,
    refreshNotifications
  } = useNotifications();

  const badgeText = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Estilo para microanimación de pulso en la campana */}
      <style>{`
        @keyframes bellPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.22) rotate(-8deg); }
          100% { transform: scale(1); }
        }
        .bell-animated-pulse {
          animation: bellPulse 300ms ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .bell-animated-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Botón de la Campana */}
      <button
        id="notification-bell-btn"
        type="button"
        onClick={togglePanel}
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} no leídas)` : 'Notificaciones'}
        aria-expanded={isPanelOpen}
        aria-haspopup="true"
        className="glass-card"
        style={{
          width: '40px',
          height: '40px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: isPanelOpen ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
          border: isPanelOpen ? '1px solid rgba(255, 255, 255, 0.25)' : 'var(--glass-border)',
          color: unreadCount > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          if (!isPanelOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = unreadCount > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)';
          }
        }}
      >
        <span className={hasNewAlert ? 'bell-animated-pulse' : ''} style={{ display: 'flex', alignItems: 'center' }}>
          {unreadCount > 0 ? (
            <BellRinging size={20} weight="fill" color={isPanelOpen ? 'var(--brand-red, #E52E2E)' : '#FFFFFF'} />
          ) : (
            <Bell size={20} weight="regular" />
          )}
        </span>

        {/* Badge contador de no leídas */}
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '9px',
              backgroundColor: 'var(--brand-red, #E52E2E)',
              color: '#FFFFFF',
              fontSize: '0.68rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(229, 46, 46, 0.7)',
              border: '1.5px solid #12161F',
              lineHeight: 1,
              boxSizing: 'border-box'
            }}
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Desplegable de Notificaciones */}
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        onMarkAllAsRead={markAllAsRead}
        onSelectNotification={openNotificationDetail}
        onRetry={refreshNotifications}
      />
    </div>
  );
}
