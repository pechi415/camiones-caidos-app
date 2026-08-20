import { jsPDF } from 'jspdf';

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
