// Login (admin o cliente). El admin va al panel; el cliente, a Mi cuenta.
// ?next=<ruta> vuelve a esa ruta después de ingresar (solo rutas internas).
// ?expired=1 avisa que la sesión venció; ?restablecida=1, que se cambió la contraseña.
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/Button';
import Field from '../../components/Field';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useForm from '../../hooks/useForm';
import { isSafeInternalPath, validateLogin } from '../../utils/validators';
import ShowPasswordButton from './ShowPasswordButton';
import styles from './Auth.module.css';

export default function LoginPage() {
  useDocumentTitle('Ingresar');
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const form = useForm({ email: '', password: '' }, validateLogin);
  const { values, errors, submitting } = form;

  const next = searchParams.get('next');
  const home = isAdmin ? '/admin' : '/mi-cuenta';
  const target = isSafeInternalPath(next) ? next : home;

  // Con sesión iniciada no tiene sentido el login: se va directo al destino.
  if (isAuthenticated) return <Navigate to={target} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      // Al cambiar isAuthenticated, el <Navigate> de arriba lleva a `target`.
    } catch (err) {
      setFormError(err.message);
      form.setFieldErrors(err.fieldErrors);
      form.setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Ingresar</h1>
      </div>

      {searchParams.get('expired') === '1' && (
        <p className={styles.notice} role="status">
          Tu sesión expiró. Ingresá de nuevo para continuar.
        </p>
      )}
      {searchParams.get('restablecida') === '1' && (
        <p className={`${styles.notice} ${styles.ok}`} role="status">
          Tu contraseña se actualizó. Ya podés ingresar.
        </p>
      )}
      {formError && (
        <p className={`${styles.notice} ${styles.error}`} role="alert">
          {formError}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={errors.email}
        />
        <Field
          label="Contraseña"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={values.password}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={errors.password}
          action={
            <ShowPasswordButton
              visible={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              controls="field-password"
            />
          }
        />
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <div className={styles.links}>
        <Link to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
        <Link to="/registro">Crear cuenta</Link>
      </div>
    </>
  );
}
