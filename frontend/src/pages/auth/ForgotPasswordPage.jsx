// Pedido de recuperación de contraseña. El backend responde siempre el mismo
// mensaje (exista o no la cuenta) y lo mostramos tal cual.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import Button from '../../components/Button';
import Field from '../../components/Field';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useForm from '../../hooks/useForm';
import { validateEmailOnly } from '../../utils/validators';
import styles from './Auth.module.css';

export default function ForgotPasswordPage() {
  useDocumentTitle('Recuperar contraseña');
  const [result, setResult] = useState('');
  const [formError, setFormError] = useState('');
  const form = useForm({ email: '' }, validateEmailOnly);
  const { values, errors, submitting } = form;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      const message = await forgotPassword(values.email.trim());
      setResult(message);
    } catch (err) {
      form.setFieldErrors(err.fieldErrors);
      setFormError(err.message);
    } finally {
      form.setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Recuperar contraseña</h1>
        {!result && (
          <p className={styles.subtitle}>
            Ingresá el email de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
          </p>
        )}
      </div>

      {result ? (
        <p className={`${styles.notice} ${styles.ok}`} role="status">
          {result}
        </p>
      ) : (
        <>
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
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar instrucciones'}
            </Button>
          </form>
        </>
      )}

      <div className={styles.links}>
        <Link to="/login">Volver a ingresar</Link>
      </div>
    </>
  );
}
