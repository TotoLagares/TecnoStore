// Indicador de carga: un cuadrado que rota + "Cargando…".
// Es la única animación del sitio y se desactiva con prefers-reduced-motion.
import styles from './Spinner.module.css';

export default function Spinner() {
  return (
    <div className={styles.spinner} role="status">
      <span className={styles.square} aria-hidden="true" />
      <span className={styles.text}>Cargando…</span>
    </div>
  );
}
