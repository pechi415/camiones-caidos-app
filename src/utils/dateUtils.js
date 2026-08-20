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
