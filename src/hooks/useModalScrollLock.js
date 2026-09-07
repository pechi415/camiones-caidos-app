import { useEffect } from 'react';

/**
 * Custom hook para bloquear y restaurar el scroll del body cuando un modal está abierto.
 * Sincroniza la clase global 'modal-open' definida en index.css.
 *
 * @param {boolean} isOpen - Indica si algún modal está activo.
 */
export default function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);
}
