// Catálogo: búsqueda, filtros, orden y paginación.
// Los filtros viven en la URL (?q=&categoria=&disponibilidad=&min=&max=&orden=&pagina=)
// para poder compartir el link y usar el botón "atrás" del navegador.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCategories } from '../../api/categories';
import { getProducts } from '../../api/products';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import ProductGrid from '../../components/ProductGrid';
import Spinner from '../../components/Spinner';
import { IconFilter } from '../../components/icons';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useFetch from '../../hooks/useFetch';
import ActiveFilters from './ActiveFilters';
import CatalogFilters from './CatalogFilters';
import styles from './CatalogPage.module.css';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'recent', text: 'Más recientes' },
  { value: 'price_asc', text: 'Menor precio' },
  { value: 'price_desc', text: 'Mayor precio' },
  { value: 'name_asc', text: 'Nombre (A-Z)' },
];

// Lee los filtros de la URL.
function readFilters(searchParams) {
  return {
    q: searchParams.get('q') || '',
    categoria: searchParams.get('categoria') || '',
    disponibilidad: searchParams.get('disponibilidad') || '',
    min: searchParams.get('min') || '',
    max: searchParams.get('max') || '',
    orden: searchParams.get('orden') || 'recent',
    pagina: Number(searchParams.get('pagina')) || 1,
  };
}

// Traduce los filtros de la URL (en español) a los query params de la API.
function toApiParams(filters) {
  return {
    search: filters.q,
    category: filters.categoria,
    availability: filters.disponibilidad,
    minPrice: filters.min,
    maxPrice: filters.max,
    sort: filters.orden,
    page: filters.pagina,
    limit: PAGE_SIZE,
  };
}

export default function CatalogPage() {
  useDocumentTitle('Catálogo');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  const [searchText, setSearchText] = useState(filters.q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories } = useFetch(() => getCategories(), []);
  const { data, loading, error, reload } = useFetch(
    () => getProducts(toApiParams(filters)),
    [searchParams.toString()]
  );

  // Cambia uno o más filtros en la URL. Cualquier cambio vuelve a la página 1,
  // salvo que lo que cambie sea justamente la página.
  function updateFilters(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined || value === null) next.delete(key);
      else next.set(key, value);
    }
    if (!('pagina' in changes)) next.delete('pagina');
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchText('');
    setSearchParams(new URLSearchParams());
  }

  // Debounce: la búsqueda se aplica 300 ms después de dejar de tipear.
  useEffect(() => {
    if (searchText.trim() === filters.q) return;
    const timer = setTimeout(() => updateFilters({ q: searchText.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Si la búsqueda cambia desde afuera (buscador del navbar, chips), se actualiza el input.
  useEffect(() => {
    if (searchText.trim() !== filters.q) setSearchText(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    updateFilters({ q: searchText.trim() });
  }

  function handlePageChange(page) {
    updateFilters({ pagina: page });
    window.scrollTo(0, 0);
  }

  const activeCount = [filters.q, filters.categoria, filters.disponibilidad, filters.min, filters.max].filter(Boolean).length;

  let results;
  if (loading) results = <Spinner />;
  else if (error) results = <ErrorState message={error.message} onRetry={reload} />;
  else if (data.items.length === 0)
    results = (
      <EmptyState
        title="No encontramos productos con esos filtros"
        message="Probá con otra búsqueda o quitá alguno de los filtros."
        action={
          activeCount > 0 && (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )
        }
      />
    );
  else
    results = (
      <>
        <ProductGrid products={data.items} columns={3} />
        <Pagination page={data.page} totalPages={data.totalPages} onChange={handlePageChange} />
      </>
    );

  return (
    <div className="container page">
      <div className={styles.head}>
        <span className="label">Catálogo</span>
        <h1 className={styles.title}>Todos los productos</h1>
        <form className={styles.search} onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="catalog-search" className="visually-hidden">
            Buscar productos
          </label>
          <input
            id="catalog-search"
            type="search"
            placeholder="Buscar productos"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
          />
          <Button type="submit" variant="dark" size="sm">
            Buscar
          </Button>
        </form>
      </div>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`} id="catalog-filters">
          <CatalogFilters filters={filters} categories={categories || []} onChange={updateFilters} />
        </aside>

        <section className={styles.results} aria-label="Resultados">
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.filtersButton}
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
            >
              <IconFilter />
              Filtros
              {activeCount > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {activeCount}
                </span>
              )}
            </button>
            <p className={styles.count} aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : '—'}
            </p>
            <div className={styles.sort}>
              <label htmlFor="catalog-sort" className="label">
                Ordenar por
              </label>
              <select
                id="catalog-sort"
                value={filters.orden}
                onChange={(event) => updateFilters({ orden: event.target.value === 'recent' ? '' : event.target.value })}
                className={styles.sortSelect}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.text}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ActiveFilters
            filters={filters}
            categories={categories || []}
            onChange={updateFilters}
            onClear={clearFilters}
          />

          {results}
        </section>
      </div>
    </div>
  );
}
