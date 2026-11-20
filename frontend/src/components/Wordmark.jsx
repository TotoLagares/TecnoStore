// Logo de texto: cuadrado de acento + "TECNOSTORE" en mono.
import { Link } from 'react-router-dom';
import styles from './Wordmark.module.css';

export default function Wordmark({ to = '/', inverted = false }) {
  return (
    <Link to={to} className={`${styles.wordmark} ${inverted ? styles.inverted : ''}`}>
      <span className={styles.square} aria-hidden="true" />
      TECNOSTORE
    </Link>
  );
}
