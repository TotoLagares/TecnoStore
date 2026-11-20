import { IconClose } from '../../components/icons';
import { formatPrice } from '../../utils/format';
import styles from './CatalogPage.module.css';

// Chips de los filtros activos, cada uno con su botón para quitarlo.
export default function ActiveFilters({ filters, categories, onChange, onClear }) {
  const chips = [];
  if (filters.q) chips.push({ key: 'q', text: `"${filters.q}"` });
  if (filters.categoria) {
    const category = categories.find((item) => item._id === filters.categoria);
    chips.push({ key: 'categoria', text: category ? category.name : 'Categoría' });
  }
  if (filters.disponibilidad) {
    chips.push({ key: 'disponibilidad', text: filters.disponibilidad === 'disponible' ? 'Disponible' : 'Agotado' });
  }
  if (filters.min) chips.push({ key: 'min', text: `Desde ${formatPrice(filters.min)}` });
  if (filters.max) chips.push({ key: 'max', text: `Hasta ${formatPrice(filters.max)}` });

  if (chips.length === 0) return null;

  return (
    <div className={styles.chips}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={styles.chip}
          onClick={() => onChange({ [chip.key]: '' })}
          aria-label={`Quitar filtro ${chip.text}`}
        >
          {chip.text}
          <IconClose size={12} />
        </button>
      ))}
      <button type="button" className={styles.clear} onClick={onClear}>
        Limpiar filtros
      </button>
    </div>
  );
}
