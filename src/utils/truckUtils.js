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
 * Convierte la hora de reporte ('07:30 AM', '02:15 PM', '14:20', etc.) a minutos relativos
 * al inicio del turno para garantizar un orden cronológico perfecto de más temprano a más tarde.
 * @param {object} report Objeto reporte
 * @returns {number} Minutos transcurridos desde el inicio del turno
 */
export function getReportTimeOrderValue(report) {
  const timeStr = report.reportTime || '';
  if (!timeStr) {
    if (report.createdAt) {
      return new Date(report.createdAt).getTime();
    }
    return 999999;
  }

  const str = String(timeStr).trim();
  const cleaned = str.toLowerCase().replace(/\./g, '').trim();
  const isPM = cleaned.includes('pm') || cleaned.includes('p m');
  const isAM = cleaned.includes('am') || cleaned.includes('a m');

  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 999999;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const isNight = report.shift === 'Nocturno' || (hours >= 18 || hours < 6);

  if (isNight) {
    // Turno Nocturno: inicia a las 18:00 (6:00 PM)
    if (hours >= 18) {
      return (hours - 18) * 60 + minutes;
    } else {
      return (hours + 6) * 60 + minutes;
    }
  } else {
    // Turno Diurno: inicia a las 06:00 AM
    if (hours >= 6) {
      return (hours - 6) * 60 + minutes;
    } else {
      return (hours + 18) * 60 + minutes;
    }
  }
}

/**
 * Ordena una lista de reportes:
 * 1. Jerarquía de prioridad:
 *    - 1° Prioridad Alta (DOWN en Campo)
 *    - 2° Prioridad Media (DOWN en Bahías)
 *    - 3° Prioridad Baja (DOWN en Taller)
 *    - 4° Operativos
 * 2. Dentro de cada prioridad: Se ordena por hora de reporte cronológica (el reportado más temprano primero).
 * 3. Desempate: Número de camión.
 *
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

    // Segundo orden: Hora de reporte (más temprano primero)
    const orderValA = getReportTimeOrderValue(a);
    const orderValB = getReportTimeOrderValue(b);
    if (orderValA !== orderValB) {
      return orderValA - orderValB;
    }

    // Tercer orden: Número de camión
    return String(a.truckId || '').localeCompare(String(b.truckId || ''));
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
