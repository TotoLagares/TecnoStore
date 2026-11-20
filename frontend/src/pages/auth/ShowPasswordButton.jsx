// Botón "Mostrar"/"Ocultar" para ver lo que se escribe en una contraseña.
import styles from './Auth.module.css';

export default function ShowPasswordButton({ visible, onToggle, controls }) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-pressed={visible}
      aria-controls={controls}
    >
      {visible ? 'Ocultar' : 'Mostrar'}
    </button>
  );
}
