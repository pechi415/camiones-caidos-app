import React from 'react';
import { History, X, FileText } from 'lucide-react';
import AnimatedSearchInput from '../../Common/AnimatedSearchInput';

export default function TruckHistoryHeader({
  onClose,
  searchTruckId,
  onSearchChange,
  currentTruckId,
  hasHistory,
  onExportPDF,
  totalEvents,
  downEvents,
  resolvedEvents,
  mostFrequentSystem
}) {
  return (
    <>
      {/* Encabezado Modal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: 'var(--glass-border)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#FACC15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <History size={22} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
              Historial de Novedades del Equipo
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Auditoría histórica de fallas y tiempos de reparación por camión
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          <X size={22} />
        </button>
      </div>

      {/* Buscador de Camión con Texto Animado en Marquesina + Botón Exportar PDF */}
      <div style={{ display: 'grid', gridTemplateColumns: hasHistory ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '18px', width: '100%' }}>
        <AnimatedSearchInput
          value={searchTruckId}
          onChange={onSearchChange}
          placeholderText="📢 Ingrese el Número del Camión para consultar su historial completo (ej: 2014)..."
        />

        {hasHistory && (
          <button
            onClick={onExportPDF}
            className="btn-primary"
            style={{
              height: '40px',
              width: '100%',
              padding: '0 16px',
              fontSize: '0.84rem',
              background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
              color: '#000000',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={16} /> Exportar PDF
          </button>
        )}
      </div>

      {/* KPIs Resumen del Camión */}
      {currentTruckId && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div className="glass-card" style={{ padding: '14px', borderLeft: '3px solid var(--brand-beige)' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>TOTAL REGISTROS</span>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
              {totalEvents}
            </h4>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderLeft: '3px solid var(--status-down)' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>EVENTOS DOWN</span>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-down)', marginTop: '2px' }}>
              {downEvents}
            </h4>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderLeft: '3px solid var(--status-operativo)' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>RECUPERADOS</span>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-operativo)', marginTop: '2px' }}>
              {resolvedEvents}
            </h4>
          </div>

          <div className="glass-card" style={{ padding: '14px', borderLeft: '3px solid #FACC15' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>SISTEMA MÁS AFECTADO</span>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#FACC15', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {mostFrequentSystem}
            </h4>
          </div>
        </div>
      )}
    </>
  );
}
