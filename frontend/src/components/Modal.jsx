// Ventana modal accesible: cierra con Escape o clic afuera y devuelve el foco
// al elemento que la abrió.
import { useEffect, useRef } from 'react';
import { IconClose } from './icons';
import styles from './Modal.module.css';

export default function Modal({ open, title, onClose, children, footer }) {
  const dialogRef = useRef(null);
  // Guardamos onClose en un ref para que el efecto no se repita en cada render
  // (si se repitiera, le sacaría el foco al input que se está usando).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    dialogRef.current.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
