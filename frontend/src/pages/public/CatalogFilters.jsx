// Panel de filtros del catálogo: categoría, disponibilidad y rango de precio.
// Recibe los filtros actuales (de la URL) y avisa los cambios con onChange.
import { useEffect, useState } from 'react';
import styles from './CatalogPage.module.css';

// Un número válido para el filtro de precio: vacío o un número >= 0.
function isValidPrice(value) {
  return value === '' || Number(value) >= 0;
}

export default function CatalogFilters({ filters, categories, onChange }) {
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);

  // Si los valores cambian desde afuera (chips, "Limpiar filtros"), se actualizan los inputs.
  useEffect(() => {
    setMin(filters.min);
    setMax(filters.max);
  }, [filters.min, filters.max]);

  // Igual que la búsqueda: el precio se aplica 300 ms después de dejar de tipear.
  useEffect(() => {
    const newMin = min.trim();
    const newMax = max.trim();
    if (newMin === filters.min && newMax === filters.max) return;
    if (!isValidPrice(newMin) || !isValidPrice(newMax)) return;
    const timer = setTimeout(() => onChange({ min: newMin, max: newMax }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  return (
    <div className={styles.filters}>
      <div className={styles.group}>
        <label htmlFor="filter-category" className="label">
          Categoría
        </label>
        <select
          id="filter-category"
          value={filters.categoria}
          onChange={(event) => onChange({ categoria: event.target.value })}
          className={styles.select}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name} ({category.productCount})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label htmlFor="filter-availability" className="label">
          Disponibilidad
        </label>
        <select
          id="filter-availability"
          value={filters.disponibilidad}
          onChange={(event) => onChange({ disponibilidad: event.target.value })}
          className={styles.select}
        >
          <option value="">Todas</option>
          <option value="disponible">Disponible</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>

      <div className={`${styles.group} ${styles.priceGroup}`}>
        <div className={styles.priceField}>
          <label htmlFor="filter-min" className="label">
            Precio mínimo
          </label>
          <input
            id="filter-min"
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            placeholder="0"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            className={styles.select}
          />
        </div>
        <div className={styles.priceField}>
          <label htmlFor="filter-max" className="label">
            Precio máximo
          </label>
          <input
            id="filter-max"
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            placeholder="Sin límite"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            className={styles.select}
          />
        </div>
      </div>
    </div>
  );
}
