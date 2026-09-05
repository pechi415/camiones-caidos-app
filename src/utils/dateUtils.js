// Utilidad central de fechas para evitar desfases por zona horaria UTC
export const getLocalDateISO = (dateInput = new Date()) => {
  if (!dateInput) return new Date().toLocaleDateString('sv-SE');
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString('sv-SE');
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calcula la Fecha Operativa considerando la jornada de turnos mineros:
 * - Turno Diurno: 06:00 a 17:59 (Fecha calendario actual)
 * - Turno Nocturno: 18:00 a 05:59 (De 00:00 a 05:59 pertenece a la fecha operativa del día anterior)
 * @param {Date|string|number} dateInput Fecha u hora a consultar
 * @returns {string} Fecha operativa en formato YYYY-MM-DD
 */
export const getOperationalDateISO = (dateInput = new Date()) => {
  if (!dateInput) return getOperationalDateISO(new Date());
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return getOperationalDateISO(new Date());
  }

  const hours = d.getHours();
  // Si la hora está entre 00:00 y 05:59 AM, corresponde a la segunda mitad del turno nocturno del día previo
  if (hours < 6) {
    const prevDay = new Date(d);
    prevDay.setDate(prevDay.getDate() - 1);
    return getLocalDateISO(prevDay);
  }

  return getLocalDateISO(d);
};

/**
 * Helper para convertir formato 12h (Ej: "07:30 AM", "02:15 p. m.") o 24h a "HH:mm" para input type="time"
 */
export const formatTimeTo24H = (timeStr) => {
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

/**
 * Helper para convertir "HH:mm" (Ej: "14:30") a "02:30 PM" para guardar en el estado
 */
export const formatTime12H = (time24) => {
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
