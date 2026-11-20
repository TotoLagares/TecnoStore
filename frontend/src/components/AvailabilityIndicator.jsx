// Indicador de stock: cuadrado de 8px lleno (disponible) o solo con borde (agotado).
import styles from './AvailabilityIndicator.module.css';

export default function AvailabilityIndicator({ availability }) {
  const available = availability === 'disponible';
  return (
    <span className={`${styles.indicator} ${available ? styles.available : styles.soldOut}`}>
      <span className={styles.square} aria-hidden="true" />
      {available ? 'Disponible' : 'Agotado'}
    </span>
  );
}
