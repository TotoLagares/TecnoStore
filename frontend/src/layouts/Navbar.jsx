// Barra de navegación del sitio público.
// En mobile, los links se esconden detrás del botón "Menú".
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Wordmark from '../components/Wordmark';
import { IconClose, IconMenu } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

const LINKS = [
  { to: '/', text: 'Inicio', end: true },
  { to: '/productos', text: 'Catálogo' },
  { to: '/nosotros', text: 'Nosotros' },
  { to: '/contacto', text: 'Contacto' },
];

function navClass({ isActive }) {
  return `${styles.link} ${isActive ? styles.active : ''}`;
}

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Al navegar, se cierra el menú mobile.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  function handleSearch(event) {
    event.preventDefault();
    const text = search.trim();
    navigate(text ? `/productos?q=${encodeURIComponent(text)}` : '/productos');
    setSearch('');
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const authActions = isAuthenticated ? (
    <>
      <Button to={isAdmin ? '/admin' : '/mi-cuenta'} variant="secondary" size="sm">
        {isAdmin ? 'Panel' : 'Mi cuenta'}
      </Button>
      <Button variant="secondary" size="sm" onClick={handleLogout}>
        Salir
      </Button>
    </>
  ) : (
    <Button to="/login" variant="dark" size="sm">
      Ingresar
    </Button>
  );

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Wordmark />

        <nav className={styles.desktopNav} aria-label="Principal">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.text}
            </NavLink>
          ))}
        </nav>

        <div className={styles.desktopRight}>
          <form className={styles.search} onSubmit={handleSearch} role="search">
            <label htmlFor="navbar-search" className="visually-hidden">
              Buscar en la tienda
            </label>
            <input
              id="navbar-search"
              type="search"
              placeholder="Buscar en la tienda"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.searchInput}
            />
          </form>
          {authActions}
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
          Menú
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className={styles.mobileMenu}>
          <div className="container">
            <form className={styles.search} onSubmit={handleSearch} role="search">
              <label htmlFor="mobile-search" className="visually-hidden">
                Buscar en la tienda
              </label>
              <input
                id="mobile-search"
                type="search"
                placeholder="Buscar en la tienda"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={styles.searchInput}
              />
            </form>
            <nav aria-label="Principal (mobile)">
              <ul className={styles.mobileLinks}>
                {LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} end={link.end} className={navClass}>
                      {link.text}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className={styles.mobileActions}>{authActions}</div>
          </div>
        </div>
      )}
    </header>
  );
}
