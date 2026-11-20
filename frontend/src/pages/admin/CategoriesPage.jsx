// Categorías del panel: tabla, crear/editar en un modal, activar/desactivar y eliminar.
import { useState } from 'react';
import { deleteCategory, getCategories, updateCategory } from '../../api/categories';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import admin from './Admin.module.css';
import CategoryFormModal from './CategoryFormModal';

function CategoryRow({ category, onEdit, onToggle, onDelete }) {
  const hasProducts = category.productCount > 0;
  return (
    <tr>
      <td data-label="Nombre" className={admin.name}>
        {category.name}
      </td>
      <td data-label="Descripción" className={admin.muted}>
        {category.description || '-'}
      </td>
      <td data-label="Publicaciones" className={admin.mono}>
        {category.productCount}
      </td>
      <td data-label="Estado">
        <StatusBadge status={category.isActive ? 'activa' : 'inactiva'} />
      </td>
      <td className={admin.plain}>
        <div className={admin.actions}>
          <Button variant="secondary" size="sm" onClick={() => onEdit(category)}>
            Editar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onToggle(category)}>
            {category.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(category)}
            disabled={hasProducts}
            aria-describedby={hasProducts ? `cannot-delete-${category._id}` : undefined}
          >
            Eliminar
          </Button>
        </div>
        {hasProducts && (
          <p id={`cannot-delete-${category._id}`} className={admin.note}>
            No se puede eliminar: tiene {category.productCount}{' '}
            {category.productCount === 1 ? 'publicación' : 'publicaciones'}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function CategoriesPage() {
  const { showToast } = useToast();
  const { data: categories, loading, error, reload } = useFetch(() => getCategories({ all: true }), []);
  // editing: undefined = modal cerrado, null = alta, {...} = edición
  const [editing, setEditing] = useState(undefined);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function handleSaved(saved, wasEdit) {
    setEditing(undefined);
    showToast(wasEdit ? 'Categoría actualizada' : 'Categoría creada');
    reload();
  }

  async function handleToggle(category) {
    try {
      await updateCategory(category._id, { isActive: !category.isActive });
      showToast(category.isActive ? 'Categoría desactivada' : 'Categoría activada');
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCategory(toDelete._id);
      showToast('Categoría eliminada');
      setToDelete(null);
      reload();
    } catch (err) {
      // 409: tiene publicaciones asociadas (por ejemplo, si se cargó una mientras tanto).
      showToast(err.message, 'error');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  let content;
  if (loading && !categories) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (categories.length === 0) content = <EmptyState title="Todavía no hay categorías" />;
  else
    content = (
      <div className={admin.tableWrap}>
        <table className={admin.table}>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Descripción</th>
              <th scope="col">Publicaciones</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow
                key={category._id}
                category={category}
                onEdit={setEditing}
                onToggle={handleToggle}
                onDelete={setToDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      <div className={admin.toolbar}>
        <p className={admin.count}>
          {categories ? `${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}` : ''}
        </p>
        <Button variant="dark" onClick={() => setEditing(null)}>
          Nueva categoría
        </Button>
      </div>

      {content}

      <CategoryFormModal
        open={editing !== undefined}
        category={editing || null}
        onClose={() => setEditing(undefined)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar categoría"
        message={toDelete ? `¿Seguro que querés eliminar la categoría "${toDelete.name}"?` : ''}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
