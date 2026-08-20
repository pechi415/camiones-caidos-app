import { getLocalDateISO, getOperationalDateISO } from './dateUtils';

/**
 * Determina si la ubicación del equipo es en CAMPO (fuera de taller).
 * Si la ubicación está vacía o no incluye la palabra 'taller', se considera en CAMPO.
 * @param {string} bayLocation Ubicación asignada
 * @returns {boolean} true si está en campo, false si está en taller
 */
export function isEquipmentInField(bayLocation) {
  if (!bayLocation) return true; // Si no tiene taller asignado, está en campo
  const locationLower = bayLocation.toLowerCase().trim();
  return !locationLower.includes('taller');
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
