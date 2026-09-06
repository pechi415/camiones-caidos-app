import { jsPDF } from 'jspdf';
import { DRUMMOND_LOGO_BASE64 } from '../assets/drummondLogoBase64';
import { CAT_HEADER_LOGO_BASE64 } from '../assets/catHeaderLogoBase64';

/**
 * Renderiza el encabezado corporativo estándar de Drummond Ltd. en un documento jsPDF horizontal (A4 landscape).
 *
 * @param {import('jspdf').jsPDF} doc - Instancia del documento jsPDF.
 * @param {Object} options
 * @param {string} options.subtitle - Subtítulo del informe (ej: 'Reporte de Camiones Caídos' o 'Bitácora Histórica de Camiones Caídos').
 * @param {string} options.metadataText - Cadena de datos de contexto centrados a Y=24.
 * @param {string} [options.kpiText] - Texto del bloque resumen de KPIs. Si no se provee, no se dibuja la barra de KPIs.
 * @param {number} [options.kpiY=32] - Coordenada Y de inicio del bloque de KPIs (32 o 33).
 * @param {string} [options.mainTitle='DEPARTAMENTO DE CAMIONES'] - Título principal opcional.
 * @returns {number} Coordenada Y sugerida para iniciar la siguiente sección (tablas).
 */
export const renderCorporatePdfHeader = (doc, {
  subtitle,
  metadataText,
  kpiText = null,
  kpiY = 32,
  mainTitle = 'DEPARTAMENTO DE CAMIONES'
}) => {
  const pageWidth = 297;
  const centerX = pageWidth / 2;

  // 1. Encabezado Corporativo en Fondo Blanco Limpio
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Línea divisora inferior sutil
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(0, 30, pageWidth, 30);

  // 2. Logo Oficial Izquierda (Drummond Ltd. Colombia)
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

  // 3. Título y Subtítulo Centrados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(185, 28, 28); // Rojo Corporativo Drummond
  doc.text(mainTitle, centerX, 9, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(subtitle, centerX, 15, { align: 'center' });

  // 4. Datos Generales del Encabezado en Una Sola Línea Centrada
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(metadataText, centerX, 24, { align: 'center' });

  // 5. Resumen Ejecutivo KPIs (si se proporciona)
  if (kpiText) {
    doc.setFillColor(243, 235, 221);
    doc.rect(14, kpiY, 269, 12, 'F');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(11, 13, 16);
    const textY = kpiY === 33 ? 41 : 39.5;
    doc.text(kpiText, 18, textY);

    return kpiY === 33 ? 49 : 50;
  }

  return 36;
};

/**
 * Helper to safely download or open a jsPDF document on all platforms (iOS Safari, Android, Desktop).
 */
export const downloadOrOpenPdf = (doc, fileName) => {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // In iOS Safari, doc.save() or data URI click can fail or be blocked by WebKit.
    // Opening a Blob URL in a window/tab opens Safari's native PDF viewer seamlessly.
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = blobUrl;
      }
    } catch (e) {
      console.warn('Fallback to doc.save on iOS:', e);
      doc.save(fileName);
    }
  } else {
    // Android / Desktop native save
    doc.save(fileName);
  }
};

/**
 * Helper to share a jsPDF document via Web Share API (Mobile Native Share Sheet).
 * Uses a single-step synchronous file creation to preserve the user gesture context in iOS Safari & Android Chrome.
 */
export const sharePdfDoc = async (doc, fileName, title = 'Reporte de Camiones Caídos', text = 'Adjunto reporte de Camiones Caídos') => {
  try {
    const pdfArrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const file = new File([blob], cleanFileName, { type: 'application/pdf', lastModified: Date.now() });

    const canShareFiles =
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (navigator.share && canShareFiles) {
      await navigator.share({
        files: [file],
        title: title,
        text: text
      });
      return true;
    } else {
      // Fallback if browser/context does not support file sharing
      downloadOrOpenPdf(doc, cleanFileName);
      return false;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled share sheet (normal behavior)
      return false;
    }
    console.warn('Web Share failed, falling back to download/open:', err);
    downloadOrOpenPdf(doc, fileName);
    return false;
  }
};
