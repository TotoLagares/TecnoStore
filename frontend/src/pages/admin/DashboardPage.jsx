// Resumen del panel (GET /stats): fichas con números, barras por categoría
// y las últimas consultas.
import { Link } from 'react-router-dom';
import { getStats } from '../../api/stats';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import useFetch from '../../hooks/useFetch';
import { formatDateTime } from '../../utils/format';
import admin from './Admin.module.css';
import styles from './DashboardPage.module.css';

function StatCard({ label, value, to }) {
  return (
    <li className={styles.stat}>
      <Link to={to} className={styles.statLink}>
        <span className="label">{label}</span>
        <span className={styles.statValue}>{value}</span>
      </Link>
    </li>
  );
}

// Barras horizontales hechas con CSS: el ancho es proporcional a la categoría con más publicaciones.
function CategoryBars({ items }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.categoryId} className={styles.barRow}>
          <span className={styles.barName}>{item.name}</span>
          <span className={styles.barTrack} aria-hidden="true">
            <span className={styles.barFill} style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

function LatestInquiries({ inquiries }) {
  if (inquiries.length === 0) return <EmptyState title="Todavía no hay consultas" />;

  return (
    <div className={admin.tableWrap}>
      <table className={admin.table}>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Nombre</th>
            <th scope="col">Asunto</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr key={inquiry._id}>
              <td data-label="Fecha" className={admin.mono}>
                {formatDateTime(inquiry.createdAt)}
              </td>
              <td data-label="Nombre">{inquiry.name}</td>
              <td data-label="Asunto">{inquiry.subject}</td>
              <td data-label="Estado">
                <StatusBadge status={inquiry.status} />
              </td>
              <td className={admin.plain}>
                <div className={admin.actions}>
                  <Link to={`/admin/consultas?id=${inquiry._id}`}>Ver consulta</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, loading, error, reload } = useFetch(getStats, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  return (
    <div className={styles.page}>
      <ul className={styles.stats}>
        <StatCard label="Publicaciones activas" value={stats.products.active} to="/admin/productos" />
        <StatCard label="Publicaciones ocultas" value={stats.products.inactive} to="/admin/productos" />
        <StatCard label="Agotadas" value={stats.products.outOfStock} to="/admin/productos" />
        <StatCard label="Destacadas" value={stats.products.featured} to="/admin/productos" />
        <StatCard label="Consultas pendientes" value={stats.inquiries.pendiente} to="/admin/consultas" />
      </ul>

      <div className={styles.columns}>
        <section className={admin.card} aria-labelledby="by-category">
          <div className={admin.cardHead}>
            <h2 id="by-category" className={admin.cardTitle}>
              Publicaciones por categoría
            </h2>
          </div>
          <div className={admin.cardBody}>
            {stats.productsByCategory.length > 0 ? (
              <CategoryBars items={stats.productsByCategory} />
            ) : (
              <p className={admin.muted}>Todavía no hay categorías.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="latest">
          <div className={styles.sectionHead}>
            <h2 id="latest" className={admin.cardTitle}>
              Últimas consultas
            </h2>
            <Link to="/admin/consultas" className={styles.more}>
              Ver todas
            </Link>
          </div>
          <LatestInquiries inquiries={stats.latestInquiries} />
        </section>
      </div>
    </div>
  );
}
