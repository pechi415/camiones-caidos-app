import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Wrench, Edit, Trash2, Clock, ArrowRightLeft, History, AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';
import { getLocalDateISO } from '../../utils/dateUtils';
import { isEquipmentInField, isReportPreviousToCurrent } from '../../utils/truckUtils';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';

// Helper para convertir formato 12h a "HH:mm"
const formatTimeTo24H = (timeStr) => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (/^\d{2}:\d{2}$/.test(str)) return str;

  const cleaned = str.toLowerCase().replace(/\./g, '').trim();
  const isPM = cleaned.includes('pm') || cleaned.includes('p m');
  const isAM = cleaned.includes('am') || cleaned.includes('a m');

  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return '';
};

// Helper para convertir "HH:mm" a "02:30 PM"
const formatTime12H = (time24) => {
  if (!time24) return '';
  const match = time24.match(/^(\d{2}):(\d{2})$/);
  if (!match) return time24;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
};

export default function TruckTable({ reports, onUpdateStatus, onEditReport, onDeleteReport, onViewHistory, activeMine, activeShift }) {
  const { user, selectedDate, setSelectedDate, getTodayISO, setActiveMine, setActiveShift } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | DOWN | OPERATIVO
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deleteConfirmReport, setDeleteConfirmReport] = useState(null);
  const [operativoConfirmReport, setOperativoConfirmReport] = useState(null);
  const [returnTimeInput, setReturnTimeInput] = useState('');

  const handleStatusClick = (report) => {
    if (report.status === 'DOWN') {
      const now24 = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setReturnTimeInput(formatTime12H(now24));
      setOperativoConfirmReport(report);
    } else {
      onUpdateStatus(report.id, 'DOWN');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    if (reports.length > 0) {
      const latestReport = reports[0];
      if (latestReport.mine && setActiveMine) setActiveMine(latestReport.mine);
      if (latestReport.shift && setActiveShift) setActiveShift(latestReport.shift);
      if (setSelectedDate) setSelectedDate(latestReport.date || getLocalDateISO());
    } else if (setSelectedDate && getTodayISO) {
      setSelectedDate(getTodayISO());
    }
  };

  const query = (searchTerm || '').toLowerCase();
  const checkSearchMatch = (r) => {
    return (
      !query ||
      (r.truckId ? r.truckId.toLowerCase().includes(query) : false) ||
      (r.operatorName ? r.operatorName.toLowerCase().includes(query) : false) ||
      (r.failureDescription ? r.failureDescription.toLowerCase().includes(query) : false) ||
      (r.bayLocation ? r.bayLocation.toLowerCase().includes(query) : false)
    );
  };

  // 1. Reportes de la Jornada Actual
  const currentShiftReports = reports.filter(r => {
    const matchMine = r.mine === activeMine;
    const matchShift = r.shift === activeShift;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchCategory = categoryFilter === 'ALL' || r.systemCategory === categoryFilter;

    let reportDateStr = r.date || (r.createdAt ? getLocalDateISO(r.createdAt) : '');
    const matchDate = !selectedDate || !reportDateStr || reportDateStr === selectedDate;

    return matchMine && matchShift && matchDate && matchStatus && matchCategory && checkSearchMatch(r);
  });

  // 2. Equipos Pendientes en CAMPO de Turnos Anteriores (Arrastre)
  const carryoverFieldReports = reports.filter(r => {
    const matchMine = r.mine === activeMine;
    const isDown = r.status === 'DOWN';
    const inField = isEquipmentInField(r.bayLocation);
    const isPrevious = isReportPreviousToCurrent(r, activeShift, selectedDate);
    const matchStatus = statusFilter === 'ALL' || r.status === 'DOWN';
    const matchCategory = categoryFilter === 'ALL' || r.systemCategory === categoryFilter;

    return matchMine && isDown && inField && isPrevious && matchStatus && matchCategory && checkSearchMatch(r);
  });

  const categories = Array.from(new Set(reports.map(r => r.systemCategory)));

  // Renderizador para Celulares (Vista de Tarjetas Táctiles)
  const renderMobileCards = (list, isCarryover = false) => (
    <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {list.map(report => (
        <div
          key={report.id}
          className="glass-card"
          style={{
            padding: '14px',
            borderLeft: isCarryover ? '4px solid #EF4444' : '4px solid var(--brand-red)',
            background: isCarryover ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)',
            borderRadius: '14px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Header de la tarjeta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div
              onClick={() => onViewHistory && onViewHistory(report.truckId)}
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: isCarryover ? '#F87171' : 'var(--brand-beige)',
                background: isCarryover ? 'rgba(239, 68, 68, 0.15)' : 'rgba(229, 213, 188, 0.12)',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <History size={14} color={isCarryover ? '#F87171' : '#FACC15'} /> Camión {report.truckId}
            </div>

            {report.status === 'DOWN' ? (
              <span className="badge-down"><span className="pulse-dot-red"></span> DOWN</span>
            ) : (
              <span className="badge-operativo"><span className="pulse-dot-green"></span> OPERATIVO</span>
            )}
          </div>

          {/* Detalles del reporte */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Operador:</span>
              <b style={{ textAlign: 'right' }}>{report.operatorName}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sistema:</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                {report.systemCategory}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ubicación:</span>
              <b style={{ color: isCarryover ? '#FCA5A5' : '#FFFFFF', textAlign: 'right' }}>
                📍 {report.bayLocation || 'Sin Ubicación'}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {isCarryover ? 'Origen:' : 'Hora de Reporte:'}
              </span>
              <b>
                {isCarryover ? `🔄 ${report.shift} (${report.date || getLocalDateISO(report.createdAt)})` : `🕒 ${report.reportTime}`}
              </b>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', marginTop: '4px', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <b style={{ color: 'var(--brand-beige)' }}>Falla:</b> {report.failureDescription}
            </div>
          </div>

          {/* Acciones de la tarjeta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
            <button
              onClick={() => handleStatusClick(report)}
              style={{
                flex: 1,
                background: report.status === 'DOWN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 59, 48, 0.2)',
                border: report.status === 'DOWN' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 59, 48, 0.4)',
                color: report.status === 'DOWN' ? 'var(--status-operativo)' : 'var(--status-down)',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <ArrowRightLeft size={14} />
              {report.status === 'DOWN' ? 'Operativo' : 'Reabrir'}
            </button>

            <button
              title="Ver Historial"
              onClick={() => onViewHistory && onViewHistory(report.truckId)}
              style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#FACC15', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <History size={16} />
            </button>

            <button
              title="Editar"
              onClick={() => onEditReport(report)}
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'var(--glass-border)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Edit size={16} />
            </button>

            {user.role === 'Administrador' && (
              <button
                title="Eliminar"
                onClick={() => setDeleteConfirmReport(report)}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Renderizador para Escritorio (Tabla Tradicional)
  const renderTableRows = (list, isCarryover = false) => (
    <>
      {/* Vista Móvil */}
      {renderMobileCards(list, isCarryover)}

      {/* Vista Escritorio */}
      <div className="hidden-mobile" style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px' }}>Número Camión</th>
              <th style={{ padding: '10px 14px' }}>Operador</th>
              <th style={{ padding: '10px 14px' }}>Sistema Afectado</th>
              <th style={{ padding: '10px 14px' }}>Ubicación Campo</th>
              <th style={{ padding: '10px 14px' }}>Descripción de Falla</th>
              <th style={{ padding: '10px 14px' }}>{isCarryover ? 'Origen (Turno / Fecha)' : 'Hora de Reporte'}</th>
              <th style={{ padding: '10px 14px' }}>Estado</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map(report => (
              <tr
                key={report.id}
                style={{
                  background: isCarryover ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  borderLeft: isCarryover ? '4px solid #EF4444' : 'none',
                  transition: 'all 0.2s ease',
                  borderRadius: '12px'
                }}
                className="table-row-hover"
              >
                {/* Número del Camión */}
                <td style={{ padding: '14px', borderRadius: '12px 0 0 12px' }}>
                  <div
                    onClick={() => onViewHistory && onViewHistory(report.truckId)}
                    title="Ver Historial Completo de este Camión"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      color: isCarryover ? '#F87171' : 'var(--brand-beige)',
                      background: isCarryover ? 'rgba(239, 68, 68, 0.15)' : 'rgba(229, 213, 188, 0.12)',
                      border: isCarryover ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(229, 213, 188, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <History size={13} color={isCarryover ? '#F87171' : '#FACC15'} /> {report.truckId}
                  </div>
                </td>

                {/* Operador */}
                <td style={{ padding: '14px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF' }}>
                    {report.operatorName}
                  </div>
                </td>

                {/* Sistema Afectado */}
                <td style={{ padding: '14px' }}>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: 'var(--glass-border)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-white)',
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}>
                    {report.systemCategory}
                  </span>
                </td>

                {/* Ubicación */}
                <td style={{ padding: '14px' }}>
                  <div style={{ fontSize: '0.82rem', color: isCarryover ? '#FCA5A5' : 'rgba(255, 255, 255, 0.7)', fontWeight: isCarryover ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color={isCarryover ? '#F87171' : 'rgba(255,255,255,0.5)'} />
                    {report.bayLocation || 'Sin Ubicación'}
                  </div>
                </td>

                {/* Descripción de Falla */}
                <td style={{ padding: '14px', maxWidth: '280px' }}>
                  <div style={{
                    fontSize: '0.82rem',
                    color: 'rgba(255, 255, 255, 0.85)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {report.failureDescription}
                  </div>
                </td>

                {/* Horario / Origen */}
                <td style={{ padding: '14px' }}>
                  {isCarryover ? (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#FCA5A5', fontWeight: 700 }}>
                        🔄 {report.shift} ({report.date || getLocalDateISO(report.createdAt)})
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        Reporte: {report.reportTime}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.8rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--brand-red)" /> <b>{report.reportTime}</b>
                      </div>
                      {report.status === 'OPERATIVO' && report.actualReturnTime && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--status-operativo)', marginTop: '2px', fontWeight: 600 }}>
                          Salida: {report.actualReturnTime}
                        </div>
                      )}
                    </>
                  )}
                </td>

                {/* Estado Badge */}
                <td style={{ padding: '14px' }}>
                  {report.status === 'DOWN' ? (
                    <span className="badge-down">
                      <span className="pulse-dot-red"></span> DOWN
                    </span>
                  ) : (
                    <span className="badge-operativo">
                      <span className="pulse-dot-green"></span> OPERATIVO
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td style={{ padding: '14px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    {/* Botón Rápido Cambiar Estado */}
                    <button
                      title={report.status === 'DOWN' ? 'Marcar como OPERATIVO' : 'Volver a marcar como DOWN'}
                      onClick={() => handleStatusClick(report)}
                      style={{
                        background: report.status === 'DOWN' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 59, 48, 0.2)',
                        border: report.status === 'DOWN' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 59, 48, 0.4)',
                        color: report.status === 'DOWN' ? 'var(--status-operativo)' : 'var(--status-down)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      {report.status === 'DOWN' ? 'Operativo' : 'Reabrir'}
                    </button>

                    {/* Ver Historial */}
                    <button
                      title="Ver Historial del Camión"
                      onClick={() => onViewHistory && onViewHistory(report.truckId)}
                      style={{
                        background: 'rgba(234, 179, 8, 0.15)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        color: '#FACC15',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <History size={15} />
                    </button>

                    {/* Editar */}
                    <button
                      title="Editar Registro"
                      onClick={() => onEditReport(report)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'var(--glass-border)',
                        color: '#FFFFFF',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit size={15} />
                    </button>

                    {/* Eliminar (Solo Admin) */}
                    {user.role === 'Administrador' && (
                      <button
                        title="Eliminar Registro"
                        onClick={() => setDeleteConfirmReport(report)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      {/* Encabezado y Filtros */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>
            Registro de Camiones Caídos
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Novedades de flota en {activeMine} (Turno {activeShift})
          </p>
        </div>

        {/* Barra de Búsqueda y Filtros Rápidos (1 línea en PC / 2 filas en Móvil) */}
        <div className="table-filters-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Buscar con marquesina animada */}
          <div className="table-filters-search" style={{ width: '220px', minWidth: '180px' }}>
            <AnimatedSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholderText="📢 Buscar por camión, operador, falla o ubicación..."
            />
          </div>

          {/* Selectores (Sistema y Estado) */}
          <div className="table-filters-selects" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filtro por Sistema */}
            <select
              className="glass-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '165px', height: '40px', padding: '0 12px', fontSize: '0.84rem', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <option value="ALL">Todos los Sistemas</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Filtro por Estado */}
            <select
              className="glass-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '150px', height: '40px', padding: '0 12px', fontSize: '0.84rem', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="DOWN">Solo DOWN</option>
              <option value="OPERATIVO">Solo OPERATIVOS</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Equipos Caídos Pendientes en CAMPO de Turnos Anteriores (Arrastre Operativo) */}
      {carryoverFieldReports.length > 0 && (
        <div style={{ marginBottom: '30px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 800, fontSize: '0.95rem' }}>
              <AlertTriangle size={18} color="#EF4444" />
              Equipos Caídos Pendientes en CAMPO (Turnos Anteriores - {activeMine})
            </div>
            <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '2px 10px', borderRadius: '12px', fontWeight: 700 }}>
              {carryoverFieldReports.length} {carryoverFieldReports.length === 1 ? 'equipo' : 'equipos'} fuera de taller
            </span>
          </div>
          {renderTableRows(carryoverFieldReports, true)}
        </div>
      )}

      {/* SECCIÓN 2: Novedades del Turno Actual */}
      <div>
        <div style={{ marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--brand-beige)" />
          Novedades Registradas en la Jornada Actual ({activeMine} - Turno {activeShift})
        </div>

        {currentShiftReports.length === 0 && carryoverFieldReports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: 'var(--glass-border)'
          }}>
            <Wrench size={36} color="rgba(255, 255, 255, 0.3)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>No hay registros para este turno</h4>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', maxWidth: '500px', marginInLine: 'auto' }}>
              {reports.length > 0 
                ? `Existen ${reports.length} reportes guardados en la base de datos, pero están ocultos por los filtros seleccionados (Mina: ${activeMine} • Turno: ${activeShift}).`
                : `No se han registrado camiones caídos aún.`
              }
            </p>
            {reports.length > 0 && (
              <button 
                onClick={handleResetFilters} 
                className="btn-primary" 
                style={{ marginTop: '14px', padding: '8px 16px', fontSize: '0.82rem' }}
              >
                🔄 Restablecer Filtros y Ver Reportes
              </button>
            )}
          </div>
        ) : currentShiftReports.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            No se han registrado nuevas fallas originadas durante el transcurso de este turno.
          </div>
        ) : (
          renderTableRows(currentShiftReports, false)
        )}
      </div>

      {/* Modal Confirmación para Marcar Equipo como OPERATIVO */}
      {operativoConfirmReport && (
        <div className="modal-overlay" onClick={() => setOperativoConfirmReport(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '460px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Confirmar Equipo Operativo
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px', lineHeight: '1.5' }}>
              ¿Está seguro de marcar el <strong style={{ color: 'var(--brand-beige)' }}>Camión {operativoConfirmReport.truckId}</strong> como <strong style={{ color: 'var(--status-operativo)' }}>OPERATIVO</strong>?
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'left',
              fontSize: '0.83rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>👤 Operador:</span> <b>{operativoConfirmReport.operatorName}</b></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>🔧 Sistema:</span> <b>{operativoConfirmReport.systemCategory}</b></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>📍 Ubicación:</span> <b>{operativoConfirmReport.bayLocation || 'Sin Ubicación'}</b></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>🕒 Hora de Reporte:</span> <b>{operativoConfirmReport.reportTime}</b></div>
            </div>

            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-beige)', marginBottom: '6px', display: 'block' }}>
                Hora de Salida / Retorno *
              </label>
              <input
                type="time"
                className="glass-input"
                value={formatTimeTo24H(returnTimeInput)}
                onChange={(e) => setReturnTimeInput(formatTime12H(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setOperativoConfirmReport(null)}
                className="btn-glass"
                style={{ padding: '10px 20px', flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(operativoConfirmReport.id, 'OPERATIVO', returnTimeInput);
                  setOperativoConfirmReport(null);
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', flex: 1, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFFFFF', fontWeight: 700 }}
              >
                Sí, Marcar Operativo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Reporte de Camión */}
      {deleteConfirmReport && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmReport(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '460px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
              Eliminar Registro de Camión
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: '1.5' }}>
              ¿Está seguro de eliminar el reporte del <strong style={{ color: 'var(--brand-beige)' }}>Camión {deleteConfirmReport.truckId}</strong>?
              <br />
              <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginTop: '8px' }}>
                👤 {deleteConfirmReport.operatorName} • 📍 {deleteConfirmReport.bayLocation || 'Sin Ubicación'}
                <br />
                🔧 Sistema: {deleteConfirmReport.systemCategory}
              </span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmReport(null)}
                className="btn-glass"
                style={{ padding: '10px 20px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReport(deleteConfirmReport.id);
                  setDeleteConfirmReport(null);
                }}
                className="btn-primary"
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', fontWeight: 700 }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
