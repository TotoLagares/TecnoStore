// Consultas del panel: pestañas por estado, búsqueda, lista y detalle.
// La consulta abierta va en la URL (?id=...) para poder linkearla desde el Resumen.
import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { deleteInquiry, getInquiries, getInquiry, updateInquiryStatus } from '../../api/inquiries';
import { getStats } from '../../api/stats';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Field from '../../components/Field';
import Pagination from '../../components/Pagination';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import useFetch from '../../hooks/useFetch';
import { formatDateTime } from '../../utils/format';
import InquiryDetail from './InquiryDetail';
import styles from './InquiriesPage.module.css';

const TABS = [
  { value: '', text: 'Todas', countKey: 'total' },
  { value: 'pendiente', text: 'Pendientes', countKey: 'pendiente' },
  { value: 'leida', text: 'Leídas', countKey: 'leida' },
  { value: 'respondida', text: 'Respondidas', countKey: 'respondida' },
];

export default function InquiriesPage() {
  const { showToast } = useToast();
  const { refreshPending } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');

  const [status, setStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useFetch(getStats, []);
  const list = useFetch(() => getInquiries({ status, search, page, limit: 20 }), [status, search, page]);
  const detail = useFetch(
    () => (selectedId ? getInquiry(selectedId) : Promise.resolve(null)),
    [selectedId]
  );

  // Búsqueda con debounce de 300 ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Al abrir una consulta pendiente, se marca como leída automáticamente.
  useEffect(() => {
    if (detail.data && detail.data.status === 'pendiente') {
      changeStatus(detail.data, 'leida', { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data]);

  function openInquiry(id) {
    setSearchParams({ id });
  }

  function closeInquiry() {
    setSearchParams({});
  }

  function changeTab(value) {
    setStatus(value);
    setPage(1);
  }

  async function changeStatus(inquiry, newStatus, { silent = false } = {}) {
    try {
      const updated = await updateInquiryStatus(inquiry._id, newStatus);
      detail.setData(updated);
      if (list.data) {
        list.setData({
          ...list.data,
          items: list.data.items.map((item) => (item._id === updated._id ? updated : item)),
        });
      }
      counts.reload();
      refreshPending();
      if (!silent) showToast('Estado actualizado');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInquiry(toDelete._id);
      showToast('Consulta eliminada');
      setToDelete(null);
      closeInquiry();
      list.reload();
      counts.reload();
      refreshPending();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  let listContent;
  if (list.loading && !list.data) listContent = <Spinner />;
  else if (list.error) listContent = <ErrorState message={list.error.message} onRetry={list.reload} />;
  else if (list.data.items.length === 0)
    listContent = (
      <EmptyState title={status || search ? 'No hay consultas con esos filtros' : 'Todavía no hay consultas'} />
    );
  else
    listContent = (
      <>
        <ul className={styles.list}>
          {list.data.items.map((inquiry) => (
            <li key={inquiry._id}>
              <button
                type="button"
                className={`${styles.item} ${inquiry._id === selectedId ? styles.selected : ''}`}
                onClick={() => openInquiry(inquiry._id)}
                aria-current={inquiry._id === selectedId ? 'true' : undefined}
              >
                <span className={styles.itemTop}>
                  <span className={styles.itemDate}>{formatDateTime(inquiry.createdAt)}</span>
                  <StatusBadge status={inquiry.status} />
                </span>
                <span className={`${styles.itemName} ${inquiry.status === 'pendiente' ? styles.unread : ''}`}>
                  {inquiry.name}
                </span>
                <span className={styles.itemSubject}>{inquiry.subject}</span>
              </button>
            </li>
          ))}
        </ul>
        <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />
      </>
    );

  const countsData = counts.data ? counts.data.inquiries : null;

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Filtrar consultas">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`${styles.tab} ${status === tab.value ? styles.tabActive : ''}`}
              onClick={() => changeTab(tab.value)}
            >
              {tab.text}
              <span className={styles.tabCount}>{countsData ? countsData[tab.countKey] : '-'}</span>
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <Field
            label="Buscar"
            name="search"
            type="search"
            placeholder="Nombre, email o asunto"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.layout}>
        <section aria-label="Lista de consultas">{listContent}</section>

        <div className={`${styles.detailArea} ${selectedId ? styles.detailOpen : ''}`}>
          {!selectedId && (
            <p className={styles.placeholder}>Elegí una consulta de la lista para ver el mensaje completo.</p>
          )}
          {selectedId && detail.loading && <Spinner />}
          {selectedId && detail.error && (
            <ErrorState
              message={detail.error.status === 404 ? 'La consulta ya no existe.' : detail.error.message}
              onRetry={detail.reload}
            />
          )}
          {selectedId && detail.data && (
            <InquiryDetail
              inquiry={detail.data}
              onStatusChange={changeStatus}
              onDelete={setToDelete}
              onClose={closeInquiry}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar consulta"
        message={toDelete ? `¿Seguro que querés eliminar la consulta de ${toDelete.name}?` : ''}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
