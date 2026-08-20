import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { getLocalDateISO } from '../../utils/dateUtils';
import { isEquipmentInField, isReportPreviousToCurrent } from '../../utils/truckUtils';

export default function KPIOverview({ reports, activeMine, activeShift }) {
  const { selectedDate } = useAuth();

  // 1. Novedades del Turno
  const filteredReports = reports.filter(r => {
    const matchMine = r.mine === activeMine;
    const matchShift = r.shift === activeShift;
    const reportDateStr = r.date || (r.createdAt ? getLocalDateISO(r.createdAt) : '');
    const matchDate = !selectedDate || !reportDateStr || reportDateStr === selectedDate;
    return matchMine && matchShift && matchDate;
  });

  // 2. Equipos Pendientes en CAMPO de Turnos Anteriores
  const carryoverReports = reports.filter(r => {
    const matchMine = r.mine === activeMine;
    const isDown = r.status === 'DOWN';
    const inField = isEquipmentInField(r.bayLocation);
    const isPrevious = isReportPreviousToCurrent(r, activeShift, selectedDate);
    return matchMine && isDown && inField && isPrevious;
  });

  const carryoverCount = carryoverReports.length;
  const currentDownCount = filteredReports.filter(r => r.status === 'DOWN').length;
  const totalDown = currentDownCount + carryoverCount;
  const totalOperativos = filteredReports.filter(r => r.status === 'OPERATIVO').length;
  const totalReports = filteredReports.length;

  const availabilityRate = totalReports === 0 ? 100 : Math.round((totalOperativos / (totalReports + carryoverCount)) * 100);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* Total Caídos */}
      <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--brand-red)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
              Registros en Turno
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
              {totalReports}
            </h2>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(229, 46, 46, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} color="var(--brand-red)" />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--brand-beige)', marginTop: '8px', fontWeight: 500 }}>
          {activeMine} • Turno {activeShift}
        </div>
      </div>

      {/* Actualmente DOWN */}
      <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-down)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
              Actualmente Down
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--status-down)', marginTop: '4px' }}>
              {totalDown}
            </h2>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--status-down-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} color="var(--status-down)" />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pulse-dot-red"></span> {carryoverCount > 0 ? `${currentDownCount} de este turno • ${carryoverCount} pendientes en campo` : 'Fuera de servicio'}
        </div>
      </div>

      {/* Operativos Recuperados */}
      <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-operativo)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
              Recuperados / Operativos
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--status-operativo)', marginTop: '4px' }}>
              {totalOperativos}
            </h2>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--status-operativo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} color="var(--status-operativo)" />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="pulse-dot-green"></span> Listos en mina
        </div>
      </div>

      {/* Índice de Recuperación */}
      <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--brand-beige)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tasa de Recuperación
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--brand-beige)', marginTop: '4px' }}>
              {availabilityRate}%
            </h2>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(229, 213, 188, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} color="var(--brand-beige)" />
          </div>
        </div>
        {/* Barra de progreso */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${availabilityRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--brand-red), var(--status-operativo))', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    </div>
  );
}
