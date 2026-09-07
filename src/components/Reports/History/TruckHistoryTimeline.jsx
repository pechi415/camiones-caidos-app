import React from 'react';
import { Wrench, Truck, Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function TruckHistoryTimeline({
  truckHistory = [],
  currentTruckId,
  getItemDate
}) {
  return (
    <>
      {/* Lista de Registros Históricos con Scroll Vertical Dedicado */}
      {truckHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <Wrench size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {currentTruckId ? `No se encontraron registros de fallas para el Camión ${currentTruckId}.` : 'Ingrese un número de camión para consultar su historial.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '6px' }}>
          {truckHistory.map(item => (
            <div key={item.id} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: 'var(--glass-border)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Cabecera del Registro */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    color: 'var(--brand-beige)',
                    background: 'rgba(229, 213, 188, 0.12)',
                    border: '1px solid rgba(229, 213, 188, 0.3)',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <Truck size={14} color="var(--brand-red)" /> {item.truckId}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="var(--brand-beige)" /> {getItemDate(item)}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="var(--brand-beige)" /> {item.reportTime}
                  </span>

                  <span style={{ fontSize: '0.75rem', background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '2px 7px', borderRadius: '5px', fontWeight: 700 }}>
                    📍 {item.mine} • Turno {item.shift}
                  </span>
                </div>
              </div>

              {/* Grilla de Metadatos Organizados */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '0.83rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '2px' }}>👤 OPERADOR</div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.operatorName}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '2px' }}>⚙️ SISTEMA</div>
                  <div style={{ color: '#FF6B6B', fontWeight: 600 }}>{item.systemCategory}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '2px' }}>📍 UBICACIÓN</div>
                  <div style={{ color: 'var(--brand-beige)', fontWeight: 600 }}>{item.bayLocation || 'Sin Ubicación'}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} color="var(--brand-red)" /> ESTADO
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {item.status === 'DOWN' ? (
                      <span className="badge-down" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        <span className="pulse-dot-red"></span> DOWN
                      </span>
                    ) : (
                      <span className="badge-operativo" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                        <span className="pulse-dot-green"></span> OPERATIVO
                      </span>
                    )}
                    {item.status === 'OPERATIVO' && item.actualReturnTime && (
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                        ({item.actualReturnTime})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Recuadro de Falla Destacado */}
              <div style={{ fontSize: '0.83rem', background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--brand-red)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--brand-beige)', fontWeight: 700, marginBottom: '2px' }}>⚠️ DESCRIPCIÓN DE LA FALLA:</div>
                <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>{item.failureDescription}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
