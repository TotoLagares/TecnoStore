// Detalle de una consulta. En desktop es un panel al costado de la lista;
// en mobile se muestra encima de todo (como un modal) y cierra con Escape.
import { useEffect } from 'react';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { IconClose } from '../../components/icons';
import { formatDateTime } from '../../utils/format';
import styles from './InquiriesPage.module.css';

export default function InquiryDetail({ inquiry, onStatusChange, onDelete, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const mailto = `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.subject}`)}`;

  return (
    <article className={styles.detail} aria-labelledby="inquiry-subject">
      <div className={styles.detailHead}>
        <StatusBadge status={inquiry.status} />
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar detalle">
          <IconClose />
        </button>
      </div>

      <div className={styles.detailBody}>
        <span className="label">{formatDateTime(inquiry.createdAt)}</span>
        <h2 id="inquiry-subject" className={styles.detailTitle}>
          {inquiry.subject}
        </h2>

        <dl className={styles.contact}>
          <div>
            <dt className="label">Nombre</dt>
            <dd>{inquiry.name}</dd>
          </div>
          <div>
            <dt className="label">Email</dt>
            <dd>
              <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
            </dd>
          </div>
          <div>
            <dt className="label">Teléfono</dt>
            <dd>{inquiry.phone ? <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a> : '-'}</dd>
          </div>
        </dl>

        <p className={styles.message}>{inquiry.message}</p>

        <a href={mailto} className={styles.reply}>
          Responder por email
        </a>
      </div>

      <div className={styles.detailFooter}>
        <div className={styles.statusField}>
          <label htmlFor="inquiry-status" className="label">
            Estado
          </label>
          <select
            id="inquiry-status"
            value={inquiry.status}
            onChange={(event) => onStatusChange(inquiry, event.target.value)}
          >
            <option value="pendiente">Pendiente</option>
            <option value="leida">Leída</option>
            <option value="respondida">Respondida</option>
          </select>
        </div>
        <Button variant="danger" size="sm" onClick={() => onDelete(inquiry)}>
          Eliminar
        </Button>
      </div>
    </article>
  );
}
