import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';
import { 
  History, 
  Search, 
  Filter, 
  Truck, 
  FileSpreadsheet, 
  FileText,
  Wrench,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getLocalDateISO } from '../../utils/dateUtils';
import { getShortName } from '../../utils/aiCorrector';
import { DRUMMOND_LOGO_BASE64 } from '../../assets/drummondLogoBase64';
import { CAT_HEADER_LOGO_BASE64 } from '../../assets/catHeaderLogoBase64';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GlobalHistory({ onViewHistory }) {
  const { user } = useAuth();
  const { reports } = useReports();

  const [searchTerm, setSearchTerm] = useState('');
  const [mineFilter, setMineFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Paginación y Acordeón en Celular (20 camiones por página)
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Reiniciar página a 1 cuando cambien los filtros de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, mineFilter, shiftFilter, categoryFilter, startDate, endDate]);

  // Categorías de sistemas para el selector
  const categories = Array.from(new Set(reports.map(r => r.systemCategory).filter(Boolean)));

  // Filtrar el historial inalterable según los controles
  const filteredHistory = reports.filter(r => {
    const query = (searchTerm || '').toLowerCase();
    const matchSearch =
      !query ||
      (r.truckId ? r.truckId.toLowerCase().includes(query) : false) ||
      (r.operatorName ? r.operatorName.toLowerCase().includes(query) : false) ||
      (r.failureDescription ? r.failureDescription.toLowerCase().includes(query) : false) ||
      (r.bayLocation ? r.bayLocation.toLowerCase().includes(query) : false) ||
      (r.reportedBy ? r.reportedBy.toLowerCase().includes(query) : false);

    const matchMine = mineFilter === 'ALL' || r.mine === mineFilter;
    const matchShift = shiftFilter === 'ALL' || r.shift === shiftFilter;
    const matchCategory = categoryFilter === 'ALL' || r.systemCategory === categoryFilter;

    // Obtener fecha del registro YYYY-MM-DD
    const reportDate = r.date || (r.createdAt ? getLocalDateISO(r.createdAt) : '');

    const matchStartDate = !startDate || (reportDate && reportDate >= startDate);
    const matchEndDate = !endDate || (reportDate && reportDate <= endDate);

    return matchSearch && matchMine && matchShift && matchCategory && matchStartDate && matchEndDate;
  });

  // Métricas del historial inalterable
  const totalCount = filteredHistory.length;
  const uniqueTrucks = Array.from(new Set(filteredHistory.map(r => r.truckId))).length;

  // Sistema más recurrente
  const categoryCounts = {};
  filteredHistory.forEach(r => {
    if (r.systemCategory) {
      categoryCounts[r.systemCategory] = (categoryCounts[r.systemCategory] || 0) + 1;
    }
  });
  let topSystem = 'N/A';
  let topSystemCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > topSystemCount) {
      topSystemCount = count;
      topSystem = cat;
    }
  });

