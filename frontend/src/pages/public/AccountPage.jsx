// Mi cuenta: perfil de un usuario cliente (no tiene acceso al panel).
// Reutiliza el mismo formulario que el perfil del panel.
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import ProfilePage from '../admin/ProfilePage';
import styles from './AccountPage.module.css';

export default function AccountPage() {
  useDocumentTitle('Mi cuenta');
  const { isAdmin, updateUser } = useAuth();

  // Se vuelven a pedir los datos por si un admin le cambió el rol mientras
  // tenía la sesión abierta (si ahora es admin, el botón pasa a ser "Panel").
  useEffect(() => {
    getMe()
      .then((me) => updateUser(me))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un admin tiene su perfil dentro del panel.
  if (isAdmin) return <Navigate to="/admin/perfil" replace />;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Mi cuenta</h1>
      </div>
      <ProfilePage />
    </div>
  );
}
