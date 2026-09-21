import React from 'react';
import { ClockCounterClockwise, X, FileText } from '@phosphor-icons/react';
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
      <div className="truck-history-header-top">
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
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ClockCounterClockwise size={22} weight="duotone" />
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
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}>
          <X size={22} weight="bold" />
        </button>
      </div>

      {/* Buscador de Camión con Texto Animado en Marquesina + Botón Exportar PDF */}
      <div className="truck-history-toolbar">
        <div className="truck-history-search">
          <AnimatedSearchInput
            value={searchTruckId}
            onChange={onSearchChange}
            placeholderText="📢 Ingrese el Número del Camión para consultar su historial completo (ej: 2014)..."
          />
        </div>

        {hasHistory && (
          <button
            onClick={onExportPDF}
            className="btn-primary truck-history-pdf-btn"
            title="Exportar Historial a PDF"
          >
            <FileText size={16} weight="duotone" />
            <span>Exportar PDF</span>
          </button>
        )}
      </div>

      {/* KPIs Resumen del Camión */}
      {currentTruckId && (
        <div className="truck-history-kpis">
          <div className="glass-card truck-history-kpi-card kpi-total">
            <span className="truck-history-kpi-label" title="TOTAL REGISTROS">TOTAL REGISTROS</span>
            <h4 className="truck-history-kpi-value">
              {totalEvents}
            </h4>
          </div>

          <div className="glass-card truck-history-kpi-card kpi-down">
            <span className="truck-history-kpi-label" title="EVENTOS DOWN">EVENTOS DOWN</span>
            <h4 className="truck-history-kpi-value kpi-val-down">
              {downEvents}
            </h4>
          </div>

          <div className="glass-card truck-history-kpi-card kpi-resolved">
            <span className="truck-history-kpi-label" title="RECUPERADOS">RECUPERADOS</span>
            <h4 className="truck-history-kpi-value kpi-val-resolved">
              {resolvedEvents}
            </h4>
          </div>

          <div className="glass-card truck-history-kpi-card kpi-system">
            <span className="truck-history-kpi-label" title="SISTEMA MÁS AFECTADO">SISTEMA MÁS AFECTADO</span>
            <h4
              className="truck-history-kpi-value kpi-val-system"
              title={mostFrequentSystem}
            >
              {mostFrequentSystem}
            </h4>
          </div>
        </div>
      )}
    </>
  );
}
