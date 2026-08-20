// Utilidad de Asistente de Corrección Ortográfica con IA

// Diccionario de correcciones comunes de terminología técnica y minera en español
const TECHNICAL_DICTIONARY = {
  'aire acondicionado': 'Aire Acondicionado',
  'compresor de aire': 'Compresor de Aire',
  'no enfria': 'No enfría',
  'no arranca': 'No arranca',
  'fuga de aceite': 'Fuga de aceite',
  'fuga hidraulica': 'Fuga hidráulica',
  'presion baja': 'Presión baja',
  'alta temperatura': 'Alta temperatura',
  'suspension': 'Suspensión',
  'transmision': 'Transmisión',
  'direccion': 'Dirección',
  'ruido extraño': 'Ruido extraño',
  'ruido en motor': 'Ruido en motor',
  'radio vhf': 'Radio VHF',
  'bateria': 'Batería',
  'electrico': 'Eléctrico',
  'electricos': 'Eléctricos',
  'neumatico': 'Neumático',
  'neumaticos': 'Neumáticos',
  'freno': 'Freno',
  'frenos': 'Frenos',
  'chasis': 'Chasis',
  'mando final': 'Mando Final',
  'bahia': 'Bahía',
  'taller': 'Taller'
};

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
 * Capitaliza la primera letra de una oración y mantiene tildes/gramática
 */
export function capitalizeSentence(text) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  
  // Asegurar que la primera letra de la oración sea mayúscula
  let result = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  
  // Reemplazar ocurrencias del diccionario técnico
  Object.keys(TECHNICAL_DICTIONARY).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(regex, TECHNICAL_DICTIONARY[key]);
  });

  return result;
}

/**
 * Asistente IA completo para limpiar y corregir texto de cualquier input
 */
export function correctTextWithAI(text, isName = false) {
  if (!text) return '';
  if (isName) {
    return autoCapitalizeName(text);
  }
  return capitalizeSentence(text);
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
