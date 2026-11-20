// Listado de publicaciones del panel: filtros, tabla, publicar/ocultar y eliminar.
import { useEffect, useState } from 'react';
import { getCategories } from '../../api/categories';
import { deleteProduct, getAdminProducts, toggleProductActive } from '../../api/products';
import AvailabilityIndicator from '../../components/AvailabilityIndicator';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Field from '../../components/Field';
import ImageWithFallback from '../../components/ImageWithFallback';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import { formatPrice } from '../../utils/format';
import admin from './Admin.module.css';

const PAGE_SIZE = 10;

function ProductRow({ product, onToggle, onDelete, busy }) {
  return (
    <tr>
      <td className={admin.plain}>
        <ImageWithFallback src={product.images[0]} alt="" className={admin.thumb} />
      </td>
      <td data-label="Nombre" className={admin.name}>
        {product.name}
      </td>
      <td data-label="Categoría">{product.category ? product.category.name : '-'}</td>
      <td data-label="Precio" className={admin.mono}>
        {formatPrice(product.price)}
      </td>
      <td data-label="Disponibilidad">
        <AvailabilityIndicator availability={product.availability} />
      </td>
      <td data-label="Destacado">{product.featured ? 'Sí' : 'No'}</td>
      <td data-label="Estado">
        <StatusBadge status={product.isActive ? 'publicada' : 'oculta'} />
      </td>
      <td className={admin.plain}>
        <div className={admin.actions}>
          <Button to={`/admin/productos/${product._id}/editar`} variant="secondary" size="sm">
            Editar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onToggle(product)} disabled={busy}>
            {product.isActive ? 'Ocultar' : 'Publicar'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(product)}>
            Eliminar
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '', isActive: '', availability: '' });
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const { data: categories } = useFetch(() => getCategories({ all: true }), []);
  const { data, loading, error, reload, setData } = useFetch(
    () => getAdminProducts({ ...filters, page, limit: PAGE_SIZE }),
    [filters, page]
  );

  // Búsqueda con debounce de 300 ms (igual que en el catálogo público).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim() !== filters.search) changeFilter('search', searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function changeFilter(name, value) {
    setFilters({ ...filters, [name]: value });
    setPage(1);
  }

  // Publicar/Ocultar: se actualiza solo la fila, sin recargar toda la tabla.
  async function handleToggle(product) {
    setBusyId(product._id);
    try {
      const updated = await toggleProductActive(product._id);
      setData({ ...data, items: data.items.map((item) => (item._id === updated._id ? updated : item)) });
      showToast(updated.isActive ? 'Publicación publicada' : 'Publicación ocultada');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProduct(toDelete._id);
      showToast('Publicación eliminada');
      setToDelete(null);
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);

  let content;
  if (loading && !data) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (data.items.length === 0)
    content = hasFilters ? (
      <EmptyState title="No hay publicaciones con esos filtros" />
    ) : (
      <EmptyState
        title="Todavía no hay publicaciones"
        action={
          <Button to="/admin/productos/nuevo" variant="dark">
            Nueva publicación
          </Button>
        }
      />
    );
  else
    content = (
      <>
        <p className={admin.count}>
          {data.total} {data.total === 1 ? 'publicación' : 'publicaciones'}
        </p>
        <div className={admin.tableWrap}>
          <table className={admin.table}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Imagen</span>
                </th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Precio</th>
                <th scope="col">Disponibilidad</th>
                <th scope="col">Destacado</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <ProductRow
                  key={product._id}
                  product={product}
                  onToggle={handleToggle}
                  onDelete={setToDelete}
                  busy={busyId === product._id}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      </>
    );

  return (
    <>
      <div className={admin.toolbar}>
        <div className={admin.filters}>
          <Field
            label="Buscar"
            name="search"
            type="search"
            placeholder="Nombre o descripción"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <Field
            label="Categoría"
            name="category"
            as="select"
            value={filters.category}
            onChange={(event) => changeFilter('category', event.target.value)}
          >
            <option value="">Todas</option>
            {(categories || []).map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </Field>
          <Field
            label="Estado"
            name="isActive"
            as="select"
            value={filters.isActive}
            onChange={(event) => changeFilter('isActive', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Publicada</option>
            <option value="false">Oculta</option>
          </Field>
          <Field
            label="Disponibilidad"
            name="availability"
            as="select"
            value={filters.availability}
            onChange={(event) => changeFilter('availability', event.target.value)}
          >
            <option value="">Todas</option>
            <option value="disponible">Disponible</option>
            <option value="agotado">Agotado</option>
          </Field>
        </div>
        <Button to="/admin/productos/nuevo" variant="dark">
          Nueva publicación
        </Button>
      </div>

      {content}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar publicación"
        message={toDelete ? `¿Seguro que querés eliminar "${toDelete.name}"? No se puede deshacer.` : ''}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
