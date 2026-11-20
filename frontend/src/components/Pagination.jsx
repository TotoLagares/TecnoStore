// Paginación: Anterior / números / Siguiente.
// Muestra la primera, la última y las páginas cercanas a la actual.
import styles from './Pagination.module.css';

function getPages(page, totalPages) {
  const pages = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) {
      pages.push(n);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return pages;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Anterior
      </button>

      <span className={styles.status}>
        Página {page} de {totalPages}
      </span>

      <ul className={styles.pages}>
        {getPages(page, totalPages).map((item, index) =>
          item === '…' ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={`${styles.page} ${item === page ? styles.current : ''}`}
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
      </button>
    </nav>
  );
}
