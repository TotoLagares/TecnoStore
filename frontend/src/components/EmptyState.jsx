// Estado vacío: cuando una lista no tiene resultados.
import styles from './EmptyState.module.css';

export default function EmptyState({ title = 'No hay nada para mostrar', message, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.code}>SIN RESULTADOS</span>
      <h2 className={styles.title}>{title}</h2>
      {message && <p className={styles.message}>{message}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
