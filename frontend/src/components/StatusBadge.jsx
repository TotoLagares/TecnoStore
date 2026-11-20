// Etiqueta de estado en mono (consultas, publicaciones y roles de usuario).
import styles from './StatusBadge.module.css';

// Texto y color de cada estado posible.
const STATUSES = {
  pendiente: { text: 'Pendiente', tone: 'warn' },
  leida: { text: 'Leída', tone: 'neutral' },
  respondida: { text: 'Respondida', tone: 'ok' },
  publicada: { text: 'Publicada', tone: 'ok' },
  oculta: { text: 'Oculta', tone: 'neutral' },
  activa: { text: 'Activa', tone: 'ok' },
  inactiva: { text: 'Inactiva', tone: 'neutral' },
  admin: { text: 'Admin', tone: 'ok' },
  cliente: { text: 'Cliente', tone: 'neutral' },
};

export default function StatusBadge({ status }) {
  const config = STATUSES[status] || { text: status, tone: 'neutral' };
  return <span className={`${styles.badge} ${styles[config.tone]}`}>{config.text}</span>;
}
