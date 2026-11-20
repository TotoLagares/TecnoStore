// Página 404: también la usa el detalle cuando el producto no existe.
import Button from '../../components/Button';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage({
  message = 'Puede que el link esté mal escrito o que la página ya no exista.',
}) {
  useDocumentTitle('Página no encontrada');

  return (
    <div className={`container page ${styles.wrapper}`}>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className="label">Error</span>
          <span className={styles.code}>404</span>
        </div>
        <div className={styles.body}>
          <h1 className={styles.title}>Página no encontrada</h1>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <Button to="/">Ir al inicio</Button>
            <Button to="/productos" variant="secondary">
              Ver catálogo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
