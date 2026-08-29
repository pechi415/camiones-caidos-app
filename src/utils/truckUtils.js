import { getLocalDateISO, getOperationalDateISO } from './dateUtils.js';

/**
 * Determina el nivel de prioridad, coloración y estilo de un reporte para visualización y PDF.
 * Jerarquía de atención:
 * 1. 🔴 ALTA (Crítica): DOWN en CAMPO (Botaderos, Rampas, Palas, Vías, Frentes, etc. fuera de bahía/taller)
 * 2. 🟡 MEDIA: DOWN en BAHÍAS (Bahía 1, Bahía 2, etc.)
 * 3. ⚪ BAJA: DOWN en TALLERES (Taller Central, Taller Mantenimiento - ya en manos de mecánicos)
 * 4. 🟢 OPERATIVO: Equipo recuperado y operativo
 *
 * @param {object|string} report Objeto reporte o ubicación
 * @returns {object} { level, rank, label, statusBadge, fillColor, textColor, badgeColor, borderColor }
 */
export function getReportPriority(report) {
  const status = (typeof report === 'object' ? report?.status : 'DOWN') || 'DOWN';
  const location = (typeof report === 'object' ? (report?.bayLocation || report?.location || '') : (typeof report === 'string' ? report : '')).toLowerCase().trim();

  // Si está OPERATIVO: fila blanca con texto de estado OPERATIVO en verde
  if (status === 'OPERATIVO') {
    return {
      level: 'OPERATIVO',
      rank: 4,
      label: 'OPERATIVO',
      statusText: 'OPERATIVO',
      fillColor: [255, 255, 255], // Fila blanca
      textColor: [15, 23, 42],      // Texto oscuro
      statusColor: [16, 185, 129],  // Verde esmeralda #10b981
      badgeColor: [16, 185, 129],
      borderColor: [167, 243, 208]
    };
  }

  // 1. Si está en TALLER (prioridad baja: fila blanca con DOWN en rojo)
  const isTaller = location.includes('taller') || /\btll?r\b/i.test(location);
  if (isTaller) {
    return {
      level: 'BAJA',
      rank: 3,
      label: 'TALLER',
      statusText: 'DOWN',
      fillColor: [255, 255, 255], // Fila blanca
      textColor: [15, 23, 42],     // Texto oscuro
      statusColor: [220, 38, 38],  // DOWN en rojo
      badgeColor: [100, 116, 139],
      borderColor: [203, 213, 225]
    };
  }

  // 2. Si está en BAHÍA (prioridad media: fila ámbar suave con DOWN en rojo)
  const isBahia = location.includes('bahia') || location.includes('bahía') || /\b(?:bh|bay)\b/i.test(location);
  if (isBahia) {
    return {
      level: 'MEDIA',
      rank: 2,
      label: 'BAHÍA',
      statusText: 'DOWN',
      fillColor: [254, 243, 199], // Ámbar suave #fef3c7
      textColor: [146, 64, 14],    // Ámbar oscuro #92400e
      statusColor: [220, 38, 38],  // DOWN en rojo
      badgeColor: [217, 119, 6],
      borderColor: [253, 230, 138]
    };
  }

  // 3. Cualquier otra ubicación (Campo: Botaderos, Rampas, Palas, Vías, etc.) -> PRIORIDAD ALTA
  // Fila con rojo más notorio y vivo
  return {
    level: 'ALTA',
    rank: 1,
    label: 'CAMPO',
    statusText: 'DOWN',
    fillColor: [254, 190, 190], // Rojo más vivo y notorio #febebe
    textColor: [153, 27, 27],    // Rojo oscuro
    statusColor: [185, 28, 28],  // DOWN en rojo intenso
    badgeColor: [220, 38, 38],
    borderColor: [254, 150, 150]
  };
}

/**
 * Determina si la ubicación del equipo es en CAMPO (fuera de taller y de bahías).
 * @param {string} bayLocation Ubicación asignada
 * @returns {boolean} true si está en campo, false si está en taller o bahía
 */
export function isEquipmentInField(bayLocation) {
  const priority = getReportPriority({ status: 'DOWN', bayLocation });
  return priority.level === 'ALTA';
}

/**
 * Ordena una lista de reportes según la jerarquía de prioridad:
 * 1. Prioridad Alta (DOWN en Campo)
 * 2. Prioridad Media (DOWN en Bahías)
 * 3. Prioridad Baja (DOWN en Taller)
 * 4. Operativos
 * 
 * Si tienen la misma prioridad, ordena secundariamente por hora de reporte (más recientes primero).
 * @param {Array} reports Lista de reportes
 * @returns {Array} Nueva lista ordenada
 */
export function sortReportsByPriority(reports = []) {
  if (!Array.isArray(reports)) return [];
  return [...reports].sort((a, b) => {
    const priorityA = getReportPriority(a);
    const priorityB = getReportPriority(b);

    if (priorityA.rank !== priorityB.rank) {
      return priorityA.rank - priorityB.rank;
    }

    const timeA = a.reportTime || a.createdAt || '';
    const timeB = b.reportTime || b.createdAt || '';
    return timeB.localeCompare(timeA);
  });
}

/**
 * Determina el turno (Diurno o Nocturno) según la hora local del sistema.
 * Turno Diurno: 06:00 AM a 05:59 PM (06:00 a 17:59)
 * Turno Nocturno: 06:00 PM a 05:59 AM (18:00 a 05:59)
 * @param {Date|string|number} dateInput Fecha/Hora opcional
 * @returns {string} 'Diurno' o 'Nocturno'
 */
export function getCurrentShiftByTime(dateInput = new Date()) {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const hour = d.getHours();
  return (hour >= 6 && hour < 18) ? 'Diurno' : 'Nocturno';
}

/**
 * Determina si un reporte fue registrado en una fecha/turno anterior a la vista activa.
 * Utiliza la fecha operativa minera para evitar cortes incorrectos a medianoche.
 * @param {object} report Objeto reporte
 * @param {string} activeShift Turno activo ('Diurno'|'Nocturno')
 * @param {string} selectedDate Fecha activa ('YYYY-MM-DD')
 * @returns {boolean} true si el reporte pertenece a un turno previo
 */
export function isReportPreviousToCurrent(report, activeShift, selectedDate) {
  const reportDateStr = report.date || (report.createdAt ? getOperationalDateISO(report.createdAt) : '');
  if (!reportDateStr || !selectedDate) return false;

  // Si la fecha operativa del reporte es menor que la fecha activa
  if (reportDateStr < selectedDate) {
    return true;
  }

  // Si es la misma fecha operativa pero el reporte ocurrió en turno Diurno y la vista está en turno Nocturno
  if (reportDateStr === selectedDate) {
    if (report.shift === 'Diurno' && activeShift === 'Nocturno') {
      return true;
    }
  }

  return false;
}
