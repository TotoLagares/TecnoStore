// Toasts: mensajes cortos abajo a la derecha que desaparecen a los 4 segundos.
// Uso: const { showToast } = useToast(); showToast('Guardado', 'success');
import { createContext, useContext, useState } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);
const DURATION_MS = 4000;
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function removeToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  // type: 'success' | 'error'
  function showToast(message, type = 'success') {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => removeToast(id), DURATION_MS);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.marker} aria-hidden="true" />
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
