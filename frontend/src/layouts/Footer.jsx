// Pie del sitio con los datos reales del comercio (GET /business-info).
import { Link } from 'react-router-dom';
import Wordmark from '../components/Wordmark';
import { useBusinessInfo } from '../context/BusinessInfoContext';
import styles from './Footer.module.css';

export default function Footer() {
  const { info } = useBusinessInfo();
  const social = (info && info.socialMedia) || {};
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Wordmark inverted />
          {info && info.description && <p className={styles.description}>{info.description}</p>}
        </div>

        <div>
          <h2 className={styles.heading}>Contacto</h2>
          {info ? (
            <ul className={styles.list}>
              {info.address && <li>{info.address}</li>}
              {info.phone && <li>{info.phone}</li>}
              {info.email && (
                <li>
                  <a href={`mailto:${info.email}`}>{info.email}</a>
                </li>
              )}
              {(info.businessHours || []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Datos no disponibles por el momento.</p>
          )}
        </div>

        <nav aria-label="Pie de página">
          <h2 className={styles.heading}>Sitio</h2>
          <ul className={styles.list}>
            <li>
              <Link to="/productos">Catálogo</Link>
            </li>
            <li>
              <Link to="/nosotros">Nosotros</Link>
            </li>
            <li>
              <Link to="/contacto">Contacto</Link>
            </li>
            <li>
              <Link to="/login">Acceso administradores</Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className={styles.heading}>Redes</h2>
          <ul className={styles.list}>
            {social.instagram && (
              <li>
                <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
            )}
            {social.facebook && (
              <li>
                <a href={social.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </li>
            )}
            {social.whatsapp && (
              <li>
                <a href={`https://wa.me/${social.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
            )}
            {!social.instagram && !social.facebook && !social.whatsapp && (
              <li className={styles.muted}>Sin redes cargadas</li>
            )}
          </ul>
        </div>
      </div>

      <div className="container">
        <div className={styles.bottom}>
          <span>© {year} {info ? info.businessName : 'TecnoStore'}</span>
          <span>Precios en pesos argentinos (ARS)</span>
        </div>
      </div>
    </footer>
  );
}
