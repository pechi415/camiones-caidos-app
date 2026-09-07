import React, { useState } from 'react';
import useModalScrollLock from '../../hooks/useModalScrollLock';
import { getLocalDateISO } from '../../utils/dateUtils';
import TruckHistoryHeader from './History/TruckHistoryHeader';
import TruckHistoryTimeline from './History/TruckHistoryTimeline';
import { exportTruckHistoryPdf } from './History/truckHistoryPdfExport';

export default function TruckHistoryModal({ isOpen, onClose, initialTruckId, reports = [] }) {
  const [searchTruckId, setSearchTruckId] = useState(initialTruckId || '');
  const [isInputFocused, setIsInputFocused] = useState(false);

  useModalScrollLock(isOpen);

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
    exportTruckHistoryPdf({
      truckHistory,
      currentTruckId
    });
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
