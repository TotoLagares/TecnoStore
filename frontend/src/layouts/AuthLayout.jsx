// Layout de las pantallas de autenticación: panel centrado sobre el fondo papel.
import { Link, Outlet } from 'react-router-dom';
import Wordmark from '../components/Wordmark';
import styles from './AuthLayout.module.css';

export default function AuthLayout() {
  return (
    <main className={styles.wrapper}>
      <div className={styles.top}>
        <Wordmark />
      </div>
      <div className={styles.panel}>
        <Outlet />
      </div>
      <Link to="/" className={styles.back}>
        Volver al sitio
      </Link>
    </main>
  );
}
