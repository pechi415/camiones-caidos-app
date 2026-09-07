import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLocalDateISO } from '../../utils/dateUtils';
import { getReportPriority } from '../../utils/truckUtils';
import { downloadOrOpenPdf } from '../../utils/pdfUtils';
import { DRUMMOND_LOGO_BASE64 } from '../../assets/drummondLogoBase64';
import { CAT_HEADER_LOGO_BASE64 } from '../../assets/catHeaderLogoBase64';
import TruckHistoryHeader from './History/TruckHistoryHeader';
import TruckHistoryTimeline from './History/TruckHistoryTimeline';

export default function TruckHistoryModal({ isOpen, onClose, initialTruckId, reports = [] }) {
  const [searchTruckId, setSearchTruckId] = useState(initialTruckId || '');
  const [isInputFocused, setIsInputFocused] = useState(false);

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

      const tableRows = truckHistory.map(r => [
        getItemDate(r),
        r.shift || 'N/A',
        r.mine || 'N/A',
        r.operatorName,
        r.systemCategory,
        r.failureDescription,
        r.reportTime,
        r.actualReturnTime || (r.status === 'OPERATIVO' ? 'Listo' : 'En Atención'),
        r.status
      ]);

      autoTable(doc, {
        startY: 34,
        head: [['Fecha', 'Turno', 'Sede', 'Operador', 'Sistema', 'Descripción', 'Reporte', 'Retorno', 'Estado']],
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
              if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
              }
              if (data.column.index === 8) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = priority.statusColor;
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
        <TruckHistoryHeader
          onClose={onClose}
          searchTruckId={searchTruckId}
          onSearchChange={(e) => setSearchTruckId(e.target.value)}
          currentTruckId={currentTruckId}
          hasHistory={truckHistory.length > 0}
          onExportPDF={handleExportTruckPDF}
          totalEvents={totalEvents}
          downEvents={downEvents}
          resolvedEvents={resolvedEvents}
          mostFrequentSystem={mostFrequentSystem}
        />

        <TruckHistoryTimeline
          truckHistory={truckHistory}
          currentTruckId={currentTruckId}
          getItemDate={getItemDate}
        />
      </div>
    </div>
  );
}
