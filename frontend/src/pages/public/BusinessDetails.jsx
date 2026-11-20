// Ficha con los datos del comercio. La usan Nosotros y Contacto.
import styles from './BusinessDetails.module.css';

function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <dt className="label">{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

export default function BusinessDetails({ info, title = 'Datos del comercio' }) {
  const social = info.socialMedia || {};
  const hasSocial = social.instagram || social.facebook || social.whatsapp;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <dl className={styles.list}>
        {info.address && <Row label="Dirección">{info.address}</Row>}
        {info.phone && <Row label="Teléfono">{info.phone}</Row>}
        {info.email && (
          <Row label="Email">
            <a href={`mailto:${info.email}`}>{info.email}</a>
          </Row>
        )}
        {info.businessHours && info.businessHours.length > 0 && (
          <Row label="Horarios">
            {info.businessHours.map((line) => (
              <span key={line} className={styles.line}>
                {line}
              </span>
            ))}
          </Row>
        )}
        {hasSocial && (
          <Row label="Redes">
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noopener noreferrer" className={styles.line}>
                Instagram
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer" className={styles.line}>
                Facebook
              </a>
            )}
            {social.whatsapp && (
              <a
                href={`https://wa.me/${social.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.line}
              >
                WhatsApp
              </a>
            )}
          </Row>
        )}
      </dl>
    </div>
  );
}
