// Utilidad de Asistente de Corrección Ortográfica y Normalización con IA Minera

// Diccionario de correcciones y tildes técnicas en minería y mecánica automotriz/pesada
const TECHNICAL_DICTIONARY = {
  'aire acondicionado': 'aire acondicionado',
  'compresor de aire': 'compresor de aire',
  'no enfria': 'no enfría',
  'no arranca': 'no arranca',
  'fuga de aceite': 'fuga de aceite',
  'fuga hidraulica': 'fuga hidráulica',
  'fuga hidraulicas': 'fuga hidráulica',
  'fugas hidraulicas': 'fugas hidráulicas',
  'hidraulico': 'hidráulico',
  'hidraulica': 'hidráulica',
  'hidraulicos': 'hidráulicos',
  'hidraulicas': 'hidráulicas',
  'presion baja': 'presión baja',
  'presion': 'presión',
  'presiones': 'presiones',
  'alta temperatura': 'alta temperatura',
  'suspension': 'suspensión',
  'suspensiones': 'suspensiones',
  'transmision': 'transmisión',
  'transmisiones': 'transmisiones',
  'direccion': 'dirección',
  'ruido extraño': 'ruido extraño',
  'ruido en motor': 'ruido en motor',
  'bateria': 'batería',
  'baterias': 'baterías',
  'electrico': 'eléctrico',
  'electrica': 'eléctrica',
  'electricos': 'eléctricos',
  'electricas': 'eléctricas',
  'electronico': 'electrónico',
  'electronica': 'electrónica',
  'electronicos': 'electrónicos',
  'neumatico': 'neumático',
  'neumaticos': 'neumáticos',
  'freno': 'freno',
  'frenos': 'frenos',
  'chasis': 'chasis',
  'mando final': 'mando final',
  'mandos finales': 'mandos finales',
  'valvula': 'válvula',
  'valvulas': 'válvulas',
  'camara': 'cámara',
  'camaras': 'cámaras',
  'cilindro': 'cilindro',
  'cilindros': 'cilindros',
  'refrigeracion': 'refrigeración',
  'lubricacion': 'lubricación',
  'calibracion': 'calibración',
  'inyeccion': 'inyección',
  'perdida': 'pérdida',
  'averia': 'avería',
  'averias': 'averías',
  'mecanico': 'mecánico',
  'mecanica': 'mecánica',
  'mecanicos': 'mecánicos',
  'mecanicas': 'mecánicas',
  'linea de aire': 'línea de aire',
  'lineas de aire': 'líneas de aire',
  'linea hidraulica': 'línea hidráulica',
  'lineas hidraulicas': 'líneas hidráulicas',
  'modulo': 'módulo',
  'modulos': 'módulos',
  'sensor': 'sensor',
  'sensores': 'sensores',
  'alternador': 'alternador',
  'motor de arranque': 'motor de arranque',
  'turbo': 'turbo',
  'radiador': 'radiador'
};

// Siglas y acrónimos técnicos que siempre deben ir en MAYÚSCULAS
const TECHNICAL_ACRONYMS = [
  'VHF', 'CAT', 'ECM', 'PTO', 'A/C', 'AC', 'GPS', 'CAN', 'RPM', 
  'ABS', 'HVAC', 'LED', 'VDC', 'VAC', 'SOS', 'VIMS', 'TPMS', 'OEM', 'UI'
];

/**
 * Capitaliza nombres propios (Ej: "juan carlos perez" -> "Juan Carlos Perez")
 */
export function autoCapitalizeName(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normaliza y formatea descripciones de fallas técnicas:
 * 1. Pasa de mayúsculas sostenidas a minúsculas limpias.
 * 2. Capitaliza la primera letra de la oración.
 * 3. Aplica tildes y ortografía correcta a términos técnicos.
 * 4. Preserva siglas técnicas en mayúsculas (VHF, CAT, ECM, PTO, etc.).
 */
export function formatFailureDescription(text) {
  if (!text) return '';
  let trimmed = text.trim();
  if (trimmed.length === 0) return '';

  // Limpiar espacios múltiples
  trimmed = trimmed.replace(/\s+/g, ' ');

  // Convertir a minúsculas primero para estandarizar
  let lower = trimmed.toLowerCase();

  // Aplicar diccionario de correcciones ortográficas y tildes
  Object.keys(TECHNICAL_DICTIONARY).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    lower = lower.replace(regex, TECHNICAL_DICTIONARY[key]);
  });

  // Asegurar que la primera letra de la oración sea mayúscula
  let result = lower.charAt(0).toUpperCase() + lower.slice(1);

  // Restaurar acrónimos técnicos en mayúsculas
  TECHNICAL_ACRONYMS.forEach(acronym => {
    const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
    result = result.replace(regex, acronym);
  });

  return result;
}

/**
 * Normaliza abreviaturas y jerga de ubicaciones mineras a formato estándar:
 * - Bahías: "bh 2", "bh-2", "bay 2", "bahia 2" -> "Bahía 2"
 * - Talleres: "tllr central", "tlr 1", "taller" -> "Taller Central", "Taller 1"
 * - Botaderos: "btd 4", "bot 4", "botadero 4" -> "Botadero 4"
 * - Rampas: "rmp 1", "rampa 1" -> "Rampa 1"
 * - Palas: "pl 8", "p-14", "pala 8" -> "Pala 8", "Pala 14"
 * - Vías / Cruces / Frentes: "via 10" -> "Vía 10", "crce 2" -> "Cruce 2", "frnte 4" -> "Frente 4"
 */
