import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useReports } from '../../context/ReportContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, FileText, ShieldCheck, Eye, Share2, MessageSquare, Download } from 'lucide-react';
import { getLocalDateISO } from '../../utils/dateUtils';
import { isEquipmentInField, isReportPreviousToCurrent, getReportPriority, sortReportsByPriority } from '../../utils/truckUtils';
import { getShortName } from '../../utils/aiCorrector';
import { downloadOrOpenPdf, sharePdfDoc } from '../../utils/pdfUtils';
import { DRUMMOND_LOGO_BASE64 } from '../../assets/drummondLogoBase64';
import { CAT_HEADER_LOGO_BASE64 } from '../../assets/catHeaderLogoBase64';
import drummondLogo from '../../assets/drummond-logo.png';
import catHeaderLogo from '../../assets/cat-header-logo.jpg';

export default function ExportModal({ isOpen, onClose }) {
  const { user, activeMine, activeShift, selectedDate } = useAuth();
  const { reports } = useReports();
  const [downloading, setDownloading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);

  // 1. Reportes creados en la fecha/turno activa
  const shiftReports = reports.filter(r => {
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

  const totalCurrentDown = shiftReports.filter(r => r.status === 'DOWN').length;
  const totalOperativos = shiftReports.filter(r => r.status === 'OPERATIVO').length;
  const totalCount = shiftReports.length;
  const totalCarryoverCount = carryoverReports.length;
  const totalGlobalDown = totalCurrentDown + totalCarryoverCount;
  const availabilityRate = totalCount === 0 ? 100 : Math.round((totalOperativos / (totalCount + totalCarryoverCount)) * 100);

  const formattedDate = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const responsableName = getShortName(user?.name) || 'N/A';
  const formattedGroup = (user?.group || 'G1').replace(/^Grupo\s*/i, 'G');

  // Helper para construir el Documento jsPDF
  const generatePdfDoc = () => {
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
      doc.addImage(DRUMMOND_LOGO_BASE64, 'PNG', 10, 3, 24, 24, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }

    // Imagen Derecha (Reporte de Falla Mecánica - Flota CAT 793)
    try {
      doc.addImage(CAT_HEADER_LOGO_BASE64, 'JPEG', 263, 3, 24, 24, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not render right header image in PDF:', e);
    }

    // Título y Subtítulo Centrados
    const centerX = 297 / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(185, 28, 28); // Rojo Corporativo Drummond
    doc.text('DEPARTAMENTO DE CAMIONES', centerX, 9, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Reporte de Camiones Caídos', centerX, 15, { align: 'center' });

    // Datos Generales del Encabezado en Una Sola Línea Centrada
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Mina: ${activeMine}   |   Turno: ${activeShift}   |   Grupo: ${formattedGroup}   |   Responsable: ${responsableName}   |   Fecha: ${formattedDate}`, centerX, 24, { align: 'center' });

    // Resumen Ejecutivo KPIs
    doc.setFillColor(243, 235, 221);
    doc.rect(14, 32, 269, 12, 'F');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 13, 16);
    doc.text(`Novedades del Turno: ${totalCount}   |   Pendientes en CAMPO: ${totalCarryoverCount}   |   Total DOWN: ${totalGlobalDown}   |   Recuperados: ${totalOperativos}   |   Tasa Recuperación: ${availabilityRate}%`, 18, 39.5);

    let currentY = 50;

    // Ordenar listas por prioridad (Alta -> Media -> Baja -> Operativo)
    const sortedCarryoverReports = sortReportsByPriority(carryoverReports);
    const sortedShiftReports = sortReportsByPriority(shiftReports);

    // TABLA 1: Equipos Pendientes en CAMPO de Turnos Anteriores (si existen)
    if (sortedCarryoverReports.length > 0) {
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text('EQUIPOS PENDIENTES EN CAMPO (TURNOS ANTERIORES - ARRASTRE)', 14, currentY);

      const carryoverRows = sortedCarryoverReports.map(r => [
        `${r.truckId}`,
        r.operatorName,
        r.systemCategory,
        r.failureDescription,
        r.bayLocation || 'En Campo',
        `${r.shift} (${r.date || getLocalDateISO(r.createdAt)})`,
        r.status
      ]);

      autoTable(doc, {
        startY: currentY + 3.5,
        head: [['N° Camión', 'Operador', 'Sistema Afectado', 'Descripción de Falla', 'Ubicación Campo', 'Origen (Turno / Fecha)', 'Estado']],
        body: carryoverRows,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.2
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const reportObj = sortedCarryoverReports[data.row.index];
            if (reportObj) {
              const priority = getReportPriority(reportObj);
              data.cell.styles.fillColor = priority.fillColor;
              data.cell.styles.textColor = priority.textColor;
              if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 6) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = priority.statusColor;
              }
            }
          }
        }
      });

      currentY = (doc.lastAutoTable && doc.lastAutoTable.finalY) + 9;
    }

    // TABLA 2: Novedades de la Jornada Actual
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 17, 21);
    doc.text(`NOVEDADES REGISTRADAS EN EL TURNO (${sortedShiftReports.length} REGISTROS)`, 14, currentY);

    const tableRows = sortedShiftReports.map(r => [
      `${r.truckId}`,
      r.operatorName,
      r.systemCategory,
      r.failureDescription,
      r.bayLocation || 'Sin Ubicación',
      r.reportTime,
      r.status
    ]);

    autoTable(doc, {
      startY: currentY + 3.5,
      head: [['N° Camión', 'Operador', 'Sistema Afectado', 'Descripción de Falla', 'Ubicación', 'Hora Reporte', 'Estado']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [229, 46, 46],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const reportObj = sortedShiftReports[data.row.index];
          if (reportObj) {
            const priority = getReportPriority(reportObj);
            data.cell.styles.fillColor = priority.fillColor;
            data.cell.styles.textColor = priority.textColor;
            if (data.column.index === 0) {
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 6) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = priority.statusColor;
            }
          }
        }
      }
    });

    // Pie de Página
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 140;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado por: ${responsableName} - ${new Date().toLocaleTimeString()}`, 14, finalY + 8);

    return doc;
  };

  const [cachedBlob, setCachedBlob] = useState(null);
  const [shareBtnState, setShareBtnState] = useState('idle'); // 'idle' | 'preparing' | 'ready'

  // Limpiar caché cuando cambie la mina, turno o fecha
  useEffect(() => {
    setCachedBlob(null);
    setShareBtnState('idle');
  }, [isOpen, activeMine, activeShift, selectedDate, reports]);

  // Bloqueo de Scroll de Fondo cuando el Modal está abierto
  useEffect(() => {
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

  // 1. Exportar / Descargar PDF directamente al dispositivo
  const handleExportPDF = () => {
    setDownloading(true);
    try {
      const doc = generatePdfDoc();
      const fileName = `Reporte_Camiones_Caidos_${activeMine.replace(/\s+/g, '_')}_Turno_${activeShift}_${new Date().toISOString().slice(0,10)}.pdf`;
      downloadOrOpenPdf(doc, fileName);
    } catch (err) {
      console.error(err);
      alert('Error descargando reporte PDF: ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  // 2. Compartir el Archivo PDF Nativo mediante Web Share API (1 Clic directo para iOS/Android)
  const handleSharePDF = async () => {
    setDownloading(true);
    try {
      const doc = generatePdfDoc();
      const fileName = `RCT_${activeMine.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}_Turno_${activeShift}.pdf`;
      const title = `Reporte Camiones Caídos ${activeMine} - Turno ${activeShift}`;
      const text = `Consolidado de Camiones Caídos - Mina ${activeMine}, Turno ${activeShift} (${formattedDate})`;

      await sharePdfDoc(doc, fileName, title, text);
    } catch (err) {
      console.error("Error en evento de compartido:", err);
      alert("Error al compartir PDF: " + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  // 3. Generar Archivo Excel (XLSX) con 2 Pestañas
  const handleExportExcel = () => {
    setDownloading(true);
    try {
      const workbook = XLSX.utils.book_new();
      const sortedShift = sortReportsByPriority(shiftReports);
      const sortedCarryover = sortReportsByPriority(carryoverReports);

      // Pestaña 1: Novedades del Turno Actual
      const sheet1Data = sortedShift.map(r => {
        const prio = getReportPriority(r);
        return {
          'N° Camión': r.truckId,
          'Operador': r.operatorName,
          'Mina': r.mine,
          'Turno': r.shift,
          'Sistema Afectado': r.systemCategory,
          'Descripción de Falla': r.failureDescription,
          'Ubicación': r.bayLocation || 'Sin Ubicación',
          'Prioridad': prio.level,
          'Hora Reporte': r.reportTime,
          'Estado': r.status,
          'Fecha Registrada': r.date || (r.createdAt ? getLocalDateISO(r.createdAt) : '')
        };
      });

      const sheet1 = XLSX.utils.json_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(workbook, sheet1, `Novedades Turno (${sortedShift.length})`);

      // Pestaña 2: Pendientes en Campo (Arrastre)
      if (sortedCarryover.length > 0) {
        const sheet2Data = sortedCarryover.map(r => {
          const prio = getReportPriority(r);
          return {
            'N° Camión': r.truckId,
            'Operador': r.operatorName,
            'Mina': r.mine,
            'Origen (Turno)': r.shift,
            'Origen (Fecha)': r.date || getLocalDateISO(r.createdAt),
            'Sistema Afectado': r.systemCategory,
            'Descripción de Falla': r.failureDescription,
            'Ubicación Campo': r.bayLocation || 'En Campo',
            'Prioridad': prio.level,
            'Estado': prio.statusBadge
          };
        });

        const sheet2 = XLSX.utils.json_to_sheet(sheet2Data);
        XLSX.utils.book_append_sheet(workbook, sheet2, `Pendientes Campo (${sortedCarryover.length})`);
      }

      XLSX.writeFile(workbook, `Reporte_Camiones_Caidos_${activeMine.replace(/\s+/g, '_')}_${activeShift}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error generando Excel.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '750px' }}>
        {/* Encabezado Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: 'var(--glass-border)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src={drummondLogo} alt="Drummond Ltd. Colombia" style={{ height: '42px', width: '42px', objectFit: 'contain', borderRadius: '4px' }} />
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                Generar Reporte de Camiones Caídos
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                {activeMine} • Turno {activeShift} ({shiftReports.length} registros)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src={catHeaderLogo} alt="Flota CAT 793" style={{ height: '42px', width: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)' }} />
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Vista previa de datos en la modal */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Novedades Turno</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>{totalCount}</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: '#FCA5A5', textTransform: 'uppercase' }}>Pendientes Campo</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F87171' }}>{totalCarryoverCount}</div>
            </div>
            <div style={{ background: 'var(--status-down-bg)', padding: '10px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--status-down)', textTransform: 'uppercase' }}>Total DOWN</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-down)' }}>{totalGlobalDown}</div>
            </div>
            <div style={{ background: 'var(--status-operativo-bg)', padding: '10px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--status-operativo)', textTransform: 'uppercase' }}>Recuperados</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-operativo)' }}>{totalOperativos}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--brand-beige)" />
            El archivo generado contiene el consolidado listo para auditoría y entrega de turno.
          </div>
        </div>

        {/* Acciones de Exportación y Compartido */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {/* 1. Exportar PDF */}
          <button
            onClick={handleExportPDF}
            disabled={downloading || (totalCount === 0 && totalCarryoverCount === 0)}
            className="btn-primary"
            style={{ padding: '14px', justifyContent: 'center', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            <FileText size={18} /> Exportar PDF
          </button>

          {/* 2. Compartir PDF (Web Share API Nativo) */}
          <button
            onClick={handleSharePDF}
            disabled={downloading || (totalCount === 0 && totalCarryoverCount === 0)}
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
              opacity: (downloading || (totalCount === 0 && totalCarryoverCount === 0)) ? 0.6 : 1
            }}
          >
            <Share2 size={18} />
            {downloading ? '⏳ Procesando...' : 'Compartir PDF'}
          </button>

          {/* 3. Exportar Excel */}
          <button
            onClick={handleExportExcel}
            disabled={downloading || (totalCount === 0 && totalCarryoverCount === 0)}
            className="btn-beige"
            style={{ padding: '14px', justifyContent: 'center', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            <FileSpreadsheet size={18} /> Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
}
