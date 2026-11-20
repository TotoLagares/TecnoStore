// Confirmar el cambio de contraseña con el link del mail
// (/confirmar-contrasena?token=...). Se confirma con un botón (y no apenas
// carga la página) para que el cambio lo haga la persona y no, por ejemplo,
// un programa que abre los links del mail para revisarlos.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordChange } from '../../api/auth';
import Button from '../../components/Button';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import styles from './Auth.module.css';

export default function ConfirmPasswordChangePage() {
  useDocumentTitle('Confirmar contraseña');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  // 'idle' | 'sending' | 'done' | 'invalid'
  const [status, setStatus] = useState(token ? 'idle' : 'invalid');
  const [error, setError] = useState('');

  async function handleConfirm() {
    setStatus('sending');
    setError('');
    try {
      await confirmPasswordChange(token);
      setStatus('done');
    } catch (err) {
      if (err.status === 400) {
        setStatus('invalid');
      } else {
        setError(err.message);
        setStatus('idle');
      }
    }
  }

  return (
    <>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Confirmar cambio de contraseña</h1>
      </div>

      {status === 'done' && (
        <div className={`${styles.notice} ${styles.ok}`} role="status">
          <p>Listo, tu contraseña se actualizó.</p>
          <p>
            <Link to="/login">Ingresar</Link>
          </p>
        </div>
      )}

      {status === 'invalid' && (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>El enlace no es válido o ya venció.</p>
          <p>Podés volver a pedir el cambio desde tu perfil.</p>
        </div>
      )}

      {(status === 'idle' || status === 'sending') && (
        <>
          {error && (
            <p className={`${styles.notice} ${styles.error}`} role="alert">
              {error}
            </p>
          )}
          <p>Para terminar, confirmá que querés cambiar la contraseña de tu cuenta.</p>
          <Button fullWidth onClick={handleConfirm} disabled={status === 'sending'}>
            {status === 'sending' ? 'Confirmando…' : 'Confirmar cambio'}
          </Button>
        </>
      )}
    </>
  );
}
