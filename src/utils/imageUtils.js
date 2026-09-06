/**
 * Utilidades para procesamiento y compresión de imágenes en el cliente.
 */

/**
 * Comprime y redimensiona una imagen a formato JPEG Base64.
 * Mantiene la proporción original limitando la dimensión máxima a maxDim.
 *
 * @param {Blob|File} file - Archivo de imagen seleccionado por el usuario.
 * @param {number} [maxDim=200] - Dimensión máxima (ancho o alto) en píxeles.
 * @param {number} [quality=0.85] - Calidad de compresión JPEG entre 0 y 1.
 * @returns {Promise<string>} Promesa que resuelve con la cadena DataURL (Base64) de la imagen.
 */
export function compressImage(file, maxDim = 200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se proporcionó ningún archivo de imagen.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto 2D del canvas.'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => {
        reject(err || new Error('Error al cargar la imagen.'));
      };

      img.src = event.target.result;
    };

    reader.onerror = (err) => {
      reject(err || new Error('Error al leer el archivo de imagen.'));
    };

    reader.readAsDataURL(file);
  });
}
