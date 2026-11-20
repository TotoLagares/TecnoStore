// Registro de una cuenta nueva (de cliente: no entra al panel). Al crearla
// inicia sesión automáticamente y va a Mi cuenta.
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { register } from '../../api/auth';
import Button from '../../components/Button';
import Field from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useForm from '../../hooks/useForm';
import { validateRegister } from '../../utils/validators';
import PasswordRules from './PasswordRules';
import ShowPasswordButton from './ShowPasswordButton';
import styles from './Auth.module.css';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  useDocumentTitle('Crear cuenta');
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const form = useForm(EMPTY, validateRegister);
  const { values, errors, submitting } = form;

  if (isAuthenticated) return <Navigate to="/mi-cuenta" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!form.validateAll()) return;

    form.setSubmitting(true);
    try {
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      await login(values.email.trim(), values.password);
      showToast('Cuenta creada');
    } catch (err) {
      // Ej. 409 "Ya existe una cuenta registrada con ese email": se muestra tal cual.
      if (err.status === 409) form.setFieldErrors({ email: err.message });
      else form.setFieldErrors(err.fieldErrors);
      setFormError(err.message);
      form.setSubmitting(false);
    }
  }

  function field(name, label, props = {}) {
    return (
      <Field
        label={label}
        name={name}
        value={values[name]}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={errors[name]}
        {...props}
      />
    );
  }

  return (
    <>
      <div className={styles.head}>
        <span className="label">Tu cuenta</span>
        <h1 className={styles.title}>Crear cuenta</h1>
      </div>

      {formError && (
        <p className={`${styles.notice} ${styles.error}`} role="alert">
          {formError}
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.row}>
          {field('firstName', 'Nombre', { autoComplete: 'given-name', maxLength: 60 })}
          {field('lastName', 'Apellido', { autoComplete: 'family-name', maxLength: 60 })}
        </div>
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('phone', 'Teléfono', { type: 'tel', autoComplete: 'tel', maxLength: 25 })}
        {field('password', 'Contraseña', {
          type: showPassword ? 'text' : 'password',
          autoComplete: 'new-password',
          action: (
            <ShowPasswordButton
              visible={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              controls="field-password field-confirmPassword"
            />
          ),
        })}
        <PasswordRules password={values.password} />
        {field('confirmPassword', 'Confirmar contraseña', {
          type: showPassword ? 'text' : 'password',
          autoComplete: 'new-password',
        })}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <div className={styles.links}>
        <span>¿Ya tenés cuenta?</span>
        <Link to="/login">Ingresar</Link>
      </div>
    </>
  );
}
