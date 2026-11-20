// Envuelve las rutas que piden sesión: sin sesión, redirige a /login?next=<ruta actual>.
// Con adminOnly, una cuenta de cliente va a /mi-cuenta (no puede entrar al panel).
// Si la sesión guardada venció, agrega expired=1 para mostrar el aviso.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, checking, sessionExpired, isAdmin } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    const expired = sessionExpired ? 'expired=1&' : '';
    return <Navigate to={`/login?${expired}next=${next}`} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/mi-cuenta" replace />;
  }

  return <Outlet />;
}
