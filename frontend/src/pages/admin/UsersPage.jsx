// Usuarios del panel: todas las cuentas registradas. Un admin puede hacer
// admin a un cliente (o quitarle el permiso a otro admin). No puede cambiar su propio rol.
import { useState } from 'react';
import { getUsers, updateUserRole } from '../../api/users';
import Button from '../../components/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { formatDate } from '../../utils/format';
import admin from './Admin.module.css';

function UserRow({ user, isMe, onChangeRole }) {
  const isAdmin = user.role === 'admin';
  return (
    <tr>
      <td data-label="Nombre" className={admin.name}>
        {user.firstName} {user.lastName}
        {isMe && <span className={admin.muted}> (vos)</span>}
      </td>
      <td data-label="Email">{user.email}</td>
      <td data-label="Teléfono" className={admin.mono}>
        {user.phone}
      </td>
      <td data-label="Registro" className={admin.muted}>
        {formatDate(user.createdAt)}
      </td>
      <td data-label="Rol">
        <StatusBadge status={user.role} />
      </td>
      <td className={admin.plain}>
        {!isMe && (
          <div className={admin.actions}>
            <Button variant="secondary" size="sm" onClick={() => onChangeRole(user)}>
              {isAdmin ? 'Quitar admin' : 'Hacer admin'}
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const { data: users, loading, error, reload } = useFetch(getUsers, []);
  const [toChange, setToChange] = useState(null);
  const [saving, setSaving] = useState(false);

  const newRole = toChange?.role === 'admin' ? 'cliente' : 'admin';

  async function handleConfirm() {
    setSaving(true);
    try {
      await updateUserRole(toChange._id, newRole);
      showToast(newRole === 'admin' ? 'Ahora es administrador' : 'Ya no es administrador');
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
      setToChange(null);
    }
  }

  let content;
  if (loading && !users) content = <Spinner />;
  else if (error) content = <ErrorState message={error.message} onRetry={reload} />;
  else if (users.length === 0) content = <EmptyState title="Todavía no hay cuentas" />;
  else
    content = (
      <div className={admin.tableWrap}>
        <table className={admin.table}>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Email</th>
              <th scope="col">Teléfono</th>
              <th scope="col">Registro</th>
              <th scope="col">Rol</th>
              <th scope="col">
                <span className="visually-hidden">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                isMe={me && user._id === me._id}
                onChangeRole={setToChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    );

  const name = toChange ? `${toChange.firstName} ${toChange.lastName}` : '';

  return (
    <>
      <div className={admin.toolbar}>
        <p className={admin.count}>
          {users ? `${users.length} ${users.length === 1 ? 'cuenta' : 'cuentas'}` : ''}
        </p>
      </div>

      {content}

      <ConfirmDialog
        open={Boolean(toChange)}
        title={newRole === 'admin' ? 'Hacer administrador' : 'Quitar administrador'}
        message={
          newRole === 'admin'
            ? `${name} va a poder entrar al panel y modificar publicaciones, categorías, consultas y datos del comercio.`
            : `${name} ya no va a poder entrar al panel.`
        }
        confirmLabel={newRole === 'admin' ? 'Hacer admin' : 'Quitar admin'}
        loading={saving}
        onConfirm={handleConfirm}
        onCancel={() => setToChange(null)}
      />
    </>
  );
}