// Abreviador inteligente de categorías de sistema para badges móviles compactos
const getShortSystemCategory = (name) => {
  if (!name) return 'N/A';
  return name
    .replace(/Sistema de /gi, 'Sist. ')
    .replace(/Sistema /gi, 'Sist. ')
    .replace(/Mantenimiento/gi, 'Mant.')
    .replace(/Transmisión/gi, 'Transm.')
    .replace(/Enfriamiento/gi, 'Enfriam.')
    .replace(/Refrigeración/gi, 'Refrig.')
    .replace(/Combustible/gi, 'Combust.')
    .replace(/Suspensión/gi, 'Susp.')
    .replace(/Dirección/gi, 'Direcc.')
    .replace(/Hidráulico/gi, 'Hidrául.');
};

  // Cálculo de Paginación (20 camiones por página)
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Alternar despliegue de una tarjeta individual
  const toggleCard = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Alternar expandir/colapsar todas las tarjetas de la página actual
  const toggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newExpanded = {};
    paginatedHistory.forEach(r => {
      newExpanded[r.id] = nextState;
    });
    setExpandedCards(newExpanded);
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setMineFilter('ALL');
    setShiftFilter('ALL');
    setCategoryFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Exportar Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredHistory.map(r => ({
        'ID Registro': r.id,
        'Fecha': r.date || getLocalDateISO(r.createdAt),
        'Mina': r.mine,
        'Turno': r.shift,
        'N° Camión': r.truckId,
        'Operador': r.operatorName,
        'Sistema Afectado': r.systemCategory,
        'Descripción Falla': r.failureDescription,
        'Ubicación': r.bayLocation || 'Sin asignación',
        'Hora Reporte Falla': r.reportTime || 'N/A',
        'Hora Salida Taller': r.actualReturnTime || 'En Taller',
        'Reportado Por': r.reportedBy || 'Sistema',
        'Fecha Registro BD': r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bitácora Histórica');

      const fileName = `Bitacora_Histórica_Camiones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      alert('Error generando Excel del historial.');
    }
  };

  // Exportar PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Encabezado Corporativo en Fondo Blanco Limpio
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 297, 30, 'F');

      // Línea divisora inferior sutil
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(0, 30, 297, 30);

      // Logo Oficial Izquierda (Drummond Ltd. Colombia)
      try {
        doc.addImage(DRUMMOND_LOGO_BASE64, 'PNG', 10, 3, 24, 24);
      } catch (e) {
        console.warn('Could not render logo in PDF:', e);
      }

      // Imagen Derecha (Reporte de Falla Mecánica - Flota CAT 793)
      try {
        doc.addImage(CAT_HEADER_LOGO_BASE64, 'JPEG', 263, 3, 24, 24);
      } catch (e) {
        console.warn('Could not render right header image in PDF:', e);
      }

      // Título y Subtítulo Centrados
      const centerX = 297 / 2;
      const formattedShortDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const responsableName = getShortName(user?.name) || 'N/A';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(185, 28, 28);
      doc.text('DEPARTAMENTO DE CAMIONES', centerX, 9, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Bitácora Histórica de Camiones Caídos', centerX, 15, { align: 'center' });

      // Datos Generales del Encabezado en Una Sola Línea Centrada
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Sede: ${mineFilter === 'ALL' ? 'Todas' : mineFilter}   |   Registros: ${totalCount}   |   Generado Por: ${responsableName}   |   Fecha: ${formattedShortDate}`, centerX, 24, { align: 'center' });

      doc.setFillColor(243, 235, 221);
      doc.rect(14, 33, 269, 12, 'F');

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 13, 16);
      doc.text(`Total Novedades: ${totalCount}   |   Equipos Afectados Únicos: ${uniqueTrucks}   |   Sistema Falla Frecuente: ${topSystem}`, 18, 41);

      const tableRows = filteredHistory.map(r => [
        r.date || getLocalDateISO(r.createdAt),
        `${r.truckId}`,
        r.mine,
        r.shift,
        r.operatorName,
        r.systemCategory,
        r.failureDescription,
        r.bayLocation || 'N/A',
        r.reportTime || 'N/A'
      ]);

      autoTable(doc, {
        startY: 49,
        head: [['Fecha', 'Camión', 'Mina', 'Turno', 'Operador', 'Sistema', 'Descripción Falla', 'Ubicación', 'Hora Falla']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [229, 46, 46],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        }
      });

      doc.save(`Bitacora_Histórica_Camiones_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generando PDF del historial.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header General */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--brand-red) 0%, #B91C1C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(229,46,46,0.3)' }}>
            <History size={24} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF' }}>
              Historial General de Novedades
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Bitácora inalterable de eventos de mantenimiento registrados en flota
            </p>
          </div>
        </div>

        {/* Botones de Exportación General (Alineados a la derecha) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', justifyContent: 'flex-end' }}>
          <button onClick={handleExportExcel} className="btn-beige" style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} /> <span className="hidden-mobile">Exportar Excel</span>
          </button>
          <button onClick={handleExportPDF} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> <span className="hidden-mobile">Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen de la Consulta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--brand-beige)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>Total Novedades</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
            {totalCount}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--brand-red)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>Equipos Afectados</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-red)', marginTop: '2px' }}>
            {uniqueTrucks}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--status-operativo)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase' }}>Sistema Falla Frecuente</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-operativo)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topSystem} {topSystemCount > 0 && `(${topSystemCount})`}
          </div>
        </div>
      </div>

      {/* Panel de Filtros Responsivos */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-beige)', fontWeight: 700, fontSize: '0.88rem' }}>
            <Filter size={16} /> Filtros de Búsqueda
          </div>
          <button 
            onClick={handleResetAllFilters} 
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="history-filters-container">
          {/* Buscar Texto */}
          <div className="history-filters-top">
            <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>Búsqueda General</label>
            <AnimatedSearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholderText="📢 Buscar por camión, operador, descripción de falla o ubicación..."
            />
          </div>

          <div className="history-filters-bottom">
            {/* Fila de Selectores (Mina, Turno, Sistema) */}
            <div className="history-filters-selects-row">
              {/* Filtro Mina */}
              <div className="history-filter-item">
                <label>Mina</label>
                <select className="glass-input" value={mineFilter} onChange={(e) => setMineFilter(e.target.value)}>
                  <option value="ALL">Todas</option>
                  <option value="Pribbenow">PB (Pribbenow)</option>
                  <option value="El Descanso">ED (El Descanso)</option>
                </select>
              </div>

              {/* Filtro Turno */}
              <div className="history-filter-item">
                <label>Turno</label>
                <select className="glass-input" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                  <option value="ALL">Todos</option>
                  <option value="Diurno">D (Diurno)</option>
                  <option value="Nocturno">N (Nocturno)</option>
                </select>
              </div>

              {/* Filtro Categoría */}
              <div className="history-filter-item">
                <label>Sistema</label>
                <select className="glass-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="ALL">Todos</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila de Fechas (Desde, Hasta) */}
            <div className="history-filters-dates-row">
              {/* Fecha Desde */}
              <div className="history-filter-item">
                <label>Desde</label>
                <input
                  type="date"
                  className="glass-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Fecha Hasta */}
              <div className="history-filter-item">
                <label>Hasta</label>
                <input
                  type="date"
                  className="glass-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bitácora de Novedades: Vista Adaptativa */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <Wrench size={34} color="rgba(255, 255, 255, 0.3)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>No hay registros en el historial</h4>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
              No se encontraron coincidencias para los filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            {/* Vista Móvil: Tarjetas Colapsables de Historial (Paginadas a 20) */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {/* Control de Despliegue Global Móvil */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredHistory.length)} de {filteredHistory.length}
                </span>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'var(--glass-border)',
                    color: 'var(--brand-beige)',
                    fontSize: '0.72rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {allExpanded ? 'Colapsar Todo' : 'Expandir Todo'}
                </button>
              </div>

              {paginatedHistory.map(report => {
                const displayDate = report.date || (report.createdAt ? getLocalDateISO(report.createdAt) : 'Sin fecha');
                const mineAbbr = report.mine === 'Pribbenow' ? 'PB' : report.mine === 'El Descanso' ? 'ED' : report.mine;
                const shiftAbbr = report.shift === 'Diurno' ? 'D' : report.shift === 'Nocturno' ? 'N' : report.shift;
                const isExpanded = expandedCards[report.id];

                return (
                  <div
                    key={report.id}
                    className="glass-card"
                    style={{
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: '4px solid var(--brand-red)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Cabecera de la Tarjeta (Badges distribuidos en todo el ancho disponible) */}
                    <div
                      onClick={() => toggleCard(report.id)}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Izquierda: Icono Camión + Número */}
                      <span
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: 'var(--brand-beige)',
                          background: 'rgba(229, 213, 188, 0.12)',
                          border: '1px solid rgba(229, 213, 188, 0.3)',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >
                        <Truck size={14} color="var(--brand-red)" /> {report.truckId}
                      </span>

                      {/* Centro: Contenedor de Badges */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justify: isExpanded ? 'flex-end' : 'flex-start',
                          gap: '6px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Badge Mina */}
                        <span style={{ background: 'rgba(243, 235, 221, 0.1)', color: 'var(--brand-beige)', border: 'var(--glass-border-beige)', padding: '3px 7px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                          📍 {mineAbbr}
                        </span>

                        {/* Badge Turno */}
                        <span style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF', border: 'var(--glass-border)', padding: '3px 7px', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                          🌗 {shiftAbbr}
                        </span>

                        {/* Badge Sistema Falla (Solo visible si la tarjeta está colapsada) */}
                        {!isExpanded && (
                          <span style={{ background: 'rgba(229, 46, 46, 0.15)', color: '#FF6B6B', border: '1px solid rgba(229, 46, 46, 0.3)', padding: '3px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
                            ⚙️ {getShortSystemCategory(report.systemCategory)}
                          </span>
                        )}
                      </div>

                      {/* Derecha: Flecha Desplegable */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={18} color="var(--brand-beige)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.6)" />}
                      </span>
                    </div>

                    {/* Contenido Detallado Desplegado */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>👤 Operador:</span>
                            <b style={{ textAlign: 'right' }}>{report.operatorName}</b>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF', alignItems: 'center' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>⚙️ Sistema:</span>
                            <span style={{ background: 'rgba(229, 46, 46, 0.15)', color: '#FF6B6B', border: '1px solid rgba(229, 46, 46, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {report.systemCategory}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>📍 Ubicación:</span>
                            <b style={{ textAlign: 'right' }}>{report.bayLocation || 'Sin asignación'}</b>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>📅 Fecha / Hora:</span>
                            <b style={{ textAlign: 'right' }}>{displayDate} | 🕒 {report.reportTime || 'N/A'}</b>
                          </div>

                          {/* Recuadro Falla */}
                          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', marginTop: '4px', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <b style={{ color: 'var(--brand-beige)' }}>🔧 Falla:</b> {report.failureDescription}
                          </div>
                        </div>

                        {/* Footer de la Tarjeta */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', paddingTop: '8px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div>✍️ Reportado por: {report.reportedBy || 'Sistema'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vista Escritorio: Tabla Completa Paginada */}
            <div className="hidden-mobile" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Fecha / Hora</th>
                    <th style={{ padding: '10px 14px' }}>N° Camión</th>
                    <th style={{ padding: '10px 14px' }}>Mina / Turno</th>
                    <th style={{ padding: '10px 14px' }}>Operador</th>
                    <th style={{ padding: '10px 14px' }}>Sistema Afectado</th>
                    <th style={{ padding: '10px 14px' }}>Descripción Falla</th>
                    <th style={{ padding: '10px 14px' }}>Ubicación</th>
                    <th style={{ padding: '10px 14px' }}>Reportado Por</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map(report => {
                    const displayDate = report.date || (report.createdAt ? getLocalDateISO(report.createdAt) : 'Sin fecha');

                    return (
                      <tr
                        key={report.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          transition: 'all 0.2s ease',
                          borderLeft: '4px solid var(--brand-red)'
                        }}
                      >
                        {/* Fecha / Hora */}
                        <td style={{ padding: '14px', fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600 }}>
                          <div>{displayDate}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                            🕒 {report.reportTime || 'N/A'}
                          </div>
                        </td>

                        {/* N° Camión */}
                        <td style={{ padding: '14px' }}>
                          <button
                            onClick={() => onViewHistory && onViewHistory(report.truckId)}
                            style={{
                              background: 'rgba(229, 46, 46, 0.15)',
                              border: '1px solid rgba(229, 46, 46, 0.3)',
                              color: '#FFFFFF',
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 800,
                              fontSize: '1rem',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Ver hoja de vida de este camión"
                          >
                            <Truck size={14} color="var(--brand-red)" />
                            {report.truckId}
                          </button>
                        </td>

                        {/* Mina / Turno */}
                        <td style={{ padding: '14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                          <div style={{ fontWeight: 600 }}>{report.mine}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--brand-beige)' }}>{report.shift}</div>
                        </td>

                        {/* Operador */}
                        <td style={{ padding: '14px', fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600 }}>
                          {report.operatorName}
                        </td>

                        {/* Sistema */}
                        <td style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--brand-beige)', fontWeight: 600 }}>
                          {report.systemCategory}
                        </td>

                        {/* Falla */}
                        <td style={{ padding: '14px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', maxWidth: '260px' }}>
                          {report.failureDescription}
                        </td>

                        {/* Ubicación */}
                        <td style={{ padding: '14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} />
                            {report.bayLocation || 'Sin asignación'}
                          </div>
                        </td>

                        {/* Reportado Por */}
                        <td style={{ padding: '14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                          {report.reportedBy || 'Sistema'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Barra de Paginación Intuitiva (20 camiones por página) */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  gap: '10px',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  flexWrap: 'wrap'
                }}
              >
                {/* Botón Anterior */}
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    setExpandedCards({});
                  }}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(229, 213, 188, 0.15)',
                    border: currentPage === 1 ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(229, 213, 188, 0.3)',
                    color: currentPage === 1 ? 'rgba(255, 255, 255, 0.3)' : 'var(--brand-beige)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                {/* Indicador de Páginas */}
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                  Página <b style={{ color: 'var(--brand-beige)', fontSize: '0.9rem' }}>{currentPage}</b> de {totalPages}
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>
                    ({filteredHistory.length} novedades filtradas)
                  </span>
                </div>

                {/* Botón Siguiente */}
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    setExpandedCards({});
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.04)' : 'rgba(229, 213, 188, 0.15)',
                    border: currentPage === totalPages ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(229, 213, 188, 0.3)',
                    color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.3)' : 'var(--brand-beige)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
