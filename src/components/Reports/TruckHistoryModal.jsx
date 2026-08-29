import React, { useState } from 'react';
import { X, History, Truck, Wrench, Clock, Calendar, MapPin, Search, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLocalDateISO } from '../../utils/dateUtils';
import { getReportPriority } from '../../utils/truckUtils';
import { downloadOrOpenPdf } from '../../utils/pdfUtils';
import { DRUMMOND_LOGO_BASE64 } from '../../assets/drummondLogoBase64';
import { CAT_HEADER_LOGO_BASE64 } from '../../assets/catHeaderLogoBase64';
import AnimatedSearchInput from '../Common/AnimatedSearchInput';

export default function TruckHistoryModal({ isOpen, onClose, initialTruckId, reports = [] }) {
  const [searchTruckId, setSearchTruckId] = useState(initialTruckId || '');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Bloqueo de Scroll de Fondo cuando el Modal está abierto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTruckId = searchTruckId || initialTruckId;

  // Filtrar el historial histórico completo de este camión específico (todas las fechas y sedes)
  const truckHistory = reports.filter(r => 
    currentTruckId && r.truckId.toLowerCase().includes(currentTruckId.toLowerCase().trim())
  );

  const totalEvents = truckHistory.length;
  const downEvents = truckHistory.filter(r => r.status === 'DOWN').length;
  const resolvedEvents = truckHistory.filter(r => r.status === 'OPERATIVO').length;

  // Sistema más recurrente
  const categoryCounts = {};
  truckHistory.forEach(r => {
    categoryCounts[r.systemCategory] = (categoryCounts[r.systemCategory] || 0) + 1;
  });
  let mostFrequentSystem = 'N/A';
  let maxCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentSystem = cat;
    }
  });

  // Función para obtener la fecha del registro con fallback robusto
  const getItemDate = (item) => {
    if (item.date) return item.date;
    if (item.createdAt) return getLocalDateISO(item.createdAt);
    if (item.updatedAt) return getLocalDateISO(item.updatedAt);
    return getLocalDateISO();
  };

  // Generar PDF con el historial del equipo
  const handleExportTruckPDF = () => {
    if (truckHistory.length === 0) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Encabezado Corporativo Blanco
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 30, 'F');

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(0, 30, 210, 30);

      // Logo Izquierda
      try {
        doc.addImage(DRUMMOND_LOGO_BASE64, 'PNG', 8, 3, 24, 24);
      } catch (e) {
        console.warn('Could not render logo in PDF:', e);
      }

      // Logo Derecha
      try {
        doc.addImage(CAT_HEADER_LOGO_BASE64, 'JPEG', 178, 3, 24, 24);
      } catch (e) {
        console.warn('Could not render right header image in PDF:', e);
      }

      const centerX = 210 / 2;
      const formattedShortDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(185, 28, 28);
      doc.text('DEPARTAMENTO DE CAMIONES', centerX, 9, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(`Historial Operativo - Camión ${currentTruckId}`, centerX, 15, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Novedades: ${totalEvents}   |   En Falla: ${downEvents}   |   Recuperados: ${resolvedEvents}   |   Fecha: ${formattedShortDate}`, centerX, 24, { align: 'center' });

      const tableRows = truckHistory.map(r => {
        const prio = getReportPriority(r);
        return [
          getItemDate(r),
          r.shift || 'N/A',
          r.mine || 'N/A',
          r.operatorName,
          r.systemCategory,
          r.failureDescription,
          r.reportTime,
          r.actualReturnTime || (r.status === 'OPERATIVO' ? 'Listo' : 'En Atención'),
          prio.statusBadge
        ];
      });

      autoTable(doc, {
        startY: 34,
        head: [['Fecha', 'Turno', 'Sede', 'Operador', 'Sistema', 'Descripción', 'Reporte', 'Retorno', 'Prioridad / Estado']],
        body: tableRows,
        styles: { fontSize: 7.8, cellPadding: 2.2 },
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const reportObj = truckHistory[data.row.index];
            if (reportObj) {
              const priority = getReportPriority(reportObj);
              data.cell.styles.fillColor = priority.fillColor;
              data.cell.styles.textColor = priority.textColor;
              if (data.column.index === 0 || data.column.index === 8) {
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });

      downloadOrOpenPdf(doc, `Historial_Camion_${currentTruckId}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('Error al exportar historial:', e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '1000px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
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
        <div style={{ display: 'grid', gridTemplateColumns: truckHistory.length > 0 ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '18px', width: '100%' }}>
          <AnimatedSearchInput
            value={searchTruckId}
            onChange={(e) => setSearchTruckId(e.target.value)}
            placeholderText="📢 Ingrese el Número del Camión para consultar su historial completo (ej: 2014)..."
          />

          {truckHistory.length > 0 && (
            <button
              onClick={handleExportTruckPDF}
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
      </div>
    </div>
  );
}
