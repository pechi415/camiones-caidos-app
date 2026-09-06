import React from 'react';
import { Truck, RefreshCw } from 'lucide-react';

export default function NavBrand({ isAdmin, dbStatus, refreshData }) {
  return (
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
  );
}
