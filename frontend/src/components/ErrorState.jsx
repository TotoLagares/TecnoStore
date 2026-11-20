// Estado de error con botón "Reintentar".
import Button from './Button';
import { IconAlert } from './icons';
import styles from './ErrorState.module.css';

export default function ErrorState({ message = 'No pudimos cargar la información.', onRetry }) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.code}>
        <IconAlert size={14} /> ERROR
      </span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
