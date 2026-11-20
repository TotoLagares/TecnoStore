// Layout del panel: sidebar oscura (desktop) o barra superior con menú
// desplegable (debajo de 960px), topbar con el título y el usuario, y el contenido.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getInquiries } from '../api/inquiries';
import Wordmark from '../components/Wordmark';
import { IconClose, IconExternal, IconMenu } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import styles from './AdminLayout.module.css';

const LINKS = [
  { to: '/admin', text: 'Resumen', end: true },
  { to: '/admin/productos', text: 'Publicaciones' },
  { to: '/admin/categorias', text: 'Categorías' },
  { to: '/admin/consultas', text: 'Consultas' },
  { to: '/admin/comercio', text: 'Comercio' },
  { to: '/admin/usuarios', text: 'Usuarios' },
  { to: '/admin/perfil', text: 'Mi perfil' },
];

// Título de la sección según la ruta actual (topbar y pestaña del navegador).
function getSectionTitle(pathname) {
  if (pathname === '/admin/productos/nuevo') return 'Nueva publicación';
  if (pathname.endsWith('/editar')) return 'Editar publicación';
  if (pathname.startsWith('/admin/productos')) return 'Publicaciones';
  if (pathname.startsWith('/admin/categorias')) return 'Categorías';
  if (pathname.startsWith('/admin/consultas')) return 'Consultas';
  if (pathname.startsWith('/admin/comercio')) return 'Comercio';
  if (pathname.startsWith('/admin/usuarios')) return 'Usuarios';
  if (pathname.startsWith('/admin/perfil')) return 'Mi perfil';
  return 'Resumen';
}

function AdminNav({ label, pendingCount, onLogout }) {
  return (
    <nav aria-label={label} className={styles.nav}>
      <ul className={styles.links}>
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              {link.text}
              {link.to === '/admin/consultas' && pendingCount > 0 && (
                <span className={styles.badge}>
                  {pendingCount}
                  <span className="visually-hidden"> pendientes</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className={styles.navFooter}>
        <a href="/" target="_blank" rel="noopener noreferrer" className={styles.link}>
          Ver sitio <IconExternal size={14} />
        </a>
        <button type="button" className={styles.link} onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const title = getSectionTitle(pathname);
  useDocumentTitle(`${title} · Panel`);

  // Cantidad de consultas pendientes para el contador del menú.
  function refreshPending() {
    getInquiries({ status: 'pendiente', limit: 1 })
      .then((data) => setPendingCount(data.total))
      .catch(() => setPendingCount(0));
  }

  // Se actualiza al cambiar de sección; al navegar también se cierra el menú mobile.
  useEffect(() => {
    refreshPending();
    setMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Wordmark to="/admin" inverted />
          <span className={styles.brandLabel}>Panel</span>
        </div>
        <AdminNav label="Panel" pendingCount={pendingCount} onLogout={handleLogout} />
      </aside>

      <div className={styles.content}>
        <div className={styles.mobileBar}>
          <Wordmark to="/admin" inverted />
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
            Menú
            {pendingCount > 0 && !menuOpen && (
              <span className={styles.badge} aria-hidden="true">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
        {menuOpen && (
          <div id="admin-mobile-menu" className={styles.mobileMenu}>
            <AdminNav label="Panel (mobile)" pendingCount={pendingCount} onLogout={handleLogout} />
          </div>
        )}

        <header className={styles.topbar}>
          <div>
            <span className="label">Panel</span>
            <h1 className={styles.title}>{title}</h1>
          </div>
          {user && (
            <span className={styles.user}>
              {user.firstName} {user.lastName}
            </span>
          )}
        </header>

        <main className={styles.main}>
          {/* Las páginas pueden pedir que se actualice el contador de pendientes */}
          <Outlet context={{ refreshPending }} />
        </main>
      </div>
    </div>
  );
}