export function normalizeLocation(locationStr) {
  if (!locationStr) return '';
  let clean = locationStr.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const locLower = clean.toLowerCase();

  // 1. Normalización de Bahías
  // Coincide con bahias, bahia, bh 1, bh-1, bh1, bha 1, bay 1, b/h 1, etc.
  const bayMatch = locLower.match(/^(?:bah[ií]as|bah[ií]a|bha|b\/h|bh|bay)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (bayMatch) {
    const suffix = bayMatch[1] ? bayMatch[1].trim() : '';
    if (suffix) {
      // Capitalizar sufijo (ej: "1", "central", "norte")
      const capSuffix = suffix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `Bahía ${capSuffix}`;
    }
    return 'Bahía';
  }

  // 2. Normalización de Talleres
  const tallerMatch = locLower.match(/^(?:talleres|taller|tllr|tallr|tlr)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (tallerMatch) {
    const suffix = tallerMatch[1] ? tallerMatch[1].trim() : '';
    if (suffix) {
      const capSuffix = suffix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `Taller ${capSuffix}`;
    }
    return 'Taller Central';
  }

  // 3. Normalización de Botaderos
  const botaderoMatch = locLower.match(/^(?:botaderos|botadero|btdr|btd|bot)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (botaderoMatch) {
    const suffix = botaderoMatch[1] ? botaderoMatch[1].trim() : '';
    if (suffix) {
      const capSuffix = suffix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `Botadero ${capSuffix}`;
    }
    return 'Botadero';
  }

  // 4. Normalización de Rampas
  const rampaMatch = locLower.match(/^(?:rampas|rampa|rmpa|rmp)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (rampaMatch) {
    const suffix = rampaMatch[1] ? rampaMatch[1].trim() : '';
    if (suffix) {
      const capSuffix = suffix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return `Rampa ${capSuffix}`;
    }
    return 'Rampa';
  }

  // 5. Normalización de Palas
  const palaMatch = locLower.match(/^(?:palas|pala|pl|p-)[\s\-_]*([0-9]+[a-z0-9]*.*)?$/i);
  if (palaMatch) {
    const suffix = palaMatch[1] ? palaMatch[1].trim() : '';
    if (suffix) {
      return `Pala ${suffix.toUpperCase()}`;
    }
    return 'Pala';
  }

  // 6. Normalización de Vías, Cruces y Frentes
  const viaMatch = locLower.match(/^(?:v[ií]as|v[ií]a)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (viaMatch && viaMatch[1]) {
    return `Vía ${viaMatch[1].toUpperCase()}`;
  }
  const cruceMatch = locLower.match(/^(?:cruces|cruce|crce)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (cruceMatch && cruceMatch[1]) {
    return `Cruce ${cruceMatch[1].toUpperCase()}`;
  }
  const frenteMatch = locLower.match(/^(?:frentes|frente|frnte)[\s\-_]*([a-z0-9]+.*)?$/i);
  if (frenteMatch && frenteMatch[1]) {
    return `Frente ${frenteMatch[1].toUpperCase()}`;
  }

  // Si contiene la palabra bahia dentro del texto libre (ej: "en bahia 3")
  if (locLower.includes('bahia') || locLower.includes('bahía') || /\bbh\b/i.test(locLower)) {
    return clean
      .replace(/\bbahia\b/gi, 'Bahía')
      .replace(/\bbahías\b/gi, 'Bahías')
      .replace(/\bbh\b/gi, 'Bahía')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Formato general tipo Título/Oración limpia
  return clean
    .split(/\s+/)
    .map(w => {
      // Si es un acrónimo o número con guión (ej: KM-12, P-14)
      if (/^[a-z]+-[0-9]+/i.test(w) || TECHNICAL_ACRONYMS.includes(w.toUpperCase())) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Asistente IA completo para limpiar y corregir texto de cualquier input
 * @param {string} text Texto a corregir
 * @param {boolean|string} mode Modo de corrección: 'name' | 'location' | 'failure' | true | false
 */
export function correctTextWithAI(text, mode = false) {
  if (!text) return '';
  if (mode === 'name' || mode === true) {
    return autoCapitalizeName(text);
  }
  if (mode === 'location') {
    return normalizeLocation(text);
  }
  return formatFailureDescription(text);
}

/**
 * Extrae el Primer Nombre y el Primer Apellido de un nombre completo para optimizar espacio.
 * - 4+ palabras (Ej: "Alexander Francisco Ramirez Cordoba") -> "Alexander Ramirez"
 * - 3 palabras (Ej: "Alexander Ramirez Cordoba") -> "Alexander Ramirez"
 * - 2 palabras (Ej: "Efrain Tafur") -> "Efrain Tafur"
 */
export function getShortName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2 || parts.length === 3) {
    return `${parts[0]} ${parts[1]}`;
  }
  return `${parts[0]} ${parts[2]}`;
}
